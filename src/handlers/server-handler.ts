import { QUploader } from '../types';

export class ServerHandler {
  private ctx: QUploader.CoreContext;

  constructor(ctx: QUploader.CoreContext) {
    this.ctx = ctx;
  }

  public uploadFile(file: QUploader.File): Promise<void> {
    if (!file.uploadId) {
      file.uploadId = 'up_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    }
    return new Promise((resolve) => {
      if (this.ctx.options.chunkUploadUrl && this.ctx.options.chunkSize && file.size > (this.ctx.options.chunkSize as number)) {
        this.uploadChunkedFile(file).then(resolve);
        return;
      }

      if (!this.ctx.options.uploadUrl) {
        console.warn('QUploader: uploadUrl is not defined');
        file.status = 'error';
        resolve();
        return;
      }

      file.status = 'uploading';
      if (this.ctx.options.onUploadStart) this.ctx.options.onUploadStart(file);

      if (this.ctx.options.uploadAsBase64) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = reader.result as string;

          const xhr = new XMLHttpRequest();
          file._xhr = xhr;
          xhr.open('POST', this.ctx.options.uploadUrl!, true);
          xhr.setRequestHeader('Content-Type', 'application/json');

          this.setupXHREvents(xhr, file, resolve);

          const payload = {
            fileName: file.name,
            fileType: file.type,
            base64: base64Data,
            uploadId: file.uploadId,
            relativePath: file.webkitRelativePath || (file as any).qRelativePath || undefined
          };

          if (this.ctx.options.onBeforeUpload) {
            this.ctx.options.onBeforeUpload(file, payload);
          }

          let dataToSend: any = payload;
          if (this.ctx.options.prepareUploadData) {
            dataToSend = this.ctx.options.prepareUploadData(file);
            if (typeof dataToSend === 'object' && !(dataToSend instanceof FormData)) {
              dataToSend.uploadId = file.uploadId;
              dataToSend = JSON.stringify(dataToSend);
            }
          } else {
            dataToSend = JSON.stringify(payload);
          }

          xhr.send(dataToSend);
        };

        reader.onerror = () => {
          this.handleUploadError(file, 'Read File Error');
          resolve();
        };

        reader.readAsDataURL(file);
        return;
      }

      let formData: any;
      if (this.ctx.options.prepareUploadData) {
        formData = this.ctx.options.prepareUploadData(file);
      } else {
        formData = new FormData();
        formData.append('file', file);
      }

      const relPath = file.webkitRelativePath || (file as any).qRelativePath;
      if (this.ctx.options.allowFolder && relPath) {
        formData.append('relativePath', relPath);
      }
      
      if (file.uploadId) {
        if (formData instanceof FormData) {
          formData.append('uploadId', file.uploadId);
        } else if (typeof formData === 'object' && formData !== null) {
          formData.uploadId = file.uploadId;
        }
      }
      
      if (this.ctx.options.onBeforeUpload) {
        this.ctx.options.onBeforeUpload(file, formData);
      }

      const xhr = new XMLHttpRequest();
      file._xhr = xhr;
      xhr.open('POST', this.ctx.options.uploadUrl, true);

      this.setupXHREvents(xhr, file, resolve);

      xhr.send(formData);
    });
  }

  private setupXHREvents(xhr: XMLHttpRequest, file: QUploader.File, resolve: () => void): void {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        file.progress = percent;
        this.ctx.updateFileProgress(file.id!, percent);
        if (this.ctx.options.onProgress) this.ctx.options.onProgress(file, percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        file.status = 'success';
        this.ctx.updateFileProgress(file.id!, 100);
        
        let response: any = xhr.responseText;
        try { response = JSON.parse(response); } catch(e) {}
        
        if (typeof response === 'object' && response !== null && response.key) {
           file.serverKey = response.key;
         }

        if (this.ctx.options.onSuccess) this.ctx.options.onSuccess(file, response);
        this.ctx.updateUploadButtonState();
        resolve();
      } else {
        this.handleUploadError(file, xhr.statusText);
        resolve();
      }
    };

    xhr.onerror = () => {
      this.handleUploadError(file, 'Network Error');
      resolve();
    };

    xhr.onabort = () => {
      resolve();
    };
  }

  private async uploadChunkedFile(file: QUploader.File): Promise<void> {
    if (!this.ctx.options.chunkUploadUrl || !this.ctx.options.chunkSize) {
      file.status = 'error';
      return;
    }

    file.status = 'uploading';
    if (this.ctx.options.onUploadStart) this.ctx.options.onUploadStart(file);

    const chunkSize = this.ctx.options.chunkSize as number;
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    const fileKey = `quploader_resume_${file.name}_${file.size}_${file.lastModified}`;
    let currentChunk = 0;
    if (this.ctx.options.resumable !== false) {
      const savedIndex = localStorage.getItem(fileKey);
      if (savedIndex) {
        currentChunk = parseInt(savedIndex, 10) + 1;
      }
    }

    const maxRetries = this.ctx.options.retry || 3;
    let retries = 0;
    
    file._abortController = new AbortController();

    const uploadNextChunk = async (): Promise<void> => {
      if (currentChunk >= totalChunks) {
        file.status = 'success';
        this.ctx.updateFileProgress(file.id!, 100);
        if (this.ctx.options.resumable !== false) {
          localStorage.removeItem(fileKey);
        }
        if (this.ctx.options.onSuccess) this.ctx.options.onSuccess(file, { success: true, chunks: totalChunks });
        this.ctx.updateUploadButtonState();
        return;
      }

      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      let dataToSend: any;
      const relPath = file.webkitRelativePath || (file as any).qRelativePath;

      if (this.ctx.options.uploadAsBase64) {
        const chunkBase64 = await new Promise<string>((resolveChunk, rejectChunk) => {
          const reader = new FileReader();
          reader.onload = () => resolveChunk(reader.result as string);
          reader.onerror = () => rejectChunk(new Error('Read chunk error'));
          reader.readAsDataURL(chunk);
        });

        const payload = {
          fileName: file.name,
          chunkIndex: currentChunk.toString(),
          totalChunks: totalChunks.toString(),
          base64: chunkBase64,
          uploadId: file.uploadId,
          relativePath: relPath || undefined
        };

        if (this.ctx.options.onBeforeUpload) {
          this.ctx.options.onBeforeUpload(file, payload);
        }

        if (this.ctx.options.prepareUploadData) {
          dataToSend = this.ctx.options.prepareUploadData(chunk as File);
          if (typeof dataToSend === 'object') {
            dataToSend.uploadId = file.uploadId;
            dataToSend = JSON.stringify(dataToSend);
          }
        } else {
          dataToSend = JSON.stringify(payload);
        }
      } else {
        if (this.ctx.options.prepareUploadData) {
          dataToSend = this.ctx.options.prepareUploadData(chunk as File);
          dataToSend.append('fileName', file.name);
          dataToSend.append('chunkIndex', currentChunk.toString());
          dataToSend.append('totalChunks', totalChunks.toString());
          dataToSend.append('uploadId', file.uploadId);
        } else {
          dataToSend = new FormData();
          dataToSend.append('file', chunk, file.name);
          dataToSend.append('fileName', file.name);
          dataToSend.append('chunkIndex', currentChunk.toString());
          dataToSend.append('totalChunks', totalChunks.toString());
          dataToSend.append('uploadId', file.uploadId);
        }

        if (this.ctx.options.allowFolder && relPath) {
          dataToSend.append('relativePath', relPath);
        }

        if (this.ctx.options.onBeforeUpload) {
          this.ctx.options.onBeforeUpload(file, dataToSend);
        }
      }

      try {
        const headers: Record<string, string> = {};
        if (this.ctx.options.uploadAsBase64) {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(this.ctx.options.chunkUploadUrl!, {
          method: 'POST',
          body: dataToSend,
          headers: headers,
          signal: file._abortController!.signal
        });

        if (response.ok) {
          const resData = await response.json().catch(() => ({}));
          if (resData && resData.key) {
             file.serverKey = resData.key;
          }

          if (this.ctx.options.resumable !== false) {
            localStorage.setItem(fileKey, currentChunk.toString());
          }

          currentChunk++;
          retries = 0;
          const percent = Math.round((currentChunk / totalChunks) * 100);
          file.progress = percent;
          this.ctx.updateFileProgress(file.id!, percent);
          if (this.ctx.options.onProgress) this.ctx.options.onProgress(file, percent);
          
          if (currentChunk >= totalChunks) {
            file.status = 'success';
            this.ctx.updateFileProgress(file.id!, 100);
            if (this.ctx.options.resumable !== false) {
              localStorage.removeItem(fileKey);
            }
            if (this.ctx.options.onSuccess) this.ctx.options.onSuccess(file, resData);
            this.ctx.updateUploadButtonState();
          } else {
            await uploadNextChunk();
          }
        } else {
          throw new Error('Upload failed with status ' + response.status);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
           return; 
        }
        if (retries < maxRetries) {
          retries++;
          console.warn(`Chunk ${currentChunk} failed, retrying (${retries}/${maxRetries})...`);
          await uploadNextChunk();
        } else {
          this.handleUploadError(file, err.message || 'Chunk upload failed');
        }
      }
    };

    await uploadNextChunk();
  }

  public handleUploadError(file: QUploader.File, errorMsg: string): void {
    file.status = 'error';
    let domUpdated = false;
    if (this.ctx.reviewArea) {
      const item = this.ctx.reviewArea.querySelector(`.quploader-review-item[data-id="${file.id}"]`) as HTMLElement;
      if (item) {
        domUpdated = true;
        item.classList.add('quploader-error');
        if (!item.querySelector('.quploader-error-msg')) {
          item.insertAdjacentHTML('beforeend', `<div class="quploader-error-msg" title="${errorMsg}">${errorMsg}</div>`);
        }
      }
    }
    
    if (!domUpdated) {
       this.ctx.showGlobalError(`<b>${file.name}</b>: ${errorMsg}`);
    }

    if (this.ctx.options.onError) this.ctx.options.onError(file, errorMsg);
    this.ctx.updateUploadButtonState();
  }

  public async removeFile(fileId: string, force = false): Promise<void> {
    const index = this.ctx.files.findIndex(f => f.id === fileId);
    if (index === -1) return;
    const file = this.ctx.files[index];

    if (!force && this.ctx.options.onBeforeDelete) {
      if (this.ctx.options.onBeforeDelete(file) === false) return;
    }

    if (file.status === 'uploading') {
      if (file._xhr) file._xhr.abort();
      if (file._abortController) file._abortController.abort();
      file.status = 'error'; // aborted
      if (this.ctx.options.onCancel) this.ctx.options.onCancel(file);

      if (this.ctx.options.cancelUrl && file.uploadId) {
        fetch(this.ctx.options.cancelUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: file.uploadId, fileName: file.name })
        }).catch(err => console.error('Failed to notify server of cancellation:', err));
      }
    } else if (file.serverKey && this.ctx.options.deleteUrl) {
      const deletePromise = fetch(this.ctx.options.deleteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: file.serverKey })
      }).then(async res => {
        if (!res.ok) throw new Error('Server delete failed');
        const data = await res.json().catch(() => ({}));
        if (this.ctx.options.onServerDeleted) this.ctx.options.onServerDeleted(file, data);
      });

      if (!force) {
        try {
          await deletePromise;
        } catch (e) {
          this.handleUploadError(file, 'Delete failed on server');
          return; // Block UI removal
        }
      }
    }

    const removeIdx = this.ctx.files.findIndex(f => f.id === fileId);
    if (removeIdx > -1) {
      const removedFile = this.ctx.files[removeIdx];
      if (this.ctx.options.resumable !== false) {
        const fileKey = `quploader_resume_${removedFile.name}_${removedFile.size}_${removedFile.lastModified}`;
        localStorage.removeItem(fileKey);
      }
      this.ctx.files.splice(removeIdx, 1);
    }
    
    if (this.ctx.reviewArea) {
      const item = this.ctx.reviewArea.querySelector(`.quploader-review-item[data-id="${fileId}"]`);
      if (item) item.remove();
    }
    
    if (this.ctx.options.reviewMode === 'single' && this.ctx.files.length === 0) {
      this.ctx.container.style.backgroundImage = '';
    }

    if (this.ctx.options.onDeleted) this.ctx.options.onDeleted(file);
    this.ctx.updateUploadButtonState();
  }
}
