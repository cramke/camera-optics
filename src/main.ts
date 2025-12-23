import { REFERENCE_OBJECTS, SYSTEM_COLORS } from './core/constants';
import type { CameraWithResult } from './core/types';
import { calculateCameraFov } from './services/api';
import { FEATURES } from './core/settings';
import { store } from './services/store';
import { drawVisualization } from './ui/visualization';
import { getCameraFromForm, getDistance, loadSystemToView, loadPreset } from './ui/form';
import { calculateFocalLengthFromFov } from './services/api';
import { displaySingleResult } from './ui/results';
import { showToast } from './ui/toast';
import { initializeDoriDesigner } from './ui/doriDesigner';
import { initializeImagePreview, updatePreviewCamera } from './ui/imagePreview';
import { initializeModals } from './ui/modals';

// Track the currently selected system index for highlighting
let selectedSystemIndex: number | null = null;

// Track if we're in edit mode and which index is being edited
let editingIndex: number | null = null;

// Track the currently displayed systems for visualization
let currentDisplayedSystems: CameraWithResult[] = [];

// Debounce delay for auto-calculation (ms)
// Optimal balance between responsiveness and performance
const AUTO_CALCULATE_DEBOUNCE_MS = 300;

/**
 * Escape HTML special characters to prevent XSS injection
 * Converts potentially dangerous characters to HTML entities
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
    Math.abs(currentDistanceMm - storedDistanceMm) > 0.01 // Allow for floating point precision
  );
}

// Tab switching function
function switchTab(tabName: string) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const htmlBtn = btn as HTMLElement;
    btn.classList.toggle('active', htmlBtn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });

  // Redraw visualization when switching to visualization tab
  if (tabName === 'visualization') {
    drawVisualization(currentDisplayedSystems);
  }
}

// Update UI to show edit mode
function setEditMode(index: number | null, hasChanges: boolean = false): void {
  editingIndex = index;
  const saveBtn = document.getElementById('save-changes-btn') as HTMLButtonElement;
  const discardBtn = document.getElementById('discard-changes-btn') as HTMLButtonElement;
  const deleteBtn = document.getElementById('delete-system-btn') as HTMLButtonElement;

  if (index !== null) {
    // Show/hide buttons based on whether there are changes
    saveBtn.style.display = hasChanges ? 'block' : 'none';
    discardBtn.style.display = hasChanges ? 'block' : 'none';
    deleteBtn.style.display = 'block'; // Always show delete when in edit mode
  } else {
    // Hide all edit mode buttons
    saveBtn.style.display = 'none';
    discardBtn.style.display = 'none';
    deleteBtn.style.display = 'none';
  }
}

// Check for form changes and update button visibility
function checkForChanges(): void {
  if (editingIndex !== null) {
    const hasChanges = hasFormChanges();
    setEditMode(editingIndex, hasChanges);
  }
}

// Validate that an index is within valid range of current systems
function isValidIndex(index: number | null): boolean {
  if (index === null) return false;
  const systems = store.getCameraSystems();
  return index >= 0 && index < systems.length;
}

// Safely clear editing and selection state
function clearEditingState(): void {
  editingIndex = null;
  selectedSystemIndex = null;
  setEditMode(null);
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
    console.error('Error calculating FOV:', error);

    // Show non-intrusive toast warning
    showToast('Invalid value', 'warning', 3000);

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
  const resultsOutput = document.getElementById('results-output');
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

    showToast('System added to comparison', 'success', 2000);

    updateSystemsList();
    currentDisplayedSystems = store.getCameraSystems();
    drawVisualization(currentDisplayedSystems);

    // Display the system in results tab
    displaySingleResult(camera, result, selectedSystemIndex);
  } catch (error) {
    console.error('Error adding system:', error);
    showToast(`Error: ${error}`, 'error', 3000);
  }
}

// Save changes to the currently editing system
async function saveChanges() {
  if (editingIndex === null) {
    showToast('No system selected for editing', 'warning', 2000);
    return;
  }

  // Validate that the editing index is still valid
  if (!isValidIndex(editingIndex)) {
    showToast('System no longer exists. Changes cannot be saved.', 'error', 3000);
    clearEditingState();
    return;
  }

  const camera = getCameraFromForm();
  const distance = getDistance();

  try {
    const result = await calculateCameraFov(camera, distance);

    // Revalidate index before update (in case of concurrent operations)
    if (!isValidIndex(editingIndex)) {
      showToast('System was deleted. Changes cannot be saved.', 'error', 3000);
      clearEditingState();
      return;
    }

    // Update existing system
    store.updateCameraSystem(editingIndex, { camera, result });
    selectedSystemIndex = editingIndex;

    showToast('Changes saved', 'success', 2000);

    updateSystemsList();
    currentDisplayedSystems = store.getCameraSystems();
    drawVisualization(currentDisplayedSystems);

    // Display the system in results tab
    displaySingleResult(camera, result, selectedSystemIndex);

    // Stay in edit mode after saving
  } catch (error) {
    console.error('Error saving changes:', error);
    showToast(`Error: ${error}`, 'error', 3000);
  }
}

// Update systems comparison list
export function updateSystemsList() {
  const systemsItems = document.getElementById('systems-items')!;
  const cameraSystems = store.getCameraSystems();

  if (cameraSystems.length === 0) {
    systemsItems.innerHTML = '<p class="empty-message">No systems added yet</p>';
    return;
  }

  systemsItems.innerHTML = cameraSystems
    .map((item, index) => {
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
      const systemName = item.camera.name || `System ${index + 1}`;
      const safeSystemName = escapeHtml(systemName); // Escape HTML to prevent XSS
      const safeEditAriaLabel = escapeHtml(
        isEditing ? `Save changes to ${systemName}` : `Edit ${systemName}`
      );
      const safeRemoveAriaLabel = escapeHtml(`Remove ${systemName} from comparison list`);
      const safeSelectAriaLabel = escapeHtml(`Select ${systemName}`);

      return `
      <div class="system-item ${index === selectedSystemIndex ? 'selected' : ''}" data-index="${index}" style="border-left: 4px solid ${getColor(index)}; cursor: pointer;" role="button" tabindex="0" aria-label="${safeSelectAriaLabel}">
        <div class="system-header">
          <strong class="system-name">${safeSystemName}</strong>
          <div class="system-actions">
            <button class="${editBtnClass}" data-index="${index}" title="${editBtnTitle}" aria-label="${safeEditAriaLabel}">${editBtnIcon}</button>
            <button class="remove-btn" data-index="${index}" title="Remove" aria-label="${safeRemoveAriaLabel}">×</button>
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
    })
    .join('');

  // Note: Event delegation is set up in DOMContentLoaded - no listeners added here
}

// Get color for system index (kept in main.ts as Phase 3 is skipped)
function getColor(index: number): string {
  return SYSTEM_COLORS[index % SYSTEM_COLORS.length];
}

// Switch to Camera Input tab
export function switchToCameraInput() {
  switchTab('camera-input');
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
  const sensorWidth = parseFloat(
    (document.getElementById('sensor-width') as HTMLInputElement).value
  );
  const sensorHeight = parseFloat(
    (document.getElementById('sensor-height') as HTMLInputElement).value
  );
  const hfovDeg = parseFloat((document.getElementById('hfov-deg') as HTMLInputElement).value);
  const vfovDeg = parseFloat((document.getElementById('vfov-deg') as HTMLInputElement).value);

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
    (document.getElementById('focal-length') as HTMLInputElement).value = focalLength.toFixed(2);

    // Update the calculated focal length display in the FOV section
    updateCalculatedFocalLength(focalLength);
  } catch (error) {
    console.error('Error calculating focal length:', error);
  }
}

// Update the calculated focal length in the focal length input field
function updateCalculatedFocalLength(focalLength: number) {
  const focalInput = document.getElementById('focal-length') as HTMLInputElement;

  if (focalInput) {
    focalInput.value = focalLength.toFixed(2);
  }
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay) as unknown as number;
  };
}

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
  // Button listeners
  document.getElementById('add-system-btn')?.addEventListener('click', addToComparison);
  document.getElementById('save-changes-btn')?.addEventListener('click', saveChanges);

  // Discard changes button
  document.getElementById('discard-changes-btn')?.addEventListener('click', () => {
    if (editingIndex === null) return;

    // Validate index is still valid
    if (!isValidIndex(editingIndex)) {
      showToast('System no longer exists', 'error', 2000);
      clearEditingState();
      return;
    }

    // Reload the original system values from the store
    loadSystemToView(editingIndex);
    // Update button visibility after discarding
    checkForChanges();
    showToast('Changes discarded', 'info', 2000);
  });

  // Delete system button
  document.getElementById('delete-system-btn')?.addEventListener('click', () => {
    if (editingIndex === null) return;

    // Validate index before deletion
    if (!isValidIndex(editingIndex)) {
      showToast('System no longer exists', 'error', 2000);
      clearEditingState();
      return;
    }

    const systems = store.getCameraSystems();
    const indexToDelete = editingIndex; // Capture current value
    const systemName = systems[indexToDelete].camera.name || `System ${indexToDelete + 1}`;

    // Clear editing state BEFORE deletion to prevent stale index
    clearEditingState();

    // Remove the system
    store.removeCameraSystem(indexToDelete);

    // Update the UI
    updateSystemsList();
    currentDisplayedSystems = store.getCameraSystems();
    drawVisualization(currentDisplayedSystems);

    // Clear the form
    (document.getElementById('name') as HTMLInputElement).value = '';

    showToast(`${systemName} deleted`, 'success', 2000);
  });

  // Add new system button (+ button in comparison list)
  document.getElementById('add-new-system-btn')?.addEventListener('click', async () => {
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
      switchTab('camera-input');

      // Scroll to top
      const cameraInputTab = document.getElementById('camera-input-tab');
      if (cameraInputTab) {
        cameraInputTab.scrollTop = 0;
      }

      showToast('System added - now editing', 'success', 2000);
    } catch (error) {
      console.error('Error adding system:', error);
      showToast(`Error: ${error}`, 'error', 3000);
    }
  });

  // Clear form button
  document.getElementById('clear-form-btn')?.addEventListener('click', () => {
    // Reset all form fields to default values
    (document.getElementById('name') as HTMLInputElement).value = '';
    (document.getElementById('sensor-width') as HTMLInputElement).value = '36';
    (document.getElementById('sensor-height') as HTMLInputElement).value = '27';
    (document.getElementById('pixel-width') as HTMLInputElement).value = '2000';
    (document.getElementById('pixel-height') as HTMLInputElement).value = '1500';
    (document.getElementById('focal-length') as HTMLInputElement).value = '50';
    (document.getElementById('distance') as HTMLInputElement).value = '25';
    (document.getElementById('hfov-deg') as HTMLInputElement).value = '';
    (document.getElementById('vfov-deg') as HTMLInputElement).value = '';

    // Exit edit mode
    setEditMode(null);
    selectedSystemIndex = null;

    // Recalculate with default values
    calculateFov();

    showToast('Form cleared', 'info', 2000);
  });

  // Add change tracking to all form inputs
  const formInputs = [
    'name',
    'sensor-width',
    'sensor-height',
    'pixel-width',
    'pixel-height',
    'focal-length',
    'distance',
  ];
  formInputs.forEach((inputId) => {
    document.getElementById(inputId)?.addEventListener('input', checkForChanges);
  });

  // Input method selection
  document
    .getElementById('focal-method')
    ?.addEventListener('click', () => switchInputMethod('focal'));
  document.getElementById('fov-method')?.addEventListener('click', () => switchInputMethod('fov'));

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const preset = (e.target as HTMLElement).dataset.preset!;
      loadPreset(preset);
      // Exit edit mode when loading a preset
      setEditMode(null);
    });
  });

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).dataset.tab!;
      switchTab(tab);
    });
  });

  // Populate reference objects dropdown
  const refSelect = document.getElementById('ref-object-select') as HTMLSelectElement;
  if (refSelect) {
    // Clear existing options except "None"
    refSelect.innerHTML = '<option value="none">None</option>';

    // Add options from REFERENCE_OBJECTS array
    REFERENCE_OBJECTS.forEach((obj, index) => {
      const option = document.createElement('option');
      option.value = obj.id;
      option.textContent = `${obj.name} (${obj.description})`;
      if (index === 0) option.selected = true; // Select first object by default
      refSelect.appendChild(option);
    });

    // Add change listener
    refSelect.addEventListener('change', () => {
      drawVisualization(currentDisplayedSystems);
    });
  }

  // Initialize empty systems list
  updateSystemsList();

  // Separate handler functions for system list actions
  async function handleRemoveSystem(index: number) {
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
  }

  async function handleEditToggle(index: number, cameraSystems: CameraWithResult[]) {
    // Check if this system is currently being edited
    if (editingIndex === index) {
      // Save changes
      await saveChanges();
      return;
    }

    // Enter edit mode
    const system = cameraSystems[index];

    // Load system values into form for editing
    loadSystemToView(index);

    // Update calculated FOV values
    updateCalculatedFov(system.result.horizontal_fov_deg, system.result.vertical_fov_deg);

    // Enter edit mode (no changes yet)
    setEditMode(index, false);
    selectedSystemIndex = index;

    // Update visual selection
    document.querySelectorAll('.system-item').forEach((sysItem, i) => {
      sysItem.classList.toggle('selected', i === index);
    });

    // Switch to Camera Input tab
    switchTab('camera-input');

    // Scroll to top of the tab content
    const cameraInputTab = document.getElementById('camera-input-tab');
    if (cameraInputTab) {
      cameraInputTab.scrollTop = 0;
    }
  }

  function handleSystemSelect(index: number, cameraSystems: CameraWithResult[]) {
    const system = cameraSystems[index];

    // Update selected index
    selectedSystemIndex = index;

    // Enter edit mode when selecting a system (no changes yet)
    setEditMode(index, false);

    // Update the visual selection by toggling the class
    document.querySelectorAll('.system-item').forEach((sysItem, i) => {
      sysItem.classList.toggle('selected', i === index);
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
  }

  // Set up event delegation for system list interactions (prevents memory leaks)
  const systemsItemsContainer = document.getElementById('systems-items');
  if (systemsItemsContainer) {
    systemsItemsContainer.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const cameraSystems = store.getCameraSystems();

      // Handle remove button clicks
      if (target.classList.contains('remove-btn')) {
        e.stopPropagation();
        const index = parseInt(target.dataset.index!);
        await handleRemoveSystem(index);
        return;
      }

      // Handle edit/save button clicks
      if (target.classList.contains('edit-btn')) {
        e.stopPropagation();
        const index = parseInt(target.dataset.index!);
        await handleEditToggle(index, cameraSystems);
        return;
      }

      // Handle system item clicks (selecting a system)
      const systemItem = target.closest('.system-item') as HTMLElement;
      if (systemItem) {
        const index = parseInt(systemItem.dataset.index!);
        handleSystemSelect(index, cameraSystems);
      }
    });

    // Add keyboard support for system items (Enter/Space to activate)
    systemsItemsContainer.addEventListener('keydown', async (e) => {
      const target = e.target as HTMLElement;

      // Only handle Enter and Space keys
      if (e.key !== 'Enter' && e.key !== ' ') return;

      e.preventDefault(); // Prevent scrolling on Space

      // Handle button actions
      if (target.classList.contains('remove-btn') || target.classList.contains('edit-btn')) {
        target.click(); // Trigger the click handler
        return;
      }

      // Handle system item selection
      const systemItem = target.closest('.system-item') as HTMLElement;
      if (systemItem && !target.closest('button')) {
        systemItem.click(); // Trigger the click handler
      }
    });
  }

  // Create debounced versions of calculation functions
  const debouncedCalculateFov = debounce(calculateFov, AUTO_CALCULATE_DEBOUNCE_MS);
  const debouncedAutoCalculateFocalLength = debounce(async () => {
    await autoCalculateFocalLength();
    // Also recalculate FOV with the new focal length
    calculateFov();
  }, AUTO_CALCULATE_DEBOUNCE_MS);

  // Auto-calculate FOV when any form field changes
  const formFields = [
    'sensor-width',
    'sensor-height',
    'pixel-width',
    'pixel-height',
    'focal-length',
    'distance',
  ];

  formFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', () => {
        debouncedCalculateFov();
      });
    }
  });

  // Auto-calculate focal length when FOV fields change
  const fovFields = ['hfov-deg', 'vfov-deg'];
  fovFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', () => {
        debouncedAutoCalculateFocalLength();
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
