import { invoke } from "@tauri-apps/api/core";
import type { CameraSystem, FovResult, CameraWithResult, ReferenceObject } from "./types";
import { REFERENCE_OBJECTS, CAMERA_PRESETS, SYSTEM_COLORS } from "./constants";

// Store camera systems for comparison
const cameraSystems: CameraWithResult[] = [];

// Get form values
function getCameraFromForm(): CameraSystem {
  return {
    sensor_width_mm: parseFloat((document.getElementById("sensor-width") as HTMLInputElement).value),
    sensor_height_mm: parseFloat((document.getElementById("sensor-height") as HTMLInputElement).value),
    pixel_width: parseInt((document.getElementById("pixel-width") as HTMLInputElement).value),
    pixel_height: parseInt((document.getElementById("pixel-height") as HTMLInputElement).value),
    focal_length_mm: parseFloat((document.getElementById("focal-length") as HTMLInputElement).value),
    name: (document.getElementById("name") as HTMLInputElement).value || undefined,
  };
}

function getDistance(): number {
  // Convert meters to millimeters for the Rust backend
  return parseFloat((document.getElementById("distance") as HTMLInputElement).value) * 1000;
}

// Calculate focal length from FOV in degrees using Rust
async function calculateFocalLength() {
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
    const focalLength: number = await invoke("calculate_focal_length_from_fov_command", {
      sensorSizeMm: sensorSize,
      fovDeg: fovDeg,
    });

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

// Calculate FOV for current form values
async function calculateFov() {
  const camera = getCameraFromForm();
  const distance = getDistance();

  try {
    const result: FovResult = await invoke("calculate_camera_fov", {
      camera,
      distanceMm: distance,
    });

    displaySingleResult(camera, result);
    drawVisualization([{ camera, result }]);
  } catch (error) {
    console.error("Error calculating FOV:", error);
    alert(`Error: ${error}`);
  }
}

// Add current system to comparison list
async function addToComparison() {
  const camera = getCameraFromForm();
  const distance = getDistance();

  try {
    const result: FovResult = await invoke("calculate_camera_fov", {
      camera,
      distanceMm: distance,
    });

    cameraSystems.push({ camera, result });
    updateSystemsList();
    drawVisualization(cameraSystems);
  } catch (error) {
    console.error("Error adding system:", error);
    alert(`Error: ${error}`);
  }
}

// Display single result in results tab
function displaySingleResult(camera: CameraSystem, result: FovResult) {
  const resultsOutput = document.getElementById("results-output")!;
  const pixelPitch = (camera.sensor_width_mm * 1000) / camera.pixel_width;
  
  resultsOutput.innerHTML = `
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

// Update systems comparison list
function updateSystemsList() {
  const systemsItems = document.getElementById("systems-items")!;
  
  if (cameraSystems.length === 0) {
    systemsItems.innerHTML = '<p class="empty-message">No systems added yet</p>';
    return;
  }

  systemsItems.innerHTML = cameraSystems
    .map(
      (item, index) => `
      <div class="system-item" style="border-left: 4px solid ${getColor(index)}">
        <div class="system-info" data-index="${index}" style="cursor: pointer;">
          <strong>${item.camera.name || `System ${index + 1}`}</strong>
          <span class="system-specs">${item.camera.sensor_width_mm}×${item.camera.sensor_height_mm}mm, ${item.camera.focal_length_mm}mm</span>
        </div>
        <div class="system-actions">
          <button class="edit-btn" data-index="${index}" title="Edit">✎</button>
          <button class="remove-btn" data-index="${index}" title="Remove">×</button>
        </div>
      </div>
    `
    )
    .join("");

  // Add click listeners to system info for editing
  document.querySelectorAll(".system-info").forEach((info) => {
    info.addEventListener("click", (e) => {
      const index = parseInt((e.currentTarget as HTMLElement).dataset.index!);
      loadSystemToForm(index);
    });
  });

  // Add edit button listeners
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt((e.target as HTMLElement).dataset.index!);
      loadSystemToForm(index);
    });
  });

  // Add remove listeners
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt((e.target as HTMLElement).dataset.index!);
      cameraSystems.splice(index, 1);
      updateSystemsList();
      drawVisualization(cameraSystems);
    });
  });
}

// Load a system from the comparison list into the form
function loadSystemToForm(index: number) {
  const system = cameraSystems[index];
  if (!system) return;

  (document.getElementById("sensor-width") as HTMLInputElement).value = system.camera.sensor_width_mm.toString();
  (document.getElementById("sensor-height") as HTMLInputElement).value = system.camera.sensor_height_mm.toString();
  (document.getElementById("pixel-width") as HTMLInputElement).value = system.camera.pixel_width.toString();
  (document.getElementById("pixel-height") as HTMLInputElement).value = system.camera.pixel_height.toString();
  (document.getElementById("focal-length") as HTMLInputElement).value = system.camera.focal_length_mm.toString();
  (document.getElementById("distance") as HTMLInputElement).value = (system.result.distance_m).toString();
  (document.getElementById("name") as HTMLInputElement).value = system.camera.name || "";

  // Remove the system from the list so it can be re-added after editing
  cameraSystems.splice(index, 1);
  updateSystemsList();
  drawVisualization(cameraSystems);

  // Scroll to the form
  document.querySelector(".camera-form")?.scrollIntoView({ behavior: "smooth" });
}

// Draw FOV visualization on canvas
function drawVisualization(systems: CameraWithResult[]) {
  const canvas = document.getElementById("fov-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  const legend = document.getElementById("canvas-legend")!;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (systems.length === 0) {
    ctx.fillStyle = "#666";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Calculate or add camera systems to see visualization", canvas.width / 2, canvas.height / 2);
    legend.innerHTML = "";
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
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    const size = (maxFov / 5) * i * scale;
    ctx.strokeRect(centerX - size / 2, centerY - size / 2, size, size);
  }

  // Draw center crosshair
  ctx.strokeStyle = "#999";
  ctx.beginPath();
  ctx.moveTo(centerX, padding);
  ctx.lineTo(centerX, canvas.height - padding);
  ctx.moveTo(padding, centerY);
  ctx.lineTo(canvas.width - padding, centerY);
  ctx.stroke();

  // Draw each FOV with dimension labels
  systems.forEach((system, index) => {
    const color = getColor(index);
    const width = system.result.horizontal_fov_m * 1000 * scale;
    const height = system.result.vertical_fov_m * 1000 * scale;
    const x = centerX - width / 2;
    const y = centerY - height / 2;

    // Fill with transparency
    ctx.fillStyle = color + "33";
    ctx.fillRect(x, y, width, height);

    // Outline
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Label
    ctx.fillStyle = color;
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(system.camera.name || `System ${index + 1}`, x + 5, y + 15);

    // Draw dimension labels for this FOV
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    
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
    
    ctx.textAlign = "left";
  });

  // Draw reference object if selected
  const selectedObjectId = (document.getElementById("ref-object-select") as HTMLSelectElement)?.value;
  
  if (selectedObjectId && selectedObjectId !== "none") {
    const obj = REFERENCE_OBJECTS.find(o => o.id === selectedObjectId);
    if (obj) {
      drawReferenceObject(ctx, obj, centerX, centerY, scale);
    }
  }

  // Update legend
  legend.innerHTML = `
    <h4>Legend</h4>
    ${systems
      .map(
        (system, index) => `
      <div class="legend-item">
        <span class="legend-color" style="background: ${getColor(index)}"></span>
        <span>${system.camera.name || `System ${index + 1}`}</span>
        <span class="legend-specs">${system.result.horizontal_fov_m.toFixed(2)}×${system.result.vertical_fov_m.toFixed(2)}m</span>
      </div>
    `
      )
      .join("")}
  `;
}

// Draw reference object on canvas
function drawReferenceObject(
  ctx: CanvasRenderingContext2D,
  obj: ReferenceObject,
  centerX: number,
  centerY: number,
  scale: number
) {
  const width = obj.width * 1000 * scale; // Convert to mm then scale
  const height = obj.height * 1000 * scale;
  const x = centerX - width / 2;
  const y = centerY - height / 2;

  // Draw filled rectangle
  ctx.fillStyle = obj.color;
  ctx.fillRect(x, y, width, height);

  // Draw outline
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Draw label
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  // Draw text with outline for visibility
  ctx.strokeText(obj.label, centerX, centerY);
  ctx.fillText(obj.label, centerX, centerY);

  // Draw size label below object
  ctx.fillStyle = obj.color;
  ctx.font = "10px sans-serif";
  ctx.textBaseline = "top";
  const sizeLabel = `${obj.name} (${obj.width}×${obj.height}m)`;
  ctx.fillText(sizeLabel, centerX, y + height + 3);
  
  ctx.textBaseline = "alphabetic";
}

// Get color for system index
function getColor(index: number): string {
  return SYSTEM_COLORS[index % SYSTEM_COLORS.length];
}

// Load preset
function loadPreset(presetName: string) {
  const preset = CAMERA_PRESETS[presetName];
  if (!preset) return;

  (document.getElementById("sensor-width") as HTMLInputElement).value = preset.sensor_width_mm?.toString() || "";
  (document.getElementById("sensor-height") as HTMLInputElement).value = preset.sensor_height_mm?.toString() || "";
  (document.getElementById("pixel-width") as HTMLInputElement).value = preset.pixel_width?.toString() || "";
  (document.getElementById("pixel-height") as HTMLInputElement).value = preset.pixel_height?.toString() || "";
  (document.getElementById("focal-length") as HTMLInputElement).value = preset.focal_length_mm?.toString() || "";
  (document.getElementById("name") as HTMLInputElement).value = preset.name || "";
}

// Tab switching
function switchTab(tabName: string) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const htmlBtn = btn as HTMLElement;
    btn.classList.toggle("active", htmlBtn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `${tabName}-tab`);
  });
  
  // Redraw visualization when switching to visualization tab
  if (tabName === "visualization") {
    drawVisualization(cameraSystems);
  }
}

// Initialize app
window.addEventListener("DOMContentLoaded", () => {
  // Button listeners
  document.getElementById("calculate-btn")?.addEventListener("click", calculateFov);
  document.getElementById("add-system-btn")?.addEventListener("click", addToComparison);
  document.getElementById("calc-focal-btn")?.addEventListener("click", calculateFocalLength);

  // Preset buttons
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const preset = (e.target as HTMLElement).dataset.preset!;
      loadPreset(preset);
    });
  });

  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tab = (e.target as HTMLElement).dataset.tab!;
      switchTab(tab);
    });
  });

  // Populate reference objects dropdown
  const refSelect = document.getElementById("ref-object-select") as HTMLSelectElement;
  if (refSelect) {
    // Clear existing options except "None"
    refSelect.innerHTML = '<option value="none">None</option>';
    
    // Add options from REFERENCE_OBJECTS array
    REFERENCE_OBJECTS.forEach((obj, index) => {
      const option = document.createElement("option");
      option.value = obj.id;
      option.textContent = `${obj.name} (${obj.description})`;
      if (index === 0) option.selected = true; // Select first object by default
      refSelect.appendChild(option);
    });
    
    // Add change listener
    refSelect.addEventListener("change", () => {
      drawVisualization(cameraSystems);
    });
  }

  // Initialize empty systems list
  updateSystemsList();
});
