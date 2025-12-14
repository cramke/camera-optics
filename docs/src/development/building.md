# Building

## Prerequisites

- **Rust** 1.70+ - [Install rustup](https://rustup.rs/)
- **Node.js** 20+ - [Install Node](https://nodejs.org/)
- **pnpm** 9+ - `npm install -g pnpm`

### System Dependencies (Linux)

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf
```

## Development Build

```bash
# Install frontend dependencies
pnpm install

# Run in development mode (hot reload)
pnpm tauri:dev
```

This starts:
- Vite dev server on http://localhost:1420
- Tauri window with the app
- Hot reload for frontend changes
- Rust recompilation on backend changes

## Production Build

```bash
# Build optimized release
pnpm tauri:build
```

Output locations:
- **Linux**: `src-tauri/target/release/bundle/deb/`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **macOS**: `src-tauri/target/release/bundle/dmg/`

## CLI Only

```bash
cd src-tauri
cargo build --release --bin camera-optics-cli
# Binary: target/release/camera-optics-cli
```

## Debug vs Release

**Debug build** (faster compile, slower runtime):
```bash
cargo build
```

**Release build** (slower compile, optimized):
```bash
cargo build --release
```

## Build Flags

### Disable warnings-as-errors

```bash
cargo build  # No RUSTFLAGS set
```

### Enable all warnings

```bash
RUSTFLAGS="-D warnings" cargo build
```

## Troubleshooting

### WebKit errors on Linux

Install missing system dependencies:
```bash
sudo apt-get install libwebkit2gtk-4.1-dev
```

### pnpm not found

```bash
npm install -g pnpm
```

### Tauri build fails

Clear cache and rebuild:
```bash
rm -rf node_modules target
pnpm install
pnpm tauri build
```
