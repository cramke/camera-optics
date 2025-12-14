# Testing Guide - Camera Optics Calculator

This project uses **Vitest** as its testing framework - a blazing fast unit test framework powered by Vite.

## 📁 Project Structure for Tests

```
camera-optics/
├── src/
│   ├── services/
│   │   ├── store.ts              # Source file
│   │   └── store.test.ts         # ✅ Test file (co-located)
│   ├── core/
│   │   ├── types.ts
│   │   └── types.test.ts         # ✅ Future test
│   ├── ui/
│   │   ├── form.ts
│   │   └── form.test.ts          # ✅ Future test
│   └── main.ts
├── vitest.config.ts              # Vitest configuration
└── package.json
```

### **Test File Naming Convention**
- `*.test.ts` or `*.spec.ts` - Both patterns work
- Place tests **next to the source files** they test (co-location pattern)
- Example: `store.ts` → `store.test.ts`

## 🚀 Installation

First, install the testing dependencies:

```bash
pnpm install
```

This installs:
- `vitest` - The test runner
- `@vitest/ui` - Browser-based UI for tests
- `@vitest/coverage-v8` - Code coverage reporting
- `happy-dom` - Fast DOM simulation for testing

## 🧪 Running Tests

### Run all tests (watch mode)
```bash
pnpm test
```
This runs tests in **watch mode** - tests re-run automatically when files change.

### Run tests once (CI mode)
```bash
pnpm test --run
```

### Run with UI (browser interface)
```bash
pnpm test:ui
```
Opens a browser interface showing test results, coverage, and more.

### Run specific test file
```bash
pnpm test store.test.ts
```

### Run tests with coverage
```bash
pnpm test:coverage
```
Generates coverage report in `coverage/` directory.

## 📊 Understanding Test Output

### Successful Test Run
```
✓ src/services/store.test.ts (22 tests) 150ms
  ✓ Store (22 tests) 148ms
    ✓ addCameraSystem (3 tests) 12ms
      ✓ should add a camera system to the store
      ✓ should add multiple systems in order
      ✓ should notify listeners when adding a system
    ✓ getCameraSystem (2 tests) 5ms
    ...

Test Files  1 passed (1)
     Tests  22 passed (22)
  Start at  10:30:00
  Duration  1.2s
```

### Failed Test
```
❌ FAIL  src/services/store.test.ts
  ✓ should add a camera system to the store
  ❌ should notify listeners when adding a system
    Expected: 1
    Received: 0
    
    at store.test.ts:108:25
```

## 📝 Writing Your First Test

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest'

describe('MyFunction', () => {
  it('should do something', () => {
    const result = myFunction(input)
    expect(result).toBe(expected)
  })
})
```

### Test Lifecycle Hooks

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Store', () => {
  beforeEach(() => {
    // Run before each test
    store = new Store()
  })

  afterEach(() => {
    // Run after each test
    cleanup()
  })

  it('test 1', () => { /* ... */ })
  it('test 2', () => { /* ... */ })
})
```

### Common Assertions

```typescript
// Equality
expect(value).toBe(10)                    // Exact equality (===)
expect(object).toEqual({ name: 'test' })  // Deep equality

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()

// Numbers
expect(value).toBeGreaterThan(5)
expect(value).toBeLessThanOrEqual(10)

// Arrays/Strings
expect(array).toHaveLength(3)
expect(array).toContain('item')
expect(string).toMatch(/pattern/)

// Functions
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledWith(arg1, arg2)
expect(fn).toHaveBeenCalledTimes(3)
```

### Mocking Functions

```typescript
import { vi } from 'vitest'

// Create mock function
const mockFn = vi.fn()

// Use it
mockFn('arg1')
mockFn('arg2')

// Assert calls
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('arg1')

// Mock return value
mockFn.mockReturnValue(42)
expect(mockFn()).toBe(42)
```

## 🎯 What to Test

### ✅ DO Test:
1. **Pure functions** - Easy to test, no side effects
   ```typescript
   // Example: hasFormChanges() in main.ts
   ```

2. **Business logic** - Core calculation functions
   ```typescript
   // Example: Store CRUD operations
   ```

3. **Edge cases** - Invalid inputs, boundary conditions
   ```typescript
   it('should handle negative index', () => {
     expect(store.getCameraSystem(-1)).toBeUndefined()
   })
   ```

4. **Error handling** - What happens when things go wrong
   ```typescript
   it('should not update at invalid index', () => {
     store.updateCameraSystem(999, system)
     expect(store.length).toBe(1) // No change
   })
   ```

### ❌ DON'T Test:
1. **Third-party libraries** - They have their own tests
2. **Simple getters/setters** - Unless they have logic
3. **UI rendering details** - Better suited for E2E tests
4. **Tauri backend calls** - Mock these in unit tests

## 🏗️ Example: Current Test Coverage

### `store.test.ts` - 22 tests
Tests the Store service:
- ✅ Adding systems
- ✅ Updating systems  
- ✅ Removing systems
- ✅ Getting systems by index
- ✅ Listener subscriptions
- ✅ Edge cases (invalid indices)

### Next Tests to Write:

1. **`form.test.ts`** - Test form validation
   ```typescript
   describe('getCameraFromForm', () => {
     it('should throw error for invalid sensor width')
     it('should parse valid inputs correctly')
   })
   ```

2. **`hasFormChanges.test.ts`** - Test change detection
   ```typescript
   it('should detect camera name change')
   it('should detect distance change')
   it('should return false when no changes')
   ```

3. **`isValidIndex.test.ts`** - Test index validation
   ```typescript
   it('should return false for null')
   it('should return false for out of bounds')
   ```

## 🔧 Configuration

### `vitest.config.ts`
```typescript
export default defineConfig({
  test: {
    environment: 'happy-dom',     // DOM simulation
    globals: true,                 // No need to import test functions
    include: ['src/**/*.test.ts'], // Test file pattern
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/main.ts'],
    },
  },
})
```

## 🐛 Debugging Tests

### VS Code
1. Set breakpoint in test file
2. Run "JavaScript Debug Terminal"
3. Run `pnpm test` in that terminal
4. Debugger will pause at breakpoints

### Console Output
```typescript
it('test with debug', () => {
  console.log('Debug value:', value)
  expect(value).toBe(expected)
})
```

### Only Run One Test
```typescript
it.only('focused test', () => {
  // Only this test runs
})

describe.skip('skipped tests', () => {
  // All tests in this suite are skipped
})
```

## 📈 Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
   ```typescript
   it('should add system', () => {
     // Arrange
     const system = createMockSystem('Test')
     
     // Act
     store.addCameraSystem(system)
     
     // Assert
     expect(store.length).toBe(1)
   })
   ```

2. **One assertion per test** (when possible)
   - Makes failures easier to diagnose

3. **Descriptive test names**
   - ❌ `it('works')`
   - ✅ `it('should add camera system to the store')`

4. **Test behavior, not implementation**
   - Focus on what the function does, not how

5. **Keep tests isolated**
   - Each test should work independently
   - Use `beforeEach` to reset state

## 🚦 CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: pnpm test --run

- name: Generate coverage
  run: pnpm test:coverage
```

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Jest/Vitest Matchers](https://vitest.dev/api/expect.html)

## 🎓 Next Steps

1. **Run the existing test**: `pnpm test`
2. **Write tests for `form.ts`**: Test validation logic
3. **Write tests for `main.ts` functions**: Test hasFormChanges, isValidIndex
4. **Add E2E tests**: Use Playwright for full application testing
5. **Set coverage goals**: Aim for 70%+ coverage

---

**Remember**: Tests are documentation that never goes out of date. Write tests that explain how your code should behave!
