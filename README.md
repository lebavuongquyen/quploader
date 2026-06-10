# QUploader

**QUploader** is a lightweight, modern, and highly modular file upload library written in **TypeScript**. It operates natively as a dependency-free Vanilla JavaScript class, and automatically registers a backward-compatible jQuery plugin wrapper when jQuery is detected. 

It features WebRTC camera capture, client-side image resizing, chunked/resumable uploading, sync cancellation, auto-theme matching, and rich hook callbacks. It compiles into a single, unified client distribution bundle (`dist/quploader.min.js`) containing both the logic and inline styles.

---

## 🚀 Features

- 🍦 **Vanilla JS Core**: Pure TypeScript class requiring no external framework or libraries (e.g. jQuery).
- 🔌 **jQuery Compatibility Wrapper**: Seamlessly hooks into `$.fn.quploader` automatically if jQuery is loaded, ensuring legacy pages continue to run unchanged.
- 📸 **WebRTC Camera Capture**: Directly stream and capture photos inside the uploader using `getUserMedia`, featuring orientation detection, torch control, capture previews, and mobile-friendly full-screen views.
- 📦 **Chunked & Resumable Uploads**: Slices large files into chunks for sequential uploading, with automatic resuming based on `localStorage` state verification.
- ✂️ **Client-Side Image Resizing**: Automatic scaling of images using HTML5 Canvas prior to upload, keeping payloads optimized.
- 🚫 **Sync Cancellation**: Cleanly aborts client-side requests (`XHR` / `AbortController`) and triggers a server-side cleanup request to `cancelUrl` using a unique session `uploadId`.
- 📁 **Folder & Drag-Drop Support**: Handles directory structures via drag-and-drop or folder-browse configurations with custom subfolder depth control.
- 🌓 **Dynamic Dark Mode**: Auto-detects OS theme preferences (`prefers-color-scheme`) or accepts manual toggle configs.
- 🏷️ **Flexibility**: Operates either as a standard uploader or as a pure file picker/review widget when no `uploadUrl` is specified.

---

## 🛠️ Installation & Building

Build the single-file distribution code:
```bash
npm run build:lib
```
This compiles the standalone package into `dist/quploader.min.js` containing the logic and embedded styles.

---

## 📝 Usage

### 1. Vanilla JavaScript Usage

```html
<!-- Container element -->
<div id="myUploader"></div>

<!-- Include QUploader -->
<script type="module">
  import { QUploader } from './dist/quploader.min.js';

  const uploader = new QUploader(document.getElementById('myUploader'), {
    uploadUrl: '/api/upload',
    multiple: true,
    cameraButton: true,
    onSuccess: (file, response) => {
      console.log('Successfully uploaded:', file.name, response);
    }
  });
</script>
```

### 2. jQuery Backward-Compatible Usage

```html
<!-- Container element -->
<div id="myUploader"></div>

<!-- Include jQuery and QUploader -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="./dist/quploader.min.js"></script>

<script>
  $(document).ready(function() {
    $('#myUploader').quploader({
      uploadUrl: '/api/upload',
      multiple: true,
      cameraButton: true,
      onSuccess: function(file, response) {
        console.log('Successfully uploaded:', file.name, response);
      }
    });
  });
</script>
```

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `uploadUrl` | `string` | `''` | Target URL for regular uploads. Can be empty for pick-only/headless flows. |
| `chunkUploadUrl` | `string` | `undefined` | Target URL for chunked uploads. |
| `cancelUrl` | `string` | `undefined` | Endpoint invoked upon client aborting/cancelling active uploads. |
| `deleteUrl` | `string` | `undefined` | Endpoint invoked when deleting completed uploads on the server. |
| `multiple` | `boolean` | `false` | Allows selecting/picking multiple files. |
| `dragDrop` | `boolean` | `true` | Enables drop-zone events on the main container. |
| `browseButton` | `boolean` | `true` | Renders a standard file browse trigger button. |
| `clickReviewAreaToBrowse` | `boolean` | `false` | Click inside review area triggers the file browse dialog. |
| `cameraButton` | `boolean` | `false` | Enables WebRTC camera capture controls. |
| `showIntroText` | `boolean` | `true` | Renders the instruction placeholder text. |
| `allowFolder` | `boolean` | `false` | Allows dropping or choosing directories. |
| `subfolderLevel` | `number` | `undefined` | Restricts parsed directory depth. |
| `fileTypes` | `string[]` | `undefined` | File extension/MIME filters (e.g., `['.jpg', 'image/png']`). |
| `maxFileSize` | `number \| string`| `undefined` | Max file size limit (e.g., `10485760` or `'10MB'`). |
| `chunkSize` | `number \| string`| `undefined` | Size of chunks for sliced upload (e.g., `'2MB'`). |
| `retry` | `number` | `3` | Number of retry attempts on failed chunk transfers. |
| `cancel` | `boolean` | `true` | Stashes cancel parameters in options. |
| `reviewMode` | `string` | `'thumbnail'` | Layout style: `'thumbnail'`, `'detail'`, or `'single'`. |
| `singleModeFit` | `string` | `'cover'` | CSS fit for single image mode: `'cover'` or `'contain'`. |
| `reviewPosition` | `string` | `'below'` | Positions preview area relative to controls: `'below'`, `'above'`, or `'none'`. |
| `showFileName` | `boolean` | `true` | Shows file titles in the review UI. |
| `errorDelay` | `number` | `3000` | Autohide timer in milliseconds for validation alerts. |
| `resize` | `object` | `undefined` | Image downsizing specs `{ maxWidth, maxHeight }`. |
| `autoUpload` | `boolean` | `true` | Triggers upload immediately after selection. |
| `progressBar` | `boolean` | `true` | Renders progress indicators per item. |
| `allowDelete` | `boolean` | `true` | Enables removal of queued/uploaded files. |
| `uploadAsBase64` | `boolean` | `false` | Encodes files to Base64 payload instead of standard multipart FormData. |
| `accept` | `string` | `undefined` | Custom file browser accept parameter. |
| `containerClass` | `string` | `''` | Custom CSS wrapper class. |
| `useIcon` | `boolean` | `false` | Replaces text labels on control buttons with icons. |
| `darkMode` | `boolean \| 'auto'` | `false` | Sets Dark Mode theme. `'auto'` binds to OS color settings. |
| `resumable` | `boolean` | `true` | Caches chunk indices in local storage to resume interrupted uploads. |
| `preferFileInput` | `boolean` | `true` | Uses HTML standard input clicks. |
| `headless` | `boolean` | `false` | Set to `true` to bind uploader triggers to custom UI elements. |
| `mode` | `string` | `undefined` | Headless mode trigger type: `'browseFile'`, `'browseFolder'`, `'camera'`, or `'dropzone'`. |

---

## 🕹️ Programmatic Methods

### Vanilla JS Call Example:
```javascript
const uploader = new QUploader(element, config);

// Trigger uploads of all queued files
uploader.uploadAll();

// Reset and empty the upload list
uploader.clearQueue();

// Get all files currently managed by the uploader
const files = uploader.getFiles();
```

### jQuery Call Example:
```javascript
// Trigger uploads of all queued files
$('#myUploader').quploader('uploadAll');

// Reset and empty the upload list
$('#myUploader').quploader('clearQueue');

// Get all files currently managed by the uploader
const files = $('#myUploader').quploader('getFiles');
```

---

## 🪝 Callbacks & Event Hooks

- `onPick(files)`: Triggered after file selection.
- `onValidate(file)`: Invoked during validation. Return `false` to reject file.
- `onResize(file)`: Invoked when a file is resized.
- `onBeforeUpload(file, payload)`: Modify request payload (FormData or JSON) before transmission.
- `onUploadStart(file)`: Fired when a file starts uploading.
- `onProgress(file, percent)`: Upload progress callback.
- `onSuccess(file, response)`: Upload success callback.
- `onError(file, error)`: Handles upload failures.
- `onCancel(file)`: Called when an active upload is cancelled.
- `onBeforeDelete(file)`: Fired before server deletion. Return `false` to block deletion.
- `onServerDeleted(file, response)`: Server-side deletion callback.
- `onDeleted(file)`: Called after a file is removed from queue/UI.

---

## 🔒 Developer Workflow & Commit Guard

To ensure high codebase reliability, contributors and agent models **MUST** strictly follow the verification workflow below before committing or pushing any code to GitHub:

### 1. Verification Checklist (Local Sandbox Setup)
Make sure the mock backend and Vite dev servers are functional:
- Install dependencies: `npm install`
- Start Express backend and Vite:
  ```bash
  node test-server.js
  npm run dev
  ```

### 2. Strict Quality Control Commands
Before pushing to git, the code **MUST** successfully build and pass all tests:
1. **Run automated test suite**:
   ```bash
   npm run test
   ```
   *Executes Vitest under happy-dom to verify the 72 unit/configuration tests.*
2. **Build verification (both targets)**:
   ```bash
   # Verify standalone library packaging compiles without errors
   npm run build:lib
   
   # Verify complete multi-page static site compiles
   npm run build
   ```

*Do not stage, commit, or push any changes that fail any of the above commands.*
