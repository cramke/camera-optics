use super::calculations::*;
use super::types::*;

/// Tauri command to calculate FOV for a single camera system
#[tauri::command]
pub fn calculate_camera_fov(camera: CameraSystem, distance_mm: f64) -> FovResult {
    calculate_fov(&camera, distance_mm)
}

/// Tauri command to calculate FOV for multiple camera systems
#[tauri::command]
pub fn compare_camera_systems(cameras: Vec<CameraSystem>, distance_mm: f64) -> Vec<CameraWithResult> {
    cameras.into_iter()
        .map(|camera| {
            let result = calculate_fov(&camera, distance_mm);
            CameraWithResult { camera, result }
        })
        .collect()
}

/// Tauri command to calculate hyperfocal distance
#[tauri::command]
pub fn calculate_hyperfocal_distance(focal_length_mm: f64, f_number: f64, coc_mm: f64) -> f64 {
    calculate_hyperfocal(focal_length_mm, f_number, coc_mm)
}

/// Tauri command to calculate depth of field
#[tauri::command]
pub fn calculate_depth_of_field(
    object_distance_mm: f64,
    focal_length_mm: f64,
    f_number: f64,
    coc_mm: f64,
) -> serde_json::Value {
    let (near, far, total) = calculate_dof(object_distance_mm, focal_length_mm, f_number, coc_mm);
    
    serde_json::json!({
        "near_mm": near,
        "far_mm": far,
        "total_dof_mm": total
    })
}
