import { QUploader } from '../types';

export class ImageResizer {
  private ctx: QUploader.CoreContext;

  constructor(ctx: QUploader.CoreContext) {
    this.ctx = ctx;
  }

  public resizeImage(file: QUploader.File, customOptions?: QUploader.ResizeOptions): Promise<QUploader.File> {
    return new Promise((resolve, reject) => {
      const opts = customOptions || this.ctx.options.resize;
      if (!opts) return resolve(file);

      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        const maxW = opts.maxWidth;
        const maxH = opts.maxHeight;
        
        if (width <= maxW && height <= maxH) {
           return resolve(file); // No resize needed
        }

        if (width > height) {
          if (width > maxW) {
            height = Math.round(height * (maxW / width));
            width = maxW;
          }
        } else {
          if (height > maxH) {
            width = Math.round(width * (maxH / height));
            height = maxH;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas toBlob failed'));
          // Copy internal QFile properties over
          const newFile = new File([blob], file.name, { type: file.type, lastModified: Date.now() }) as QUploader.File;
          newFile.id = file.id;
          newFile.status = file.status;
          resolve(newFile);
        }, file.type);
      };
      img.onerror = () => reject(new Error('Image load error'));
      img.src = url;
    });
  }
}
