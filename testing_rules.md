# QUploader Testing Rules & Guidelines

This document outlines the testing rules, standards, and guidelines for the QUploader library to maintain high code quality, prevent regressions, and align with modern TypeScript/Vite development practices.

---

## 1. Testing Stack & Environment

- **Testing Framework**: [Vitest](https://vitest.dev/) is used as the primary runner. It offers Native ES Modules (ESM) support, fast compilation, and seamless integration with Vite configurations.
- **DOM Simulation**: The `happy-dom` environment is used for all tests requiring browser DOM interfaces (preferred over `jsdom` for its lightweight footprint and fast startup times).
- **Declaration**: Declare the environment at the top of every test file that touches DOM or jQuery operations:
  ```typescript
  // @vitest-environment happy-dom
  ```

---

## 2. Test File Structure & Naming Conventions

- **Naming**: Test files must be placed alongside the implementation files or in a `tests/` directory and use the `.test.ts` or `.spec.ts` extension.
  - Source: `src/quploader.ts` $\rightarrow$ Test: `src/quploader.test.ts`
- **Grouping**: Organize tests using `describe` blocks representing logical units (e.g. option parsing, DOM building, validation rules, jQuery integration).
- **Granularity**: Keep each `it` block focused on a single assertion or a single user workflow.

---

## 3. Best Practices for Hybrid JQuery/Vanilla Testing

- **Global Exposure**: When testing legacy or hybrid wrappers that hook into global structures, register dependencies on the global `window` object in a `beforeAll` block before dynamically importing the module:
  ```typescript
  import $ from 'jquery';
  
  beforeAll(async () => {
    (window as any).$ = (window as any).jQuery = $;
    await import('./quploader'); // Dynamic import ensures window.$ is defined first
  });
  ```
- **Chaining vs Returns**: When testing the jQuery plugin wrapper:
  - Methods that modify state (e.g., `uploadAll`, `clearQueue`) must return the jQuery collection (`this`) to support method chaining.
  - Getter methods (e.g., `getFiles`, `currentFile`) must return the raw data values instead of the jQuery collection.

---

## 4. Test Case Scope & Coverage

Ensure the test suite covers the following areas:

### A. Options Parsing & Helper Logic
- Verify parsing of sizes with string suffixes (e.g., `'5MB'` $\rightarrow$ `5242880` bytes, `'200kb'` $\rightarrow$ `204800` bytes).
- Verify parsing of fallback defaults.
- Verify accept-string parsing into arrays (e.g., `'image/*, .pdf'` $\rightarrow$ `['image/*', '.pdf']`).

### B. DOM Initialization & Theme Toggling
- Verify container elements are wrapped correctly when instantiated on file inputs.
- Verify custom classes (`containerClass`) are correctly appended.
- Verify dark mode classes (`quploader-dark`) are added/removed when toggled.

### C. Validation & Error Handling
- Test file size boundaries (valid file size, oversized file size triggers the `onError` callback and is rejected).
- Test file type checks (supported types accepted, unsupported types rejected).

### D. Mocking Asynchronous Operations (Advanced)
- Use Vitest mocks (`vi.spyOn`, `vi.fn`) for browser capabilities that do not exist or are unsupported in simulated environments (e.g. `navigator.mediaDevices.getUserMedia` or network XHR requests).

---

## 5. Execution

Run the tests locally before making a commit or starting a deployment:
```bash
npm run test
```
This script executes Vitest in single-run mode (`vitest run`).
