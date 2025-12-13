/**
 * Tauri API wrapper - Backend communication layer
 */

import { invoke } from "@tauri-apps/api/core";
import type { CameraSystem, FovResult } from "../core/types";

/**
 * Calculate FOV for a camera system at a given distance
 */
export async function calculateCameraFov(
  camera: CameraSystem,
  distanceMm: number
): Promise<FovResult> {
  return await invoke<FovResult>("calculate_camera_fov", {
    camera,
    distanceMm,
  });
}

/**
 * Calculate focal length from FOV in degrees
 */
export async function calculateFocalLengthFromFov(
  sensorSizeMm: number,
  fovDeg: number
): Promise<number> {
  return await invoke<number>("calculate_focal_length_from_fov_command", {
    sensorSizeMm,
    fovDeg,
  });
}

/**
 * Calculate parameter ranges for given DORI requirements
 */
export async function calculateDoriRanges(
  targets: import("../core/types").DoriTargets,
  constraints: import("../core/types").ParameterConstraint
): Promise<import("../core/types").DoriParameterRanges> {
  return await invoke("calculate_dori_ranges", {
    targets,
    constraints,
  });
}

/**
 * Calculate all DORI distances from a single distance input
 */
export async function calculateDoriFromSingleDistance(
  distanceM: number,
  doriType: "detection" | "observation" | "recognition" | "identification"
): Promise<import("../core/types").DoriDistances> {
  return await invoke("calculate_dori_from_single_distance", {
    distanceM,
    doriType,
  });
}
