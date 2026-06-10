import { QUploader } from '../types';

export class ThemeHandler {
  private ctx: QUploader.CoreContext;
  private mediaQueryList: MediaQueryList | null = null;
  private mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor(ctx: QUploader.CoreContext) {
    this.ctx = ctx;
    this.init();
  }

  private init(): void {
    if (this.ctx.options.headless) return;
    const { darkMode } = this.ctx.options;

    if (darkMode === true) {
      this.ctx.container.classList.add('quploader-dark');
    } else if (darkMode === 'auto') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Initial check
        if (this.mediaQueryList.matches) {
          this.ctx.container.classList.add('quploader-dark');
        }

        // Listen for changes
        this.mediaQueryListener = (e: MediaQueryListEvent) => {
          if (e.matches) {
            this.ctx.container.classList.add('quploader-dark');
          } else {
            this.ctx.container.classList.remove('quploader-dark');
          }
        };

        // Modern and legacy event listener registration
        if (this.mediaQueryList.addEventListener) {
          this.mediaQueryList.addEventListener('change', this.mediaQueryListener);
        } else if (this.mediaQueryList.addListener) {
          // Fallback for older browsers
          this.mediaQueryList.addListener(this.mediaQueryListener);
        }
      }
    } else {
       // Explicitly false
       this.ctx.container.classList.remove('quploader-dark');
    }
  }

  public destroy(): void {
    if (this.mediaQueryList && this.mediaQueryListener) {
      if (this.mediaQueryList.removeEventListener) {
        this.mediaQueryList.removeEventListener('change', this.mediaQueryListener);
      } else if (this.mediaQueryList.removeListener) {
        this.mediaQueryList.removeListener(this.mediaQueryListener);
      }
    }
  }
}
