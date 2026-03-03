use super::types::{ImageDownsampleParams, ImageDownsampleResult};

/// Calculate image downsampling parameters for the preview visualization.
///
/// Given the camera's spatial resolution (pixels per meter) at a working distance,
/// the real-world width of the scene depicted in the image, and the original image
/// dimensions, this computes how many pixels the camera would actually capture and
/// the appropriate display scaling for a pixelated preview.
pub fn calculate_image_downsample(params: &ImageDownsampleParams) -> ImageDownsampleResult {
    // Real-world scene dimensions in millimeters
    let scene_width_mm = params.image_real_world_width_m * 1000.0;
    let scene_height_mm =
        (params.original_height_px as f64 / params.original_width_px as f64) * scene_width_mm;

    // How many pixels the camera would capture for this scene area
    // ppm is pixels-per-meter, so convert mm → m first
    let camera_pixels_h_raw = (scene_width_mm / 1000.0) * params.horizontal_ppm;
    let camera_pixels_v_raw = (scene_height_mm / 1000.0) * params.vertical_ppm;

    // Ensure at least 1 pixel in each dimension
    let camera_pixels_h = (camera_pixels_h_raw.floor() as u32).max(1);
    let camera_pixels_v = (camera_pixels_v_raw.floor() as u32).max(1);

    // Calculate scale factor to show pixelation clearly
    let min_scale: u32 = 2;
    let max_dim = camera_pixels_h.max(camera_pixels_v);

    let mut scale = if max_dim > 0 {
        (params.max_display_size / max_dim).max(min_scale)
    } else {
        min_scale
    };

    // Cap display size to max_display_size
    let mut display_width = camera_pixels_h * scale;
    let mut display_height = camera_pixels_v * scale;

    if display_width > params.max_display_size || display_height > params.max_display_size {
        scale = if max_dim > 0 {
            (params.max_display_size / max_dim).max(1)
        } else {
            min_scale
        };
        display_width = camera_pixels_h * scale;
        display_height = camera_pixels_v * scale;
    }

    // Downsampling ratios (original pixels : camera pixels)
    let downsample_ratio_h = if camera_pixels_h > 0 {
        params.original_width_px / camera_pixels_h
    } else {
        params.original_width_px
    };
    let downsample_ratio_v = if camera_pixels_v > 0 {
        params.original_height_px / camera_pixels_v
    } else {
        params.original_height_px
    };

    ImageDownsampleResult {
        camera_pixels_h,
        camera_pixels_v,
        scale,
        display_width,
        display_height,
        scene_width_mm,
        scene_height_mm,
        downsample_ratio_h,
        downsample_ratio_v,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_downsample_typical_scene() {
        // 1920×1080 image depicting a 2 m wide scene,
        // camera resolves 500 px/m horizontally, 500 px/m vertically
        let params = ImageDownsampleParams {
            horizontal_ppm: 500.0,
            vertical_ppm: 500.0,
            image_real_world_width_m: 2.0,
            original_width_px: 1920,
            original_height_px: 1080,
            max_display_size: 400,
        };
        let r = calculate_image_downsample(&params);

        // 2 m × 500 px/m = 1000 camera pixels horizontal
        assert_eq!(r.camera_pixels_h, 1000);
        // height: (1080/1920)*2000mm = 1125mm → 1.125m × 500 = 562
        assert_eq!(r.camera_pixels_v, 562);

        // max dim = 1000, initial scale = max(2, 400/1000=0) = 2
        // display = 1000*2 = 2000 > 400, so cap: scale = max(1, 400/1000=0) = 1
        assert_eq!(r.scale, 1);
        assert_eq!(r.display_width, 1000);
        assert_eq!(r.display_height, 562);

        assert!((r.scene_width_mm - 2000.0).abs() < 0.01);
        assert!((r.scene_height_mm - 1125.0).abs() < 0.01);

        assert_eq!(r.downsample_ratio_h, 1920 / 1000);
        assert_eq!(r.downsample_ratio_v, 1080 / 562);
    }

    #[test]
    fn test_downsample_very_low_resolution() {
        // Camera can barely resolve anything: 2 px/m, scene is 0.5 m wide
        // → 0.5 * 2 = 1 camera pixel horizontal
        let params = ImageDownsampleParams {
            horizontal_ppm: 2.0,
            vertical_ppm: 2.0,
            image_real_world_width_m: 0.5,
            original_width_px: 800,
            original_height_px: 600,
            max_display_size: 400,
        };
        let r = calculate_image_downsample(&params);

        assert_eq!(r.camera_pixels_h, 1);
        assert_eq!(r.camera_pixels_v, 1); // floor(0.75 * 0.5 * 2) = floor(0.75) = 0 → clamped to 1

        // scale = max(2, 400/1) = 400; display = 1*400 = 400
        assert_eq!(r.scale, 400);
        assert_eq!(r.display_width, 400);
        assert_eq!(r.display_height, 400);

        assert_eq!(r.downsample_ratio_h, 800);
        assert_eq!(r.downsample_ratio_v, 600);
    }

    #[test]
    fn test_downsample_small_camera_pixels_scales_up() {
        // 10 camera pixels wide → should get a visible scale factor
        let params = ImageDownsampleParams {
            horizontal_ppm: 100.0,
            vertical_ppm: 100.0,
            image_real_world_width_m: 0.1, // 100 mm
            original_width_px: 640,
            original_height_px: 480,
            max_display_size: 400,
        };
        let r = calculate_image_downsample(&params);

        // 0.1 m × 100 px/m = 10 camera pixels H
        assert_eq!(r.camera_pixels_h, 10);
        // height: (480/640)*100mm = 75mm → 0.075m × 100 = 7
        assert_eq!(r.camera_pixels_v, 7);

        // max dim = 10, scale = max(2, 400/10) = 40
        assert_eq!(r.scale, 40);
        assert_eq!(r.display_width, 400);
        assert_eq!(r.display_height, 280);
    }

    #[test]
    fn test_downsample_scene_dimensions_preserve_aspect_ratio() {
        let params = ImageDownsampleParams {
            horizontal_ppm: 1000.0,
            vertical_ppm: 1000.0,
            image_real_world_width_m: 3.0,
            original_width_px: 1000,
            original_height_px: 500,
            max_display_size: 400,
        };
        let r = calculate_image_downsample(&params);

        // scene_height_mm = (500/1000) * 3000 = 1500 mm
        assert!((r.scene_width_mm - 3000.0).abs() < 0.01);
        assert!((r.scene_height_mm - 1500.0).abs() < 0.01);

        // camera_pixels: 3.0 * 1000 = 3000 H, 1.5 * 1000 = 1500 V
        assert_eq!(r.camera_pixels_h, 3000);
        assert_eq!(r.camera_pixels_v, 1500);
    }

    #[test]
    fn test_downsample_asymmetric_ppm() {
        // Different horizontal and vertical resolution (anamorphic pixels)
        let params = ImageDownsampleParams {
            horizontal_ppm: 200.0,
            vertical_ppm: 400.0,
            image_real_world_width_m: 1.0,
            original_width_px: 1000,
            original_height_px: 1000,
            max_display_size: 400,
        };
        let r = calculate_image_downsample(&params);

        // H: 1.0 m × 200 = 200
        assert_eq!(r.camera_pixels_h, 200);
        // scene_height = (1000/1000)*1000mm = 1000mm = 1.0m; V: 1.0 × 400 = 400
        assert_eq!(r.camera_pixels_v, 400);
    }

    #[test]
    fn test_downsample_min_one_pixel() {
        // Extremely low resolution — both dimensions clamp to 1
        let params = ImageDownsampleParams {
            horizontal_ppm: 0.5,
            vertical_ppm: 0.5,
            image_real_world_width_m: 0.1, // 100 mm scene
            original_width_px: 4000,
            original_height_px: 3000,
            max_display_size: 400,
        };
        let r = calculate_image_downsample(&params);

        // 0.1 m × 0.5 px/m = 0.05 → floor = 0 → clamped to 1
        assert_eq!(r.camera_pixels_h, 1);
        assert_eq!(r.camera_pixels_v, 1);
    }
}
