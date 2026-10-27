import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Music,
  Radio,
  Film,
  Tv,
} from 'lucide-react';
import { AudioSettings } from '../types/app';
import { PlaybackProgressState, soundEngine } from '../audio/soundEngine';
import { VideoProgressState, videoEngine } from '../audio/videoEngine';
import { BUILTIN_MUSIC_TRACKS } from '../constants/scenesAndPresets';
import { AudioReactiveVisualizer } from './AudioReactiveVisualizer';

interface FixedDesktopMediaBarProps {
  audio: AudioSettings;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onNavigateToMusic: () => void;
  onNavigateToStreaming?: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
  accentColor?: string;
}

function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const FixedDesktopMediaBar: React.FC<FixedDesktopMediaBarProps> = ({
  audio,
  onUpdateAudio,
  onNavigateToMusic,
  onNavigateToStreaming,
  onNextTrack,
  onPrevTrack,
  accentColor = '#6366f1',
}) => {
  const [progress, setProgress] = useState<PlaybackProgressState>({
    currentTime: 0,
    duration: 0,
    isSeekable: false,
    playbackError: null,
    sourceType: 'none',
  });
  const [videoProgress, setVideoProgress] = useState<VideoProgressState>(videoEngine.getState());
  const [isHovered, setIsHovered] = useState(false);
  const [volumeHover, setVolumeHover] = useState(false);

  useEffect(() => {
    const unsubAudio = soundEngine.subscribeProgress((st) => {
      setProgress(st);
    });
    const unsubVideo = videoEngine.subscribe((vSt) => {
      setVideoProgress(vSt);
    });
    return () => {
      unsubAudio();
      unsubVideo();
    };
  }, []);

  // Authoritative Source Resolution
  const isVideo = audio.activeSource === 'video' && Boolean(audio.activeVideoTrackId);
  const isYouTube = audio.activeSource === 'youtube' && Boolean(audio.activeYouTubeId);
  const isSpotify = audio.activeSource === 'spotify' && Boolean(audio.activeSpotifyUri);
  const isLibrary = !isVideo && !isYouTube && !isSpotify;

  const isPlaying = isVideo
    ? videoProgress.playbackState === 'playing'
    : Boolean(audio.isPlaying);
  const isMuted = Boolean(audio.isMuted);
  const volume = isMuted ? 0 : audio.musicVolume ?? 40;

  // Real progress state based on active source
  const currentMediaTime = isVideo ? videoProgress.currentTime : progress.currentTime;
  const currentMediaDuration = isVideo ? videoProgress.duration : progress.duration;

  // Resolve current track title & artist label based on authoritative source
  let trackTitle = 'Velvet Rain Lo-Fi';
  let trackArtist = 'Habitra Sanctuary';
  let SourceIcon = Music;
  let sourceBadge = 'LOCAL AUDIO';

  if (isVideo) {
    const activeVideo =
      (audio.videoTracks || []).find((v) => v.id === audio.activeVideoTrackId) ||
      (audio.customTracks || []).find((v) => v.id === audio.activeVideoTrackId);
    trackTitle = activeVideo?.name || 'Local Video Song';
    trackArtist = 'Local Video Library (MP4)';
    SourceIcon = Film;
    sourceBadge = 'VIDEO SONG';
  } else if (isYouTube) {
    const ytItem = (audio.youtubeItems || []).find(
      (y) => y.embedId === audio.activeYouTubeId
    );
    trackTitle = ytItem?.title || 'YouTube Focus Stream';
    trackArtist = 'Live Ambient Broadcast';
    SourceIcon = Tv;
    sourceBadge = 'YOUTUBE';
  } else if (isSpotify) {
    const spItem = (audio.spotifyItems || []).find(
      (s) => s.embedUri === audio.activeSpotifyUri
    );
    trackTitle = spItem?.title || 'Spotify Ambient Stream';
    trackArtist = 'Spotify Audio Session';
    SourceIcon = Radio;
    sourceBadge = 'SPOTIFY';
  } else {
    const currentTrackId = audio.currentTrackId;
    const customTrack = audio.customTracks?.find((t) => t.id === currentTrackId);
    const builtinTrack = BUILTIN_MUSIC_TRACKS.find((t) => t.id === currentTrackId);
    trackTitle = customTrack?.name || builtinTrack?.title || 'Velvet Rain Lo-Fi';
    trackArtist = customTrack?.artist || builtinTrack?.artist || 'Habitra Sanctuary';
    SourceIcon = Music;
    sourceBadge = customTrack ? 'MY AUDIO' : 'BUILTIN';
  }

  const isSeekableMedia = isLibrary || isVideo;
  const progressPercent =
    currentMediaDuration > 0
      ? Math.min(100, (currentMediaTime / currentMediaDuration) * 100)
      : 0;

  const handleTogglePlay = () => {
    soundEngine.playUiClick();
    if (isPlaying) {
      if (isVideo) {
        videoEngine.pause();
      } else {
        soundEngine.pauseAllPlayback();
      }
      onUpdateAudio({ isPlaying: false, playbackStatus: 'paused' });
    } else {
      if (isVideo) {
        soundEngine.pauseAllPlayback();
        videoEngine.play();
        onUpdateAudio({ isPlaying: true, activeSource: 'video', playbackStatus: 'playing' });
      } else if (isYouTube) {
        videoEngine.pause();
        soundEngine.pauseAllPlayback();
        onUpdateAudio({ isPlaying: true, activeSource: 'youtube', playbackStatus: 'playing' });
      } else if (isSpotify) {
        videoEngine.pause();
        soundEngine.pauseAllPlayback();
        onUpdateAudio({ isPlaying: true, activeSource: 'spotify', playbackStatus: 'playing' });
      } else {
        videoEngine.pause();
        onUpdateAudio({ isPlaying: true, activeSource: 'library', playbackStatus: 'playing' });
      }
    }
  };

  const handleStop = () => {
    soundEngine.playUiClick();
    videoEngine.stop();
    soundEngine.pauseAllPlayback();
    soundEngine.seekTo(0);
    onUpdateAudio({
      isPlaying: false,
      playbackStatus: 'stopped',
      activeSource: 'none',
      activeVideoTrackId: null,
      activeYouTubeId: null,
      activeSpotifyUri: null,
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isVideo) {
      videoEngine.seekTo(val);
    } else {
      soundEngine.seekTo(val);
    }
  };

  const handleToggleMute = () => {
    soundEngine.playUiClick();
    if (isVideo) {
      videoEngine.setMuted(!isMuted);
    }
    onUpdateAudio({ isMuted: !isMuted });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    if (isVideo) {
      videoEngine.setVolume(newVol);
    }
    onUpdateAudio({ musicVolume: newVol, isMuted: false });
  };

  const handleOpenSourceView = () => {
    soundEngine.playUiClick();
    if (isVideo) {
      onNavigateToMusic();
    } else if (isYouTube || isSpotify) {
      if (onNavigateToStreaming) onNavigateToStreaming();
      else onNavigateToMusic();
    } else {
      onNavigateToMusic();
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 shadow-2xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Desktop Media Player"
    >
      {/* Top micro progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-800/60 overflow-hidden">
        <div
          className="h-full transition-all duration-150 ease-linear"
          style={{
            width: `${isSeekableMedia ? progressPercent : isPlaying ? 100 : 0}%`,
            backgroundColor: accentColor,
            boxShadow: isPlaying ? `0 0 8px ${accentColor}` : 'none',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-4">
        {/* Left Section: Track Info & Artwork */}
        <div className="flex items-center gap-3 min-w-[220px] max-w-[320px] shrink-0">
          <div
            onClick={handleOpenSourceView}
            className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shrink-0 cursor-pointer group shadow"
            title="Open Dedicated Media View"
          >
            <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-indigo-400 group-hover:text-indigo-300 transition-colors">
              <SourceIcon className="w-5 h-5" />
            </div>
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenSourceView}
                className="text-xs font-bold text-white hover:text-indigo-300 truncate cursor-pointer text-left transition-colors"
                title={trackTitle}
              >
                {trackTitle}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {trackArtist}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {sourceBadge}
              </span>

              {/* Animated Equalizer Waves (animates ONLY when playing, settles when paused) */}
              <div
                className="flex items-end gap-0.5 h-3 px-1 rounded bg-slate-900/60 border border-slate-800"
                title={isPlaying ? 'Media Playing' : 'Playback Paused'}
              >
                <span
                  className={`w-0.5 rounded-full transition-all duration-300 ${
                    isPlaying
                      ? 'h-full bg-indigo-400 animate-pulse'
                      : 'h-1 bg-slate-600'
                  }`}
                />
                <span
                  className={`w-0.5 rounded-full transition-all duration-300 ${
                    isPlaying
                      ? 'h-2.5 bg-indigo-300 animate-bounce'
                      : 'h-1.5 bg-slate-600'
                  }`}
                />
                <span
                  className={`w-0.5 rounded-full transition-all duration-300 ${
                    isPlaying
                      ? 'h-1.5 bg-indigo-400 animate-pulse'
                      : 'h-1 bg-slate-600'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Section: Controls & Seek Bar */}
        <div className="flex-1 max-w-xl flex flex-col items-center justify-center gap-1">
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {onPrevTrack && isLibrary && (
              <button
                type="button"
                onClick={onPrevTrack}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleTogglePlay}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: accentColor }}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {onNextTrack && isLibrary && (
              <button
                type="button"
                onClick={onNextTrack}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Stop Playback"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>

          {/* Time & Scrub Slider (for seekable audio or video) */}
          <div className="w-full flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span className="w-8 text-right select-none">
              {isSeekableMedia ? formatMediaTime(currentMediaTime) : isPlaying ? 'LIVE' : '0:00'}
            </span>
            <div className="relative flex-1 flex items-center group">
              {isSeekableMedia ? (
                <input
                  type="range"
                  min="0"
                  max={currentMediaDuration || 100}
                  step="0.5"
                  value={currentMediaTime || 0}
                  onChange={handleSeek}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, ${accentColor} ${progressPercent}%, #1e293b ${progressPercent}%)`,
                  }}
                />
              ) : (
                <div className="w-full h-1 bg-slate-800 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${isPlaying ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`}
                    style={{ width: isPlaying ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
            <span className="w-8 text-left select-none">
              {isSeekableMedia ? formatMediaTime(currentMediaDuration) : isPlaying ? 'LIVE' : '0:00'}
            </span>
          </div>
        </div>

        {/* Right Section: Visualizer, Volume & Mode Expanders */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Live Audio-Reactive Spectrum Visualizer (Desktop) */}
          <div className="hidden lg:flex items-center px-2 py-1 rounded-xl bg-slate-900/80 border border-slate-800">
            <AudioReactiveVisualizer
              isPlaying={isPlaying}
              volume={volume}
              accentColor={accentColor}
              variant="compact"
            />
          </div>

          {/* Volume Control */}
          <div
            className="flex items-center gap-2 relative"
            onMouseEnter={() => setVolumeHover(true)}
            onMouseLeave={() => setVolumeHover(false)}
          >
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              style={{
                background: `linear-gradient(to right, ${accentColor} ${volume}%, #1e293b ${volume}%)`,
              }}
              title={`Volume: ${volume}%`}
            />
          </div>

          {/* Open Section Button */}
          <button
            type="button"
            onClick={handleOpenSourceView}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow"
            title={isVideo ? 'Open Video Songs' : isYouTube || isSpotify ? 'Open Streaming' : 'Open Music Studio'}
          >
            <SourceIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">
              {isVideo ? 'Video' : isYouTube || isSpotify ? 'Stream' : 'Studio'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
