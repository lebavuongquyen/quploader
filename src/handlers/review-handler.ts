import { QUploader } from '../types';
import $ from 'jquery';
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
      this.ctx.$container.css({
        'background-image': `url("${url}")`,
        'background-size': this.ctx.options.singleModeFit || 'cover'
      });
    }

    if (!this.ctx.$reviewArea) return;
    
    const $item = $(`<div class="quploader-review-item" data-id="${file.id}"></div>`);
    
    if (this.ctx.options.reviewMode === 'detail') {
      $item.addClass('quploader-detail-item');
      
      let iconHtml = '';
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        iconHtml = `<img src="${url}" class="quploader-detail-thumb" />`;
      } else {
        iconHtml = `<span class="quploader-detail-type-icon">${this.getFileIcon(file)}</span>`;
      }

      const formattedSize = this.formatSize(file.size);
      const formattedDate = file.lastModified ? this.formatDate(file.lastModified) : 'Unknown Date';

      $item.append(`
        <div class="quploader-detail-icon">${iconHtml}</div>
        <div class="quploader-detail-info">
          <div class="quploader-detail-name" title="${file.name}">${file.name}</div>
          <div class="quploader-detail-meta">
            <span class="quploader-detail-size">${formattedSize}</span>
            <span class="quploader-detail-divider">|</span>
            <span class="quploader-detail-date">${formattedDate}</span>
          </div>
        </div>
      `);

      if (this.ctx.options.progressBar) {
        $item.append(`
          <div class="quploader-progress">
             <div class="quploader-progress-bar" style="width: 0%"></div>
          </div>
        `);
      }

      if (this.ctx.options.allowDelete !== false) {
        $item.append(`<button type="button" class="quploader-btn-delete">×</button>`);
      }
    } else {
      // Preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        if (this.ctx.options.reviewMode !== 'single') {
          $item.append(`<img src="${url}" class="quploader-thumb" />`);
        }
      } else {
        if (this.ctx.options.reviewMode !== 'single') {
          $item.append(`<div class="quploader-file-icon">${this.getFileIcon(file)}</div>`);
        }
      }

      if (this.ctx.options.showFileName !== false) {
        if (this.ctx.options.reviewMode !== 'single') {
          $item.append(`<div class="quploader-file-name" title="${file.name}">${file.name}</div>`);
        }
      }

      if (this.ctx.options.progressBar) {
         $item.append(`
           <div class="quploader-progress">
              <div class="quploader-progress-bar" style="width: 0%"></div>
           </div>
         `);
      }
      
      if (this.ctx.options.allowDelete !== false) {
        $item.append(`<button type="button" class="quploader-btn-delete">×</button>`);
      }
    }

    if (!this.ctx.options.multiple) {
      this.ctx.$reviewArea.empty();
    }
    this.ctx.$reviewArea.append($item);
  }

  public updateFileProgress(fileId: string, percent: number): void {
    if (this.ctx.options.headless) return;
    if (!this.ctx.$reviewArea) return;
    const $item = this.ctx.$reviewArea.find(`.quploader-review-item[data-id="${fileId}"]`);
    if ($item.length) {
      $item.find('.quploader-progress-bar').css('width', `${percent}%`);
      if (percent === 100) {
        $item.addClass('quploader-success');
      }
    }
  }
}
