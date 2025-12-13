/**
 * Application state management with observable pattern
 */

import type { CameraWithResult } from "../core/types";

/**
 * Global state store for camera systems
 */
class Store {
  private cameraSystems: CameraWithResult[] = [];
  private listeners: Array<() => void> = [];

  /**
   * Get all camera systems
   */
  getCameraSystems(): CameraWithResult[] {
    return this.cameraSystems;
  }

  /**
   * Get a specific camera system by index
   */
  getCameraSystem(index: number): CameraWithResult | undefined {
    return this.cameraSystems[index];
  }

  /**
   * Add a camera system to the list
   */
  addCameraSystem(system: CameraWithResult): void {
    this.cameraSystems.push(system);
    this.notifyListeners();
  }

  /**
   * Update a camera system at a specific index
   */
  updateCameraSystem(index: number, system: CameraWithResult): void {
    if (index >= 0 && index < this.cameraSystems.length) {
      this.cameraSystems[index] = system;
      this.notifyListeners();
    }
  }

  /**
   * Remove a camera system by index
   */
  removeCameraSystem(index: number): void {
    this.cameraSystems.splice(index, 1);
    this.notifyListeners();
  }

  /**
   * Get the number of camera systems
   */
  get length(): number {
    return this.cameraSystems.length;
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// Singleton instance
export const store = new Store();
