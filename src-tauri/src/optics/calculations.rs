use super::types::{CameraSystem, FovResult};

/// Calculate field of view and spatial resolution for a camera system at a given distance
/// 
/// # Arguments
/// * `camera` - The camera system specification
/// * `distance_mm` - Working distance in millimeters
/// 
/// # Returns
/// Field of view results including angular FOV, linear FOV at distance, and spatial resolution
pub fn calculate_fov(camera: &CameraSystem, distance_mm: f64) -> FovResult {
    // Calculate angular field of view using: FOV = 2 * atan(sensor_size / (2 * focal_length))
    let horizontal_fov_rad = 2.0 * (camera.sensor_width_mm / (2.0 * camera.focal_length_mm)).atan();
    let vertical_fov_rad = 2.0 * (camera.sensor_height_mm / (2.0 * camera.focal_length_mm)).atan();
    
    let horizontal_fov_deg = horizontal_fov_rad.to_degrees();
    let vertical_fov_deg = vertical_fov_rad.to_degrees();
    
    // Calculate linear field of view at specified distance: FOV_linear = 2 * distance * tan(FOV_angular / 2)
    let horizontal_fov_mm = 2.0 * distance_mm * (horizontal_fov_rad / 2.0).tan();
    let vertical_fov_mm = 2.0 * distance_mm * (vertical_fov_rad / 2.0).tan();
    
    // Convert FOV to meters
    let horizontal_fov_m = horizontal_fov_mm / 1000.0;
    let vertical_fov_m = vertical_fov_mm / 1000.0;
    let distance_m = distance_mm / 1000.0;
    
    // Calculate spatial resolution (pixels per meter at the working distance)
    let ppm = camera.pixel_width as f64 / horizontal_fov_m;
    
    // Calculate ground sample distance (millimeters per pixel)
    let gsd_mm = horizontal_fov_mm / camera.pixel_width as f64;
    
    FovResult {
        horizontal_fov_deg,
        vertical_fov_deg,
        horizontal_fov_m,
        vertical_fov_m,
        ppm,
        gsd_mm,
        distance_m,
    }
}

/// Calculate FOV for multiple camera systems
pub fn calculate_multiple_fov(cameras: &[CameraSystem], distance_mm: f64) -> Vec<FovResult> {
    cameras.iter()
        .map(|camera| calculate_fov(camera, distance_mm))
        .collect()
}

/// Calculate hyperfocal distance for a given camera system and aperture
/// H = (f² / (N × c)) + f
/// where f = focal length, N = f-number, c = circle of confusion
pub fn calculate_hyperfocal(focal_length_mm: f64, f_number: f64, coc_mm: f64) -> f64 {
    (focal_length_mm * focal_length_mm) / (f_number * coc_mm) + focal_length_mm
}

/// Calculate depth of field given object distance, focal length, f-number, and circle of confusion
pub fn calculate_dof(
    object_distance_mm: f64,
    focal_length_mm: f64,
    f_number: f64,
    coc_mm: f64,
) -> (f64, f64, f64) {
    let hyperfocal = calculate_hyperfocal(focal_length_mm, f_number, coc_mm);
    
    // Near limit: Dn = (H × s) / (H + (s - f))
    let near = (hyperfocal * object_distance_mm) / (hyperfocal + (object_distance_mm - focal_length_mm));
    
    // Far limit: Df = (H × s) / (H - (s - f))
    let far = if object_distance_mm < hyperfocal {
        (hyperfocal * object_distance_mm) / (hyperfocal - (object_distance_mm - focal_length_mm))
    } else {
        f64::INFINITY
    };
    
    let total_dof = far - near;
    
    (near, far, total_dof)
}

/// Calculate focal length from field of view and sensor size
/// focal_length = (sensor_size / 2) / tan(fov / 2)
pub fn calculate_focal_length_from_fov(sensor_size_mm: f64, fov_deg: f64) -> f64 {
    let fov_rad = fov_deg.to_radians();
    (sensor_size_mm / 2.0) / (fov_rad / 2.0).tan()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fov_calculation() {
        // Full frame camera (36x24mm), 50mm lens, 5m distance
        let camera = CameraSystem::new(36.0, 24.0, 6000, 4000, 50.0);
        let result = calculate_fov(&camera, 5000.0);
        
        // Expected horizontal FOV for 50mm on full frame: ~39.6°
        assert!((result.horizontal_fov_deg - 39.6).abs() < 1.0);
        
        // At 5m, should cover approximately 3.6m horizontally
        assert!((result.horizontal_fov_m - 3.6).abs() < 0.1);
        
        // Distance should be 5m
        assert!((result.distance_m - 5.0).abs() < 0.01);
    }

    #[test]
    fn test_hyperfocal_calculation() {
        // 50mm lens, f/8, 0.03mm CoC (full frame standard)
        let hyperfocal = calculate_hyperfocal(50.0, 8.0, 0.03);
        
        // Should be around 10.4 meters
        assert!((hyperfocal - 10416.7).abs() < 100.0);
    }

    #[test]
    fn test_focal_length_from_fov() {
        // Full frame sensor (36mm width), 39.6° horizontal FOV
        // Should calculate to approximately 50mm focal length
        let focal_length = calculate_focal_length_from_fov(36.0, 39.6);
        
        assert!((focal_length - 50.0).abs() < 1.0);
        
        // Test with vertical FOV: 24mm height, 27° vertical FOV
        // Should also be around 50mm
        let focal_length_v = calculate_focal_length_from_fov(24.0, 27.0);
        
        assert!((focal_length_v - 50.0).abs() < 1.0);
    }

    #[test]
    fn test_focal_length_roundtrip() {
        // Test that FOV -> focal length -> FOV gives consistent results
        let sensor_width = 36.0;
        let original_fov = 39.6;
        
        // Calculate focal length from FOV
        let focal_length = calculate_focal_length_from_fov(sensor_width, original_fov);
        
        // Calculate FOV back from focal length
        let camera = CameraSystem::new(sensor_width, 24.0, 6000, 4000, focal_length);
        let result = calculate_fov(&camera, 5000.0);
        
        // Should match original FOV within tolerance
        assert!((result.horizontal_fov_deg - original_fov).abs() < 0.1);
    }
}
