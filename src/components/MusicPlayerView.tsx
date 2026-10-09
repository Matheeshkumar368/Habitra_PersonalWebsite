import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Star,
  Upload,
  FolderOpen,
  Search,
  ListMusic,
  Music,
  Headphones,
  Clock,
  Sparkles,
  Trash2,
  Plus,
  RefreshCw,
  Check,
  Sliders,
  Radio,
} from 'lucide-react';
import {
  PlaybackProgressState,
  UnifiedLibraryTrack,
  soundEngine,
} from '../audio/soundEngine';
import {
  AMBIENT_SOUNDS,
  DEFAULT_PLAYLISTS,
  PIXEL_SCENES,
} from '../constants/scenesAndPresets';
import {
  AmbientSoundId,
  AudioPreset,
  AudioSettings,
  CustomAudioTrack,
  MusicCategoryId,
  RepeatMode,
  StyleSettings,
  UserPlaylist,
} from '../types/app';

export type MusicPageSubTab =
  | 'library'
  | 'my_music'
  | 'playlists'
  | 'ambient'
  | 'focus'
  | 'recent'
  | 'favorites';

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
  onSelectTrack,
  onNextTrack,
  onPrevTrack,
  onUploadLocalTracks,
}) => {
  const [subTab, setSubTab] = useState<MusicPageSubTab>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MusicCategoryId>(
    audio.activeCategory || 'all'
  );
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'category' | 'duration'>('default');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [manifestVersion, setManifestVersion] = useState(0);

  // Playlist creation state
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    audio.activePlaylistId || DEFAULT_PLAYLISTS[0].id
  );
  const [newMixPresetName, setNewMixPresetName] = useState('');

  const [playbackProgress, setPlaybackProgress] =
    useState<PlaybackProgressState>({
      currentTime: 0,
      duration: 0,
      isSeekable: false,
      playbackError: null,
      sourceType: 'none',
    });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubProgress = soundEngine.subscribeProgress((st) =>
      setPlaybackProgress(st)
    );
    const unsubManifest = soundEngine.subscribeManifest(() =>
      setManifestVersion((v) => v + 1)
    );
    return () => {
      unsubProgress();
      unsubManifest();
    };
  }, []);

  const allTracks: UnifiedLibraryTrack[] = useMemo(
    () => soundEngine.getAllLibraryTracks(audio.customTracks),
    [audio.customTracks, manifestVersion]
  );

  const currentTrack: UnifiedLibraryTrack = useMemo(() => {
    return (
      allTracks.find((t) => t.id === audio.currentTrackId) ||
      allTracks[0] || {
        id: 'bundled_velvet_rain_lofi',
        title: 'Velvet Rain Lo-Fi',
        artist: 'Habitra Studio',
        subtitle: 'Bundled CC0 WAV · public/music/rain/',
        description: 'Warm electric piano chords over gentle rainy window reflections',
        genre: 'Rain Lo-Fi',
        category: 'rain',
        sourceType: 'bundled_file',
        sourceBadge: 'WAV',
        durationSeconds: 12,
        coverImageUrl: PIXEL_SCENES[0]?.imageUrl,
        isCustom: false,
      }
    );
  }, [allTracks, audio.currentTrackId]);

  const favoriteIds = audio.favoriteTrackIds || [];
  const playlists =
    audio.playlists && audio.playlists.length > 0
      ? audio.playlists
      : DEFAULT_PLAYLISTS;
  const recentlyPlayed = audio.recentlyPlayed || [];
  const isAmbientActive =
    Boolean(audio.ambientPlaying ?? audio.isPlaying) &&
    audio.ambientSoundId !== 'silent';

  const formatAudioTime = (secs: number): string => {
    if (!Number.isFinite(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const probeAudioDuration = (dataUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const tempAudio = new Audio();
      const timeout = window.setTimeout(() => resolve(0), 2500);
      tempAudio.preload = 'metadata';
      tempAudio.onloadedmetadata = () => {
        window.clearTimeout(timeout);
        resolve(
          Number.isFinite(tempAudio.duration) && tempAudio.duration > 0
            ? Math.round(tempAudio.duration)
            : 0
        );
      };
      tempAudio.onerror = () => {
        window.clearTimeout(timeout);
        resolve(0);
      };
      tempAudio.src = dataUrl;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const audioFiles = Array.from(files).filter(
      (f) =>
        f.type.startsWith('audio/') ||
        /\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i.test(f.name)
    );

    if (audioFiles.length === 0) {
      setStatusMessage(
        '⚠ No supported audio files (.mp3, .wav, .ogg, .flac, .m4a, .aac) found in selection.'
      );
      window.setTimeout(() => setStatusMessage(null), 4000);
      e.target.value = '';
      return;
    }

    setUploadingAudio(true);
    try {
      const newTracks: CustomAudioTrack[] = [];
      for (const file of audioFiles) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        const durationSeconds = await probeAudioDuration(dataUrl);
        const relPath = (file as File & { webkitRelativePath?: string })
          .webkitRelativePath;
        const folderParts = relPath ? relPath.split('/') : [];
        const folderName =
          folderParts.length > 1 ? folderParts[0] : undefined;

        // Infer category from folder name if matching
        let inferredCategory: CustomAudioTrack['category'] = 'custom';
        const lowerFolder = (folderName || '').toLowerCase();
        if (lowerFolder.includes('ambient')) inferredCategory = 'ambient';
        else if (lowerFolder.includes('focus') || lowerFolder.includes('study'))
          inferredCategory = 'focus';
        else if (lowerFolder.includes('nature') || lowerFolder.includes('forest'))
          inferredCategory = 'nature';
        else if (lowerFolder.includes('rain') || lowerFolder.includes('lofi'))
          inferredCategory = 'rain';
        else if (
          lowerFolder.includes('instrumental') ||
          lowerFolder.includes('piano')
        )
          inferredCategory = 'instrumental';

        newTracks.push({
          id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl,
          category: inferredCategory,
          artist: folderName || 'Local Import',
          folderName,
          durationSeconds,
          addedAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        });
      }

      if (newTracks.length > 0) {
        onUploadLocalTracks(newTracks);
        setStatusMessage(
          `✓ Imported ${newTracks.length} audio track${
            newTracks.length > 1 ? 's' : ''
          } into your local library`
        );
        window.setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch {
      setStatusMessage('⚠ Failed to import one or more audio files.');
      window.setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const handleToggleFavorite = (trackId: string) => {
    const exists = favoriteIds.includes(trackId);
    onUpdateAudio({
      favoriteTrackIds: exists
        ? favoriteIds.filter((id) => id !== trackId)
        : [...favoriteIds, trackId],
    });
  };

  const handleCycleRepeatMode = () => {
    const order: RepeatMode[] = ['all', 'one', 'off'];
    const current = audio.repeatMode || 'all';
    const next = order[(order.indexOf(current) + 1) % order.length];
    onUpdateAudio({ repeatMode: next });
  };

  const handleDeleteCustomTrack = (id: string) => {
    const remaining = audio.customTracks.filter((t) => t.id !== id);
    const nextTrackId =
      audio.currentTrackId === id
        ? 'bundled_velvet_rain_lofi'
        : audio.currentTrackId;
    onUpdateAudio({
      customTracks: remaining,
      currentTrackId: nextTrackId,
    });
  };

  const handleChangeCustomTrackCategory = (
    id: string,
    category: CustomAudioTrack['category']
  ) => {
    onUpdateAudio({
      customTracks: audio.customTracks.map((ct) =>
        ct.id === id ? { ...ct, category } : ct
      ),
    });
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const created: UserPlaylist = {
      id: `pl_${Date.now()}`,
      name: newPlaylistName.trim(),
      description:
        newPlaylistDesc.trim() || 'Custom personal focus & ambient playlist',
      icon: '🎵',
      trackIds: [audio.currentTrackId],
      isBuiltIn: false,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
    const nextList = [...playlists, created];
    onUpdateAudio({
      playlists: nextList,
      activePlaylistId: created.id,
    });
    setSelectedPlaylistId(created.id);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setStatusMessage(`✓ Created playlist "${created.name}"`);
    window.setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleToggleTrackInPlaylist = (playlistId: string, trackId: string) => {
    const nextPlaylists = playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      const exists = pl.trackIds.includes(trackId);
      return {
        ...pl,
        trackIds: exists
          ? pl.trackIds.filter((id) => id !== trackId)
          : [...pl.trackIds, trackId],
      };
    });
    onUpdateAudio({ playlists: nextPlaylists });
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const nextPlaylists = playlists.filter((pl) => pl.id !== playlistId);
    onUpdateAudio({
      playlists: nextPlaylists,
      activePlaylistId:
        audio.activePlaylistId === playlistId ? null : audio.activePlaylistId,
    });
    if (selectedPlaylistId === playlistId && nextPlaylists.length > 0) {
      setSelectedPlaylistId(nextPlaylists[0].id);
    }
  };

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = allTracks.filter((item) => {
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'favorites') {
          if (!favoriteIds.includes(item.id)) return false;
        } else if (selectedCategory === 'custom') {
          if (!item.isCustom) return false;
        } else if (item.category !== selectedCategory) {
          return false;
        }
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.artist.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.genre.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.folderName && item.folderName.toLowerCase().includes(q))
      );
    });

    if (sortBy === 'title') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortBy === 'category') {
      return [...list].sort((a, b) => a.category.localeCompare(b.category));
    }
    if (sortBy === 'duration') {
      return [...list].sort((a, b) => b.durationSeconds - a.durationSeconds);
    }
    return list;
  }, [allTracks, selectedCategory, searchQuery, sortBy, favoriteIds]);

  const activeDuration = Math.max(
    1,
    playbackProgress.duration || currentTrack.durationSeconds || 12
  );

  const renderTrackRow = (
    item: UnifiedLibraryTrack,
    options?: {
      playlistContextId?: string | null;
      playedAtLabel?: string;
    }
  ) => {
    const isCurrent = audio.currentTrackId === item.id;
    const isFav = favoriteIds.includes(item.id);
    return (
      <div
        key={`${item.id}_${options?.playedAtLabel || ''}`}
        className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
          isCurrent
            ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-md'
            : 'bg-slate-900/65 hover:bg-slate-900/95 border-slate-800/80 text-slate-200 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={async () => {
              await soundEngine.resumeContextManually();
              if (isCurrent) {
                onUpdateAudio({ isPlaying: !audio.isPlaying });
              } else {
                onSelectTrack(item.id, options?.playlistContextId ?? null);
              }
            }}
            className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-700/80 bg-slate-950 relative flex items-center justify-center cursor-pointer group/btn"
            title={
              isCurrent && audio.isPlaying
                ? `Pause ${item.title}`
                : `Play ${item.title}`
            }
          >
            {item.coverImageUrl && (
              <img
                src={item.coverImageUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover/btn:opacity-35 transition-opacity"
              />
            )}
            <div className="relative z-10 w-7 h-7 rounded-lg bg-slate-950/85 border border-white/15 flex items-center justify-center text-white">
              {isCurrent && audio.isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current text-indigo-400" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </div>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white truncate">
                {item.title}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono-tabular font-semibold uppercase ${
                  item.sourceBadge === 'WAV'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : item.sourceBadge === 'LOCAL'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {item.sourceBadge}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-[10px] text-slate-300 capitalize">
                {item.category}
              </span>
              {options?.playedAtLabel && (
                <span className="text-[10px] text-slate-400 font-mono-tabular">
                  · Played {options.playedAtLabel}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              {item.artist} — {item.description}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.isCustom && (
            <select
              value={item.category}
              onChange={(e) =>
                handleChangeCustomTrackCategory(
                  item.id,
                  e.target.value as CustomAudioTrack['category']
                )
              }
              className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300"
              title="Assign category"
            >
              <option value="custom">My Music</option>
              <option value="focus">Focus</option>
              <option value="ambient">Ambient</option>
              <option value="rain">Rain</option>
              <option value="nature">Nature</option>
              <option value="instrumental">Instrumental</option>
            </select>
          )}

          {item.durationSeconds > 0 && (
            <span className="text-[11px] font-mono-tabular text-slate-400 hidden sm:inline">
              {formatAudioTime(item.durationSeconds)}
            </span>
          )}

          <button
            type="button"
            onClick={() => handleToggleFavorite(item.id)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isFav
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
          </button>

          {item.isCustom && (
            <button
              type="button"
              onClick={() => handleDeleteCustomTrack(item.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Delete imported track"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* HIDDEN FILE & FOLDER INPUTS */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
        multiple
        {...({
          webkitdirectory: '',
          directory: '',
        } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. HERO NOW PLAYING DECK & MASTER TRANSPORT */}
      <section
        className="rounded-2xl border border-slate-800/90 p-5 shadow-2xl relative overflow-hidden"
        style={panelBgStyle}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: styleSettings.accentColor }}
            >
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Habitra Music Studio &amp; Soundscape Library</span>
                {audio.isPlaying && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">
                    ● Playing
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400">
                Bundled CC0 WAV stems, procedural WebAudio synths, local folder
                imports, playlists &amp; multi-channel ambient mixer
              </p>
            </div>
          </div>

          {/* Import Music / Import Folder / Refresh Manifest Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAudio}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow cursor-pointer transition-opacity hover:opacity-95"
              style={{ backgroundColor: styleSettings.accentColor }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingAudio ? 'Importing...' : '+ Import Music'}</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploadingAudio}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Import Folder</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const tracks = await soundEngine.loadMusicManifest();
                setManifestVersion((v) => v + 1);
                setStatusMessage(
                  `✓ Synced public/music/manifest.json (${tracks.length} manifest tracks loaded)`
                );
                window.setTimeout(() => setStatusMessage(null), 3500);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Reload public/music/manifest.json"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Sync Manifest</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-3 px-3.5 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/35 text-xs text-indigo-200 flex items-center justify-between">
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {playbackProgress.playbackError && (
          <div className="mt-3 px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200 flex items-center justify-between">
            <span>⚠ {playbackProgress.playbackError}</span>
            <button
              type="button"
              onClick={() => soundEngine.clearPlaybackError()}
              className="text-rose-300 hover:text-white text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* NOW PLAYING CARD + 4-CHANNEL QUICK MIXER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
          {/* Left 7 cols: Current Track Artwork, Seek Bar & Transport */}
          <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-950/75 border border-slate-800/90 flex flex-col justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shrink-0 relative shadow-lg">
                {currentTrack.coverImageUrl ? (
                  <img
                    src={currentTrack.coverImageUrl}
                    alt={currentTrack.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    🎧
                  </div>
                )}
                {audio.isPlaying && (
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/85 border border-indigo-400/40 text-[9px] font-mono-tabular text-indigo-300">
                    LIVE
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-semibold text-indigo-300 uppercase">
                    {currentTrack.sourceBadge} · {currentTrack.category}
                  </span>
                  {audio.activePlaylistId && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300">
                      Playlist:{' '}
                      {playlists.find((p) => p.id === audio.activePlaylistId)
                        ?.name || 'Custom'}
                    </span>
                  )}
                  {isAmbientActive && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300">
                      + Ambient:{' '}
                      {AMBIENT_SOUNDS.find((s) => s.id === audio.ambientSoundId)
                        ?.name || audio.ambientSoundId}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">
                    {currentTrack.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(currentTrack.id)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      favoriteIds.includes(currentTrack.id)
                        ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                        : 'text-slate-400 hover:text-white bg-slate-900 border-slate-800'
                    }`}
                    title={
                      favoriteIds.includes(currentTrack.id)
                        ? 'Remove from Favorites'
                        : 'Save to Favorites'
                    }
                  >
                    <Star
                      className={`w-4 h-4 ${
                        favoriteIds.includes(currentTrack.id)
                          ? 'fill-current'
                          : ''
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-300 font-medium truncate">
                  {currentTrack.artist} · {currentTrack.genre}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  {currentTrack.description}
                </p>
              </div>
            </div>

            {/* Draggable Progress & Seek Bar */}
            <div className="space-y-1.5">
              <input
                type="range"
                min={0}
                max={activeDuration}
                step={0.25}
                value={Math.min(playbackProgress.currentTime, activeDuration)}
                onChange={(e) => soundEngine.seekTo(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
                title="Drag to seek playback position"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular">
                <span>{formatAudioTime(playbackProgress.currentTime)}</span>
                <span className="text-[10px] text-slate-500">
                  {currentTrack.license || 'Local Audio'}
                </span>
                <span>{formatAudioTime(activeDuration)}</span>
              </div>
            </div>

            {/* Primary Transport Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateAudio({ shuffle: !audio.shuffle })}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    audio.shuffle
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Shuffle"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Shuffle</span>
                </button>

                <button
                  type="button"
                  onClick={handleCycleRepeatMode}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    (audio.repeatMode || 'all') !== 'off'
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Cycle Repeat Mode (All / One / Off)"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span className="capitalize">
                    {audio.repeatMode === 'one'
                      ? 'Repeat 1'
                      : audio.repeatMode === 'off'
                      ? 'Repeat Off'
                      : 'Repeat All'}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.resumeContextManually();
                    soundEngine.restartCurrentTrack();
                  }}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Restart Track from 00:00"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await soundEngine.resumeContextManually();
                    onPrevTrack();
                  }}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
                  title="Previous Track"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await soundEngine.resumeContextManually();
                    onUpdateAudio({ isPlaying: !audio.isPlaying });
                  }}
                  className="px-5 py-2.5 rounded-xl text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition-opacity hover:opacity-95 cursor-pointer"
                  style={{ backgroundColor: styleSettings.accentColor }}
                >
                  {audio.isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await soundEngine.resumeContextManually();
                    onNextTrack();
                  }}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
                  title="Next Track"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right 5 cols: 4-Channel Master Volume & Sound-Effect Mixer */}
          <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-950/75 border border-slate-800/90 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Master Volume &amp; Sound Effects
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onUpdateAudio({ isMuted: !audio.isMuted })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 cursor-pointer ${
                  audio.isMuted
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {audio.isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Mute All</span>
                  </>
                )}
              </button>
            </div>

            {/* Channel 1: Music Volume */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  🎵 Music Player Volume
                </span>
                <span className="font-mono-tabular text-indigo-300">
                  {audio.isMuted ? '0%' : `${audio.musicVolume}%`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={audio.isMuted ? 0 : audio.musicVolume}
                onChange={(e) => {
                  soundEngine.resumeContextManually();
                  onUpdateAudio({
                    musicVolume: Number(e.target.value),
                    isMuted: false,
                  });
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Channel 2: Ambient Soundscape Volume */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  🌧️ Ambient Sound ({AMBIENT_SOUNDS.find((s) => s.id === audio.ambientSoundId)?.name || 'Rain'})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await soundEngine.resumeContextManually();
                      onUpdateAudio({
                        ambientPlaying: !isAmbientActive,
                        ambientSoundId:
                          audio.ambientSoundId === 'silent'
                            ? 'rain'
                            : audio.ambientSoundId,
                      });
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                      isAmbientActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isAmbientActive ? 'ON' : 'OFF'}
                  </button>
                  <span className="font-mono-tabular text-emerald-300">
                    {audio.ambientVolume}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={audio.ambientVolume}
                onChange={(e) => {
                  soundEngine.resumeContextManually();
                  onUpdateAudio({
                    ambientVolume: Number(e.target.value),
                    isMuted: false,
                  });
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Channel 3: Notification Bell Volume */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  🔔 Notification &amp; Timer Bells
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await soundEngine.resumeContextManually();
                      soundEngine.playReminderChime();
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-300 cursor-pointer"
                  >
                    Test Bell
                  </button>
                  <span className="font-mono-tabular text-sky-300">
                    {audio.notificationVolume ?? 30}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={audio.notificationVolume ?? 30}
                onChange={(e) => {
                  soundEngine.resumeContextManually();
                  onUpdateAudio({
                    notificationVolume: Number(e.target.value),
                    isMuted: false,
                  });
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-sky-500"
              />
            </div>

            {/* Channel 4: UI Sound Effects Volume */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  ✨ UI Sound Effects (Habit Check)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await soundEngine.resumeContextManually();
                      soundEngine.playHabitCheck(true);
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 cursor-pointer"
                  >
                    Test SFX
                  </button>
                  <span className="font-mono-tabular text-amber-300">
                    {audio.uiSoundVolume}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={audio.uiSoundVolume}
                onChange={(e) => {
                  soundEngine.resumeContextManually();
                  onUpdateAudio({
                    uiSoundVolume: Number(e.target.value),
                    isMuted: false,
                  });
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. DEDICATED MUSIC PAGE NAVIGATION TABS */}
      <div
        className="rounded-2xl border border-slate-800/90 p-2 shadow-xl flex flex-wrap items-center justify-between gap-2"
        style={panelBgStyle}
      >
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              {
                id: 'library',
                label: `Music Library (${allTracks.length})`,
                icon: Music,
              },
              {
                id: 'my_music',
                label: `My Music (${audio.customTracks.length})`,
                icon: FolderOpen,
              },
              {
                id: 'playlists',
                label: `Playlists (${playlists.length})`,
                icon: ListMusic,
              },
              {
                id: 'ambient',
                label: 'Ambient Sounds',
                icon: Radio,
              },
              {
                id: 'focus',
                label: 'Focus Music',
                icon: Headphones,
              },
              {
                id: 'recent',
                label: `Recently Played (${recentlyPlayed.length})`,
                icon: Clock,
              },
              {
                id: 'favorites',
                label: `Favorites (${favoriteIds.length})`,
                icon: Star,
              },
            ] as {
              id: MusicPageSubTab;
              label: string;
              icon: React.ElementType;
            }[]
          ).map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
                style={
                  active
                    ? { backgroundColor: styleSettings.accentColor }
                    : undefined
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, folders..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. TAB CONTENT PANELS */}
      {subTab === 'library' && (
        <section
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-4"
          style={panelBgStyle}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Tracks' },
                  { id: 'rain', label: '🌧️ Rain' },
                  { id: 'focus', label: '🎧 Focus' },
                  { id: 'ambient', label: '✨ Ambient' },
                  { id: 'nature', label: '🌲 Nature' },
                  { id: 'instrumental', label: '🎹 Instrumental' },
                  {
                    id: 'custom',
                    label: `📁 My Music (${audio.customTracks.length})`,
                  },
                  {
                    id: 'favorites',
                    label: `★ Favorites (${favoriteIds.length})`,
                  },
                ] as { id: MusicCategoryId; label: string }[]
              ).map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      onUpdateAudio({ activeCategory: cat.id });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-indigo-600/30 border-indigo-400 text-white'
                        : 'bg-slate-900/75 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as typeof sortBy)
                }
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
              >
                <option value="default">Default Library Order</option>
                <option value="title">Title (A–Z)</option>
                <option value="category">Category</option>
                <option value="duration">Duration</option>
              </select>
            </div>
          </div>

          {filteredTracks.length === 0 ? (
            <div className="py-10 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
              <div className="text-sm font-semibold text-white">
                No matching tracks found
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try clearing your search filter, or click{' '}
                <strong>+ Import Music</strong> /{' '}
                <strong>+ Import Folder</strong> above to add audio files from
                your computer.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredTracks.map((item) => renderTrackRow(item))}
            </div>
          )}

          {/* Local Folder Structure Info Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              <span className="text-slate-200 font-semibold">
                📂 Local Music Folder Registry (`public/music/manifest.json`):
              </span>{' '}
              Bundled tracks are organized in{' '}
              <code className="text-indigo-300">public/music/ambient/</code>,{' '}
              <code className="text-indigo-300">focus/</code>,{' '}
              <code className="text-indigo-300">nature/</code>,{' '}
              <code className="text-indigo-300">rain/</code>, and{' '}
              <code className="text-indigo-300">instrumental/</code>.
            </div>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium shrink-0 cursor-pointer"
            >
              + Load Local Folder
            </button>
          </div>
        </section>
      )}

      {subTab === 'my_music' && (
        <section
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-4"
          style={panelBgStyle}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                My Imported Music ({audio.customTracks.length})
              </h2>
              <p className="text-xs text-slate-400">
                Personal audio files (.mp3, .wav, .ogg, .flac, .m4a) stored
                privately in your local IndexedDB database
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: styleSettings.accentColor }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Add Audio Files</span>
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>+ Add Folder</span>
              </button>
            </div>
          </div>

          {audio.customTracks.length === 0 ? (
            <div className="py-12 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-2xl mx-auto">
                🎵
              </div>
              <div className="text-sm font-semibold text-white">
                Your personal music library is empty
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Import multiple MP3, WAV, OGG, FLAC, or M4A songs at once—or
                select an entire music folder from your computer. All tracks are
                saved locally and work 100% offline.
              </p>
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: styleSettings.accentColor }}
                >
                  + Import Music Files
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 cursor-pointer"
                >
                  + Import Music Folder
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {allTracks
                .filter((t) => t.isCustom)
                .map((item) => renderTrackRow(item))}
            </div>
          )}
        </section>
      )}

      {subTab === 'playlists' && (
        <section
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-5"
          style={panelBgStyle}
        >
          {/* Create New Playlist Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                Curated &amp; Custom Playlists
              </h2>
              <p className="text-xs text-slate-400">
                Play a themed study playlist or build your own custom queue
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name..."
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
              />
              <input
                type="text"
                value={newPlaylistDesc}
                onChange={(e) => setNewPlaylistDesc(e.target.value)}
                placeholder="Short description (optional)"
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleCreatePlaylist}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: styleSettings.accentColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Playlist</span>
              </button>
            </div>
          </div>

          {/* Playlist Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {playlists.map((pl) => {
              const isSelected = selectedPlaylistId === pl.id;
              const isPlayingPlaylist = audio.activePlaylistId === pl.id;
              return (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylistId(pl.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSelectedPlaylistId(pl.id);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-lg'
                      : 'bg-slate-900/70 border-slate-800/90 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl">{pl.icon || '🎵'}</span>
                      <div className="flex items-center gap-1">
                        {isPlayingPlaylist && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">
                            Active Queue
                          </span>
                        )}
                        {!pl.isBuiltIn && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlaylist(pl.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Delete playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-2">
                      {pl.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {pl.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-[11px] font-mono-tabular text-slate-400">
                      {pl.trackIds.length} tracks
                    </span>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await soundEngine.resumeContextManually();
                        const firstTrack =
                          pl.trackIds[0] || 'bundled_velvet_rain_lofi';
                        onSelectTrack(firstTrack, pl.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Play</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Playlist Track Manager */}
          {(() => {
            const activePl =
              playlists.find((p) => p.id === selectedPlaylistId) ||
              playlists[0];
            if (!activePl) return null;
            const playlistTracks = activePl.trackIds
              .map((id) => allTracks.find((t) => t.id === id))
              .filter((t): t is UnifiedLibraryTrack => Boolean(t));

            return (
              <div className="p-4 rounded-2xl bg-slate-950/65 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {activePl.icon || '🎵'} {activePl.name} — Track Queue (
                      {playlistTracks.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Click any track below to play within this playlist, or
                      toggle tracks to customize the queue
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await soundEngine.resumeContextManually();
                      if (playlistTracks.length > 0) {
                        onSelectTrack(playlistTracks[0].id, activePl.id);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: styleSettings.accentColor }}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Entire Playlist</span>
                  </button>
                </div>

                {playlistTracks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No tracks in this playlist yet. Click any track chip below
                    to add it!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {playlistTracks.map((item) =>
                      renderTrackRow(item, { playlistContextId: activePl.id })
                    )}
                  </div>
                )}

                {/* Add/Remove Tracks in Playlist */}
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-300 mb-2">
                    Add or Remove Library Tracks in &ldquo;{activePl.name}&rdquo;:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allTracks.map((tr) => {
                      const included = activePl.trackIds.includes(tr.id);
                      return (
                        <button
                          key={tr.id}
                          type="button"
                          onClick={() =>
                            handleToggleTrackInPlaylist(activePl.id, tr.id)
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] border flex items-center gap-1 transition-colors cursor-pointer ${
                            included
                              ? 'bg-indigo-500/25 border-indigo-400 text-white font-medium'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {included ? (
                            <Check className="w-3 h-3 text-indigo-300" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          <span>{tr.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {subTab === 'ambient' && (
        <section
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-5"
          style={panelBgStyle}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                Ambient Environment Soundscapes &amp; Custom Mixes
              </h2>
              <p className="text-xs text-slate-400">
                Layer continuous procedural rain, forest, fireplace, café, or
                ocean waves underneath your music—or listen solo
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await soundEngine.resumeContextManually();
                onUpdateAudio({
                  ambientPlaying: !isAmbientActive,
                  ambientSoundId:
                    audio.ambientSoundId === 'silent'
                      ? 'rain'
                      : audio.ambientSoundId,
                });
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer border ${
                isAmbientActive
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>
                {isAmbientActive
                  ? 'Ambient Soundscape: ACTIVE'
                  : 'Start Ambient Soundscape'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {AMBIENT_SOUNDS.map((snd) => {
              const selected = audio.ambientSoundId === snd.id;
              return (
                <button
                  key={snd.id}
                  type="button"
                  onClick={async () => {
                    await soundEngine.resumeContextManually();
                    onUpdateAudio({
                      ambientSoundId: snd.id,
                      ambientPlaying: snd.id !== 'silent',
                    });
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {snd.name}
                    </span>
                    {selected && isAmbientActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {snd.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Saved Music + Ambient Mixer Presets */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Saved Soundscape + Music Mix Presets
                </h3>
                <p className="text-[11px] text-slate-400">
                  Save your favorite combination of Music Track + Ambient Sound
                  + Volume balance
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMixPresetName}
                  onChange={(e) => setNewMixPresetName(e.target.value)}
                  placeholder="Mix preset name..."
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newMixPresetName.trim()) return;
                    const nextPreset: AudioPreset = {
                      id: `mix_${Date.now()}`,
                      name: newMixPresetName.trim(),
                      musicTrackId: audio.currentTrackId,
                      musicVolume: audio.musicVolume,
                      ambientSoundId: audio.ambientSoundId,
                      ambientVolume: audio.ambientVolume,
                    };
                    onUpdateAudio({
                      audioPresets: [
                        ...(audio.audioPresets || []),
                        nextPreset,
                      ],
                    });
                    setNewMixPresetName('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  + Save Current Mix
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(audio.audioPresets || []).map((ap) => (
                <button
                  key={ap.id}
                  type="button"
                  onClick={async () => {
                    await soundEngine.resumeContextManually();
                    onUpdateAudio({
                      currentTrackId: ap.musicTrackId,
                      musicVolume: ap.musicVolume,
                      ambientSoundId: ap.ambientSoundId,
                      ambientVolume: ap.ambientVolume,
                      isPlaying: true,
                      ambientPlaying: ap.ambientSoundId !== 'silent',
                    });
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-indigo-500/20 border border-slate-800 hover:border-indigo-400 text-xs font-medium text-slate-200 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{ap.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono-tabular">
                    ({ap.musicVolume}% / {ap.ambientVolume}%)
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {subTab === 'focus' && (
        <section
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-4"
          style={panelBgStyle}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                Focus Music &amp; Deep Work Acoustics
              </h2>
              <p className="text-xs text-slate-400">
                Tracks engineered for concentration, Pomodoro study blocks, and
                distraction-free flow
              </p>
            </div>

            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(audio.autoSwitchMusicWithScene)}
                onChange={(e) =>
                  onUpdateAudio({
                    autoSwitchMusicWithScene: e.target.checked,
                  })
                }
                className="accent-indigo-500"
              />
              <span>Auto-switch music when changing Pixel Scene</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {allTracks
              .filter(
                (t) =>
                  t.category === 'focus' ||
                  t.category === 'instrumental' ||
                  t.category === 'rain'
              )
              .map((item) => renderTrackRow(item))}
          </div>
        </section>
      )}

      {subTab === 'recent' && (
        <section
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-4"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">
                Recently Played Tracks ({recentlyPlayed.length})
              </h2>
              <p className="text-xs text-slate-400">
                Quickly jump back to tracks from your recent focus sessions
              </p>
            </div>
            {recentlyPlayed.length > 0 && (
              <button
                type="button"
                onClick={() => onUpdateAudio({ recentlyPlayed: [] })}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>

          {recentlyPlayed.length === 0 ? (
            <div className="py-10 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
              No tracks played in this history yet. Click Play on any track in
              the Music Library to start building your listening history.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {recentlyPlayed
                .map((entry) => {
                  const found = allTracks.find((t) => t.id === entry.trackId);
                  return found ? { track: found, playedAt: entry.playedAt } : null;
                })
                .filter(
                  (
                    x
                  ): x is { track: UnifiedLibraryTrack; playedAt: string } =>
                    Boolean(x)
                )
                .map(({ track, playedAt }) =>
                  renderTrackRow(track, { playedAtLabel: playedAt })
                )}
            </div>
          )}
        </section>
      )}

      {subTab === 'favorites' && (
        <section
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-4"
          style={panelBgStyle}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">
                Saved Favorite Tracks ({favoriteIds.length})
              </h2>
              <p className="text-xs text-slate-400">
                Starred bundled and personal tracks for instant access
              </p>
            </div>
            {favoriteIds.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  await soundEngine.resumeContextManually();
                  onUpdateAudio({ activeCategory: 'favorites' });
                  onSelectTrack(favoriteIds[0], null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: styleSettings.accentColor }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play All Favorites</span>
              </button>
            )}
          </div>

          {favoriteIds.length === 0 ? (
            <div className="py-10 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
              Click the ★ star icon on any track in the Music Library or Now
              Playing bar to save it to your Favorites.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {allTracks
                .filter((t) => favoriteIds.includes(t.id))
                .map((item) => renderTrackRow(item))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
