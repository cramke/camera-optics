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
    /// Pixels per meter at specified distance (spatial resolution)
    pub ppm: f64,
    /// Ground sample distance in millimeters per pixel
    pub gsd_mm: f64,
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

impl std::fmt::Display for FovResult {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "FOV: {:.2}° × {:.2}° ({:.3} × {:.3} m @ {:.2} m)\nResolution: {:.3} px/m, GSD: {:.3} mm/px",
            self.horizontal_fov_deg,
            self.vertical_fov_deg,
            self.horizontal_fov_m,
            self.vertical_fov_m,
            self.distance_m,
            self.ppm,
            self.gsd_mm
        )
    }
}
