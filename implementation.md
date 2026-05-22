# QUploader Requirements Audit & Tasks

## Core Structure & UI
- [x] **Container Logic**: Target `div` (drop/click zone) or wrap `input[type="file"]`.
- [x] **Content Elements**: Render `showIntroText` and `cameraButton`.
- [x] **Event Propagation**: Click container opens file dialog; click children (camera, buttons) does not trigger it. (Fixed infinite loop bug).
- [x] **UI Display Layout**: Intro text/Camera top; review area `above`, `below`, or `none`.
- [x] **Standard CSS**: Prefix `quploader-`, `containerClass`.

## Configuration Options (`QUploaderOptions`)
- [x] `uploadUrl`
- [x] `chunkUploadUrl`
- [x] `single` / `multiple`
- [x] `dragDrop`
- [x] `browseButton`: (Fixed) Rendered a specific Browse button if set to true.
- [x] `cameraButton`
- [x] `showIntroText`
- [x] `allowFolder`
- [x] `subfolderLevel`: (Fixed) Skips deep files by parsing `file.webkitRelativePath`.
- [x] `fileTypes`: (Fixed) Adds `accept` attribute to hidden input and visually handles mime validation errors.
- [x] `maxFileSize`: (Fixed) Displays error properly in UI instead of skipping silently.
- [x] `chunkSize`
- [x] `retry`
- [x] `cancel`
- [x] `reviewMode` ('thumbnail', 'slide', 'single')
- [x] `reviewPosition`
- [x] `showFileName`
- [x] `resize`
- [x] `autoUpload`
- [x] `progressBar`
- [x] `deleteWithKey`
- [x] `containerClass`

## Hooks & Callbacks
- [x] `prepareUploadData`: (Fixed) Supported in both standard XHR and fetch-chunk upload to dynamically structure `FormData`.
- [x] `onPick`, `onValidate`, `onResize`, `onBeforeUpload`, `onUploadStart`, `onProgress`, `onSuccess`, `onError`, `onCancel`, `onDelete`.

## Upload Features
- [x] **Chunk Upload**: Slice logic, Retry mechanism, Progress calculation.
- [x] **Cancel Mechanism**: Support aborting XHR and Fetch requests.
- [x] **Progress Bar**: Display individual progress.
- [x] **Delete Key**: Parse unique key from server response for deletion.
- [ ] **Queue Upload (Sequential/Parallel)**: Currently defaults to Parallel. Wait, `autoUpload: true` triggers parallel. Sequential queue is the only remaining enhancement.

## Review UI & Camera
- [x] **Image Review**: Thumbnails via `URL.createObjectURL`, single review mode, slide mode.
- [x] **Camera**: WebRTC video stream, canvas capture, blob conversion.
