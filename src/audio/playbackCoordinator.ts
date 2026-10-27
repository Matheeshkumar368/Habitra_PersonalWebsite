/**
 * Habitra Centralized Authoritative Playback Coordinator
 * 
 * Rules:
 * 1. Only ONE primary music source may play at a time (YouTube, Spotify, Local Audio, or Local Video).
 * 2. When a new source starts, pause or stop the previously active source.
 * 3. Never start all saved streams when a Play button is clicked.
 * 4. Switching tabs or remounting components does not duplicate playback.
 * 5. Pause only pauses the active source without starting another.
 * 6. Stop releases active resources and stops all Habitra-controlled audio.
 * 7. Synchronizes state with real media elements (loading, playing, paused, stopped, error).
 */

import { AudioSettings, CustomAudioTrack, SpotifySavedItem, YouTubeSavedItem } from '../types/app';
import { soundEngine } from './soundEngine';
import { videoEngine } from './videoEngine';

export type AuthoritativeSource = 'library' | 'youtube' | 'spotify' | 'video' | 'none';
export type AuthoritativeState = 'stopped' | 'loading' | 'playing' | 'paused' | 'error';

export interface PlaybackCoordinatorState {
  activeSource: AuthoritativeSource;
  playbackState: AuthoritativeState;
  activeTrackId: string | null;
  activeYouTubeId: string | null;
  activeSpotifyUri: string | null;
  activeVideoTrackId: string | null;
  errorMessage: string | null;
}

type StateListener = (state: PlaybackCoordinatorState) => void;

class AuthoritativePlaybackCoordinator {
  private listeners = new Set<StateListener>();
  private lastActionTimestamp = 0;
  private actionCooldownMs = 120; // Debounce rapid multi-clicks

  private currentState: PlaybackCoordinatorState = {
    activeSource: 'none',
    playbackState: 'stopped',
    activeTrackId: null,
    activeYouTubeId: null,
    activeSpotifyUri: null,
    activeVideoTrackId: null,
    errorMessage: null,
  };

  /**
   * Sync from existing AudioSettings (e.g. on application launch or store hydration)
   */
  public syncFromSettings(settings: AudioSettings): void {
    const rawSource = settings.activeSource;
    let activeSource: AuthoritativeSource = 'none';

    if (rawSource === 'library' || rawSource === 'youtube' || rawSource === 'spotify' || rawSource === 'video') {
      activeSource = rawSource;
    }

    this.currentState = {
      activeSource,
      playbackState: settings.isPlaying ? 'playing' : 'stopped',
      activeTrackId: settings.currentTrackId || null,
      activeYouTubeId: settings.activeYouTubeId || null,
      activeSpotifyUri: settings.activeSpotifyUri || null,
      activeVideoTrackId: settings.activeVideoTrackId || null,
      errorMessage: null,
    };
    this.emit();
  }

  public getState(): PlaybackCoordinatorState {
    return { ...this.currentState };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const copy = this.getState();
    for (const l of this.listeners) {
      try {
        l(copy);
      } catch {}
    }
  }

  /**
   * Helper to determine if an action should be throttled
   */
  private checkCooldown(): boolean {
    const now = Date.now();
    if (now - this.lastActionTimestamp < this.actionCooldownMs) {
      return false;
    }
    this.lastActionTimestamp = now;
    return true;
  }

  /**
   * Play a Local Audio Track (MP3/WAV)
   * Authoritatively stops YouTube, Spotify, and Video Songs.
   */
  public preparePlayLocalTrack(
    trackId: string,
    currentSettings: AudioSettings,
    playlistId?: string | null
  ): Partial<AudioSettings> | null {
    if (!this.checkCooldown()) return null;

    // Authoritatively stop any video playback and streams
    videoEngine.pause();

    this.currentState = {
      activeSource: 'library',
      playbackState: 'loading',
      activeTrackId: trackId,
      activeYouTubeId: null,
      activeSpotifyUri: null,
      activeVideoTrackId: null,
      errorMessage: null,
    };
    this.emit();

    return {
      activeSource: 'library',
      currentTrackId: trackId,
      isPlaying: true,
      playbackStatus: 'playing',
      activeYouTubeId: null,
      activeSpotifyUri: null,
      activeVideoTrackId: null,
      activePlaylistId: playlistId !== undefined ? playlistId : currentSettings.activePlaylistId,
    };
  }

  /**
   * Play a YouTube Stream
   * Authoritatively stops Local Audio, Spotify, and Video Songs.
   */
  public preparePlayYouTube(
    embedId: string,
    item?: YouTubeSavedItem
  ): Partial<AudioSettings> | null {
    if (!this.checkCooldown()) return null;

    // Immediately stop local audio engine and video engine
    soundEngine.pauseAllPlayback();
    videoEngine.pause();

    this.currentState = {
      activeSource: 'youtube',
      playbackState: 'loading',
      activeTrackId: null,
      activeYouTubeId: embedId,
      activeSpotifyUri: null,
      activeVideoTrackId: null,
      errorMessage: null,
    };
    this.emit();

    return {
      activeSource: 'youtube',
      activeYouTubeId: embedId,
      activeSpotifyUri: null,
      activeVideoTrackId: null,
      isPlaying: true,
      playbackStatus: 'loading',
    };
  }

  /**
   * Play a Spotify Embed
   * Authoritatively stops Local Audio, YouTube, and Video Songs.
   */
  public preparePlaySpotify(
    embedUri: string,
    item?: SpotifySavedItem
  ): Partial<AudioSettings> | null {
    if (!this.checkCooldown()) return null;

    soundEngine.pauseAllPlayback();
    videoEngine.pause();

    this.currentState = {
      activeSource: 'spotify',
      playbackState: 'playing',
      activeTrackId: null,
      activeYouTubeId: null,
      activeSpotifyUri: embedUri,
      activeVideoTrackId: null,
      errorMessage: null,
    };
    this.emit();

    return {
      activeSource: 'spotify',
      activeSpotifyUri: embedUri,
      activeYouTubeId: null,
      activeVideoTrackId: null,
      isPlaying: true,
      playbackStatus: 'playing',
    };
  }

  /**
   * Play a Local Video Song
   * Authoritatively stops Local Audio, YouTube, and Spotify.
   */
  public preparePlayVideo(
    videoTrackId: string
  ): Partial<AudioSettings> | null {
    if (!this.checkCooldown()) return null;

    soundEngine.pauseAllPlayback();

    this.currentState = {
      activeSource: 'video',
      playbackState: 'playing',
      activeTrackId: null,
      activeYouTubeId: null,
      activeSpotifyUri: null,
      activeVideoTrackId: videoTrackId,
      errorMessage: null,
    };
    this.emit();

    return {
      activeSource: 'video',
      activeVideoTrackId: videoTrackId,
      activeYouTubeId: null,
      activeSpotifyUri: null,
      isPlaying: true,
      playbackStatus: 'playing',
    };
  }

  /**
   * Pause the active source without starting any other source
   */
  public preparePause(currentSettings: AudioSettings): Partial<AudioSettings> {
    soundEngine.pauseAllPlayback();
    videoEngine.pause();

    this.currentState = {
      ...this.currentState,
      playbackState: 'paused',
    };
    this.emit();

    return {
      isPlaying: false,
      playbackStatus: 'paused',
    };
  }

  /**
   * Resume the currently active source
   */
  public prepareResume(currentSettings: AudioSettings): Partial<AudioSettings> {
    if (!this.checkCooldown()) return {};

    const src = currentSettings.activeSource || this.currentState.activeSource;
    if (src === 'video') {
      videoEngine.play();
    }

    this.currentState = {
      ...this.currentState,
      playbackState: 'playing',
    };
    this.emit();

    return {
      isPlaying: true,
      playbackStatus: 'playing',
      activeSource: src,
    };
  }

  /**
   * Full Stop & Resource Release
   */
  public prepareStopAll(): Partial<AudioSettings> {
    soundEngine.pauseAllPlayback();
    soundEngine.seekTo(0);
    videoEngine.stop();

    this.currentState = {
      activeSource: 'none',
      playbackState: 'stopped',
      activeTrackId: null,
      activeYouTubeId: null,
      activeSpotifyUri: null,
      activeVideoTrackId: null,
      errorMessage: null,
    };
    this.emit();

    return {
      isPlaying: false,
      playbackStatus: 'stopped',
      activeSource: 'none',
      activeYouTubeId: null,
      activeSpotifyUri: null,
      activeVideoTrackId: null,
    };
  }

  /**
   * Report an accurate error from the real media element (e.g. YouTube iframe error 150/153)
   */
  public reportMediaError(message: string): void {
    this.currentState = {
      ...this.currentState,
      playbackState: 'error',
      errorMessage: message,
    };
    this.emit();
  }

  /**
   * Report accurate media playing state from real player event
   */
  public reportMediaPlaying(): void {
    this.currentState = {
      ...this.currentState,
      playbackState: 'playing',
      errorMessage: null,
    };
    this.emit();
  }
}

export const playbackCoordinator = new AuthoritativePlaybackCoordinator();
