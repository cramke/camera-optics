# Testing

## Running Tests

### Frontend Tests (Vitest)

```bash
# Run all tests
pnpm test

# Run with UI
pnpm test:ui

# Generate coverage
pnpm test:coverage
```

### Rust Tests

```bash
cd src-tauri
cargo test
```

### Rust Tests with Coverage

```bash
cd src-tauri
cargo install cargo-llvm-cov
cargo llvm-cov test
```

## Test Structure

### Frontend

Tests are located in `src/**/*.test.ts`:

- `src/services/store.test.ts` - Store CRUD operations (22 tests)

Example test:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from './store';

describe('Store', () => {
  it('should add new system', () => {
    const store = new Store();
    const system = { /* ... */ };
    const id = store.add(system);
    expect(store.get(id)).toBeDefined();
  });
});
```

### Rust

Tests are embedded in source files with `#[cfg(test)]`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_fov() {
        let camera = CameraSystem { /* ... */ };
        let result = calculate_fov(&camera, 5000.0);
        assert!(result.fov_horizontal_deg > 0.0);
    }
}
```

## CI Tests

Tests run automatically in GitHub Actions:

- **Format Check**: `cargo fmt --check`, `prettier --check`
- **Lint**: `cargo clippy`, (TypeScript via `tsc`)
- **Build**: `cargo build --release`, `pnpm build`
- **Test**: `cargo test`, `pnpm test`
- **Coverage**: Combined Rust + TypeScript via Codecov

## Writing Tests

### Frontend Test Guidelines

1. **Unit tests** for utilities and services
2. **Integration tests** for Tauri commands (mock backend)
3. Use `happy-dom` for DOM testing
4. Mock Tauri APIs with `vi.mock()`

### Rust Test Guidelines

1. **Unit tests** in same file as implementation
2. **Integration tests** in `tests/` directory
3. Test edge cases (zero, negative, infinity)
4. Use `assert_eq!` for exact matches
5. Use `assert!` with tolerance for floats

## Coverage Goals

- **Minimum**: 70% overall
- **Target**: 85%+ for critical paths
- **Excluded**: UI interaction code, error handling

View coverage:
- Frontend: `coverage/index.html`
- Rust: Terminal output from `cargo llvm-cov`
- Combined: Codecov dashboard
