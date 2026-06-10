import { QUploader } from '../types';
import { MimeHelper } from '../mime-helper';

export class ReviewHandler {
  private ctx: QUploader.CoreContext;

  constructor(ctx: QUploader.CoreContext) {
    this.ctx = ctx;
  }

  private getFileIcon(file: QUploader.File): string {
    return MimeHelper.getFileIcon(file.type, file.name);
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  public renderReviewItem(file: QUploader.File): void {
    if (this.ctx.options.headless) return;
    if (this.ctx.options.reviewMode === 'single' && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      this.ctx.container.style.backgroundImage = `url("${url}")`;
      this.ctx.container.style.backgroundSize = this.ctx.options.singleModeFit || 'cover';
    }

    if (!this.ctx.reviewArea) return;
    
    const item = document.createElement('div');
    item.className = 'quploader-review-item';
    item.setAttribute('data-id', file.id || '');
    
    if (this.ctx.options.reviewMode === 'detail') {
      item.classList.add('quploader-detail-item');
      
      let iconHtml = '';
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        iconHtml = `<img src="${url}" class="quploader-detail-thumb" />`;
      } else {
        iconHtml = `<span class="quploader-detail-type-icon">${this.getFileIcon(file)}</span>`;
      }

      const formattedSize = this.formatSize(file.size);
      const formattedDate = file.lastModified ? this.formatDate(file.lastModified) : 'Unknown Date';

      item.innerHTML = `
        <div class="quploader-detail-icon">${iconHtml}</div>
        <div class="quploader-detail-info">
          <div class="quploader-detail-name" title="${file.name}">${file.name}</div>
          <div class="quploader-detail-meta">
            <span class="quploader-detail-size">${formattedSize}</span>
            <span class="quploader-detail-divider">|</span>
            <span class="quploader-detail-date">${formattedDate}</span>
          </div>
        </div>
        ${this.ctx.options.progressBar ? `
          <div class="quploader-progress">
             <div class="quploader-progress-bar" style="width: 0%"></div>
          </div>
        ` : ''}
        ${this.ctx.options.allowDelete !== false ? `<button type="button" class="quploader-btn-delete">×</button>` : ''}
      `;
    } else {
      // Preview for images
      let contentHtml = '';
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        if (this.ctx.options.reviewMode !== 'single') {
          contentHtml += `<img src="${url}" class="quploader-thumb" />`;
        }
      } else {
        if (this.ctx.options.reviewMode !== 'single') {
          contentHtml += `<div class="quploader-file-icon">${this.getFileIcon(file)}</div>`;
        }
      }

      if (this.ctx.options.showFileName !== false) {
        if (this.ctx.options.reviewMode !== 'single') {
          contentHtml += `<div class="quploader-file-name" title="${file.name}">${file.name}</div>`;
        }
      }

      if (this.ctx.options.progressBar) {
         contentHtml += `
           <div class="quploader-progress">
              <div class="quploader-progress-bar" style="width: 0%"></div>
           </div>
         `;
      }
      
      if (this.ctx.options.allowDelete !== false) {
        contentHtml += `<button type="button" class="quploader-btn-delete">×</button>`;
      }
      item.innerHTML = contentHtml;
    }

    if (!this.ctx.options.multiple) {
      this.ctx.reviewArea.innerHTML = '';
    }
    this.ctx.reviewArea.appendChild(item);
  }

  public updateFileProgress(fileId: string, percent: number): void {
    if (this.ctx.options.headless) return;
    if (!this.ctx.reviewArea) return;
    const item = this.ctx.reviewArea.querySelector(`.quploader-review-item[data-id="${fileId}"]`) as HTMLElement;
    if (item) {
      const progressBar = item.querySelector('.quploader-progress-bar') as HTMLElement;
      if (progressBar) {
        progressBar.style.width = `${percent}%`;
      }
      if (percent === 100) {
        item.classList.add('quploader-success');
      }
    }
  }
}
