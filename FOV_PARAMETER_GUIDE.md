# FOV Parameter Feature

## Overview
The DORI Designer now supports **Horizontal Field of View (FOV)** as an input parameter constraint. This allows you to specify a desired FOV angle and see what camera configurations can achieve it while meeting your DORI distance requirements.

## How It Works

### FOV Relationship
FOV is mathematically related to focal length and sensor width through this formula:

```
FOV = 2 × arctan(sensor_width / (2 × focal_length))
```

When you specify a FOV value, it constrains the ratio between focal length and sensor width.

### Usage in DORI Designer

1. **Enter your DORI target distances** (Detection, Observation, Recognition, or Identification)
2. **Specify FOV constraint** (optional):
   - Enter a value in degrees (e.g., 60° for a moderate wide angle, 90° for very wide)
   - The system will calculate valid focal length and sensor width ranges that maintain this FOV
3. **Combine with other constraints**:
   - FOV + Pixel Width: Calculates focal and sensor ranges maintaining both constraints
   - FOV + Focal Length: Determines the exact sensor width needed
   - FOV + Sensor Width: Determines the exact focal length needed
4. **View calculated ranges** for unconstrained parameters

### Examples

#### Example 1: Wide-angle surveillance
- **Target**: Identification at 10m
- **Constraint**: 90° horizontal FOV
- **Result**: Shows focal length range (2.6mm - 43.3mm) and matching sensor width range (3mm - 50mm)

#### Example 2: Narrow-angle monitoring
- **Target**: Recognition at 50m  
- **Constraints**: 30° FOV + 1920 pixel width
- **Result**: Calculates specific focal and sensor ranges that satisfy both the FOV and DORI requirements

#### Example 3: No FOV constraint
- **Target**: Observation at 25m
- **No FOV constraint**
- **Result**: Shows FOV range possible (e.g., 7° to 74°) based on other parameter ranges

## Implementation Details

### Backend (Rust)
- **Type**: `horizontal_fov_deg: Option<f64>` in `ParameterConstraint` and `DoriParameterRanges`
- **Calculation**: `calculate_dori_parameter_ranges()` handles FOV constraints
- **Formula**: `sensor = 2 × focal × tan(FOV/2)` used to maintain relationship
- **Bounds**: Focal length constrained so sensor stays within physical limits (3mm - 50mm)

### Frontend (TypeScript/HTML)
- **Input field**: "Horizontal FOV (°)" in DORI Designer tab
- **Clear button**: Click × to make FOV a floating parameter
- **Range display**: Shows FOV range when not constrained
- **Auto-update**: Recalculates when FOV or other parameters change

### Tests
Three comprehensive tests verify FOV constraint behavior:
1. `test_dori_ranges_with_fov_constraint` - FOV only
2. `test_dori_ranges_fov_and_pixel_constraint` - FOV + pixels
3. `test_dori_ranges_no_fov_constraint` - FOV as output range

All tests verify that the FOV relationship is maintained across the calculated ranges.

## Benefits
- **More intuitive**: Specify desired viewing angle directly
- **Better design**: Choose FOV based on scene coverage needs
- **Reduces trial-and-error**: System calculates compatible camera specs automatically
- **Real-world workflow**: Many users think in terms of FOV rather than focal length

## Future Enhancements
- FOV visualization showing coverage area
- Common FOV presets (wide, normal, telephoto)
- Diagonal FOV calculation
- Vertical FOV display
