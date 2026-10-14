import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  ExternalLink,
  Youtube,
  Radio,
  Maximize2,
  Minimize2,
  Music,
  X,
} from 'lucide-react';
import { AudioSettings, SpotifySavedItem, YouTubeSavedItem } from '../types/app';

interface PersistentStreamingPlayerProps {
  audio: AudioSettings;
  activeTab: string;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onNavigateToMusic: () => void;
  accentColor?: string;
}

/**
 * Persistent Streaming Player
 * Resides at the App Shell level so the underlying iframes for YouTube & Spotify
 * NEVER unmount when navigating between Dashboard, Habits, Calendar, Goals,
 * Focus Timer, Reminders, Statistics, My Space, Settings, or Streaming Studio.
 */
export const PersistentStreamingPlayer: React.FC<PersistentStreamingPlayerProps> = ({
  audio,
  activeTab,
  onUpdateAudio,
  onNavigateToMusic,
  accentColor = '#6366f1',
}) => {
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(Boolean(audio.isPlaying));

  const activeSource = audio.activeSource;
  const activeYouTubeId = audio.activeYouTubeId;
  const activeSpotifyUri = audio.activeSpotifyUri;

  const isYouTubeActive = activeSource === 'youtube' && Boolean(activeYouTubeId);
  const isSpotifyActive = activeSource === 'spotify' && Boolean(activeSpotifyUri);
  const hasActiveStream = isYouTubeActive || isSpotifyActive;

  // Sync internal playing state with prop
  useEffect(() => {
    setIsPlaying(Boolean(audio.isPlaying));
  }, [audio.isPlaying]);

  // Current title resolution
  const activeYouTubeItem = audio.youtubeItems?.find(
    (item: YouTubeSavedItem) => item.embedId === activeYouTubeId
  );
  const activeSpotifyItem = audio.spotifyItems?.find(
    (item: SpotifySavedItem) => item.embedUri === activeSpotifyUri
  );

  const streamTitle = isYouTubeActive
    ? activeYouTubeItem?.title || 'YouTube Focus Stream'
    : isSpotifyActive
    ? activeSpotifyItem?.title || 'Spotify Stream'
    : 'No active stream';

  // YouTube Command Helpers via postMessage
  const sendYouTubeCommand = (func: 'playVideo' | 'pauseVideo' | 'stopVideo') => {
    if (youtubeIframeRef.current && youtubeIframeRef.current.contentWindow) {
      youtubeIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }),
        '*'
      );
    }
  };

  const handleTogglePlayPause = () => {
    if (isYouTubeActive) {
      if (isPlaying) {
        sendYouTubeCommand('pauseVideo');
        setIsPlaying(false);
        onUpdateAudio({ isPlaying: false });
      } else {
        sendYouTubeCommand('playVideo');
        setIsPlaying(true);
        onUpdateAudio({ isPlaying: true });
      }
    } else if (isSpotifyActive) {
      // Note: Spotify embeds run in an isolated origin and restrict programmatic play/pause
      // without Spotify Web Playback SDK (OAuth + Premium). The embed itself houses native playback controls.
      onUpdateAudio({ isPlaying: !isPlaying });
    }
  };

  const handleStopStream = () => {
    if (isYouTubeActive) {
      sendYouTubeCommand('stopVideo');
    }
    // Deliberately stop playback and prevent auto-restarting
    onUpdateAudio({
      activeYouTubeId: null,
      activeSpotifyUri: null,
      activeSource: undefined,
      isPlaying: false,
    });
    setIsPlaying(false);
  };

  // If no stream has ever been started, keep iframes unrendered to prevent any network or audio activity
  if (!hasActiveStream) {
    return null;
  }

  const isMusicTab = activeTab === 'music';

  return (
    <div
      aria-label="Persistent Streaming Audio Player"
      className="fixed bottom-4 right-4 z-30 w-[360px] sm:w-[400px] max-w-[calc(100vw-2rem)] transition-all duration-300"
    >
      <div
        className="rounded-2xl border border-slate-700/80 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-3 sm:p-3.5 text-white overflow-hidden"
        style={{
          boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isYouTubeActive
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isYouTubeActive ? (
                <Youtube className="w-4 h-4" />
              ) : (
                <Radio className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    isYouTubeActive
                      ? 'bg-red-500/30 text-red-200'
                      : 'bg-emerald-500/30 text-emerald-200'
                  }`}
                >
                  {isYouTubeActive ? 'YouTube' : 'Spotify'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate">
                  Persistent Audio
                </span>
              </div>
              <div className="text-xs font-semibold text-white truncate max-w-[190px] sm:max-w-[220px]">
                {streamTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isMusicTab && (
              <button
                type="button"
                onClick={onNavigateToMusic}
                className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                title="Go to Streaming Studio"
              >
                <span>Studio</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMinimized((v) => !v)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              title={isMinimized ? 'Expand Player' : 'Minimize Player'}
            >
              {isMinimized ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleStopStream}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
              title="Stop Playback & Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player Viewport (Kept continuously mounted so playback survives tab switching) */}
        <div
          className={`transition-all duration-200 overflow-hidden ${
            isMinimized
              ? 'h-0 opacity-0 pointer-events-none mb-0'
              : 'opacity-100'
          }`}
        >
          {isYouTubeActive && (
            <div className="relative w-full aspect-video max-h-[195px] rounded-xl overflow-hidden bg-black shadow-inner border border-slate-800">
              <iframe
                ref={youtubeIframeRef}
                src={`https://www.youtube-nocookie.com/embed/${activeYouTubeId}?enablejsapi=1&origin=${
                  typeof window !== 'undefined' ? window.location.origin : ''
                }&autoplay=1`}
                title="Persistent YouTube Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          )}

          {isSpotifyActive && (
            <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-inner border border-slate-800">
              <iframe
                src={`https://open.spotify.com/embed/${activeSpotifyUri}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Persistent Spotify Player"
                className="border-0 rounded-xl"
              />
            </div>
          )}

          {/* Spotify Provider Notice */}
          {isSpotifyActive && (
            <div className="mt-1.5 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Official Spotify embed</span>
              <a
                href={`https://open.spotify.com/${activeSpotifyUri}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Open in App</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          {/* Persistent Mini Controls Bar for YouTube */}
          {isYouTubeActive && (
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlayPause}
                  className="px-3 py-1.5 rounded-lg text-white font-semibold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                  style={{ backgroundColor: accentColor }}
                >
                  {isPlaying ? (
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
                  onClick={handleStopStream}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  title="Stop Playback"
                >
                  <Square className="w-3 h-3 fill-current text-rose-400" />
                  <span>Stop</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                {isPlaying ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Streaming Live
                  </span>
                ) : (
                  <span>Paused</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
