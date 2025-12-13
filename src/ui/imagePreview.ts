/**
 * Image Preview Module - Visualize camera resolution at distance
 */

import type { CameraSystem, FovResult } from "../core/types";
import { calculateCameraFov } from "../services/api";

let uploadedImage: HTMLImageElement | null = null;
let currentCamera: CameraSystem | null = null;
let currentDistance: number = 25;

/**
 * Initialize the image preview functionality
 */
export function initializeImagePreview(): void {
  const uploadInput = document.getElementById("preview-upload") as HTMLInputElement;
  const applyBtn = document.getElementById("preview-apply-btn") as HTMLButtonElement;
  const distanceInput = document.getElementById("preview-distance") as HTMLInputElement;

  if (!uploadInput || !applyBtn || !distanceInput) return;

  // Handle image upload
  uploadInput.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        uploadedImage = img;
        drawOriginalImage(img);
        applyBtn.disabled = false;
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

  // Handle distance change
  distanceInput.addEventListener("input", () => {
    currentDistance = parseFloat(distanceInput.value) || 25;
    updateDistanceLabel(currentDistance);
  });

  // Handle apply button
  applyBtn.addEventListener("click", async () => {
    if (!uploadedImage) return;
    await generatePreview();
  });

  updateDistanceLabel(currentDistance);
}

/**
 * Update camera parameters for preview
 */
export function updatePreviewCamera(camera: CameraSystem, result: FovResult): void {
  currentCamera = camera;
  
  // Update resolution display
  const resolutionDiv = document.getElementById("preview-resolution");
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
  const canvas = document.getElementById("original-canvas") as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
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
  if (!uploadedImage || !currentCamera) return;

  try {
    // Calculate FOV at current distance
    const result = await calculateCameraFov(currentCamera, currentDistance * 1000);

    const previewCanvas = document.getElementById("preview-canvas") as HTMLCanvasElement;
    if (!previewCanvas) return;

    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return;

    // Calculate pixels per millimeter for each dimension
    const ppmH = result.horizontal_ppm;
    const ppmV = result.vertical_ppm;

    // Calculate how many real-world mm the image represents
    // Assume the image represents 1 meter (1000mm) wide by default
    const imageWidthMm = 1000;
    const imageHeightMm = (uploadedImage.height / uploadedImage.width) * imageWidthMm;

    // Calculate how many pixels the camera would capture for this area
    const cameraPixelsH = Math.floor(imageWidthMm * ppmH);
    const cameraPixelsV = Math.floor(imageHeightMm * ppmV);

    // Ensure we have at least 1 pixel
    const finalPixelsH = Math.max(1, cameraPixelsH);
    const finalPixelsV = Math.max(1, cameraPixelsV);

    // Create a temporary canvas to downsample
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = finalPixelsH;
    tempCanvas.height = finalPixelsV;
    const tempCtx = tempCanvas.getContext("2d");
    
    if (!tempCtx) return;

    // Disable image smoothing for pixelated effect
    tempCtx.imageSmoothingEnabled = false;

    // Draw downsampled image
    tempCtx.drawImage(uploadedImage, 0, 0, finalPixelsH, finalPixelsV);

    // Scale up to display size (maintain aspect ratio)
    const displaySize = 400;
    let displayWidth = displaySize;
    let displayHeight = (finalPixelsV / finalPixelsH) * displaySize;

    if (displayHeight > displaySize) {
      displayHeight = displaySize;
      displayWidth = (finalPixelsH / finalPixelsV) * displaySize;
    }

    previewCanvas.width = displayWidth;
    previewCanvas.height = displayHeight;

    // Disable smoothing for pixelated display
    ctx.imageSmoothingEnabled = false;

    // Draw the downsampled image scaled up
    ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);

    // Update stats
    updatePreviewStats(finalPixelsH, finalPixelsV, ppmH, ppmV, imageWidthMm, imageHeightMm);

  } catch (error) {
    console.error("Error generating preview:", error);
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
  const statsDiv = document.getElementById("preview-stats");
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
  const label = document.getElementById("preview-distance-label");
  if (label) {
    label.textContent = distance.toFixed(1);
  }
}
