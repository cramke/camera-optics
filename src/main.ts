import { REFERENCE_OBJECTS, SYSTEM_COLORS } from "./constants";
import { calculateCameraFov } from "./api";
import { store } from "./store";
import { drawVisualization } from "./visualization";
import { getCameraFromForm, getDistance, calculateFocalLength, loadSystemToForm, loadPreset } from "./form";
import { displaySingleResult } from "./results";

// Calculate FOV for current form values
async function calculateFov() {
  const camera = getCameraFromForm();
  const distance = getDistance();

  try {
    const result = await calculateCameraFov(camera, distance);

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
    const result = await calculateCameraFov(camera, distance);

    store.addCameraSystem({ camera, result });
    updateSystemsList();
    drawVisualization(store.getCameraSystems());
  } catch (error) {
    console.error("Error adding system:", error);
    alert(`Error: ${error}`);
  }
}

// Update systems comparison list
function updateSystemsList() {
  const systemsItems = document.getElementById("systems-items")!;
  const cameraSystems = store.getCameraSystems();
  
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
      loadSystemToForm(index, () => {
        updateSystemsList();
        drawVisualization(store.getCameraSystems());
      });
    });
  });

  // Add edit button listeners
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt((e.target as HTMLElement).dataset.index!);
      loadSystemToForm(index, () => {
        updateSystemsList();
        drawVisualization(store.getCameraSystems());
      });
    });
  });

  // Add remove listeners
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt((e.target as HTMLElement).dataset.index!);
      store.removeCameraSystem(index);
      updateSystemsList();
      drawVisualization(store.getCameraSystems());
    });
  });
}

// Get color for system index (kept in main.ts as Phase 3 is skipped)
function getColor(index: number): string {
  return SYSTEM_COLORS[index % SYSTEM_COLORS.length];
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
    drawVisualization(store.getCameraSystems());
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
      drawVisualization(store.getCameraSystems());
    });
  }

  // Initialize empty systems list
  updateSystemsList();
});
