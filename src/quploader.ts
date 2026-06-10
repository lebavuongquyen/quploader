import quploaderCss from './quploader.css?inline';
import { IconProvider } from './icon-provider';
import { MimeHelper } from './mime-helper';
import * as Types from './types';
import { FileValidator } from './handlers/file-validator';
import { ImageResizer } from './handlers/image-resizer';
import { CameraHandler } from './handlers/camera-handler';
import { ServerHandler } from './handlers/server-handler';
import { ReviewHandler } from './handlers/review-handler';
import { ThemeHandler } from './handlers/theme-handler';

if (typeof document !== 'undefined' && !document.getElementById('quploader-inline-css')) {
  const style = document.createElement('style');
  style.id = 'quploader-inline-css';
  style.textContent = quploaderCss;
  document.head.appendChild(style);
}

class QUploader implements Types.QUploader.CoreContext {
  public element: HTMLElement;
  public container!: HTMLElement;
  private hiddenInput!: HTMLInputElement;
  public reviewArea: HTMLElement | null = null;
  private globalErrorBox!: HTMLElement;
  public options: QUploader.Options;
  public files: QUploader.File[] = [];
  private errorTimeout: any;
  private isUploading = false;
  
  // Handlers
  private validator: FileValidator;
  private resizer: ImageResizer;
  private cameraHandler: CameraHandler;
  private serverHandler: ServerHandler;
  private reviewHandler: ReviewHandler;
  public themeHandler: ThemeHandler;

  constructor(element: HTMLElement, options?: Partial<QUploader.Options>) {
    this.element = element;
    
    // Default options
    this.options = Object.assign({
      uploadUrl: '',
      showIntroText: true,
      cameraButton: false,
      dragDrop: true,
      clickReviewAreaToBrowse: false,
      multiple: false,
      autoUpload: true,
      progressBar: true,
      allowDelete: true,
      errorDelay: 3000,
      reviewMode: 'thumbnail',
      singleModeFit: 'cover',
      reviewPosition: 'below',
      uploadAsBase64: false,
      useIcon: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB default
      darkMode: false,
      resumable: true,
      preferFileInput: true,
      headless: false
    }, options) as QUploader.Options;

    this.options.maxFileSize = this.parseSize(this.options.maxFileSize);
    this.options.chunkSize = this.parseSize(this.options.chunkSize);

    // Resolve file type restrictions in priority order:
    // 1. options.accept
    // 2. options.fileTypes
    // 3. HTML accept attribute of the input element (if initialized on a file input)
    let resolvedFileTypes: string[] | undefined = undefined;

    if (options && options.accept !== undefined) {
      resolvedFileTypes = this.parseAcceptString(options.accept);
    } else if (options && options.fileTypes !== undefined) {
      resolvedFileTypes = options.fileTypes;
    } else if (this.element.tagName.toLowerCase() === 'input' && (this.element as HTMLInputElement).type === 'file') {
      const acceptAttr = this.element.getAttribute('accept');
      if (acceptAttr) {
        resolvedFileTypes = this.parseAcceptString(acceptAttr);
      }
    }

    if (resolvedFileTypes) {
      this.options.fileTypes = resolvedFileTypes;
    }

    this.validator = new FileValidator(this);
    this.resizer = new ImageResizer(this);
    this.cameraHandler = new CameraHandler(this);
    this.serverHandler = new ServerHandler(this);
    this.reviewHandler = new ReviewHandler(this);

    this.init();

    this.themeHandler = new ThemeHandler(this);
  }

  private parseAcceptString(acceptStr: string): string[] {
    return acceptStr.split(',').map(s => s.trim()).filter(Boolean);
  }

  private parseSize(size: number | string | undefined): number | undefined {
    if (size === undefined) return undefined;
    if (typeof size === 'number') return size;
    if (typeof size === 'string' && size.trim() === '') return undefined;
    
    const str = String(size).trim().toLowerCase();
    const match = str.match(/^([\d.]+)\s*([a-z]*)$/);
    if (!match) {
      const parsed = parseInt(str, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'kb': case 'k': return value * 1024;
      case 'mb': case 'm': return value * 1024 * 1024;
      case 'gb': case 'g': return value * 1024 * 1024 * 1024;
      case 'tb': case 't': return value * 1024 * 1024 * 1024 * 1024;
      default: return value; // bytes or unrecognized
    }
  }

  private init(): void {
    this.buildDOM();
    this.bindEvents();
  }

  private buildDOM(): void {
    if (this.options.headless) {
      this.container = this.element;
      if (this.element.tagName.toLowerCase() === 'input' && (this.element as HTMLInputElement).type === 'file') {
        this.hiddenInput = this.element as HTMLInputElement;
        this.hiddenInput.style.display = 'none';
      } else {
        this.hiddenInput = document.createElement('input');
        this.hiddenInput.type = 'file';
        this.hiddenInput.style.display = 'none';
        document.body.appendChild(this.hiddenInput);
      }

      if (this.options.multiple) {
        this.hiddenInput.setAttribute('multiple', 'multiple');
      }
      if (this.options.fileTypes && this.options.fileTypes.length > 0) {
        this.hiddenInput.setAttribute('accept', this.options.fileTypes.join(','));
      }
      
      this.reviewArea = null;
      this.globalErrorBox = document.createElement('div');
      return;
    }

    // 1. Container Logic
    const isFileInput = this.element.tagName.toLowerCase() === 'input' && (this.element as HTMLInputElement).type === 'file';
    if (isFileInput) {
      this.container = document.createElement('div');
      this.container.className = 'quploader-container';
      if (this.options.containerClass) {
         this.container.classList.add(this.options.containerClass);
      }
      this.element.parentNode?.insertBefore(this.container, this.element);
      this.container.appendChild(this.element);
      this.hiddenInput = this.element as HTMLInputElement;
      this.hiddenInput.style.display = 'none';
    } else {
      this.container = this.element;
      this.container.classList.add('quploader-container');
      if (this.options.containerClass) {
        this.container.classList.add(this.options.containerClass);
      }
      this.hiddenInput = document.createElement('input');
      this.hiddenInput.type = 'file';
      this.hiddenInput.style.display = 'none';
      this.container.appendChild(this.hiddenInput);
    }

    if (this.options.multiple) {
      this.hiddenInput.setAttribute('multiple', 'multiple');
    }
    if (this.options.fileTypes && this.options.fileTypes.length > 0) {
      this.hiddenInput.setAttribute('accept', this.options.fileTypes.join(','));
    }

    // 2. Default Content Elements
    const topContent = document.createElement('div');
    topContent.className = 'quploader-top-content';
    
    if (this.options.showIntroText) {
      let text = '';
      if (this.options.dragDrop) {
        text = this.options.browseButton ? 'Drop files here' : 'Drop files here or click to browse';
      } else {
        text = this.options.browseButton ? '' : 'Click to browse';
      }
      if (text) {
        const intro = document.createElement('div');
        intro.className = 'quploader-intro';
        intro.textContent = text;
        topContent.appendChild(intro);
      }
    }

    const buttonsGroup = document.createElement('div');
    buttonsGroup.className = 'quploader-buttons-group';
    const useIcon = this.options.useIcon;

    if (this.options.browseButton) {
      const label = useIcon ? IconProvider.getBrowseIcon() : 'Browse File';
      const browseBtn = document.createElement('button');
      browseBtn.type = 'button';
      browseBtn.className = 'quploader-btn-browse';
      browseBtn.title = 'Browse File';
      if (useIcon) browseBtn.classList.add('quploader-btn-icon-mode');
      browseBtn.innerHTML = label;
      buttonsGroup.appendChild(browseBtn);
    }

    if (this.options.allowFolder) {
      const label = useIcon ? IconProvider.getFolderIcon() : 'Browse Folder';
      const folderBtn = document.createElement('button');
      folderBtn.type = 'button';
      folderBtn.className = 'quploader-btn-folder';
      folderBtn.title = 'Browse Folder';
      if (useIcon) folderBtn.classList.add('quploader-btn-icon-mode');
      folderBtn.innerHTML = label;
      buttonsGroup.appendChild(folderBtn);
    }

    if (this.options.cameraButton) {
      const label = useIcon ? IconProvider.getCameraIcon() : 'Camera';
      const cameraBtn = document.createElement('button');
      cameraBtn.type = 'button';
      cameraBtn.className = 'quploader-btn-camera';
      cameraBtn.title = 'Camera';
      if (useIcon) cameraBtn.classList.add('quploader-btn-icon-mode');
      cameraBtn.innerHTML = label;
      buttonsGroup.appendChild(cameraBtn);
    }

    if (!this.options.autoUpload && this.options.uploadUrl) {
      const label = useIcon ? IconProvider.getUploadIcon() : 'Upload All';
      const uploadBtn = document.createElement('button');
      uploadBtn.type = 'button';
      uploadBtn.className = 'quploader-btn-upload';
      uploadBtn.disabled = true;
      uploadBtn.style.display = 'none';
      uploadBtn.title = 'Upload All';
      if (useIcon) uploadBtn.classList.add('quploader-btn-icon-mode');
      uploadBtn.innerHTML = label;
      buttonsGroup.appendChild(uploadBtn);
    }

    if (buttonsGroup.children.length > 0) {
      topContent.appendChild(buttonsGroup);
    }
    
    // Add top content to container if it has children
    if (topContent.children.length > 0) {
      this.container.insertBefore(topContent, this.container.firstChild);
    }

    if (this.options.reviewMode === 'single') {
      this.container.classList.add('quploader-mode-single');
    }

    // 3. Review Area
    if (this.options.reviewPosition !== 'none') {
      this.reviewArea = document.createElement('div');
      this.reviewArea.className = 'quploader-review-area';
      if (this.options.reviewMode === 'detail') {
        this.reviewArea.classList.add('quploader-detail');
      }
      if (this.options.clickReviewAreaToBrowse) {
        this.reviewArea.classList.add('quploader-review-clickable');
      }
      if (this.options.reviewPosition === 'above') {
        this.container.insertBefore(this.reviewArea, this.container.firstChild);
      } else {
        this.container.appendChild(this.reviewArea);
      }
    }

    this.globalErrorBox = document.createElement('div');
    this.globalErrorBox.className = 'quploader-global-error';
    this.globalErrorBox.style.display = 'none';
    this.container.appendChild(this.globalErrorBox);

    this.container.setAttribute('tabindex', '0');
  }

  private bindEvents(): void {
    // Prevent default drag behaviors globally
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('dragover', preventDefault);
    document.addEventListener('drop', preventDefault);

    if (this.options.headless) {
      this.container.addEventListener('click', (e) => {
        if (e.target === this.hiddenInput) {
          return;
        }
        e.stopPropagation();
        
        if (this.options.mode === 'browseFile') {
          this.openFilePicker();
        } else if (this.options.mode === 'browseFolder') {
          this.openFolderPicker();
        } else if (this.options.mode === 'camera') {
          this.cameraHandler.openCamera();
        }
      });

      if (this.options.mode === 'dropzone' || this.options.dragDrop) {
        this.container.addEventListener('dragover', (e) => {
          e.preventDefault();
          this.container.classList.add('quploader-dragover');
        });

        this.container.addEventListener('dragleave', (e) => {
          e.preventDefault();
          this.container.classList.remove('quploader-dragover');
        });

        this.container.addEventListener('drop', async (e: DragEvent) => {
          e.preventDefault();
          this.container.classList.remove('quploader-dragover');
          const dt = e.dataTransfer;
          if (!dt) return;

          if (this.options.allowFolder && dt.items) {
            const files: File[] = [];
            const promises: Promise<void>[] = [];
            let hasFolder = false;
            
            for (let i = 0; i < dt.items.length; i++) {
              const item = dt.items[i];
              if (item.kind === 'file') {
                const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
                if (entry) {
                  if (entry.isDirectory) hasFolder = true;
                  promises.push(this.readDropEntry(entry, files, ''));
                }
              }
            }
            
            await Promise.all(promises);
            if (files.length > 0) {
              this.handleFiles(files);
            } else if (hasFolder) {
              alert('Thư mục vừa thả vào trống hoặc không có file nào phù hợp.');
            }
          } else if (dt.files && dt.files.length > 0) {
            this.handleFiles(Array.from(dt.files));
          }
        });
      }

      this.hiddenInput.addEventListener('change', (e) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
          this.handleFiles(Array.from(input.files));
        } else if (this.hiddenInput.hasAttribute('webkitdirectory')) {
          alert('Thư mục này trống.');
        }
        input.value = ''; 
        if (this.options.mode !== 'browseFolder' && !this.options.allowFolder) {
          this.hiddenInput.removeAttribute('webkitdirectory');
        }
      });

      return;
    }

    this.container.addEventListener('paste', (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        this.handleFiles(Array.from(e.clipboardData.files));
      }
    });

    this.container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Prevent if clicked on a button, or the hidden input itself
      if (target.closest('button, input[type="file"]')) {
        return;
      }
      
      // If clicked inside the review area, check the option
      if (target.closest('.quploader-review-area')) {
        if (!this.options.clickReviewAreaToBrowse) {
          return;
        }
      }
      
      this.openFilePicker();
    });

    // Delegated click events for top-content buttons and delete button
    this.container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const browseBtn = target.closest('.quploader-btn-browse');
      if (browseBtn) {
        e.stopPropagation();
        this.openFilePicker();
        return;
      }

      const folderBtn = target.closest('.quploader-btn-folder');
      if (folderBtn) {
        e.stopPropagation();
        this.openFolderPicker();
        return;
      }

      const cameraBtn = target.closest('.quploader-btn-camera');
      if (cameraBtn) {
        e.stopPropagation();
        this.cameraHandler.openCamera();
        return;
      }

      const uploadBtn = target.closest('.quploader-btn-upload') as HTMLButtonElement;
      if (uploadBtn) {
        e.stopPropagation();
        this.files.forEach(f => {
          if (f.status === 'error') {
            f.status = 'pending';
            f.progress = 0;
            this.updateFileProgress(f.id!, 0);
          }
        });
        this.processUploadQueue();
        return;
      }

      // Delete Button in Review Area (delegated)
      const deleteBtn = target.closest('.quploader-btn-delete');
      if (deleteBtn) {
        e.stopPropagation();
        const item = deleteBtn.closest('.quploader-review-item') as HTMLElement;
        if (item) {
          const id = item.getAttribute('data-id');
          if (id) {
            this.removeFile(id);
          }
        }
        return;
      }
    });

    // File selection
    this.hiddenInput.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        this.handleFiles(Array.from(input.files));
      } else if (this.hiddenInput.hasAttribute('webkitdirectory')) {
        alert('Thư mục này trống.');
      }
      // Reset input so selecting the same file again triggers change
      input.value = ''; 
      // Reset webkitdirectory if not in folder picker mode
      if (this.options.mode !== 'browseFolder' && !this.options.allowFolder) {
        this.hiddenInput.removeAttribute('webkitdirectory');
      }
    });

    // Drag & Drop
    if (this.options.dragDrop) {
      this.container.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.container.classList.add('quploader-dragover');
      });

      this.container.addEventListener('dragleave', (e) => {
        e.preventDefault();
        this.container.classList.remove('quploader-dragover');
      });

      this.container.addEventListener('drop', async (e: DragEvent) => {
        e.preventDefault();
        this.container.classList.remove('quploader-dragover');
        const dt = e.dataTransfer;
        if (!dt) return;

        if (this.options.allowFolder && dt.items) {
          const files: File[] = [];
          const promises: Promise<void>[] = [];
          let hasFolder = false;
          
          for (let i = 0; i < dt.items.length; i++) {
            const item = dt.items[i];
            if (item.kind === 'file') {
              const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
              if (entry) {
                if (entry.isDirectory) hasFolder = true;
                promises.push(this.readDropEntry(entry, files, ''));
              }
            }
          }
          
          await Promise.all(promises);
          if (files.length > 0) {
            this.handleFiles(files);
          } else if (hasFolder) {
            alert('Thư mục vừa thả vào trống hoặc không có file nào phù hợp.');
          }
        } else if (dt.files && dt.files.length > 0) {
          this.handleFiles(Array.from(dt.files));
        }
      });
    }
  }

  private async openFilePicker(): Promise<void> {
    if (this.options.preferFileInput !== false) {
      this.hiddenInput.removeAttribute('webkitdirectory');
      this.hiddenInput.click();
      return;
    }

    const isSupported = 'showOpenFilePicker' in window;

    if (!isSupported) {
      this.hiddenInput.removeAttribute('webkitdirectory');
      this.hiddenInput.click();
      return;
    }

    try {
      const pickerOpts: any = {
        multiple: this.options.multiple
      };
      
      const types = this.buildPickerTypes();
      if (types) {
        pickerOpts.types = types;
      }

      const fileHandles = await (window as any).showOpenFilePicker(pickerOpts);
      const files: File[] = [];
      for (const handle of fileHandles) {
        const file = await handle.getFile();
        files.push(file);
      }
      if (files.length > 0) {
        this.handleFiles(files);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('File System API Error:', err);
        this.hiddenInput.removeAttribute('webkitdirectory');
        this.hiddenInput.click();
      }
    }
  }

  private buildPickerTypes(): any[] | undefined {
    return MimeHelper.buildPickerTypes(this.options.fileTypes || []);
  }

  private async openFolderPicker(): Promise<void> {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files = await this.getFilesFromDirectory(dirHandle, dirHandle.name);
        if (files.length > 0) {
          this.handleFiles(files);
        } else {
          alert('Thư mục này trống hoặc không có file nào phù hợp.');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Directory Picker Error:', err);
          this.hiddenInput.setAttribute('webkitdirectory', 'true');
          this.hiddenInput.click();
        }
      }
    } else {
      this.hiddenInput.setAttribute('webkitdirectory', 'true');
      this.hiddenInput.click();
    }
  }

  private async readDropEntry(entry: any, files: File[], path: string): Promise<void> {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file: File) => {
          (file as any).qRelativePath = path ? `${path}/${file.name}` : file.name;
          files.push(file);
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      
      if (this.options.subfolderLevel !== undefined) {
        const level = entryPath.split('/').length - 1;
        if (level > this.options.subfolderLevel) return;
      }

      return new Promise((resolve) => {
        dirReader.readEntries(async (entries: any[]) => {
          const promises = entries.map(e => this.readDropEntry(e, files, entryPath));
          await Promise.all(promises);
          resolve();
        });
      });
    }
  }

  private async getFilesFromDirectory(dirHandle: any, path = ''): Promise<File[]> {
    const files: File[] = [];
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        (file as any).qRelativePath = entryPath;
        files.push(file);
      } else if (entry.kind === 'directory') {
        if (this.options.subfolderLevel !== undefined) {
          const level = entryPath.split('/').length - 1;
          if (level > this.options.subfolderLevel) {
            continue;
          }
        }
        const subFiles = await this.getFilesFromDirectory(entry, entryPath);
        files.push(...subFiles);
      }
    }
    return files;
  }

  public currentFile(): QUploader.File | undefined {
    return this.files.length > 0 ? this.files[0] : undefined;
  }

  private attachFileMethods(file: QUploader.File): void {
    file.toBase64 = () => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    file.resize = (opts?: QUploader.ResizeOptions) => this.resizer.resizeImage(file, opts);

    file.toResizedBase64 = async (opts?: QUploader.ResizeOptions) => {
      const resized = await this.resizer.resizeImage(file, opts);
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resized);
      });
    };
  }

  public async handleFiles(newFiles: File[]): Promise<void> {
    if (this.options.onPick) {
      this.options.onPick(newFiles);
    }

    if (!this.options.multiple && newFiles.length > 0) {
      // Keep only the first file, clean up existing files properly
      const oldFiles = [...this.files];
      for (const f of oldFiles) {
        this.removeFile(f.id!, true); // Force delete local UI immediately
      }
      newFiles = [newFiles[0]];
    }

    let addedCount = 0;
    const validationErrors: string[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      let file: QUploader.File = newFiles[i] as QUploader.File;

      // Subfolder filtering
      if (this.shouldFilterSubfolder(file)) {
        continue;
      }

      // Validation Rules (BEFORE adding to UI)
      const errorMsg = this.validator.validateFile(file);
      if (errorMsg) {
        validationErrors.push(`<b>${file.name}</b>: ${errorMsg}`);
        if (this.options.onError) this.options.onError(file, errorMsg);
        continue;
      }

      addedCount++;

      // We immediately append it to UI
      file.id = 'qfile_' + Math.random().toString(36).substr(2, 9);
      file.status = 'pending';
      file.progress = 0;
      
      this.attachFileMethods(file);
      this.files.push(file);
      this.reviewHandler.renderReviewItem(file);

      // Resize Image if needed
      if (this.options.resize && file.type.startsWith('image/')) {
        try {
          const resizedFile = await this.resizer.resizeImage(file);
          if (resizedFile !== file) {
            const index = this.files.findIndex(f => f.id === file.id);
            if (index > -1) {
              this.files[index] = resizedFile;
            }
            file = resizedFile;
            this.attachFileMethods(file);
          }
          if (this.options.onResize) this.options.onResize(file);
        } catch (e) {
          console.error('Image resize failed:', e);
        }
      }
    }

    if (validationErrors.length > 0) {
      this.showGlobalError(validationErrors.join('<br>'));
    }

    if (addedCount === 0 && newFiles.length > 0 && validationErrors.length === 0) {
      alert('Không có file nào được thêm vào (tất cả các file đều vượt quá giới hạn Subfolder Level).');
    }

    this.updateUploadButtonState();
    
    if (this.options.autoUpload) {
      this.processUploadQueue();
    }
  }

  private shouldFilterSubfolder(file: QUploader.File): boolean {
    const relativePath = file.webkitRelativePath || (file as any).qRelativePath;
    if (this.options.subfolderLevel !== undefined && relativePath) {
      const parts = relativePath.split('/');
      const fileLevel = parts.length - 2;
      if (fileLevel > this.options.subfolderLevel) {
        return true;
      }
    }
    return false;
  }

  public showGlobalError(htmlContent: string): void {
    if (this.options.headless) return;
    this.globalErrorBox.innerHTML = htmlContent;
    this.globalErrorBox.style.display = 'block';
    
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    
    if (this.options.errorDelay && this.options.errorDelay > 0) {
      this.errorTimeout = setTimeout(() => {
        this.globalErrorBox.style.display = 'none';
        this.globalErrorBox.innerHTML = '';
      }, this.options.errorDelay);
    }
  }

  public updateUploadButtonState(): void {
    if (this.options.headless) return;
    const uploadBtn = this.container.querySelector('.quploader-btn-upload') as HTMLButtonElement;
    if (!uploadBtn) return;

    if (this.options.autoUpload || !this.options.uploadUrl) {
      uploadBtn.style.display = 'none';
      return;
    }
    const hasPending = this.files.some(f => f.status === 'pending' || f.status === 'error');
    uploadBtn.disabled = !hasPending;
    
    if (this.files.length > 0) {
      uploadBtn.style.display = 'inline-block';
    } else {
      uploadBtn.style.display = 'none';
    }
  }

  public async processUploadQueue(): Promise<void> {
    if (this.isUploading) return;
    this.isUploading = true;

    while (true) {
      const nextFile = this.files.find(f => f.status === 'pending');
      if (!nextFile) break;

      await this.serverHandler.uploadFile(nextFile);
    }

    this.isUploading = false;
    this.updateUploadButtonState();
  }
  public updateFileProgress(fileId: string, percent: number): void {
    this.reviewHandler.updateFileProgress(fileId, percent);
  }

  public updateFileStatus(id: string, status: 'pending' | 'uploading' | 'success' | 'error', errorMsg?: string): void {
    const file = this.files.find(f => f.id === id);
    if (file) {
      file.status = status;
      if (status === 'error' && errorMsg) {
         this.showGlobalError(`<b>${file.name}</b>: ${errorMsg}`);
      }
    }
  }

  public async removeFile(fileId: string, force = false): Promise<void> {
    return this.serverHandler.removeFile(fileId, force);
  }

  public uploadAll(): void {
    this.files.forEach(f => {
      if (f.status === 'error' || f.status === 'pending') {
        f.status = 'pending';
        f.progress = 0;
        this.updateFileProgress(f.id!, 0);
      }
    });
    this.processUploadQueue();
  }

  public clearQueue(): void {
    const oldFiles = [...this.files];
    oldFiles.forEach(f => this.removeFile(f.id!, true));
  }

  public getFiles(): QUploader.File[] {
    return this.files;
  }

  public browseFile(): void {
    this.openFilePicker();
  }

  public browseFolder(): void {
    this.openFolderPicker();
  }

  public camera(): void {
    this.cameraHandler.openCamera();
  }
}



namespace QUploader {
  export type ResizeOptions = Types.QUploader.ResizeOptions;
  export type Options = Types.QUploader.Options;
  export type File = Types.QUploader.File;
}

export { QUploader };
