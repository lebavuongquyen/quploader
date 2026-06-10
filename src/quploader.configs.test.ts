// @vitest-environment happy-dom
import { beforeAll, describe, it, expect, vi } from 'vitest';
import $ from 'jquery';

beforeAll(async () => {
  (window as any).$ = (window as any).jQuery = $;
  await import('./quploader');
});

function createTestDiv(): HTMLElement {
  const div = document.createElement('div');
  div.id = 'quploader-test-element';
  document.body.appendChild(div);
  return div;
}

function createMockFile(filename: string, sizeBytes: number, mimeType = 'text/plain'): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], filename, { type: mimeType });
}

describe('QUploader Configurations - 64 Verification Scenarios', () => {
  
  // 1. uploadUrl
  describe('uploadUrl option', () => {
    it('Scenario 1: Displays upload button when uploadUrl is defined', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        uploadUrl: '/api/mock-upload',
        autoUpload: false
      });
      const uploadAllBtn = el.querySelector('.quploader-btn-upload');
      expect(uploadAllBtn).not.toBeNull();
      el.remove();
    });

    it('Scenario 2: Hides upload button (picker-mode) when uploadUrl is omitted', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        autoUpload: false
      });
      const uploadAllBtn = el.querySelector('.quploader-btn-upload');
      expect(uploadAllBtn).toBeNull();
      el.remove();
    });
  });

  // 2. chunkUploadUrl
  describe('chunkUploadUrl option', () => {
    it('Scenario 1: Stashes chunk upload URL correctly in configuration options', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        uploadUrl: '/api/upload',
        chunkUploadUrl: '/api/chunk-upload',
        resumable: true
      });
      expect(uploader.options.chunkUploadUrl).toBe('/api/chunk-upload');
      el.remove();
    });

    it('Scenario 2: Falls back to standard uploadUrl when chunkUploadUrl is omitted', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        uploadUrl: '/api/fallback-upload',
        resumable: true
      });
      expect(uploader.options.chunkUploadUrl || uploader.options.uploadUrl).toBe('/api/fallback-upload');
      el.remove();
    });
  });

  // 3. multiple
  describe('multiple option', () => {
    it('Scenario 1: Keeps multiple files in queue if multiple is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        multiple: true,
        autoUpload: false
      });
      const f1 = createMockFile('test1.txt', 100);
      const f2 = createMockFile('test2.txt', 200);
      await uploader.handleFiles([f1, f2]);
      expect(uploader.files.length).toBe(2);
      el.remove();
    });

    it('Scenario 2: Limits queue to a single file if multiple is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        multiple: false,
        autoUpload: false
      });
      const f1 = createMockFile('test1.txt', 100);
      const f2 = createMockFile('test2.txt', 200);
      await uploader.handleFiles([f1, f2]);
      expect(uploader.files.length).toBe(1);
      el.remove();
    });
  });

  // 4. dragDrop
  describe('dragDrop option', () => {
    it('Scenario 1: Container adds dragover style class on dragover if dragDrop is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        dragDrop: true
      });
      const event = new DragEvent('dragover', { bubbles: true });
      uploader.container.dispatchEvent(event);
      expect(uploader.container.classList.contains('quploader-dragover')).toBe(true);
      el.remove();
    });

    it('Scenario 2: Container ignores drag events if dragDrop is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        dragDrop: false
      });
      const event = new DragEvent('dragover', { bubbles: true });
      uploader.container.dispatchEvent(event);
      expect(uploader.container.classList.contains('quploader-dragover')).toBe(false);
      el.remove();
    });
  });

  // 5. browseButton
  describe('browseButton option', () => {
    it('Scenario 1: Renders file browser button when browseButton is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        browseButton: true
      });
      const btn = el.querySelector('.quploader-btn-browse');
      expect(btn).not.toBeNull();
      el.remove();
    });

    it('Scenario 2: Omits file browser button when browseButton is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        browseButton: false
      });
      const btn = el.querySelector('.quploader-btn-browse');
      expect(btn).toBeNull();
      el.remove();
    });
  });

  // 6. clickReviewAreaToBrowse
  describe('clickReviewAreaToBrowse option', () => {
    it('Scenario 1: Simulates input click when review area clicked and clickReviewAreaToBrowse is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        clickReviewAreaToBrowse: true,
        reviewMode: 'thumbnail'
      });
      const f1 = createMockFile('test1.jpg', 100, 'image/jpeg');
      await uploader.handleFiles([f1]);
      
      const reviewArea = el.querySelector('.quploader-review-area');
      expect(reviewArea).not.toBeNull();
      
      let clickFired = false;
      const fileInput = el.querySelector('input[type="file"]') as HTMLInputElement;
      fileInput.addEventListener('click', (e) => {
        e.preventDefault();
        clickFired = true;
      });
      
      reviewArea?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(clickFired).toBe(true);
      el.remove();
    });

    it('Scenario 2: Ignores clicks on review area when clickReviewAreaToBrowse is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        clickReviewAreaToBrowse: false,
        reviewMode: 'thumbnail'
      });
      const f1 = createMockFile('test1.jpg', 100, 'image/jpeg');
      await uploader.handleFiles([f1]);
      
      const reviewArea = el.querySelector('.quploader-review-area');
      expect(reviewArea).not.toBeNull();
      
      let clickFired = false;
      const fileInput = el.querySelector('input[type="file"]') as HTMLInputElement;
      fileInput.addEventListener('click', (e) => {
        e.preventDefault();
        clickFired = true;
      });
      
      reviewArea?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(clickFired).toBe(false);
      el.remove();
    });
  });

  // 7. cameraButton
  describe('cameraButton option', () => {
    it('Scenario 1: Renders camera button when cameraButton is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        cameraButton: true
      });
      const btn = el.querySelector('.quploader-btn-camera');
      expect(btn).not.toBeNull();
      el.remove();
    });

    it('Scenario 2: Omits camera button when cameraButton is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        cameraButton: false
      });
      const btn = el.querySelector('.quploader-btn-camera');
      expect(btn).toBeNull();
      el.remove();
    });
  });

  // 8. showIntroText
  describe('showIntroText option', () => {
    it('Scenario 1: Renders uploader introduction text when showIntroText is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        showIntroText: true
      });
      const intro = el.querySelector('.quploader-intro');
      expect(intro).not.toBeNull();
      expect(intro?.textContent).toContain('Drop');
      el.remove();
    });

    it('Scenario 2: Omits uploader introduction text when showIntroText is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        showIntroText: false
      });
      const intro = el.querySelector('.quploader-intro');
      expect(intro).toBeNull();
      el.remove();
    });
  });

  // 9. allowFolder
  describe('allowFolder option', () => {
    it('Scenario 1: Renders browse folder button when allowFolder is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        allowFolder: true
      });
      const btn = el.querySelector('.quploader-btn-folder');
      expect(btn).not.toBeNull();
      el.remove();
    });

    it('Scenario 2: Omits webkitdirectory attribute on input when allowFolder is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        allowFolder: false
      });
      const fileInput = el.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.hasAttribute('webkitdirectory')).toBe(false);
      el.remove();
    });
  });

  // 10. fileTypes
  describe('fileTypes option', () => {
    it('Scenario 1: Accepts file matching extension restrictions', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        fileTypes: ['.png', '.jpg'],
        autoUpload: false
      });
      const file = createMockFile('pic.png', 500, 'image/png');
      await uploader.handleFiles([file]);
      expect(uploader.files.length).toBe(1);
      el.remove();
    });

    it('Scenario 2: Rejects file violating extension restrictions', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      let errorTriggered = false;
      const uploader = new QUploader(el, {
        fileTypes: ['.png', '.jpg'],
        autoUpload: false,
        onError: () => {
          errorTriggered = true;
        }
      });
      const file = createMockFile('doc.pdf', 500, 'application/pdf');
      await uploader.handleFiles([file]);
      expect(uploader.files.length).toBe(0);
      expect(errorTriggered).toBe(true);
      el.remove();
    });
  });

  // 11. maxFileSize
  describe('maxFileSize option', () => {
    it('Scenario 1: Accepts file under maxFileSize limit', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        maxFileSize: '5KB',
        autoUpload: false
      });
      const file = createMockFile('small.txt', 2048);
      await uploader.handleFiles([file]);
      expect(uploader.files.length).toBe(1);
      el.remove();
    });

    it('Scenario 2: Rejects file exceeding maxFileSize limit', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      let errorTriggered = false;
      const uploader = new QUploader(el, {
        maxFileSize: '1KB',
        autoUpload: false,
        onError: () => {
          errorTriggered = true;
        }
      });
      const file = createMockFile('large.txt', 2048);
      await uploader.handleFiles([file]);
      expect(uploader.files.length).toBe(0);
      expect(errorTriggered).toBe(true);
      el.remove();
    });
  });

  // 12. chunkSize
  describe('chunkSize option', () => {
    it('Scenario 1: Parses custom chunk size strings to bytes', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        chunkSize: '100KB'
      });
      expect(uploader.options.chunkSize).toBe(102400);
      el.remove();
    });

    it('Scenario 2: Parses standard size numbers directly', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        chunkSize: 524288
      });
      expect(uploader.options.chunkSize).toBe(524288);
      el.remove();
    });
  });

  // 13. retry
  describe('retry option', () => {
    it('Scenario 1: Keeps configured retry attempt value', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        retry: 5
      });
      expect(uploader.options.retry).toBe(5);
      el.remove();
    });

    it('Scenario 2: Stores retry as 0 when explicitly deactivated', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        retry: 0
      });
      expect(uploader.options.retry).toBe(0);
      el.remove();
    });
  });

  // 14. cancel
  describe('cancel option', () => {
    it('Scenario 1: Stashes cancel parameter true correctly in options object', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        cancel: true
      });
      expect(uploader.options.cancel).toBe(true);
      el.remove();
    });

    it('Scenario 2: Stashes cancel parameter false correctly in options object', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        cancel: false
      });
      expect(uploader.options.cancel).toBe(false);
      el.remove();
    });
  });

  // 15. reviewMode
  describe('reviewMode option', () => {
    it('Scenario 1: Does not apply quploader-detail class when reviewMode is thumbnail', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        reviewMode: 'thumbnail'
      });
      const file = createMockFile('img.png', 100, 'image/png');
      await uploader.handleFiles([file]);
      const reviewArea = el.querySelector('.quploader-review-area');
      expect(reviewArea?.classList.contains('quploader-detail')).toBe(false);
      el.remove();
    });

    it('Scenario 2: Applies quploader-detail class when reviewMode is detail', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        reviewMode: 'detail'
      });
      const file = createMockFile('img.png', 100, 'image/png');
      await uploader.handleFiles([file]);
      const reviewArea = el.querySelector('.quploader-review-area');
      expect(reviewArea?.classList.contains('quploader-detail')).toBe(true);
      el.remove();
    });
  });

  // 16. singleModeFit
  describe('singleModeFit option', () => {
    it('Scenario 1: Sets cover style in single review mode', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        reviewMode: 'single',
        singleModeFit: 'cover'
      });
      const file = createMockFile('img.png', 100, 'image/png');
      await uploader.handleFiles([file]);
      expect(uploader.container.style.backgroundSize).toBe('cover');
      el.remove();
    });

    it('Scenario 2: Sets contain style in single review mode', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        reviewMode: 'single',
        singleModeFit: 'contain'
      });
      const file = createMockFile('img.png', 100, 'image/png');
      await uploader.handleFiles([file]);
      expect(uploader.container.style.backgroundSize).toBe('contain');
      el.remove();
    });
  });

  // 17. reviewPosition
  describe('reviewPosition option', () => {
    it('Scenario 1: Places review area before top content when reviewPosition is above', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        reviewPosition: 'above'
      });
      const file = createMockFile('img.png', 100, 'image/png');
      await uploader.handleFiles([file]);
      const children = Array.from(uploader.container.children);
      const reviewIndex = children.findIndex(c => c.classList.contains('quploader-review-area'));
      const topIndex = children.findIndex(c => c.classList.contains('quploader-top-content'));
      expect(reviewIndex < topIndex).toBe(true);
      el.remove();
    });

    it('Scenario 2: Places review area after top content when reviewPosition is below', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        reviewPosition: 'below'
      });
      const file = createMockFile('img.png', 100, 'image/png');
      await uploader.handleFiles([file]);
      const children = Array.from(uploader.container.children);
      const reviewIndex = children.findIndex(c => c.classList.contains('quploader-review-area'));
      const topIndex = children.findIndex(c => c.classList.contains('quploader-top-content'));
      expect(reviewIndex > topIndex).toBe(true);
      el.remove();
    });
  });

  // 18. showFileName
  describe('showFileName option', () => {
    it('Scenario 1: Displays file name inside item list when showFileName is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        showFileName: true,
        reviewMode: 'detail'
      });
      const file = createMockFile('document_name.txt', 100);
      await uploader.handleFiles([file]);
      const nameEl = el.querySelector('.quploader-detail-name');
      expect(nameEl).not.toBeNull();
      expect(nameEl?.textContent).toContain('document_name.txt');
      el.remove();
    });

    it('Scenario 2: Hides file name inside item list when showFileName is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        showFileName: false,
        reviewMode: 'thumbnail'
      });
      const file = createMockFile('document_name.txt', 100);
      await uploader.handleFiles([file]);
      const nameEl = el.querySelector('.quploader-file-name');
      expect(nameEl).toBeNull();
      el.remove();
    });
  });

  // 19. errorDelay
  describe('errorDelay option', () => {
    it('Scenario 1: Automatically hides error display after timeout', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        errorDelay: 20
      });
      uploader.showGlobalError('Test Error Message');
      const errorMsg = el.querySelector('.quploader-global-error') as HTMLElement;
      expect(errorMsg).not.toBeNull();
      
      await new Promise(r => setTimeout(r, 45));
      expect(errorMsg.style.display).toBe('none');
      el.remove();
    });

    it('Scenario 2: Stays persistent when errorDelay is set to large values', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        errorDelay: 5000
      });
      uploader.showGlobalError('Test Error Message');
      const errorMsg = el.querySelector('.quploader-global-error') as HTMLElement;
      expect(errorMsg).not.toBeNull();
      
      await new Promise(r => setTimeout(r, 40));
      expect(errorMsg.style.display).not.toBe('none');
      el.remove();
    });
  });

  // 20. resize
  describe('resize option', () => {
    it('Scenario 1: Instantiates configuration width and height for resize target', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        resize: { maxWidth: 300, maxHeight: 200 }
      });
      expect(uploader.options.resize?.maxWidth).toBe(300);
      expect(uploader.options.resize?.maxHeight).toBe(200);
      el.remove();
    });

    it('Scenario 2: Leaves resize as undefined when configuration is omitted', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {});
      expect(uploader.options.resize).toBeUndefined();
      el.remove();
    });
  });

  // 21. autoUpload
  describe('autoUpload option', () => {
    it('Scenario 1: Starts upload automatically when autoUpload is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploadSpy = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
      const uploader = new QUploader(el, {
        uploadUrl: '/api/upload',
        autoUpload: true
      });
      const file = createMockFile('auto.txt', 100);
      await uploader.handleFiles([file]);
      
      expect(uploadSpy).toHaveBeenCalled();
      uploadSpy.mockRestore();
      el.remove();
    });

    it('Scenario 2: Leaves files as pending when autoUpload is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        uploadUrl: '/api/upload',
        autoUpload: false
      });
      const file = createMockFile('manual.txt', 100);
      await uploader.handleFiles([file]);
      
      expect(uploader.files[0].status).toBe('pending');
      el.remove();
    });
  });

  // 22. progressBar
  describe('progressBar option', () => {
    it('Scenario 1: Renders progress element when progressBar is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        progressBar: true,
        reviewMode: 'detail'
      });
      const file = createMockFile('progress.txt', 100);
      await uploader.handleFiles([file]);
      const bar = el.querySelector('.quploader-progress');
      expect(bar).not.toBeNull();
      el.remove();
    });

    it('Scenario 2: Omits progress element when progressBar is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        progressBar: false,
        reviewMode: 'detail'
      });
      const file = createMockFile('progress.txt', 100);
      await uploader.handleFiles([file]);
      const bar = el.querySelector('.quploader-progress');
      expect(bar).toBeNull();
      el.remove();
    });
  });

  // 23. allowDelete
  describe('allowDelete option', () => {
    it('Scenario 1: Renders delete button when allowDelete is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        allowDelete: true,
        reviewMode: 'detail'
      });
      const file = createMockFile('delete.txt', 100);
      await uploader.handleFiles([file]);
      const deleteBtn = el.querySelector('.quploader-btn-delete');
      expect(deleteBtn).not.toBeNull();
      el.remove();
    });

    it('Scenario 2: Omits delete button when allowDelete is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        allowDelete: false,
        reviewMode: 'detail'
      });
      const file = createMockFile('delete.txt', 100);
      await uploader.handleFiles([file]);
      const deleteBtn = el.querySelector('.quploader-btn-delete');
      expect(deleteBtn).toBeNull();
      el.remove();
    });
  });

  // 24. uploadAsBase64
  describe('uploadAsBase64 option', () => {
    it('Scenario 1: Packages files as base64 string when uploadAsBase64 is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      let requestBody: any = null;
      const uploadSpy = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function(this: XMLHttpRequest, body: any) {
        requestBody = body;
        // Mock a quick state trigger
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'readyState', { value: 4 });
        Object.defineProperty(this, 'responseText', { value: '{"success":true}' });
        if (this.onload) (this.onload as any)(new Event('load'));
      });

      const uploader = new QUploader(el, {
        uploadUrl: '/api/upload',
        uploadAsBase64: true,
        autoUpload: true
      });
      const file = createMockFile('data.txt', 10, 'text/plain');
      await uploader.handleFiles([file]);
      
      await new Promise(r => setTimeout(r, 20));
      expect(typeof requestBody).toBe('string');
      const payloadObj = JSON.parse(requestBody);
      expect(payloadObj.base64).not.toBeNull();
      expect(payloadObj.fileName).toBe('data.txt');
      
      uploadSpy.mockRestore();
      el.remove();
    });

    it('Scenario 2: Packages files as standard FormData when uploadAsBase64 is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      let requestBody: any = null;
      const uploadSpy = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function(this: XMLHttpRequest, body: any) {
        requestBody = body;
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'readyState', { value: 4 });
        Object.defineProperty(this, 'responseText', { value: '{"success":true}' });
        if (this.onload) (this.onload as any)(new Event('load'));
      });

      const uploader = new QUploader(el, {
        uploadUrl: '/api/upload',
        uploadAsBase64: false,
        autoUpload: true
      });
      const file = createMockFile('data.txt', 10, 'text/plain');
      await uploader.handleFiles([file]);
      
      await new Promise(r => setTimeout(r, 20));
      expect(requestBody instanceof FormData).toBe(true);
      
      uploadSpy.mockRestore();
      el.remove();
    });
  });

  // 25. accept
  describe('accept option', () => {
    it('Scenario 1: Propagates accept string to input accept attribute', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        accept: 'image/*'
      });
      const fileInput = el.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.getAttribute('accept')).toBe('image/*');
      el.remove();
    });

    it('Scenario 2: Synthesizes accept from fileTypes if accept is empty', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        fileTypes: ['.pdf', '.docx']
      });
      const fileInput = el.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.getAttribute('accept')).toBe('.pdf,.docx');
      el.remove();
    });
  });

  // 26. containerClass
  describe('containerClass option', () => {
    it('Scenario 1: Appends custom CSS container classes to container', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        containerClass: 'verified-tester-class'
      });
      expect(uploader.container.classList.contains('verified-tester-class')).toBe(true);
      el.remove();
    });

    it('Scenario 2: Standard classes are mounted when containerClass is omitted', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {});
      expect(uploader.container.classList.contains('quploader-container')).toBe(true);
      el.remove();
    });
  });

  // 27. useIcon
  describe('useIcon option', () => {
    it('Scenario 1: Renders icons inside buttons when useIcon is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        useIcon: true,
        cameraButton: true
      });
      const cameraBtn = el.querySelector('.quploader-btn-camera');
      expect(cameraBtn?.querySelector('svg')).not.toBeNull();
      el.remove();
    });

    it('Scenario 2: Renders plain text inside buttons when useIcon is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        useIcon: false,
        cameraButton: true
      });
      const cameraBtn = el.querySelector('.quploader-btn-camera');
      expect(cameraBtn?.querySelector('svg')).toBeNull();
      el.remove();
    });
  });

  // 28. darkMode
  describe('darkMode option', () => {
    it('Scenario 1: Appends dark theme class when darkMode is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        darkMode: true
      });
      expect(uploader.container.classList.contains('quploader-dark')).toBe(true);
      el.remove();
    });

    it('Scenario 2: Omits dark theme class when darkMode is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        darkMode: false
      });
      expect(uploader.container.classList.contains('quploader-dark')).toBe(false);
      el.remove();
    });
  });

  // 29. resumable
  describe('resumable option', () => {
    it('Scenario 1: Stashes resumable parameter true correctly in options object', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        resumable: true
      });
      expect(uploader.options.resumable).toBe(true);
      el.remove();
    });

    it('Scenario 2: Stashes resumable parameter false correctly in options object', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        resumable: false
      });
      expect(uploader.options.resumable).toBe(false);
      el.remove();
    });
  });

  // 30. preferFileInput
  describe('preferFileInput option', () => {
    it('Scenario 1: Renders file selector input when preferFileInput is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        preferFileInput: true
      });
      const input = el.querySelector('input[type="file"]');
      expect(input).not.toBeNull();
      el.remove();
    });

    it('Scenario 2: Sets file selector input when options are default', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {});
      const input = el.querySelector('input[type="file"]');
      expect(input).not.toBeNull();
      el.remove();
    });
  });

  // 31. headless
  describe('headless option', () => {
    it('Scenario 1: Omits default uploader UI when headless is true', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        headless: true
      });
      const body = el.querySelector('.quploader-body');
      expect(body).toBeNull();
      el.remove();
    });

    it('Scenario 2: Builds standard layout UI when headless is false', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      new QUploader(el, {
        headless: false
      });
      const topContent = el.querySelector('.quploader-top-content');
      expect(topContent).not.toBeNull();
      el.remove();
    });
  });

  // 32. mode
  describe('mode option', () => {
    it('Scenario 1: Configures mode camera successfully', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        mode: 'camera'
      });
      expect(uploader.options.mode).toBe('camera');
      el.remove();
    });

    it('Scenario 2: Configures mode dropzone successfully', async () => {
      const { QUploader } = await import('./quploader');
      const el = createTestDiv();
      const uploader = new QUploader(el, {
        mode: 'dropzone'
      });
      expect(uploader.options.mode).toBe('dropzone');
      el.remove();
    });
  });

});
