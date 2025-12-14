use super::calculations::*;
use super::types::*;

/// Tauri command to calculate FOV for a single camera system
#[tauri::command]
pub fn calculate_camera_fov(camera: CameraSystem, distance_mm: f64) -> FovResult {
    calculate_fov(&camera, distance_mm)
}

/// Tauri command to validate a camera system and its result
#[tauri::command]
pub fn validate_camera_system(camera: CameraSystem, result: FovResult) -> Vec<ValidationWarning> {
    let camera_with_result = CameraWithResult { camera, result };
    camera_with_result.validate()
}

/// Tauri command to calculate FOV for multiple camera systems
#[tauri::command]
pub fn compare_camera_systems(
    cameras: Vec<CameraSystem>,
    distance_mm: f64,
) -> Vec<CameraWithResult> {
    cameras
        .into_iter()
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

/// Tauri command to calculate focal length from FOV
#[tauri::command]
pub fn calculate_focal_length_from_fov_command(sensor_size_mm: f64, fov_deg: f64) -> f64 {
    calculate_focal_length_from_fov(sensor_size_mm, fov_deg)
}

/// Tauri command to calculate parameter ranges for given DORI requirements
#[tauri::command]
pub fn calculate_dori_ranges(
    targets: DoriTargets,
    constraints: ParameterConstraint,
) -> DoriParameterRanges {
    calculate_dori_parameter_ranges(&targets, &constraints)
}

/// Tauri command to calculate all DORI distances from a single input
#[tauri::command]
pub fn calculate_dori_from_single_distance(distance_m: f64, dori_type: String) -> DoriDistances {
    calculate_dori_from_single(distance_m, &dori_type)
}
