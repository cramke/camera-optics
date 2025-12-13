use super::types::{CameraSystem, DoriDistances, FovResult};

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
    
    // Calculate DORI distances
    let dori = calculate_dori_distances(camera);
    
    FovResult {
        horizontal_fov_deg,
        vertical_fov_deg,
        horizontal_fov_m,
        vertical_fov_m,
        ppm,
        gsd_mm,
        distance_m,
        dori: Some(dori),
    }
}

/// Calculate DORI (Detection, Observation, Recognition, Identification) distances
/// 
/// DORI is a standard metric for surveillance camera performance evaluation based on
/// the pixel density required for each task:
/// - Detection: 25 px/m (identify that an object is present)
/// - Observation: 62.5 px/m (determine general characteristics like clothing color)
/// - Recognition: 125 px/m (recognize a familiar person or known vehicle)
/// - Identification: 250 px/m (identify a specific person beyond reasonable doubt)
/// 
/// # Formula
/// Distance = (focal_length × pixel_width) / (sensor_width × required_px_per_m)
/// 
/// This is derived from the relationship:
/// px/m = pixel_width / horizontal_fov_m
/// horizontal_fov_m = (sensor_width × distance) / focal_length
/// 
/// # Arguments
/// * `camera` - The camera system specification
/// 
/// # Returns
/// DORI distances in meters for each surveillance task
pub fn calculate_dori_distances(camera: &CameraSystem) -> DoriDistances {
    // Standard DORI pixel density requirements (pixels per meter)
    const DETECTION_PX_PER_M: f64 = 25.0;
    const OBSERVATION_PX_PER_M: f64 = 62.5;
    const RECOGNITION_PX_PER_M: f64 = 125.0;
    const IDENTIFICATION_PX_PER_M: f64 = 250.0;
    
    // Formula: distance = (focal_length × pixel_width) / (sensor_width × required_px_per_m)
    // This gives the maximum distance at which the required pixel density is achieved
    
    let detection_m = (camera.focal_length_mm * camera.pixel_width as f64) 
        / (camera.sensor_width_mm * DETECTION_PX_PER_M);
    
    let observation_m = (camera.focal_length_mm * camera.pixel_width as f64) 
        / (camera.sensor_width_mm * OBSERVATION_PX_PER_M);
    
    let recognition_m = (camera.focal_length_mm * camera.pixel_width as f64) 
        / (camera.sensor_width_mm * RECOGNITION_PX_PER_M);
    
    let identification_m = (camera.focal_length_mm * camera.pixel_width as f64) 
        / (camera.sensor_width_mm * IDENTIFICATION_PX_PER_M);
    
    DoriDistances {
        detection_m,
        observation_m,
        recognition_m,
        identification_m,
    }
}

/// Calculate all DORI distances from a single distance input
/// 
/// Since DORI distances have fixed relationships based on pixel density requirements,
/// if one distance is known, all others can be calculated automatically.
/// 
/// # Arguments
/// * `distance_m` - The known distance in meters
/// * `dori_type` - Which DORI type the distance corresponds to ("detection", "observation", "recognition", or "identification")
/// 
/// # Returns
/// Complete DORI distances for all four categories
pub fn calculate_dori_from_single(distance_m: f64, dori_type: &str) -> DoriDistances {
    // Standard DORI pixel density requirements
    const DETECTION_PX_PER_M: f64 = 25.0;
    const OBSERVATION_PX_PER_M: f64 = 62.5;
    const RECOGNITION_PX_PER_M: f64 = 125.0;
    const IDENTIFICATION_PX_PER_M: f64 = 250.0;
    
    // Get the base pixel density for the input type
    let base_px_per_m = match dori_type.to_lowercase().as_str() {
        "detection" => DETECTION_PX_PER_M,
        "observation" => OBSERVATION_PX_PER_M,
        "recognition" => RECOGNITION_PX_PER_M,
        "identification" => IDENTIFICATION_PX_PER_M,
        _ => IDENTIFICATION_PX_PER_M, // Default to most restrictive
    };
    
    // Calculate all distances using the relationship:
    // distance_A / distance_B = px_per_m_B / px_per_m_A
    // Therefore: distance_target = distance_base × (px_per_m_base / px_per_m_target)
    
    let detection_m = distance_m * (base_px_per_m / DETECTION_PX_PER_M);
    let observation_m = distance_m * (base_px_per_m / OBSERVATION_PX_PER_M);
    let recognition_m = distance_m * (base_px_per_m / RECOGNITION_PX_PER_M);
    let identification_m = distance_m * (base_px_per_m / IDENTIFICATION_PX_PER_M);
    
    DoriDistances {
        detection_m,
        observation_m,
        recognition_m,
        identification_m,
    }
}

/// Calculate ranges of camera parameters that satisfy given DORI distance requirements
/// 
/// This is the inverse of calculate_dori_distances - given target distances, find what
/// camera parameters can achieve them.
/// 
/// # Formula (rearranged from DORI calculation)
/// From: distance = (focal_length × pixel_width) / (sensor_width × required_px_per_m)
/// 
/// # Arguments
/// * `targets` - Target DORI distances (at least one must be specified)
/// * `constraints` - Fixed parameters that narrow the solution space
/// 
/// # Returns
/// Ranges for unconstrained parameters that satisfy the requirements
pub fn calculate_dori_parameter_ranges(
    targets: &super::types::DoriTargets,
    constraints: &super::types::ParameterConstraint,
) -> super::types::DoriParameterRanges {
    use super::types::{DoriParameterRanges, ParameterRange};
    
    // Standard DORI pixel density requirements
    const DETECTION_PX_PER_M: f64 = 25.0;
    const OBSERVATION_PX_PER_M: f64 = 62.5;
    const RECOGNITION_PX_PER_M: f64 = 125.0;
    const IDENTIFICATION_PX_PER_M: f64 = 250.0;
    
    // Reasonable parameter bounds
    const MIN_PIXEL_WIDTH: u32 = 640;
    const MAX_PIXEL_WIDTH: u32 = 8192;
    const MIN_SENSOR_WIDTH_MM: f64 = 3.0;
    const MAX_SENSOR_WIDTH_MM: f64 = 50.0;
    const MIN_FOCAL_LENGTH_MM: f64 = 2.0;
    const MAX_FOCAL_LENGTH_MM: f64 = 400.0;
    
    // Pick the first specified DORI target (prefer identification as most common/restrictive)
    // Since DORI values maintain fixed ratios, any single target defines all others
    let (target_distance, required_px_per_m) = if let Some(id) = targets.identification_m {
        (id, IDENTIFICATION_PX_PER_M)
    } else if let Some(rec) = targets.recognition_m {
        (rec, RECOGNITION_PX_PER_M)
    } else if let Some(obs) = targets.observation_m {
        (obs, OBSERVATION_PX_PER_M)
    } else if let Some(det) = targets.detection_m {
        (det, DETECTION_PX_PER_M)
    } else {
        panic!("At least one DORI target must be specified");
    };
    
    // Calculate ranges based on what's constrained
    let mut ranges = DoriParameterRanges {
        sensor_width_mm: None,
        sensor_height_mm: None,
        pixel_width: None,
        pixel_height: None,
        focal_length_mm: None,
        horizontal_fov_deg: None,
        limiting_requirement: String::new(), // No longer needed but kept for API compatibility
    };
    
    // Helper function to calculate FOV from sensor width and focal length
    let calc_fov_deg = |sensor_mm: f64, focal_mm: f64| -> f64 {
        2.0 * (sensor_mm / (2.0 * focal_mm)).atan().to_degrees()
    };
    
    // If FOV is constrained, it affects the relationship between focal length and sensor width
    // FOV = 2 × atan(sensor / (2 × focal))
    // Rearranged: sensor = 2 × focal × tan(FOV / 2)
    if let Some(fov_deg) = constraints.horizontal_fov_deg {
        let fov_rad = fov_deg.to_radians();
        let tan_half_fov = (fov_rad / 2.0).tan();
        
        if let Some(focal) = constraints.focal_length_mm {
            // FOV and focal are fixed - sensor is determined
            let sensor_w = 2.0 * focal * tan_half_fov;
            
            // Always return the calculated sensor width
            ranges.sensor_width_mm = Some(ParameterRange {
                min: sensor_w,
                max: sensor_w,
            });
            
            // Now calculate pixel width range based on fixed focal and sensor
            if let Some(_pixels) = constraints.pixel_width {
                // All three fixed - sensor is determined, others are inputs
                ranges.pixel_width = None;
                ranges.focal_length_mm = None;
            } else {
                // Calculate pixel width range
                let required_product = target_distance * sensor_w * required_px_per_m / focal;
                let min_pixels = required_product.max(MIN_PIXEL_WIDTH as f64);
                let max_pixels = MAX_PIXEL_WIDTH as f64;
                
                ranges.pixel_width = Some(ParameterRange {
                    min: min_pixels,
                    max: max_pixels,
                });
            }
        } else if let Some(sensor_w) = constraints.sensor_width_mm {
            // FOV and sensor are fixed - focal is determined
            let focal = sensor_w / (2.0 * tan_half_fov);
            
            // Always return the calculated focal length
            ranges.focal_length_mm = Some(ParameterRange {
                min: focal,
                max: focal,
            });
            
            if let Some(_pixels) = constraints.pixel_width {
                // All three fixed - focal is determined, others are inputs
                ranges.pixel_width = None;
                ranges.sensor_width_mm = None;
            } else {
                // Calculate pixel width range
                let required_product = target_distance * sensor_w * required_px_per_m / focal;
                let min_pixels = required_product.max(MIN_PIXEL_WIDTH as f64);
                let max_pixels = MAX_PIXEL_WIDTH as f64;
                
                ranges.pixel_width = Some(ParameterRange {
                    min: min_pixels,
                    max: max_pixels,
                });
            }
        } else if let Some(_pixels) = constraints.pixel_width {
            // FOV and pixels are fixed - calculate constrained focal and sensor
            // From DORI: distance = (focal × pixels) / (sensor × px_per_m)
            // From FOV: sensor = 2 × focal × tan(FOV/2)
            // Substitute: distance = (focal × pixels) / (2 × focal × tan(FOV/2) × px_per_m)
            // Simplify: distance = pixels / (2 × tan(FOV/2) × px_per_m)
            // This means focal cancels out, so we can pick focal range and derive sensor
            // But we need to constrain focal so sensor stays within physical limits
            
            let min_focal_for_min_sensor = MIN_SENSOR_WIDTH_MM / (2.0 * tan_half_fov);
            let max_focal_for_max_sensor = MAX_SENSOR_WIDTH_MM / (2.0 * tan_half_fov);
            
            let min_focal = min_focal_for_min_sensor.max(MIN_FOCAL_LENGTH_MM);
            let max_focal = max_focal_for_max_sensor.min(MAX_FOCAL_LENGTH_MM);
            
            ranges.focal_length_mm = Some(ParameterRange {
                min: min_focal,
                max: max_focal,
            });
            
            // Sensor is determined by FOV and focal
            let min_sensor = 2.0 * min_focal * tan_half_fov;
            let max_sensor = 2.0 * max_focal * tan_half_fov;
            
            ranges.sensor_width_mm = Some(ParameterRange {
                min: min_sensor,
                max: max_sensor,
            });
        } else {
            // Only FOV is fixed - give ranges for focal, sensor follows from FOV
            // We need to constrain focal so that sensor stays within physical limits
            // sensor = 2 × focal × tan(FOV/2)
            // Therefore: focal = sensor / (2 × tan(FOV/2))
            
            let min_focal_for_min_sensor = MIN_SENSOR_WIDTH_MM / (2.0 * tan_half_fov);
            let max_focal_for_max_sensor = MAX_SENSOR_WIDTH_MM / (2.0 * tan_half_fov);
            
            // Constrain focal range to stay within both focal and sensor limits
            let min_focal = min_focal_for_min_sensor.max(MIN_FOCAL_LENGTH_MM);
            let max_focal = max_focal_for_max_sensor.min(MAX_FOCAL_LENGTH_MM);
            
            ranges.focal_length_mm = Some(ParameterRange {
                min: min_focal,
                max: max_focal,
            });
            
            // Now sensor is correctly determined by constrained focal and FOV
            let min_sensor = 2.0 * min_focal * tan_half_fov;
            let max_sensor = 2.0 * max_focal * tan_half_fov;
            
            ranges.sensor_width_mm = Some(ParameterRange {
                min: min_sensor,
                max: max_sensor,
            });
            
            // Calculate pixel width range based on FOV constraint
            // From DORI: distance = (focal × pixels) / (sensor × px_per_m)
            // From FOV: sensor = 2 × focal × tan(FOV/2)
            // Substitute: distance = (focal × pixels) / (2 × focal × tan(FOV/2) × px_per_m)
            // Simplify: distance = pixels / (2 × tan(FOV/2) × px_per_m)
            // Therefore: pixels = distance × 2 × tan(FOV/2) × px_per_m
            
            let calculated_pixels = target_distance * 2.0 * tan_half_fov * required_px_per_m;
            let min_pixels = calculated_pixels.max(MIN_PIXEL_WIDTH as f64);
            let max_pixels = MAX_PIXEL_WIDTH as f64;
            
            ranges.pixel_width = Some(ParameterRange {
                min: min_pixels,
                max: max_pixels,
            });
        }
        
        return ranges; // FOV is fixed, so we handle it completely here
    }
    
    // If focal length is fixed, calculate pixel width and sensor width ranges
    if let Some(focal) = constraints.focal_length_mm {
        if let Some(sensor_w) = constraints.sensor_width_mm {
            // Both focal and sensor are fixed - calculate pixel width range
            let required_product = target_distance * sensor_w * required_px_per_m / focal;
            let min_pixels = required_product.max(MIN_PIXEL_WIDTH as f64);
            let max_pixels = MAX_PIXEL_WIDTH as f64;
            
            ranges.pixel_width = Some(ParameterRange {
                min: min_pixels,
                max: max_pixels,
            });
            
            // Calculate aspect ratio constraint for pixel height
            if let Some(sensor_h) = constraints.sensor_height_mm {
                let aspect = sensor_h / sensor_w;
                ranges.pixel_height = Some(ParameterRange {
                    min: min_pixels * aspect,
                    max: max_pixels * aspect,
                });
            }
        } else if let Some(pixels) = constraints.pixel_width {
            // Focal and pixels are fixed - calculate sensor width range
            let min_sensor = (focal * pixels as f64) / (target_distance * required_px_per_m * MAX_PIXEL_WIDTH as f64);
            let max_sensor = (focal * pixels as f64) / (target_distance * required_px_per_m * MIN_PIXEL_WIDTH as f64);
            
            ranges.sensor_width_mm = Some(ParameterRange {
                min: min_sensor.max(MIN_SENSOR_WIDTH_MM),
                max: max_sensor.min(MAX_SENSOR_WIDTH_MM),
            });
        } else {
            // Only focal is fixed - give ranges for both sensor and pixels
            ranges.sensor_width_mm = Some(ParameterRange {
                min: MIN_SENSOR_WIDTH_MM,
                max: MAX_SENSOR_WIDTH_MM,
            });
            ranges.pixel_width = Some(ParameterRange {
                min: MIN_PIXEL_WIDTH as f64,
                max: MAX_PIXEL_WIDTH as f64,
            });
        }
    } else if let Some(sensor_w) = constraints.sensor_width_mm {
        // Sensor width is fixed but focal isn't
        if let Some(pixels) = constraints.pixel_width {
            // Sensor and pixels are fixed - calculate focal length range
            let min_focal = (target_distance * sensor_w * required_px_per_m) / pixels as f64;
            
            ranges.focal_length_mm = Some(ParameterRange {
                min: min_focal.max(MIN_FOCAL_LENGTH_MM),
                max: MAX_FOCAL_LENGTH_MM,
            });
        } else {
            // Only sensor is fixed - give ranges for focal and pixels
            ranges.focal_length_mm = Some(ParameterRange {
                min: MIN_FOCAL_LENGTH_MM,
                max: MAX_FOCAL_LENGTH_MM,
            });
            ranges.pixel_width = Some(ParameterRange {
                min: MIN_PIXEL_WIDTH as f64,
                max: MAX_PIXEL_WIDTH as f64,
            });
        }
    } else if let Some(pixels) = constraints.pixel_width {
        // Only pixels are fixed - calculate constrained ranges for focal and sensor
        // From: distance = (focal × pixels) / (sensor × px_per_m)
        // We get: focal × pixels = distance × sensor × px_per_m
        // Therefore: focal = (distance × sensor × px_per_m) / pixels
        
        // For minimum focal length, use minimum sensor width
        let min_focal = (target_distance * MIN_SENSOR_WIDTH_MM * required_px_per_m) / pixels as f64;
        // For maximum focal length, use maximum sensor width
        let max_focal = (target_distance * MAX_SENSOR_WIDTH_MM * required_px_per_m) / pixels as f64;
        
        ranges.focal_length_mm = Some(ParameterRange {
            min: min_focal.max(MIN_FOCAL_LENGTH_MM),
            max: max_focal.min(MAX_FOCAL_LENGTH_MM),
        });
        
        // For minimum sensor width, use minimum focal length
        let min_sensor = (MIN_FOCAL_LENGTH_MM * pixels as f64) / (target_distance * required_px_per_m);
        // For maximum sensor width, use maximum focal length
        let max_sensor = (MAX_FOCAL_LENGTH_MM * pixels as f64) / (target_distance * required_px_per_m);
        
        ranges.sensor_width_mm = Some(ParameterRange {
            min: min_sensor.max(MIN_SENSOR_WIDTH_MM),
            max: max_sensor.min(MAX_SENSOR_WIDTH_MM),
        });
    } else {
        // Nothing is fixed - give all ranges
        ranges.focal_length_mm = Some(ParameterRange {
            min: MIN_FOCAL_LENGTH_MM,
            max: MAX_FOCAL_LENGTH_MM,
        });
        ranges.sensor_width_mm = Some(ParameterRange {
            min: MIN_SENSOR_WIDTH_MM,
            max: MAX_SENSOR_WIDTH_MM,
        });
        ranges.pixel_width = Some(ParameterRange {
            min: MIN_PIXEL_WIDTH as f64,
            max: MAX_PIXEL_WIDTH as f64,
        });
    }
    
    // Calculate FOV range if not constrained
    if constraints.horizontal_fov_deg.is_none() {
        // FOV range depends on the ranges of sensor and focal
        if let (Some(sensor_range), Some(focal_range)) = (&ranges.sensor_width_mm, &ranges.focal_length_mm) {
            // Min FOV occurs with min sensor and max focal
            let min_fov = calc_fov_deg(sensor_range.min, focal_range.max);
            // Max FOV occurs with max sensor and min focal
            let max_fov = calc_fov_deg(sensor_range.max, focal_range.min);
            
            ranges.horizontal_fov_deg = Some(ParameterRange {
                min: min_fov,
                max: max_fov,
            });
        } else if let Some(focal) = constraints.focal_length_mm {
            // Focal is fixed, sensor has range
            if let Some(sensor_range) = &ranges.sensor_width_mm {
                let min_fov = calc_fov_deg(sensor_range.min, focal);
                let max_fov = calc_fov_deg(sensor_range.max, focal);
                
                ranges.horizontal_fov_deg = Some(ParameterRange {
                    min: min_fov,
                    max: max_fov,
                });
            }
        } else if let Some(sensor_w) = constraints.sensor_width_mm {
            // Sensor is fixed, focal has range
            if let Some(focal_range) = &ranges.focal_length_mm {
                let min_fov = calc_fov_deg(sensor_w, focal_range.max);
                let max_fov = calc_fov_deg(sensor_w, focal_range.min);
                
                ranges.horizontal_fov_deg = Some(ParameterRange {
                    min: min_fov,
                    max: max_fov,
                });
            }
        }
    }
    
    // Calculate sensor_height and pixel_height based on standard 4:3 aspect ratio
    // if not already constrained
    const STANDARD_ASPECT_RATIO: f64 = 4.0 / 3.0;
    
    if constraints.sensor_height_mm.is_none() {
        if let Some(sensor_width_range) = &ranges.sensor_width_mm {
            ranges.sensor_height_mm = Some(ParameterRange {
                min: sensor_width_range.min / STANDARD_ASPECT_RATIO,
                max: sensor_width_range.max / STANDARD_ASPECT_RATIO,
            });
        } else if let Some(sensor_w) = constraints.sensor_width_mm {
            // Width is fixed, calculate height
            let sensor_h = sensor_w / STANDARD_ASPECT_RATIO;
            ranges.sensor_height_mm = Some(ParameterRange {
                min: sensor_h,
                max: sensor_h,
            });
        }
    }
    
    if constraints.pixel_height.is_none() {
        if let Some(pixel_width_range) = &ranges.pixel_width {
            ranges.pixel_height = Some(ParameterRange {
                min: pixel_width_range.min / STANDARD_ASPECT_RATIO,
                max: pixel_width_range.max / STANDARD_ASPECT_RATIO,
            });
        } else if let Some(pixels_w) = constraints.pixel_width {
            // Width is fixed, calculate height
            let pixels_h = pixels_w as f64 / STANDARD_ASPECT_RATIO;
            ranges.pixel_height = Some(ParameterRange {
                min: pixels_h,
                max: pixels_h,
            });
        }
    }
    
    ranges
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

    #[test]
    fn test_dori_calculation() {
        // 1/2.8" sensor (6.4x4.8mm), 1920x1080, 4mm lens (typical CCTV camera)
        let camera = CameraSystem::new(6.4, 4.8, 1920, 1080, 4.0);
        let dori = calculate_dori_distances(&camera);
        
        // At 25 px/m (detection), should be able to detect at ~48m
        assert!((dori.detection_m - 48.0).abs() < 1.0);
        
        // At 250 px/m (identification), should be ~4.8m
        assert!((dori.identification_m - 4.8).abs() < 0.1);
        
        // DORI distances should be in descending order
        assert!(dori.detection_m > dori.observation_m);
        assert!(dori.observation_m > dori.recognition_m);
        assert!(dori.recognition_m > dori.identification_m);
    }

    #[test]
    fn test_dori_with_longer_focal_length() {
        // Same sensor but with 12mm lens (3x telephoto)
        let camera = CameraSystem::new(6.4, 4.8, 1920, 1080, 12.0);
        let dori = calculate_dori_distances(&camera);
        
        // With 3x the focal length, all DORI distances should be ~3x farther
        assert!((dori.detection_m - 144.0).abs() < 2.0);
        assert!((dori.identification_m - 14.4).abs() < 0.2);
    }

    #[test]
    fn test_dori_from_single_identification() {
        // If identification is at 5m, calculate all others
        let dori = calculate_dori_from_single(5.0, "identification");
        
        // Identification should be the input value
        assert!((dori.identification_m - 5.0).abs() < 0.01);
        
        // Recognition should be 2x farther (250/125 = 2)
        assert!((dori.recognition_m - 10.0).abs() < 0.01);
        
        // Observation should be 4x farther (250/62.5 = 4)
        assert!((dori.observation_m - 20.0).abs() < 0.01);
        
        // Detection should be 10x farther (250/25 = 10)
        assert!((dori.detection_m - 50.0).abs() < 0.01);
    }

    #[test]
    fn test_dori_from_single_detection() {
        // If detection is at 100m, calculate all others
        let dori = calculate_dori_from_single(100.0, "detection");
        
        // Detection should be the input value
        assert!((dori.detection_m - 100.0).abs() < 0.01);
        
        // Observation should be 2.5x closer (25/62.5 = 0.4)
        assert!((dori.observation_m - 40.0).abs() < 0.01);
        
        // Recognition should be 5x closer (25/125 = 0.2)
        assert!((dori.recognition_m - 20.0).abs() < 0.01);
        
        // Identification should be 10x closer (25/250 = 0.1)
        assert!((dori.identification_m - 10.0).abs() < 0.01);
    }

    #[test]
    fn test_dori_from_single_maintains_ratios() {
        // Test that ratios are maintained regardless of starting point
        let from_id = calculate_dori_from_single(8.0, "identification");
        let from_rec = calculate_dori_from_single(16.0, "recognition");
        let from_obs = calculate_dori_from_single(32.0, "observation");
        let from_det = calculate_dori_from_single(80.0, "detection");
        
        // All should produce the same DORI distances
        assert!((from_id.identification_m - 8.0).abs() < 0.01);
        assert!((from_rec.identification_m - 8.0).abs() < 0.01);
        assert!((from_obs.identification_m - 8.0).abs() < 0.01);
        assert!((from_det.identification_m - 8.0).abs() < 0.01);
        
        assert!((from_id.detection_m - 80.0).abs() < 0.01);
        assert!((from_rec.detection_m - 80.0).abs() < 0.01);
        assert!((from_obs.detection_m - 80.0).abs() < 0.01);
        assert!((from_det.detection_m - 80.0).abs() < 0.01);
    }

    #[test]
    fn test_dori_ranges_with_fov_constraint() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test with FOV constraint only
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: None,
            sensor_height_mm: None,
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: Some(60.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // With FOV fixed, focal and sensor should have ranges
        assert!(ranges.focal_length_mm.is_some());
        assert!(ranges.sensor_width_mm.is_some());
        
        // FOV should not have a range since it's fixed
        assert!(ranges.horizontal_fov_deg.is_none());
        
        // Pixel width should also have a constrained range based on FOV
        assert!(ranges.pixel_width.is_some());
        if let Some(pixel_range) = &ranges.pixel_width {
            // For 60° FOV and 10m identification distance:
            // pixels = distance × 2 × tan(FOV/2) × px_per_m
            // pixels = 10 × 2 × tan(30°) × 250 ≈ 2887
            // So min should be around 2887 (or higher due to MIN_PIXEL_WIDTH)
            assert!(pixel_range.min > 2800.0, "Min pixels should be constrained by FOV: {}", pixel_range.min);
            assert!(pixel_range.min < 3000.0, "Min pixels should be around 2887: {}", pixel_range.min);
        }
        
        // Verify that sensor/focal maintain the FOV relationship
        if let (Some(focal_range), Some(sensor_range)) = (&ranges.focal_length_mm, &ranges.sensor_width_mm) {
            // Check that the FOV is maintained at both extremes
            let fov_at_min = 2.0 * (sensor_range.min / (2.0 * focal_range.min)).atan().to_degrees();
            let fov_at_max = 2.0 * (sensor_range.max / (2.0 * focal_range.max)).atan().to_degrees();
            
            // Both should be close to 60 degrees
            assert!((fov_at_min - 60.0).abs() < 1.0, "FOV at min is {}, expected 60", fov_at_min);
            assert!((fov_at_max - 60.0).abs() < 1.0, "FOV at max is {}, expected 60", fov_at_max);
        }
    }

    #[test]
    fn test_dori_ranges_fov_and_pixel_constraint() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test with both FOV and pixel width constrained
        let targets = DoriTargets {
            identification_m: Some(20.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: None,
            sensor_height_mm: None,
            pixel_width: Some(1920),
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: Some(90.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // With both FOV and pixels fixed, focal and sensor should still have ranges
        // but they're related by the FOV constraint
        assert!(ranges.focal_length_mm.is_some());
        assert!(ranges.sensor_width_mm.is_some());
        
        // Verify FOV relationship is maintained
        if let (Some(focal_range), Some(sensor_range)) = (&ranges.focal_length_mm, &ranges.sensor_width_mm) {
            let fov_at_min = 2.0 * (sensor_range.min / (2.0 * focal_range.min)).atan().to_degrees();
            let fov_at_max = 2.0 * (sensor_range.max / (2.0 * focal_range.max)).atan().to_degrees();
            
            assert!((fov_at_min - 90.0).abs() < 1.0);
            assert!((fov_at_max - 90.0).abs() < 1.0);
        }
    }

    #[test]
    fn test_dori_ranges_no_fov_constraint() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test without FOV constraint - FOV range should be calculated
        let targets = DoriTargets {
            identification_m: Some(15.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: None,
            sensor_height_mm: None,
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Without FOV constraint, FOV should have a range
        assert!(ranges.horizontal_fov_deg.is_some());
        
        // Verify FOV range makes sense (should be between narrow and wide angles)
        if let Some(fov_range) = &ranges.horizontal_fov_deg {
            assert!(fov_range.min > 0.0);
            assert!(fov_range.max < 180.0);
            assert!(fov_range.min < fov_range.max);
        }
    }

    #[test]
    fn test_dori_ranges_calculates_height_dimensions() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test that sensor_height and pixel_height are calculated with 4:3 aspect ratio
        let targets = DoriTargets {
            identification_m: Some(20.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: None,
            sensor_height_mm: None,
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Both width and height should have ranges
        assert!(ranges.sensor_width_mm.is_some());
        assert!(ranges.sensor_height_mm.is_some());
        assert!(ranges.pixel_width.is_some());
        assert!(ranges.pixel_height.is_some());
        
        // Verify 4:3 aspect ratio is maintained
        if let (Some(sensor_w), Some(sensor_h)) = (&ranges.sensor_width_mm, &ranges.sensor_height_mm) {
            let aspect_ratio_min = sensor_w.min / sensor_h.min;
            let aspect_ratio_max = sensor_w.max / sensor_h.max;
            
            // Should be 4:3 = 1.333...
            assert!((aspect_ratio_min - 1.333).abs() < 0.01, "Min aspect ratio should be 4:3");
            assert!((aspect_ratio_max - 1.333).abs() < 0.01, "Max aspect ratio should be 4:3");
        }
        
        if let (Some(pixel_w), Some(pixel_h)) = (&ranges.pixel_width, &ranges.pixel_height) {
            let aspect_ratio_min = pixel_w.min / pixel_h.min;
            let aspect_ratio_max = pixel_w.max / pixel_h.max;
            
            // Should be 4:3 = 1.333...
            assert!((aspect_ratio_min - 1.333).abs() < 0.01, "Min pixel aspect ratio should be 4:3");
            assert!((aspect_ratio_max - 1.333).abs() < 0.01, "Max pixel aspect ratio should be 4:3");
        }
    }

    #[test]
    fn test_dori_ranges_height_with_fixed_width() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test that when width is fixed, height is calculated from it
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(12.0), // Fixed width
            sensor_height_mm: None,
            pixel_width: Some(1920), // Fixed width
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Height should be calculated with fixed value (same min/max)
        if let Some(sensor_h) = &ranges.sensor_height_mm {
            let expected_height = 12.0 / (4.0 / 3.0); // 9.0
            assert!((sensor_h.min - expected_height).abs() < 0.01);
            assert!((sensor_h.max - expected_height).abs() < 0.01);
        }
        
        if let Some(pixel_h) = &ranges.pixel_height {
            let expected_height = 1920.0 / (4.0 / 3.0); // 1440.0
            assert!((pixel_h.min - expected_height).abs() < 0.01);
            assert!((pixel_h.max - expected_height).abs() < 0.01);
        }
    }

    #[test]
    fn test_dori_ranges_fov_with_sensor_determines_focal() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test case from screenshot: FOV=8°, sensor=4.2mm should give focal≈30mm
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(4.2),
            sensor_height_mm: None,
            pixel_width: Some(6000),
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: Some(8.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Focal length should be determined (fixed value)
        assert!(ranges.focal_length_mm.is_some(), "Focal length should be calculated");
        
        if let Some(focal) = &ranges.focal_length_mm {
            // focal = sensor / (2 × tan(FOV/2))
            // focal = 4.2 / (2 × tan(4°))
            // focal ≈ 30.0 mm
            let expected_focal = 4.2 / (2.0 * (4.0_f64.to_radians()).tan());
            println!("Expected focal: {}, Got: min={}, max={}", expected_focal, focal.min, focal.max);
            
            assert!((focal.min - expected_focal).abs() < 0.1, "Min focal should be ~30mm");
            assert!((focal.max - expected_focal).abs() < 0.1, "Max focal should be ~30mm");
            assert!((focal.min - focal.max).abs() < 0.01, "Min and max should be the same (determined value)");
        }
    }

    #[test]
    fn test_dori_ranges_fov_with_focal_determines_sensor() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test: FOV=60°, focal=25mm should give sensor≈43.3mm
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: None,
            sensor_height_mm: None,
            pixel_width: Some(4000),
            pixel_height: None,
            focal_length_mm: Some(25.0),
            horizontal_fov_deg: Some(60.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Sensor width should be determined (fixed value)
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should be calculated");
        
        if let Some(sensor) = &ranges.sensor_width_mm {
            // sensor = 2 × focal × tan(FOV/2)
            // sensor = 2 × 25 × tan(30°)
            // sensor ≈ 28.87 mm
            let expected_sensor = 2.0 * 25.0 * (30.0_f64.to_radians()).tan();
            println!("Expected sensor: {}, Got: min={}, max={}", expected_sensor, sensor.min, sensor.max);
            
            assert!((sensor.min - expected_sensor).abs() < 0.1, "Min sensor should be ~28.87mm");
            assert!((sensor.max - expected_sensor).abs() < 0.1, "Max sensor should be ~28.87mm");
            assert!((sensor.min - sensor.max).abs() < 0.01, "Min and max should be the same (determined value)");
        }
    }
}
