# QUploader

**QUploader** is a lightweight, modern, and highly modular jQuery file upload plugin written in **TypeScript**. It features WebRTC camera capture, client-side image resizing, chunked/resumable uploading, sync cancellation, auto-theme matching, and rich hook callbacks. It compiles into a single, unified client bundle (`quploader.min.js`) containing both logic and styles.

---

## 🚀 Features

- 📸 **WebRTC Camera Capture**: Directly stream and capture photos inside the uploader using `getUserMedia`, featuring orientation detection, torch control, capture previews, and mobile-friendly full-screen views.
- 📦 **Chunked & Resumable Uploads**: Supports slicing large files into chunks for parallel/sequential uploading, with auto-resume based on `localStorage` state verification.
- ✂️ **Client-Side Image Resizing**: Automatic scaling of images using HTML5 Canvas prior to upload, keeping payloads optimized.
- 🔗 **Extended File APIs**: Programs can invoke `file.toBase64()`, `file.resize(options)`, or `file.toResizedBase64(options)` directly on QUploader's active File objects.
- 🚫 **Sync Cancellation**: Cleanly aborts client-side requests (`XHR`/`AbortController`) and triggers a server-side cleanup request to `cancelUrl` using a unique session `uploadId`.
- 📁 **Folder & Drag-Drop Support**: Handles directory structures via drag-and-drop or folder-browse configurations with custom subfolder depth control.
- 🌓 **Dynamic Dark Mode**: Auto-detects OS theme preferences (`prefers-color-scheme`) or accepts manual toggle configs.
- 🏷️ **Flexibility**: Operates either as a standard uploader or as a pure file picker/review widget when no `uploadUrl` is specified.

---

## 🛠️ Installation

Build the single-file distribution code:
```bash
npm run build
```
This produces `dist/quploader.min.js` which you can reference directly in your web project.

---

## 📝 Usage

```html
<!-- Container element -->
<div id="myUploader"></div>

<!-- Include jQuery and QUploader -->
<script src="path/to/jquery.min.js"></script>
<script src="dist/quploader.min.js"></script>

<script>
  $(document).ready(function() {
    $('#myUploader').quploader({
      uploadUrl: '/api/upload',
      chunkUploadUrl: '/api/chunk-upload',
      cancelUrl: '/api/cancel',
      deleteUrl: '/api/delete',
      multiple: true,
      cameraButton: true,
      darkMode: 'auto',
      resize: {
        maxWidth: 1024,
        maxHeight: 1024
      },
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
| `uploadUrl` | `string` | `''` | (Optional) Target URL for regular uploads. Can be empty for pick-only/headless flows. |
| `chunkUploadUrl` | `string` | `undefined` | Target URL for chunked uploads. |
| `cancelUrl` | `string` | `undefined` | Endpoint invoked upon client aborting/cancelling active uploads. |
| `deleteUrl` | `string` | `undefined` | Endpoint invoked when deleting completed uploads on the server. |
| `multiple` | `boolean` | `true` | Allows selecting/picking multiple files. |
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
| `cancel` | `boolean` | `true` | Displays cancel/delete buttons on files. |
| `reviewMode` | `string` | `'thumbnail'` | Layout style: `'thumbnail'`, `'detail'`, or `'single'`. |
| `singleModeFit` | `string` | `'cover'` | CSS fit for single image mode: `'cover'` or `'contain'`. |
| `reviewPosition` | `string` | `'below'` | Positions preview area relative to controls: `'below'`, `'above'`, or `'none'`. |
| `showFileName` | `boolean` | `true` | Shows file titles in the review UI. |
| `errorDelay` | `number` | `5000` | Autohide timer in milliseconds for validation alerts. |
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
| `preferFileInput` | `boolean` | `true` | Uses HTML standard input clicks. If `false`, tries File System Access API where supported. |
| `headless` | `boolean` | `false` | Set to `true` to bind uploader triggers to custom UI elements. |
| `mode` | `string` | `undefined` | Headless mode trigger type: `'browseFile'`, `'browseFolder'`, `'camera'`, or `'dropzone'`. |

---

## 🕹️ Programmatic Methods

Methods can be invoked using jQuery plugin syntax:
```javascript
// Trigger uploads of all queued files
$('#myUploader').quploader('uploadAll');

// Reset and empty the upload list
$('#myUploader').quploader('clearQueue');

// Get all files currently managed by the uploader
const files = $('#myUploader').quploader('getFiles');

// Get the active file (primarily for single selection configurations)
const currentFile = $('#myUploader').quploader('currentFile');

// Imperatively trigger pickers in headless mode
$('#myUploader').quploader('browseFile');
$('#myUploader').quploader('browseFolder');
$('#myUploader').quploader('camera');
```

---

## 💾 Extended File APIs

Active `QUploader.File` instances in the queue (or returned in callbacks) are extended with the following asynchronous APIs:

### `file.toBase64(): Promise<string>`
Converts the local file into a Base64 encoded DataURL.
```javascript
const base64String = await file.toBase64();
```

### `file.resize(options?: ResizeOptions): Promise<File>`
Resizes the file client-side using custom dimensions. Returns a new resized `File` instance.
```javascript
const resizedFile = await file.resize({ maxWidth: 800, maxHeight: 600 });
```

### `file.toResizedBase64(options?: ResizeOptions): Promise<string>`
Directly scales down the image and encodes it as a Base64 string in a single call.
```javascript
const base64Resized = await file.toResizedBase64({ maxWidth: 500, maxHeight: 500 });
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

## 🙈 Headless Mode

Headless Mode lets you bind file picking, directory selection, camera captures, or drop events directly to your own custom DOM elements (such as buttons, inputs, or divs) without rendering any default QUploader markup or file cards.

```javascript
// 1. File picker button
$('#btnBrowse').quploader('browseFile', {
  autoUpload: false,
  onPick: (files) => {
    console.log("Selected:", files);
  }
});

// 2. Drag & drop zone
$('#dropArea').quploader('dropzone', {
  autoUpload: false,
  onPick: (files) => {
    console.log("Dropped:", files);
  }
});
```

---

## 🌐 Testing Demos

The repository includes a multi-page sandbox architecture to test all features easily.

### Local Server Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open the output localhost link in your browser.



### Available Sandbox Pages
* **Basic Uploader** (`index.html`): Tests core configurations, dark-mode switches, limits, and standard progress bar grids.
* **Callbacks & Console** (`callbacks.html`): Tests interactive event handlers with editable javascript callback areas, Base64 image previews, and virtual-scroll event logs.
* **Headless Uploader** (`headless.html`): Tests custom DOM elements, custom drop-zones, and WebRTC cameras initialized in headless mode.
* **Documentation** (`docs.html`): The detailed, readable API reference guide built directly into the local dashboard.
