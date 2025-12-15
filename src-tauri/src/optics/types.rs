use serde::{Deserialize, Serialize};

/// Represents a camera sensor specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraSystem {
    /// Sensor width in millimeters
    pub sensor_width_mm: f64,
    /// Sensor height in millimeters
    pub sensor_height_mm: f64,
    /// Horizontal pixel count
    pub pixel_width: u32,
    /// Vertical pixel count
    pub pixel_height: u32,
    /// Lens focal length in millimeters
    pub focal_length_mm: f64,
    /// Optional name for identification
    pub name: Option<String>,
}

/// Results of field-of-view calculations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FovResult {
    /// Horizontal field of view in degrees
    pub horizontal_fov_deg: f64,
    /// Vertical field of view in degrees
    pub vertical_fov_deg: f64,
    /// Horizontal field of view at specified distance in meters
    pub horizontal_fov_m: f64,
    /// Vertical field of view at specified distance in meters
    pub vertical_fov_m: f64,
    /// Horizontal pixels per meter at specified distance
    pub horizontal_ppm: f64,
    /// Vertical pixels per meter at specified distance
    pub vertical_ppm: f64,
    /// Distance at which calculation was performed in meters
    pub distance_m: f64,
    /// DORI distances (Detection, Observation, Recognition, Identification)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dori: Option<DoriDistances>,
}

/// DORI (Detection, Observation, Recognition, Identification) distances
/// Standard for surveillance camera performance evaluation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DoriDistances {
    /// Detection distance: identify that an object is present (25 px/m)
    pub detection_m: f64,
    /// Observation distance: determine general characteristics (62.5 px/m)
    pub observation_m: f64,
    /// Recognition distance: recognize familiar person/object (125 px/m)
    pub recognition_m: f64,
    /// Identification distance: identify specific person beyond reasonable doubt (250 px/m)
    pub identification_m: f64,
}

/// Combined camera system with its calculated FOV result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraWithResult {
    pub camera: CameraSystem,
    pub result: FovResult,
}

impl CameraWithResult {
    /// Validate both the camera system and result, returning all warnings
    pub fn validate(&self) -> Vec<ValidationWarning> {
        let mut warnings = Vec::new();
        warnings.extend(self.camera.validate());
        warnings.extend(self.result.validate());
        warnings
    }
}

/// Target DORI distances for inverse calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DoriTargets {
    /// Target detection distance in meters (optional)
    pub detection_m: Option<f64>,
    /// Target observation distance in meters (optional)
    pub observation_m: Option<f64>,
    /// Target recognition distance in meters (optional)
    pub recognition_m: Option<f64>,
    /// Target identification distance in meters (optional)
    pub identification_m: Option<f64>,
}

/// Range of possible values for a parameter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterRange {
    pub min: f64,
    pub max: f64,
}

/// Fixed constraint for a parameter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterConstraint {
    pub sensor_width_mm: Option<f64>,
    pub sensor_height_mm: Option<f64>,
    pub pixel_width: Option<u32>,
    pub pixel_height: Option<u32>,
    pub focal_length_mm: Option<f64>,
    pub horizontal_fov_deg: Option<f64>,
}

/// Ranges of camera parameters that satisfy DORI requirements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DoriParameterRanges {
    /// Range for sensor width in mm (if not constrained)
    pub sensor_width_mm: Option<ParameterRange>,
    /// Range for sensor height in mm (if not constrained)
    pub sensor_height_mm: Option<ParameterRange>,
    /// Range for horizontal pixel count (if not constrained)
    pub pixel_width: Option<ParameterRange>,
    /// Range for vertical pixel count (if not constrained)
    pub pixel_height: Option<ParameterRange>,
    /// Range for focal length in mm (if not constrained)
    pub focal_length_mm: Option<ParameterRange>,
    /// Range for horizontal FOV in degrees (if not constrained)
    pub horizontal_fov_deg: Option<ParameterRange>,
}

/// Validation warning for camera system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationWarning {
    pub message: String,
    pub severity: ValidationSeverity,
}

/// Severity level of validation warnings
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ValidationSeverity {
    Warning,
    Error,
}

impl CameraSystem {
    /// Create a new camera system
    pub fn new(
        sensor_width_mm: f64,
        sensor_height_mm: f64,
        pixel_width: u32,
        pixel_height: u32,
        focal_length_mm: f64,
    ) -> Self {
        Self {
            sensor_width_mm,
            sensor_height_mm,
            pixel_width,
            pixel_height,
            focal_length_mm,
            name: None,
        }
    }

    /// Set a name for this camera system
    pub fn with_name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }

    /// Get pixel pitch in micrometers
    pub fn pixel_pitch_um(&self) -> (f64, f64) {
        let h_pitch = (self.sensor_width_mm * 1000.0) / self.pixel_width as f64;
        let v_pitch = (self.sensor_height_mm * 1000.0) / self.pixel_height as f64;
        (h_pitch, v_pitch)
    }

    /// Validate the camera system configuration and return any warnings
    pub fn validate(&self) -> Vec<ValidationWarning> {
        let mut warnings = Vec::new();

        // Check sensor dimensions (typical range: 1-100mm)
        if self.sensor_width_mm < 1.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Sensor width ({:.2} mm) is unrealistically small",
                    self.sensor_width_mm
                ),
                severity: ValidationSeverity::Error,
            });
        }
        if self.sensor_width_mm > 100.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Sensor width ({:.2} mm) is unrealistically large",
                    self.sensor_width_mm
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        if self.sensor_height_mm < 1.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Sensor height ({:.2} mm) is unrealistically small",
                    self.sensor_height_mm
                ),
                severity: ValidationSeverity::Error,
            });
        }
        if self.sensor_height_mm > 100.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Sensor height ({:.2} mm) is unrealistically large",
                    self.sensor_height_mm
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        // Check focal length (typical range: 1-2000mm)
        if self.focal_length_mm < 1.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Focal length ({:.2} mm) is unrealistically short",
                    self.focal_length_mm
                ),
                severity: ValidationSeverity::Error,
            });
        }
        if self.focal_length_mm > 2000.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Focal length ({:.0} mm) is extremely long",
                    self.focal_length_mm
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        // Check resolution (typical range: 100-50000 pixels)
        if self.pixel_width < 100 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Pixel width ({} px) is unrealistically low",
                    self.pixel_width
                ),
                severity: ValidationSeverity::Error,
            });
        }
        if self.pixel_width > 50000 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Pixel width ({} px) is unrealistically high",
                    self.pixel_width
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        if self.pixel_height < 100 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Pixel height ({} px) is unrealistically low",
                    self.pixel_height
                ),
                severity: ValidationSeverity::Error,
            });
        }
        if self.pixel_height > 50000 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Pixel height ({} px) is unrealistically high",
                    self.pixel_height
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        // Check pixel pitch (typical range: 0.5-20 µm)
        let (h_pitch, v_pitch) = self.pixel_pitch_um();
        if h_pitch < 0.5 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Horizontal pixel pitch ({:.2} µm) is unrealistically small",
                    h_pitch
                ),
                severity: ValidationSeverity::Error,
            });
        }
        if h_pitch > 20.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Horizontal pixel pitch ({:.2} µm) is unusually large",
                    h_pitch
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        if v_pitch < 0.5 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Vertical pixel pitch ({:.2} µm) is unrealistically small",
                    v_pitch
                ),
                severity: ValidationSeverity::Error,
            });
        }
        if v_pitch > 20.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Vertical pixel pitch ({:.2} µm) is unusually large",
                    v_pitch
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        // Check aspect ratio consistency (sensor vs pixel)
        let sensor_aspect = self.sensor_width_mm / self.sensor_height_mm;
        let pixel_aspect = self.pixel_width as f64 / self.pixel_height as f64;

        // Allow 5% tolerance for aspect ratio mismatch
        let aspect_tolerance = 0.05;
        let aspect_diff_percent = ((sensor_aspect - pixel_aspect).abs() / sensor_aspect) * 100.0;

        if (sensor_aspect - pixel_aspect).abs() / sensor_aspect > aspect_tolerance {
            warnings.push(ValidationWarning {
                message: format!(
                    "Sensor aspect ratio ({:.3}:1) doesn't match pixel aspect ratio ({:.3}:1) - difference: {:.1}%",
                    sensor_aspect, pixel_aspect, aspect_diff_percent
                ),
                severity: ValidationSeverity::Error,
            });
        }

        // Check that pixel pitch is consistent in both dimensions (square pixels)
        let pitch_diff_percent = ((h_pitch - v_pitch).abs() / h_pitch) * 100.0;
        if pitch_diff_percent > 5.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Pixels are not square: horizontal pitch ({:.2} µm) differs from vertical pitch ({:.2} µm) by {:.1}%",
                    h_pitch, v_pitch, pitch_diff_percent
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        warnings
    }

    /// Get aspect ratio (width / height)
    pub fn aspect_ratio(&self) -> (f64, f64) {
        let sensor_aspect = self.sensor_width_mm / self.sensor_height_mm;
        let pixel_aspect = self.pixel_width as f64 / self.pixel_height as f64;
        (sensor_aspect, pixel_aspect)
    }
}

impl std::fmt::Display for CameraSystem {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let name = self.name.as_deref().unwrap_or("Unnamed");
        let (h_pitch, v_pitch) = self.pixel_pitch_um();
        write!(
            f,
            "{}: {}x{} mm sensor, {}x{} px ({:.2}x{:.2} µm), {} mm lens",
            name,
            self.sensor_width_mm,
            self.sensor_height_mm,
            self.pixel_width,
            self.pixel_height,
            h_pitch,
            v_pitch,
            self.focal_length_mm
        )
    }
}

impl FovResult {
    /// Validate the FOV result and return any warnings
    pub fn validate(&self) -> Vec<ValidationWarning> {
        let mut warnings = Vec::new();

        // Check FOV angles (should be between 0 and 180 degrees)
        if self.horizontal_fov_deg > 180.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Horizontal FOV ({:.1}°) exceeds 180° - physically impossible",
                    self.horizontal_fov_deg
                ),
                severity: ValidationSeverity::Error,
            });
        }
        if self.horizontal_fov_deg < 0.1 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Horizontal FOV ({:.2}°) is extremely narrow - may be unrealistic",
                    self.horizontal_fov_deg
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        if self.vertical_fov_deg > 180.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Vertical FOV ({:.1}°) exceeds 180° - physically impossible",
                    self.vertical_fov_deg
                ),
                severity: ValidationSeverity::Error,
            });
        }
        if self.vertical_fov_deg < 0.1 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Vertical FOV ({:.2}°) is extremely narrow - may be unrealistic",
                    self.vertical_fov_deg
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        // Check for unrealistic PPM values
        if self.horizontal_ppm > 100000.0 || self.vertical_ppm > 100000.0 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Pixels per meter ({:.1} × {:.1} px/m) is unrealistically high",
                    self.horizontal_ppm, self.vertical_ppm
                ),
                severity: ValidationSeverity::Warning,
            });
        }
        if self.horizontal_ppm < 0.001 || self.vertical_ppm < 0.001 {
            warnings.push(ValidationWarning {
                message: format!(
                    "Pixels per meter ({:.6} × {:.6} px/m) is unrealistically low",
                    self.horizontal_ppm, self.vertical_ppm
                ),
                severity: ValidationSeverity::Warning,
            });
        }

        // Check DORI distances if available
        if let Some(dori) = &self.dori {
            // Detection distance should be reasonable (0.1m - 10,000m)
            if dori.detection_m < 0.1 || dori.detection_m > 10000.0 {
                warnings.push(ValidationWarning {
                    message: format!(
                        "Detection distance ({:.0} m) seems unrealistic",
                        dori.detection_m
                    ),
                    severity: ValidationSeverity::Warning,
                });
            }

            // DORI distances should be in descending order (D > O > R > I)
            if dori.detection_m < dori.observation_m {
                warnings.push(ValidationWarning {
                    message: "Detection distance should be greater than Observation distance"
                        .to_string(),
                    severity: ValidationSeverity::Error,
                });
            }
            if dori.observation_m < dori.recognition_m {
                warnings.push(ValidationWarning {
                    message: "Observation distance should be greater than Recognition distance"
                        .to_string(),
                    severity: ValidationSeverity::Error,
                });
            }
            if dori.recognition_m < dori.identification_m {
                warnings.push(ValidationWarning {
                    message: "Recognition distance should be greater than Identification distance"
                        .to_string(),
                    severity: ValidationSeverity::Error,
                });
            }
        }

        warnings
    }
}

impl std::fmt::Display for FovResult {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "FOV: {:.2}° × {:.2}° ({:.3} × {:.3} m @ {:.2} m)\nResolution: {:.1} × {:.1} px/m",
            self.horizontal_fov_deg,
            self.vertical_fov_deg,
            self.horizontal_fov_m,
            self.vertical_fov_m,
            self.distance_m,
            self.horizontal_ppm,
            self.vertical_ppm
        )
    }
}
