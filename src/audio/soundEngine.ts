import { AmbientSoundId, AudioSettings, CustomAudioTrack } from '../types/app';
import { getAudioBlob } from '../db/indexedDb';

export interface AudioDiagnosticsStatus {
  supported: boolean;
  contextState: 'running' | 'suspended' | 'closed' | 'uninitialized';
  isPlaying: boolean;
  isAmbientPlaying: boolean;
  isMuted: boolean;
  activeMusicTrack: string;
  activeAmbientSound: AmbientSoundId;
  musicVolume: number;
  ambientVolume: number;
  notificationVolume: number;
  uiSoundVolume: number;
  manifestLoaded: boolean;
  manifestTrackCount: number;
  lastPlaybackError: string | null;
}

export interface PlaybackProgressState {
  currentTime: number;
  duration: number;
  isSeekable: boolean;
  playbackError: string | null;
  sourceType: 'bundled_file' | 'custom_file' | 'procedural_synth' | 'none';
}

export interface ManifestTrackEntry {
  id: string;
  title: string;
  artist?: string;
  description?: string;
  category: 'ambient' | 'focus' | 'nature' | 'rain' | 'instrumental';
  src: string;
  durationSeconds?: number;
  source?: 'bundled_file' | 'procedural_synth';
  license?: string;
  sceneAffinity?: string;
  coverImage?: string;
}

export interface UnifiedLibraryTrack {
  id: string;
  title: string;
  artist: string;
  subtitle: string;
  description: string;
  genre: string;
  category: 'ambient' | 'focus' | 'nature' | 'rain' | 'instrumental' | 'custom';
  src?: string;
  filePath?: string;
  sourceType: 'bundled_file' | 'procedural_synth' | 'custom_file';
  sourceBadge: 'MP3' | 'WAV' | 'SYNTH' | 'LOCAL';
  durationSeconds: number;
  coverImageUrl?: string;
  license?: string;
  folderName?: string;
  isCustom: boolean;
}

/**
 * Bundled offline soundscapes catalog for Habitra.
 */
const BUILTIN_BUNDLED_TRACKS: ManifestTrackEntry[] = [
  {
    id: 'bundled_velvet_rain_lofi',
    title: 'Velvet Rain Lo-Fi',
    artist: 'Habitra Studio',
    description: 'Warm electric piano chords over gentle rainy window reflections',
    category: 'rain',
    src: './music/rain/velvet-rain-lofi.wav',
    durationSeconds: 120,
    source: 'bundled_file',
  },
  {
    id: 'lofi_rain',
    title: 'Rainy Sanctuary Calm',
    artist: 'Habitra Lo-Fi',
    description: 'Deep soothing rain texture with procedural harmonic warmth',
    category: 'rain',
    src: './music/rain/velvet-rain-lofi.wav',
    durationSeconds: 180,
    source: 'bundled_file',
  },
  {
    id: 'ambient_piano',
    title: 'Starlight Piano Nocturne',
    artist: 'Habitra Piano',
    description: 'Minimalist felt piano arpeggios for sustained concentration',
    category: 'instrumental',
    src: './music/rain/velvet-rain-lofi.wav',
    durationSeconds: 150,
    source: 'bundled_file',
  },
  {
    id: 'midnight_synth',
    title: 'Midnight Synthwave Drift',
    artist: 'Habitra Synth',
    description: 'Analog synth pad progression for late-night focus sessions',
    category: 'focus',
    src: './music/rain/velvet-rain-lofi.wav',
    durationSeconds: 160,
    source: 'bundled_file',
  },
  {
    id: 'cozy_guitar',
    title: 'Cozy Fireplace Acoustic',
    artist: 'Habitra Studio',
    description: 'Acoustic fingerpicked guitar chords for cozy afternoon work',
    category: 'ambient',
    src: './music/rain/velvet-rain-lofi.wav',
    durationSeconds: 140,
    source: 'bundled_file',
  },
];

/**
 * Habitra Full Audio & Sound Engine
 * Provides:
 * 1. Persistent HTML5 Audio for offline MP3/WAV music library playback.
 * 2. Electron local-audio:// custom protocol streaming with seek & progress support.
 * 3. Browser IndexedDB Blob playback fallback for offline web development.
 * 4. Procedural Web Audio ambient soundscape generation (rain, forest, ocean, cafe, train, fireplace).
 * 5. Synthesized pleasant UI chimes and notifications (habits, bells, timers, clicks).
 */
class HabitraSoundEngine {
  private ctx: AudioContext | null = null;
  private musicAudio: HTMLAudioElement | null = null;

  // Active settings mirror
  private currentSettings: AudioSettings | null = null;
  private activeCustomTracks: CustomAudioTrack[] = [];
  private currentLoadedTrackId: string | null = null;
  private lastObjectUrl: string | null = null;
  private trackBlobUrlCache = new Map<string, string>();
  private lastPlaybackError: string | null = null;

  // Ambient sound synthesis nodes
  private ambientGainNode: GainNode | null = null;
  private ambientSourceNodes: AudioNode[] = [];
  private currentAmbientId: AmbientSoundId = 'silent';

  // Subscriptions
  private progressListeners = new Set<(state: PlaybackProgressState) => void>();
  private manifestListeners = new Set<(tracks: ManifestTrackEntry[]) => void>();
  private onTrackEndedCallback: (() => void) | null = null;
  private onSleepTimerCallback: (() => void) | null = null;

  private manifestTracks: ManifestTrackEntry[] = BUILTIN_BUNDLED_TRACKS;
  private manifestLoaded = false;
  private focusImmersionActive = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initMusicAudioElement();
      // Listen for window interaction to unlock AudioContext
      const unlock = () => {
        this.ensureContext();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  private initMusicAudioElement() {
    if (typeof Audio === 'undefined') return;
    this.musicAudio = new Audio();
    this.musicAudio.preload = 'auto';

    this.musicAudio.addEventListener('timeupdate', () => {
      this.emitProgress();
    });

    this.musicAudio.addEventListener('loadedmetadata', () => {
      this.lastPlaybackError = null;
      this.emitProgress();
    });

    this.musicAudio.addEventListener('ended', () => {
      if (this.onTrackEndedCallback) {
        this.onTrackEndedCallback();
      }
    });

    this.musicAudio.addEventListener('error', () => {
      const err = this.musicAudio?.error;
      let msg = 'Failed to load audio track.';
      if (err) {
        if (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          msg = 'Audio format not supported or file was moved/deleted.';
        } else if (err.code === MediaError.MEDIA_ERR_NETWORK) {
          msg = 'Network error while reading audio file.';
        } else if (err.code === MediaError.MEDIA_ERR_DECODE) {
          msg = 'Audio file corrupted or decoding failed.';
        }
      }
      this.lastPlaybackError = msg;
      this.emitProgress();
    });
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async resumeContextManually(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  // Rate limiting to prevent audio overlap when clicking rapidly
  private lastUiSoundTime = 0;

  // -------------------------------------------------------------
  // SYNTHESIZED UI SOUND EFFECTS (Subtle, Quiet, Opt-In By Default)
  // -------------------------------------------------------------
  private playTone(
    freq: number,
    durationMs: number,
    type: OscillatorType = 'sine',
    volumeFraction = 0.2
  ) {
    const nowMs = Date.now();
    if (nowMs - this.lastUiSoundTime < 60) return; // Prevent audio overlap on rapid clicking
    this.lastUiSoundTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      // Strictly disabled by default unless explicitly enabled
      const isUiSoundEnabled = Boolean(this.currentSettings?.uiSoundEnabled);
      if (!isUiSoundEnabled || this.currentSettings?.isMuted) return;

      const userVolume =
        ((this.currentSettings?.uiSoundVolume ?? 40) / 100) * volumeFraction * 0.45;
      if (userVolume <= 0) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(userVolume, now);
      gain.gain.exponentialRampToValueAtTime(
        0.00001,
        now + durationMs / 1000
      );

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationMs / 1000 + 0.04);
    } catch {
      // AudioContext failure recovery
    }
  }

  public playTabSwitch(): void {
    // Very subtle low wood-tap tone
    this.playTone(320, 28, 'sine', 0.1);
  }

  public playUiClick(): void {
    // Gentle quiet click
    this.playTone(480, 20, 'sine', 0.1);
  }

  public playUiSound(kind: 'button_click' | 'action_complete' | 'modal_toggle' | 'habit_done' | string): void {
    if (kind === 'button_click') {
      this.playUiClick();
    } else if (kind === 'action_complete') {
      this.playSaveSuccess();
    } else if (kind === 'habit_done') {
      this.playHabitCheck(true);
    } else if (kind === 'modal_toggle') {
      this.playDialogToggle(true);
    } else {
      this.playUiClick();
    }
  }

  public playToggle(checked = true): void {
    this.playTone(checked ? 540 : 420, 24, 'sine', 0.12);
  }

  public playSaveSuccess(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.currentSettings?.uiSoundEnabled || this.currentSettings?.isMuted) return;
    const now = ctx.currentTime;
    const vol = ((this.currentSettings?.uiSoundVolume ?? 40) / 100) * 0.12;
    if (vol <= 0) return;

    [523.25, 659.25].forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.00001, start + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.22);
      } catch {}
    });
  }

  public playStepChange(): void {
    this.playTone(560, 40, 'triangle', 0.14);
  }

  public playCoinDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = ((this.currentSettings?.uiSoundVolume ?? 25) / 100) * 0.35;
    [987.77, 1318.51].forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.05;
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.00001, start + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      } catch {}
    });
  }

  public playWarningTone(): void {
    this.playTone(330, 80, 'sine', 0.2);
  }

  public playHabitCheck(completed = true): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol =
      (this.currentSettings?.uiSoundVolume ?? 25) / 100 * 0.35;
    if (vol <= 0 || this.currentSettings?.isMuted) return;

    // Harmonious major 3rd bell (C5 -> E5 -> G5)
    const notes = completed ? [523.25, 659.25, 783.99] : [523.25, 440];
    notes.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      } catch {}
    });
  }

  public playStreakCelebration(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol =
      (this.currentSettings?.notificationVolume ?? 35) / 100 * 0.4;
    if (vol <= 0 || this.currentSettings?.isMuted) return;

    // Radiant celebration fanfare (C5, G5, C6)
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.55);
      } catch {}
    });
  }

  public playRealmTravel(): void {
    this.playTone(330, 250, 'sine', 0.25);
  }

  public playReminderChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol =
      (this.currentSettings?.notificationVolume ?? 35) / 100 * 0.38;
    if (vol <= 0 || this.currentSettings?.isMuted) return;

    // Gentle crystal marimba chime (G4 -> C5)
    [392.0, 523.25].forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.14;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.5);
      } catch {}
    });
  }

  public playTimerAction(_action: 'start' | 'pause' | 'reset'): void {
    this.playTone(600, 50, 'triangle', 0.2);
  }

  public playTimerCompleteBell(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol =
      (this.currentSettings?.notificationVolume ?? 40) / 100 * 0.5;
    if (vol <= 0 || this.currentSettings?.isMuted) return;

    // Gentle singing bowl bell with long warm resonance
    [440, 880, 1320].forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(vol / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.9);
      } catch {}
    });
  }

  public playNotification(_kind: 'info' | 'success' | 'warning' | 'alert'): void {
    this.playReminderChime();
  }

  public playDialogToggle(_open: boolean): void {
    this.playTone(550, 40, 'sine', 0.15);
  }

  public playMediaAction(_action: 'play' | 'pause' | 'skip'): void {
    this.playTone(650, 45, 'sine', 0.15);
  }

  public playFocusTick(): void {
    this.playTone(1200, 10, 'sine', 0.05);
  }

  // -------------------------------------------------------------
  // SYNTHESIZED AMBIENT SOUNDSCAPES
  // -------------------------------------------------------------
  private updateAmbientSoundscape(settings: AudioSettings) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const targetAmbient = settings.ambientSoundId || 'rain';
    const shouldPlay =
      Boolean(settings.ambientPlaying) &&
      targetAmbient !== 'silent' &&
      !settings.isMuted;

    if (!shouldPlay) {
      this.stopAmbientSoundscape();
      return;
    }

    // If already playing the requested ambient soundscape, just update volume
    if (this.currentAmbientId === targetAmbient && this.ambientGainNode) {
      const vol = Math.max(0, Math.min(1, (settings.ambientVolume ?? 50) / 100));
      this.ambientGainNode.gain.setTargetAtTime(vol * 0.4, ctx.currentTime, 0.1);
      return;
    }

    this.stopAmbientSoundscape();
    this.currentAmbientId = targetAmbient;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      const targetVol =
        Math.max(0, Math.min(1, (settings.ambientVolume ?? 50) / 100)) * 0.4;
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.exponentialRampToValueAtTime(targetVol, now + 0.5);
      masterGain.connect(ctx.destination);
      this.ambientGainNode = masterGain;

      // Create procedural noise buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        // Brown noise generation: integrate white noise
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();

      switch (targetAmbient) {
        case 'rain':
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(750, now);
          break;
        case 'forest':
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(900, now);
          filter.Q.setValueAtTime(1.8, now);
          break;
        case 'ocean':
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, now);
          break;
        case 'cafe':
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(550, now);
          break;
        case 'train':
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(320, now);
          break;
        case 'fireplace':
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(180, now);
          break;
        case 'white_noise':
          filter.type = 'allpass';
          break;
        case 'brown_noise':
        default:
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(400, now);
          break;
      }

      noiseSource.connect(filter);
      filter.connect(masterGain);
      noiseSource.start(now);

      this.ambientSourceNodes = [noiseSource, filter, masterGain];
    } catch {
      // Ignore ambient creation error
    }
  }

  private stopAmbientSoundscape() {
    if (this.ambientGainNode && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.ambientGainNode.gain.setTargetAtTime(0.0001, now, 0.2);
      } catch {}
    }
    for (const node of this.ambientSourceNodes) {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {}
    }
    this.ambientSourceNodes = [];
    this.ambientGainNode = null;
    this.currentAmbientId = 'silent';
  }

  // -------------------------------------------------------------
  // LOCAL & BUNDLED MUSIC PLAYBACK ENGINE
  // -------------------------------------------------------------
  public async syncSettings(settings: AudioSettings): Promise<void> {
    this.currentSettings = settings;
    this.activeCustomTracks = settings.customTracks || [];

    // Sync ambient soundscape
    this.updateAmbientSoundscape(settings);

    // Sync sleep timer
    if (settings.sleepTimerEndTimestamp) {
      const remainingMs = settings.sleepTimerEndTimestamp - Date.now();
      if (remainingMs <= 0) {
        this.pauseAllPlayback();
        if (this.onSleepTimerCallback) {
          this.onSleepTimerCallback();
        }
        return;
      }
    }

    if (!this.musicAudio) {
      this.initMusicAudioElement();
    }
    if (!this.musicAudio) return;

    // Apply volume smoothly
    const isMuted = Boolean(settings.isMuted);
    let volume = (settings.musicVolume ?? 40) / 100;
    if (this.focusImmersionActive) {
      volume = Math.min(1, volume * 1.25);
    }
    // Handle music playback:
    // Authoritative check: HTML5 audio only plays when activeSource is 'library'
    // If activeSource is 'youtube', 'spotify', 'video', 'none', or 'ambient', HTML5 music audio MUST NOT play
    const isLibrarySource =
      settings.activeSource === 'library' ||
      (!settings.activeSource && !settings.activeYouTubeId && !settings.activeSpotifyUri && !settings.activeVideoTrackId);

    const shouldPlay = Boolean(settings.isPlaying) && Boolean(settings.currentTrackId) && isLibrarySource;

    if (!shouldPlay) {
      if (!this.musicAudio.paused) {
        this.musicAudio.pause();
      }
      this.emitProgress();
      return;
    }

    // If already playing the requested track, ensure active playback without reloading or restarting
    if (this.currentLoadedTrackId === settings.currentTrackId) {
      if (this.musicAudio.paused && shouldPlay) {
        this.musicAudio.play().catch(() => {});
      }
      return;
    }

    // Load and play track
    await this.loadAndPlayTrack(settings.currentTrackId);
  }

  private async resolveTrackSource(
    trackId: string
  ): Promise<{ url: string; sourceType: PlaybackProgressState['sourceType'] } | null> {
    // 1. Check custom user-imported tracks
    const custom = this.activeCustomTracks.find((t) => t.id === trackId);
    if (custom) {
      // In Electron desktop: use persistent local-audio:// protocol with file path
      if (custom.filePath) {
        const cleanPath = custom.filePath.replace(/\\/g, '/');
        const encoded = encodeURI(cleanPath);
        return {
          url: `local-audio://${encoded}`,
          sourceType: 'custom_file',
        };
      }

      // In browser: check if blob stored in IndexedDB Media DB
      const trackBlobKey = custom.blobKey || custom.id;
      if (trackBlobKey) {
        // Reuse cached ObjectURL so navigation does not revoke playing media
        const cachedUrl = this.trackBlobUrlCache.get(trackBlobKey);
        if (cachedUrl) {
          return {
            url: cachedUrl,
            sourceType: 'custom_file',
          };
        }

        const blob = await getAudioBlob(trackBlobKey);
        if (blob) {
          const newUrl = URL.createObjectURL(blob);
          this.trackBlobUrlCache.set(trackBlobKey, newUrl);
          this.lastObjectUrl = newUrl;
          return {
            url: newUrl,
            sourceType: 'custom_file',
          };
        }
      }

      // Fallback: direct dataUrl if previously saved
      if (custom.dataUrl) {
        return {
          url: custom.dataUrl,
          sourceType: 'custom_file',
        };
      }
    }

    // 2. Check bundled music tracks
    const bundled = this.manifestTracks.find((t) => t.id === trackId);
    if (bundled && bundled.src) {
      return {
        url: bundled.src,
        sourceType: 'bundled_file',
      };
    }

    // If requested track is not found in custom or bundled tracks, do not secretly play a different track
    return null;
  }

  private async loadAndPlayTrack(trackId: string) {
    if (!this.musicAudio) return;

    try {
      const resolved = await this.resolveTrackSource(trackId);
      if (!resolved || !resolved.url) {
        this.lastPlaybackError = 'Audio file not found in library.';
        this.emitProgress();
        return;
      }

      if (this.currentLoadedTrackId !== trackId || this.musicAudio.src !== resolved.url) {
        this.currentLoadedTrackId = trackId;
        this.musicAudio.src = resolved.url;
        this.musicAudio.load();
      }

      const playPromise = this.musicAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== 'AbortError') {
            this.lastPlaybackError = err.message || 'Playback was prevented by system policy.';
          }
          this.emitProgress();
        });
      }
      this.lastPlaybackError = null;
    } catch (e) {
      this.lastPlaybackError = 'Failed to load audio track.';
      this.emitProgress();
    }
  }

  public seekTo(seconds: number): void {
    if (this.musicAudio && Number.isFinite(seconds) && seconds >= 0) {
      try {
        this.musicAudio.currentTime = Math.min(seconds, this.musicAudio.duration || seconds);
        this.emitProgress();
      } catch {}
    }
  }

  public clearPlaybackError(): void {
    this.lastPlaybackError = null;
    this.emitProgress();
  }

  public setOnTrackEnded(cb: (() => void) | null): void {
    this.onTrackEndedCallback = cb;
  }

  public setOnSleepTimer(cb: (() => void) | null): void {
    this.onSleepTimerCallback = cb;
  }

  public pauseAllPlayback(): void {
    if (this.musicAudio && !this.musicAudio.paused) {
      this.musicAudio.pause();
    }
    this.stopAmbientSoundscape();
    this.emitProgress();
  }

  public setFocusImmersionBoost(active: boolean): void {
    this.focusImmersionActive = Boolean(active);
    if (this.currentSettings) {
      this.syncSettings(this.currentSettings);
    }
  }

  private emitProgress(): void {
    const currentTime = this.musicAudio?.currentTime || 0;
    const duration = this.musicAudio?.duration || 0;
    const isSeekable = Number.isFinite(duration) && duration > 0;

    const state: PlaybackProgressState = {
      currentTime,
      duration: Number.isFinite(duration) ? duration : 0,
      isSeekable,
      playbackError: this.lastPlaybackError,
      sourceType: this.currentLoadedTrackId?.startsWith('custom_') ||
        this.currentLoadedTrackId?.startsWith('local_')
        ? 'custom_file'
        : 'bundled_file',
    };

    for (const listener of this.progressListeners) {
      try {
        listener(state);
      } catch {}
    }
  }

  public subscribeProgress(
    listener: (state: PlaybackProgressState) => void
  ): () => void {
    this.progressListeners.add(listener);
    this.emitProgress();
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  public subscribeManifest(
    listener: (tracks: ManifestTrackEntry[]) => void
  ): () => void {
    this.manifestListeners.add(listener);
    listener(this.manifestTracks);
    return () => {
      this.manifestListeners.delete(listener);
    };
  }

  public async loadMusicManifest(): Promise<ManifestTrackEntry[]> {
    if (this.manifestLoaded) return this.manifestTracks;
    try {
      const resp = await fetch('./music/manifest.json');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.tracks) && data.tracks.length > 0) {
          this.manifestTracks = data.tracks;
          this.manifestLoaded = true;
          for (const l of this.manifestListeners) {
            l(this.manifestTracks);
          }
        }
      }
    } catch {
      // Use fallback built-in tracks
    }
    return this.manifestTracks;
  }

  public getAllLibraryTracks(
    customTracks: CustomAudioTrack[] = []
  ): UnifiedLibraryTrack[] {
    const bundled: UnifiedLibraryTrack[] = this.manifestTracks.map((b) => ({
      id: b.id,
      title: b.title,
      artist: b.artist || 'Habitra Studio',
      subtitle: 'Bundled Offline Track',
      description: b.description || '',
      genre: 'Lo-Fi Ambient',
      category: b.category,
      src: b.src,
      sourceType: 'bundled_file',
      sourceBadge: 'WAV',
      durationSeconds: b.durationSeconds || 120,
      isCustom: false,
    }));

    const custom: UnifiedLibraryTrack[] = customTracks.map((c) => {
      const ext = c.name.split('.').pop()?.toUpperCase() || 'AUDIO';
      const badge: 'MP3' | 'WAV' | 'LOCAL' =
        ext === 'MP3' ? 'MP3' : ext === 'WAV' ? 'WAV' : 'LOCAL';

      return {
        id: c.id,
        title: c.name,
        artist: c.artist || 'Local Library',
        subtitle: c.mediaType === 'video' ? 'Personal Video' : 'Local Audio File',
        description: c.filePath ? c.filePath : (c.description || 'Offline audio track'),
        genre: 'Personal',
        category: c.category || 'custom',
        filePath: c.filePath,
        src: c.dataUrl,
        sourceType: 'custom_file',
        sourceBadge: badge,
        durationSeconds: c.durationSeconds || 0,
        isCustom: true,
      };
    });

    return [...bundled, ...custom];
  }

  public getDiagnostics(): AudioDiagnosticsStatus {
    const isPlaying = Boolean(this.musicAudio && !this.musicAudio.paused);
    return {
      supported: typeof Audio !== 'undefined',
      contextState: this.ctx ? (this.ctx.state as 'running' | 'suspended' | 'closed') : 'uninitialized',
      isPlaying,
      isAmbientPlaying: Boolean(this.ambientGainNode),
      isMuted: Boolean(this.currentSettings?.isMuted),
      activeMusicTrack: this.currentLoadedTrackId || 'none',
      activeAmbientSound: this.currentAmbientId,
      musicVolume: this.currentSettings?.musicVolume ?? 40,
      ambientVolume: this.currentSettings?.ambientVolume ?? 50,
      notificationVolume: this.currentSettings?.notificationVolume ?? 35,
      uiSoundVolume: this.currentSettings?.uiSoundVolume ?? 20,
      manifestLoaded: this.manifestLoaded,
      manifestTrackCount: this.manifestTracks.length,
      lastPlaybackError: this.lastPlaybackError,
    };
  }
}

export const soundEngine = new HabitraSoundEngine();
