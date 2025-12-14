# CLI Tool

The command-line interface provides scriptable access to all calculations.

## Installation

```bash
cd src-tauri
cargo build --release --bin camera-optics-cli
```

The binary will be at `target/release/camera-optics-cli`.

## Commands

### FOV Calculation

```bash
camera-optics-cli fov \
  --sensor-width 36 \
  --sensor-height 24 \
  --pixel-width 6000 \
  --pixel-height 4000 \
  --focal-length 50 \
  --distance 5000 \
  --name "Full Frame 50mm"
```

**Short flags:**
```bash
camera-optics-cli fov -w 36 -H 24 -x 6000 -y 4000 -f 50 -d 5000
```

### Hyperfocal Distance

Find the focus distance where everything from half that distance to infinity is acceptably sharp:

```bash
camera-optics-cli hyperfocal \
  --focal-length 50 \
  --aperture 8
```

### Depth of Field

Calculate near limit, far limit, and total DOF:

```bash
camera-optics-cli dof \
  --distance 3000 \
  --focal-length 50 \
  --aperture 2.8
```

### System Comparison

Compare common sensor formats:

```bash
camera-optics-cli compare --distance 5000 --presets
```

Compare custom systems:

```bash
camera-optics-cli compare \
  --distance 5000 \
  --systems "36,24,6000,4000,50,Full Frame" \
           "23.5,15.6,6000,4000,35,APS-C"
```

## Output Format

All commands output JSON by default for easy parsing:

```json
{
  "camera": {
    "name": "Full Frame 50mm",
    "sensor_width_mm": 36.0,
    "sensor_height_mm": 24.0,
    "pixel_width": 6000,
    "pixel_height": 4000,
    "focal_length_mm": 50.0
  },
  "fov_horizontal_deg": 39.6,
  "fov_vertical_deg": 27.0,
  "fov_width_mm": 3600.0,
  "fov_height_mm": 2400.0,
  "ppm_horizontal": 1.67,
  "ppm_vertical": 1.67,
  "gsd_mm": 0.6
}
```

## Scripting Examples

### Batch calculations

```bash
#!/bin/bash
for focal in 24 35 50 85; do
  camera-optics-cli fov -w 36 -H 24 -x 6000 -y 4000 -f $focal -d 5000 \
    > results_${focal}mm.json
done
```

### Parse with jq

```bash
camera-optics-cli fov -w 36 -H 24 -x 6000 -y 4000 -f 50 -d 5000 | \
  jq '.fov_width_mm'
```
