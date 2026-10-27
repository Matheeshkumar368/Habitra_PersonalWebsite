import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  ExternalLink,
  Youtube,
  Radio,
  Maximize2,
  Minimize2,
  X,
  AlertCircle,
  Music,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AudioSettings, SpotifySavedItem, YouTubeSavedItem } from '../types/app';
import { PlaybackProgressState, soundEngine } from '../audio/soundEngine';
import { BUILTIN_MUSIC_TRACKS } from '../constants/scenesAndPresets';

interface PersistentStreamingPlayerProps {
  audio: AudioSettings;
  activeTab: string;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onNavigateToMusic: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
  accentColor?: string;
}

/**
 * Universal Persistent Audio & Streaming Player
 * Resides at the App Shell level so that:
 * 1. Offline local audio playback NEVER stops when navigating between sections.
 * 2. YouTube & Spotify embed iframes remain mounted across views.
 * 3. A compact, unobtrusive mini-player provides full control across the application.
 */
export const PersistentStreamingPlayer: React.FC<PersistentStreamingPlayerProps> = ({
  audio,
  activeTab,
  onUpdateAudio,
  onNavigateToMusic,
  onNextTrack,
  onPrevTrack,
  accentColor = '#6366f1',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Stream state tracking
  const [playbackState, setPlaybackState] = useState<
    'loading' | 'playing' | 'paused' | 'stopped' | 'error'
  >('loading');
  const [playbackErrorMessage, setPlaybackErrorMessage] = useState<string | null>(null);

  // Local audio progress state
  const [localProgress, setLocalProgress] = useState<PlaybackProgressState>({
    currentTime: 0,
    duration: 0,
    isSeekable: false,
    playbackError: null,
    sourceType: 'none',
  });

  useEffect(() => {
    const unsub = soundEngine.subscribeProgress((st) => {
      setLocalProgress(st);
    });
    return unsub;
  }, []);

  const activeSource = audio.activeSource;
  const activeYouTubeId = audio.activeYouTubeId;
  const activeSpotifyUri = audio.activeSpotifyUri;
  const currentTrackId = audio.currentTrackId;

  const isLocalActive =
    (activeSource === 'library' || (!activeSource && !activeYouTubeId && !activeSpotifyUri)) &&
    Boolean(currentTrackId) &&
    Boolean(audio.isPlaying);

  const isYouTubeActive = activeSource === 'youtube' && Boolean(activeYouTubeId);
  const isSpotifyActive = activeSource === 'spotify' && Boolean(activeSpotifyUri);
  const hasActiveMedia = isLocalActive || isYouTubeActive || isSpotifyActive;

  // Title resolution
  const activeYouTubeItem = audio.youtubeItems?.find(
    (item: YouTubeSavedItem) => item.embedId === activeYouTubeId
  );
  const activeSpotifyItem = audio.spotifyItems?.find(
    (item: SpotifySavedItem) => item.embedUri === activeSpotifyUri
  );

  const customTrack = audio.customTracks?.find((t) => t.id === currentTrackId);
  const builtinTrack = BUILTIN_MUSIC_TRACKS.find((t) => t.id === currentTrackId);

  const localTrackTitle =
    customTrack?.name || builtinTrack?.title || 'Habitra Focus Audio';
  const localTrackArtist =
    customTrack?.artist || builtinTrack?.artist || 'Habitra Music Studio';

  const mediaTitle = isLocalActive
    ? localTrackTitle
    : isYouTubeActive
    ? activeYouTubeItem?.title || 'YouTube Focus Stream'
    : isSpotifyActive
    ? activeSpotifyItem?.title || 'Spotify Stream'
    : 'No active media';

  const mediaArtist = isLocalActive
    ? localTrackArtist
    : isYouTubeActive
    ? 'YouTube Audio'
    : isSpotifyActive
    ? 'Spotify Streaming'
    : '';

  const [externalPlaybackNotice, setExternalPlaybackNotice] = useState<string | null>(null);

  // Helper to open URLs externally
  const openExternal = (rawUrl: string, serviceName = 'external browser') => {
    if (isYouTubeActive) {
      sendYouTubeCommand('pauseVideo');
      setPlaybackState('paused');
      onUpdateAudio({ isPlaying: false });
    }
    setExternalPlaybackNotice(`Opened in ${serviceName}. Audio is now controlled externally.`);
    window.setTimeout(() => setExternalPlaybackNotice(null), 6000);

    if (typeof window !== 'undefined') {
      const desktop = (
        window as unknown as {
          habitraDesktop?: { openExternal?: (u: string) => Promise<boolean> };
        }
      ).habitraDesktop;
      if (desktop?.openExternal) {
        desktop.openExternal(rawUrl);
        return;
      }
      window.open(rawUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const originParam =
    typeof window !== 'undefined' &&
    window.location.origin &&
    window.location.origin.startsWith('http')
      ? `&origin=${encodeURIComponent(window.location.origin)}`
      : '';

  const isYouTubePlaylist =
    activeYouTubeItem?.type === 'playlist' ||
    (activeYouTubeId && activeYouTubeId.startsWith('PL'));

  const youtubeEmbedSrc = isYouTubePlaylist
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${activeYouTubeId}&enablejsapi=1&autoplay=1${originParam}`
    : `https://www.youtube-nocookie.com/embed/${activeYouTubeId}?enablejsapi=1&autoplay=1${originParam}`;

  const youtubeWebUrl =
    activeYouTubeItem?.url ||
    (isYouTubePlaylist
      ? `https://www.youtube.com/playlist?list=${activeYouTubeId}`
      : `https://www.youtube.com/watch?v=${activeYouTubeId}`);

  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string') {
          const parsed = JSON.parse(event.data);
          if (parsed.event === 'onStateChange') {
            switch (parsed.info) {
              case 1:
                setPlaybackState('playing');
                setPlaybackErrorMessage(null);
                break;
              case 2:
                setPlaybackState('paused');
                break;
              case 0:
                setPlaybackState('stopped');
                break;
              case 3:
                setPlaybackState('loading');
                break;
            }
          } else if (parsed.event === 'onError') {
            setPlaybackState('error');
            const code = parsed.info;
            let errMsg = 'Playback unavailable.';
            if (code === 100) errMsg = 'Video not found or removed.';
            else if (code === 101 || code === 150)
              errMsg = 'Embedding disabled by YouTube publisher. Click Open in YouTube to listen.';
            setPlaybackErrorMessage(errMsg);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  const sendYouTubeCommand = (func: 'playVideo' | 'pauseVideo' | 'stopVideo') => {
    if (youtubeIframeRef.current && youtubeIframeRef.current.contentWindow) {
      try {
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args: [] }),
          '*'
        );
      } catch {}
    }
  };

  const handleTogglePlayPause = () => {
    if (isLocalActive) {
      onUpdateAudio({ isPlaying: !audio.isPlaying });
    } else if (isYouTubeActive) {
      if (playbackState === 'playing') {
        sendYouTubeCommand('pauseVideo');
        setPlaybackState('paused');
        onUpdateAudio({ isPlaying: false });
      } else {
        sendYouTubeCommand('playVideo');
        setPlaybackState('playing');
        onUpdateAudio({ isPlaying: true });
      }
    } else if (isSpotifyActive) {
      onUpdateAudio({ isPlaying: !audio.isPlaying });
    }
  };

  const handleStop = () => {
    if (isYouTubeActive) {
      sendYouTubeCommand('stopVideo');
    }
    soundEngine.pauseAllPlayback();
    setPlaybackState('stopped');
    onUpdateAudio({
      isPlaying: false,
      activeSource: 'none',
      activeYouTubeId: null,
      activeSpotifyUri: null,
      activeVideoTrackId: null,
    });
  };

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // If active source is not a streaming source (youtube/spotify), do not render floating UI
  // FixedDesktopMediaBar handles local audio and local video authoritatively.
  if (!isYouTubeActive && !isSpotifyActive) {
    return null;
  }

  // Compact floating pill mode when minimized
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl text-white select-none transition-all duration-300"
        style={{
          boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            audio.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
          }`}
        />
        <button
          type="button"
          onClick={onNavigateToMusic}
          className="text-xs font-semibold text-slate-200 hover:text-white truncate max-w-[150px] cursor-pointer text-left"
          title="Open Music Player"
        >
          {mediaTitle}
        </button>

        <button
          type="button"
          onClick={handleTogglePlayPause}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white cursor-pointer"
          title={audio.isPlaying ? 'Pause' : 'Play'}
        >
          {audio.isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>

        {onNextTrack && (
          <button
            type="button"
            onClick={onNextTrack}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer ml-1"
          title="Expand Mini Player"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Expanded persistent card mode
  return (
    <div
      ref={containerRef}
      aria-label="Universal Persistent Audio Player"
      className={`fixed z-30 transition-all duration-300 ${
        isFullscreen
          ? 'inset-0 w-screen h-screen bg-black flex flex-col justify-center items-center p-6'
          : 'bottom-20 right-4 w-[360px] sm:w-[400px] max-w-[calc(100vw-2rem)]'
      }`}
    >
      <div
        className={`rounded-2xl border border-slate-700/80 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-3 sm:p-3.5 text-white overflow-hidden w-full ${
          isFullscreen ? 'max-w-4xl max-h-[90vh]' : ''
        }`}
        style={{
          boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isLocalActive
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : isYouTubeActive
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isLocalActive ? (
                <Music className="w-3.5 h-3.5" />
              ) : isYouTubeActive ? (
                <Youtube className="w-4 h-4" />
              ) : (
                <Radio className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <button
                type="button"
                onClick={onNavigateToMusic}
                className="font-semibold text-xs text-white truncate block hover:underline cursor-pointer text-left max-w-[210px]"
                title="Open Music Player"
              >
                {mediaTitle}
              </button>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{mediaArtist}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onNavigateToMusic}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Open Full Music Studio"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Minimize to Pill"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleStop}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
              title="Stop Playback"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Local Audio Scrub Bar & Player */}
        {isLocalActive && (
          <div className="space-y-2 mt-2 pt-2 border-t border-slate-800/80">
            {/* Seek Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>{formatTime(localProgress.currentTime)}</span>
                <span>{formatTime(localProgress.duration)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={localProgress.duration || 100}
                step="0.5"
                value={localProgress.currentTime || 0}
                onChange={(e) => soundEngine.seekTo(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-1.5">
                {onPrevTrack && (
                  <button
                    type="button"
                    onClick={onPrevTrack}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    title="Previous Track"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleTogglePlayPause}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                >
                  {audio.isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      <span>Play</span>
                    </>
                  )}
                </button>

                {onNextTrack && (
                  <button
                    type="button"
                    onClick={onNextTrack}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    title="Next Track"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStop}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                  title="Stop Audio"
                >
                  <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateAudio({ isMuted: !audio.isMuted })}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  title={audio.isMuted ? 'Unmute' : 'Mute'}
                >
                  {audio.isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audio.isMuted ? 0 : audio.musicVolume ?? 40}
                  onChange={(e) => onUpdateAudio({ musicVolume: parseInt(e.target.value, 10), isMuted: false })}
                  className="w-16 accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* YouTube Streaming Embed Frame */}
        {isYouTubeActive && (
          <div className="mt-2 space-y-2">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner border border-slate-800">
              <iframe
                ref={youtubeIframeRef}
                src={youtubeEmbedSrc}
                title={mediaTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {playbackErrorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{playbackErrorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => openExternal(youtubeWebUrl)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <Youtube className="w-3.5 h-3.5 fill-current" />
                  <span>Open in YouTube (Default Browser)</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlayPause}
                  className="px-3 py-1.5 rounded-lg text-white font-semibold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                  style={{ backgroundColor: accentColor }}
                >
                  {playbackState === 'playing' ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      <span>Play</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleStop}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  title="Stop Stream"
                >
                  <Square className="w-3 h-3 fill-current text-rose-400" />
                  <span>Stop</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online Stream</span>
              </div>
            </div>
          </div>
        )}

        {/* Spotify Embed Frame */}
        {isSpotifyActive && (
          <div className="mt-2 space-y-2">
            <div className="relative w-full h-[84px] rounded-xl overflow-hidden bg-black border border-slate-800">
              <iframe
                src={`https://open.spotify.com/embed/${activeSpotifyUri}?utm_source=generator&theme=0`}
                width="100%"
                height="80"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Embed Player"
                className="border-0 rounded-xl"
              />
            </div>

            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">Launch stream:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openExternal(`spotify:${activeSpotifyUri}`)}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Open in Spotify Desktop App"
                >
                  <span>Open in App</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openExternal(`https://open.spotify.com/${activeSpotifyUri}`)}
                  className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Open in Web Browser"
                >
                  <span>Web</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {externalPlaybackNotice && (
          <div className="mt-2 p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-[10px]">
            {externalPlaybackNotice}
          </div>
        )}
      </div>
    </div>
  );
};
