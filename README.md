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
| `uploadUrl` | `string` | `''` | Target URL for regular uploads. |
| `chunkUploadUrl` | `string` | `undefined` | Target URL for chunked uploads. |
| `cancelUrl` | `string` | `undefined` | Endpoint invoked upon client aborting/cancelling active uploads. |
| `deleteUrl` | `string` | `undefined` | Endpoint invoked when deleting completed uploads on the server. |
| `multiple` | `boolean` | `true` | Allows selecting/picking multiple files. |
| `dragDrop` | `boolean` | `true` | Enables drop-zone events on the main container. |
| `browseButton` | `boolean` | `true` | Renders a standard file browse trigger button. |
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
