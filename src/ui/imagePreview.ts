/**
 * Image Preview Module - Visualize camera resolution at distance
 */

import type { CameraSystem, FovResult, ImageDownsampleResult } from '../core/types';
import { calculateCameraFov, calculateImageDownsample } from '../services/api';

const CANVAS_SIZE = 400;

let uploadedImage: HTMLImageElement | null = null;
let currentCamera: CameraSystem | null = null;
let currentDistance: number = 25;
let imageRealWorldWidth: number = 1; // meters

/**
 * Initialize the image preview functionality
 */
export function initializeImagePreview(): void {
  const uploadInput = document.getElementById('preview-upload') as HTMLInputElement;
  const distanceSlider = document.getElementById('preview-distance-slider') as HTMLInputElement;
  const distanceValueSpan = document.getElementById('preview-distance-value');
  const mainDistanceInput = document.getElementById('distance') as HTMLInputElement;
  const imageWidthInput = document.getElementById('preview-image-width') as HTMLInputElement;

  if (!uploadInput || !distanceSlider || !imageWidthInput) return;

  // Sync initial values
  if (mainDistanceInput) {
    const mainValue = parseFloat(mainDistanceInput.value) || 25;
    distanceSlider.value = mainValue.toString();
    currentDistance = mainValue;
    if (distanceValueSpan) {
      distanceValueSpan.textContent = mainValue.toFixed(1);
    }
    updateDistanceLabel(currentDistance);
  }

  // Load default image
  loadDefaultImage();

  // Handle image upload
  uploadInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        uploadedImage = img;
        drawOriginalImage(img);
        // Auto-generate preview if camera is set
        if (currentCamera) {
          await generatePreview();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

  // Handle slider change - update preview and sync to main form
  distanceSlider.addEventListener('input', async () => {
    currentDistance = parseFloat(distanceSlider.value) || 25;
    if (distanceValueSpan) {
      distanceValueSpan.textContent = currentDistance.toFixed(1);
    }
    updateDistanceLabel(currentDistance);

    // Sync to main distance field
    if (mainDistanceInput) {
      mainDistanceInput.value = currentDistance.toString();
      // Trigger input event to recalculate FOV in main form
      mainDistanceInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Auto-regenerate preview if we have an image and camera
    if (uploadedImage && currentCamera) {
      await generatePreview();
    }
  });

  // Sync from main distance field to preview slider
  if (mainDistanceInput) {
    mainDistanceInput.addEventListener('input', async () => {
      const mainValue = parseFloat(mainDistanceInput.value) || 25;
      currentDistance = mainValue;
      distanceSlider.value = mainValue.toString();
      if (distanceValueSpan) {
        distanceValueSpan.textContent = mainValue.toFixed(1);
      }
      updateDistanceLabel(currentDistance);

      // Auto-regenerate preview if we have an image and camera
      if (uploadedImage && currentCamera) {
        await generatePreview();
      }
    });
  }

  // Handle image width change - auto-regenerate preview
  imageWidthInput.addEventListener('input', async () => {
    imageRealWorldWidth = parseFloat(imageWidthInput.value) || 1;
    if (uploadedImage && currentCamera) {
      await generatePreview();
    }
  });

  updateDistanceLabel(currentDistance);
}

/**
 * Update camera parameters for preview
 */
export function updatePreviewCamera(camera: CameraSystem, result: FovResult): void {
  currentCamera = camera;

  // Update resolution display
  const resolutionDiv = document.getElementById('preview-resolution');
  if (resolutionDiv) {
    const ppmH = result.horizontal_ppm;
    const ppmV = result.vertical_ppm;
    resolutionDiv.textContent = `${ppmH.toFixed(2)} × ${ppmV.toFixed(2)} px/mm`;
  }
}

/**
 * Draw the original uploaded image on the canvas
 */
function drawOriginalImage(img: HTMLImageElement): void {
  const canvas = document.getElementById('original-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const x = Math.round((CANVAS_SIZE - w) / 2);
  const y = Math.round((CANVAS_SIZE - h) / 2);

  ctx.drawImage(img, x, y, w, h);
}

/**
 * Generate the downsampled preview based on camera resolution
 */
async function generatePreview(): Promise<void> {
  if (!uploadedImage || !currentCamera) {
    console.log('Preview not ready:', {
      uploadedImage: !!uploadedImage,
      currentCamera: !!currentCamera,
    });
    return;
  }

  try {
    // Calculate FOV at current distance (convert m to mm)
    const fovResult = await calculateCameraFov(currentCamera, currentDistance * 1000);

    // Delegate all downsampling math to the Rust backend
    const dsResult = await calculateImageDownsample({
      horizontal_ppm: fovResult.horizontal_ppm,
      vertical_ppm: fovResult.vertical_ppm,
      image_real_world_width_m: imageRealWorldWidth,
      original_width_px: uploadedImage.width,
      original_height_px: uploadedImage.height,
      max_display_size: 400,
    });

    console.log('Downsample result from backend:', dsResult);

    const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
    if (!previewCanvas) return;

    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    // Create a temporary canvas to downsample the image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dsResult.camera_pixels_h;
    tempCanvas.height = dsResult.camera_pixels_v;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) return;

    // Disable image smoothing for pixelated effect
    tempCtx.imageSmoothingEnabled = false;

    // Draw downsampled image
    tempCtx.drawImage(uploadedImage, 0, 0, dsResult.camera_pixels_h, dsResult.camera_pixels_v);

    previewCanvas.width = CANVAS_SIZE;
    previewCanvas.height = CANVAS_SIZE;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Disable smoothing for pixelated display
    ctx.imageSmoothingEnabled = false;

    // Fit the pixelated image centered in the fixed canvas
    const scale = Math.min(
      CANVAS_SIZE / dsResult.display_width,
      CANVAS_SIZE / dsResult.display_height
    );
    const drawW = Math.round(dsResult.display_width * scale);
    const drawH = Math.round(dsResult.display_height * scale);
    const drawX = Math.round((CANVAS_SIZE - drawW) / 2);
    const drawY = Math.round((CANVAS_SIZE - drawH) / 2);

    ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);

    // Update stats
    updatePreviewStats(fovResult, dsResult);
  } catch (error) {
    console.error('Error generating preview:', error);
  }
}

/**
 * Update the preview statistics display
 */
function updatePreviewStats(fov: FovResult, ds: ImageDownsampleResult): void {
  const statsDiv = document.getElementById('preview-stats');
  if (!statsDiv) return;

  statsDiv.innerHTML = `
    <p><strong>Camera captures:</strong> ${ds.camera_pixels_h} × ${ds.camera_pixels_v} pixels</p>
    <p><strong>Scene size:</strong> ${(ds.scene_width_mm / 1000).toFixed(2)}m × ${(ds.scene_height_mm / 1000).toFixed(2)}m</p>
    <p><strong>Resolution:</strong> ${fov.horizontal_ppm.toFixed(2)} × ${fov.vertical_ppm.toFixed(2)} px/mm</p>
    <p><strong>Downsampling:</strong> ${ds.downsample_ratio_h}:1 (H), ${ds.downsample_ratio_v}:1 (V)</p>
  `;
}

/**
 * Update the distance label in the preview header
 */
function updateDistanceLabel(distance: number): void {
  const label = document.getElementById('preview-distance-label');
  if (label) {
    label.textContent = distance.toFixed(1);
  }
}

/**
 * Load the default preview image
 */
function loadDefaultImage(): void {
  const img = new Image();
  img.onload = async () => {
    uploadedImage = img;
    drawOriginalImage(img);
    // Auto-generate preview if camera is already set
    if (currentCamera) {
      await generatePreview();
    }
  };
  img.onerror = () => {
    console.error('Failed to load default image');
  };
  // Use direct path that Vite will resolve
  img.src = new URL('../assets/pierre-person.jpeg', import.meta.url).href;
}
