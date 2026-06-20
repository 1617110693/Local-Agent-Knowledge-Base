use crate::error::CommandResult;
use crate::models::KnowledgeBase;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_kb(
    state: State<'_, AppState>,
    name: String,
    description: String,
) -> CommandResult<KnowledgeBase> {
    state.file_store.create_kb(name, description)
}

#[tauri::command]
pub async fn update_kb(
    state: State<'_, AppState>,
    kb_id: String,
    name: Option<String>,
    description: Option<String>,
) -> CommandResult<KnowledgeBase> {
    state.file_store.update_kb(&kb_id, name, description)
}

#[tauri::command]
pub async fn copy_kb(
    state: State<'_, AppState>,
    kb_id: String,
) -> CommandResult<KnowledgeBase> {
    state.file_store.copy_kb(&kb_id)
}

#[tauri::command]
pub async fn delete_kb(
    state: State<'_, AppState>,
    kb_id: String,
) -> CommandResult<()> {
    state.file_store.delete_kb(&kb_id)
}

#[tauri::command]
pub async fn list_kbs(
    state: State<'_, AppState>,
) -> CommandResult<Vec<KnowledgeBase>> {
    state.file_store.list_kbs()
}

#[tauri::command]
pub async fn get_kb(
    state: State<'_, AppState>,
    kb_id: String,
) -> CommandResult<KnowledgeBase> {
    state.file_store.get_kb(&kb_id)
}

#[tauri::command]
pub async fn toggle_pin_kb(
    state: State<'_, AppState>,
    kb_id: String,
) -> CommandResult<Vec<KnowledgeBase>> {
    state.file_store.toggle_pin_kb(&kb_id)
}

#[tauri::command]
pub async fn reorder_kbs(
    state: State<'_, AppState>,
    ordered_ids: Vec<String>,
) -> CommandResult<Vec<KnowledgeBase>> {
    state.file_store.reorder_kbs(&ordered_ids)
}

#[tauri::command]
pub async fn clear_all_kbs(
    state: State<'_, AppState>,
) -> CommandResult<u32> {
    state.file_store.clear_all_kbs()
}

#[tauri::command]
pub async fn export_kbs(
    state: State<'_, AppState>,
    kb_ids: Vec<String>,
    output_path: String,
) -> CommandResult<String> {
    state.file_store.export_kbs(&kb_ids, &output_path)
}

#[tauri::command]
pub async fn import_kbs(
    state: State<'_, AppState>,
    zip_path: String,
) -> CommandResult<u32> {
    state.file_store.import_kbs(&zip_path)
}
