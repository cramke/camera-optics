# GUI Application

The graphical interface provides an intuitive way to calculate and compare camera systems.

## Main Interface

The GUI is divided into several sections:

### Camera System Input

Enter your camera and lens specifications:

- **Sensor Width/Height** (mm): Physical sensor dimensions
- **Pixel Width/Height**: Sensor resolution in pixels
- **Focal Length** (mm): Lens focal length
- **Working Distance** (mm): Distance to subject
- **System Name**: Optional identifier for comparison

### Calculation Buttons

- **Calculate FOV**: Compute field of view for current system
- **Auto-Calculate**: Automatically recalculates when you change focal length (with 300ms debounce)

### Results Display

After calculation, you'll see:

- **Field of View**: Horizontal and vertical (angular and linear)
- **Spatial Resolution**: Pixels per mm (PPM) and ground sample distance (GSD)
- **Coverage Area**: Total area covered by the sensor

### System Comparison

- **Add System**: Saves current configuration for comparison
- **Compare Mode**: Overlays multiple systems on visualization
- **Edit System**: Modify saved configurations
- **Delete System**: Remove from comparison

### Visualization

Real-time canvas visualization shows:
- FOV rectangle with dimensions
- Sensor aspect ratio
- Multiple systems overlaid for comparison
- Color-coded systems

## Tips

- Use **Auto-Calculate** for quick focal length exploration
- **Save systems** before changing values to compare configurations
- **Hover over visualizations** to see system details
- Values are validated with realistic min/max constraints
