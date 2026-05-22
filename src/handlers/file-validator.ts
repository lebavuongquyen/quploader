import { QUploader } from '../types';

export class FileValidator {
  private ctx: QUploader.CoreContext;

  constructor(ctx: QUploader.CoreContext) {
    this.ctx = ctx;
  }

  public validateFile(file: QUploader.File): string | null {
    if (this.ctx.options.maxFileSize && file.size > (this.ctx.options.maxFileSize as number)) {
      return 'File exceeds maximum size';
    }

    if (this.ctx.options.fileTypes && this.ctx.options.fileTypes.length > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const mime = file.type;
      const isValid = this.ctx.options.fileTypes.some(type => {
        const cleanType = type.trim().toLowerCase();
        const cleanExt = `.${ext}`;
        if (cleanType.startsWith('.')) return cleanType === cleanExt;
        if (cleanType.endsWith('/*')) return mime.toLowerCase().startsWith(cleanType.replace('/*', ''));
        if (cleanType.includes('/')) return cleanType === mime.toLowerCase();
        return cleanType === ext;
      });
      if (!isValid) return 'Invalid file type';
    }

    if (this.ctx.options.onValidate && !this.ctx.options.onValidate(file)) {
      return 'Validation failed';
    }

    return null;
  }
}
