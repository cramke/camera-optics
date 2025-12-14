import { REFERENCE_OBJECTS, SYSTEM_COLORS } from "./core/constants";
import type { CameraWithResult } from "./core/types";
import { calculateCameraFov } from "./services/api";
import { FEATURES } from "./core/settings";
import { store } from "./services/store";
import { drawVisualization } from "./ui/visualization";
import { getCameraFromForm, getDistance, loadSystemToView, loadPreset } from "./ui/form";
import { calculateFocalLengthFromFov } from "./services/api";
import { displaySingleResult } from "./ui/results";
import { showToast } from "./ui/toast";
import { initializeDoriDesigner } from "./ui/doriDesigner";
import { initializeImagePreview, updatePreviewCamera } from "./ui/imagePreview";
import { initializeModals } from "./ui/modals";

// Track the currently selected system index for highlighting
let selectedSystemIndex: number | null = null;

// Track if we're in edit mode and which index is being edited
let editingIndex: number | null = null;

// Track the currently displayed systems for visualization
let currentDisplayedSystems: CameraWithResult[] = [];

// Check if form values differ from stored system
function hasFormChanges(): boolean {
  if (editingIndex === null) return false;
  
  const systems = store.getCameraSystems();
  const storedSystem = systems[editingIndex];
  if (!storedSystem) return false;
  
  const currentCamera = getCameraFromForm();
  const stored = storedSystem.camera;
  
  // Get current distance in mm (getDistance converts m to mm)
  const currentDistanceMm = getDistance();
  // Convert stored distance from meters back to mm for comparison
  const storedDistanceMm = storedSystem.result.distance_m * 1000;
  
  return (
    currentCamera.name !== stored.name ||
    currentCamera.sensor_width_mm !== stored.sensor_width_mm ||
    currentCamera.sensor_height_mm !== stored.sensor_height_mm ||
    currentCamera.pixel_width !== stored.pixel_width ||
    currentCamera.pixel_height !== stored.pixel_height ||
    currentCamera.focal_length_mm !== stored.focal_length_mm ||
    Math.abs(currentDistanceMm - storedDistanceMm) > 0.01  // Allow for floating point precision
  );
}

// Tab switching function
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
    drawVisualization(currentDisplayedSystems);
  }
}

// Update UI to show edit mode
function setEditMode(index: number | null, hasChanges: boolean = false): void {
  editingIndex = index;
  const saveBtn = document.getElementById("save-changes-btn") as HTMLButtonElement;
  const discardBtn = document.getElementById("discard-changes-btn") as HTMLButtonElement;
  const deleteBtn = document.getElementById("delete-system-btn") as HTMLButtonElement;
  
  if (index !== null) {
    // Show/hide buttons based on whether there are changes
    saveBtn.style.display = hasChanges ? "block" : "none";
    discardBtn.style.display = hasChanges ? "block" : "none";
    deleteBtn.style.display = "block"; // Always show delete when in edit mode
  } else {
    // Hide all edit mode buttons
    saveBtn.style.display = "none";
    discardBtn.style.display = "none";
    deleteBtn.style.display = "none";
  }
}

// Check for form changes and update button visibility
function checkForChanges(): void {
  if (editingIndex !== null) {
    const hasChanges = hasFormChanges();
    setEditMode(editingIndex, hasChanges);
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

    // Update the calculated FOV values in the focal length section
    updateCalculatedFov(result.horizontal_fov_deg, result.vertical_fov_deg);

    // Update image preview with current camera settings
    updatePreviewCamera(camera, result);

    displaySingleResult(camera, result);
    currentDisplayedSystems = [{ camera, result }];
    drawVisualization(currentDisplayedSystems);
  } catch (error) {
    console.error("Error calculating FOV:", error);
    
    // Show non-intrusive toast warning
    showToast("Invalid value", "warning", 3000);
    
    // Clear visualization and show error in results
    currentDisplayedSystems = [];
    drawVisualization(currentDisplayedSystems);
    displayCalculationError();
  }
}

// Update the calculated FOV in the FOV input fields
function updateCalculatedFov(hFov: number, vFov: number) {
  const hFovInput = document.getElementById('hfov-deg') as HTMLInputElement;
  const vFovInput = document.getElementById('vfov-deg') as HTMLInputElement;
  
  if (hFovInput && vFovInput) {
    hFovInput.value = hFov.toFixed(2);
    vFovInput.value = vFov.toFixed(2);
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

// Add current system to comparison list (always creates new)
async function addToComparison() {
  const camera = getCameraFromForm();
  const distance = getDistance();

  try {
    const result = await calculateCameraFov(camera, distance);

    // Add new system - if no name provided, assign default name
    if (!camera.name) {
      camera.name = `System ${store.getCameraSystems().length + 1}`;
    }
    store.addCameraSystem({ camera, result });
    
    // Set the newly added system as selected
    selectedSystemIndex = store.getCameraSystems().length - 1;
    
    // Exit edit mode since we created a new system
    setEditMode(null);
    
    showToast("System added to comparison", "success", 2000);
    
    updateSystemsList();
    currentDisplayedSystems = store.getCameraSystems();
    drawVisualization(currentDisplayedSystems);
    
    // Display the system in results tab
    displaySingleResult(camera, result, selectedSystemIndex);
  } catch (error) {
    console.error("Error adding system:", error);
    showToast(`Error: ${error}`, "error", 3000);
  }
}

// Save changes to the currently editing system
async function saveChanges() {
  if (editingIndex === null) {
    showToast("No system selected for editing", "warning", 2000);
    return;
  }

  const camera = getCameraFromForm();
  const distance = getDistance();

  try {
    const result = await calculateCameraFov(camera, distance);

    // Update existing system
    store.updateCameraSystem(editingIndex, { camera, result });
    selectedSystemIndex = editingIndex;
    
    showToast("Changes saved", "success", 2000);
    
    updateSystemsList();
    currentDisplayedSystems = store.getCameraSystems();
    drawVisualization(currentDisplayedSystems);
    
    // Display the system in results tab
    displaySingleResult(camera, result, selectedSystemIndex);
    
    // Stay in edit mode after saving
  } catch (error) {
    console.error("Error saving changes:", error);
    showToast(`Error: ${error}`, "error", 3000);
  }
}

// Update systems comparison list
export function updateSystemsList() {
  const systemsItems = document.getElementById("systems-items")!;
  const cameraSystems = store.getCameraSystems();
  
  if (cameraSystems.length === 0) {
    systemsItems.innerHTML = '<p class="empty-message">No systems added yet</p>';
    return;
  }

  systemsItems.innerHTML = cameraSystems
    .map(
      (item, index) => {
        const dori = item.result.dori;
        const doriInfo = dori 
          ? `<div class="system-dori">
              <span class="dori-label">DORI:</span>
              <span class="dori-values">D:${dori.detection_m.toFixed(0)}m | O:${dori.observation_m.toFixed(0)}m | R:${dori.recognition_m.toFixed(0)}m | I:${dori.identification_m.toFixed(0)}m</span>
            </div>`
          : '';
        
        const isEditing = editingIndex === index;
        const editBtnIcon = isEditing ? '✔' : '✎';
        const editBtnTitle = isEditing ? 'Save' : 'Edit';
        const editBtnClass = isEditing ? 'edit-btn save-mode' : 'edit-btn';
        
        return `
      <div class="system-item ${index === selectedSystemIndex ? 'selected' : ''}" data-index="${index}" style="border-left: 4px solid ${getColor(index)}; cursor: pointer;">
        <div class="system-header">
          <strong class="system-name">${item.camera.name || `System ${index + 1}`}</strong>
          <div class="system-actions">
            <button class="${editBtnClass}" data-index="${index}" title="${editBtnTitle}">${editBtnIcon}</button>
            <button class="remove-btn" data-index="${index}" title="Remove">×</button>
          </div>
        </div>
        <div class="system-info">
          <div class="system-spec-row">
            <span class="spec-label">Resolution:</span>
            <span class="spec-value">${item.camera.pixel_width} x ${item.camera.pixel_height} px | ${item.camera.sensor_width_mm} x ${item.camera.sensor_height_mm} mm</span>
          </div>
          <div class="system-spec-row">
            <span class="spec-label">HFOV:</span>
            <span class="spec-value">${item.result.horizontal_fov_deg.toFixed(1)}° | <span class="spec-distance">@${item.result.distance_m.toFixed(0)}m</span> ${item.result.horizontal_fov_m.toFixed(1)}m</span>
          </div>
          ${doriInfo}
        </div>
      </div>
    `;
      }
    )
    .join("");

  // Add click listeners to entire system item to select and display it
  document.querySelectorAll(".system-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const index = parseInt((e.currentTarget as HTMLElement).dataset.index!);
      const system = cameraSystems[index];
      
      // Update selected index
      selectedSystemIndex = index;
      
      // Enter edit mode when selecting a system (no changes yet)
      setEditMode(index, false);
      
      // Update the visual selection by toggling the class
      document.querySelectorAll(".system-item").forEach((sysItem, i) => {
        sysItem.classList.toggle("selected", i === index);
      });
      
      // Load the system values into the form for editing
      loadSystemToView(index);
      
      // Update calculated FOV values
      updateCalculatedFov(system.result.horizontal_fov_deg, system.result.vertical_fov_deg);
      
      // Update results tab with the selected system
      displaySingleResult(system.camera, system.result, index);
      
      // Update visualization to highlight the selected system
      currentDisplayedSystems = store.getCameraSystems();
      drawVisualization(currentDisplayedSystems);
      
      // Don't switch tabs - stay on current tab
    });
  });

  // Add edit/save button listeners
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const index = parseInt((e.target as HTMLElement).dataset.index!);
      
      // Check if this system is currently being edited
      if (editingIndex === index) {
        // Save changes
        await saveChanges();
      } else {
        // Enter edit mode
        // Load system values into form for editing
        loadSystemToView(index);
        
        // Update calculated FOV values
        const system = cameraSystems[index];
        updateCalculatedFov(system.result.horizontal_fov_deg, system.result.vertical_fov_deg);
        
        // Enter edit mode (no changes yet)
        setEditMode(index, false);
        selectedSystemIndex = index;
        
        // Update visual selection
        document.querySelectorAll(".system-item").forEach((sysItem, i) => {
          sysItem.classList.toggle("selected", i === index);
        });
        
        // Switch to Camera Input tab
        switchTab("camera-input");
        
        // Scroll to top of the tab content
        const cameraInputTab = document.getElementById("camera-input-tab");
        if (cameraInputTab) {
          cameraInputTab.scrollTop = 0;
        }
      }
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
      currentDisplayedSystems = store.getCameraSystems();
      drawVisualization(currentDisplayedSystems);
      
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

// Switch to Camera Input tab
export function switchToCameraInput() {
  switchTab("camera-input");
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
    
    // Update the calculated focal length display in the FOV section
    updateCalculatedFocalLength(focalLength);
  } catch (error) {
    console.error("Error calculating focal length:", error);
  }
}

// Update the calculated focal length in the focal length input field
function updateCalculatedFocalLength(focalLength: number) {
  const focalInput = document.getElementById('focal-length') as HTMLInputElement;
  
  if (focalInput) {
    focalInput.value = focalLength.toFixed(2);
  }
}

// Initialize app
window.addEventListener("DOMContentLoaded", () => {
  // Button listeners
  document.getElementById("add-system-btn")?.addEventListener("click", addToComparison);
  document.getElementById("save-changes-btn")?.addEventListener("click", saveChanges);
  
  // Discard changes button
  document.getElementById("discard-changes-btn")?.addEventListener("click", () => {
    if (editingIndex !== null) {
      // Reload the original system values from the store
      loadSystemToView(editingIndex);
      // Update button visibility after discarding
      checkForChanges();
      showToast("Changes discarded", "info", 2000);
    }
  });
  
  // Delete system button
  document.getElementById("delete-system-btn")?.addEventListener("click", () => {
    if (editingIndex !== null) {
      const systems = store.getCameraSystems();
      const systemName = systems[editingIndex]?.camera.name || `System ${editingIndex + 1}`;
      
      // Remove the system
      store.removeCameraSystem(editingIndex);
      
      // Exit edit mode and clear selection
      setEditMode(null);
      selectedSystemIndex = null;
      editingIndex = null;
      
      // Update the UI
      updateSystemsList();
      currentDisplayedSystems = store.getCameraSystems();
      drawVisualization(currentDisplayedSystems);
      
      // Clear the form
      (document.getElementById("name") as HTMLInputElement).value = "";
      
      showToast(`${systemName} deleted`, "success", 2000);
    }
  });
  
  // Add new system button (+ button in comparison list)
  document.getElementById("add-new-system-btn")?.addEventListener("click", async () => {
    try {
      // Add current form to comparison list
      const camera = getCameraFromForm();
      const distance = getDistance();
      const result = await calculateCameraFov(camera, distance);
      
      // If no name provided, assign default name
      if (!camera.name) {
        camera.name = `System ${store.getCameraSystems().length + 1}`;
      }
      
      // Add the system
      store.addCameraSystem({ camera, result });
      const newIndex = store.getCameraSystems().length - 1;
      
      // Set the selected index and edit mode BEFORE updating the list
      selectedSystemIndex = newIndex;
      setEditMode(newIndex, false);
      
      // Update the list (will use the selectedSystemIndex to apply the selected class)
      updateSystemsList();
      currentDisplayedSystems = store.getCameraSystems();
      drawVisualization(currentDisplayedSystems);
      
      // Load the newly added system back into the form
      loadSystemToView(newIndex);
      
      // Update calculated FOV values
      updateCalculatedFov(result.horizontal_fov_deg, result.vertical_fov_deg);
      
      // Switch to Camera Input tab
      switchTab("camera-input");
      
      // Scroll to top
      const cameraInputTab = document.getElementById("camera-input-tab");
      if (cameraInputTab) {
        cameraInputTab.scrollTop = 0;
      }
      
      showToast("System added - now editing", "success", 2000);
    } catch (error) {
      console.error("Error adding system:", error);
      showToast(`Error: ${error}`, "error", 3000);
    }
  });

  // Clear form button
  document.getElementById("clear-form-btn")?.addEventListener("click", () => {
    // Reset all form fields to default values
    (document.getElementById("name") as HTMLInputElement).value = "";
    (document.getElementById("sensor-width") as HTMLInputElement).value = "36";
    (document.getElementById("sensor-height") as HTMLInputElement).value = "27";
    (document.getElementById("pixel-width") as HTMLInputElement).value = "2000";
    (document.getElementById("pixel-height") as HTMLInputElement).value = "1500";
    (document.getElementById("focal-length") as HTMLInputElement).value = "50";
    (document.getElementById("distance") as HTMLInputElement).value = "25";
    (document.getElementById("hfov-deg") as HTMLInputElement).value = "";
    (document.getElementById("vfov-deg") as HTMLInputElement).value = "";
    
    // Exit edit mode
    setEditMode(null);
    selectedSystemIndex = null;
    
    // Recalculate with default values
    calculateFov();
    
    showToast("Form cleared", "info", 2000);
  });

  // Add change tracking to all form inputs
  const formInputs = [
    'name', 'sensor-width', 'sensor-height', 
    'pixel-width', 'pixel-height', 'focal-length', 'distance'
  ];
  formInputs.forEach(inputId => {
    document.getElementById(inputId)?.addEventListener('input', checkForChanges);
  });

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
      drawVisualization(currentDisplayedSystems);
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

  // Initialize DORI Designer (if enabled)
  if (FEATURES.DORI_DESIGNER) {
    initializeDoriDesigner();
  }

  // Initialize Image Preview (if enabled)
  if (FEATURES.IMAGE_PREVIEW) {
    initializeImagePreview();
  }

  // Hide feature-flagged tabs
  hideDisabledFeatures();

  // Initialize settings and about modals
  initializeModals();

  // Calculate FOV with default values on startup
  calculateFov();
});

// Hide tabs for disabled features
function hideDisabledFeatures(): void {
  if (!FEATURES.IMAGE_PREVIEW) {
    const previewTab = document.querySelector('[data-tab="image-preview"]');
    const previewContent = document.getElementById('image-preview-tab');
    if (previewTab) previewTab.remove();
    if (previewContent) previewContent.remove();
  }

  if (!FEATURES.DORI_DESIGNER) {
    const doriTab = document.querySelector('[data-tab="dori-designer"]');
    const doriContent = document.getElementById('dori-designer-tab');
    if (doriTab) doriTab.remove();
    if (doriContent) doriContent.remove();
  }
}
