use crate::error::{AppError, CommandResult};
use crate::AppState;
use serde::Serialize;
use tauri::State;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use std::io::Read;

/// Python backend process handle
pub struct PythonProcess(pub Mutex<Option<Child>>);

#[derive(Debug, Serialize)]
pub struct PythonBackendStatus {
    pub running: bool,
    pub url: String,
    pub port: u16,
    pub error: Option<String>,
}

fn resolve_backend_dir() -> std::path::PathBuf {
    // CARGO_MANIFEST_DIR = .../apps/desktop/src-tauri
    // Go up 3 levels to monorepo root, then into services/python-backend
    let manifest = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
    let p = std::path::PathBuf::from(&manifest);
    // In dev: manifest = .../apps/desktop/src-tauri → go ../../../services/python-backend
    let backend = p.join("..").join("..").join("..").join("services").join("python-backend");
    backend.canonicalize().unwrap_or(backend)
}

#[tauri::command]
pub async fn get_python_backend_url(state: State<'_, AppState>) -> CommandResult<String> {
    let port = state.python_port.lock().unwrap();
    Ok(format!("http://127.0.0.1:{}", *port))
}

#[tauri::command]
pub async fn start_python_backend(
    state: State<'_, AppState>,
    py_state: State<'_, PythonProcess>,
) -> CommandResult<PythonBackendStatus> {
    let port = *state.python_port.lock().unwrap();
    let app_data_dir = state.file_store.root_dir().clone();
    let backend_dir = resolve_backend_dir();

    // Kill existing process if any
    {
        let mut proc = py_state.0.lock().unwrap();
        if let Some(ref mut child) = *proc {
            let _ = child.kill();
            let _ = child.wait();
        }

        let child = Command::new("uv")
            .args([
                "run",
                "--directory",
                backend_dir.to_str().unwrap_or("."),
                "knowledge-backend",
            ])
            .env("KNOWLEDGE_BASE_DATA_DIR", app_data_dir.to_str().unwrap_or(""))
            .env("KNOWLEDGE_BACKEND_PORT", port.to_string())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| AppError::PythonBackend(format!(
                "Failed to start uv run in {}: {}. Is uv installed? https://docs.astral.sh/uv/",
                backend_dir.display(), e
            )))?;

        *proc = Some(child);
    }

    // Health check loop — longer timeout for first uv sync
    let url = format!("http://127.0.0.1:{}/api/v1/health", port);
    let client = reqwest::Client::new();

    for i in 0..120 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        if let Ok(resp) = client.get(&url).send().await {
            if resp.status().is_success() {
                return Ok(PythonBackendStatus {
                    running: true,
                    url: format!("http://127.0.0.1:{}", port),
                    port,
                    error: None,
                });
            }
        }
        // After 10s, check if process already died
        if i == 20 {
            let mut proc = py_state.0.lock().unwrap();
            if let Some(ref mut child) = *proc {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        let mut stderr = String::new();
                        if let Some(ref mut s) = child.stderr {
                            s.read_to_string(&mut stderr).ok();
                        }
                        let msg = format!(
                            "Python backend exited early with {}.\nstderr: {}",
                            status, stderr
                        );
                        return Ok(PythonBackendStatus {
                            running: false,
                            url: format!("http://127.0.0.1:{}", port),
                            port,
                            error: Some(msg),
                        });
                    }
                    _ => {}
                }
            }
        }
    }

    // Timeout — read stderr for diagnostics
    let mut err_msg = "Python backend failed to start within 60s timeout".to_string();
    {
        let mut proc = py_state.0.lock().unwrap();
        if let Some(ref mut child) = *proc {
            match child.try_wait() {
                Ok(Some(status)) => {
                    let mut stderr = String::new();
                    if let Some(ref mut s) = child.stderr {
                        s.read_to_string(&mut stderr).ok();
                    }
                    err_msg = format!("Python backend exited with {}.\n{}", status, stderr);
                }
                _ => {}
            }
        }
    }

    Ok(PythonBackendStatus {
        running: false,
        url: format!("http://127.0.0.1:{}", port),
        port,
        error: Some(err_msg),
    })
}

#[tauri::command]
pub async fn stop_python_backend(
    py_state: State<'_, PythonProcess>,
) -> CommandResult<()> {
    let mut proc = py_state.0.lock().unwrap();
    if let Some(ref mut child) = *proc {
        child.kill().ok();
        child.wait().ok();
    }
    *proc = None;
    Ok(())
}

#[tauri::command]
pub async fn get_python_backend_status(
    state: State<'_, AppState>,
    py_state: State<'_, PythonProcess>,
) -> CommandResult<PythonBackendStatus> {
    let port = *state.python_port.lock().unwrap();
    let url = format!("http://127.0.0.1:{}", port);

    let running = {
        let proc = py_state.0.lock().unwrap();
        proc.is_some()
    };

    let actually_running = if running {
        let client = reqwest::Client::new();
        if let Ok(resp) = client
            .get(format!("{}/api/v1/health", url))
            .timeout(Duration::from_secs(2))
            .send()
            .await
        {
            resp.status().is_success()
        } else {
            false
        }
    } else {
        false
    };

    Ok(PythonBackendStatus {
        running: actually_running,
        url,
        port,
        error: None,
    })
}
