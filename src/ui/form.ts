/**
 * Form component for camera system input and management
 */

import type { CameraSystem } from "../core/types";
import { CAMERA_PRESETS } from "../core/constants";
import { calculateFocalLengthFromFov } from "../services/api";
import { store } from "../services/store";

/**
 * Validation constraints for camera system parameters
 */
const VALIDATION_CONSTRAINTS = {
  sensorWidth: { min: 0.1, max: 200, name: 'Sensor Width', unit: 'mm' },
  sensorHeight: { min: 0.1, max: 200, name: 'Sensor Height', unit: 'mm' },
  pixelWidth: { min: 10, max: 100000, name: 'Pixel Width', unit: 'pixels' },
  pixelHeight: { min: 10, max: 100000, name: 'Pixel Height', unit: 'pixels' },
  focalLength: { min: 0.1, max: 10000, name: 'Focal Length', unit: 'mm' },
  distance: { min: 0.01, max: 100000, name: 'Working Distance', unit: 'm' },
};

/**
 * Validate a numeric field with range constraints
 * @throws Error with descriptive message if field is invalid
 */
function validateField(
  value: string,
  constraint: { min: number; max: number; name: string; unit: string }
): number {
  const parsed = parseFloat(value);

  if (!value || value.trim() === "") {
    throw new Error(`${constraint.name} is required`);
  }

  if (isNaN(parsed)) {
    throw new Error(`${constraint.name} must be a valid number`);
  }

  if (parsed <= 0) {
    throw new Error(`${constraint.name} must be greater than zero`);
  }

  if (parsed < constraint.min) {
    throw new Error(
      `${constraint.name} must be at least ${constraint.min}${constraint.unit}`
    );
  }

  if (parsed > constraint.max) {
    throw new Error(
      `${constraint.name} cannot exceed ${constraint.max}${constraint.unit}`
    );
  }

  return parsed;
}

/**
 * Get camera system data from form inputs
 * @throws Error if any required field is invalid or missing
 */
export function getCameraFromForm(): CameraSystem {
  const sensorWidthInput = (document.getElementById("sensor-width") as HTMLInputElement).value;
  const sensorHeightInput = (document.getElementById("sensor-height") as HTMLInputElement).value;
  const pixelWidthInput = (document.getElementById("pixel-width") as HTMLInputElement).value;
  const pixelHeightInput = (document.getElementById("pixel-height") as HTMLInputElement).value;
  const focalLengthInput = (document.getElementById("focal-length") as HTMLInputElement).value;

  // Validate all required fields with constraints
  const sensorWidth = validateField(sensorWidthInput, VALIDATION_CONSTRAINTS.sensorWidth);
  const sensorHeight = validateField(sensorHeightInput, VALIDATION_CONSTRAINTS.sensorHeight);
  const pixelWidth = Math.round(validateField(pixelWidthInput, VALIDATION_CONSTRAINTS.pixelWidth));
  const pixelHeight = Math.round(validateField(pixelHeightInput, VALIDATION_CONSTRAINTS.pixelHeight));
  const focalLength = validateField(focalLengthInput, VALIDATION_CONSTRAINTS.focalLength);

  return {
    sensor_width_mm: sensorWidth,
    sensor_height_mm: sensorHeight,
    pixel_width: pixelWidth,
    pixel_height: pixelHeight,
    focal_length_mm: focalLength,
    name: (document.getElementById("name") as HTMLInputElement).value || undefined,
  };
}

/**
 * Get distance value from form (converts meters to millimeters)
 * @throws Error if distance is invalid
 */
export function getDistance(): number {
  const distanceInput = (document.getElementById("distance") as HTMLInputElement).value;
  const distance = validateField(distanceInput, VALIDATION_CONSTRAINTS.distance);
  
  // Convert meters to millimeters for the Rust backend
  return distance * 1000;
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
 * Load a system from comparison list to view (without removing it)
 */
export function loadSystemToView(index: number): void {
  const system = store.getCameraSystem(index);
  if (!system) return;

  (document.getElementById("sensor-width") as HTMLInputElement).value = system.camera.sensor_width_mm.toString();
  (document.getElementById("sensor-height") as HTMLInputElement).value = system.camera.sensor_height_mm.toString();
  (document.getElementById("pixel-width") as HTMLInputElement).value = system.camera.pixel_width.toString();
  (document.getElementById("pixel-height") as HTMLInputElement).value = system.camera.pixel_height.toString();
  (document.getElementById("focal-length") as HTMLInputElement).value = system.camera.focal_length_mm.toString();
  (document.getElementById("distance") as HTMLInputElement).value = (system.result.distance_m).toString();
  (document.getElementById("name") as HTMLInputElement).value = system.camera.name || `System ${index + 1}`;
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
