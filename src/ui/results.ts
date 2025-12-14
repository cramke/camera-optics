/**
 * Results page rendering for camera FOV calculations
 */

import type { CameraSystem, FovResult } from '../core/types';

/**
 * Render a single camera system result to the results tab
 */
export function renderSingleResult(
  camera: CameraSystem,
  result: FovResult,
  systemNumber?: number
): string {
  const pixelPitch = (camera.sensor_width_mm * 1000) / camera.pixel_width;

  // DORI section (only if available)
  const doriSection = result.dori
    ? `
    <div class="result-section">
      <h4>DORI Distances (Surveillance Performance)</h4>
      <p><strong>Detection</strong> (25 px/m): ${result.dori.detection_m.toFixed(2)} m — Identify that an object is present</p>
      <p><strong>Observation</strong> (62.5 px/m): ${result.dori.observation_m.toFixed(2)} m — Determine general characteristics</p>
      <p><strong>Recognition</strong> (125 px/m): ${result.dori.recognition_m.toFixed(2)} m — Recognize a familiar person or object</p>
      <p><strong>Identification</strong> (250 px/m): ${result.dori.identification_m.toFixed(2)} m — Identify a specific person beyond reasonable doubt</p>
    </div>
  `
    : '';

  return `
    <div class="result-card">
      <div class="result-section">
      <h4>Metadata</h4>
       <p>Name: ${camera.name || (systemNumber !== undefined ? `System ${systemNumber + 1}` : 'Camera System')}</p>
      </div>
      <div class="result-section">
        <h4>Camera Specifications</h4>
        <p>Sensor: ${camera.sensor_width_mm} × ${camera.sensor_height_mm} mm</p>
        <p>Resolution: ${camera.pixel_width} × ${camera.pixel_height} pixels</p>
        <p>Pixel Pitch: ${pixelPitch.toFixed(2)} µm</p>
        <p>Focal Length: ${camera.focal_length_mm} mm</p>
      </div>
      <div class="result-section">
        <h4>Field of View @ ${result.distance_m.toFixed(2)} m</h4>
        <p>Angular FOV: ${result.horizontal_fov_deg.toFixed(2)}° × ${result.vertical_fov_deg.toFixed(2)}°</p>
        <p>Linear FOV: ${result.horizontal_fov_m.toFixed(3)} × ${result.vertical_fov_m.toFixed(3)} m</p>
        <p>Linear FOV: ${(result.horizontal_fov_m * 1000).toFixed(2)} × ${(result.vertical_fov_m * 1000).toFixed(2)} mm</p>
      </div>
      <div class="result-section">
        <h4>Spatial Resolution</h4>
        <p>Pixels per meter: ${result.horizontal_ppm.toFixed(1)} × ${result.vertical_ppm.toFixed(1)} px/m</p>
        <p>Ground Sample Distance: ${(1000 / result.horizontal_ppm).toFixed(3)} × ${(1000 / result.vertical_ppm).toFixed(3)} mm/pixel</p>
      </div>
      ${doriSection}
    </div>
  `;
}

/**
 * Display a single result in the results tab
 */
export async function displaySingleResult(
  camera: CameraSystem,
  result: FovResult,
  systemNumber?: number
): Promise<void> {
  const resultsOutput = document.getElementById('results-output');
  if (!resultsOutput) return;

  // Validate using Rust backend
  try {
    const { validateCameraSystem } = await import('../services/api');
    const { showToast } = await import('./toast');

    const warnings = await validateCameraSystem(camera, result);

    // Show warnings/errors as toasts
    warnings.forEach((warning) => {
      const toastType = warning.severity === 'Error' ? 'error' : 'warning';
      showToast(warning.message, toastType);
    });
  } catch (error) {
    console.error('Error validating camera system:', error);
  }

  resultsOutput.innerHTML = renderSingleResult(camera, result, systemNumber);
}
