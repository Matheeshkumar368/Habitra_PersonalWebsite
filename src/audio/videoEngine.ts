import { CustomAudioTrack } from '../types/app';
import { getAudioBlob } from '../db/indexedDb';
import { soundEngine } from './soundEngine';

export interface VideoProgressState {
  currentTime: number;
  duration: number;
  playbackState: 'playing' | 'paused' | 'stopped' | 'loading' | 'error';
  volume: number;
  isMuted: boolean;
  activeTrackId: string | null;
  activeTrack: CustomAudioTrack | null;
  errorMsg: string | null;
  isLoaded: boolean;
}

type VideoListener = (state: VideoProgressState) => void;

/**
 * Habitra Centralized Video Engine
 * Provides persistent, coordinated video playback across the entire desktop/web app.
 * Keeps media playback running seamlessly even when navigating away from the Video view.
 * 
 * Rules:
 * - Never revoke active Blob URLs during playback.
 * - Show real first frame preview when metadata loads instead of a blank screen.
 * - Accurately report errors (missing files, unsupported codecs, decode errors).
 * - Only standard MP4 (H.264/AAC) and WebM formats are supported across Chromium/Electron.
 */
class HabitraVideoEngine {
  private video: HTMLVideoElement | null = null;
  private currentTrack: CustomAudioTrack | null = null;
  private listeners = new Set<VideoListener>();
  private blobUrlCache = new Map<string, string>();
  private activeObjectUrl: string | null = null;
  private shouldAutoPlay = false;

  private currentState: VideoProgressState = {
    currentTime: 0,
    duration: 0,
    playbackState: 'stopped',
    volume: 80,
    isMuted: false,
    activeTrackId: null,
    activeTrack: null,
    errorMsg: null,
    isLoaded: false,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVideoElement();
    }
  }

  private initVideoElement() {
    if (this.video) return;
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.preload = 'auto';
    this.video.controls = false;
    this.video.crossOrigin = 'anonymous';
    this.video.className = 'w-full h-full object-contain select-none';

    this.video.addEventListener('loadedmetadata', () => {
      if (!this.video) return;
      this.currentState.duration = this.video.duration || 0;
      this.currentState.isLoaded = true;
      this.currentState.errorMsg = null;
      // Seek slightly forward to force Chromium to render the first video frame if paused
      if (this.video.paused && this.video.currentTime === 0) {
        try {
          this.video.currentTime = 0.001;
        } catch {}
      }
      this.emit();
    });

    this.video.addEventListener('canplay', () => {
      if (this.shouldAutoPlay && this.video && this.video.paused) {
        this.video.play().catch((err) => {
          if (err.name !== 'AbortError') {
            this.currentState.playbackState = 'error';
            this.currentState.errorMsg =
              err.message || 'Cannot play video. Verify format is standard MP4 (H.264/AAC).';
            this.emit();
          }
        });
      }
    });

    this.video.addEventListener('timeupdate', () => {
      if (this.video) {
        this.currentState.currentTime = this.video.currentTime;
        this.emit();
      }
    });

    this.video.addEventListener('play', () => {
      this.currentState.playbackState = 'playing';
      this.emit();
    });

    this.video.addEventListener('pause', () => {
      if (this.currentState.playbackState !== 'stopped') {
        this.currentState.playbackState = 'paused';
      }
      this.emit();
    });

    this.video.addEventListener('ended', () => {
      this.currentState.playbackState = 'stopped';
      this.currentState.currentTime = 0;
      this.shouldAutoPlay = false;
      this.emit();
    });

    this.video.addEventListener('error', () => {
      this.currentState.playbackState = 'error';
      const code = this.video?.error?.code;
      let msg = 'Failed to load video file or unsupported video codec.';
      if (code === 4) {
        msg = 'Video format not supported or media file is missing. Please ensure standard MP4 (H.264 video with AAC audio).';
      } else if (code === 3) {
        msg = 'Video decoding error occurred during playback. File may be corrupted or using unsupported codec.';
      } else if (code === 2) {
        msg = 'Network or filesystem error while fetching video.';
      } else if (code === 1) {
        msg = 'Video playback aborted by system.';
      }
      this.currentState.errorMsg = msg;
      this.emit();
    });
  }

  public attachToContainer(container: HTMLElement) {
    if (!this.video) this.initVideoElement();
    if (!this.video) return;

    if (this.video.parentElement !== container) {
      const wasPlaying = !this.video.paused;
      container.innerHTML = '';
      container.appendChild(this.video);
      // Restore playback smoothly if moving DOM nodes while playing
      if (wasPlaying && this.video.paused) {
        this.video.play().catch(() => {});
      }
    }
  }

  public detach() {
    if (this.video && this.video.parentElement) {
      this.video.parentElement.removeChild(this.video);
    }
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }

  public getState(): VideoProgressState {
    return { ...this.currentState };
  }

  public subscribe(listener: VideoListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const copy = this.getState();
    for (const l of this.listeners) {
      try {
        l(copy);
      } catch {}
    }
  }

  /**
   * Resolves playable source URL for the given track.
   * Supports:
   * 1. IndexedDB Blob storage (for web browser or web-uploaded media)
   * 2. Electron Desktop Protocol: local-video:///DRIVE:/path
   * 3. Fallback direct URLs or data URLs
   */
  public async resolveVideoUrl(track: CustomAudioTrack): Promise<string | null> {
    const isDesktop =
      typeof window !== 'undefined' &&
      Boolean(
        (
          window as unknown as {
            habitraDesktop?: { isElectron?: boolean; checkFileExists?: (p: string) => Promise<boolean> };
          }
        ).habitraDesktop?.isElectron
      );

    // 1. Check IndexedDB Blob storage first (preserved user media)
    const blobKey = track.blobKey || track.id;
    if (blobKey) {
      const cached = this.blobUrlCache.get(blobKey);
      if (cached) return cached;

      try {
        const blob = await getAudioBlob(blobKey);
        if (blob && blob.size > 0) {
          const url = URL.createObjectURL(blob);
          this.blobUrlCache.set(blobKey, url);
          return url;
        }
      } catch (err) {
        console.warn('Error reading video blob from IndexedDB:', err);
      }
    }

    // 2. Check direct dataUrl or pre-existing blob/http url
    if (track.dataUrl && (track.dataUrl.startsWith('data:') || track.dataUrl.startsWith('blob:') || track.dataUrl.startsWith('http'))) {
      return track.dataUrl;
    }

    // 3. Electron Desktop Protocol: local-video:///DRIVE:/path
    if (isDesktop && track.filePath) {
      const cleanPath = track.filePath.replace(/\\/g, '/');
      const formatted = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      return `local-video://${encodeURI(formatted)}`;
    }

    // 4. In web mode with a filesystem path but no blob
    if (!isDesktop && track.filePath && !blobKey) {
      this.currentState.errorMsg =
        'Local filesystem video paths require Habitra Desktop app or re-importing the MP4 file in browser mode.';
      this.emit();
      return null;
    }

    // 5. Fallback if desktop path exists without bridge
    if (track.filePath) {
      const cleanPath = track.filePath.replace(/\\/g, '/');
      const formatted = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      return `local-video://${encodeURI(formatted)}`;
    }

    return null;
  }

  /**
   * Load track metadata and poster frame without forcing autoplay.
   * Ensures the video screen does not remain a blank black box.
   */
  public async loadTrack(track: CustomAudioTrack, autoPlay = false) {
    if (!this.video) this.initVideoElement();
    if (!this.video) return;

    this.currentTrack = track;
    this.shouldAutoPlay = autoPlay;
    this.currentState = {
      ...this.currentState,
      activeTrackId: track.id,
      activeTrack: track,
      playbackState: autoPlay ? 'loading' : 'paused',
      currentTime: 0,
      errorMsg: null,
    };
    this.emit();

    // Validate format
    const ext = track.format?.toLowerCase() || track.name.split('.').pop()?.toLowerCase();
    if (ext && !['mp4', 'webm', 'mov', 'm4v'].includes(ext)) {
      this.currentState.playbackState = 'error';
      this.currentState.errorMsg = `.${ext.toUpperCase()} is not natively supported by Chromium/Electron. Please import standard MP4 (H.264/AAC).`;
      this.emit();
      return;
    }

    const url = await this.resolveVideoUrl(track);
    if (!url) {
      this.currentState.playbackState = 'error';
      this.currentState.errorMsg =
        'Video file is inaccessible or missing. Please re-import this MP4 video into Habitra.';
      this.emit();
      return;
    }

    this.activeObjectUrl = url;

    if (this.video.src !== url) {
      this.video.src = url;
      this.video.load();
    } else {
      if (autoPlay) {
        this.play();
      }
    }
  }

  /**
   * Start playback of a video track.
   * Stops local audio to prevent simultaneous playback.
   */
  public async playTrack(track: CustomAudioTrack, autoPlay = true) {
    // Authoritatively pause soundEngine to enforce single playback source
    soundEngine.pauseAllPlayback();
    await this.loadTrack(track, autoPlay);
  }

  public play() {
    if (!this.video) return;
    // Authoritatively pause soundEngine
    soundEngine.pauseAllPlayback();
    this.shouldAutoPlay = true;
    this.video.play().catch((err) => {
      if (err.name !== 'AbortError') {
        this.currentState.playbackState = 'error';
        this.currentState.errorMsg = err.message || 'Cannot play video. Verify format is standard MP4.';
        this.emit();
      }
    });
  }

  public pause() {
    if (!this.video) return;
    this.shouldAutoPlay = false;
    this.video.pause();
    this.currentState.playbackState = 'paused';
    this.emit();
  }

  public togglePlay() {
    if (!this.video) return;
    if (this.video.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  public stop() {
    if (!this.video) return;
    this.shouldAutoPlay = false;
    this.video.pause();
    this.video.currentTime = 0;
    this.currentState.playbackState = 'stopped';
    this.currentState.currentTime = 0;
    this.emit();
  }

  public seekTo(timeSeconds: number) {
    if (!this.video) return;
    const dur = this.video.duration || this.currentState.duration || 0;
    const target = Math.max(0, Math.min(timeSeconds, dur));
    this.video.currentTime = target;
    this.currentState.currentTime = target;
    this.emit();
  }

  public setVolume(volume0to100: number) {
    if (!this.video) return;
    const clamped = Math.max(0, Math.min(100, volume0to100));
    this.video.volume = clamped / 100;
    this.currentState.volume = clamped;
    this.emit();
  }

  public setMuted(muted: boolean) {
    if (!this.video) return;
    this.video.muted = muted;
    this.currentState.isMuted = muted;
    this.emit();
  }
}

export const videoEngine = new HabitraVideoEngine();
