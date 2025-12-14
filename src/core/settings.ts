/**
 * Application settings management
 */

/**
 * Settings keys stored in localStorage
 */
const SETTINGS_KEYS = {
  EXPERIMENTAL_FEATURES: 'experimental-features',
} as const;

/**
 * Get a boolean setting from localStorage
 */
function getBooleanSetting(key: string, defaultValue: boolean = false): boolean {
  const value = localStorage.getItem(key);
  return value === null ? defaultValue : value === 'true';
}

/**
 * Set a boolean setting in localStorage
 */
function setBooleanSetting(key: string, value: boolean): void {
  localStorage.setItem(key, value.toString());
}

/**
 * Check if experimental features are enabled
 */
function isExperimentalEnabled(): boolean {
  return getBooleanSetting(SETTINGS_KEYS.EXPERIMENTAL_FEATURES, true);
}

const experimentalEnabled = isExperimentalEnabled();

export const FEATURES = {
  // Image Preview tab - experimental feature
  IMAGE_PREVIEW: experimentalEnabled,

  // DORI Designer tab - experimental feature
  DORI_DESIGNER: experimentalEnabled,
} as const;

/**
 * Save experimental features setting
 */
export function setExperimentalFeatures(enabled: boolean): void {
  setBooleanSetting(SETTINGS_KEYS.EXPERIMENTAL_FEATURES, enabled);
}

/**
 * Get current experimental features setting
 */
export function getExperimentalFeatures(): boolean {
  return isExperimentalEnabled();
}
