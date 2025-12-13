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
    let horizontal_ppm = camera.pixel_width as f64 / horizontal_fov_m;
    let vertical_ppm = camera.pixel_height as f64 / vertical_fov_m;
    
    // Calculate DORI distances
    let dori = calculate_dori_distances(camera);
    
    FovResult {
        horizontal_fov_deg,
        vertical_fov_deg,
        horizontal_fov_m,
        vertical_fov_m,
        horizontal_ppm,
        vertical_ppm,
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
        
        // Calculate height dimensions before returning (FOV branch exits early)
        const STANDARD_ASPECT_RATIO: f64 = 4.0 / 3.0;
        
        if constraints.sensor_height_mm.is_none() {
            if let Some(sensor_width_range) = &ranges.sensor_width_mm {
                ranges.sensor_height_mm = Some(ParameterRange {
                    min: sensor_width_range.min / STANDARD_ASPECT_RATIO,
                    max: sensor_width_range.max / STANDARD_ASPECT_RATIO,
                });
            } else if let Some(sensor_w) = constraints.sensor_width_mm {
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
                let pixels_h = pixels_w as f64 / STANDARD_ASPECT_RATIO;
                ranges.pixel_height = Some(ParameterRange {
                    min: pixels_h,
                    max: pixels_h,
                });
            }
        }
        
        return ranges; // FOV is fixed, so we handle it completely here
    }
    
    // If focal length is fixed, calculate pixel width and sensor width ranges
    if let Some(focal) = constraints.focal_length_mm {
        if let Some(sensor_w) = constraints.sensor_width_mm {
            // Both focal and sensor are fixed - calculate pixel width range and FOV
            let required_product = target_distance * sensor_w * required_px_per_m / focal;
            let min_pixels = required_product.max(MIN_PIXEL_WIDTH as f64);
            let max_pixels = MAX_PIXEL_WIDTH as f64;
            
            ranges.pixel_width = Some(ParameterRange {
                min: min_pixels,
                max: max_pixels,
            });
            
            // Calculate determined FOV value
            let fov = calc_fov_deg(sensor_w, focal);
            ranges.horizontal_fov_deg = Some(ParameterRange {
                min: fov,
                max: fov,
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
            // Focal and pixels are fixed - sensor is determined
            // From DORI formula: sensor = (focal × pixels) / (distance × px_per_m)
            let sensor = (focal * pixels as f64) / (target_distance * required_px_per_m);
            
            ranges.sensor_width_mm = Some(ParameterRange {
                min: sensor,
                max: sensor,
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
        
        // Height dimensions should also be calculated with 4:3 aspect ratio
        assert!(ranges.sensor_height_mm.is_some(), "Sensor height should be calculated");
        assert!(ranges.pixel_height.is_some(), "Pixel height should be calculated");
        
        if let Some(sensor_h) = &ranges.sensor_height_mm {
            let expected_height = 4.2 / (4.0 / 3.0); // 3.15mm
            println!("Expected sensor height: {}, Got: min={}, max={}", expected_height, sensor_h.min, sensor_h.max);
            assert!((sensor_h.min - expected_height).abs() < 0.01, "Sensor height should be 3.15mm");
            assert!((sensor_h.max - expected_height).abs() < 0.01, "Sensor height should be 3.15mm");
        }
        
        if let Some(pixel_h) = &ranges.pixel_height {
            let expected_height = 6000.0 / (4.0 / 3.0); // 4500
            println!("Expected pixel height: {}, Got: min={}, max={}", expected_height, pixel_h.min, pixel_h.max);
            assert!((pixel_h.min - expected_height).abs() < 0.01, "Pixel height should be 4500");
            assert!((pixel_h.max - expected_height).abs() < 0.01, "Pixel height should be 4500");
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

    #[test]
    fn test_dori_ranges_sensor_with_focal_determines_fov() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test case from screenshot: sensor=5mm, focal=75mm should give FOV≈3.82°
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(5.0),
            sensor_height_mm: None,
            pixel_width: Some(6000),
            pixel_height: None,
            focal_length_mm: Some(75.0),
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // FOV should be determined (fixed value)
        assert!(ranges.horizontal_fov_deg.is_some(), "FOV should be calculated");
        
        if let Some(fov) = &ranges.horizontal_fov_deg {
            // FOV = 2 × atan(sensor / (2 × focal))
            // FOV = 2 × atan(5 / (2 × 75))
            // FOV = 2 × atan(5 / 150)
            // FOV ≈ 3.82°
            let sensor_over_twice_focal = 5.0_f64 / (2.0 * 75.0);
            let expected_fov = 2.0 * sensor_over_twice_focal.atan().to_degrees();
            println!("Expected FOV: {}, Got: min={}, max={}", expected_fov, fov.min, fov.max);
            
            assert!((fov.min - expected_fov).abs() < 0.01, "Min FOV should be ~3.82°");
            assert!((fov.max - expected_fov).abs() < 0.01, "Max FOV should be ~3.82°");
            assert!((fov.min - fov.max).abs() < 0.01, "Min and max should be the same (determined value)");
        }
    }

    // Comprehensive test cases for all parameter combinations
    // Parameters: sensor_width, pixel_width, focal_length, horizontal_fov
    // Each can be Some (constrained) or None (unconstrained)
    // This gives 2^4 = 16 combinations

    #[test]
    fn test_combo_none_none_none_none() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 0000: All unconstrained - should give full ranges for all parameters
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
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // All should have ranges
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should have range");
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
        assert!(ranges.horizontal_fov_deg.is_some(), "FOV should have range");
        assert!(ranges.sensor_height_mm.is_some(), "Sensor height should have range");
        assert!(ranges.pixel_height.is_some(), "Pixel height should have range");
        
        // FOV range should span from narrow to wide angles
        if let Some(fov) = &ranges.horizontal_fov_deg {
            assert!(fov.min > 0.0 && fov.min < fov.max && fov.max < 180.0);
        }
    }

    #[test]
    fn test_combo_sensor_none_none_none() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 1000: Only sensor constrained
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(8.0),
            sensor_height_mm: None,
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Sensor should not have range (it's fixed)
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None (fixed input)");
        // Others should have ranges
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
        assert!(ranges.horizontal_fov_deg.is_some(), "FOV should have range");
        // Height should be calculated
        assert!(ranges.sensor_height_mm.is_some(), "Sensor height should be calculated");
        
        if let Some(sensor_h) = &ranges.sensor_height_mm {
            let expected = 8.0 / (4.0 / 3.0);
            assert!((sensor_h.min - expected).abs() < 0.01);
        }
    }

    #[test]
    fn test_combo_none_pixel_none_none() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 0100: Only pixel_width constrained
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: None,
            sensor_height_mm: None,
            pixel_width: Some(3840),
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Pixel should not have range (it's fixed)
        assert!(ranges.pixel_width.is_none(), "Pixel width should be None (fixed input)");
        // Sensor and focal should have constrained ranges
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should have range");
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
        assert!(ranges.horizontal_fov_deg.is_some(), "FOV should have range");
        // Pixel height should be calculated
        assert!(ranges.pixel_height.is_some(), "Pixel height should be calculated");
        
        if let Some(pixel_h) = &ranges.pixel_height {
            let expected = 3840.0 / (4.0 / 3.0);
            assert!((pixel_h.min - expected).abs() < 0.01);
        }
    }

    #[test]
    fn test_combo_sensor_pixel_none_none() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 1100: Sensor and pixel constrained
        let targets = DoriTargets {
            identification_m: Some(15.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(6.4),
            sensor_height_mm: None,
            pixel_width: Some(1920),
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Sensor and pixel should not have ranges (fixed inputs)
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None");
        assert!(ranges.pixel_width.is_none(), "Pixel width should be None");
        // Focal should have constrained range
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
        assert!(ranges.horizontal_fov_deg.is_some(), "FOV should have range");
        
        // Verify focal range makes sense for DORI requirement
        if let Some(focal) = &ranges.focal_length_mm {
            // Min focal = (distance × sensor × px_per_m) / pixels
            let expected_min = (15.0 * 6.4 * 250.0) / 1920.0;
            assert!((focal.min - expected_min).abs() < 0.5, 
                "Min focal should be ~{}, got {}", expected_min, focal.min);
        }
    }

    #[test]
    fn test_combo_none_none_focal_none() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 0010: Only focal constrained
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
            focal_length_mm: Some(50.0),
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Focal should not have range (it's fixed)
        assert!(ranges.focal_length_mm.is_none(), "Focal length should be None (fixed input)");
        // Others should have ranges
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should have range");
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        assert!(ranges.horizontal_fov_deg.is_some(), "FOV should have range");
    }

    #[test]
    fn test_combo_sensor_none_focal_none() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 1010: Sensor and focal constrained - FOV is determined
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(12.0),
            sensor_height_mm: None,
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: Some(35.0),
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Sensor and focal should not have ranges (fixed inputs)
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None");
        assert!(ranges.focal_length_mm.is_none(), "Focal length should be None");
        // Pixel should have range
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        // FOV should be determined (single value)
        assert!(ranges.horizontal_fov_deg.is_some(), "FOV should be calculated");
        
        if let Some(fov) = &ranges.horizontal_fov_deg {
            let ratio = 12.0_f64 / (2.0 * 35.0);
            let expected = 2.0 * ratio.atan().to_degrees();
            assert!((fov.min - expected).abs() < 0.1, "FOV should be ~{}", expected);
            assert!((fov.min - fov.max).abs() < 0.01, "FOV should be single value");
        }
    }

    #[test]
    fn test_combo_none_pixel_focal_none() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 0110: Pixel and focal constrained
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: None,
            sensor_height_mm: None,
            pixel_width: Some(2560),
            pixel_height: None,
            focal_length_mm: Some(25.0),
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Pixel and focal should not have ranges (fixed inputs)
        assert!(ranges.pixel_width.is_none(), "Pixel width should be None");
        assert!(ranges.focal_length_mm.is_none(), "Focal length should be None");
        // Sensor should have range
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should have range");
        assert!(ranges.horizontal_fov_deg.is_some(), "FOV should have range");
    }

    #[test]
    fn test_combo_sensor_pixel_focal_none() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 1110: Sensor, pixel, and focal constrained
        // Note: When sensor and focal are fixed, the code still calculates
        // what pixel range would meet the DORI requirement (for validation purposes)
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(7.66),
            sensor_height_mm: None,
            pixel_width: Some(1920),
            pixel_height: None,
            focal_length_mm: Some(16.0),
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // When sensor + focal are fixed, pixel still gets a range (requirement range)
        // This tells us what pixel widths would meet the DORI requirement
        assert!(ranges.pixel_width.is_some(), "Pixel width range should show DORI requirement");
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None (fixed)");
        assert!(ranges.focal_length_mm.is_none(), "Focal length should be None (fixed)");
        // FOV should be calculated
        assert!(ranges.horizontal_fov_deg.is_some(), "FOV should be calculated");
        
        if let Some(fov) = &ranges.horizontal_fov_deg {
            assert!((fov.min - fov.max).abs() < 0.01, "FOV should be single value");
        }
    }

    #[test]
    fn test_combo_none_none_none_fov() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 0001: Only FOV constrained
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
            horizontal_fov_deg: Some(45.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // FOV should not have range (it's fixed)
        assert!(ranges.horizontal_fov_deg.is_none(), "FOV should be None (fixed input)");
        // Focal and sensor should have ranges constrained by FOV relationship
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should have range");
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        
        // Verify sensor/focal maintain FOV relationship
        if let (Some(focal), Some(sensor)) = (&ranges.focal_length_mm, &ranges.sensor_width_mm) {
            let fov_min = 2.0 * (sensor.min / (2.0 * focal.min)).atan().to_degrees();
            let fov_max = 2.0 * (sensor.max / (2.0 * focal.max)).atan().to_degrees();
            assert!((fov_min - 45.0).abs() < 1.0, "FOV at min should be ~45°");
            assert!((fov_max - 45.0).abs() < 1.0, "FOV at max should be ~45°");
        }
    }

    #[test]
    fn test_combo_sensor_none_none_fov() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 1001: Sensor and FOV constrained - focal is determined
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(10.0),
            sensor_height_mm: None,
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: Some(30.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Sensor and FOV should not have ranges (fixed inputs)
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None");
        assert!(ranges.horizontal_fov_deg.is_none(), "FOV should be None");
        // Focal should be calculated, pixel should have range
        assert!(ranges.focal_length_mm.is_some(), "Focal length should be calculated");
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        
        if let Some(focal) = &ranges.focal_length_mm {
            let expected = 10.0 / (2.0 * (15.0_f64.to_radians()).tan());
            assert!((focal.min - expected).abs() < 0.5, "Focal should be ~{}", expected);
            assert!((focal.min - focal.max).abs() < 0.01, "Focal should be single value");
        }
    }

    #[test]
    fn test_combo_none_pixel_none_fov() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 0101: Pixel and FOV constrained
        let targets = DoriTargets {
            identification_m: Some(10.0),
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
            horizontal_fov_deg: Some(60.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Pixel and FOV should not have ranges (fixed inputs)
        assert!(ranges.pixel_width.is_none(), "Pixel width should be None");
        assert!(ranges.horizontal_fov_deg.is_none(), "FOV should be None");
        // Focal and sensor should have ranges maintaining FOV relationship
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should have range");
    }

    #[test]
    fn test_combo_sensor_pixel_none_fov() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 1101: Sensor, pixel, and FOV constrained - focal is determined
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(8.8),
            sensor_height_mm: None,
            pixel_width: Some(3840),
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: Some(50.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Sensor, pixel, and FOV should not have ranges (fixed inputs)
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None");
        assert!(ranges.pixel_width.is_none(), "Pixel width should be None");
        assert!(ranges.horizontal_fov_deg.is_none(), "FOV should be None");
        // Focal should be calculated
        assert!(ranges.focal_length_mm.is_some(), "Focal length should be calculated");
        
        if let Some(focal) = &ranges.focal_length_mm {
            let expected = 8.8 / (2.0 * (25.0_f64.to_radians()).tan());
            assert!((focal.min - expected).abs() < 0.5, "Focal should be ~{}", expected);
            assert!((focal.min - focal.max).abs() < 0.01, "Focal should be single value");
        }
    }

    #[test]
    fn test_combo_none_none_focal_fov() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 0011: Focal and FOV constrained - sensor is determined
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
            focal_length_mm: Some(50.0),
            horizontal_fov_deg: Some(40.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Focal and FOV should not have ranges (fixed inputs)
        assert!(ranges.focal_length_mm.is_none(), "Focal length should be None");
        assert!(ranges.horizontal_fov_deg.is_none(), "FOV should be None");
        // Sensor should be calculated, pixel should have range
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should be calculated");
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        
        if let Some(sensor) = &ranges.sensor_width_mm {
            let expected = 2.0 * 50.0 * (20.0_f64.to_radians()).tan();
            assert!((sensor.min - expected).abs() < 0.5, "Sensor should be ~{}", expected);
            assert!((sensor.min - sensor.max).abs() < 0.01, "Sensor should be single value");
        }
    }

    #[test]
    fn test_combo_sensor_none_focal_fov() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 1011: Sensor, focal, and FOV constrained - over-constrained system
        // When FOV + focal are constrained, the code calculates what sensor SHOULD be
        // This returns the calculated sensor value for validation purposes
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        // Use consistent values: sensor=36mm, focal=50mm -> FOV≈39.6°
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(36.0),
            sensor_height_mm: None,
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: Some(50.0),
            horizontal_fov_deg: Some(39.6),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // FOV branch calculates sensor from focal + FOV, even if sensor is also constrained
        // This allows validation that the three parameters are consistent
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should be calculated for validation");
        assert!(ranges.focal_length_mm.is_none(), "Focal length should be None (fixed input)");
        assert!(ranges.horizontal_fov_deg.is_none(), "FOV should be None (fixed input)");
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        
        // Verify the calculated sensor matches the input (validates consistency)
        if let Some(sensor) = &ranges.sensor_width_mm {
            let expected = 2.0 * 50.0 * (39.6_f64 / 2.0).to_radians().tan();
            assert!((sensor.min - expected).abs() < 1.0, 
                "Calculated sensor should match FOV+focal relationship: {} vs {}", sensor.min, expected);
            assert!((sensor.min - 36.0).abs() < 1.0, 
                "Calculated sensor should approximately match input for consistency");
        }
    }

    #[test]
    fn test_combo_none_pixel_focal_fov() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 0111: Pixel, focal, and FOV constrained - sensor is determined
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: None,
            sensor_height_mm: None,
            pixel_width: Some(4096),
            pixel_height: None,
            focal_length_mm: Some(28.0),
            horizontal_fov_deg: Some(65.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Pixel, focal, and FOV should not have ranges (fixed inputs)
        assert!(ranges.pixel_width.is_none(), "Pixel width should be None");
        assert!(ranges.focal_length_mm.is_none(), "Focal length should be None");
        assert!(ranges.horizontal_fov_deg.is_none(), "FOV should be None");
        // Sensor should be calculated
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should be calculated");
        
        if let Some(sensor) = &ranges.sensor_width_mm {
            let expected = 2.0 * 28.0 * (32.5_f64.to_radians()).tan();
            assert!((sensor.min - expected).abs() < 1.0, "Sensor should be ~{}", expected);
            assert!((sensor.min - sensor.max).abs() < 0.01, "Sensor should be single value");
        }
    }

    #[test]
    fn test_combo_sensor_pixel_focal_fov() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Case 1111: All constrained - fully determined system
        // Similar to previous case: FOV+focal causes sensor to be calculated for validation
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        // Use consistent values: sensor=6.4mm, focal=4mm -> FOV≈84°
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(6.4),
            sensor_height_mm: None,
            pixel_width: Some(1920),
            pixel_height: None,
            focal_length_mm: Some(4.0),
            horizontal_fov_deg: Some(84.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // When FOV is constrained, it enters the FOV branch
        // FOV + focal determines sensor, even if sensor+pixel are also constrained
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width calculated for validation");
        assert!(ranges.pixel_width.is_none(), "Pixel width should be None (fixed input)");
        assert!(ranges.focal_length_mm.is_none(), "Focal length should be None (fixed input)");
        assert!(ranges.horizontal_fov_deg.is_none(), "FOV should be None (fixed input)");
        
        // Heights should be calculated
        assert!(ranges.sensor_height_mm.is_some(), "Sensor height should be calculated");
        assert!(ranges.pixel_height.is_some(), "Pixel height should be calculated");
        
        // Verify calculated sensor is consistent with input
        if let Some(sensor) = &ranges.sensor_width_mm {
            assert!((sensor.min - 6.4).abs() < 1.0, 
                "Calculated sensor should approximately match input: {}", sensor.min);
        }
    }

    // Additional tests for height parameters as constraints
    
    #[test]
    fn test_height_sensor_height_only() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test with only sensor_height constrained (unusual but valid)
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: None,
            sensor_height_mm: Some(6.0),
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Sensor height is fixed, should not have range
        assert!(ranges.sensor_height_mm.is_none(), "Sensor height should be None (fixed input)");
        // Other parameters should have ranges
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should have range");
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
    }

    #[test]
    fn test_height_pixel_height_only() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test with only pixel_height constrained
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
            pixel_height: Some(1080),
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Pixel height is fixed, should not have range
        assert!(ranges.pixel_height.is_none(), "Pixel height should be None (fixed input)");
        // Other parameters should have ranges
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should have range");
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
    }

    #[test]
    fn test_height_sensor_width_and_height() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test with both sensor width and height constrained (custom aspect ratio)
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(12.0),
            sensor_height_mm: Some(8.0), // 3:2 aspect ratio instead of 4:3
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Both sensor dimensions are fixed
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None (fixed)");
        assert!(ranges.sensor_height_mm.is_none(), "Sensor height should be None (fixed)");
        // Other parameters should have ranges
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
    }

    #[test]
    fn test_height_pixel_width_and_height() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test with both pixel width and height constrained (custom aspect ratio)
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: None,
            sensor_height_mm: None,
            pixel_width: Some(1920),
            pixel_height: Some(1080), // 16:9 aspect ratio
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Both pixel dimensions are fixed
        assert!(ranges.pixel_width.is_none(), "Pixel width should be None (fixed)");
        assert!(ranges.pixel_height.is_none(), "Pixel height should be None (fixed)");
        // Other parameters should have ranges
        assert!(ranges.sensor_width_mm.is_some(), "Sensor width should have range");
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
    }

    #[test]
    fn test_height_sensor_and_focal_with_sensor_height() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test sensor width + height + focal (determines aspect ratio)
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(8.0),
            sensor_height_mm: Some(6.0), // 4:3 aspect
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: Some(25.0),
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Sensor dimensions and focal are fixed
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None");
        assert!(ranges.sensor_height_mm.is_none(), "Sensor height should be None");
        assert!(ranges.focal_length_mm.is_none(), "Focal length should be None");
        // Pixel should have range, and pixel_height should maintain aspect ratio
        assert!(ranges.pixel_width.is_some(), "Pixel width should have range");
        
        if let Some(pixel_h) = &ranges.pixel_height {
            if let Some(pixel_w) = &ranges.pixel_width {
                // Should maintain 4:3 aspect ratio
                let aspect_min = pixel_w.min / pixel_h.min;
                let aspect_max = pixel_w.max / pixel_h.max;
                assert!((aspect_min - 4.0/3.0).abs() < 0.01, "Min aspect should be 4:3");
                assert!((aspect_max - 4.0/3.0).abs() < 0.01, "Max aspect should be 4:3");
            }
        }
    }

    #[test]
    fn test_height_all_pixels_constrained() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test with all pixel dimensions constrained along with sensor
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(6.4),
            sensor_height_mm: Some(4.8), // 4:3
            pixel_width: Some(1920),
            pixel_height: Some(1440), // 4:3
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // All dimensions are fixed, only focal should have range
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None");
        assert!(ranges.sensor_height_mm.is_none(), "Sensor height should be None");
        assert!(ranges.pixel_width.is_none(), "Pixel width should be None");
        assert!(ranges.pixel_height.is_none(), "Pixel height should be None");
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
    }

    #[test]
    fn test_height_mismatched_aspect_ratios() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test with mismatched aspect ratios (sensor 4:3, pixels 16:9)
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(8.0),
            sensor_height_mm: Some(6.0), // 4:3 aspect
            pixel_width: Some(1920),
            pixel_height: Some(1080), // 16:9 aspect
            focal_length_mm: None,
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // All dimensions fixed despite mismatched aspect ratios
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None");
        assert!(ranges.sensor_height_mm.is_none(), "Sensor height should be None");
        assert!(ranges.pixel_width.is_none(), "Pixel width should be None");
        assert!(ranges.pixel_height.is_none(), "Pixel height should be None");
        // Focal should still have range
        assert!(ranges.focal_length_mm.is_some(), "Focal length should have range");
    }

    #[test]
    fn test_height_fov_with_heights() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test FOV constraint with height dimensions
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(6.0),
            sensor_height_mm: Some(4.5), // 4:3
            pixel_width: None,
            pixel_height: None,
            focal_length_mm: None,
            horizontal_fov_deg: Some(45.0),
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Sensor width, height, and FOV are fixed - focal should be determined
        assert!(ranges.sensor_width_mm.is_none(), "Sensor width should be None");
        assert!(ranges.sensor_height_mm.is_none(), "Sensor height should be None");
        assert!(ranges.horizontal_fov_deg.is_none(), "FOV should be None");
        // Focal should be calculated
        assert!(ranges.focal_length_mm.is_some(), "Focal length should be calculated");
        
        if let Some(focal) = &ranges.focal_length_mm {
            // Verify it's a single value (determined)
            assert!((focal.min - focal.max).abs() < 0.01, "Focal should be single value");
        }
    }

    #[test]
    fn test_height_vertical_fov_implications() {
        use crate::optics::types::{DoriTargets, ParameterConstraint};
        
        // Test that vertical FOV is implied by horizontal FOV and aspect ratio
        let targets = DoriTargets {
            identification_m: Some(10.0),
            observation_m: None,
            recognition_m: None,
            detection_m: None,
        };
        
        let constraints = ParameterConstraint {
            sensor_width_mm: Some(12.0),
            sensor_height_mm: Some(9.0), // 4:3
            pixel_width: Some(1920),
            pixel_height: Some(1440), // 4:3
            focal_length_mm: Some(50.0),
            horizontal_fov_deg: None,
        };
        
        let ranges = calculate_dori_parameter_ranges(&targets, &constraints);
        
        // Everything is fixed - FOV should be calculated
        assert!(ranges.horizontal_fov_deg.is_some(), "Horizontal FOV should be calculated");
        
        // Note: Vertical FOV would be calculated as:
        // vertical_fov = 2 × atan(sensor_height / (2 × focal))
        // But our system only tracks horizontal FOV in ranges
        if let Some(h_fov) = &ranges.horizontal_fov_deg {
            let ratio = 12.0_f64 / (2.0 * 50.0);
            let expected_h = 2.0 * ratio.atan().to_degrees();
            assert!((h_fov.min - expected_h).abs() < 0.5, "Horizontal FOV should be ~{}", expected_h);
        }
    }
}
