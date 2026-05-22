export class MimeHelper {
  private static readonly EXTENSION_MIME_MAP: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime'
  };

  public static getMimeType(ext: string): string {
    return this.EXTENSION_MIME_MAP[ext.toLowerCase()] || 'application/octet-stream';
  }

  public static getFileIcon(type: string, name: string): string {
    const lowerName = name.toLowerCase();
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('audio/')) return '🎵';
    if (type.startsWith('video/')) return '🎥';
    if (type === 'application/pdf' || lowerName.endsWith('.pdf')) return '📕';
    if (
      lowerName.endsWith('.zip') ||
      lowerName.endsWith('.rar') ||
      lowerName.endsWith('.7z') ||
      lowerName.endsWith('.tar') ||
      lowerName.endsWith('.gz')
    ) return '📦';
    if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) return '📝';
    if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) return '📊';
    if (lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) return '📉';
    return '📄';
  }

  public static buildPickerTypes(fileTypes: string[]): any[] | undefined {
    if (!fileTypes || fileTypes.length === 0) return undefined;

    const acceptObj: Record<string, string[]> = {};

    for (const item of fileTypes) {
      const trimmed = item.trim().toLowerCase();
      if (trimmed.startsWith('.')) {
        const mime = this.getMimeType(trimmed);
        this.addMimeExtension(acceptObj, mime, trimmed);
      } else if (trimmed.includes('/')) {
        this.handleMimeTypeWildcards(acceptObj, trimmed);
      } else {
        const dotExt = `.${trimmed}`;
        const mime = this.getMimeType(dotExt);
        this.addMimeExtension(acceptObj, mime, dotExt);
      }
    }

    // Filter duplicates
    for (const key in acceptObj) {
      acceptObj[key] = acceptObj[key].filter((val, index, self) => self.indexOf(val) === index);
    }

    return [{ description: 'Allowed Files', accept: acceptObj }];
  }

  private static addMimeExtension(acceptObj: Record<string, string[]>, mime: string, ext: string): void {
    if (!acceptObj[mime]) {
      acceptObj[mime] = [];
    }
    if (!acceptObj[mime].includes(ext)) {
      acceptObj[mime].push(ext);
    }
  }

  private static handleMimeTypeWildcards(acceptObj: Record<string, string[]>, trimmed: string): void {
    if (!acceptObj[trimmed]) {
      acceptObj[trimmed] = [];
    }

    if (trimmed === 'image/*') {
      acceptObj[trimmed].push('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg');
    } else if (trimmed === 'video/*') {
      acceptObj[trimmed].push('.mp4', '.avi', '.mov', '.webm');
    } else if (trimmed === 'audio/*') {
      acceptObj[trimmed].push('.mp3', '.wav', '.ogg', '.m4a');
    } else if (trimmed === 'text/*') {
      acceptObj[trimmed].push('.txt', '.html', '.css', '.js', '.csv', '.md');
    } else {
      const ext = Object.keys(this.EXTENSION_MIME_MAP).find(key => this.EXTENSION_MIME_MAP[key] === trimmed);
      if (ext) {
        acceptObj[trimmed].push(ext);
      } else {
        const parts = trimmed.split('/');
        if (parts[1]) {
          acceptObj[trimmed].push(`.${parts[1]}`);
        }
      }
    }
  }
}
