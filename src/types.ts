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
    maxFileSize?: number | string; // In bytes or string like '10MB'
    chunkSize?: number | string;
    retry?: number;
    cancel?: boolean;
    cancelUrl?: string;
    deleteUrl?: string;
    reviewMode?: 'thumbnail' | 'detail' | 'single';
    singleModeFit?: 'cover' | 'contain';
    reviewPosition?: 'below' | 'above' | 'none';
    showFileName?: boolean;
    errorDelay?: number; // Delay in ms to auto-hide global validation errors
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
    preferFileInput?: boolean;
    headless?: boolean;
    mode?: 'browseFile' | 'browseFolder' | 'camera' | 'dropzone';

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

  export interface CoreContext {
    options: Options;
    files: File[];
    $container: JQuery;
    $reviewArea: JQuery;
    handleFiles(files: globalThis.File[]): void;
    removeFile(id: string, force?: boolean): Promise<void>;
    updateFileStatus(id: string, status: 'pending' | 'uploading' | 'success' | 'error', errorMsg?: string): void;
    updateFileProgress(id: string, progress: number): void;
    updateUploadButtonState(): void;
    processUploadQueue(): void;
    showGlobalError(htmlContent: string): void;
  }
}
