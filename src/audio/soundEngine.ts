import { AmbientSoundId, AudioSettings, CustomAudioTrack } from '../types/app';
import {
  BUILTIN_MUSIC_TRACKS,
  MusicTrackMetadata,
  PIXEL_SCENES,
} from '../constants/scenesAndPresets';

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
  sourceType: 'bundled_file' | 'procedural_synth' | 'custom_file';
  sourceBadge: 'WAV' | 'SYNTH' | 'LOCAL';
  durationSeconds: number;
  coverImageUrl?: string;
  license?: string;
  folderName?: string;
  isCustom: boolean;
}

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private notificationGain: GainNode | null = null;
  private uiGain: GainNode | null = null;

  private musicTimerId: number | null = null;
  private synthProgressTimerId: number | null = null;
  private synthElapsedSeconds = 0;
  private synthStep = 0;

  private ambientNodes: AudioNode[] = [];
  private ambientTimerId: number | null = null;
  private activeAmbientId: AmbientSoundId | null = null;

  private customAudioEl: HTMLAudioElement | null = null;
  private activeAudioTrackId: string | null = null;
  private activeAudioSrc: string | null = null;

  private currentSettings: AudioSettings | null = null;
  private focusBoostActive = false;
  private unlockListenerAttached = false;

  private manifestLoaded = false;
  private manifestTracks: ManifestTrackEntry[] = [];
  private playbackProgress: PlaybackProgressState = {
    currentTime: 0,
    duration: 0,
    isSeekable: false,
    playbackError: null,
    sourceType: 'none',
  };
  private progressListeners: Set<(state: PlaybackProgressState) => void> =
    new Set();
  private manifestListeners: Set<(tracks: ManifestTrackEntry[]) => void> =
    new Set();
  private trackEndedCallback: (() => void) | null = null;

  constructor() {
    this.attachAutoUnlockListener();
    this.loadMusicManifest();
  }

  public async loadMusicManifest(): Promise<ManifestTrackEntry[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    // 1. Check Electron Desktop IPC manifest reader (supports file:// and local folder discovery)
    const desktopBridge = (
      window as unknown as {
        habitraDesktop?: {
          getMusicManifest?: () => Promise<{ tracks?: ManifestTrackEntry[] } | null>;
        };
      }
    ).habitraDesktop;

    if (desktopBridge?.getMusicManifest) {
      try {
        const ipcData = await desktopBridge.getMusicManifest();
        if (ipcData && Array.isArray(ipcData.tracks)) {
          this.manifestTracks = ipcData.tracks;
          this.manifestLoaded = true;
          this.manifestListeners.forEach((fn) => fn(this.manifestTracks));
          return this.manifestTracks;
        }
      } catch {
        // Continue to HTTP fetch or built-in fallback
      }
    }

    // 2. Standard HTTP/HTTPS fetch when running in browser or PWA
    if (
      typeof fetch !== 'undefined' &&
      window.location.protocol !== 'file:'
    ) {
      try {
        const response = await fetch('./music/manifest.json', {
          cache: 'no-cache',
        });
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.tracks)) {
            this.manifestTracks = data.tracks;
            this.manifestLoaded = true;
            this.manifestListeners.forEach((fn) => fn(this.manifestTracks));
            return this.manifestTracks;
          }
        }
      } catch {
        // Fallback to BUILTIN_MUSIC_TRACKS below
      }
    }

    // 3. Offline / file:// fallback using BUILTIN_MUSIC_TRACKS registry
    this.manifestTracks = BUILTIN_MUSIC_TRACKS.filter(
      (bt) => bt.id !== 'silent'
    ).map((bt) => ({
      id: bt.id,
      title: bt.title,
      artist: bt.artist,
      description: bt.description,
      category: bt.category,
      src: bt.src || `synth://${bt.id}`,
      durationSeconds: bt.durationSeconds,
      source: bt.source,
      license: bt.license,
      sceneAffinity: bt.coverSceneId,
    }));
    this.manifestLoaded = true;
    this.manifestListeners.forEach((fn) => fn(this.manifestTracks));
    return this.manifestTracks;
  }

  public getManifestTracks(): ManifestTrackEntry[] {
    return this.manifestTracks;
  }

  public subscribeManifest(
    listener: (tracks: ManifestTrackEntry[]) => void
  ): () => void {
    this.manifestListeners.add(listener);
    if (this.manifestLoaded) {
      listener(this.manifestTracks);
    }
    return () => {
      this.manifestListeners.delete(listener);
    };
  }

  public getAllLibraryTracks(
    customTracks: CustomAudioTrack[] = []
  ): UnifiedLibraryTrack[] {
    const map = new Map<string, UnifiedLibraryTrack>();

    // 1. Seed with BUILTIN_MUSIC_TRACKS (excluding 'silent')
    for (const bt of BUILTIN_MUSIC_TRACKS) {
      if (bt.id === 'silent') continue;
      const scene =
        PIXEL_SCENES.find((s) => s.id === bt.coverSceneId) || PIXEL_SCENES[0];
      const isBundled = bt.source === 'bundled_file';
      map.set(bt.id, {
        id: bt.id,
        title: bt.title,
        artist:
          bt.artist ||
          (isBundled ? 'Habitra Studio' : 'Habitra WebAudio Engine'),
        subtitle: bt.subtitle,
        description: bt.description || bt.subtitle,
        genre: bt.genre,
        category: bt.category,
        src: bt.src,
        sourceType: isBundled ? 'bundled_file' : 'procedural_synth',
        sourceBadge: isBundled ? 'WAV' : 'SYNTH',
        durationSeconds: bt.durationSeconds || (isBundled ? 12 : 32),
        coverImageUrl: scene?.imageUrl,
        license: bt.license || 'CC0-1.0 Public Domain',
        isCustom: false,
      });
    }

    // 2. Merge/add tracks discovered from public/music/manifest.json
    for (const mt of this.manifestTracks) {
      if (!mt.id || mt.id === 'silent') continue;
      const existing = map.get(mt.id);
      const scene =
        PIXEL_SCENES.find((s) => s.id === mt.sceneAffinity) || PIXEL_SCENES[0];
      const isSynth =
        mt.source === 'procedural_synth' ||
        (mt.src && mt.src.startsWith('synth://'));
      map.set(mt.id, {
        id: mt.id,
        title: mt.title || existing?.title || mt.id,
        artist:
          mt.artist ||
          existing?.artist ||
          (isSynth ? 'Habitra WebAudio Engine' : 'Habitra Studio'),
        subtitle:
          existing?.subtitle ||
          (isSynth
            ? `Procedural synth · ${mt.category}`
            : `Bundled audio · public/music/${mt.category}/`),
        description:
          mt.description ||
          existing?.description ||
          `Local ${mt.category} track`,
        genre:
          existing?.genre ||
          `${mt.category.charAt(0).toUpperCase() + mt.category.slice(1)}`,
        category: mt.category || existing?.category || 'ambient',
        src: mt.src || existing?.src,
        sourceType: isSynth ? 'procedural_synth' : 'bundled_file',
        sourceBadge: isSynth ? 'SYNTH' : 'WAV',
        durationSeconds:
          mt.durationSeconds || existing?.durationSeconds || (isSynth ? 32 : 12),
        coverImageUrl: mt.coverImage || existing?.coverImageUrl || scene?.imageUrl,
        license: mt.license || existing?.license || 'CC0-1.0 Public Domain',
        isCustom: false,
      });
    }

    // 3. Append user's imported custom tracks
    const defaultCover = PIXEL_SCENES[1]?.imageUrl || PIXEL_SCENES[0]?.imageUrl;
    for (const ct of customTracks) {
      map.set(ct.id, {
        id: ct.id,
        title: ct.name,
        artist: ct.artist || 'My Imported Music',
        subtitle: ct.folderName
          ? `Folder: ${ct.folderName}`
          : 'Imported Local Audio',
        description:
          ct.description ||
          (ct.folderName
            ? `Imported from folder "${ct.folderName}"`
            : 'Personal audio file stored locally in IndexedDB'),
        genre: 'Personal Library',
        category: ct.category || 'custom',
        src: ct.dataUrl,
        sourceType: 'custom_file',
        sourceBadge: 'LOCAL',
        durationSeconds: ct.durationSeconds || 0,
        coverImageUrl: defaultCover,
        license: 'Personal Local File',
        folderName: ct.folderName,
        isCustom: true,
      });
    }

    return Array.from(map.values());
  }

  public subscribeProgress(
    listener: (state: PlaybackProgressState) => void
  ): () => void {
    this.progressListeners.add(listener);
    listener(this.playbackProgress);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  public setOnTrackEnded(callback: (() => void) | null) {
    this.trackEndedCallback = callback;
  }

  private emitProgress(patch: Partial<PlaybackProgressState>) {
    this.playbackProgress = { ...this.playbackProgress, ...patch };
    this.progressListeners.forEach((fn) => fn(this.playbackProgress));
  }

  public clearPlaybackError() {
    this.emitProgress({ playbackError: null });
  }

  public seekTo(seconds: number) {
    if (this.customAudioEl) {
      const maxDur =
        Number.isFinite(this.customAudioEl.duration) &&
        this.customAudioEl.duration > 0
          ? this.customAudioEl.duration
          : this.playbackProgress.duration || 12;
      const clamped = Math.max(0, Math.min(maxDur, seconds));
      try {
        this.customAudioEl.currentTime = clamped;
      } catch {
        // Ignore DOMException if metadata not yet loaded
      }
      this.emitProgress({ currentTime: clamped });
    } else if (this.playbackProgress.sourceType === 'procedural_synth') {
      const clamped = Math.max(0, Math.min(32, seconds));
      this.synthElapsedSeconds = Math.floor(clamped);
      this.synthStep = Math.floor(clamped / 3.4);
      this.emitProgress({ currentTime: clamped });
    }
  }

  public restartCurrentTrack() {
    if (this.customAudioEl) {
      try {
        this.customAudioEl.currentTime = 0;
      } catch {
        // Ignore
      }
      this.emitProgress({ currentTime: 0, playbackError: null });
      if (this.currentSettings?.isPlaying) {
        this.customAudioEl.play().catch(() => {});
      }
    } else if (this.playbackProgress.sourceType === 'procedural_synth') {
      this.synthElapsedSeconds = 0;
      this.synthStep = 0;
      this.emitProgress({ currentTime: 0, playbackError: null });
    }
  }

  private attachAutoUnlockListener() {
    if (typeof window === 'undefined' || this.unlockListenerAttached) return;
    this.unlockListenerAttached = true;

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      } else if (
        (this.currentSettings?.isPlaying ||
          this.currentSettings?.ambientPlaying) &&
        !this.ctx
      ) {
        const s = this.currentSettings;
        this.currentSettings = null;
        this.syncSettings(s);
      }
      if (
        this.customAudioEl &&
        this.currentSettings?.isPlaying &&
        this.customAudioEl.paused
      ) {
        this.customAudioEl.play().catch(() => {});
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.musicGain = this.ctx.createGain();
      this.ambientGain = this.ctx.createGain();
      this.notificationGain = this.ctx.createGain();
      this.uiGain = this.ctx.createGain();

      this.musicGain.connect(this.ctx.destination);
      this.ambientGain.connect(this.ctx.destination);
      this.notificationGain.connect(this.ctx.destination);
      this.uiGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async resumeContextManually(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (
        this.customAudioEl &&
        this.currentSettings?.isPlaying &&
        this.customAudioEl.paused
      ) {
        await this.customAudioEl.play().catch(() => {});
      }
      return ctx.state === 'running';
    } catch {
      return false;
    }
  }

  public getDiagnostics(): AudioDiagnosticsStatus {
    const supported =
      typeof window !== 'undefined' &&
      Boolean(
        window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
      );
    const shouldPlayAmbient = Boolean(
      this.currentSettings &&
        (this.currentSettings.ambientPlaying ?? this.currentSettings.isPlaying) &&
        this.currentSettings.ambientSoundId !== 'silent'
    );
    return {
      supported,
      contextState: this.ctx
        ? (this.ctx.state as AudioDiagnosticsStatus['contextState'])
        : 'uninitialized',
      isPlaying: Boolean(this.currentSettings?.isPlaying),
      isAmbientPlaying: shouldPlayAmbient,
      isMuted: Boolean(this.currentSettings?.isMuted),
      activeMusicTrack:
        this.currentSettings?.currentTrackId || 'bundled_velvet_rain_lofi',
      activeAmbientSound: this.currentSettings?.ambientSoundId || 'rain',
      musicVolume: this.currentSettings?.musicVolume ?? 40,
      ambientVolume: this.currentSettings?.ambientVolume ?? 65,
      notificationVolume: this.currentSettings?.notificationVolume ?? 30,
      uiSoundVolume: this.currentSettings?.uiSoundVolume ?? 15,
      manifestLoaded: this.manifestLoaded,
      manifestTrackCount:
        this.manifestTracks.length || BUILTIN_MUSIC_TRACKS.length,
      lastPlaybackError: this.playbackProgress.playbackError,
    };
  }

  public setFocusImmersionBoost(active: boolean) {
    this.focusBoostActive = active;
    if (this.currentSettings) {
      this.updateVolumes(this.currentSettings);
    }
  }

  public syncSettings(settings: AudioSettings) {
    this.currentSettings = settings;

    const shouldPlayMusic =
      Boolean(settings.isPlaying) && settings.currentTrackId !== 'silent';
    const shouldPlayAmbient =
      Boolean(settings.ambientPlaying ?? settings.isPlaying) &&
      settings.ambientSoundId !== 'silent';

    // Always update volumes immediately when context or audio element exists
    if (shouldPlayMusic || shouldPlayAmbient || this.ctx) {
      this.ensureContext();
    }
    this.updateVolumes(settings);

    // 1. Handle Music Channel (True Pause/Resume vs Track Switch)
    if (settings.currentTrackId === 'silent') {
      this.stopMusic(true);
    } else {
      const trackChanged = this.activeAudioTrackId !== settings.currentTrackId;
      if (trackChanged) {
        this.stopMusic(true);
        // Prepare metadata/progress even if paused so UI shows accurate duration & seekability
        this.prepareOrStartMusic(settings, shouldPlayMusic);
      } else {
        // Same track: handle play/pause toggle or repeatMode update without resetting currentTime
        if (this.customAudioEl) {
          this.customAudioEl.loop =
            settings.repeatMode === 'one' && !settings.shuffle;
          if (shouldPlayMusic && this.customAudioEl.paused) {
            this.customAudioEl.play().catch((err) => {
              if (err && err.name !== 'NotAllowedError') {
                this.emitProgress({
                  playbackError: `Playback error: ${
                    err.message || 'Unable to play audio file'
                  }`,
                });
              }
            });
          } else if (!shouldPlayMusic && !this.customAudioEl.paused) {
            this.customAudioEl.pause();
          }
        } else {
          // Procedural synth track on the same track ID
          if (shouldPlayMusic && this.musicTimerId === null) {
            this.startProceduralSynthLoop(settings);
          } else if (!shouldPlayMusic && this.musicTimerId !== null) {
            this.pauseProceduralSynthLoop();
          }
        }
      }
    }

    // 2. Handle Ambient Soundscape Channel independently
    if (!shouldPlayAmbient) {
      if (this.activeAmbientId !== null) {
        this.stopAmbient();
      }
    } else if (this.activeAmbientId !== settings.ambientSoundId) {
      this.stopAmbient();
      this.startAmbient(settings.ambientSoundId);
    }
  }

  private updateVolumes(settings: AudioSettings) {
    const muteFactor = settings.isMuted ? 0 : 1;

    if (this.customAudioEl) {
      this.customAudioEl.volume = Math.min(
        1,
        Math.max(0, (settings.musicVolume / 100) * muteFactor)
      );
    }

    if (
      !this.ctx ||
      !this.musicGain ||
      !this.ambientGain ||
      !this.uiGain ||
      !this.notificationGain
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    const musicVol = (settings.musicVolume / 100) * 0.38 * muteFactor;
    const ambientBoost = this.focusBoostActive ? 1.22 : 1.0;
    const ambientVol =
      Math.min(1, (settings.ambientVolume / 100) * ambientBoost) *
      0.42 *
      muteFactor;
    const notifVol =
      ((settings.notificationVolume ?? 30) / 100) * 0.45 * muteFactor;
    const uiVol = (settings.uiSoundVolume / 100) * 0.4 * muteFactor;

    this.musicGain.gain.setTargetAtTime(musicVol, now, 0.05);
    this.ambientGain.gain.setTargetAtTime(ambientVol, now, 0.05);
    this.notificationGain.gain.setValueAtTime(notifVol, now);
    this.uiGain.gain.setValueAtTime(uiVol, now);
  }

  private pauseProceduralSynthLoop() {
    if (this.musicTimerId !== null) {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
    if (this.synthProgressTimerId !== null) {
      window.clearInterval(this.synthProgressTimerId);
      this.synthProgressTimerId = null;
    }
  }

  private stopMusic(resetPosition = true) {
    this.pauseProceduralSynthLoop();
    if (resetPosition) {
      this.synthElapsedSeconds = 0;
      this.synthStep = 0;
    }
    if (this.customAudioEl) {
      this.customAudioEl.onended = null;
      this.customAudioEl.onerror = null;
      this.customAudioEl.ontimeupdate = null;
      this.customAudioEl.onloadedmetadata = null;
      this.customAudioEl.pause();
      this.customAudioEl.src = '';
      this.customAudioEl = null;
    }
    if (resetPosition) {
      this.activeAudioTrackId = null;
      this.activeAudioSrc = null;
      this.emitProgress({
        currentTime: 0,
        duration: 0,
        isSeekable: false,
        playbackError: null,
        sourceType: 'none',
      });
    }
  }

  private resolveAudioFileSource(settings: AudioSettings): {
    url: string;
    title: string;
    isCustom: boolean;
    fallbackDuration: number;
  } | null {
    const custom = settings.customTracks.find(
      (t) => t.id === settings.currentTrackId
    );
    if (custom && custom.dataUrl) {
      return {
        url: custom.dataUrl,
        title: custom.name,
        isCustom: true,
        fallbackDuration: custom.durationSeconds || 0,
      };
    }

    const builtin: MusicTrackMetadata | undefined = BUILTIN_MUSIC_TRACKS.find(
      (t) => t.id === settings.currentTrackId
    );
    if (builtin?.src && !builtin.src.startsWith('synth://')) {
      return {
        url: builtin.src,
        title: builtin.title,
        isCustom: false,
        fallbackDuration: builtin.durationSeconds || 12,
      };
    }

    const manifestItem = this.manifestTracks.find(
      (t) => t.id === settings.currentTrackId
    );
    if (manifestItem?.src && !manifestItem.src.startsWith('synth://')) {
      return {
        url: manifestItem.src,
        title: manifestItem.title,
        isCustom: false,
        fallbackDuration: manifestItem.durationSeconds || 12,
      };
    }

    return null;
  }

  private prepareOrStartMusic(settings: AudioSettings, autoPlay: boolean) {
    this.activeAudioTrackId = settings.currentTrackId;
    const resolvedFile = this.resolveAudioFileSource(settings);

    if (resolvedFile) {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = resolvedFile.url;
      this.activeAudioSrc = resolvedFile.url;
      audio.loop = settings.repeatMode === 'one' && !settings.shuffle;
      audio.volume = settings.isMuted
        ? 0
        : Math.min(1, Math.max(0, settings.musicVolume / 100));

      this.emitProgress({
        currentTime: 0,
        duration: resolvedFile.fallbackDuration || 12,
        isSeekable: true,
        playbackError: null,
        sourceType: resolvedFile.isCustom ? 'custom_file' : 'bundled_file',
      });

      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          this.emitProgress({
            duration: audio.duration,
            isSeekable: true,
            playbackError: null,
          });
        }
      };

      audio.ontimeupdate = () => {
        this.emitProgress({
          currentTime: audio.currentTime,
          duration:
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration
              : resolvedFile.fallbackDuration || 12,
        });
      };

      audio.onended = () => {
        const repeatMode = this.currentSettings?.repeatMode || 'all';
        if (repeatMode === 'one') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
          return;
        }
        if (this.trackEndedCallback) {
          this.trackEndedCallback();
        } else if (repeatMode === 'all') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }
      };

      audio.onerror = () => {
        this.emitProgress({
          playbackError: `Unable to load "${resolvedFile.title}". The audio file may be missing, corrupted, or in an unsupported format.`,
        });
      };

      this.customAudioEl = audio;

      if (autoPlay) {
        audio.play().catch((err) => {
          if (err && err.name !== 'NotAllowedError') {
            this.emitProgress({
              playbackError: `Playback error for "${resolvedFile.title}": ${
                err.message || 'Unsupported audio format'
              }`,
            });
          }
        });
      }
      return;
    }

    // Otherwise, it's a procedural synth track
    this.synthElapsedSeconds = 0;
    this.synthStep = 0;
    this.emitProgress({
      currentTime: 0,
      duration: 32,
      isSeekable: true,
      playbackError: null,
      sourceType: 'procedural_synth',
    });

    if (autoPlay) {
      this.startProceduralSynthLoop(settings);
    }
  }

  private startProceduralSynthLoop(settings: AudioSettings) {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;
    this.updateVolumes(settings);
    this.pauseProceduralSynthLoop();

    this.synthProgressTimerId = window.setInterval(() => {
      const nextSec = this.synthElapsedSeconds + 1;
      if (nextSec >= 32) {
        const repeatMode = this.currentSettings?.repeatMode || 'all';
        const isShuffle = Boolean(this.currentSettings?.shuffle);
        if (repeatMode === 'one') {
          this.synthElapsedSeconds = 0;
        } else if (this.trackEndedCallback && (repeatMode === 'all' || isShuffle)) {
          this.synthElapsedSeconds = 0;
          this.trackEndedCallback();
          return;
        } else {
          this.synthElapsedSeconds = 0;
        }
      } else {
        this.synthElapsedSeconds = nextSec;
      }
      this.emitProgress({
        currentTime: this.synthElapsedSeconds,
        duration: 32,
        isSeekable: true,
        sourceType: 'procedural_synth',
      });
    }, 1000);

    // Generative Lo-Fi / Ambient chord progressions + gentle top melody notes
    const progressions: Record<string, number[][]> = {
      lofi_rain: [
        [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
        [220.0, 261.63, 329.63, 392.0, 493.88], // Am9
        [174.61, 220.0, 261.63, 349.23, 440.0], // Fmaj7
        [196.0, 246.94, 293.66, 349.23, 440.0], // G13
      ],
      ambient_piano: [
        [293.66, 349.23, 440.0, 523.25, 659.25], // Dm9
        [233.08, 293.66, 349.23, 440.0, 523.25], // Bbmaj9
        [261.63, 329.63, 392.0, 523.25, 587.33], // Cadd9
        [220.0, 261.63, 329.63, 440.0, 523.25], // Am7
      ],
      warm_piano: [
        [293.66, 349.23, 440.0, 523.25, 659.25],
        [233.08, 293.66, 349.23, 440.0, 523.25],
        [261.63, 329.63, 392.0, 523.25, 587.33],
        [220.0, 261.63, 329.63, 440.0, 523.25],
      ],
      midnight_synth: [
        [130.81, 196.0, 246.94, 329.63, 392.0],
        [146.83, 220.0, 261.63, 349.23, 440.0],
        [164.81, 246.94, 293.66, 392.0, 493.88],
        [174.61, 261.63, 329.63, 440.0, 523.25],
      ],
      cozy_synth: [
        [130.81, 196.0, 246.94, 329.63, 392.0],
        [146.83, 220.0, 261.63, 349.23, 440.0],
        [164.81, 246.94, 293.66, 392.0, 493.88],
        [174.61, 261.63, 329.63, 440.0, 523.25],
      ],
      cozy_guitar: [
        [196.0, 246.94, 293.66, 392.0, 587.33], // G
        [164.81, 246.94, 329.63, 392.0, 493.88], // Em7
        [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj7
        [293.66, 369.99, 440.0, 587.33, 659.25], // D6
      ],
      forest_breeze: [
        [196.0, 246.94, 293.66, 392.0, 587.33],
        [164.81, 246.94, 329.63, 392.0, 493.88],
        [261.63, 329.63, 392.0, 493.88, 587.33],
        [293.66, 369.99, 440.0, 587.33, 659.25],
      ],
      cyber_chill: [
        [110.0, 164.81, 220.0, 261.63, 329.63],
        [87.31, 130.81, 174.61, 220.0, 261.63],
        [98.0, 146.83, 196.0, 246.94, 293.66],
        [110.0, 164.81, 220.0, 329.63, 392.0],
      ],
      night_study: [
        [110.0, 164.81, 220.0, 261.63, 329.63],
        [87.31, 130.81, 174.61, 220.0, 261.63],
        [98.0, 146.83, 196.0, 246.94, 293.66],
        [110.0, 164.81, 220.0, 329.63, 392.0],
      ],
    };

    const trackId = settings.currentTrackId;
    const chords = progressions[trackId] || progressions.lofi_rain;

    const playChordStep = () => {
      if (
        !this.ctx ||
        !this.musicGain ||
        !this.currentSettings?.isPlaying ||
        this.currentSettings.currentTrackId === 'silent'
      ) {
        return;
      }

      const chord = chords[this.synthStep % chords.length];
      this.synthStep++;

      const now = this.ctx.currentTime;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        trackId === 'ambient_piano' || trackId === 'warm_piano'
          ? 1250
          : trackId === 'cozy_guitar' || trackId === 'forest_breeze'
          ? 1400
          : 820,
        now
      );
      filter.connect(this.musicGain);

      chord.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        const isMelodyNote = idx === chord.length - 1;
        osc.type =
          trackId === 'midnight_synth' ||
          trackId === 'cozy_synth' ||
          trackId === 'cyber_chill' ||
          trackId === 'night_study'
            ? isMelodyNote
              ? 'triangle'
              : 'sine'
            : 'triangle';

        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 9, now);

        const stagger =
          trackId === 'ambient_piano' ||
          trackId === 'warm_piano' ||
          trackId === 'cozy_guitar' ||
          trackId === 'forest_breeze'
            ? idx * 0.26
            : isMelodyNote
            ? 0.9
            : idx * 0.06;

        const start = now + stagger;
        const duration = isMelodyNote ? 2.1 : 3.2;

        noteGain.gain.setValueAtTime(0.0001, start);
        noteGain.gain.linearRampToValueAtTime(
          (isMelodyNote ? 0.14 : 0.2) / chord.length,
          start + (isMelodyNote ? 0.12 : 0.35)
        );
        noteGain.gain.exponentialRampToValueAtTime(0.0008, start + duration);

        osc.connect(noteGain);
        noteGain.connect(filter);

        osc.start(start);
        osc.stop(start + duration + 0.05);
      });
    };

    playChordStep();
    this.musicTimerId = window.setInterval(playChordStep, 3400);
  }

  private stopAmbient() {
    this.activeAmbientId = null;
    if (this.ambientTimerId !== null) {
      window.clearInterval(this.ambientTimerId);
      this.ambientTimerId = null;
    }
    this.ambientNodes.forEach((node) => {
      try {
        if (
          'stop' in node &&
          typeof (node as AudioScheduledSourceNode).stop === 'function'
        ) {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already stopped
      }
    });
    this.ambientNodes = [];
  }

  private startAmbient(soundId: AmbientSoundId) {
    if (soundId === 'silent') return;
    const ctx = this.ensureContext();
    if (!ctx || !this.ambientGain) return;
    this.activeAmbientId = soundId;
    if (this.currentSettings) {
      this.updateVolumes(this.currentSettings);
    }

    // Generate 4-second seamless noise buffer
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (
        soundId === 'brown_noise' ||
        soundId === 'train' ||
        soundId === 'fireplace' ||
        soundId === 'ocean'
      ) {
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 2.8;
      } else {
        // Pink-ish noise for rain, forest, cafe, white_noise
        output[i] = (lastOut + 0.12 * white) / 1.12;
        lastOut = output[i];
      }
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    if (soundId === 'rain') {
      filter.type = 'bandpass';
      filter.frequency.value = 1050;
      filter.Q.value = 0.65;
    } else if (soundId === 'forest' || soundId === 'nature_night') {
      filter.type = 'bandpass';
      filter.frequency.value = 620;
      filter.Q.value = 1.15;
    } else if (soundId === 'ocean') {
      filter.type = 'lowpass';
      filter.frequency.value = 440;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.14; // ~7 sec ocean wave cycle
      lfoGain.gain.value = 320;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.ambientNodes.push(lfo, lfoGain);
    } else if (soundId === 'cafe') {
      filter.type = 'bandpass';
      filter.frequency.value = 480;
      filter.Q.value = 0.85;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.35;
      lfoGain.gain.value = 120;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.ambientNodes.push(lfo, lfoGain);
    } else if (soundId === 'train') {
      filter.type = 'lowpass';
      filter.frequency.value = 250;
    } else if (soundId === 'fireplace') {
      filter.type = 'lowpass';
      filter.frequency.value = 340;
    } else if (soundId === 'brown_noise') {
      filter.type = 'lowpass';
      filter.frequency.value = 330;
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 1750;
    }

    noiseSource.connect(filter);
    filter.connect(this.ambientGain);
    noiseSource.start();
    this.ambientNodes.push(noiseSource, filter);

    // Add procedural organic details per soundscape
    if (soundId === 'train') {
      this.ambientTimerId = window.setInterval(() => {
        this.triggerSubtlePulse(108, 0.055);
        window.setTimeout(() => this.triggerSubtlePulse(94, 0.055), 220);
      }, 1550);
    } else if (soundId === 'forest' || soundId === 'nature_night') {
      this.ambientTimerId = window.setInterval(() => {
        if (Math.random() > 0.35) {
          this.triggerBirdOrCricket(soundId === 'forest' ? 1950 : 3200);
        }
      }, 2400);
    } else if (soundId === 'fireplace') {
      this.ambientTimerId = window.setInterval(() => {
        if (Math.random() > 0.25) {
          this.triggerFireCrackle();
        }
      }, 420);
    } else if (soundId === 'rain') {
      this.ambientTimerId = window.setInterval(() => {
        if (Math.random() > 0.3) {
          this.triggerRaindropPatter();
        }
      }, 280);
    }
  }

  private triggerSubtlePulse(freq: number, duration: number) {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.085, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(this.ambientGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private triggerFireCrackle() {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    const base = 900 + Math.random() * 1400;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.4, now + 0.035);
    g.gain.setValueAtTime(0.035, now);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.04);
    osc.connect(g);
    g.connect(this.ambientGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  private triggerRaindropPatter() {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const base = 1400 + Math.random() * 900;
    osc.frequency.setValueAtTime(base, now);
    g.gain.setValueAtTime(0.015, now);
    g.gain.exponentialRampToValueAtTime(0.0004, now + 0.025);
    osc.connect(g);
    g.connect(this.ambientGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  private triggerBirdOrCricket(baseFreq: number) {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.18, now + 0.12);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.028, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.18);
    osc.connect(g);
    g.connect(this.ambientGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // UI Sound Effects
  public playHabitCheck(completed: boolean) {
    if (
      this.currentSettings?.isMuted ||
      (this.currentSettings?.uiSoundVolume ?? 35) === 0
    ) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.uiGain) return;
    if (this.currentSettings) this.updateVolumes(this.currentSettings);
    const now = ctx.currentTime;

    const notes = completed ? [523.25, 659.25] : [392.0, 329.63];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      g.gain.setValueAtTime(0.24, now + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
      osc.connect(g);
      g.connect(this.uiGain!);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.2);
    });
  }

  public playStreakCelebration() {
    if (
      this.currentSettings?.isMuted ||
      (this.currentSettings?.uiSoundVolume ?? 35) === 0
    ) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.uiGain) return;
    if (this.currentSettings) this.updateVolumes(this.currentSettings);
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      g.gain.setValueAtTime(0.26, now + idx * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
      osc.connect(g);
      g.connect(this.uiGain!);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.38);
    });
  }

  public playTimerCompleteBell() {
    if (
      this.currentSettings?.isMuted ||
      (this.currentSettings?.notificationVolume ?? 30) === 0
    ) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.notificationGain) return;
    if (this.currentSettings) this.updateVolumes(this.currentSettings);
    const now = ctx.currentTime;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);
      g.gain.setValueAtTime(0.28, now + idx * 0.16);
      g.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.16 + 1.4);
      osc.connect(g);
      g.connect(this.notificationGain!);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 1.45);
    });
  }

  public playReminderChime() {
    if (
      this.currentSettings?.isMuted ||
      (this.currentSettings?.notificationVolume ?? 30) === 0
    ) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.notificationGain) return;
    if (this.currentSettings) this.updateVolumes(this.currentSettings);
    const now = ctx.currentTime;

    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      g.gain.setValueAtTime(0.24, now + idx * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);
      osc.connect(g);
      g.connect(this.notificationGain!);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.5);
    });
  }
}

export const soundEngine = new AmbientSoundEngine();
