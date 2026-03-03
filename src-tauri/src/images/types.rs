use serde::{Deserialize, Serialize};

/// Input parameters for image preview downsampling calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageDownsampleParams {
    /// Horizontal pixels per meter at the working distance
    pub horizontal_ppm: f64,
    /// Vertical pixels per meter at the working distance
    pub vertical_ppm: f64,
    /// Real-world width of the scene shown in the image, in meters
    pub image_real_world_width_m: f64,
    /// Original image width in pixels
    pub original_width_px: u32,
    /// Original image height in pixels
    pub original_height_px: u32,
    /// Maximum display size in pixels (for scaling)
    pub max_display_size: u32,
}

/// Result of image preview downsampling calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageDownsampleResult {
    /// Number of horizontal pixels the camera would capture
    pub camera_pixels_h: u32,
    /// Number of vertical pixels the camera would capture
    pub camera_pixels_v: u32,
    /// Scale factor for pixelated display
    pub scale: u32,
    /// Display width in pixels
    pub display_width: u32,
    /// Display height in pixels
    pub display_height: u32,
    /// Scene width in millimeters
    pub scene_width_mm: f64,
    /// Scene height in millimeters
    pub scene_height_mm: f64,
    /// Horizontal downsampling ratio (original:camera)
    pub downsample_ratio_h: u32,
    /// Vertical downsampling ratio (original:camera)
    pub downsample_ratio_v: u32,
}
