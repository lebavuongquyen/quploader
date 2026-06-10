// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';

describe('QUploader Core & Options Parsing', () => {
  it('should parse size strings into bytes correctly', async () => {
    const { QUploader } = await import('./quploader');
    
    // Create a mock element to instantiate QUploader
    const element = document.createElement('div');
    const uploader = new QUploader(element, {
      maxFileSize: '5MB',
      chunkSize: '500KB'
    });

    // Test private parseSize resolution through public options properties
    expect(uploader.options.maxFileSize).toBe(5 * 1024 * 1024);
    expect(uploader.options.chunkSize).toBe(500 * 1024);
  });

  it('should parse custom size strings like KB, GB, TB', async () => {
    const { QUploader } = await import('./quploader');
    const element = document.createElement('div');
    
    const uploaderKB = new QUploader(element, { maxFileSize: '200kb' });
    expect(uploaderKB.options.maxFileSize).toBe(200 * 1024);

    const uploaderGB = new QUploader(element, { maxFileSize: '2GB' });
    expect(uploaderGB.options.maxFileSize).toBe(2 * 1024 * 1024 * 1024);
  });

  it('should resolve accept string and fileTypes option correctly', async () => {
    const { QUploader } = await import('./quploader');
    const element = document.createElement('div');

    const uploaderAccept = new QUploader(element, { accept: '.png, .jpg, image/*' });
    expect(uploaderAccept.options.fileTypes).toEqual(['.png', '.jpg', 'image/*']);
  });
});

describe('QUploader DOM & Theme Handling', () => {
  it('should initialize container element correctly', async () => {
    const { QUploader } = await import('./quploader');
    const element = document.createElement('div');
    
    const uploader = new QUploader(element, {
      containerClass: 'custom-test-container'
    });

    expect(uploader.container.classList.contains('quploader-container')).toBe(true);
    expect(uploader.container.classList.contains('custom-test-container')).toBe(true);
  });

  it('should toggle dark mode class based on options', async () => {
    const { QUploader } = await import('./quploader');
    const element = document.createElement('div');

    const uploaderDark = new QUploader(element, { darkMode: true });
    expect(uploaderDark.container.classList.contains('quploader-dark')).toBe(true);

    const uploaderLight = new QUploader(element, { darkMode: false });
    expect(uploaderLight.container.classList.contains('quploader-dark')).toBe(false);
  });
});

describe('QUploader Validation Logic', () => {
  it('should reject files exceeding max file size', async () => {
    const { QUploader } = await import('./quploader');
    const element = document.createElement('div');
    
    const uploader = new QUploader(element, {
      maxFileSize: '1KB',
      autoUpload: false
    });

    // Create a 2KB dummy file
    const largeFile = new File([new ArrayBuffer(2048)], 'large.txt', { type: 'text/plain' });
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorCallback = vi.fn();
    uploader.options.onError = errorCallback;

    await uploader.handleFiles([largeFile]);

    // File should not be added to the queue
    expect(uploader.files.length).toBe(0);
    // Error callback should be triggered
    expect(errorCallback).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should reject files of incorrect file types', async () => {
    const { QUploader } = await import('./quploader');
    const element = document.createElement('div');

    const uploader = new QUploader(element, {
      fileTypes: ['.png', '.jpg'],
      autoUpload: false
    });

    const invalidFile = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    const errorCallback = vi.fn();
    uploader.options.onError = errorCallback;

    await uploader.handleFiles([invalidFile]);

    expect(uploader.files.length).toBe(0);
    expect(errorCallback).toHaveBeenCalled();
  });
});
