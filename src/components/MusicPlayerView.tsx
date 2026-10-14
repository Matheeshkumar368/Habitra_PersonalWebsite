import React, { useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Star,
  Upload,
  FolderOpen,
  Search,
  ListMusic,
  ExternalLink,
  Youtube,
  Radio,
  Trash2,
  Plus,
  Clock,
  Sparkles,
  Info,
  Film,
  Music,
  Check,
} from 'lucide-react';
import {
  AudioSettings,
  CustomAudioTrack,
  MusicActiveSource,
  SpotifySavedItem,
  StyleSettings,
  YouTubeSavedItem,
} from '../types/app';

interface MusicPlayerViewProps {
  audio: AudioSettings;
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onSelectTrack: (trackId: string, playlistId?: string | null) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onUploadLocalTracks: (tracks: CustomAudioTrack[]) => void;
}

export const MusicPlayerView: React.FC<MusicPlayerViewProps> = ({
  audio,
  styleSettings,
  panelBgStyle,
  onUpdateAudio,
  onUploadLocalTracks,
}) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'spotify' | 'library' | 'saved'>(
    audio.activeSource === 'spotify' ? 'spotify' : 'youtube'
  );

  // Form states
  const [youtubeInputUrl, setYoutubeInputUrl] = useState('');
  const [youtubeInputTitle, setYoutubeInputTitle] = useState('');
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  const [spotifyInputUrl, setSpotifyInputUrl] = useState('');
  const [spotifyInputTitle, setSpotifyInputTitle] = useState('');
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // YouTube URL parsing & submission
  const handleAddYouTubeUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setYoutubeError(null);
    const raw = youtubeInputUrl.trim();
    if (!raw) return;

    let embedId = '';
    let isPlaylist = false;

    // Detect Playlist: list=...
    const playlistMatch = raw.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    // Detect Video: v=... or youtu.be/... or embed/... or shorts/...
    const videoMatch = raw.match(
      /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );

    if (playlistMatch && (!videoMatch || raw.includes('/playlist?list='))) {
      embedId = playlistMatch[1];
      isPlaylist = true;
    } else if (videoMatch) {
      embedId = videoMatch[1];
    } else {
      setYoutubeError('Please enter a valid YouTube video or playlist URL.');
      return;
    }

    const title =
      youtubeInputTitle.trim() ||
      (isPlaylist ? 'Custom YouTube Playlist' : 'Custom YouTube Stream');

    const newItem: YouTubeSavedItem = {
      id: `yt_${Date.now()}`,
      title,
      url: raw,
      embedId,
      type: isPlaylist ? 'playlist' : 'video',
      addedAt: new Date().toISOString(),
    };

    const currentYt = audio.youtubeItems || [];
    onUpdateAudio({
      youtubeItems: [newItem, ...currentYt],
      activeYouTubeId: embedId,
      activeSpotifyUri: null,
      activeSource: 'youtube',
      isPlaying: true,
    });

    setYoutubeInputUrl('');
    setYoutubeInputTitle('');
    setStatusMessage(`✓ Loaded and started YouTube ${isPlaylist ? 'playlist' : 'stream'}.`);
    window.setTimeout(() => setStatusMessage(null), 3000);
  };

  // Spotify Link parsing & submission
  const handleAddSpotifyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setSpotifyError(null);
    const raw = spotifyInputUrl.trim();
    if (!raw) return;

    const match = raw.match(
      /(?:open\.spotify\.com\/(track|album|playlist)\/|spotify:(track|album|playlist):)([a-zA-Z0-9]+)/
    );

    if (!match) {
      setSpotifyError(
        'Please enter a valid Spotify track, album, or playlist link (open.spotify.com/...)'
      );
      return;
    }

    const type = (match[1] || match[2]) as 'track' | 'album' | 'playlist';
    const id = match[3];
    const embedUri = `${type}/${id}`;

    const title =
      spotifyInputTitle.trim() ||
      `Spotify ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    const newItem: SpotifySavedItem = {
      id: `sp_${Date.now()}`,
      title,
      url: raw,
      embedUri,
      type,
      addedAt: new Date().toISOString(),
    };

    const currentSp = audio.spotifyItems || [];
    onUpdateAudio({
      spotifyItems: [newItem, ...currentSp],
      activeSpotifyUri: embedUri,
      activeYouTubeId: null,
      activeSource: 'spotify',
      isPlaying: true,
    });

    setSpotifyInputUrl('');
    setSpotifyInputTitle('');
    setStatusMessage('✓ Loaded and mounted Spotify embed.');
    window.setTimeout(() => setStatusMessage(null), 3000);
  };

  // Local file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    const addedTracks: CustomAudioTrack[] = [];

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
      const url = URL.createObjectURL(file);
      const track: CustomAudioTrack = {
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        dataUrl: url,
        mediaType: isVideo ? 'video' : 'audio',
        category: 'custom',
        artist: 'Local File',
        folderName: file.webkitRelativePath ? file.webkitRelativePath.split('/')[0] : 'Library',
        addedAt: new Date().toISOString(),
      };
      addedTracks.push(track);
    });

    onUploadLocalTracks(addedTracks);
    setUploadingMedia(false);
    setStatusMessage(`✓ Imported ${addedTracks.length} local file(s).`);
    window.setTimeout(() => setStatusMessage(null), 3000);
  };

  const isYouTubeActive = audio.activeSource === 'youtube' && Boolean(audio.activeYouTubeId);
  const isSpotifyActive = audio.activeSource === 'spotify' && Boolean(audio.activeSpotifyUri);

  const activeStreamTitle = isYouTubeActive
    ? audio.youtubeItems?.find((y) => y.embedId === audio.activeYouTubeId)?.title || 'YouTube Stream'
    : isSpotifyActive
    ? audio.spotifyItems?.find((s) => s.embedUri === audio.activeSpotifyUri)?.title || 'Spotify Stream'
    : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. TOP HEADER & CURRENT STREAM STATUS */}
      <div
        className="p-5 sm:p-6 rounded-3xl border border-slate-800/90 shadow-2xl relative overflow-hidden"
        style={panelBgStyle}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isYouTubeActive
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : isSpotifyActive
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {isYouTubeActive ? (
                <Youtube className="w-6 h-6" />
              ) : isSpotifyActive ? (
                <Radio className="w-6 h-6" />
              ) : (
                <Music className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    isYouTubeActive
                      ? 'bg-red-500/30 text-red-200'
                      : isSpotifyActive
                      ? 'bg-emerald-500/30 text-emerald-200'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isYouTubeActive
                    ? 'YouTube Active'
                    : isSpotifyActive
                    ? 'Spotify Active'
                    : 'Streaming Studio'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Persistent Background Audio
                </span>
              </div>

              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5 truncate max-w-md">
                {activeStreamTitle || 'Select or paste a YouTube stream or Spotify playlist'}
              </h2>

              <p className="text-xs text-slate-400">
                Audio stays mounted and continues playing when you navigate to other Habitra sections.
              </p>
            </div>
          </div>

          {/* Stop Button when stream is active */}
          {(isYouTubeActive || isSpotifyActive) && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateAudio({
                    activeYouTubeId: null,
                    activeSpotifyUri: null,
                    activeSource: undefined,
                    isPlaying: false,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
                <span>Stop Stream</span>
              </button>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="mt-4 px-3.5 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-xs text-indigo-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-indigo-400" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* 2. SOURCE TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
        {[
          {
            id: 'youtube',
            label: '▶ YouTube Streams',
            desc: 'Live lofi, study beats & playlists',
          },
          {
            id: 'spotify',
            label: '🟢 Spotify Integration',
            desc: 'Curated playlists & official embeds',
          },
          {
            id: 'library',
            label: '📁 Personal Library',
            desc: 'Local MP3/WAV files',
          },
          {
            id: 'saved',
            label: '⭐ Saved Streams',
            desc: 'Bookmarked focus stations',
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === tab.id
                ? 'bg-indigo-600/90 text-white border-indigo-400/40 shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3. TAB CONTENT: YOUTUBE */}
      {activeTab === 'youtube' && (
        <div className="space-y-6">
          {/* Add YouTube URL Card */}
          <div
            className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl"
            style={panelBgStyle}
          >
            <div className="flex items-center gap-2 mb-3">
              <Youtube className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Stream from YouTube
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Paste any YouTube video or playlist link (e.g. Lofi Girl, synthwave coding stream, classical study).
              Playback is kept alive across all tabs via the persistent application-shell player.
            </p>

            <form onSubmit={handleAddYouTubeUrl} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={youtubeInputUrl}
                  onChange={(e) => setYoutubeInputUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="sm:col-span-2 px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
                <input
                  type="text"
                  value={youtubeInputTitle}
                  onChange={(e) => setYoutubeInputTitle(e.target.value)}
                  placeholder="Station title (optional)"
                  className="px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              {youtubeError && (
                <div className="text-xs text-rose-400 font-medium">{youtubeError}</div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 font-mono">
                  Supports standard watch links, playlists (&amp;list=...), and shorts
                </span>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start &amp; Save Stream</span>
                </button>
              </div>
            </form>
          </div>

          {/* Curated YouTube Focus Streams */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Curated Focus &amp; Coding Streams
              </h4>
              <span className="text-xs text-slate-500">1-click to start</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  id: 'jfKfPfyJRdk',
                  title: 'Lofi Girl — Beats to Relax / Study to',
                  channel: 'Lofi Girl · 24/7 Live',
                  tag: 'LOFI',
                },
                {
                  id: 'kYJqD96JjF0',
                  title: 'Minecraft Ambience & Music Extended',
                  channel: 'C418 & Lena Raine',
                  tag: 'AMBIENT',
                },
                {
                  id: '4xDzrJKXOOY',
                  title: 'Synthwave / Chillwave Coding Beats',
                  channel: 'ChillSynth FM',
                  tag: 'SYNTH',
                },
                {
                  id: 'lTRiuFIWV54',
                  title: 'Rainy Cafe & Gentle Jazz Study',
                  channel: 'Cafe Music BGM',
                  tag: 'RAIN & JAZZ',
                },
                {
                  id: '7NOSDKb0HlU',
                  title: 'Deep Focus Classical Piano',
                  channel: 'HalidonMusic',
                  tag: 'CLASSICAL',
                },
                {
                  id: 'WPni755-Krg',
                  title: 'Midnight Cozy Library Ambient',
                  channel: 'Calmed by Nature',
                  tag: 'LIBRARY',
                },
              ].map((item) => {
                const isSelected = audio.activeYouTubeId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onUpdateAudio({
                        activeYouTubeId: item.id,
                        activeSpotifyUri: null,
                        activeSource: 'youtube',
                        isPlaying: true,
                      });
                      setStatusMessage(`✓ Now playing: ${item.title}`);
                      window.setTimeout(() => setStatusMessage(null), 3000);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'border-red-500/60 bg-red-500/10 shadow-lg'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.tag}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-semibold text-white group-hover:text-red-300 transition-colors line-clamp-2">
                        {item.title}
                      </h5>
                      <p className="text-xs text-slate-400 mt-1">{item.channel}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-red-400 font-medium">
                      <span>{isSelected ? 'Currently Playing' : 'Play Stream'}</span>
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT: SPOTIFY */}
      {activeTab === 'spotify' && (
        <div className="space-y-6">
          {/* Add Spotify URL Card */}
          <div
            className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl"
            style={panelBgStyle}
          >
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Spotify Focus Integration
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Embed any Spotify playlist, album, or track. Spotify playback operates safely through the official Spotify embed.
              Logged-in Spotify users enjoy full tracks; free/guest users hear official 30s previews per Spotify policy.
            </p>

            <form onSubmit={handleAddSpotifyUrl} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={spotifyInputUrl}
                  onChange={(e) => setSpotifyInputUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="sm:col-span-2 px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <input
                  type="text"
                  value={spotifyInputTitle}
                  onChange={(e) => setSpotifyInputTitle(e.target.value)}
                  placeholder="Playlist title (optional)"
                  className="px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {spotifyError && (
                <div className="text-xs text-rose-400 font-medium">{spotifyError}</div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 font-mono">
                  Paste links from Spotify Web or Desktop app
                </span>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Mount &amp; Save Spotify</span>
                </button>
              </div>
            </form>
          </div>

          {/* Curated Spotify Playlists */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Curated Spotify Focus Playlists
              </h4>
              <span className="text-xs text-slate-500">Official Spotify links</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  uri: 'playlist/37i9dQZF1DWZeKCadgRdKQ',
                  title: 'Deep Focus',
                  desc: 'Keep calm and focus with ambient and post-rock music.',
                },
                {
                  uri: 'playlist/37i9dQZF1DXdLEN7aqioXM',
                  title: 'Lofi Beats',
                  desc: 'Beats to relax, study, and focus to.',
                },
                {
                  uri: 'playlist/37i9dQZF1DX4sWSpwq3LiO',
                  title: 'Peaceful Piano',
                  desc: 'Peaceful piano to help you slow down, breathe, and focus.',
                },
                {
                  uri: 'playlist/37i9dQZF1DX3Ogo9pFvBkY',
                  title: 'Ambient Chill',
                  desc: 'Atmospheric electronic landscapes and chilled beats.',
                },
                {
                  uri: 'playlist/37i9dQZF1DX8Uebhn9wzrS',
                  title: 'Chill Lofi Study',
                  desc: 'The best instrumental beats for study sessions.',
                },
                {
                  uri: 'playlist/37i9dQZF1DWWQRwui0ExPn',
                  title: 'Lo-Fi Cafe',
                  desc: 'Cozy coffeehouse beats to study or read with.',
                },
              ].map((item) => {
                const isSelected = audio.activeSpotifyUri === item.uri;
                return (
                  <div
                    key={item.uri}
                    onClick={() => {
                      onUpdateAudio({
                        activeSpotifyUri: item.uri,
                        activeYouTubeId: null,
                        activeSource: 'spotify',
                        isPlaying: true,
                      });
                      setStatusMessage(`✓ Mounted Spotify playlist: ${item.title}`);
                      window.setTimeout(() => setStatusMessage(null), 3000);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'border-emerald-500/60 bg-emerald-500/10 shadow-lg'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-300">
                          SPOTIFY
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </h5>
                      <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-emerald-400 font-medium">
                      <span>{isSelected ? 'Loaded in Player' : 'Open in Player'}</span>
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: PERSONAL LIBRARY */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          <div
            className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl"
            style={panelBgStyle}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Personal Offline Audio Files
                </h3>
                <p className="text-xs text-slate-400">
                  Import local MP3 or WAV files for your focus session. Files remain 100% on your machine.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Import Files</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ Folder</span>
                </button>
                <input
                  ref={folderInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.flac"
                  multiple
                  {...({
                    webkitdirectory: '',
                    directory: '',
                  } as React.InputHTMLAttributes<HTMLInputElement>)}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {audio.customTracks.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center">
                <Music className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h5 className="text-sm font-semibold text-slate-300">
                  No personal files imported yet
                </h5>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Click &quot;+ Import Files&quot; above to add your own offline audio files for local study sessions.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {audio.customTracks.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Music className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item.folderName || 'Local File'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = audio.customTracks.filter((t) => t.id !== item.id);
                        onUpdateAudio({ customTracks: next });
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Remove track"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: SAVED STREAMS */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          <div
            className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl"
            style={panelBgStyle}
          >
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4">
              Saved Streams &amp; Playlists
            </h3>

            <div className="space-y-4">
              {/* YouTube Saved Items */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5 text-red-500" />
                  <span>YouTube Streams ({audio.youtubeItems?.length || 0})</span>
                </h4>

                {(audio.youtubeItems || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No custom YouTube streams saved yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {audio.youtubeItems?.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAudio({
                              activeYouTubeId: item.embedId,
                              activeSpotifyUri: null,
                              activeSource: 'youtube',
                              isPlaying: true,
                            })
                          }
                          className="flex items-center gap-2 min-w-0 text-left cursor-pointer flex-1"
                        >
                          <Play className="w-3.5 h-3.5 text-red-400 shrink-0 fill-current" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {item.type.toUpperCase()}
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const next = (audio.youtubeItems || []).filter((y) => y.id !== item.id);
                            onUpdateAudio({ youtubeItems: next });
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Remove saved stream"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spotify Saved Items */}
              <div className="pt-2 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Spotify Playlists ({audio.spotifyItems?.length || 0})</span>
                </h4>

                {(audio.spotifyItems || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No custom Spotify playlists saved yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {audio.spotifyItems?.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAudio({
                              activeSpotifyUri: item.embedUri,
                              activeYouTubeId: null,
                              activeSource: 'spotify',
                              isPlaying: true,
                            })
                          }
                          className="flex items-center gap-2 min-w-0 text-left cursor-pointer flex-1"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0 fill-current" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {item.type.toUpperCase()}
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const next = (audio.spotifyItems || []).filter((s) => s.id !== item.id);
                            onUpdateAudio({ spotifyItems: next });
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Remove saved playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
