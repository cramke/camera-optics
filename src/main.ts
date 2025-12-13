import { REFERENCE_OBJECTS, SYSTEM_COLORS } from "./core/constants";
import { calculateCameraFov } from "./services/api";
import { store } from "./services/store";
import { drawVisualization } from "./ui/visualization";
import { getCameraFromForm, getDistance, loadSystemToView, loadPreset } from "./ui/form";
import { calculateFocalLengthFromFov } from "./services/api";
import { displaySingleResult } from "./ui/results";
import { showToast } from "./ui/toast";

// Track the currently selected system index for highlighting
let selectedSystemIndex: number | null = null;

// Track if we're in edit mode and which index is being edited
let editingIndex: number | null = null;

// Update UI to show edit mode
function setEditMode(index: number | null): void {
  editingIndex = index;
  const addBtn = document.getElementById("add-system-btn") as HTMLButtonElement;
  
  if (index !== null) {
    addBtn.textContent = "Save Changes";
    addBtn.classList.add("edit-mode");
  } else {
    addBtn.textContent = "Add to Comparison";
    addBtn.classList.remove("edit-mode");
  }
}

// Calculate FOV for current form values
async function calculateFov(exitEditMode: boolean = false) {
  try {
    const camera = getCameraFromForm();
    const distance = getDistance();
    const result = await calculateCameraFov(camera, distance);

    // Only exit edit mode if explicitly requested (e.g., from Calculate button click)
    if (exitEditMode) {
      setEditMode(null);
    }

    displaySingleResult(camera, result);
    drawVisualization([{ camera, result }]);
  } catch (error) {
    console.error("Error calculating FOV:", error);
    
    // Show non-intrusive toast warning
    showToast("Invalid value", "warning", 3000);
    
    // Clear visualization and show error in results
    drawVisualization([]);
    displayCalculationError();
  }
}

// Display simple error message in results tab
function displayCalculationError(): void {
  const resultsOutput = document.getElementById("results-output");
  if (!resultsOutput) return;
  
  resultsOutput.innerHTML = `
    <div class="error-card">
      <h3>Invalid value</h3>
      <p class="error-hint">Please check that all input values are valid.</p>
    </div>
  `;
}

// Add current system to comparison list or save changes if editing
async function addToComparison() {
  const camera = getCameraFromForm();
  const distance = getDistance();

  try {
    const result = await calculateCameraFov(camera, distance);

    if (editingIndex !== null) {
      // Update existing system
      store.updateCameraSystem(editingIndex, { camera, result });
      selectedSystemIndex = editingIndex;
      
      // Exit edit mode
      setEditMode(null);
      
      showToast("Changes saved", "success", 2000);
    } else {
      // Add new system
      store.addCameraSystem({ camera, result });
      
      // Set the newly added system as selected
      selectedSystemIndex = store.getCameraSystems().length - 1;
      
      showToast("System added to comparison", "success", 2000);
    }
    
    updateSystemsList();
    drawVisualization(store.getCameraSystems());
    
    // Display the system in results tab
    displaySingleResult(camera, result, selectedSystemIndex);
  } catch (error) {
    console.error("Error saving system:", error);
    showToast(`Error: ${error}`, "error", 3000);
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
      <div class="system-item ${index === selectedSystemIndex ? 'selected' : ''}" data-index="${index}" style="border-left: 4px solid ${getColor(index)}; cursor: pointer;">
        <div class="system-info">
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

  // Add click listeners to entire system item to select and display it
  document.querySelectorAll(".system-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const index = parseInt((e.currentTarget as HTMLElement).dataset.index!);
      const system = cameraSystems[index];
      
      // Update selected index
      selectedSystemIndex = index;
      
      // Exit edit mode when viewing a different system
      setEditMode(null);
      
      // Update the visual selection by toggling the class
      document.querySelectorAll(".system-item").forEach((sysItem, i) => {
        sysItem.classList.toggle("selected", i === index);
      });
      
      // Load the system values into the form (for viewing)
      loadSystemToView(index);
      
      // Update results tab with the selected system
      displaySingleResult(system.camera, system.result, index);
      
      // Update visualization to highlight the selected system
      drawVisualization(store.getCameraSystems());
      
      // Don't switch tabs - stay on current tab
    });
  });

  // Add edit button listeners
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt((e.target as HTMLElement).dataset.index!);
      
      // Load system values into form for editing
      loadSystemToView(index);
      
      // Enter edit mode
      setEditMode(index);
      selectedSystemIndex = index;
      
      // Update visual selection
      document.querySelectorAll(".system-item").forEach((sysItem, i) => {
        sysItem.classList.toggle("selected", i === index);
      });
      
      // Scroll to the form
      document.querySelector(".camera-form")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Add remove listeners
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt((e.target as HTMLElement).dataset.index!);
      store.removeCameraSystem(index);
      
      // Adjust selected index after removal
      if (selectedSystemIndex !== null) {
        if (selectedSystemIndex === index) {
          // If we removed the selected item, select the last item
          const updatedSystems = store.getCameraSystems();
          selectedSystemIndex = updatedSystems.length > 0 ? updatedSystems.length - 1 : null;
        } else if (selectedSystemIndex > index) {
          // If we removed an item before the selected one, adjust the index
          selectedSystemIndex--;
        }
      }
      
      updateSystemsList();
      drawVisualization(store.getCameraSystems());
      
      // Update results tab to show the selected system if available
      const updatedSystems = store.getCameraSystems();
      if (updatedSystems.length > 0 && selectedSystemIndex !== null) {
        const selected = updatedSystems[selectedSystemIndex];
        displaySingleResult(selected.camera, selected.result, selectedSystemIndex);
      }
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

// Switch between focal length and FOV input methods
function switchInputMethod(method: 'focal' | 'fov') {
  const focalMethod = document.getElementById('focal-method');
  const fovMethod = document.getElementById('fov-method');
  const focalInput = document.getElementById('focal-length') as HTMLInputElement;
  const hfovInput = document.getElementById('hfov-deg') as HTMLInputElement;
  const vfovInput = document.getElementById('vfov-deg') as HTMLInputElement;
  
  if (method === 'focal') {
    focalMethod?.classList.add('active');
    fovMethod?.classList.remove('active');
    focalInput.disabled = false;
    hfovInput.disabled = true;
    vfovInput.disabled = true;
  } else {
    focalMethod?.classList.remove('active');
    fovMethod?.classList.add('active');
    focalInput.disabled = true;
    hfovInput.disabled = false;
    vfovInput.disabled = false;
  }
}

// Auto-calculate focal length from FOV fields
async function autoCalculateFocalLength() {
  const sensorWidth = parseFloat((document.getElementById("sensor-width") as HTMLInputElement).value);
  const sensorHeight = parseFloat((document.getElementById("sensor-height") as HTMLInputElement).value);
  const hfovDeg = parseFloat((document.getElementById("hfov-deg") as HTMLInputElement).value);
  const vfovDeg = parseFloat((document.getElementById("vfov-deg") as HTMLInputElement).value);

  if (!sensorWidth || !sensorHeight) return;

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
    return; // No valid FOV input
  }

  try {
    const focalLength = await calculateFocalLengthFromFov(sensorSize, fovDeg);
    // Update focal length field (but keep it disabled since we're in FOV mode)
    (document.getElementById("focal-length") as HTMLInputElement).value = focalLength.toFixed(2);
  } catch (error) {
    console.error("Error calculating focal length:", error);
  }
}

// Initialize app
window.addEventListener("DOMContentLoaded", () => {
  // Button listeners
  document.getElementById("add-system-btn")?.addEventListener("click", addToComparison);

  // Input method selection
  document.getElementById('focal-method')?.addEventListener('click', () => switchInputMethod('focal'));
  document.getElementById('fov-method')?.addEventListener('click', () => switchInputMethod('fov'));

  // Preset buttons
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const preset = (e.target as HTMLElement).dataset.preset!;
      loadPreset(preset);
      // Exit edit mode when loading a preset
      setEditMode(null);
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

  // Auto-calculate FOV when any form field changes
  const formFields = [
    "sensor-width",
    "sensor-height", 
    "pixel-width",
    "pixel-height",
    "focal-length",
    "distance"
  ];

  formFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("input", () => {
        calculateFov();
      });
    }
  });

  // Auto-calculate focal length when FOV fields change
  const fovFields = ["hfov-deg", "vfov-deg"];
  fovFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("input", async () => {
        await autoCalculateFocalLength();
        // Also recalculate FOV with the new focal length
        calculateFov();
      });
    }
  });

  // Initialize with focal length method active
  switchInputMethod('focal');

  // Calculate FOV with default values on startup
  calculateFov();
});
