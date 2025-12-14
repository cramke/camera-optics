# Camera Optics Calculator - Usage Guide

## Project Structure

```
src-tauri/
├── src/
│   ├── lib.rs              # Tauri GUI library (shared optics module)
│   ├── main.rs             # GUI binary entry point
│   ├── cli.rs              # CLI binary entry point
│   └── optics/             # Shared optical calculation library
│       ├── mod.rs          # Module exports
│       ├── types.rs        # Data structures (CameraSystem, FovResult)
│       ├── calculations.rs # Pure calculation functions (FOV, DOF, etc.)
│       └── commands.rs     # Tauri command wrappers
```

## Building

### Build both GUI and CLI:
```bash
cd src-tauri
cargo build --bins
```

### Build release versions:
```bash
cargo build --bins --release
```

The binaries will be in:
- GUI: `target/debug/tauri-app` (or `target/release/tauri-app`)
- CLI: `target/debug/camera-optics-cli` (or `target/release/camera-optics-cli`)

## CLI Usage

### Calculate Field of View

Calculate FOV and spatial resolution for a camera system:

```bash
camera-optics-cli fov \
  -w 36 \              # Sensor width (mm)
  -H 24 \              # Sensor height (mm)
  -x 6000 \            # Horizontal pixels
  -y 4000 \            # Vertical pixels
  -f 50 \              # Focal length (mm)
  -d 5000 \            # Working distance (mm)
  -n "My Camera"       # Optional name
```

**Example output:**
```
Full Frame 50mm: 36x24 mm sensor, 6000x4000 px (6.00x6.00 µm), 50 mm lens

FOV: 39.60° × 26.99° (3600.00 × 2400.00 mm @ 5000 mm)
Resolution: 1.667 ppm, GSD: 0.600 mm/px
```

### Compare Multiple Systems

Compare common sensor formats:

```bash
camera-optics-cli compare -d 5000 --presets
```

Compares Full Frame, APS-C, and Micro 4/3 sensors at 5000mm distance.

### Calculate Hyperfocal Distance

```bash
camera-optics-cli hyperfocal -f 50 -a 8 -c 0.03
```

Arguments:
- `-f`: Focal length (mm)
- `-a`: F-number (aperture)
- `-c`: Circle of confusion (mm) - optional, defaults to 0.03

### Calculate Depth of Field

```bash
camera-optics-cli dof -d 3000 -f 50 -a 2.8
```

Arguments:
- `-d`: Object distance (mm)
- `-f`: Focal length (mm)
- `-a`: F-number (aperture)
- `-c`: Circle of confusion (mm) - optional, defaults to 0.03

## GUI Usage (Tauri App)

### Run in development mode:
```bash
pnpm tauri dev
```

### Build for production:
```bash
pnpm tauri build
```

### Available Tauri Commands (from TypeScript):

```typescript
import { invoke } from "@tauri-apps/api/core";

// Calculate single camera FOV
const result = await invoke('calculate_camera_fov', {
  camera: {
    sensor_width_mm: 36,
    sensor_height_mm: 24,
    pixel_width: 6000,
    pixel_height: 4000,
    focal_length_mm: 50,
    name: "Full Frame"
  },
  distanceMm: 5000
});

// Compare multiple cameras
const results = await invoke('compare_camera_systems', {
  cameras: [camera1, camera2, camera3],
  distanceMm: 5000
});

// Calculate hyperfocal distance
const hyperfocal = await invoke('calculate_hyperfocal_distance', {
  focalLengthMm: 50,
  fNumber: 8,
  cocMm: 0.03
});

// Calculate depth of field
const dof = await invoke('calculate_depth_of_field', {
  objectDistanceMm: 3000,
  focalLengthMm: 50,
  fNumber: 2.8,
  cocMm: 0.03
});
```

## Common Sensor Sizes (Reference)

| Format      | Width × Height (mm) | Common Pixel Counts      |
|-------------|---------------------|--------------------------|
| Full Frame  | 36 × 24             | 6000×4000, 8000×5333     |
| APS-C       | 23.5 × 15.6         | 6000×4000, 5184×3456     |
| Micro 4/3   | 17.3 × 13.0         | 5184×3888, 4608×3456     |
| 1"          | 13.2 × 8.8          | 5472×3648                |
| 1/1.8"      | 7.2 × 5.3           | 4000×3000                |

## Optical Formulas Used

### Field of View (Angular)
```
FOV = 2 × arctan(sensor_size / (2 × focal_length))
```

### Field of View (Linear at distance)
```
FOV_linear = 2 × distance × tan(FOV_angular / 2)
```

### Spatial Resolution
```
PPM (pixels per mm) = pixel_count / FOV_linear
GSD (ground sample distance) = FOV_linear / pixel_count
```

### Hyperfocal Distance
```
H = (f² / (N × c)) + f
```
Where: f = focal length, N = f-number, c = circle of confusion

### Depth of Field
```
Near limit: Dn = (H × s) / (H + (s - f))
Far limit:  Df = (H × s) / (H - (s - f))
```
Where: H = hyperfocal distance, s = subject distance, f = focal length

## Next Steps

### For the GUI:
1. Design the HTML interface with input forms
2. Create Canvas/SVG visualization for FOV overlay
3. Add TypeScript to connect UI to Rust commands
4. Implement interactive comparison with multiple cameras

### For the CLI:
1. Add more presets (industrial cameras, smartphones, etc.)
2. Export results to JSON/CSV
3. Batch processing from configuration files
4. Add lens distortion calculations

## Development Tips

- All optical math goes in `optics/calculations.rs`
- Keep functions pure (no side effects)
- Add unit tests for formulas
- Tauri commands are just thin wrappers in `optics/commands.rs`
- CLI uses the same calculation functions, ensuring consistency
