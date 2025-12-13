/**
 * Camera system and calculation types
 */

export interface CameraSystem {
  sensor_width_mm: number;
  sensor_height_mm: number;
  pixel_width: number;
  pixel_height: number;
  focal_length_mm: number;
  name?: string;
}

export interface FovResult {
  horizontal_fov_deg: number;
  vertical_fov_deg: number;
  horizontal_fov_m: number;
  vertical_fov_m: number;
  ppm: number;
  gsd_mm: number;
  distance_m: number;
  dori?: DoriDistances;
}

export interface DoriDistances {
  detection_m: number;
  observation_m: number;
  recognition_m: number;
  identification_m: number;
}

export interface CameraWithResult {
  camera: CameraSystem;
  result: FovResult;
}

export interface ReferenceObject {
  id: string;
  name: string;
  width: number;
  height: number;
  color: string;
  label: string;
  description: string;
  iconPath?: string; // Optional path to custom SVG/image icon
}
