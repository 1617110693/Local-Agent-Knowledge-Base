use crate::error::{AppError, CommandResult};
use crate::AppState;
use serde::Serialize;
use tauri::State;
use std::io::Read;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

/// Python backend process handle
pub struct PythonProcess(pub Mutex<Option<Child>>);

impl Drop for PythonProcess {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.0.lock() {
            if let Some(ref mut child) = *guard {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

#[derive(Debug, Serialize)]
pub struct PythonBackendStatus {
    pub running: bool,
    pub url: String,
    pub port: u16,
    pub error: Option<String>,
}

/// Find the bundled sidecar .exe, or fall back to uv run from source
fn resolve_backend_command() -> (String, Vec<String>) {
    // Try bundled sidecar first (production) — skip 0-byte dev placeholders
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            // Production sidecars may include target triple suffix
            for name in &[
                "knowledge-backend.exe",
                "knowledge-backend",
                "knowledge-backend-x86_64-pc-windows-msvc.exe",
                "knowledge-backend-aarch64-apple-darwin",
                "knowledge-backend-x86_64-unknown-linux-gnu",
            ] {
                let sidecar = dir.join(name);
                if sidecar.exists() {
                    if let Ok(meta) = std::fs::metadata(&sidecar) {
                        if meta.len() > 1024 {
                            return (sidecar.to_string_lossy().to_string(), vec![]);
                        }
                    }
                }
            }
        }
    }

    // Dev mode: use uv run from source tree
    let backend_dir: std::path::PathBuf =
        // CARGO_MANIFEST_DIR = .../apps/desktop/src-tauri (set during cargo run)
        if let Ok(manifest) = std::env::var("CARGO_MANIFEST_DIR") {
            std::path::PathBuf::from(&manifest)
                .join("..").join("..").join("..")
                .join("services").join("python-backend")
        }
        // Fallback: exe is in target/debug/ → go up to project root
        else if let Ok(exe) = std::env::current_exe() {
            exe.parent().unwrap_or(std::path::Path::new("."))
                .parent().unwrap_or(std::path::Path::new("."))
                .parent().unwrap_or(std::path::Path::new("."))
                .join("services").join("python-backend")
        } else {
            std::path::PathBuf::from("services/python-backend")
        };

    (
        "uv".to_string(),
        vec![
            "run".to_string(),
            "--directory".to_string(),
            backend_dir.to_string_lossy().to_string(),
            "knowledge-backend".to_string(),
        ],
    )
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
    let (cmd, args) = resolve_backend_command();

    // Kill existing process if any
    {
        let mut proc = py_state.0.lock().unwrap();
        if let Some(ref mut child) = *proc {
            let _ = child.kill();
            let _ = child.wait();
        }

        let mut child = Command::new(&cmd);
        child
            .args(&args)
            .env("KNOWLEDGE_BASE_DATA_DIR", app_data_dir.to_str().unwrap_or(""))
            .env("KNOWLEDGE_BACKEND_PORT", port.to_string())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let child = child.spawn().map_err(|e| {
            AppError::PythonBackend(format!(
                "Failed to start backend ({}): {}. In dev, run: uv sync",
                if args.is_empty() { "bundled" } else { "uv run" }, e
            ))
        })?;

        *proc = Some(child);
    }

    // Health check
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
        if i == 20 {
            let mut proc = py_state.0.lock().unwrap();
            if let Some(ref mut child) = *proc {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        let mut stderr = String::new();
                        if let Some(ref mut s) = child.stderr {
                            s.read_to_string(&mut stderr).ok();
                        }
                        return Ok(PythonBackendStatus {
                            running: false, url: format!("http://127.0.0.1:{}", port), port,
                            error: Some(format!("Backend exited early ({}).\n{}", status, stderr)),
                        });
                    }
                    _ => {}
                }
            }
        }
    }

    let mut err_msg = "Backend failed to start within 60s".to_string();
    {
        let mut proc = py_state.0.lock().unwrap();
        if let Some(ref mut child) = *proc {
            match child.try_wait() {
                Ok(Some(status)) => {
                    let mut stderr = String::new();
                    if let Some(ref mut s) = child.stderr {
                        s.read_to_string(&mut stderr).ok();
                    }
                    err_msg = format!("Backend exited with {}.\n{}", status, stderr);
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
