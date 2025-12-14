# API Reference

## Tauri Commands

The frontend communicates with the Rust backend through Tauri commands.

### calculate_fov

Calculate field of view for a camera system.

**TypeScript:**
```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('calculate_fov', {
  camera: {
    name: 'My Camera',
    sensor_width_mm: 36,
    sensor_height_mm: 24,
    pixel_width: 6000,
    pixel_height: 4000,
    focal_length_mm: 50,
  },
  distance_mm: 5000,
});
```

**Response:**
```typescript
{
  camera: CameraSystem;
  fov_horizontal_deg: number;
  fov_vertical_deg: number;
  fov_width_mm: number;
  fov_height_mm: number;
  ppm_horizontal: number;
  ppm_vertical: number;
  gsd_mm: number;
}
```

### calculate_hyperfocal

Calculate hyperfocal distance.

**TypeScript:**
```typescript
const result = await invoke('calculate_hyperfocal', {
  focalLengthMm: 50,
  aperture: 8,
});
```

**Response:**
```typescript
{
  hyperfocal_distance_mm: number;
}
```

### calculate_dof

Calculate depth of field.

**TypeScript:**
```typescript
const result = await invoke('calculate_dof', {
  distanceMm: 3000,
  focalLengthMm: 50,
  aperture: 2.8,
});
```

**Response:**
```typescript
{
  near_limit_mm: number;
  far_limit_mm: number;
  total_dof_mm: number;
}
```

## Data Types

### CameraSystem

```typescript
interface CameraSystem {
  name: string;
  sensor_width_mm: number;
  sensor_height_mm: number;
  pixel_width: number;
  pixel_height: number;
  focal_length_mm: number;
}
```

### FovResult

```typescript
interface FovResult {
  camera: CameraSystem;
  fov_horizontal_deg: number;
  fov_vertical_deg: number;
  fov_width_mm: number;
  fov_height_mm: number;
  ppm_horizontal: number;
  ppm_vertical: number;
  gsd_mm: number;
}
```

### DofResult

```typescript
interface DofResult {
  near_limit_mm: number;
  far_limit_mm: number;
  total_dof_mm: number;
}
```

### HyperfocalResult

```typescript
interface HyperfocalResult {
  hyperfocal_distance_mm: number;
}
```

## Validation Constraints

All inputs are validated with these constraints:

```typescript
const VALIDATION_CONSTRAINTS = {
  sensorWidth: { min: 0.1, max: 200 },      // mm
  sensorHeight: { min: 0.1, max: 200 },     // mm
  pixelWidth: { min: 10, max: 100000 },     // pixels
  pixelHeight: { min: 10, max: 100000 },    // pixels
  focalLength: { min: 0.1, max: 10000 },    // mm
  fov: { min: 0.1, max: 180 },              // degrees
  distance: { min: 0.01, max: 100000 },     // mm
};
```
