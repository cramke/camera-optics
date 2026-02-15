# Camera Optics Calculator

[![Documentation](https://img.shields.io/badge/docs-mdBook-blue)](https://cramke.github.io/camera-optics/) [![Coverage Frontend](https://cramke.github.io/camera-optics/coverage-frontend.svg)](https://cramke.github.io/camera-optics/) [![Coverage Rust](https://cramke.github.io/camera-optics/coverage-rust.svg)](https://cramke.github.io/camera-optics/)

A dual-interface application for calculating and visualizing camera system performance (lens + sensor). Calculate field of view (FOV), spatial resolution (pixels per mm), and depth of field for various camera configurations.

Built with Tauri + Vanilla TypeScript frontend.


## Features

- **Field of View Calculations**: Horizontal and vertical FOV (angular and linear)
- **Spatial Resolution**: Pixels per millimeter (PPM) and ground sample distance (GSD)
- **Depth of Field**: Calculate near/far limits and total DOF
- **Hyperfocal Distance**: Find optimal focus distance
- **System Comparison**: Compare multiple camera configurations with visualization overlay
- **Dual Interface**: Use via GUI or command-line interface

## Quick Start

### GUI Application

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

### CLI Tool

```bash
# Build the CLI tool
cd src-tauri
cargo build --bin camera-optics-cli

# Or run directly with cargo
cargo run --bin camera-optics-cli -- --help
```

## CLI Usage Examples

### Calculate FOV for a camera system

```bash
cargo run --bin camera-optics-cli -- fov \
  -w 36 -H 24 \        # Sensor: 36×24mm (full frame)
  -x 6000 -y 4000 \    # Resolution: 6000×4000 pixels
  -f 50 \              # Focal length: 50mm
  -d 5000 \            # Working distance: 5000mm (5m)
  -n "Full Frame"      # Optional name
```

### Compare sensor formats

```bash
cargo run --bin camera-optics-cli -- compare -d 5000 --presets
```

### Calculate hyperfocal distance

```bash
cargo run --bin camera-optics-cli -- hyperfocal -f 50 -a 8
```

### Calculate depth of field

```bash
cargo run --bin camera-optics-cli -- dof -d 3000 -f 50 -a 2.8
```

## Project Structure

```
tauri-app/
├── src/                        # Frontend (TypeScript/HTML/CSS)
│   ├── main.ts                 # GUI logic and Tauri command calls
│   ├── styles.css              # Application styling
│   └── assets/                 # Static assets
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── lib.rs              # Tauri GUI library
│   │   ├── main.rs             # GUI binary entry point
│   │   ├── cli_commands.rs     # CLI binary entry point
│   │   ├── gui_commands.rs     # GUI command entry point
│   │   └── optics/             # Shared optical calculation library
│   │       ├── types.rs        # Data structures (CameraSystem, FovResult)
│   │       └── calculations.rs # Optical formulas (FOV, DOF, hyperfocal)
│   └── Cargo.toml              # Rust dependencies
└── OPTICS_GUIDE.md             # Detailed usage guide and formulas
```

## Architecture

The optical calculations are implemented as a **shared Rust library** (`src-tauri/src/optics/`) that both the GUI and CLI use:

- **GUI**: Tauri commands expose calculations to TypeScript frontend
- **CLI**: Direct function calls via clap command-line parser
- **Calculations**: Pure Rust functions for all optical formulas
