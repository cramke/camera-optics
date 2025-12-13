/**
 * Settings and About modal management
 */

import { getExperimentalFeatures, setExperimentalFeatures } from "../core/settings";

/**
 * Initialize settings and about modals
 */
export function initializeModals(): void {
  const settingsBtnMobile = document.getElementById("settings-btn-mobile");
  const aboutBtnMobile = document.getElementById("about-btn-mobile");
  const menuToggleBtn = document.getElementById("menu-toggle-btn");
  const menuDropdown = document.getElementById("menu-dropdown");
  const settingsModal = document.getElementById("settings-modal");
  const aboutModal = document.getElementById("about-modal");
  const settingsClose = document.getElementById("settings-close");
  const aboutClose = document.getElementById("about-close");
  const settingsSave = document.getElementById("settings-save");
  const experimentalCheckbox = document.getElementById("enable-experimental") as HTMLInputElement;

  if (!settingsModal || !aboutModal) return;

  // Load current setting
  if (experimentalCheckbox) {
    experimentalCheckbox.checked = getExperimentalFeatures();
  }

  // Toggle menu
  menuToggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    menuDropdown?.classList.toggle("active");
  });

  // Close menu when clicking outside
  document.addEventListener("click", () => {
    menuDropdown?.classList.remove("active");
  });

  // Open settings modal
  settingsBtnMobile?.addEventListener("click", () => {
    menuDropdown?.classList.remove("active");
    settingsModal.classList.add("active");
  });

  // Open about modal
  aboutBtnMobile?.addEventListener("click", () => {
    menuDropdown?.classList.remove("active");
    aboutModal.classList.add("active");
  });

  // Close settings modal
  settingsClose?.addEventListener("click", () => {
    settingsModal.classList.remove("active");
  });

  // Close about modal
  aboutClose?.addEventListener("click", () => {
    aboutModal.classList.remove("active");
  });

  // Close modals on outside click
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove("active");
    }
  });

  aboutModal.addEventListener("click", (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.remove("active");
    }
  });

  // Save settings
  settingsSave?.addEventListener("click", () => {
    if (experimentalCheckbox) {
      setExperimentalFeatures(experimentalCheckbox.checked);
      // Reload to apply changes
      window.location.reload();
    }
  });

  // Close with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      settingsModal.classList.remove("active");
      aboutModal.classList.remove("active");
    }
  });
}
