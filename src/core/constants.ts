/**
 * Application constants and configuration
 */

import type { CameraSystem, ReferenceObject } from "./types";

// Reference objects (size in meters)
export const REFERENCE_OBJECTS: ReferenceObject[] = [
  {
    id: "human",
    name: "Human",
    width: 0.5,
    height: 1.75,
    color: "#ff6b6b",
    label: "👤",
    description: "1.75m tall",
  },
  {
    id: "tanker",
    name: "Oil Tanker",
    width: 330,
    height: 58,
    color: "#4a5568",
    label: "🚢",
    description: "330m long",
  },
  {
    id: "drone",
    name: "DJI Drone",
    width: 0.25,
    height: 0.25,
    color: "#48bb78",
    label: "🛸",
    description: "0.25m",
    iconPath: "/src/assets/air-drone-icon.svg",
  },
];

// Preset camera configurations
export const CAMERA_PRESETS: Record<string, Partial<CameraSystem>> = {
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

// Visualization colors for camera systems
export const SYSTEM_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];
