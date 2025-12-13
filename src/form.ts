/**
 * Form component for camera system input and management
 */

import type { CameraSystem } from "./types";
import { CAMERA_PRESETS } from "./constants";
import { calculateFocalLengthFromFov } from "./api";
import { store } from "./store";

/**
 * Get camera system data from form inputs
 */
export function getCameraFromForm(): CameraSystem {
  return {
    sensor_width_mm: parseFloat((document.getElementById("sensor-width") as HTMLInputElement).value),
    sensor_height_mm: parseFloat((document.getElementById("sensor-height") as HTMLInputElement).value),
    pixel_width: parseInt((document.getElementById("pixel-width") as HTMLInputElement).value),
    pixel_height: parseInt((document.getElementById("pixel-height") as HTMLInputElement).value),
    focal_length_mm: parseFloat((document.getElementById("focal-length") as HTMLInputElement).value),
    name: (document.getElementById("name") as HTMLInputElement).value || undefined,
  };
}

/**
 * Get distance value from form (converts meters to millimeters)
 */
export function getDistance(): number {
  // Convert meters to millimeters for the Rust backend
  return parseFloat((document.getElementById("distance") as HTMLInputElement).value) * 1000;
}

/**
 * Calculate focal length from FOV in degrees using Rust backend
 * Updates the focal length field and clears FOV input fields
 */
export async function calculateFocalLength(): Promise<void> {
  const sensorWidth = parseFloat((document.getElementById("sensor-width") as HTMLInputElement).value);
  const sensorHeight = parseFloat((document.getElementById("sensor-height") as HTMLInputElement).value);
  const hfovDeg = parseFloat((document.getElementById("hfov-deg") as HTMLInputElement).value);
  const vfovDeg = parseFloat((document.getElementById("vfov-deg") as HTMLInputElement).value);

  if (!sensorWidth || !sensorHeight) {
    alert("Please enter sensor width and height first");
    return;
  }

  let sensorSize = 0;
  let fovDeg = 0;

  // Use horizontal FOV if provided
  if (hfovDeg && hfovDeg > 0) {
    sensorSize = sensorWidth;
    fovDeg = hfovDeg;
  }
  // Or use vertical FOV if provided
  else if (vfovDeg && vfovDeg > 0) {
    sensorSize = sensorHeight;
    fovDeg = vfovDeg;
  } else {
    alert("Please enter either Horizontal FOV or Vertical FOV");
    return;
  }

  try {
    const focalLength = await calculateFocalLengthFromFov(sensorSize, fovDeg);

    // Update focal length field
    (document.getElementById("focal-length") as HTMLInputElement).value = focalLength.toFixed(2);

    // Clear the FOV input fields
    (document.getElementById("hfov-deg") as HTMLInputElement).value = "";
    (document.getElementById("vfov-deg") as HTMLInputElement).value = "";
  } catch (error) {
    console.error("Error calculating focal length:", error);
    alert(`Error: ${error}`);
  }
}

/**
 * Load a camera system from the comparison list into the form
 * Removes the system from the list so it can be re-added after editing
 */
export function loadSystemToForm(index: number, onUpdate: () => void): void {
  const system = store.getCameraSystem(index);
  if (!system) return;

  (document.getElementById("sensor-width") as HTMLInputElement).value = system.camera.sensor_width_mm.toString();
  (document.getElementById("sensor-height") as HTMLInputElement).value = system.camera.sensor_height_mm.toString();
  (document.getElementById("pixel-width") as HTMLInputElement).value = system.camera.pixel_width.toString();
  (document.getElementById("pixel-height") as HTMLInputElement).value = system.camera.pixel_height.toString();
  (document.getElementById("focal-length") as HTMLInputElement).value = system.camera.focal_length_mm.toString();
  (document.getElementById("distance") as HTMLInputElement).value = (system.result.distance_m).toString();
  (document.getElementById("name") as HTMLInputElement).value = system.camera.name || "";

  // Remove the system from the list so it can be re-added after editing
  store.removeCameraSystem(index);
  
  // Trigger update callback
  onUpdate();

  // Scroll to the form
  document.querySelector(".camera-form")?.scrollIntoView({ behavior: "smooth" });
}

/**
 * Load preset camera values into the form
 */
export function loadPreset(presetName: string): void {
  const preset = CAMERA_PRESETS[presetName];
  if (!preset) return;

  (document.getElementById("sensor-width") as HTMLInputElement).value = preset.sensor_width_mm?.toString() || "";
  (document.getElementById("sensor-height") as HTMLInputElement).value = preset.sensor_height_mm?.toString() || "";
  (document.getElementById("pixel-width") as HTMLInputElement).value = preset.pixel_width?.toString() || "";
  (document.getElementById("pixel-height") as HTMLInputElement).value = preset.pixel_height?.toString() || "";
  (document.getElementById("focal-length") as HTMLInputElement).value = preset.focal_length_mm?.toString() || "";
  (document.getElementById("name") as HTMLInputElement).value = preset.name || "";
}
