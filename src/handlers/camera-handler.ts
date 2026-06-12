import { QUploader } from '../types';

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
    let selectedRatio: '4:3' | '16:9' | '3:2' | '21:9' | '1:1' = '4:3';
    let selectedFilter = 'none';
    let isMirrored = false;
    let gridOn = false;
    let currentViewfinderRatio = 4 / 3;
    let currentOrientation: 'landscape' | 'portrait' = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    let hasManuallyToggledOrientation = false;

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
        bestFront = front || null;
      }

      return { bestBack, bestFront };
    };

    const modal = document.createElement('div');
    modal.className = `quploader-camera-modal${isMobile ? ' quploader-is-mobile' : ''}`;
    modal.innerHTML = `
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
                <option value="4:3" selected>4:3 Standard</option>
                <option value="16:9">16:9 Widescreen</option>
                <option value="3:2">3:2 Classic Photo</option>
                <option value="21:9">21:9 Cinematic</option>
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
          <button type="button" class="quploader-btn-switch" title="Switch Camera"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></button>
          <button type="button" class="quploader-btn-torch" title="Toggle Flash" style="display:none;">⚡</button>
          <button type="button" class="quploader-btn-grid-toggle" title="Toggle Grid"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg></button>
          <button type="button" class="quploader-btn-mirror-toggle" title="Toggle Mirror"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22" stroke-dasharray="3 3"></line><path d="M18 8l4 4-4 4M6 8L2 12l4 4M2 12h8M22 12h-8"/></svg></button>
          <button type="button" class="quploader-btn-orientation-toggle" title="Toggle Orientation (Landscape/Portrait)"><span class="quploader-orientation-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></span></button>
          <button type="button" class="quploader-btn-settings-toggle" title="Settings">⚙️</button>
          <button type="button" class="quploader-btn-fullscreen" title="Toggle Fullscreen">⛶</button>
        </div>
        <div class="quploader-camera-controls">
          <button type="button" class="quploader-btn-close" title="Close">Close</button>
          <button type="button" class="quploader-btn-capture" title="Capture">Capture</button>
        </div>
        <div class="quploader-camera-preview-controls">
          <button type="button" class="quploader-btn-retake">↩ Retake</button>
          <button type="button" class="quploader-btn-rotate">↻ Rotate</button>
          <button type="button" class="quploader-btn-use-photo">✔ Use Photo</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add('quploader-camera-opening');

    const video = modal.querySelector('.quploader-camera-video') as HTMLVideoElement;
    const canvas = modal.querySelector('.quploader-camera-preview') as HTMLCanvasElement;
    const videoContainer = modal.querySelector('.quploader-camera-video-container') as HTMLDivElement;
    const btnSwitch = modal.querySelector('.quploader-btn-switch') as HTMLButtonElement;
    const btnTorch = modal.querySelector('.quploader-btn-torch') as HTMLButtonElement;
    const btnGridToggle = modal.querySelector('.quploader-btn-grid-toggle') as HTMLButtonElement;
    const btnMirrorToggle = modal.querySelector('.quploader-btn-mirror-toggle') as HTMLButtonElement;
    const btnOrientationToggle = modal.querySelector('.quploader-btn-orientation-toggle') as HTMLButtonElement;
    const btnSettingsToggle = modal.querySelector('.quploader-btn-settings-toggle') as HTMLButtonElement;
    const btnSettingsClose = modal.querySelector('.quploader-btn-settings-close') as HTMLButtonElement;
    const btnFullscreen = modal.querySelector('.quploader-btn-fullscreen') as HTMLButtonElement;
    const btnClose = modal.querySelector('.quploader-btn-close') as HTMLButtonElement;
    const btnCapture = modal.querySelector('.quploader-btn-capture') as HTMLButtonElement;
    const btnRetake = modal.querySelector('.quploader-btn-retake') as HTMLButtonElement;
    const btnRotate = modal.querySelector('.quploader-btn-rotate') as HTMLButtonElement;
    const btnUsePhoto = modal.querySelector('.quploader-btn-use-photo') as HTMLButtonElement;
    const selectRatio = modal.querySelector('.quploader-select-ratio') as HTMLSelectElement;
    const selectFilter = modal.querySelector('.quploader-select-filter') as HTMLSelectElement;
    const resolutionStatus = modal.querySelector('.quploader-resolution-status') as HTMLSpanElement;
    const cameraGrid = modal.querySelector('.quploader-camera-grid') as HTMLDivElement;
    const settingsPanel = modal.querySelector('.quploader-camera-settings-panel') as HTMLDivElement;

    const updateFullscreenButtonState = () => {
      const doc = document as any;
      const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      btnFullscreen.classList.toggle('quploader-btn-active', isFull);
    };

    const cleanup = () => {
      window.removeEventListener('keydown', keydownHandler);
      window.removeEventListener('resize', resizeHandler);
      document.removeEventListener('fullscreenchange', updateFullscreenButtonState);
      document.removeEventListener('webkitfullscreenchange', updateFullscreenButtonState);
      document.removeEventListener('mozfullscreenchange', updateFullscreenButtonState);
      document.removeEventListener('MSFullscreenChange', updateFullscreenButtonState);
    };

    const keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeCamera(modal, cleanup);
    };

    window.addEventListener('keydown', keydownHandler);
    window.addEventListener('resize', resizeHandler);

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
        
        console.log('QUploader Camera List:', videoDevices.map(d => ({
          deviceId: d.deviceId,
          kind: d.kind,
          label: d.label || '(empty label, needs permission first)'
        })));

        // Hide switch button if 1 or 0 video cameras are detected
        if (videoDevices.length <= 1) {
          btnSwitch.classList.add('quploader-hidden');
        } else {
          btnSwitch.classList.remove('quploader-hidden');
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
            } else {
              currentDeviceId = '';
            }
          }
        } else {
          if (currentFacingMode === 'user') {
            currentDeviceId = '';
          }
        }
      } catch (err) {
        console.warn('Pre-select best camera failed:', err);
      }
    };

    function calculateStreamingRatio() {
      const isPortrait = currentOrientation === 'portrait';

      if (selectedRatio === '16:9') {
        currentViewfinderRatio = isPortrait ? 9 / 16 : 16 / 9;
      } else if (selectedRatio === '4:3') {
        currentViewfinderRatio = isPortrait ? 3 / 4 : 4 / 3;
      } else if (selectedRatio === '3:2') {
        currentViewfinderRatio = isPortrait ? 2 / 3 : 3 / 2;
      } else if (selectedRatio === '21:9') {
        currentViewfinderRatio = isPortrait ? 9 / 21 : 21 / 9;
      } else if (selectedRatio === '1:1') {
        currentViewfinderRatio = 1.0;
      }
    }

    function updateViewfinderAspectRatio() {
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

      videoContainer.style.width = Math.round(width) + 'px';
      videoContainer.style.height = Math.round(height) + 'px';
    }

    function resizeHandler() {
      if (!modal.classList.contains('quploader-in-review')) {
        if (!hasManuallyToggledOrientation) {
          currentOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
          updateOrientationButtonUI();
        }
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

      const resWidth = 2560;
      const resHeight = 1440;

      let aspectConstraint: number | undefined = undefined;
      if (selectedRatio === '4:3') aspectConstraint = 4 / 3;
      else if (selectedRatio === '16:9') aspectConstraint = 16 / 9;
      else if (selectedRatio === '3:2') aspectConstraint = 3 / 2;
      else if (selectedRatio === '21:9') aspectConstraint = 21 / 9;
      else if (selectedRatio === '1:1') aspectConstraint = 1.0;

      const constraints: MediaTrackConstraints = {
        width: { ideal: resWidth, max: resWidth },
        height: { ideal: resHeight, max: resHeight }
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
          updateOrientationButtonUI();
          calculateStreamingRatio();
          updateViewfinderAspectRatio();
        } catch (playErr) {
          console.warn('video.play() failed or was interrupted:', playErr);
        }

        video.onloadedmetadata = () => {
          updateOrientationButtonUI();
          calculateStreamingRatio();
          updateViewfinderAspectRatio();
        };

        // Read active resolution settings and show in UI
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          if (settings.width && settings.height) {
            resolutionStatus.textContent = `Active Resolution: ${settings.width}x${settings.height}`;
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
              btnTorch.style.display = 'block';
              torchOn = false;
              btnTorch.classList.remove('quploader-btn-torch-active');
            } else {
              torchSupported = false;
              btnTorch.style.display = 'none';
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
          btnTorch.style.display = 'none';
          zoomSupported = false;
          zoomCapabilities = null;
          currentZoom = 1;
        }

        // Apply visual states (filter, mirroring)
        video.style.filter = getFilterCSS(selectedFilter);
        video.classList.toggle('quploader-mirror-active', isMirrored);

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

    const updateOrientationButtonUI = () => {
      if (currentOrientation === 'portrait') {
        btnOrientationToggle.classList.remove('quploader-orientation-landscape');
        btnOrientationToggle.classList.add('quploader-orientation-portrait');
      } else {
        btnOrientationToggle.classList.remove('quploader-orientation-portrait');
        btnOrientationToggle.classList.add('quploader-orientation-landscape');
      }
    };

    const initCamera = async () => {
      await preSelectBestCamera();
      await startStream();
    };
    initCamera();

    // ── Quick Toolbar Actions ─────────────────────────────────────────────
    // Switch between the best Back and best Front camera
    btnSwitch.addEventListener('click', async () => {
      try {
        if (currentFacingMode === 'environment') {
          currentFacingMode = 'user';
          isMirrored = true; // Enable mirror by default for front camera
        } else {
          currentFacingMode = 'environment';
          isMirrored = false; // Disable mirror by default for back camera
        }
        btnMirrorToggle.classList.toggle('quploader-btn-active', isMirrored);
        
        currentDeviceId = ''; // Clear deviceId so it starts fresh with the new facingMode
        hasAutoSelectedBestBack = false; // Reset so that if we switched to environment, it auto-selects the best back camera
        await preSelectBestCamera();
        await startStream();
      } catch (err) {
        console.error('Switch camera failed:', err);
      }
    });

    // Torch/Flash toggle
    btnTorch.addEventListener('click', async () => {
      if (!videoTrack || !torchSupported) return;
      torchOn = !torchOn;
      try {
        await (videoTrack as any).applyConstraints({ advanced: [{ torch: torchOn }] });
        btnTorch.classList.toggle('quploader-btn-torch-active', torchOn);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
        torchOn = !torchOn;
      }
    });

    // Grid toggle
    btnGridToggle.addEventListener('click', () => {
      gridOn = !gridOn;
      cameraGrid.style.display = gridOn ? 'block' : 'none';
      btnGridToggle.classList.toggle('quploader-btn-active', gridOn);
    });

    // Mirror toggle
    btnMirrorToggle.addEventListener('click', () => {
      isMirrored = !isMirrored;
      video.classList.toggle('quploader-mirror-active', isMirrored);
      btnMirrorToggle.classList.toggle('quploader-btn-active', isMirrored);
    });

    // Orientation toggle
    btnOrientationToggle.addEventListener('click', () => {
      hasManuallyToggledOrientation = true;
      currentOrientation = currentOrientation === 'landscape' ? 'portrait' : 'landscape';
      updateOrientationButtonUI();
      calculateStreamingRatio();
      updateViewfinderAspectRatio();
    });

    // Settings Panel toggling
    const toggleSettingsPanel = () => {
      settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    };
    btnSettingsToggle.addEventListener('click', toggleSettingsPanel);
    btnSettingsClose.addEventListener('click', toggleSettingsPanel);

    // Fullscreen toggling
    btnFullscreen.addEventListener('click', () => {
      const doc = document as any;
      const modalEl = modal as any;
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
        if (modalEl.requestFullscreen) {
          modalEl.requestFullscreen().catch((err: any) => console.warn('Request fullscreen failed:', err));
        } else if (modalEl.webkitRequestFullscreen) {
          modalEl.webkitRequestFullscreen();
        } else if (modalEl.mozRequestFullScreen) {
          modalEl.mozRequestFullScreen();
        } else if (modalEl.msRequestFullscreen) {
          modalEl.msRequestFullscreen();
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
    selectRatio.addEventListener('change', (e) => {
      selectedRatio = (e.target as HTMLSelectElement).value as any;
      startStream();
    });

    selectFilter.addEventListener('change', (e) => {
      selectedFilter = (e.target as HTMLSelectElement).value;
      video.style.filter = getFilterCSS(selectedFilter);
    });

    // ── Capture and Photo Review ──────────────────────────────────────────
    const drawProcessedImage = (
      targetCanvas: HTMLCanvasElement,
      sourceCanvas: HTMLCanvasElement,
      angle: number,
      ratio: '4:3' | '16:9' | '3:2' | '21:9' | '1:1',
      orientation: 'landscape' | 'portrait',
      maxDim?: number
    ) => {
      const angleRad = (angle * Math.PI) / 180;
      const is90or270 = angle === 90 || angle === 270;

      // Full dimensions after rotation
      const rotWidth = is90or270 ? sourceCanvas.height : sourceCanvas.width;
      const rotHeight = is90or270 ? sourceCanvas.width : sourceCanvas.height;

      // Calculate target aspect ratio crop dimensions
      let targetRatio = 16 / 9;
      if (ratio === '4:3') targetRatio = 4 / 3;
      else if (ratio === '3:2') targetRatio = 3 / 2;
      else if (ratio === '21:9') targetRatio = 21 / 9;
      else if (ratio === '1:1') targetRatio = 1.0;

      // Calculate final orientation based on angle of rotation
      let finalOrientation = orientation;
      if (angle === 90 || angle === 270) {
        finalOrientation = orientation === 'landscape' ? 'portrait' : 'landscape';
      }

      const isPortrait = finalOrientation === 'portrait';
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

    btnCapture.addEventListener('click', async () => {
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
        const capturedOrientation = currentOrientation;

        const renderRotatedPreview = () => {
          drawProcessedImage(canvas, previewSourceCanvas, rotationAngle, selectedRatio, capturedOrientation, 1024);

          // Update the aspect ratio of the container to match the rotated review image
          currentViewfinderRatio = canvas.width / canvas.height;
          updateViewfinderAspectRatio();

          const dataUrl = canvas.toDataURL('image/jpeg');
          videoContainer.style.backgroundImage = `url(${dataUrl})`;
          videoContainer.style.backgroundSize = 'contain';
          videoContainer.style.backgroundPosition = 'center';
          videoContainer.style.backgroundRepeat = 'no-repeat';
        };

        renderRotatedPreview();

        // Switch UI to Review Mode
        try {
          video.pause();
        } catch (pauseErr) {
          console.warn('video.pause() failed:', pauseErr);
        }
        modal.classList.add('quploader-in-review');

        // Manual Rotation Button Handler
        btnRotate.addEventListener('click', () => {
          rotationAngle = (rotationAngle + 90) % 360;
          renderRotatedPreview();
        });

        // Use Photo Confirm Handler
        btnUsePhoto.addEventListener('click', () => {
          const exportCanvas = document.createElement('canvas');
          drawProcessedImage(exportCanvas, rawCapturedCanvas, rotationAngle, selectedRatio, capturedOrientation);

          exportCanvas.toBlob((blob) => {
            if (!blob) return;
            const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
            const file = new File([blob], `capture_${Date.now()}.${ext}`, { type: blob.type });
            this.ctx.handleFiles([file]);
            this.closeCamera(modal, cleanup);
          }, 'image/jpeg', 0.95);
        });

      } catch (err) {
        console.error('Capture failed:', err);
        alert('Could not capture photo.');
      }
    });

    // Retake button Handler
    btnRetake.addEventListener('click', async () => {
      try {
        await video.play();
        calculateStreamingRatio();
        updateViewfinderAspectRatio();
      } catch (playErr) {
        console.warn('video.play() failed on retake:', playErr);
      }
      videoContainer.style.backgroundImage = '';
      modal.classList.remove('quploader-in-review');
    });

    // Close button Handler
    btnClose.addEventListener('click', () => {
      this.closeCamera(modal, cleanup);
    });
  }

  private closeCamera(modal: HTMLElement, cleanup?: () => void): void {
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
    modal.remove();
    document.body.classList.remove('quploader-camera-opening');
  }
}
