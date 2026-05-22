import { QUploader } from '../types';
import $ from 'jquery';

export class CameraHandler {
  private ctx: QUploader.CoreContext;
  private stream: MediaStream | null = null;

  constructor(ctx: QUploader.CoreContext) {
    this.ctx = ctx;
  }

  public openCamera(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera API not supported in this browser.');
      return;
    }

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;

    // Camera state
    let currentFacingMode: 'environment' | 'user' = isMobile ? 'environment' : 'user';
    let currentDeviceId = '';
    let hasAutoSelectedBestBack = false;
    let videoTrack: MediaStreamTrack | null = null;
    let torchOn = false;
    let torchSupported = false;
    let zoomSupported = false;
    let zoomCapabilities: { min: number, max: number, step: number } | null = null;
    let currentZoom = 1;

    // Advanced settings state
    let selectedRatio: '4:3' | '16:9' | '1:1' = '16:9';
    let selectedFilter = 'none';
    let isMirrored = false;
    let gridOn = false;
    let currentViewfinderRatio = 16 / 9;

    const rawCapturedCanvas = document.createElement('canvas');

    const getFilterCSS = (filter: string): string => {
      switch (filter) {
        case 'grayscale': return 'grayscale(100%)';
        case 'sepia': return 'sepia(100%)';
        case 'vintage': return 'sepia(50%) contrast(120%) saturate(120%)';
        case 'cool': return 'hue-rotate(30deg) saturate(90%)';
        case 'vivid': return 'saturate(160%) contrast(110%)';
        case 'contrast': return 'contrast(150%)';
        default: return 'none';
      }
    };

    const getBestDevices = (devices: MediaDeviceInfo[]) => {
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      let bestBack: MediaDeviceInfo | null = null;
      let highestBackScore = -999;
      
      let bestFront: MediaDeviceInfo | null = null;
      let highestFrontScore = -999;

      videoDevices.forEach((device) => {
        const label = device.label.toLowerCase();
        const isBack = /back|rear|environment/i.test(label) || (!/front|user|facing/i.test(label) && videoDevices.indexOf(device) === 0);
        const isFront = /front|user|facing/i.test(label);

        let score = 0;
        
        // Prefer main, primary, camera 0
        if (/main|primary|camera2\s*0|rear\s*0|camera\s*0/i.test(label)) {
          score += 50;
        }
        
        // Avoid auxiliary lenses
        if (/ultra\s*wide|ultrawide|tele|telephoto|macro|depth|secondary|aux/i.test(label)) {
          score -= 60;
        }
        
        // Wide (without ultra) is good
        if (/wide/i.test(label) && !/ultra/i.test(label)) {
          score += 20;
        }

        // Tie-breaker based on list index (lower index preferred)
        const index = videoDevices.indexOf(device);
        score -= index * 0.1;

        if (isBack) {
          if (score > highestBackScore) {
            highestBackScore = score;
            bestBack = device;
          }
        }
        
        if (isFront) {
          if (score > highestFrontScore) {
            highestFrontScore = score;
            bestFront = device;
          }
        }
      });

      // Fallbacks
      if (!bestBack && videoDevices.length > 0) {
        const nonFront = videoDevices.find(d => !/front|user|facing/i.test(d.label.toLowerCase()));
        bestBack = nonFront || videoDevices[0];
      }
      if (!bestFront && videoDevices.length > 0) {
        const front = videoDevices.find(d => /front|user|facing/i.test(d.label.toLowerCase()));
        bestFront = front || videoDevices[0];
      }

      return { bestBack, bestFront };
    };

    const $modal = $(`
      <div class="quploader-camera-modal${isMobile ? ' quploader-is-mobile' : ''}">
        <div class="quploader-camera-content">
          <div class="quploader-camera-video-container">
            <video autoplay playsinline muted class="quploader-camera-video"></video>
            <div class="quploader-camera-grid" style="display:none;"></div>
          </div>
          <div class="quploader-camera-preview-container">
            <canvas class="quploader-camera-preview"></canvas>
          </div>
          
          <!-- Camera Settings Panel -->
          <div class="quploader-camera-settings-panel" style="display:none;">
            <div class="quploader-settings-header">
              <h3>Camera Settings</h3>
              <button type="button" class="quploader-btn-settings-close">×</button>
            </div>
            <div class="quploader-settings-body">
              <div class="quploader-setting-row">
                <label>Active Resolution</label>
                <span class="quploader-resolution-status" style="font-size: 13px; color: #a8ffb2; display: block; margin-top: 4px;">Detecting...</span>
              </div>

              <div class="quploader-setting-row">
                <label>Aspect Ratio</label>
                <select class="quploader-select-ratio">
                  <option value="4:3">4:3 Standard</option>
                  <option value="16:9" selected>16:9 Widescreen</option>
                  <option value="1:1">1:1 Square</option>
                </select>
              </div>
              <div class="quploader-setting-row">
                <label>Filter</label>
                <select class="quploader-select-filter">
                  <option value="none" selected>Normal</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="sepia">Sepia</option>
                  <option value="vintage">Vintage</option>
                  <option value="cool">Cool</option>
                  <option value="vivid">Vivid</option>
                  <option value="contrast">High Contrast</option>
                </select>
              </div>
            </div>
          </div>

          <div class="quploader-camera-toolbar">
            <button type="button" class="quploader-btn-switch" title="Switch Camera">🔄</button>
            <button type="button" class="quploader-btn-torch" title="Toggle Flash" style="display:none;">⚡</button>
            <button type="button" class="quploader-btn-grid-toggle" title="Toggle Grid">▦</button>
            <button type="button" class="quploader-btn-mirror-toggle" title="Toggle Mirror">↔️</button>
            <button type="button" class="quploader-btn-settings-toggle" title="Settings">⚙️</button>
            <button type="button" class="quploader-btn-fullscreen" title="Toggle Fullscreen">⛶</button>
          </div>
          <div class="quploader-camera-controls">
            <button type="button" class="quploader-btn-close" title="Close">Close</button>
            <button type="button" class="quploader-btn-capture" title="Capture"></button>
          </div>
          <div class="quploader-camera-preview-controls">
            <button type="button" class="quploader-btn-retake">↩ Retake</button>
            <button type="button" class="quploader-btn-rotate">↻ Rotate</button>
            <button type="button" class="quploader-btn-use-photo">✔ Use Photo</button>
          </div>
        </div>
      </div>
    `);

    $('body').append($modal);
    $('body').addClass('quploader-camera-opening');
    const modalEl = $modal[0];
    const video = $modal.find('.quploader-camera-video')[0] as HTMLVideoElement;
    const canvas = $modal.find('.quploader-camera-preview')[0] as HTMLCanvasElement;
    const videoContainer = $modal.find('.quploader-camera-video-container')[0] as HTMLDivElement;

    const updateFullscreenButtonState = () => {
      const doc = document as any;
      const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      $modal.find('.quploader-btn-fullscreen').toggleClass('quploader-btn-active', isFull);
    };

    const cleanup = () => {
      $(window).off('keydown', keydownHandler);
      $(window).off('resize', resizeHandler);
      document.removeEventListener('fullscreenchange', updateFullscreenButtonState);
      document.removeEventListener('webkitfullscreenchange', updateFullscreenButtonState);
      document.removeEventListener('mozfullscreenchange', updateFullscreenButtonState);
      document.removeEventListener('MSFullscreenChange', updateFullscreenButtonState);
    };

    const keydownHandler = (e: any) => {
      if (e.key === 'Escape') this.closeCamera($modal, cleanup);
    };
    $(window).on('keydown', keydownHandler);
    $(window).on('resize', resizeHandler);

    document.addEventListener('fullscreenchange', updateFullscreenButtonState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButtonState);
    document.addEventListener('mozfullscreenchange', updateFullscreenButtonState);
    document.addEventListener('MSFullscreenChange', updateFullscreenButtonState);

    // ── Pinch-to-Zoom Gesture Implementation ──────────────────────────────
    let startDistance = 0;
    let startZoom = 1;

    const getTouchDistance = (touches: TouchList): number => {
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
    };

    videoContainer.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 2 && videoTrack && zoomSupported && zoomCapabilities) {
        startDistance = getTouchDistance(e.touches);
        startZoom = currentZoom;
      }
    }, { passive: true });

    videoContainer.addEventListener('touchmove', async (e: TouchEvent) => {
      if (e.touches.length === 2 && videoTrack && zoomSupported && zoomCapabilities) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        if (startDistance > 0) {
          const factor = currentDistance / startDistance;
          try {
            const minZoom = zoomCapabilities.min ?? 1;
            const maxZoom = zoomCapabilities.max ?? 1;

            let newZoom = startZoom * factor;
            if (newZoom < minZoom) newZoom = minZoom;
            if (newZoom > maxZoom) newZoom = maxZoom;

            await (videoTrack as any).applyConstraints({ advanced: [{ zoom: newZoom }] });
            currentZoom = newZoom;
          } catch (err) {
            console.warn('Pinch-to-zoom failed:', err);
          }
        }
      }
    }, { passive: false });

    // Check total camera count to show/hide the switch button
    const checkCameraCount = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        // Always show switch button on mobile, or if more than 1 camera is detected
        if (videoDevices.length <= 1 && !isMobile) {
          $modal.find('.quploader-btn-switch').hide();
        } else {
          $modal.find('.quploader-btn-switch').show();
        }
      } catch (err) {
        console.warn('Enumerate devices failed:', err);
      }
    };

    // Pre-select best camera before starting stream if permission is already granted
    const preSelectBestCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasLabels = devices.some(d => d.label && d.kind === 'videoinput');
        if (hasLabels) {
          const { bestBack, bestFront } = getBestDevices(devices);
          if (currentFacingMode === 'environment') {
            if (bestBack && bestBack.deviceId) {
              currentDeviceId = bestBack.deviceId;
              hasAutoSelectedBestBack = true;
            }
          } else {
            if (bestFront && bestFront.deviceId) {
              currentDeviceId = bestFront.deviceId;
            }
          }
        }
      } catch (err) {
        console.warn('Pre-select best camera failed:', err);
      }
    };

    function calculateStreamingRatio() {
      let isPortrait = window.innerHeight > window.innerWidth;
      if (video.videoWidth && video.videoHeight) {
        isPortrait = video.videoHeight > video.videoWidth;
      }

      if (selectedRatio === '16:9') {
        currentViewfinderRatio = isPortrait ? 9 / 16 : 16 / 9;
      } else if (selectedRatio === '4:3') {
        currentViewfinderRatio = isPortrait ? 3 / 4 : 4 / 3;
      } else if (selectedRatio === '1:1') {
        currentViewfinderRatio = 1.0;
      }
    }

    function updateViewfinderAspectRatio() {
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let maxW = isMobile ? viewportW : Math.min(viewportW * 0.8, 640);
      let maxH = isMobile ? viewportH * 0.6 : viewportH * 0.65;

      if (!isMobile) {
        maxW = maxW - 40;
      }

      let width = maxW;
      let height = width / currentViewfinderRatio;

      if (height > maxH) {
        height = maxH;
        width = height * currentViewfinderRatio;
      }

      $(videoContainer).css({
        width: Math.round(width) + 'px',
        height: Math.round(height) + 'px'
      });
    }

    function resizeHandler() {
      if (!$modal.hasClass('quploader-in-review')) {
        calculateStreamingRatio();
      }
      updateViewfinderAspectRatio();
    }

    // Start/Restart WebRTC camera stream
    const startStream = async (forceIdealFacing = false) => {
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }

      const resWidth = 3840;
      const resHeight = 2160;

      let aspectConstraint: number | undefined = undefined;
      if (selectedRatio === '4:3') aspectConstraint = 4 / 3;
      else if (selectedRatio === '16:9') aspectConstraint = 16 / 9;
      else if (selectedRatio === '1:1') aspectConstraint = 1.0;

      const constraints: MediaTrackConstraints = {
        width: { ideal: resWidth },
        height: { ideal: resHeight }
      };

      if (currentDeviceId) {
        constraints.deviceId = { ideal: currentDeviceId };
        constraints.facingMode = { ideal: currentFacingMode };
      } else {
        if (isMobile && !forceIdealFacing) {
          constraints.facingMode = { exact: currentFacingMode };
        } else {
          constraints.facingMode = { ideal: currentFacingMode };
        }
      }

      if (aspectConstraint) {
        constraints.aspectRatio = { ideal: aspectConstraint };
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
        this.stream = stream;
        video.srcObject = stream;
        videoTrack = stream.getVideoTracks()[0];

        // Explicitly play video to ensure it is active and streaming on all mobile browsers
        try {
          await video.play();
          calculateStreamingRatio();
          updateViewfinderAspectRatio();
        } catch (playErr) {
          console.warn('video.play() failed or was interrupted:', playErr);
        }

        video.onloadedmetadata = () => {
          calculateStreamingRatio();
          updateViewfinderAspectRatio();
        };

        // Read active resolution settings and show in UI
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          if (settings.width && settings.height) {
            $modal.find('.quploader-resolution-status').text(`Active Resolution: ${settings.width}x${settings.height}`);
          }
          if (settings.deviceId) {
            currentDeviceId = settings.deviceId;
          }
        }

        // Enumerate devices once permission is granted
        await checkCameraCount();

        // Automatically switch to the best camera for the environment (back) camera
        if (currentFacingMode === 'environment' && !hasAutoSelectedBestBack) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasLabels = devices.some(d => d.label && d.kind === 'videoinput');
          if (hasLabels) {
            const { bestBack } = getBestDevices(devices);
            if (bestBack && bestBack.deviceId && bestBack.deviceId !== currentDeviceId) {
              hasAutoSelectedBestBack = true;
              currentDeviceId = bestBack.deviceId;
              // Restart stream to use the best device
              startStream();
              return;
            }
            hasAutoSelectedBestBack = true;
          }
        }

        // Read camera capabilities (zoom, torch)
        if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
          try {
            const caps = videoTrack.getCapabilities() as any;

            if (caps.torch) {
              torchSupported = true;
              $modal.find('.quploader-btn-torch').show();
              torchOn = false;
              $modal.find('.quploader-btn-torch').removeClass('quploader-btn-torch-active');
            } else {
              torchSupported = false;
              $modal.find('.quploader-btn-torch').hide();
            }

            if (caps.zoom) {
              zoomSupported = true;
              zoomCapabilities = caps.zoom;
              currentZoom = caps.zoom.min ?? 1;
            } else {
              zoomSupported = false;
              zoomCapabilities = null;
              currentZoom = 1;
            }
          } catch (err) {
            console.warn('Could not read track capabilities:', err);
          }
        } else {
          $modal.find('.quploader-btn-torch').hide();
          zoomSupported = false;
          zoomCapabilities = null;
          currentZoom = 1;
        }

        // Apply visual states (filter, mirroring)
        $(video).css('filter', getFilterCSS(selectedFilter));
        $(video).toggleClass('quploader-mirror-active', isMirrored);

      } catch (err) {
        console.error('Camera access failed:', err);
        if (isMobile && !currentDeviceId && !forceIdealFacing) {
          console.log('Retrying with ideal facingMode constraint...');
          startStream(true);
          return;
        }
        alert('Could not access camera with the selected settings.');
      }
    };

    const initCamera = async () => {
      await preSelectBestCamera();
      await startStream();
    };
    initCamera();

    // ── Quick Toolbar Actions ─────────────────────────────────────────────
    // Switch between the best Back and best Front camera
    $modal.find('.quploader-btn-switch').on('click', async () => {
      try {
        if (currentFacingMode === 'environment') {
          currentFacingMode = 'user';
          isMirrored = true; // Enable mirror by default for front camera
        } else {
          currentFacingMode = 'environment';
          isMirrored = false; // Disable mirror by default for back camera
        }
        $modal.find('.quploader-btn-mirror-toggle').toggleClass('quploader-btn-active', isMirrored);
        
        currentDeviceId = ''; // Clear deviceId so it starts fresh with the new facingMode
        hasAutoSelectedBestBack = false; // Reset so that if we switched to environment, it auto-selects the best back camera
        await preSelectBestCamera();
        await startStream();
      } catch (err) {
        console.error('Switch camera failed:', err);
      }
    });

    // Torch/Flash toggle
    $modal.find('.quploader-btn-torch').on('click', async () => {
      if (!videoTrack || !torchSupported) return;
      torchOn = !torchOn;
      try {
        await (videoTrack as any).applyConstraints({ advanced: [{ torch: torchOn }] });
        $modal.find('.quploader-btn-torch').toggleClass('quploader-btn-torch-active', torchOn);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
        torchOn = !torchOn;
      }
    });

    // Grid toggle
    $modal.find('.quploader-btn-grid-toggle').on('click', () => {
      gridOn = !gridOn;
      $modal.find('.quploader-camera-grid').toggle(gridOn);
      $modal.find('.quploader-btn-grid-toggle').toggleClass('quploader-btn-active', gridOn);
    });

    // Mirror toggle
    $modal.find('.quploader-btn-mirror-toggle').on('click', () => {
      isMirrored = !isMirrored;
      $(video).toggleClass('quploader-mirror-active', isMirrored);
      $modal.find('.quploader-btn-mirror-toggle').toggleClass('quploader-btn-active', isMirrored);
    });

    // Settings Panel toggling
    $modal.find('.quploader-btn-settings-toggle, .quploader-btn-settings-close').on('click', () => {
      $modal.find('.quploader-camera-settings-panel').toggle();
    });

    // Fullscreen toggling
    $modal.find('.quploader-btn-fullscreen').on('click', () => {
      const doc = document as any;
      const modal = modalEl as any;
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
        if (modal.requestFullscreen) {
          modal.requestFullscreen().catch((err: any) => console.warn('Request fullscreen failed:', err));
        } else if (modal.webkitRequestFullscreen) {
          modal.webkitRequestFullscreen();
        } else if (modal.mozRequestFullScreen) {
          modal.mozRequestFullScreen();
        } else if (modal.msRequestFullscreen) {
          modal.msRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch((err: any) => console.warn('Exit fullscreen failed:', err));
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    });

    // ── Settings Panel Change Handlers ──────────────────────────────────



    $modal.find('.quploader-select-ratio').on('change', (e) => {
      selectedRatio = (e.target as HTMLSelectElement).value as any;
      startStream();
    });

    $modal.find('.quploader-select-filter').on('change', (e) => {
      selectedFilter = (e.target as HTMLSelectElement).value;
      $(video).css('filter', getFilterCSS(selectedFilter));
    });

    // ── Capture and Photo Review ──────────────────────────────────────────
    const drawProcessedImage = (
      targetCanvas: HTMLCanvasElement,
      sourceCanvas: HTMLCanvasElement,
      angle: number,
      ratio: '4:3' | '16:9' | '1:1',
      maxDim?: number
    ) => {
      const angleRad = (angle * Math.PI) / 180;
      const is90or270 = angle === 90 || angle === 270;

      // Full dimensions after rotation
      const rotWidth = is90or270 ? sourceCanvas.height : sourceCanvas.width;
      const rotHeight = is90or270 ? sourceCanvas.width : sourceCanvas.height;

      // Calculate target aspect ratio crop dimensions
      let targetRatio = 4 / 3;
      if (ratio === '16:9') targetRatio = 16 / 9;
      else if (ratio === '1:1') targetRatio = 1.0;

      // If the rotated image is portrait, flip the target ratio
      const isPortrait = rotHeight > rotWidth;
      if (isPortrait && ratio !== '1:1') {
        targetRatio = 1 / targetRatio;
      }

      let cw = rotWidth;
      let ch = rotHeight;
      const rotRatio = rotWidth / rotHeight;

      if (rotRatio > targetRatio) {
        // Rotated image is wider than target ratio: crop sides
        cw = rotHeight * targetRatio;
      } else if (rotRatio < targetRatio) {
        // Rotated image is taller than target ratio: crop top/bottom
        ch = rotWidth / targetRatio;
      }

      // Calculate final canvas dimensions (downscaled for preview if maxDim is specified)
      let finalWidth = cw;
      let finalHeight = ch;
      if (maxDim && (finalWidth > maxDim || finalHeight > maxDim)) {
        const scale = maxDim / Math.max(finalWidth, finalHeight);
        finalWidth = Math.round(finalWidth * scale);
        finalHeight = Math.round(finalHeight * scale);
      }

      const canvasW = finalWidth;
      const canvasH = finalHeight;

      if (targetCanvas.width !== canvasW) {
        targetCanvas.width = canvasW;
      }
      if (targetCanvas.height !== canvasH) {
        targetCanvas.height = canvasH;
      }

      const ctx = targetCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.save();
        ctx.translate(canvasW / 2, canvasH / 2);

        // Scale factor from rotated crop coordinates to final canvas coordinates
        const drawScale = finalWidth / cw;
        ctx.scale(drawScale, drawScale);

        // Clip to the crop box (which is aligned with the final canvas axes)
        ctx.beginPath();
        ctx.rect(-cw / 2, -ch / 2, cw, ch);
        ctx.clip();

        ctx.rotate(angleRad);
        ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
        ctx.restore();
      }

      return { isPortrait };
    };

    $modal.find('.quploader-btn-capture').on('click', async () => {
      try {
        let vw = video.videoWidth;
        let vh = video.videoHeight;

        // Fallback 1: Use active track settings if video element has 0 width/height (common on mobile)
        if ((!vw || !vh) && videoTrack) {
          try {
            const settings = videoTrack.getSettings();
            vw = settings.width || 0;
            vh = settings.height || 0;
            console.log('Video dimensions fallback to track settings:', vw, 'x', vh);
          } catch (trackErr) {
            console.warn('Could not read track settings:', trackErr);
          }
        }

        // Fallback 2: Use client display size of video element if still 0
        if (!vw || !vh) {
          vw = video.clientWidth || 0;
          vh = video.clientHeight || 0;
          console.log('Video dimensions fallback to client display size:', vw, 'x', vh);
        }

        // Fallback 3: Fall back to a standard resolution (1920x1080) instead of failing silently
        if (!vw || !vh) {
          vw = 1920;
          vh = 1080;
          console.warn('Could not resolve video dimensions. Defaulting to 1920x1080.');
        }

        console.log('Capture starting with resolved dimensions:', vw, 'x', vh);

        // Draw the full video frame to rawCapturedCanvas resized to Full HD (max 1920px)
        const maxCaptureDim = 1920;
        let cW = vw;
        let cH = vh;
        if (cW > maxCaptureDim || cH > maxCaptureDim) {
          const scale = maxCaptureDim / Math.max(cW, cH);
          cW = Math.round(cW * scale);
          cH = Math.round(cH * scale);
        }

        rawCapturedCanvas.width = cW;
        rawCapturedCanvas.height = cH;
        const rawCtx = rawCapturedCanvas.getContext('2d');
        if (!rawCtx) return;

        rawCtx.save();
        if (isMirrored) {
          rawCtx.translate(cW, 0);
          rawCtx.scale(-1, 1);
        }

        if (selectedFilter && selectedFilter !== 'none') {
          if ('filter' in rawCtx) {
            (rawCtx as any).filter = getFilterCSS(selectedFilter);
          }
        }

        // Draw the video frame to rawCapturedCanvas
        rawCtx.drawImage(video, 0, 0, cW, cH);
        rawCtx.restore();

        // Create a pre-scaled preview source canvas to make rotation calculations extremely light and fast
        const previewSourceCanvas = document.createElement('canvas');
        const maxPreviewDim = 1024;
        let pW = cW;
        let pH = cH;
        if (pW > maxPreviewDim || pH > maxPreviewDim) {
          const scale = maxPreviewDim / Math.max(pW, pH);
          pW = Math.round(pW * scale);
          pH = Math.round(pH * scale);
        }
        previewSourceCanvas.width = pW;
        previewSourceCanvas.height = pH;
        const pCtx = previewSourceCanvas.getContext('2d');
        if (pCtx) {
          pCtx.drawImage(rawCapturedCanvas, 0, 0, pW, pH);
        }

        // Review state (rotation angle)
        let rotationAngle = 0;

        const renderRotatedPreview = () => {
          drawProcessedImage(canvas, previewSourceCanvas, rotationAngle, selectedRatio, 1024);

          // Update the aspect ratio of the container to match the rotated review image
          currentViewfinderRatio = canvas.width / canvas.height;
          updateViewfinderAspectRatio();

          const dataUrl = canvas.toDataURL('image/jpeg');
          $(videoContainer).css({
            'background-image': `url(${dataUrl})`,
            'background-size': 'contain',
            'background-position': 'center',
            'background-repeat': 'no-repeat'
          });
        };

        renderRotatedPreview();

        // Switch UI to Review Mode
        try {
          video.pause();
        } catch (pauseErr) {
          console.warn('video.pause() failed:', pauseErr);
        }
        $modal.addClass('quploader-in-review');

        // Manual Rotation Button Handler
        $modal.find('.quploader-btn-rotate').off('click').on('click', () => {
          rotationAngle = (rotationAngle + 90) % 360;
          renderRotatedPreview();
        });

        // Use Photo Confirm Handler
        $modal.find('.quploader-btn-use-photo').off('click').on('click', () => {
          const exportCanvas = document.createElement('canvas');
          drawProcessedImage(exportCanvas, rawCapturedCanvas, rotationAngle, selectedRatio);

          exportCanvas.toBlob((blob) => {
            if (!blob) return;
            const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
            const file = new File([blob], `capture_${Date.now()}.${ext}`, { type: blob.type });
            this.ctx.handleFiles([file]);
            this.closeCamera($modal, cleanup);
          }, 'image/jpeg', 0.95);
        });

      } catch (err) {
        console.error('Capture failed:', err);
        alert('Could not capture photo.');
      }
    });

    // Retake button Handler
    $modal.find('.quploader-btn-retake').on('click', async () => {
      try {
        await video.play();
        calculateStreamingRatio();
        updateViewfinderAspectRatio();
      } catch (playErr) {
        console.warn('video.play() failed on retake:', playErr);
      }
      $(videoContainer).css('background-image', '');
      $modal.removeClass('quploader-in-review');
    });

    // Close button Handler
    $modal.find('.quploader-btn-close').on('click', () => {
      this.closeCamera($modal, cleanup);
    });
  }

  private closeCamera($modal: JQuery, cleanup?: () => void): void {
    if (cleanup) {
      try {
        cleanup();
      } catch (err) {
        console.warn('Cleanup failed:', err);
      }
    }
    const doc = document as any;
    if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    $modal.remove();
    $('body').removeClass('quploader-camera-opening');
  }
}
