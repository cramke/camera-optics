import { invoke } from "@tauri-apps/api/core";

interface CameraSystem {
  sensor_width_mm: number;
  sensor_height_mm: number;
  pixel_width: number;
  pixel_height: number;
  focal_length_mm: number;
  name?: string;
}

interface FovResult {
  horizontal_fov_deg: number;
  vertical_fov_deg: number;
  horizontal_fov_m: number;
  vertical_fov_m: number;
  ppm: number;
  gsd_mm: number;
  distance_m: number;
}

interface CameraWithResult {
  camera: CameraSystem;
  result: FovResult;
}

// Store camera systems for comparison
const cameraSystems: CameraWithResult[] = [];

// Preset camera configurations
const presets: Record<string, Partial<CameraSystem>> = {
  "full-frame": {
    sensor_width_mm: 36,
    sensor_height_mm: 24,
    pixel_width: 6000,
    pixel_height: 4000,
    focal_length_mm: 50,
    name: "Full Frame 50mm",
  },
  "aps-c": {
    sensor_width_mm: 23.5,
    sensor_height_mm: 15.6,
    pixel_width: 6000,
    pixel_height: 4000,
    focal_length_mm: 35,
    name: "APS-C 35mm",
  },
  "micro43": {
    sensor_width_mm: 17.3,
    sensor_height_mm: 13,
    pixel_width: 5184,
    pixel_height: 3888,
    focal_length_mm: 25,
    name: "Micro 4/3 25mm",
  },
};

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
        <div class="system-info">
          <strong>${item.camera.name || `System ${index + 1}`}</strong>
          <span class="system-specs">${item.camera.sensor_width_mm}×${item.camera.sensor_height_mm}mm, ${item.camera.focal_length_mm}mm</span>
        </div>
        <button class="remove-btn" data-index="${index}">×</button>
      </div>
    `
    )
    .join("");

  // Add remove listeners
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt((e.target as HTMLElement).dataset.index!);
      cameraSystems.splice(index, 1);
      updateSystemsList();
      drawVisualization(cameraSystems);
    });
  });
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

  // Draw each FOV
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
  });

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

// Get color for system index
function getColor(index: number): string {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  return colors[index % colors.length];
}

// Load preset
function loadPreset(presetName: string) {
  const preset = presets[presetName];
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

  // Initialize empty systems list
  updateSystemsList();
});
