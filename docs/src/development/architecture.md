# Frontend Architecture

**Pattern:** Layered Architecture with strict separation of concerns

```
src/
├── core/        # Domain layer (types, constants)
├── services/    # Service layer (API, state)
├── ui/          # Presentation layer (components)
└── main.ts      # Entry point & orchestration
```

## Structure

### 📦 `core/` - Domain Layer (117 lines)

Pure domain logic with zero dependencies.

**Files:**

- `types.ts` (37) - CameraSystem, FovResult, CameraWithResult, ReferenceObject
- `constants.ts` (74) - Reference objects, camera presets, system colors
- `index.ts` (6) - Module exports

**Rule:** No imports from other layers

---

### 🔌 `services/` - Service Layer (110 lines)

Backend communication and state management.

**Files:**

- `api.ts` (32) - Tauri IPC wrapper (calculateCameraFov, calculateFocalLengthFromFov)
- `store.ts` (72) - Observable state store for camera systems
- `index.ts` (6) - Module exports

**Dependencies:** `core/` only

---

### 🎨 `ui/` - Presentation Layer (406 lines)

DOM manipulation, rendering, and user interactions.

**Files:**

- `form.ts` (118) - Form I/O, presets, validation
- `results.ts` (46) - Results page rendering
- `visualization.ts` (235) - Canvas FOV visualization
- `index.ts` (7) - Module exports

**Dependencies:** `core/` + `services/`

---

### 🚀 `main.ts` - Entry Point (170 lines)

Application bootstrap, event handlers, workflow orchestration.

**Dependencies:** All layers

## Dependency Flow

```
main.ts
  ↓
┌─────────┬───────────┬────────┐
│  core/  │ services/ │   ui/  │
│ (types) │ (api,     │ (form, │
│         │  store)   │  viz)  │
└─────────┴───────────┴────────┘
```

**Rules:**

- ✅ `core/` → No dependencies
- ✅ `services/` → `core/` only
- ✅ `ui/` → `core/` + `services/`
- ✅ `main.ts` → All layers
- ❌ No circular dependencies

## Import Examples

**✅ Correct:**

```typescript
// main.ts
import { calculateCameraFov } from './services';
import { drawVisualization } from './ui';

// ui/form.ts
import type { CameraSystem } from '../core/types';
import { store } from '../services/store';

// services/api.ts
import type { FovResult } from '../core/types';
```

**❌ Wrong:**

```typescript
// core/types.ts
import { store } from '../services/store'; // ❌ Core can't depend on services

// services/api.ts
import { displayResult } from '../ui/results'; // ❌ Service can't depend on UI
```

## Adding Features

**New UI Component:**

1. Create in `ui/`
2. Import from `core/` and `services/`
3. Export from `ui/index.ts`

**New Service:**

1. Create in `services/`
2. Import from `core/` only
3. Export from `services/index.ts`

**New Type:**

- Add to `core/types.ts` (available everywhere)
