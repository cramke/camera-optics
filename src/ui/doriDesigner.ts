/**
 * DORI Designer - Inverse calculation workflow
 * Specify target DORI distances and find parameter ranges
 */

import { calculateDoriRanges, calculateDoriFromSingleDistance, calculateCameraFov } from "../services/api";
import type { DoriTargets, ParameterConstraint, DoriParameterRanges, CameraSystem } from "../core/types";
import { store } from "../services/store";
import { showToast } from "./toast";
import { updateSystemsList } from "../main";

// Store the last calculated ranges for export
let lastCalculatedRanges: DoriParameterRanges | null = null;
let lastCalculatedTargets: DoriTargets | null = null;

/**
 * Auto-calculate all DORI distances based on one input using backend
 */
async function autoCalculateDoriDistances(changedField: string, value: number): Promise<void> {
  if (!value || value <= 0) {
    // Clear all fields if invalid value
    return;
  }

  try {
    // Call backend to calculate all DORI distances
    const doriDistances = await calculateDoriFromSingleDistance(value, changedField as any);

    const detectionEl = document.getElementById("target-detection") as HTMLInputElement;
    const observationEl = document.getElementById("target-observation") as HTMLInputElement;
    const recognitionEl = document.getElementById("target-recognition") as HTMLInputElement;
    const identificationEl = document.getElementById("target-identification") as HTMLInputElement;

    // Fill in all the calculated values (except the one that was changed)
    if (changedField !== "detection") {
      detectionEl.value = doriDistances.detection_m.toFixed(1);
    }
    if (changedField !== "observation") {
      observationEl.value = doriDistances.observation_m.toFixed(1);
    }
    if (changedField !== "recognition") {
      recognitionEl.value = doriDistances.recognition_m.toFixed(1);
    }
    if (changedField !== "identification") {
      identificationEl.value = doriDistances.identification_m.toFixed(1);
    }
  } catch (error) {
    console.error("Error calculating DORI distances:", error);
  }
}

/**
 * Initialize DORI Designer functionality
 */
export function initializeDoriDesigner(): void {
  // Set up input field listeners to show/hide clear buttons and ranges
  const paramInputs = [
    { input: "fixed-sensor-width", range: "range-sensor-width" },
    { input: "fixed-pixel-width", range: "range-pixel-width" },
    { input: "fixed-focal-length", range: "range-focal-length" },
    { input: "fixed-horizontal-fov", range: "range-horizontal-fov" },
    { input: "fixed-sensor-height", range: "range-sensor-height" },
    { input: "fixed-pixel-height", range: "range-pixel-height" },
  ];

  paramInputs.forEach(({ input, range }) => {
    const inputEl = document.getElementById(input) as HTMLInputElement;
    const rangeEl = document.getElementById(range) as HTMLElement;
    const clearBtn = document.querySelector(`[data-input="${input}"]`) as HTMLButtonElement;

    if (!inputEl || !clearBtn) return;

    // Show/hide clear button based on input value
    const updateClearButton = () => {
      if (inputEl.value) {
        clearBtn.style.display = "flex";
        rangeEl?.classList.remove("active");
      } else {
        clearBtn.style.display = "none";
      }
    };

    // Listen for input changes
    inputEl.addEventListener("input", updateClearButton);

    // Clear button click handler
    clearBtn.addEventListener("click", () => {
      inputEl.value = "";
      clearBtn.style.display = "none";
      // Range will be shown on next calculation
    });
  });

  // Auto-calculate other DORI distances when one is entered
  const doriFields = [
    { id: "target-detection", name: "detection" },
    { id: "target-observation", name: "observation" },
    { id: "target-recognition", name: "recognition" },
    { id: "target-identification", name: "identification" },
  ];

  doriFields.forEach(({ id, name }) => {
    const field = document.getElementById(id) as HTMLInputElement;
    field?.addEventListener("input", () => {
      const value = parseFloat(field.value);
      if (value > 0) {
        autoCalculateDoriDistances(name, value);
        // Auto-calculate ranges when DORI target changes
        calculateParameterRanges();
      }
    });
  });

  // Auto-calculate ranges when any parameter constraint changes
  const constraintFields = [
    "fixed-sensor-width", "min-sensor-width", "max-sensor-width",
    "fixed-sensor-height", "min-sensor-height", "max-sensor-height",
    "fixed-pixel-width", "min-pixel-width", "max-pixel-width",
    "fixed-pixel-height", "min-pixel-height", "max-pixel-height",
    "fixed-focal-length", "min-focal-length", "max-focal-length",
    "fixed-horizontal-fov", "min-horizontal-fov", "max-horizontal-fov"
  ];

  constraintFields.forEach(fieldId => {
    const field = document.getElementById(fieldId) as HTMLInputElement;
    field?.addEventListener("input", () => {
      // Manage mutual exclusivity between fixed and range inputs
      if (fieldId.startsWith("fixed-")) {
        const param = fieldId.replace("fixed-", "");
        const minEl = document.getElementById(`min-${param}`) as HTMLInputElement;
        const maxEl = document.getElementById(`max-${param}`) as HTMLInputElement;
        if (field.value) {
          minEl?.setAttribute("disabled", "true");
          maxEl?.setAttribute("disabled", "true");
        } else {
          minEl?.removeAttribute("disabled");
          maxEl?.removeAttribute("disabled");
        }
      } else if (fieldId.startsWith("min-") || fieldId.startsWith("max-")) {
        const param = fieldId.replace(/^(min|max)-/, "");
        const fixedEl = document.getElementById(`fixed-${param}`) as HTMLInputElement;
        const minEl = document.getElementById(`min-${param}`) as HTMLInputElement;
        const maxEl = document.getElementById(`max-${param}`) as HTMLInputElement;
        if (minEl?.value || maxEl?.value) {
          fixedEl?.setAttribute("disabled", "true");
        } else {
          fixedEl?.removeAttribute("disabled");
        }
      }

      // Auto-calculate ranges when constraint changes
      calculateParameterRanges();
    });
  });

  // Export to comparison button
  const exportBtn = document.getElementById("export-to-comparison-btn");
  exportBtn?.addEventListener("click", exportToComparison);
}

/**
 * Gather target DORI distances from inputs
 */
function getDoriTargets(): DoriTargets {
  const targets: DoriTargets = {};

  const detectionEl = document.getElementById("target-detection") as HTMLInputElement;
  const observationEl = document.getElementById("target-observation") as HTMLInputElement;
  const recognitionEl = document.getElementById("target-recognition") as HTMLInputElement;
  const identificationEl = document.getElementById("target-identification") as HTMLInputElement;

  if (detectionEl?.value) targets.detection_m = parseFloat(detectionEl.value);
  if (observationEl?.value) targets.observation_m = parseFloat(observationEl.value);
  if (recognitionEl?.value) targets.recognition_m = parseFloat(recognitionEl.value);
  if (identificationEl?.value) targets.identification_m = parseFloat(identificationEl.value);

  return targets;
}

/**
 * Gather fixed parameter constraints from inputs
 * A parameter is fixed if it has a value, floating if empty
 * Priority: fixed value > range constraints (min/max)
 */
function getConstraints(): ParameterConstraint {
  const constraints: ParameterConstraint = {};

  // Helper to get constraint value (fixed or range)
  const getConstraintValue = (fixedId: string, minId: string, maxId: string, isInteger = false) => {
    const fixedEl = document.getElementById(fixedId) as HTMLInputElement;
    const minEl = document.getElementById(minId) as HTMLInputElement;
    const maxEl = document.getElementById(maxId) as HTMLInputElement;

    // Fixed value takes priority
    if (fixedEl?.value) {
      return isInteger ? parseInt(fixedEl.value) : parseFloat(fixedEl.value);
    }

    // Check for range constraints
    const hasMin = minEl?.value && minEl.value.trim() !== "";
    const hasMax = maxEl?.value && maxEl.value.trim() !== "";

    if (hasMin && hasMax) {
      const min = isInteger ? parseInt(minEl.value) : parseFloat(minEl.value);
      const max = isInteger ? parseInt(maxEl.value) : parseFloat(maxEl.value);
      // If min equals max, treat as fixed value
      if (min === max) return min;
      // For now, use midpoint as fixed value (backend doesn't support ranges yet)
      return (min + max) / 2;
    } else if (hasMin) {
      // Only min specified - use as lower bound (for now treat as fixed)
      return isInteger ? parseInt(minEl.value) : parseFloat(minEl.value);
    } else if (hasMax) {
      // Only max specified - use as upper bound (for now treat as fixed)
      return isInteger ? parseInt(maxEl.value) : parseFloat(maxEl.value);
    }

    return null;
  };

  const sensorWidth = getConstraintValue("fixed-sensor-width", "min-sensor-width", "max-sensor-width");
  if (sensorWidth !== null) constraints.sensor_width_mm = sensorWidth;

  const sensorHeight = getConstraintValue("fixed-sensor-height", "min-sensor-height", "max-sensor-height");
  if (sensorHeight !== null) constraints.sensor_height_mm = sensorHeight;

  const pixelWidth = getConstraintValue("fixed-pixel-width", "min-pixel-width", "max-pixel-width", true);
  if (pixelWidth !== null) constraints.pixel_width = pixelWidth;

  const pixelHeight = getConstraintValue("fixed-pixel-height", "min-pixel-height", "max-pixel-height", true);
  if (pixelHeight !== null) constraints.pixel_height = pixelHeight;

  const focalLength = getConstraintValue("fixed-focal-length", "min-focal-length", "max-focal-length");
  if (focalLength !== null) constraints.focal_length_mm = focalLength;

  const horizontalFov = getConstraintValue("fixed-horizontal-fov", "min-horizontal-fov", "max-horizontal-fov");
  if (horizontalFov !== null) constraints.horizontal_fov_deg = horizontalFov;

  return constraints;
}

/**
 * Calculate and display parameter ranges
 */
async function calculateParameterRanges(): Promise<void> {
  try {
    const targets = getDoriTargets();
    const constraints = getConstraints();

    // Validate that at least one target is specified
    if (!targets.detection_m && !targets.observation_m && !targets.recognition_m && !targets.identification_m) {
      alert("Please specify at least one target DORI distance");
      return;
    }

    // Call backend to calculate ranges
    const ranges = await calculateDoriRanges(targets, constraints);

    // Store for export
    lastCalculatedRanges = ranges;
    lastCalculatedTargets = targets;

    // Display results
    displayParameterRanges(ranges);

    // Show export button
    const exportBtn = document.getElementById("export-to-comparison-btn") as HTMLButtonElement;
    if (exportBtn) {
      exportBtn.style.display = "block";
    }
  } catch (error) {
    console.error("Error calculating parameter ranges:", error);
    alert("Failed to calculate parameter ranges. Please check your inputs.");
  }
}

/**
 * Display parameter ranges in the UI (inline with parameters)
 */
function displayParameterRanges(ranges: DoriParameterRanges): void {
  // Map backend field names to UI element IDs
  const parameterMapping: { [key: string]: { rangeId: string; inputId: string; statusId: string; unit: string; label: string } } = {
    sensor_width_mm: { rangeId: "range-sensor-width", inputId: "fixed-sensor-width", statusId: "status-sensor-width", unit: "mm", label: "Sensor Width" },
    sensor_height_mm: { rangeId: "range-sensor-height", inputId: "fixed-sensor-height", statusId: "status-sensor-height", unit: "mm", label: "Sensor Height" },
    pixel_width: { rangeId: "range-pixel-width", inputId: "fixed-pixel-width", statusId: "status-pixel-width", unit: "px", label: "Pixel Width" },
    pixel_height: { rangeId: "range-pixel-height", inputId: "fixed-pixel-height", statusId: "status-pixel-height", unit: "px", label: "Pixel Height" },
    focal_length_mm: { rangeId: "range-focal-length", inputId: "fixed-focal-length", statusId: "status-focal-length", unit: "mm", label: "Focal Length" },
    horizontal_fov_deg: { rangeId: "range-horizontal-fov", inputId: "fixed-horizontal-fov", statusId: "status-horizontal-fov", unit: "°", label: "Horizontal FOV" },
  };

  // Update each parameter's range display and validation status
  Object.entries(ranges).forEach(([key, value]) => {
    if (key === "limiting_requirement" || !value) return;

    const range = value as { min: number; max: number };
    const mapping = parameterMapping[key];

    if (!mapping) return;

    const rangeEl = document.getElementById(mapping.rangeId);
    const inputEl = document.getElementById(mapping.inputId) as HTMLInputElement;
    const statusEl = document.getElementById(mapping.statusId);
    
    if (!rangeEl || !statusEl) return;

    const isFixed = inputEl?.value && inputEl.value.trim() !== "";
    const isSingleValue = Math.abs(range.max - range.min) < 0.01; // Tolerance for floating point
    const isComplete = isFixed || isSingleValue;

    // Update status indicator in label
    if (isComplete) {
      statusEl.innerHTML = '✓';
      statusEl.className = 'field-status-inline complete';
      statusEl.style.display = 'inline-flex';
    } else {
      statusEl.innerHTML = '•';
      statusEl.className = 'field-status-inline incomplete';
      statusEl.style.display = 'inline-flex';
    }

    // Show range only if input is empty (floating mode)
    if (!inputEl?.value) {
      rangeEl.innerHTML = `
        <span class="range-text">
          ${range.min.toFixed(range.min < 10 ? 2 : 0)} – ${range.max.toFixed(range.max < 10 ? 2 : 0)} ${mapping.unit}
        </span>
      `;
      rangeEl.classList.add("active");
    } else {
      rangeEl.classList.remove("active");
    }
  });
}

/**
 * Export a camera configuration to the comparison list
 * Takes the midpoint of each range to create a concrete camera system
 */
async function exportToComparison(): Promise<void> {
  if (!lastCalculatedRanges || !lastCalculatedTargets) {
    alert("Please calculate parameter ranges first");
    return;
  }

  try {
    const constraints = getConstraints();

    // Build camera system using fixed values or midpoints of ranges
    const sensorWidth = constraints.sensor_width_mm || getMidpoint(lastCalculatedRanges.sensor_width_mm);
    const pixelWidth = Math.round(constraints.pixel_width || getMidpoint(lastCalculatedRanges.pixel_width));
    
    // Calculate height based on standard 4:3 aspect ratio if not specified
    const aspectRatio = 4 / 3; // Standard aspect ratio
    const sensorHeight = constraints.sensor_height_mm || getMidpoint(lastCalculatedRanges.sensor_height_mm) || (sensorWidth / aspectRatio);
    const pixelHeight = Math.round(constraints.pixel_height || getMidpoint(lastCalculatedRanges.pixel_height) || (pixelWidth / aspectRatio));
    
    const camera: CameraSystem = {
      sensor_width_mm: sensorWidth,
      sensor_height_mm: sensorHeight,
      pixel_width: pixelWidth,
      pixel_height: pixelHeight,
      focal_length_mm: constraints.focal_length_mm || getMidpoint(lastCalculatedRanges.focal_length_mm),
    };

    // Use the first specified DORI target as the distance
    const distance_m = lastCalculatedTargets.identification_m 
      || lastCalculatedTargets.recognition_m 
      || lastCalculatedTargets.observation_m 
      || lastCalculatedTargets.detection_m 
      || 10;

    // Calculate FOV for this configuration
    const fovResult = await calculateCameraFov(camera, distance_m * 1000); // Convert to mm

    // Generate a name based on DORI targets
    const doriNames: string[] = [];
    if (lastCalculatedTargets.detection_m) doriNames.push(`D${lastCalculatedTargets.detection_m}m`);
    if (lastCalculatedTargets.observation_m) doriNames.push(`O${lastCalculatedTargets.observation_m}m`);
    if (lastCalculatedTargets.recognition_m) doriNames.push(`R${lastCalculatedTargets.recognition_m}m`);
    if (lastCalculatedTargets.identification_m) doriNames.push(`I${lastCalculatedTargets.identification_m}m`);
    
    camera.name = `DORI: ${doriNames.join(', ')}`;

    // Add to store
    store.addCameraSystem({ camera, result: fovResult });

    // Update the comparison list UI
    updateSystemsList();

    // Show success message
    showToast(`Added to comparison: ${camera.name}`, "success");
  } catch (error) {
    console.error("Error adding to comparison:", error);
    alert("Failed to add camera configuration to comparison");
  }
}

/**
 * Get midpoint of a parameter range, or 0 if range is undefined
 */
function getMidpoint(range: { min: number; max: number } | null | undefined): number {
  if (!range) return 0;
  return (range.min + range.max) / 2;
}
