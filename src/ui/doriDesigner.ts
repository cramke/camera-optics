/**
 * DORI Designer - Inverse calculation workflow
 * Specify target DORI distances and find parameter ranges
 */

import { calculateDoriRanges, calculateDoriFromSingleDistance } from "../services/api";
import type { DoriTargets, ParameterConstraint, DoriParameterRanges } from "../core/types";

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
  // Enable/disable constraint inputs based on checkboxes
  const constraints = [
    { checkbox: "fix-sensor-width", input: "fixed-sensor-width" },
    { checkbox: "fix-pixel-width", input: "fixed-pixel-width" },
    { checkbox: "fix-focal-length", input: "fixed-focal-length" },
    { checkbox: "fix-sensor-height", input: "fixed-sensor-height" },
  ];

  constraints.forEach(({ checkbox, input }) => {
    const checkboxEl = document.getElementById(checkbox) as HTMLInputElement;
    const inputEl = document.getElementById(input) as HTMLInputElement;

    checkboxEl?.addEventListener("change", () => {
      inputEl.disabled = !checkboxEl.checked;
      if (!checkboxEl.checked) {
        inputEl.value = "";
      }
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
      }
    });
  });

  // Calculate ranges button
  const calculateBtn = document.getElementById("calculate-ranges-btn");
  calculateBtn?.addEventListener("click", calculateParameterRanges);
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
 */
function getConstraints(): ParameterConstraint {
  const constraints: ParameterConstraint = {};

  const fixSensorWidth = document.getElementById("fix-sensor-width") as HTMLInputElement;
  const fixPixelWidth = document.getElementById("fix-pixel-width") as HTMLInputElement;
  const fixFocalLength = document.getElementById("fix-focal-length") as HTMLInputElement;
  const fixSensorHeight = document.getElementById("fix-sensor-height") as HTMLInputElement;

  if (fixSensorWidth?.checked) {
    const value = (document.getElementById("fixed-sensor-width") as HTMLInputElement).value;
    if (value) constraints.sensor_width_mm = parseFloat(value);
  }

  if (fixPixelWidth?.checked) {
    const value = (document.getElementById("fixed-pixel-width") as HTMLInputElement).value;
    if (value) constraints.pixel_width = parseInt(value);
  }

  if (fixFocalLength?.checked) {
    const value = (document.getElementById("fixed-focal-length") as HTMLInputElement).value;
    if (value) constraints.focal_length_mm = parseFloat(value);
  }

  if (fixSensorHeight?.checked) {
    const value = (document.getElementById("fixed-sensor-height") as HTMLInputElement).value;
    if (value) constraints.sensor_height_mm = parseFloat(value);
  }

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

    // Display results
    displayParameterRanges(ranges);
  } catch (error) {
    console.error("Error calculating parameter ranges:", error);
    alert("Failed to calculate parameter ranges. Please check your inputs.");
  }
}

/**
 * Display parameter ranges in the UI
 */
function displayParameterRanges(ranges: DoriParameterRanges): void {
  const outputSection = document.getElementById("parameter-ranges-output");
  const rangesContent = document.getElementById("ranges-content");

  if (!outputSection || !rangesContent) return;

  // Clear previous results
  rangesContent.innerHTML = "";

  // Show limiting requirement
  const limitingDiv = document.createElement("div");
  limitingDiv.className = "limiting-requirement";
  limitingDiv.innerHTML = `<span><strong>Most restrictive:</strong> ${ranges.limiting_requirement}</span>`;
  rangesContent.appendChild(limitingDiv);

  // Display each parameter range
  const parameterLabels: { [key: string]: { label: string; unit: string; help: string } } = {
    sensor_width_mm: {
      label: "Sensor Width",
      unit: "mm",
      help: "Horizontal sensor dimension",
    },
    sensor_height_mm: {
      label: "Sensor Height",
      unit: "mm",
      help: "Vertical sensor dimension",
    },
    pixel_width: {
      label: "Horizontal Resolution",
      unit: "pixels",
      help: "Number of pixels in horizontal direction",
    },
    pixel_height: {
      label: "Vertical Resolution",
      unit: "pixels",
      help: "Number of pixels in vertical direction",
    },
    focal_length_mm: {
      label: "Focal Length",
      unit: "mm",
      help: "Lens focal length",
    },
  };

  // Create range items
  Object.entries(ranges).forEach(([key, value]) => {
    if (key === "limiting_requirement" || !value) return;

    const range = value as { min: number; max: number };
    const config = parameterLabels[key];

    if (!config) return;

    const rangeItem = document.createElement("div");
    rangeItem.className = "range-item";

    rangeItem.innerHTML = `
      <h4>${config.label}</h4>
      <div class="range-value">
        ${range.min.toFixed(range.min < 10 ? 2 : 0)} – ${range.max.toFixed(range.max < 10 ? 2 : 0)} ${config.unit}
      </div>
      <span class="help-text">${config.help}</span>
    `;

    rangesContent.appendChild(rangeItem);
  });

  // Show the output section
  outputSection.style.display = "block";

  // Scroll to results
  outputSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
