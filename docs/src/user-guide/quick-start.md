# Quick Start

## Installation

### GUI Application

```bash
# Clone the repository
git clone https://github.com/cramke/camera-optics.git
cd camera-optics

# Install frontend dependencies
pnpm install

# Run in development mode
pnpm tauri:dev

# Build for production
pnpm tauri:build
```

### CLI Tool

The CLI is included with the application:

```bash
cd src-tauri
cargo build --release --bin camera-optics-cli

# The binary will be at:
# target/release/camera-optics-cli
```

## First Calculation

### Using the GUI

1. Launch the app: `pnpm tauri:dev`
2. Enter sensor dimensions (e.g., 36×24mm for full frame)
3. Enter pixel resolution (e.g., 6000×4000)
4. Enter focal length (e.g., 50mm)
5. Enter working distance (e.g., 5000mm = 5 meters)
6. Click "Calculate FOV"

### Using the CLI

Calculate FOV for a full-frame camera with 50mm lens at 5m distance:

```bash
cargo run --bin camera-optics-cli -- fov \
  -w 36 -H 24 \
  -x 6000 -y 4000 \
  -f 50 \
  -d 5000
```

## Next Steps

- Learn about the [GUI interface](./gui.md)
- Explore [CLI commands](./cli.md)
- Understand [optical calculations](../reference/optics-guide.md)
