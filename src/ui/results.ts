/**
 * Results page rendering for camera FOV calculations
 */

import type { CameraSystem, FovResult } from "../core/types";

/**
 * Render a single camera system result to the results tab
 */
export function renderSingleResult(camera: CameraSystem, result: FovResult): string {
  const pixelPitch = (camera.sensor_width_mm * 1000) / camera.pixel_width;
  
  return `
    <div class="result-card">
      <h3>${camera.name || "Camera System"}</h3>
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
        <p>Pixels per meter: ${result.ppm.toFixed(1)} px/m</p>
        <p>Ground Sample Distance: ${result.gsd_mm.toFixed(3)} mm/pixel</p>
      </div>
    </div>
  `;
}

/**
 * Display a single result in the results tab
 */
export function displaySingleResult(camera: CameraSystem, result: FovResult): void {
  const resultsOutput = document.getElementById("results-output");
  if (!resultsOutput) return;
  
  resultsOutput.innerHTML = renderSingleResult(camera, result);
}
