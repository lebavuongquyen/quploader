import quploaderCss from './quploader.css?inline';
import $ from 'jquery';
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

declare global {
  interface JQuery {
    quploader(options?: Partial<QUploader.Options>): JQuery;
    quploader(methodName: string, ...args: any[]): any;
  }
}

class QUploader implements Types.QUploader.CoreContext {
  private $element: JQuery;
  public $container!: JQuery;
  private $hiddenInput!: JQuery;
  public $reviewArea!: JQuery;
  private $globalErrorBox!: JQuery;
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
    this.$element = $(element);
    
    // Default options
    this.options = $.extend({
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
    } else if (this.$element.is('input[type="file"]')) {
      const acceptAttr = this.$element.attr('accept');
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
      this.$container = this.$element;
      if (this.$element.is('input[type="file"]')) {
        this.$hiddenInput = this.$element;
        this.$hiddenInput.hide();
      } else {
        this.$hiddenInput = $('<input type="file" style="display: none;" />');
        $('body').append(this.$hiddenInput);
      }

      if (this.options.multiple) {
        this.$hiddenInput.attr('multiple', 'multiple');
      }
      if (this.options.fileTypes && this.options.fileTypes.length > 0) {
        this.$hiddenInput.attr('accept', this.options.fileTypes.join(','));
      }
      
      this.$reviewArea = $();
      this.$globalErrorBox = $();
      return;
    }

    // 1. Container Logic
    if (this.$element.is('input[type="file"]')) {
      this.$container = $('<div class="quploader-container"></div>');
      if (this.options.containerClass) {
         this.$container.addClass(this.options.containerClass);
      }
      this.$element.wrap(this.$container);
      this.$container = this.$element.parent();
      this.$hiddenInput = this.$element;
      this.$hiddenInput.hide();
    } else {
      this.$container = this.$element;
      this.$container.addClass('quploader-container');
      if (this.options.containerClass) {
        this.$container.addClass(this.options.containerClass);
      }
      this.$hiddenInput = $('<input type="file" style="display: none;" />');
      this.$container.append(this.$hiddenInput);
    }

    if (this.options.multiple) {
      this.$hiddenInput.attr('multiple', 'multiple');
    }
    if (this.options.fileTypes && this.options.fileTypes.length > 0) {
      this.$hiddenInput.attr('accept', this.options.fileTypes.join(','));
    }

    // 2. Default Content Elements
    const $topContent = $('<div class="quploader-top-content"></div>');
    
    if (this.options.showIntroText) {
      let text = '';
      if (this.options.dragDrop) {
        text = this.options.browseButton ? 'Drop files here' : 'Drop files here or click to browse';
      } else {
        text = this.options.browseButton ? '' : 'Click to browse';
      }
      if (text) {
        $topContent.append(`<div class="quploader-intro">${text}</div>`);
      }
    }

    const $buttonsGroup = $('<div class="quploader-buttons-group"></div>');
    const useIcon = this.options.useIcon;

    if (this.options.browseButton) {
      const label = useIcon ? IconProvider.getBrowseIcon() : 'Browse File';
      const $browseBtn = $(`<button type="button" class="quploader-btn-browse" title="Browse File">${label}</button>`);
      if (useIcon) $browseBtn.addClass('quploader-btn-icon-mode');
      $buttonsGroup.append($browseBtn);
    }

    if (this.options.allowFolder) {
      const label = useIcon ? IconProvider.getFolderIcon() : 'Browse Folder';
      const $folderBtn = $(`<button type="button" class="quploader-btn-folder" title="Browse Folder">${label}</button>`);
      if (useIcon) $folderBtn.addClass('quploader-btn-icon-mode');
      $buttonsGroup.append($folderBtn);
    }

    if (this.options.cameraButton) {
      const label = useIcon ? IconProvider.getCameraIcon() : 'Camera';
      const $cameraBtn = $(`<button type="button" class="quploader-btn-camera" title="Camera">${label}</button>`);
      if (useIcon) $cameraBtn.addClass('quploader-btn-icon-mode');
      $buttonsGroup.append($cameraBtn);
    }

    if (!this.options.autoUpload && this.options.uploadUrl) {
      const label = useIcon ? IconProvider.getUploadIcon() : 'Upload All';
      const $uploadBtn = $(`<button type="button" class="quploader-btn-upload" disabled style="display: none;" title="Upload All">${label}</button>`);
      if (useIcon) $uploadBtn.addClass('quploader-btn-icon-mode');
      $buttonsGroup.append($uploadBtn);
    }

    if ($buttonsGroup.children().length > 0) {
      $topContent.append($buttonsGroup);
    }
    
    // Add top content to container if it has children
    if ($topContent.children().length > 0) {
      this.$container.prepend($topContent);
    }

    if (this.options.reviewMode === 'single') {
      this.$container.addClass('quploader-mode-single');
    }

    // 3. Review Area
    if (this.options.reviewPosition !== 'none') {
      this.$reviewArea = $('<div class="quploader-review-area"></div>');
      if (this.options.reviewMode === 'detail') {
        this.$reviewArea.addClass('quploader-detail');
      }
      if (this.options.clickReviewAreaToBrowse) {
        this.$reviewArea.addClass('quploader-review-clickable');
      }
      if (this.options.reviewPosition === 'above') {
        this.$container.prepend(this.$reviewArea);
      } else {
        this.$container.append(this.$reviewArea);
      }
    }

    this.$globalErrorBox = $('<div class="quploader-global-error" style="display: none;"></div>');
    this.$container.append(this.$globalErrorBox);

    this.$container.attr('tabindex', '0');
  }

  private bindEvents(): void {
    // Prevent default drag behaviors globally, namespace to avoid multiple bindings
    $(document).off('dragover.quploader drop.quploader').on('dragover.quploader drop.quploader', (e) => {
      e.preventDefault();
    });

    if (this.options.headless) {
      this.$container.on('click', (e) => {
        if ($(e.target).is(this.$hiddenInput)) {
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
        this.$container.on('dragover', (e) => {
          e.preventDefault();
          this.$container.addClass('quploader-dragover');
        });

        this.$container.on('dragleave', (e) => {
          e.preventDefault();
          this.$container.removeClass('quploader-dragover');
        });

        this.$container.on('drop', async (e) => {
          e.preventDefault();
          this.$container.removeClass('quploader-dragover');
          const dt = (e.originalEvent as DragEvent).dataTransfer;
          if (!dt) return;

          if (this.options.allowFolder && dt.items) {
            const files: File[] = [];
            const promises: Promise<void>[] = [];
            let hasFolder = false;
            
            for (let i = 0; i < dt.items.length; i++) {
              const item = dt.items[i];
              if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
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

      this.$hiddenInput.on('change', (e) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
          this.handleFiles(Array.from(input.files));
        } else if (this.$hiddenInput.attr('webkitdirectory')) {
          alert('Thư mục này trống.');
        }
        input.value = ''; 
        if (this.options.mode !== 'browseFolder' && !this.options.allowFolder) {
          this.$hiddenInput.removeAttr('webkitdirectory');
        }
      });

      return;
    }

    this.$container.on('paste', (e) => {
      const originalEvent = e.originalEvent as ClipboardEvent;
      if (originalEvent && originalEvent.clipboardData && originalEvent.clipboardData.files.length > 0) {
        this.handleFiles(Array.from(originalEvent.clipboardData.files));
      }
    });

    this.$container.on('click', (e) => {
      // Prevent if clicked on a button, or the hidden input itself
      if ($(e.target).closest('button, input[type="file"]').length > 0) {
        return;
      }
      
      // If clicked inside the review area, check the option
      if ($(e.target).closest('.quploader-review-area').length > 0) {
        if (!this.options.clickReviewAreaToBrowse) {
          return;
        }
      }
      
      this.openFilePicker();
    });

    this.$container.on('click', '.quploader-btn-browse', (e) => {
      e.stopPropagation();
      this.openFilePicker();
    });

    this.$container.on('click', '.quploader-btn-folder', (e) => {
      e.stopPropagation();
      this.openFolderPicker();
    });

    // Camera Button
    this.$container.on('click', '.quploader-btn-camera', (e) => {
      e.stopPropagation();
      this.cameraHandler.openCamera();
    });

    this.$container.on('click', '.quploader-btn-upload', (e) => {
      e.stopPropagation();
      this.files.forEach(f => {
        if (f.status === 'error') {
          f.status = 'pending';
          f.progress = 0;
          this.updateFileProgress(f.id!, 0);
        }
      });
      this.processUploadQueue();
    });

    // File selection
    this.$hiddenInput.on('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        this.handleFiles(Array.from(input.files));
      } else if (this.$hiddenInput.attr('webkitdirectory')) {
        alert('Thư mục này trống.');
      }
      // Reset input so selecting the same file again triggers change
      input.value = ''; 
      // Reset webkitdirectory if not in folder picker mode
      if (this.options.mode !== 'browseFolder' && !this.options.allowFolder) {
        this.$hiddenInput.removeAttr('webkitdirectory');
      }
    });

    // Drag & Drop
    if (this.options.dragDrop) {
      this.$container.on('dragover', (e) => {
        e.preventDefault();
        this.$container.addClass('quploader-dragover');
      });

      this.$container.on('dragleave', (e) => {
        e.preventDefault();
        this.$container.removeClass('quploader-dragover');
      });

      this.$container.on('drop', async (e) => {
        e.preventDefault();
        this.$container.removeClass('quploader-dragover');
        const dt = (e.originalEvent as DragEvent).dataTransfer;
        if (!dt) return;

        if (this.options.allowFolder && dt.items) {
          const files: File[] = [];
          const promises: Promise<void>[] = [];
          let hasFolder = false;
          
          for (let i = 0; i < dt.items.length; i++) {
            const item = dt.items[i];
            if (item.kind === 'file') {
              const entry = item.webkitGetAsEntry();
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
    
    // Delete Button in Review Area
    this.$container.on('click', '.quploader-btn-delete', (e) => {
      e.stopPropagation();
      const $item = $(e.target).closest('.quploader-review-item');
      const id = $item.data('id');
      this.removeFile(id);
    });
  }

  private async openFilePicker(): Promise<void> {
    if (this.options.preferFileInput !== false) {
      this.$hiddenInput.removeAttr('webkitdirectory');
      this.$hiddenInput.trigger('click');
      return;
    }

    const isSupported = 'showOpenFilePicker' in window;

    if (!isSupported) {
      this.$hiddenInput.removeAttr('webkitdirectory');
      this.$hiddenInput.trigger('click');
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
        this.$hiddenInput.removeAttr('webkitdirectory');
        this.$hiddenInput.trigger('click');
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
          this.$hiddenInput.attr('webkitdirectory', 'true');
          this.$hiddenInput.trigger('click');
        }
      }
    } else {
      this.$hiddenInput.attr('webkitdirectory', 'true');
      this.$hiddenInput.trigger('click');
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
    this.$globalErrorBox.html(htmlContent).fadeIn(200);
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    
    if (this.options.errorDelay && this.options.errorDelay > 0) {
      this.errorTimeout = setTimeout(() => {
        this.$globalErrorBox.fadeOut(300, () => this.$globalErrorBox.empty());
      }, this.options.errorDelay);
    }
  }

  public updateUploadButtonState(): void {
    if (this.options.headless) return;
    if (this.options.autoUpload || !this.options.uploadUrl) {
      this.$container.find('.quploader-btn-upload').hide();
      return;
    }
    const hasPending = this.files.some(f => f.status === 'pending' || f.status === 'error');
    const $btn = this.$container.find('.quploader-btn-upload');
    $btn.prop('disabled', !hasPending);
    
    if (this.files.length > 0) {
      $btn.show();
    } else {
      $btn.hide();
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

// Register jQuery Plugin
$.fn.quploader = function(options?: any, ...args: any[]) {
  if (typeof options === 'string') {
    let returnValue: any = this;
    const headlessModes = ['browseFile', 'browseFolder', 'camera', 'dropzone'];
    this.each(function() {
      let instance = $.data(this, 'plugin_quploader');
      
      // If not initialized and is a headless mode method, initialize it
      if (!instance && headlessModes.includes(options)) {
        const config = $.extend({}, typeof args[0] === 'object' ? args[0] : {}, {
          headless: true,
          mode: options
        });
        instance = new QUploader(this, config);
        $.data(this, 'plugin_quploader', instance);
      }
      
      if (instance && typeof (instance as any)[options] === 'function') {
        const hasConfig = args.length > 0 && typeof args[0] === 'object';
        if (!hasConfig || (instance as any)._initializedBefore) {
          const methodArgs = hasConfig ? args.slice(1) : args;
          const res = (instance as any)[options].apply(instance, methodArgs);
          if (returnValue === this) {
            returnValue = res;
          }
        }
        (instance as any)._initializedBefore = true;
      }
    });
    return returnValue;
  }
  return this.each(function() {
    if (!$.data(this, 'plugin_quploader')) {
      const uploader = new QUploader(this, options);
      (uploader as any)._initializedBefore = true;
      $.data(this, 'plugin_quploader', uploader);
    }
  });
};

namespace QUploader {
  export type ResizeOptions = Types.QUploader.ResizeOptions;
  export type Options = Types.QUploader.Options;
  export type File = Types.QUploader.File;
}

export { QUploader };
