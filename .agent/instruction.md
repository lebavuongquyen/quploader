# QUploader Project Specification & TypeScript Initialization Guide

## 🎯 Objective

Build a JavaScript library named **QUploader** (Q stands for the creator's initial), functioning as an object-oriented jQuery plugin. The project must be written in **TypeScript** and compiled into a single unified build file (`quploader.min.js`, containing both logic and inline CSS).

## 🏗️ Plugin Structure

* **Container Logic:**
* If the selector is a `div` → The main container acts as both a drop zone and a click zone for browsing.
* If the selector is an `input[type="file"]` → Wrap the input inside a `div.quploader-container`.


* **Default Content Elements:**
* If `showIntroText = true` → Displays "Drop, Click to browse".
* If `cameraButton = true` → Appends `<button class="quploader-btn-camera">Camera</button>`.


* **Event Propagation Constraints:**
* Clicking the container → Opens the file browser or folder picker.
* Clicking a child element (e.g., Camera, Upload, Delete buttons) → Must **not** trigger the file browse dialog.



## 🖥️ UI Display Layout

* The intro text (`showIntroText`) and the Camera button (`cameraButton`) are positioned at the top.
* The review area is located immediately below the text and Camera button (similar to FilePond).
* Review positioning is controlled via the `reviewPosition` option (`below`, `above`, `none`).

## 🎨 Standard CSS

* **Class Prefix:** `quploader-`
* **Container Class:** Use the `containerClass` option to append a custom main class to the outer `quploader-container`.

## ⚙️ TypeScript Configuration Interface (`QUploader.Options`)

```typescript
export namespace QUploader {
  export interface ResizeOptions {
    maxWidth: number;
    maxHeight: number;
  }

  export interface Options {
    uploadUrl: string;
    chunkUploadUrl?: string;
    multiple?: boolean;
    dragDrop?: boolean;
    browseButton?: boolean;
    clickReviewAreaToBrowse?: boolean;
    cameraButton?: boolean;
    showIntroText?: boolean;
    allowFolder?: boolean;
    subfolderLevel?: number;
    fileTypes?: string[];
    maxFileSize?: number | string;
    chunkSize?: number | string;
    retry?: number;
    cancel?: boolean;
    cancelUrl?: string;
    deleteUrl?: string;
    reviewMode?: 'thumbnail' | 'detail' | 'single';
    singleModeFit?: 'cover' | 'contain';
    reviewPosition?: 'below' | 'above' | 'none';
    showFileName?: boolean;
    errorDelay?: number;
    resize?: ResizeOptions;
    autoUpload?: boolean;
    progressBar?: boolean;
    allowDelete?: boolean;
    uploadAsBase64?: boolean;
    accept?: string;
    containerClass?: string;
    useIcon?: boolean;
    darkMode?: boolean | 'auto';
    resumable?: boolean;

    // Hooks & Callbacks
    prepareUploadData?: (file: globalThis.File) => FormData | any;
    onPick?: (files: globalThis.File[]) => void;
    onValidate?: (file: globalThis.File) => boolean;
    onResize?: (file: globalThis.File) => void;
    onBeforeUpload?: (file: globalThis.File, formData: FormData | any) => void;
    onUploadStart?: (file: globalThis.File) => void;
    onProgress?: (file: globalThis.File, progress: number) => void;
    onSuccess?: (file: globalThis.File, response: any) => void;
    onError?: (file: globalThis.File, error: any) => void;
    onCancel?: (file: globalThis.File) => void;
    onBeforeDelete?: (file: globalThis.File) => boolean | void;
    onServerDeleted?: (file: globalThis.File, response: any) => void;
    onDeleted?: (file: globalThis.File) => void;
  }

  export interface File extends globalThis.File {
    id?: string;
    serverKey?: string;
    status?: 'pending' | 'uploading' | 'success' | 'error';
    progress?: number;
    uploadId?: string;
    toBase64?: () => Promise<string>;
    resize?: (options?: ResizeOptions) => Promise<File>;
    toResizedBase64?: (options?: ResizeOptions) => Promise<string>;
    _xhr?: XMLHttpRequest;
    _abortController?: AbortController;
  }
}
```

## 🏗️ Modular Handler-Based Architecture

QUploader is structured using a controller delegating to specialized handler classes:
1. **`FileValidator`**: Validates file types and size constraints.
2. **`ImageResizer`**: Resizes local image files via HTML5 Canvas before uploading.
3. **`CameraHandler`**: Manages WebRTC-based camera stream, orientation, torch, capture preview, and mobile full-screen mode.
4. **`ServerHandler`**: Manages upload queuing, Base64/Multipart sending, local storage chunk resuming, server-side deletion, and upload aborts.
5. **`ReviewHandler`**: Renders file review elements (list view, grid mode, thumbnails, single fit).
6. **`ThemeHandler`**: Controls dark mode (supporting explicit toggle or automatic detection matching media queries `prefers-color-scheme`).

## 🚀 Advanced Upload & File Features

* **Picker Mode:** If `uploadUrl` is not provided, the "Upload All" button is automatically hidden and QUploader works as a pure picker/reviewer.
* **Active File API:** Exposes `uploader.currentFile()` to retrieve the currently selected file (useful in single mode).
* **Extended File APIs:** Every file in QUploader features utility methods like `file.toBase64()`, `file.resize(options)`, and `file.toResizedBase64(options)`.
* **Sync Cancellation:** Clicking the delete/cancel button aborts client-side requests (`XHR` / `AbortController`) and, if `cancelUrl` is configured, issues a `POST` request to the server with the session `uploadId` to remove remote temp chunks.

## 📸 Camera Integration (Crucial)

* **Restriction:** Do not use `capture="camera"` due to Android 15 limitations.
* **Implementation:** Utilize the WebRTC API (`navigator.mediaDevices.getUserMedia`) to open the camera stream. Capture the frame via a `canvas` element → convert to `Blob` → cast as `File` → append to the upload list. Shows preview and allows flash control or manual orientation detection.

---

# 🛠️ Comprehensive TypeScript Project Initialization Guide

Follow these steps in your Google Antigravity IDE (or local terminal) to initialize the TypeScript environment and configure the bundler for a single-file output.

### Step 1: Initialize Node Project

Create the project folder and initialize `package.json`.

```bash
mkdir quploader
cd quploader
npm init -y

```

### Step 2: Install Dependencies

Install TypeScript, jQuery types, and Vite (a fast bundler that easily handles compiling TS and inlining CSS into a single JS file).

```bash
npm install jquery
npm install -D typescript @types/jquery vite

```

### Step 3: Configure TypeScript (`tsconfig.json`)

Create a `tsconfig.json` file in the root directory:

```json
{
  "compilerOptions": {
    "target": "ES6",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}

```

### Step 4: Configure Vite Bundler (`vite.config.ts`)

Create `vite.config.ts` to configure Vite to build a single `quploader.min.js` file (injecting the CSS directly into the JS).

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/quploader.ts'),
      name: 'QUploader',
      fileName: () => 'quploader.min.js',
      formats: ['iife'] // Immediately Invoked Function Expression for direct browser use
    },
    rollupOptions: {
      external: ['jquery'],
      output: {
        globals: {
          jquery: '$'
        }
      }
    },
    cssCodeSplit: false // Forces CSS to be injected into the JS file
  }
});

```

### Step 5: Setup Project Structure

Create the `src` directory and necessary files:

```bash
mkdir src
touch src/quploader.ts src/quploader.css index.html

```

### Step 6: Write the TypeScript Skeleton (`src/quploader.ts`)

```typescript
import './quploader.css'; // Vite will bundle and inline this CSS
import $ from 'jquery';

// Extend jQuery interface to include our plugin
declare global {
  interface JQuery {
    quploader(options?: Partial<QUploaderOptions>): JQuery;
  }
}

class QUploader {
  private $element: JQuery;
  private options: QUploaderOptions;

  constructor(element: HTMLElement, options?: Partial<QUploaderOptions>) {
    this.$element = $(element);
    
    // Default options
    this.options = $.extend({
      uploadUrl: '',
      showIntroText: true,
      cameraButton: false,
      // ... default other options
    }, options);

    this.init();
  }

  private init(): void {
    // 1. Setup DOM (wrap input or use div)
    // 2. Render UI (Intro text, Camera button)
    // 3. Bind Events (Click to browse, Camera WebRTC, Drag & Drop)
    this.$element.addClass('quploader-container');
    if (this.options.containerClass) {
      this.$element.addClass(this.options.containerClass);
    }
    
    // TODO: Implement core logic
  }
}

// Register jQuery Plugin
$.fn.quploader = function(options?: Partial<QUploaderOptions>) {
  return this.each(function() {
    if (!$.data(this, 'plugin_quploader')) {
      $.data(this, 'plugin_quploader', new QUploader(this, options));
    }
  });
};

```

### Step 7: Define Default Styles (`src/quploader.css`)

```css
.quploader-container {
  position: relative;
  border: 2px dashed #ccc;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  border-radius: 8px;
  background: #fafafa;
  transition: border-color 0.3s;
}

.quploader-container:hover {
  border-color: #007bff;
}

.quploader-btn-camera {
  z-index: 10;
  position: relative;
  /* Prevent triggering browse on parent */
}

```

### Step 8: Create the Test Environment (`index.html`)

Update your `package.json` scripts to include:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build"
}

```

Create an `index.html` at the root for local testing:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>QUploader TS Demo</title>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body>
  <h2>QUploader Test</h2>
  <div id="upload"></div>

  <!-- Vite dev server injection -->
  <script type="module" src="/src/quploader.ts"></script>
  
  <script>
    $(document).ready(function() {
      $('#upload').quploader({
        uploadUrl: '/api/upload',
        showIntroText: true,
        cameraButton: true,
        containerClass: 'my-custom-uploader',
        onBeforeUpload: (file, formData) => {
          formData.append('userId', '123');
        }
      });
    });
  </script>
</body>
</html>

```

### Step 9: Run and Build

* **Development:** Run `npm run dev` to start a local server with Hot Module Replacement (HMR).
* **Production Build:** Run `npm run build`. The final, single file (`quploader.min.js` containing both the JS logic and the injected CSS) will be generated in the `dist/` directory.