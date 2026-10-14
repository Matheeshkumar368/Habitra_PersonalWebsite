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

/**
 * 100% Silent, Inert Sound Engine Stub for Habitra.
 * All audio playback, AudioContext creation, oscillators, hidden audio elements,
 * and audio timers are completely disabled and bypassed.
 */
class SilentSoundEngine {
  public playTabSwitch(): void {}
  public playUiClick(): void {}
  public playHabitCheck(_completed?: boolean): void {}
  public playStreakCelebration(): void {}
  public playRealmTravel(): void {}
  public playReminderChime(): void {}
  public playTimerAction(_action: 'start' | 'pause' | 'reset'): void {}
  public playTimerCompleteBell(): void {}
  public playNotification(_kind: 'info' | 'success' | 'warning' | 'alert'): void {}
  public playDialogToggle(_open: boolean): void {}
  public playMediaAction(_action: 'play' | 'pause' | 'skip'): void {}
  public playFocusTick(): void {}

  public syncSettings(_settings: AudioSettings): void {}
  public setFocusImmersionBoost(_active: boolean): void {}
  public async resumeContextManually(): Promise<void> {}
  public seekTo(_seconds: number): void {}
  public clearPlaybackError(): void {}
  public setOnTrackEnded(_cb: (() => void) | null): void {}
  public setOnSleepTimer(_cb: (() => void) | null): void {}
  public pauseAllPlayback(): void {}

  public subscribeProgress(
    listener: (state: PlaybackProgressState) => void
  ): () => void {
    listener({
      currentTime: 0,
      duration: 0,
      isSeekable: false,
      playbackError: null,
      sourceType: 'none',
    });
    return () => {};
  }

  public subscribeManifest(
    listener: (tracks: ManifestTrackEntry[]) => void
  ): () => void {
    listener([]);
    return () => {};
  }

  public async loadMusicManifest(): Promise<ManifestTrackEntry[]> {
    return [];
  }

  public getAllLibraryTracks(
    customTracks: CustomAudioTrack[] = []
  ): UnifiedLibraryTrack[] {
    return customTracks.map((c) => ({
      id: c.id,
      title: c.name,
      artist: c.artist || 'Local File',
      subtitle: c.mediaType === 'video' ? 'Personal Video' : 'Local Audio',
      description: c.description || '',
      genre: 'Local',
      category: c.category || 'custom',
      sourceType: 'custom_file',
      sourceBadge: 'LOCAL',
      durationSeconds: c.durationSeconds || 0,
      isCustom: true,
    }));
  }

  public getDiagnostics(): AudioDiagnosticsStatus {
    return {
      supported: false,
      contextState: 'uninitialized',
      isPlaying: false,
      isAmbientPlaying: false,
      isMuted: true,
      activeMusicTrack: 'silent',
      activeAmbientSound: 'silent',
      musicVolume: 0,
      ambientVolume: 0,
      notificationVolume: 0,
      uiSoundVolume: 0,
      manifestLoaded: false,
      manifestTrackCount: 0,
      lastPlaybackError: null,
    };
  }
}

export const soundEngine = new SilentSoundEngine();
