# QUploader

**QUploader** is a lightweight, modern, and highly modular file upload library written in **TypeScript**. It operates natively as a dependency-free Vanilla JavaScript class, and automatically registers a backward-compatible jQuery plugin wrapper when jQuery is detected.

It features WebRTC camera capture, client-side image resizing, chunked/resumable uploading, upload cancellation, dark mode theme matching, and rich lifecycle callbacks. It compiles into a single, unified client distribution bundle (`dist/quploader.min.js`) containing both the logic and inline styles.

---

## 🚀 Key Features

*   🍦 **Vanilla JS Core**: Pure TypeScript class requiring no external framework or libraries (e.g. jQuery).
*   🔌 **jQuery Compatibility Wrapper**: Seamlessly hooks into `$.fn.quploader` automatically if jQuery is loaded, ensuring legacy pages continue to run unchanged.
*   📸 **WebRTC Camera Capture**: Stream and capture photos inside the uploader using `getUserMedia`, featuring orientation detection, camera flash/torch control, and responsive capture previews.
*   📦 **Chunked & Resumable Uploads**: Slices large files into chunks for sequential uploading, with automatic resuming based on `localStorage` state verification.
*   ✂️ **Client-Side Image Resizing**: Automatic scaling of images using HTML5 Canvas prior to upload, keeping payloads optimized.
*   🚫 **Synchronous Cancellation**: Cleanly aborts active client-side requests (`XHR` / `AbortController`) and triggers a server-side cleanup request to `cancelUrl` using a unique session `uploadId`.
*   📁 **Folder & Drag-Drop Support**: Handles directory structures via drag-and-drop or folder-browse configurations with custom subfolder depth control.
*   🌓 **Dynamic Dark Mode**: Auto-detects OS theme preferences (`prefers-color-scheme`) or accepts manual toggle configurations.
*   🏷️ **Flexibility**: Operates either as a standard uploader or as a pure file picker/review widget when no `uploadUrl` is specified.

---

## 🛠️ Installation & Developer Workflow

### 1. Installation
Install the project dependencies using npm:
```bash
npm install
```

### 2. Development Mock Backend
Start the Express backend and Vite development servers:
```bash
node test-server.js
npm run dev
```

### 3. Quality Control Commands
Before pushing to git, ensure the code successfully builds and passes all tests:
```bash
# Run the automated Vitest suite (using happy-dom environment)
npm run test

# Verify standalone library packaging compiles without errors
npm run build:lib

# Verify complete multi-page static site compiles
npm run build
```

---

## 📝 Quick Start Examples

### 1. Vanilla JavaScript Usage (ES Module)

To use QUploader in a modern web environment as an ES Module:

```html
<!-- Container element -->
<div id="myUploader"></div>

<!-- Include QUploader -->
<script type="module">
  import { QUploader } from './dist/quploader.min.js';

  const uploader = new QUploader(document.getElementById('myUploader'), {
    uploadUrl: 'http://localhost:3000/api/upload',
    multiple: true,
    cameraButton: true,
    onSuccess: (file, response) => {
      console.log('Successfully uploaded:', file.name, response);
    }
  });
</script>
```

### 2. jQuery Backward-Compatible Usage

If jQuery is loaded in the global context, QUploader registers itself as a jQuery plugin automatically:

```html
<!-- Container element -->
<div id="myUploader"></div>

<!-- Include jQuery and QUploader -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="./dist/quploader.min.js"></script>

<script>
  $(document).ready(function() {
    $('#myUploader').quploader({
      uploadUrl: 'http://localhost:3000/api/upload',
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

QUploader accepts a configuration options object during initialization. Below is the complete reference of all available configuration parameters:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `uploadUrl` | `string` | `''` | Target URL for regular uploads. Can be empty for pick-only/headless flows. |
| `chunkUploadUrl` | `string` | `undefined` | Target URL for chunked uploads. |
| `cancelUrl` | `string` | `undefined` | Endpoint invoked upon client aborting/cancelling active uploads. Sent as POST request with `{ uploadId, fileName }`. |
| `deleteUrl` | `string` | `undefined` | Endpoint invoked when deleting completed uploads on the server. Sent as POST request with `{ key: serverKey }`. |
| `multiple` | `boolean` | `false` | Allows selecting/picking multiple files. If `false`, subsequent selections replace the current queue. |
| `dragDrop` | `boolean` | `true` | Enables drag-and-drop zone events on the main container. |
| `browseButton` | `boolean` | `true` | Renders a standard file browse trigger button. |
| `clickReviewAreaToBrowse` | `boolean` | `false` | If `true`, clicking inside the review area triggers the file browse dialog. |
| `cameraButton` | `boolean` | `false` | Enables WebRTC camera capture controls. |
| `showIntroText` | `boolean` | `true` | Renders the instruction placeholder text (e.g., "Drop files here"). |
| `allowFolder` | `boolean` | `false` | Allows dropping or choosing directories. |
| `subfolderLevel` | `number` | `undefined` | Restricts parsed directory depth (e.g., `0` only reads files directly inside the dropped folder). |
| `fileTypes` | `string[]` | `undefined` | File extension/MIME filters (e.g., `['.jpg', 'image/png', 'application/*']`). |
| `maxFileSize` | `number \| string` | `10 * 1024 * 1024` | Maximum file size limit. Supports bytes or strings like `'10MB'`, `'500KB'`. |
| `chunkSize` | `number \| string` | `undefined` | Size of chunks for sliced upload (e.g., `'2MB'`). Enables chunked uploads when defined. |
| `retry` | `number` | `3` | Number of retry attempts on failed chunk transfers. |
| `cancel` | `boolean` | `true` | Stashes cancel parameters in options. |
| `reviewMode` | `'thumbnail' \| 'detail' \| 'single'` | `'thumbnail'` | Layout style: `'thumbnail'` (grid list), `'detail'` (detailed table-like lists), or `'single'` (fills container, ideal for single avatar/image uploads). |
| `singleModeFit` | `'cover' \| 'contain'` | `'cover'` | CSS background-size fit for `'single'` image mode. |
| `reviewPosition` | `'below' \| 'above' \| 'none'` | `'below'` | Positions preview area relative to controls. |
| `showFileName` | `boolean` | `true` | Shows file titles in the review UI. |
| `errorDelay` | `number` | `3000` | Autohide timer in milliseconds for global validation alerts. |
| `resize` | `object` | `undefined` | Image downsizing specs `{ maxWidth, maxHeight }`. Client-side downsizes image files prior to transmission. |
| `autoUpload` | `boolean` | `true` | Triggers upload immediately after selection. |
| `progressBar` | `boolean` | `true` | Renders progress indicators per item in the review area. |
| `allowDelete` | `boolean` | `true` | Enables removal of queued/uploaded files. |
| `uploadAsBase64` | `boolean` | `false` | Encodes files to Base64 JSON payload instead of standard multipart FormData. |
| `accept` | `string` | `undefined` | Custom file browser accept parameter. Takes priority over `fileTypes`. |
| `containerClass` | `string` | `''` | Custom CSS wrapper class added to the main container. |
| `useIcon` | `boolean` | `false` | Replaces text labels on control buttons with inline SVGs. |
| `darkMode` | `boolean \| 'auto'` | `false` | Sets Dark Mode theme. `'auto'` binds to OS prefers-color-scheme settings. |
| `resumable` | `boolean` | `true` | Caches chunk indices in local storage to resume interrupted uploads. |
| `preferFileInput` | `boolean` | `true` | Uses HTML standard input clicks. If `false`, leverages the File System Access API where supported. |
| `headless` | `boolean` | `false` | Set to `true` to bind uploader triggers to custom UI elements. |
| `mode` | `'browseFile' \| 'browseFolder' \| 'camera' \| 'dropzone'` | `undefined` | Headless mode trigger type mapping the element to a specific event listener. |

---

## 🕹️ Programmatic Methods

You can call methods imperatively on an initialized QUploader instance.

### Vanilla JS Call Example:
```javascript
const uploader = new QUploader(document.getElementById('myUploader'), config);

// Trigger uploads of all queued files
uploader.uploadAll();

// Reset and empty the upload list
uploader.clearQueue();

// Get all files currently managed by the uploader
const files = uploader.getFiles();

// Programmatic triggers
uploader.browseFile();
uploader.browseFolder();
uploader.camera();
```

### jQuery Call Example:
Methods are invoked by passing the method name as a string parameter, optionally followed by arguments:
```javascript
// Trigger uploads of all queued files (returns jQuery collection for chaining)
$('#myUploader').quploader('uploadAll');

// Reset and empty the upload list (returns jQuery collection for chaining)
$('#myUploader').quploader('clearQueue');

// Get all files currently managed by the uploader (returns raw file list array)
const files = $('#myUploader').quploader('getFiles');

// Open triggers
$('#myUploader').quploader('browseFile');
$('#myUploader').quploader('browseFolder');
$('#myUploader').quploader('camera');
```

---

## 🪝 Callbacks & Event Hooks

Lifecycle callbacks let you hook into file validation, manipulation, upload, and deletion processes.

### 1. `prepareUploadData(file)`
Fires to customize the body payload before upload.
*   **Parameters**: `file` (native `File` object extended with `QUploader.File` properties)
*   **Returns**: `FormData` or any JSON-serializable object.

### 2. `onPick(files)`
Triggered immediately when files are selected or dropped by the user, before validation and UI rendering.
*   **Parameters**: `files` (array of native `File` objects)

### 3. `onValidate(file)`
Custom validator hook.
*   **Parameters**: `file` (extended `File` object)
*   **Returns**: `boolean`. Returning `false` rejects the file from entering the queue.

### 4. `onResize(file)`
Fires after a file is successfully resized client-side.
*   **Parameters**: `file` (resized extended `File` object)

### 5. `onBeforeUpload(file, payload)`
Triggered just before sending the request. Allows modifying standard payload parameters (e.g. `FormData` fields or JSON properties).
*   **Parameters**: `file` (extended `File` object), `payload` (either `FormData` or JSON object)

### 6. `onUploadStart(file)`
Fires when the HTTP request starts transmitting the file.
*   **Parameters**: `file` (extended `File` object)

### 7. `onProgress(file, progress)`
Fires periodically during upload.
*   **Parameters**: `file` (extended `File` object), `progress` (integer between `0` and `100`)

### 8. `onSuccess(file, response)`
Fires when a file upload completes successfully with a `2xx` HTTP status code.
*   **Parameters**: `file` (extended `File` object), `response` (parsed JSON or raw response text)

### 9. `onError(file, error)`
Fires when a file fails validation or encounters network/upload errors.
*   **Parameters**: `file` (extended `File` object), `error` (string error message)

### 10. `onCancel(file)`
Fires when an active file upload is cancelled or aborted by the client.
*   **Parameters**: `file` (extended `File` object)

### 11. `onBeforeDelete(file)`
Fires before removing a file or requesting server deletion.
*   **Parameters**: `file` (extended `File` object)
*   **Returns**: `boolean | void`. Returning `false` blocks deletion.

### 12. `onServerDeleted(file, response)`
Fires when the server returns a successful response for file deletion.
*   **Parameters**: `file` (extended `File` object), `response` (parsed JSON or text response)

### 13. `onDeleted(file)`
Fires after a file has been completely removed from both the queue and the UI.
*   **Parameters**: `file` (extended `File` object)

---

## ⚡ Advanced Guides

### 1. Headless Mode (Custom UI)
Headless Mode enables you to bind QUploader's triggers (file browse, folder browse, camera modal, drop-zone) to **any arbitrary element** in your page without rendering default styling, inputs, buttons, or list containers.

#### Setup Examples:
```javascript
// Turn a custom button into a file picker
const browseUploader = new QUploader(document.getElementById('myCustomButton'), {
  headless: true,
  mode: 'browseFile',
  uploadUrl: '/api/upload',
  onPick: (files) => console.log('Picked:', files),
  onSuccess: (file, res) => console.log('Uploaded:', file.name)
});

// Turn a custom div into a drag and drop zone
const dropzoneUploader = new QUploader(document.getElementById('myDropArea'), {
  headless: true,
  mode: 'dropzone',
  uploadUrl: '/api/upload',
  onPick: (files) => console.log('Dropped files:', files)
});
```

Using the jQuery wrapper shortcut:
```javascript
$('#myCustomButton').quploader('browseFile', {
  uploadUrl: '/api/upload',
  onPick: function(files) { ... }
});

$('#myDropArea').quploader('dropzone', {
  uploadUrl: '/api/upload',
  onPick: function(files) { ... }
});
```

---

### 2. Chunked & Resumable Uploads
If `chunkSize` is defined, files larger than the chunk size will be split into segments and uploaded sequentially to `chunkUploadUrl`.

#### Resuming Interrupted Uploads:
*   QUploader stores the index of the last successfully uploaded chunk in the client browser's `localStorage`.
*   The cache key format is: `quploader_resume_${file.name}_${file.size}_${file.lastModified}`.
*   If a network dropout or abort occurs, subsequent attempts check `localStorage` and resume from the next unsaved chunk instead of starting from the beginning.
*   Once the file successfully finishes, the `localStorage` key is cleared.
*   `retry` configuration option sets how many times a failed chunk segment will attempt to re-upload before triggering an error.

---

### 3. Client-Side Image Resizing
By specifying `resize: { maxWidth, maxHeight }`, QUploader downscales images client-side before transmission:
*   Saves bandwidth by compressing large images on the user's browser.
*   Preserves aspect ratio.
*   Uses HTML5 Canvas for resizing and exports to a binary `Blob` with the original MIME type.
*   Adds helper methods to the `File` object:
    *   `file.toBase64()`: Returns a promise resolving to the file's Base64 string representation.
    *   `file.resize(options)`: Resizes the image and returns a promise resolving to the new file.
    *   `file.toResizedBase64(options)`: Compresses the image and resolves to a Base64 string.

---

### 4. WebRTC Camera Capture
When `cameraButton` is enabled:
*   QUploader displays a camera trigger button.
*   Clicking it starts a WebRTC video stream using `navigator.mediaDevices.getUserMedia`.
*   Features native support for camera flash/torch toggle, device orientation adjustment, full-screen viewport scaling on mobile devices, and direct canvas snapshots converted into PNG/JPEG `Blob` objects ready for upload.

---

## 📡 API Payload Structures

### 1. Standard Upload Requests (POST to `uploadUrl`)

#### Multipart/Form-Data mode (Default):
*   `file`: The binary file data.
*   `relativePath`: Relative folder path (if folders are enabled and present).
*   `uploadId`: Unique session upload string.

#### JSON Base64 Mode (`uploadAsBase64: true`):
```json
{
  "fileName": "avatar.png",
  "fileType": "image/png",
  "base64": "data:image/png;base64,iVBORw0KGgo...",
  "uploadId": "up_abc123_1718000000000",
  "relativePath": "images/avatars"
}
```

### 2. Chunked Upload Requests (POST to `chunkUploadUrl`)

#### Multipart/Form-Data Mode (Default):
*   `file`: The binary chunk slice file.
*   `fileName`: The original file name.
*   `chunkIndex`: Index of the current chunk (0-indexed).
*   `totalChunks`: Total chunk count.
*   `uploadId`: Unique session upload ID.
*   `relativePath`: Relative folder path.

#### JSON Base64 Mode (`uploadAsBase64: true`):
```json
{
  "fileName": "large-video.mp4",
  "chunkIndex": "2",
  "totalChunks": "5",
  "base64": "data:video/mp4;base64,AAAA...",
  "uploadId": "up_xyz789_1718000000000",
  "relativePath": "videos"
}
```

### 3. Server Actions & Cleanup

#### Delete File (POST to `deleteUrl`):
Triggered when deleting successfully uploaded items.
```json
{
  "key": "hashed_server_key.jpg"
}
```

#### Cancel Upload (POST to `cancelUrl`):
Triggered when aborting active uploads.
```json
{
  "uploadId": "up_abc123_1718000000000",
  "fileName": "interrupted-doc.pdf"
}
```
