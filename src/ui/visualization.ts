/**
 * Canvas visualization component for FOV rendering
 */

import type { CameraWithResult, ReferenceObject } from '../core/types';
import { REFERENCE_OBJECTS, SYSTEM_COLORS } from '../core/constants';

/**
 * Draw FOV visualization on canvas
 */
export function drawVisualization(systems: CameraWithResult[]): void {
  const canvas = document.getElementById('fov-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const legend = document.getElementById('canvas-legend')!;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (systems.length === 0) {
    drawEmptyState(ctx, canvas);
    legend.innerHTML = '';
    return;
  }

  // Find max FOV for scaling (convert to mm for canvas)
  const maxFovH = Math.max(...systems.map((s) => s.result.horizontal_fov_m * 1000));
  const maxFovV = Math.max(...systems.map((s) => s.result.vertical_fov_m * 1000));
  const maxFov = Math.max(maxFovH, maxFovV);

  const padding = 40;
  const scale = (canvas.width - 2 * padding) / maxFov;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Draw grid
  drawGrid(ctx, centerX, centerY, maxFov, scale);

  // Draw center crosshair
  drawCrosshair(ctx, canvas.width, canvas.height, centerX, centerY, padding);

  // Draw each FOV with dimension labels
  systems.forEach((system, index) => {
    drawFovBox(ctx, system, index, centerX, centerY, scale);
  });

  // Draw reference object if selected
  const selectedObjectId = (document.getElementById('ref-object-select') as HTMLSelectElement)
    ?.value;

  if (selectedObjectId && selectedObjectId !== 'none') {
    const obj = REFERENCE_OBJECTS.find((o) => o.id === selectedObjectId);
    if (obj) {
      drawReferenceObject(ctx, obj, centerX, centerY, scale);
    }
  }

  // Update legend
  updateLegend(legend, systems);
}

/**
 * Draw bird's eye view visualization showing HFOV and spatial distance
 */
export function drawBirdsEyeView(systems: CameraWithResult[]): void {
  const canvas = document.getElementById('birds-eye-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (systems.length === 0) {
    drawEmptyState(ctx, canvas);
    return;
  }

  // Find max distance for scaling
  const maxDistance = Math.max(...systems.map((s) => s.result.distance_m));
  const maxHFov = Math.max(...systems.map((s) => s.result.horizontal_fov_m));

  const padding = 60;
  const scaleDistance = (canvas.height - 2 * padding) / maxDistance;
  const scaleWidth = (canvas.width - 2 * padding) / (maxHFov * 1.2);
  const scale = Math.min(scaleDistance, scaleWidth);

  const cameraX = canvas.width / 2;
  const cameraY = canvas.height - padding;

  // Draw background grid
  drawBirdsEyeGrid(ctx, canvas, cameraX, cameraY, maxDistance, scale, padding);

  // Draw each camera's FOV cone
  systems.forEach((system, index) => {
    drawFovCone(ctx, system, index, cameraX, cameraY, scale);
  });

  // Draw camera position
  drawCameraPosition(ctx, cameraX, cameraY);

  // Draw reference object if selected
  const selectedObjectId = (document.getElementById('ref-object-select') as HTMLSelectElement)
    ?.value;

  if (selectedObjectId && selectedObjectId !== 'none') {
    const obj = REFERENCE_OBJECTS.find((o) => o.id === selectedObjectId);
    if (obj && systems.length > 0) {
      // Draw object at the target distance of the first system
      const distance = systems[0].result.distance_m;
      drawBirdsEyeReferenceObject(ctx, obj, cameraX, cameraY, distance, scale);
    }
  }
}

/**
 * Draw background grid for bird's eye view
 */
function drawBirdsEyeGrid(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  cameraX: number,
  cameraY: number,
  maxDistance: number,
  scale: number,
  padding: number
): void {
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#999';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';

  // Draw horizontal distance lines
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    const distance = (maxDistance / steps) * i;
    const y = cameraY - distance * scale;

    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();

    // Distance label
    ctx.fillText(`${distance.toFixed(1)}m`, padding - 5, y + 3);
  }

  // Draw vertical center line
  ctx.strokeStyle = '#ccc';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(cameraX, padding);
  ctx.lineTo(cameraX, cameraY);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Draw camera position at bottom
 */
function drawCameraPosition(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Draw camera icon (triangle)
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(x, y - 15);
  ctx.lineTo(x - 10, y + 5);
  ctx.lineTo(x + 10, y + 5);
  ctx.closePath();
  ctx.fill();

  // Camera label
  ctx.fillStyle = '#333';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAMERA', x, y + 18);
}

/**
 * Draw FOV cone for a camera system
 */
function drawFovCone(
  ctx: CanvasRenderingContext2D,
  system: CameraWithResult,
  index: number,
  cameraX: number,
  cameraY: number,
  scale: number
): void {
  const color = getSystemColor(index);
  const distance = system.result.distance_m * scale;
  const halfWidth = (system.result.horizontal_fov_m / 2) * scale;

  const targetY = cameraY - distance;

  // Draw FOV cone
  ctx.fillStyle = color + '22';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(cameraX, cameraY);
  ctx.lineTo(cameraX - halfWidth, targetY);
  ctx.lineTo(cameraX + halfWidth, targetY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw FOV width line at target distance
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cameraX - halfWidth, targetY);
  ctx.lineTo(cameraX + halfWidth, targetY);
  ctx.stroke();

  // Labels
  ctx.fillStyle = color;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';

  // System name at top of cone
  ctx.fillText(system.camera.name || `System ${index + 1}`, cameraX - halfWidth + 5, targetY - 5);

  // Distance label (along left edge)
  ctx.save();
  ctx.translate(cameraX - halfWidth - 15, cameraY - distance / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText(`${system.result.distance_m.toFixed(2)}m`, 0, 0);
  ctx.restore();

  // HFOV width label at target distance
  ctx.textAlign = 'center';
  ctx.fillText(
    `${system.result.horizontal_fov_m.toFixed(2)}m (${system.result.horizontal_fov_deg.toFixed(1)}°)`,
    cameraX,
    targetY + 15
  );

  // HFOV angle label near camera
  ctx.font = '10px sans-serif';
  ctx.fillText(`HFOV ${system.result.horizontal_fov_deg.toFixed(1)}°`, cameraX, cameraY - 25);
}

/**
 * Draw reference object in bird's eye view
 */
function drawBirdsEyeReferenceObject(
  ctx: CanvasRenderingContext2D,
  obj: ReferenceObject,
  cameraX: number,
  cameraY: number,
  distance: number,
  scale: number
): void {
  const width = obj.width * scale;
  const y = cameraY - distance * scale;
  const x = cameraX - width / 2;
  const height = 8; // Fixed small height for top-down view

  // Draw object
  ctx.fillStyle = obj.color;
  ctx.fillRect(x, y - height / 2, width, height);

  // Draw outline
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y - height / 2, width, height);

  // Label
  ctx.fillStyle = obj.color;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${obj.label} ${obj.name} (${obj.width}m)`, cameraX, y - height / 2 - 5);
}

/**
 * Draw empty state message
 */
function drawEmptyState(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  ctx.fillStyle = '#999';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Invalid value', canvas.width / 2, canvas.height / 2 - 10);

  ctx.fillStyle = '#666';
  ctx.font = '14px sans-serif';
  ctx.fillText('Enter valid values to see visualization', canvas.width / 2, canvas.height / 2 + 20);

  ctx.textBaseline = 'alphabetic';
}

/**
 * Draw background grid
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  maxFov: number,
  scale: number
): void {
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    const size = (maxFov / 5) * i * scale;
    ctx.strokeRect(centerX - size / 2, centerY - size / 2, size, size);
  }
}

/**
 * Draw center crosshair
 */
function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  centerX: number,
  centerY: number,
  padding: number
): void {
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(centerX, padding);
  ctx.lineTo(centerX, canvasHeight - padding);
  ctx.moveTo(padding, centerY);
  ctx.lineTo(canvasWidth - padding, centerY);
  ctx.stroke();
}

/**
 * Draw a single FOV box with labels
 */
function drawFovBox(
  ctx: CanvasRenderingContext2D,
  system: CameraWithResult,
  index: number,
  centerX: number,
  centerY: number,
  scale: number
): void {
  const color = getSystemColor(index);
  const width = system.result.horizontal_fov_m * 1000 * scale;
  const height = system.result.vertical_fov_m * 1000 * scale;
  const x = centerX - width / 2;
  const y = centerY - height / 2;

  // Fill with transparency
  ctx.fillStyle = color + '33';
  ctx.fillRect(x, y, width, height);

  // Outline
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  // Label
  ctx.fillStyle = color;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(system.camera.name || `System ${index + 1}`, x + 5, y + 15);

  // Draw dimension labels for this FOV
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';

  // Horizontal FOV label (bottom)
  const hfovLabel = `${system.result.horizontal_fov_m.toFixed(2)}m`;
  ctx.fillText(hfovLabel, centerX, y + height + 15);

  // Vertical FOV label (right side)
  ctx.save();
  ctx.translate(x + width + 15, centerY);
  ctx.rotate(-Math.PI / 2);
  const vfovLabel = `${system.result.vertical_fov_m.toFixed(2)}m`;
  ctx.fillText(vfovLabel, 0, 0);
  ctx.restore();

  ctx.textAlign = 'left';
}

// Cache for reference object images (optional feature)
const referenceObjectImages = new Map<string, HTMLImageElement>();
const imageLoadStatus = new Map<string, boolean>();

/**
 * Attempt to preload an image for a reference object
 * This is an optional feature - rendering will fall back to standard if image fails
 */
function tryLoadReferenceImage(objectId: string, imagePath: string): void {
  if (!referenceObjectImages.has(objectId)) {
    const img = new Image();
    img.onload = () => {
      imageLoadStatus.set(objectId, true);
    };
    img.onerror = () => {
      // Silently fail - this is optional
      imageLoadStatus.set(objectId, false);
    };
    img.src = imagePath;
    referenceObjectImages.set(objectId, img);
  }
}

// Preload icons for reference objects that have iconPath defined
REFERENCE_OBJECTS.forEach((obj) => {
  if (obj.iconPath) {
    tryLoadReferenceImage(obj.id, obj.iconPath);
  }
});

/**
 * Draw reference object on canvas
 */
function drawReferenceObject(
  ctx: CanvasRenderingContext2D,
  obj: ReferenceObject,
  centerX: number,
  centerY: number,
  scale: number
): void {
  const width = obj.width * 1000 * scale; // Convert to mm then scale
  const height = obj.height * 1000 * scale;
  const x = centerX - width / 2;
  const y = centerY - height / 2;

  // Check if custom image is available for this object (optional feature)
  const hasCustomImage = referenceObjectImages.has(obj.id) && imageLoadStatus.get(obj.id) === true;

  if (hasCustomImage) {
    // Draw custom image (e.g., drone SVG icon)
    const img = referenceObjectImages.get(obj.id)!;
    ctx.drawImage(img, x, y, width, height);

    // Draw subtle outline
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  } else {
    // Standard rendering: filled rectangle with emoji label
    ctx.fillStyle = obj.color;
    ctx.fillRect(x, y, width, height);

    // Draw outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Draw label
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text with outline for visibility
    ctx.strokeText(obj.label, centerX, centerY);
    ctx.fillText(obj.label, centerX, centerY);
  }

  // Draw size label below object
  ctx.fillStyle = obj.color;
  ctx.font = '10px sans-serif';
  ctx.textBaseline = 'top';
  const sizeLabel = `${obj.name} (${obj.width}×${obj.height}m)`;
  ctx.fillText(sizeLabel, centerX, y + height + 3);

  ctx.textBaseline = 'alphabetic';
}

/**
 * Update legend with system information
 */
function updateLegend(legend: HTMLElement, systems: CameraWithResult[]): void {
  legend.innerHTML = `
    <h4>Legend</h4>
    ${systems
      .map(
        (system, index) => `
      <div class="legend-item">
        <span class="legend-color" style="background: ${getSystemColor(index)}"></span>
        <span>${system.camera.name || `System ${index + 1}`}</span>
        <span class="legend-specs">${system.result.horizontal_fov_m.toFixed(2)}×${system.result.vertical_fov_m.toFixed(2)}m</span>
      </div>
    `
      )
      .join('')}
  `;
}

/**
 * Get color for system by index
 */
function getSystemColor(index: number): string {
  return SYSTEM_COLORS[index % SYSTEM_COLORS.length];
}
