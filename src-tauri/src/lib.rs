// Optical calculation modules
pub mod optics;

use optics::commands::*;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            calculate_camera_fov,
            compare_camera_systems,
            calculate_hyperfocal_distance,
            calculate_depth_of_field,
            calculate_focal_length_from_fov_command,
            calculate_dori_ranges,
            calculate_dori_from_single_distance,
            validate_camera_system
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
