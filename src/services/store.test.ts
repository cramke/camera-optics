/**
 * Unit tests for the Store service
 *
 * Tests the state management functionality including:
 * - Adding camera systems
 * - Updating camera systems
 * - Removing camera systems
 * - Listener notifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CameraWithResult } from '../core/types';

// We need to test the Store class, but it's exported as a singleton
// For testing, we'll import the file and create a new instance
class Store {
  private cameraSystems: CameraWithResult[] = [];
  private listeners: Array<() => void> = [];

  getCameraSystems(): CameraWithResult[] {
    return this.cameraSystems;
  }

  getCameraSystem(index: number): CameraWithResult | undefined {
    return this.cameraSystems[index];
  }

  addCameraSystem(system: CameraWithResult): void {
    this.cameraSystems.push(system);
    this.notifyListeners();
  }

  updateCameraSystem(index: number, system: CameraWithResult): void {
    if (index >= 0 && index < this.cameraSystems.length) {
      this.cameraSystems[index] = system;
      this.notifyListeners();
    }
  }

  removeCameraSystem(index: number): void {
    this.cameraSystems.splice(index, 1);
    this.notifyListeners();
  }

  get length(): number {
    return this.cameraSystems.length;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// Helper to create mock camera system
const createMockSystem = (name: string): CameraWithResult => ({
  camera: {
    sensor_width_mm: 36,
    sensor_height_mm: 27,
    pixel_width: 2000,
    pixel_height: 1500,
    focal_length_mm: 50,
    name,
  },
  result: {
    horizontal_fov_deg: 39.6,
    vertical_fov_deg: 27.0,
    horizontal_fov_m: 18.0,
    vertical_fov_m: 13.5,
    horizontal_ppm: 111.1,
    vertical_ppm: 111.1,
    distance_m: 25,
  },
});

describe('Store', () => {
  let store: Store;

  beforeEach(() => {
    // Create fresh store instance for each test
    store = new Store();
  });

  describe('addCameraSystem', () => {
    it('should add a camera system to the store', () => {
      const system = createMockSystem('Test System 1');

      store.addCameraSystem(system);

      expect(store.getCameraSystems()).toHaveLength(1);
      expect(store.getCameraSystems()[0]).toBe(system);
    });

    it('should add multiple systems in order', () => {
      const system1 = createMockSystem('System 1');
      const system2 = createMockSystem('System 2');
      const system3 = createMockSystem('System 3');

      store.addCameraSystem(system1);
      store.addCameraSystem(system2);
      store.addCameraSystem(system3);

      const systems = store.getCameraSystems();
      expect(systems).toHaveLength(3);
      expect(systems[0].camera.name).toBe('System 1');
      expect(systems[1].camera.name).toBe('System 2');
      expect(systems[2].camera.name).toBe('System 3');
    });

    it('should notify listeners when adding a system', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      store.addCameraSystem(createMockSystem('Test'));

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('getCameraSystem', () => {
    it('should return system at valid index', () => {
      const system = createMockSystem('Test System');
      store.addCameraSystem(system);

      const retrieved = store.getCameraSystem(0);

      expect(retrieved).toBe(system);
    });

    it('should return undefined for invalid index', () => {
      store.addCameraSystem(createMockSystem('Test'));

      expect(store.getCameraSystem(-1)).toBeUndefined();
      expect(store.getCameraSystem(1)).toBeUndefined();
      expect(store.getCameraSystem(999)).toBeUndefined();
    });
  });

  describe('updateCameraSystem', () => {
    it('should update system at valid index', () => {
      const original = createMockSystem('Original');
      const updated = createMockSystem('Updated');
      store.addCameraSystem(original);

      store.updateCameraSystem(0, updated);

      expect(store.getCameraSystem(0)).toBe(updated);
      expect(store.getCameraSystem(0)?.camera.name).toBe('Updated');
    });

    it('should not update at invalid index', () => {
      const system = createMockSystem('Original');
      store.addCameraSystem(system);

      const updated = createMockSystem('Updated');
      store.updateCameraSystem(999, updated);

      // Original should remain unchanged
      expect(store.getCameraSystems()).toHaveLength(1);
      expect(store.getCameraSystem(0)?.camera.name).toBe('Original');
    });

    it('should notify listeners on valid update', () => {
      const listener = vi.fn();
      store.addCameraSystem(createMockSystem('Original'));
      listener.mockClear(); // Clear the add notification

      store.subscribe(listener);
      store.updateCameraSystem(0, createMockSystem('Updated'));

      expect(listener).toHaveBeenCalledOnce();
    });

    it('should not notify listeners on invalid update', () => {
      const listener = vi.fn();
      store.addCameraSystem(createMockSystem('Original'));
      listener.mockClear();

      store.subscribe(listener);
      store.updateCameraSystem(999, createMockSystem('Updated'));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('removeCameraSystem', () => {
    it('should remove system at valid index', () => {
      store.addCameraSystem(createMockSystem('System 1'));
      store.addCameraSystem(createMockSystem('System 2'));
      store.addCameraSystem(createMockSystem('System 3'));

      store.removeCameraSystem(1); // Remove middle one

      const systems = store.getCameraSystems();
      expect(systems).toHaveLength(2);
      expect(systems[0].camera.name).toBe('System 1');
      expect(systems[1].camera.name).toBe('System 3');
    });

    it('should handle removing first element', () => {
      store.addCameraSystem(createMockSystem('System 1'));
      store.addCameraSystem(createMockSystem('System 2'));

      store.removeCameraSystem(0);

      expect(store.getCameraSystems()).toHaveLength(1);
      expect(store.getCameraSystem(0)?.camera.name).toBe('System 2');
    });

    it('should handle removing last element', () => {
      store.addCameraSystem(createMockSystem('System 1'));
      store.addCameraSystem(createMockSystem('System 2'));

      store.removeCameraSystem(1);

      expect(store.getCameraSystems()).toHaveLength(1);
      expect(store.getCameraSystem(0)?.camera.name).toBe('System 1');
    });

    it('should notify listeners when removing', () => {
      const listener = vi.fn();
      store.addCameraSystem(createMockSystem('Test'));
      listener.mockClear();

      store.subscribe(listener);
      store.removeCameraSystem(0);

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should call multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      store.subscribe(listener1);
      store.subscribe(listener2);

      store.addCameraSystem(createMockSystem('Test'));

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it('should unsubscribe listener', () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      store.addCameraSystem(createMockSystem('Test 1'));
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      listener.mockClear();

      store.addCameraSystem(createMockSystem('Test 2'));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('length property', () => {
    it('should return 0 for empty store', () => {
      expect(store.length).toBe(0);
    });

    it('should return correct count', () => {
      store.addCameraSystem(createMockSystem('System 1'));
      expect(store.length).toBe(1);

      store.addCameraSystem(createMockSystem('System 2'));
      expect(store.length).toBe(2);

      store.removeCameraSystem(0);
      expect(store.length).toBe(1);
    });
  });
});
