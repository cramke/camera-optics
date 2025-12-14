/**
 * Image Preview Module - Visualize camera resolution at distance
 */

import type { CameraSystem, FovResult } from '../core/types';
import { calculateCameraFov } from '../services/api';

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

  // Resize canvas to fit image (max 400px)
  const maxSize = 400;
  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > maxSize) {
      height = (height * maxSize) / width;
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = (width * maxSize) / height;
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
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
    const result = await calculateCameraFov(currentCamera, currentDistance * 1000);

    console.log('Preview calculation:', {
      distance: currentDistance,
      ppmH: result.horizontal_ppm,
      ppmV: result.vertical_ppm,
      imageRealWorldWidth: imageRealWorldWidth,
    });

    const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
    if (!previewCanvas) return;

    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    // Calculate pixels per millimeter for each dimension
    const ppmH = result.horizontal_ppm;
    const ppmV = result.vertical_ppm;

    // Calculate how many real-world mm the image represents
    // Use the user-specified real-world width
    const imageWidthMm = imageRealWorldWidth * 1000;
    const imageHeightMm = (uploadedImage.height / uploadedImage.width) * imageWidthMm;

    // Calculate how many pixels the camera would capture for this area
    const cameraPixelsH = imageWidthMm * ppmH;
    const cameraPixelsV = imageHeightMm * ppmV;

    console.log('Camera pixels:', { cameraPixelsH, cameraPixelsV });

    // Ensure we have at least 1 pixel
    const finalPixelsH = Math.max(1, Math.floor(cameraPixelsH));
    const finalPixelsV = Math.max(1, Math.floor(cameraPixelsV));

    // Create a temporary canvas to downsample
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = finalPixelsH;
    tempCanvas.height = finalPixelsV;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) return;

    // Disable image smoothing for pixelated effect
    tempCtx.imageSmoothingEnabled = false;

    // Draw downsampled image
    tempCtx.drawImage(uploadedImage, 0, 0, finalPixelsH, finalPixelsV);

    // Calculate scale factor to show pixelation clearly
    // Use a larger scale when we have very few pixels
    const minScale = 2;
    const maxDisplaySize = 400;

    let scale = Math.max(
      minScale,
      Math.floor(maxDisplaySize / Math.max(finalPixelsH, finalPixelsV))
    );

    // Cap the display size
    let displayWidth = finalPixelsH * scale;
    let displayHeight = finalPixelsV * scale;

    if (displayWidth > maxDisplaySize || displayHeight > maxDisplaySize) {
      scale = Math.floor(maxDisplaySize / Math.max(finalPixelsH, finalPixelsV));
      displayWidth = finalPixelsH * scale;
      displayHeight = finalPixelsV * scale;
    }

    previewCanvas.width = displayWidth;
    previewCanvas.height = displayHeight;

    // Disable smoothing for pixelated display
    ctx.imageSmoothingEnabled = false;

    // Draw the downsampled image scaled up using nearest-neighbor
    ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);

    console.log('Display:', { finalPixelsH, finalPixelsV, scale, displayWidth, displayHeight });

    // Update stats
    updatePreviewStats(finalPixelsH, finalPixelsV, ppmH, ppmV, imageWidthMm, imageHeightMm);
  } catch (error) {
    console.error('Error generating preview:', error);
  }
}

/**
 * Update the preview statistics display
 */
function updatePreviewStats(
  pixelsH: number,
  pixelsV: number,
  ppmH: number,
  ppmV: number,
  widthMm: number,
  heightMm: number
): void {
  const statsDiv = document.getElementById('preview-stats');
  if (!statsDiv) return;

  statsDiv.innerHTML = `
    <p><strong>Camera captures:</strong> ${pixelsH} × ${pixelsV} pixels</p>
    <p><strong>Scene size:</strong> ${(widthMm / 1000).toFixed(2)}m × ${(heightMm / 1000).toFixed(2)}m</p>
    <p><strong>Resolution:</strong> ${ppmH.toFixed(2)} × ${ppmV.toFixed(2)} px/mm</p>
    <p><strong>Downsampling:</strong> ${Math.floor(uploadedImage!.width / pixelsH)}:1 (H), ${Math.floor(uploadedImage!.height / pixelsV)}:1 (V)</p>
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
