import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Upload,
  FolderOpen,
  Search,
  ExternalLink,
  Youtube,
  Radio,
  Trash2,
  Music,
  Film,
  Check,
  AlertCircle,
  SkipForward,
  SkipBack,
  Maximize2,
  Minimize2,
  Tv,
  Clock,
  Sparkles,
  ArrowUpDown,
  FileQuestion,
} from 'lucide-react';
import {
  AudioSettings,
  CustomAudioTrack,
  SpotifySavedItem,
  StyleSettings,
  YouTubeSavedItem,
} from '../types/app';
import { playbackCoordinator } from '../audio/playbackCoordinator';
import { PlaybackProgressState, soundEngine } from '../audio/soundEngine';
import { VideoProgressState, videoEngine } from '../audio/videoEngine';
import { saveAudioBlob } from '../db/indexedDb';
import { AudioReactiveVisualizer } from './AudioReactiveVisualizer';

const openExternalUrl = (rawUrl: string) => {
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

interface MusicPlayerViewProps {
  audio: AudioSettings;
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onSelectTrack: (trackId: string, playlistId?: string | null) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onUploadLocalTracks: (tracks: CustomAudioTrack[]) => void;
  initialTab?: 'local' | 'online' | 'video';
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
  initialTab,
}) => {
  // Determine starting tab based on activeSource or initialTab prop
  const [activeMediaSection, setActiveMediaSection] = useState<'local' | 'online' | 'video'>(
    initialTab || (audio.activeSource === 'video' ? 'video' : audio.activeSource === 'youtube' || audio.activeSource === 'spotify' ? 'online' : 'local')
  );

  useEffect(() => {
    if (initialTab) {
      setActiveMediaSection(initialTab);
    }
  }, [initialTab]);

  // Audio engine progress tracking for local playback
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

  // Form states for Online tab
  const [onlineSubTab, setOnlineSubTab] = useState<'youtube' | 'spotify'>(
    audio.activeSource === 'spotify' ? 'spotify' : 'youtube'
  );
  const [youtubeInputUrl, setYoutubeInputUrl] = useState('');
  const [youtubeInputTitle, setYoutubeInputTitle] = useState('');
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  const [spotifyInputUrl, setSpotifyInputUrl] = useState('');
  const [spotifyInputTitle, setSpotifyInputTitle] = useState('');
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'date'>('date');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Local tracks vs Video tracks separation
  const localAudioTracks = useMemo(() => {
    return (audio.customTracks || []).filter((t) => t.mediaType !== 'video');
  }, [audio.customTracks]);

  const localVideoTracks = useMemo(() => {
    const fromAudioTracks = (audio.customTracks || []).filter((t) => t.mediaType === 'video');
    const fromExplicitVideo = audio.videoTracks || [];
    const map = new Map<string, CustomAudioTrack>();
    [...fromAudioTracks, ...fromExplicitVideo].forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [audio.customTracks, audio.videoTracks]);

  // Active track determination
  const isLocalAudioActive = audio.activeSource === 'library' && Boolean(audio.isPlaying);
  const isYouTubeActive = audio.activeSource === 'youtube' && Boolean(audio.activeYouTubeId);
  const isSpotifyActive = audio.activeSource === 'spotify' && Boolean(audio.activeSpotifyUri);
  const isVideoActive = audio.activeSource === 'video' && Boolean(audio.activeVideoTrackId);

  const currentLocalTrack = localAudioTracks.find((t) => t.id === audio.currentTrackId);
  const currentVideoTrack = localVideoTracks.find((t) => t.id === audio.activeVideoTrackId);

  // Video player state & mounting
  const videoMountRef = useRef<HTMLDivElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [videoProgress, setVideoProgress] = useState<VideoProgressState>(videoEngine.getState());
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(true);
  const hideOverlayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = videoEngine.subscribe((st) => {
      setVideoProgress(st);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (activeMediaSection === 'video') {
      if (videoMountRef.current) {
        videoEngine.attachToContainer(videoMountRef.current);
      }
      if (currentVideoTrack && videoProgress.activeTrackId !== currentVideoTrack.id) {
        videoEngine.loadTrack(currentVideoTrack, false);
      }
    }
  }, [activeMediaSection, currentVideoTrack, videoProgress.activeTrackId]);

  // File picker references
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFolderInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize fullscreen state across standard Fullscreen API and desktop fallbacks
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsVideoFullscreen(isFs);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVideoFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsVideoFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVideoFullscreen]);


  // --------------------------------------------------------------------------
  // ACTIONS: LOCAL AUDIO PLAYBACK
  // --------------------------------------------------------------------------
  const handlePlayLocalTrack = (trackId: string) => {
    soundEngine.playUiClick();
    videoEngine.pause();
    const patch = playbackCoordinator.preparePlayLocalTrack(trackId, audio);
    if (patch) {
      onUpdateAudio(patch);
      onSelectTrack(trackId);
    }
  };

  const handlePauseLocalTrack = () => {
    soundEngine.playUiClick();
    const patch = playbackCoordinator.preparePause(audio);
    onUpdateAudio(patch);
  };

  const handleResumeLocalTrack = () => {
    soundEngine.playUiClick();
    const patch = playbackCoordinator.prepareResume(audio);
    onUpdateAudio(patch);
  };

  const handleStopLocalTrack = () => {
    soundEngine.playUiClick();
    const patch = playbackCoordinator.prepareStopAll();
    onUpdateAudio(patch);
  };

  // --------------------------------------------------------------------------
  // ACTIONS: ONLINE STREAM PLAYBACK (YOUTUBE / SPOTIFY)
  // --------------------------------------------------------------------------
  const handleAddYouTubeUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setYoutubeError(null);
    const raw = youtubeInputUrl.trim();
    if (!raw) return;

    let embedId = '';
    let isPlaylist = false;

    const playlistMatch = raw.match(/[?&]list=([a-zA-Z0-9_-]+)/);
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
    videoEngine.pause();
    const patch = playbackCoordinator.preparePlayYouTube(embedId, newItem);

    onUpdateAudio({
      ...patch,
      youtubeItems: [newItem, ...currentYt],
    });

    setYoutubeInputUrl('');
    setYoutubeInputTitle('');
    setStatusMessage(`✓ Loaded YouTube ${isPlaylist ? 'playlist' : 'stream'}.`);
    window.setTimeout(() => setStatusMessage(null), 3000);
  };

  const handlePlaySavedYouTube = (item: YouTubeSavedItem) => {
    soundEngine.playUiClick();
    videoEngine.pause();
    const patch = playbackCoordinator.preparePlayYouTube(item.embedId, item);
    if (patch) {
      onUpdateAudio(patch);
    }
  };

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
    videoEngine.pause();
    const patch = playbackCoordinator.preparePlaySpotify(embedUri, newItem);

    onUpdateAudio({
      ...patch,
      spotifyItems: [newItem, ...currentSp],
    });

    setSpotifyInputUrl('');
    setSpotifyInputTitle('');
    setStatusMessage('✓ Loaded Spotify embed.');
    window.setTimeout(() => setStatusMessage(null), 3000);
  };

  const handlePlaySavedSpotify = (item: SpotifySavedItem) => {
    soundEngine.playUiClick();
    videoEngine.pause();
    const patch = playbackCoordinator.preparePlaySpotify(item.embedUri, item);
    if (patch) {
      onUpdateAudio(patch);
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: VIDEO SONGS PLAYBACK (POWERED BY CENTRALIZED VIDEO ENGINE)
  // --------------------------------------------------------------------------
  const handlePlayVideoTrack = (track: CustomAudioTrack) => {
    soundEngine.playUiClick();
    const patch = playbackCoordinator.preparePlayVideo(track.id);
    if (patch) {
      onUpdateAudio(patch);
    }
    videoEngine.playTrack(track, true);
  };

  const handleTogglePlayPauseVideo = () => {
    soundEngine.playUiClick();
    if (videoProgress.playbackState === 'playing') {
      videoEngine.pause();
      onUpdateAudio({ isPlaying: false, playbackStatus: 'paused' });
    } else {
      videoEngine.play();
      onUpdateAudio({ isPlaying: true, activeSource: 'video', playbackStatus: 'playing' });
    }
  };

  const handleStopVideo = () => {
    soundEngine.playUiClick();
    videoEngine.stop();
    onUpdateAudio({
      activeVideoTrackId: null,
      activeSource: 'none',
      isPlaying: false,
      playbackStatus: 'stopped',
    });
  };

  const handleToggleVideoFullscreen = () => {
    soundEngine.playUiClick();
    if (!isVideoFullscreen) {
      const el = videoContainerRef.current;
      if (el) {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {
            setIsVideoFullscreen(true);
          });
        } else if ((el as any).webkitRequestFullscreen) {
          (el as any).webkitRequestFullscreen();
        }
      }
      setIsVideoFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsVideoFullscreen(false);
    }
  };

  // --------------------------------------------------------------------------
  // IMPORT ACTIONS (AUDIO & VIDEO)
  // --------------------------------------------------------------------------
  const handleOpenAudioFileDialog = async () => {
    soundEngine.playUiClick();
    const desktop = (
      window as unknown as {
        habitraDesktop?: {
          openAudioFilesDialog?: () => Promise<
            { filePath: string; name: string; ext: string; size: number }[]
          >;
        };
      }
    ).habitraDesktop;

    if (desktop?.openAudioFilesDialog) {
      setUploadingMedia(true);
      try {
        const selected = await desktop.openAudioFilesDialog();
        if (selected && selected.length > 0) {
          const newTracks: CustomAudioTrack[] = selected.map((s) => ({
            id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: s.name,
            filePath: s.filePath,
            fileSize: s.size,
            format: s.ext,
            mediaType: 'audio',
            category: 'custom',
            artist: 'Local Music File',
            folderName: 'Local Library',
            addedAt: new Date().toISOString(),
          }));
          onUploadLocalTracks(newTracks);
          setStatusMessage(`✓ Imported ${newTracks.length} local audio track(s).`);
          window.setTimeout(() => setStatusMessage(null), 3500);
        }
      } catch {
        setStatusMessage('⚠ Failed to import audio files.');
      } finally {
        setUploadingMedia(false);
      }
      return;
    }

    audioFileInputRef.current?.click();
  };

  const handleOpenAudioFolderDialog = async () => {
    soundEngine.playUiClick();
    const desktop = (
      window as unknown as {
        habitraDesktop?: {
          openAudioFolderDialog?: () => Promise<
            { filePath: string; name: string; ext: string; size: number; folderName?: string }[]
          >;
        };
      }
    ).habitraDesktop;

    if (desktop?.openAudioFolderDialog) {
      setUploadingMedia(true);
      try {
        const selected = await desktop.openAudioFolderDialog();
        if (selected && selected.length > 0) {
          const newTracks: CustomAudioTrack[] = selected.map((s) => ({
            id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: s.name,
            filePath: s.filePath,
            fileSize: s.size,
            format: s.ext,
            mediaType: 'audio',
            category: 'custom',
            artist: 'Local Music File',
            folderName: s.folderName || 'Local Folder',
            addedAt: new Date().toISOString(),
          }));
          onUploadLocalTracks(newTracks);
          setStatusMessage(`✓ Imported ${newTracks.length} audio file(s) from folder.`);
          window.setTimeout(() => setStatusMessage(null), 3500);
        }
      } catch {
        setStatusMessage('⚠ Failed to import folder.');
      } finally {
        setUploadingMedia(false);
      }
      return;
    }

    audioFolderInputRef.current?.click();
  };

  const handleOpenVideoFileDialog = async () => {
    soundEngine.playUiClick();
    const desktop = (
      window as unknown as {
        habitraDesktop?: {
          openVideoFilesDialog?: () => Promise<
            { filePath: string; name: string; ext: string; size: number }[]
          >;
        };
      }
    ).habitraDesktop;

    if (desktop?.openVideoFilesDialog) {
      setUploadingMedia(true);
      try {
        const selected = await desktop.openVideoFilesDialog();
        if (selected && selected.length > 0) {
          const newVideos: CustomAudioTrack[] = selected.map((s) => ({
            id: `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: s.name,
            filePath: s.filePath,
            fileSize: s.size,
            format: s.ext,
            mediaType: 'video',
            category: 'custom',
            artist: 'Local Video Song',
            folderName: 'Video Songs',
            addedAt: new Date().toISOString(),
          }));
          const currentVideos = audio.videoTracks || [];
          onUpdateAudio({
            videoTracks: [...newVideos, ...currentVideos],
          });
          setStatusMessage(`✓ Imported ${newVideos.length} video song(s).`);
          window.setTimeout(() => setStatusMessage(null), 3500);
        }
      } catch {
        setStatusMessage('⚠ Failed to import video files.');
      } finally {
        setUploadingMedia(false);
      }
      return;
    }

    videoFileInputRef.current?.click();
  };

  // Browser web file input handlers
  const handleWebAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    const added: CustomAudioTrack[] = [];
    try {
      for (const file of Array.from(files)) {
        const trackId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await saveAudioBlob(trackId, file);
        added.push({
          id: trackId,
          name: file.name.replace(/\.[^/.]+$/, ''),
          blobKey: trackId,
          fileSize: file.size,
          format: file.name.split('.').pop()?.toLowerCase(),
          mediaType: 'audio',
          category: 'custom',
          artist: 'Local File',
          addedAt: new Date().toISOString(),
        });
      }
      onUploadLocalTracks(added);
      setStatusMessage(`✓ Imported ${added.length} audio file(s).`);
    } catch {
      setStatusMessage('⚠ Could not save files.');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleWebVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    const added: CustomAudioTrack[] = [];
    try {
      for (const file of Array.from(files)) {
        const trackId = `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await saveAudioBlob(trackId, file);
        added.push({
          id: trackId,
          name: file.name.replace(/\.[^/.]+$/, ''),
          blobKey: trackId,
          fileSize: file.size,
          format: file.name.split('.').pop()?.toLowerCase(),
          mediaType: 'video',
          category: 'custom',
          artist: 'Local Video',
          addedAt: new Date().toISOString(),
        });
      }
      const currentVideos = audio.videoTracks || [];
      onUpdateAudio({
        videoTracks: [...added, ...currentVideos],
      });
      setStatusMessage(`✓ Imported ${added.length} video file(s).`);
    } catch {
      setStatusMessage('⚠ Could not save video.');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filter & sort local audio tracks
  const filteredLocalAudio = useMemo(() => {
    let list = localAudioTracks.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.artist && t.artist.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    if (sortBy === 'title') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [localAudioTracks, searchQuery, sortBy]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. TOP HEADER & THREE DEDICATED SECTION TABS */}
      <div
        className="p-5 sm:p-6 rounded-3xl border border-slate-800/90 shadow-2xl relative overflow-hidden"
        style={panelBgStyle}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                activeMediaSection === 'local'
                  ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                  : activeMediaSection === 'online'
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-purple-500/20 text-purple-400 border-purple-500/40'
              }`}
            >
              {activeMediaSection === 'local' ? (
                <Music className="w-6 h-6" />
              ) : activeMediaSection === 'online' ? (
                <Youtube className="w-6 h-6" />
              ) : (
                <Film className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    activeMediaSection === 'local'
                      ? 'bg-indigo-500/30 text-indigo-200'
                      : activeMediaSection === 'online'
                      ? 'bg-red-500/30 text-red-200'
                      : 'bg-purple-500/30 text-purple-200'
                  }`}
                >
                  {activeMediaSection === 'local'
                    ? 'Local Music Player'
                    : activeMediaSection === 'online'
                    ? 'Online Focus Streams'
                    : 'Video Songs Studio'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Single Active Source Control
                </span>
              </div>

              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                {activeMediaSection === 'local'
                  ? 'Private Offline Audio Library'
                  : activeMediaSection === 'online'
                  ? 'YouTube & Spotify Streaming'
                  : 'Offline Video Songs Player'}
              </h2>
              <p className="text-xs text-slate-400">
                {activeMediaSection === 'local'
                  ? 'Play local MP3 and WAV files stored on your machine with zero cloud dependence.'
                  : activeMediaSection === 'online'
                  ? 'Curated ambient study streams and custom YouTube/Spotify links.'
                  : 'Play local MP4 video songs with dedicated playback and full-screen controls.'}
              </p>
            </div>
          </div>

          {/* Active playback badge & Stop button */}
          {(isLocalAudioActive || isYouTubeActive || isSpotifyActive || isVideoActive) && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {isLocalAudioActive
                    ? 'Local Audio Playing'
                    : isYouTubeActive
                    ? 'YouTube Playing'
                    : isSpotifyActive
                    ? 'Spotify Playing'
                    : 'Video Playing'}
                </span>
              </span>
              <button
                type="button"
                onClick={handleStopLocalTrack}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Stop all media playback"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>

        {/* 3 Primary Navigation Section Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setActiveMediaSection('local');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              activeMediaSection === 'local'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Local Music</span>
            {localAudioTracks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {localAudioTracks.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setActiveMediaSection('online');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              activeMediaSection === 'online'
                ? 'bg-red-600 text-white border-red-500 shadow-md'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Youtube className="w-4 h-4" />
            <span>Online Music</span>
            {(audio.youtubeItems?.length || 0) + (audio.spotifyItems?.length || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {(audio.youtubeItems?.length || 0) + (audio.spotifyItems?.length || 0)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setActiveMediaSection('video');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              activeMediaSection === 'video'
                ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Video Songs</span>
            {localVideoTracks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {localVideoTracks.length}
              </span>
            )}
          </button>
        </div>

        {/* Temporary Feedback Banner */}
        {statusMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 1: LOCAL MUSIC (OFFLINE MP3 / WAV)
         ========================================================================= */}
      {activeMediaSection === 'local' && (
        <div className="space-y-5">
          {/* Active Local Player Controls Card */}
          {currentLocalTrack && (
            <div
              className="p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-xl space-y-3"
              style={panelBgStyle}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {currentLocalTrack.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {currentLocalTrack.artist || 'Local Music File'} · {currentLocalTrack.format?.toUpperCase() || 'MP3'}
                    </div>
                  </div>
                </div>

                {/* Transport Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPrevTrack()}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Previous Track"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {isLocalAudioActive ? (
                    <button
                      type="button"
                      onClick={handlePauseLocalTrack}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResumeLocalTrack}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onNextTrack()}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Next Track"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleStopLocalTrack}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Stop Playback"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cinematic Audio-Reactive Visualizer Spectrum */}
              <div className="w-full h-14 rounded-xl bg-slate-950/80 border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                <AudioReactiveVisualizer
                  isPlaying={isLocalAudioActive}
                  volume={audio.musicVolume}
                  accentColor={styleSettings.accentColor}
                  variant="cinematic"
                  className="w-full h-full"
                />
              </div>

              {/* Progress Bar & Seek */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
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

              {localProgress.playbackError && (
                <div className="text-xs text-rose-400 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{localProgress.playbackError}</span>
                </div>
              )}
            </div>
          )}

          {/* Library Management & Track List */}
          <div
            className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl"
            style={panelBgStyle}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Local Audio Library
                </h3>
                <p className="text-xs text-slate-400">
                  Supported formats: MP3, WAV, OGG, FLAC, M4A, AAC. Files remain permanently on your drive.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAudioFileDialog}
                  disabled={uploadingMedia}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Files</span>
                </button>
                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
                  multiple
                  onChange={handleWebAudioUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleOpenAudioFolderDialog}
                  disabled={uploadingMedia}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Import Folder</span>
                </button>
                <input
                  ref={audioFolderInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.flac"
                  multiple
                  {...({
                    webkitdirectory: '',
                    directory: '',
                  } as React.InputHTMLAttributes<HTMLInputElement>)}
                  onChange={handleWebAudioUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Search and Sort Bar */}
            {localAudioTracks.length > 0 && (
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search local tracks..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setSortBy((s) => (s === 'title' ? 'date' : 'title'))}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Sort: {sortBy === 'title' ? 'Title' : 'Recently Added'}</span>
                </button>
              </div>
            )}

            {/* Track List */}
            {filteredLocalAudio.length === 0 ? (
              <div className="p-10 rounded-2xl border border-dashed border-slate-800 text-center">
                <Music className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-300">
                  {localAudioTracks.length === 0
                    ? 'No local music imported yet'
                    : 'No tracks match your search'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  Click &quot;Import Files&quot; or &quot;Import Folder&quot; above to select your favorite offline focus tracks.
                  Local files never upload to external servers.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredLocalAudio.map((track) => {
                  const isCurrent = audio.currentTrackId === track.id && isLocalAudioActive;

                  return (
                    <div
                      key={track.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isCurrent
                          ? 'border-indigo-500/50 bg-indigo-500/10'
                          : 'border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (isCurrent) {
                              handlePauseLocalTrack();
                            } else {
                              handlePlayLocalTrack(track.id);
                            }
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer shadow transition-colors ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                          title={isCurrent ? 'Pause Track' : 'Play Track'}
                        >
                          {isCurrent ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {track.name}
                            </span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                              {track.format ? track.format.toUpperCase() : 'AUDIO'}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                PLAYING
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-md">
                            {track.filePath || track.folderName || 'Local Library File'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {track.durationSeconds && (
                          <span className="text-[11px] font-mono text-slate-400">
                            {formatTime(track.durationSeconds)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            const next = (audio.customTracks || []).filter((t) => t.id !== track.id);
                            onUpdateAudio({ customTracks: next });
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                          title="Remove from library (File is not deleted)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: ONLINE MUSIC (YOUTUBE & SPOTIFY)
         ========================================================================= */}
      {activeMediaSection === 'online' && (
        <div className="space-y-6">
          {/* Subtabs for YouTube / Spotify */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setOnlineSubTab('youtube');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                onlineSubTab === 'youtube'
                  ? 'bg-red-600 text-white border-red-500 shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <Youtube className="w-4 h-4" />
              <span>YouTube Streams</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setOnlineSubTab('spotify');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                onlineSubTab === 'spotify'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Spotify Playlists</span>
            </button>
          </div>

          {/* YouTube Form & Saved List */}
          {onlineSubTab === 'youtube' && (
            <div className="space-y-5">
              <div
                className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl"
                style={panelBgStyle}
              >
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-400" />
                  <span>Add YouTube Focus Stream or Playlist</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Paste any YouTube URL or playlist. Audio streams continue playing in the background while you navigate Habitra.
                </p>

                <form onSubmit={handleAddYouTubeUrl} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8">
                      <input
                        type="text"
                        value={youtubeInputUrl}
                        onChange={(e) => setYoutubeInputUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={youtubeInputTitle}
                        onChange={(e) => setYoutubeInputTitle(e.target.value)}
                        placeholder="Stream title (optional)"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  {youtubeError && (
                    <div className="text-xs text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{youtubeError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow cursor-pointer transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Load &amp; Play Stream</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openExternalUrl('https://www.youtube.com')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open YouTube in Browser</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Saved YouTube Streams */}
              <div
                className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl"
                style={panelBgStyle}
              >
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-3">
                  Saved YouTube Focus Streams
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(audio.youtubeItems || []).map((item) => {
                    const isSelected = audio.activeYouTubeId === item.embedId && isYouTubeActive;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
                          isSelected
                            ? 'border-red-500/60 bg-red-500/10 shadow'
                            : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono uppercase font-bold text-red-400 px-1.5 py-0.5 rounded bg-red-500/20">
                              {item.type}
                            </span>
                            <h5 className="text-xs font-bold text-white mt-1.5 truncate">
                              {item.title}
                            </h5>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              const next = (audio.youtubeItems || []).filter((y) => y.id !== item.id);
                              onUpdateAudio({ youtubeItems: next });
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Remove saved stream"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handlePlaySavedYouTube(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{isSelected ? 'Playing' : 'Play Stream'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openExternalUrl(item.url)}
                            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                            title="Open in Default Browser"
                          >
                            <span>Browser</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Spotify Form & Saved List */}
          {onlineSubTab === 'spotify' && (
            <div className="space-y-5">
              <div
                className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl"
                style={panelBgStyle}
              >
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Add Spotify Playlist or Track Link</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Paste any Spotify track, album, or playlist URL (open.spotify.com/playlist/...).
                </p>

                <form onSubmit={handleAddSpotifyUrl} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8">
                      <input
                        type="text"
                        value={spotifyInputUrl}
                        onChange={(e) => setSpotifyInputUrl(e.target.value)}
                        placeholder="https://open.spotify.com/playlist/... or spotify:playlist:..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={spotifyInputTitle}
                        onChange={(e) => setSpotifyInputTitle(e.target.value)}
                        placeholder="Playlist label (optional)"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {spotifyError && (
                    <div className="text-xs text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{spotifyError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow cursor-pointer transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Load Spotify Embed</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openExternalUrl('spotify:')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Spotify App</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Saved Spotify Items */}
              <div
                className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl"
                style={panelBgStyle}
              >
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-3">
                  Saved Spotify Streams
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(audio.spotifyItems || []).map((item) => {
                    const isSelected = audio.activeSpotifyUri === item.embedUri && isSpotifyActive;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
                          isSelected
                            ? 'border-emerald-500/60 bg-emerald-500/10 shadow'
                            : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/20">
                              {item.type}
                            </span>
                            <h5 className="text-xs font-bold text-white mt-1.5 truncate">
                              {item.title}
                            </h5>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              const next = (audio.spotifyItems || []).filter((s) => s.id !== item.id);
                              onUpdateAudio({ spotifyItems: next });
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Remove saved item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handlePlaySavedSpotify(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{isSelected ? 'Loaded' : 'Load Player'}</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openExternalUrl(`spotify:${item.embedUri}`)}
                              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>App</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openExternalUrl(item.url)}
                              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>Web</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 3: LOCAL VIDEO SONGS (MP4 / WEBM)
         ========================================================================= */}
      {activeMediaSection === 'video' && (
        <div className="space-y-6">
          {/* Active Video Player Viewport */}
          <div
            className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md shadow-2xl space-y-4"
            style={panelBgStyle}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-400" />
                  <span>Video Songs Screen</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentVideoTrack ? currentVideoTrack.name : 'Select an imported video song to start playback.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenVideoFileDialog}
                  disabled={uploadingMedia}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Video Files (MP4)</span>
                </button>
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/mov,video/*"
                  multiple
                  onChange={handleWebVideoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Video Canvas & Fullscreen Theater Container */}
            <div
              ref={videoContainerRef}
              className={
                isVideoFullscreen
                  ? 'fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 sm:p-6 overflow-hidden'
                  : 'relative w-full aspect-video max-h-[440px] rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800 flex items-center justify-center group'
              }
              onMouseMove={() => {
                setShowFullscreenOverlay(true);
                if (hideOverlayTimerRef.current) {
                  window.clearTimeout(hideOverlayTimerRef.current);
                }
                if (isVideoFullscreen) {
                  hideOverlayTimerRef.current = window.setTimeout(() => {
                    setShowFullscreenOverlay(false);
                  }, 3500);
                }
              }}
            >
              {/* Video Element Mount Container */}
              <div
                ref={videoMountRef}
                className="w-full h-full flex items-center justify-center cursor-pointer select-none"
                onDoubleClick={handleToggleVideoFullscreen}
              />

              {/* Placeholder when no video is loaded */}
              {!currentVideoTrack && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2 pointer-events-none">
                  <Film className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="text-xs">No video song selected. Choose an imported MP4 video below to begin playback.</p>
                </div>
              )}

              {/* Floating Top Bar in Fullscreen Mode */}
              {isVideoFullscreen && showFullscreenOverlay && (
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30 pointer-events-auto transition-opacity duration-300">
                  <div className="px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-slate-800 text-xs font-semibold text-white flex items-center gap-2 shadow-xl">
                    <Film className="w-3.5 h-3.5 text-purple-400" />
                    <span className="truncate max-w-sm">{currentVideoTrack?.name || 'Video Song'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleVideoFullscreen}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg transition-colors"
                    title="Exit Fullscreen (Esc)"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Exit Fullscreen</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-mono text-slate-400">Esc</kbd>
                  </button>
                </div>
              )}

              {/* Error Overlay with Clear Diagnostic Guidance */}
              {videoProgress.errorMsg && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-rose-300 space-y-3 z-30">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <p className="text-xs font-semibold text-rose-200">{videoProgress.errorMsg}</p>
                    <p className="text-[11px] text-slate-400">
                      Standard MP4 (H.264 video with AAC audio) is recommended for smooth playback.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenVideoFileDialog}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow cursor-pointer transition-colors"
                  >
                    Re-import MP4 File
                  </button>
                </div>
              )}

              {/* Floating Fullscreen Controls Bar */}
              {isVideoFullscreen && showFullscreenOverlay && currentVideoTrack && (
                <div className="absolute bottom-6 left-6 right-6 max-w-3xl mx-auto p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 backdrop-blur-xl shadow-2xl space-y-2 z-30 pointer-events-auto transition-opacity duration-300">
                  {/* Seek Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>{formatTime(videoProgress.currentTime)}</span>
                      <span className="text-[10px] text-slate-500 font-sans">
                        Double-click video or press Esc to exit fullscreen
                      </span>
                      <span>{formatTime(videoProgress.duration)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={videoProgress.duration || 100}
                      step="0.5"
                      value={videoProgress.currentTime || 0}
                      onChange={(e) => videoEngine.seekTo(parseFloat(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTogglePlayPauseVideo}
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                      >
                        {videoProgress.playbackState === 'playing' ? (
                          <>
                            <Pause className="w-4 h-4 fill-current" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                            <span>Play</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleStopVideo}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                        title="Stop Video"
                      >
                        <Square className="w-4 h-4 fill-current text-rose-400" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-slate-400" />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={videoProgress.volume}
                          onChange={(e) => videoEngine.setVolume(parseInt(e.target.value, 10))}
                          className="w-20 accent-purple-500 cursor-pointer h-1 bg-slate-800 rounded"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleVideoFullscreen}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                        title="Exit Fullscreen (Esc)"
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>Exit</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dedicated Video Controls Bar in Normal View Mode (Positioned neatly below screen) */}
            {!isVideoFullscreen && currentVideoTrack && (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md space-y-3">
                {/* Seek Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{formatTime(videoProgress.currentTime)}</span>
                    <span className="text-[10px] text-slate-500 font-sans">
                      Double-click screen or click Fullscreen to expand
                    </span>
                    <span>{formatTime(videoProgress.duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={videoProgress.duration || 100}
                    step="0.5"
                    value={videoProgress.currentTime || 0}
                    onChange={(e) => videoEngine.seekTo(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTogglePlayPauseVideo}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      {videoProgress.playbackState === 'playing' ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                          <span>Play</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleStopVideo}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title="Stop Video"
                    >
                      <Square className="w-4 h-4 fill-current text-rose-400" />
                    </button>

                    <span className="text-xs font-semibold text-slate-300 truncate max-w-xs ml-2">
                      {currentVideoTrack.name}
                    </span>
                  </div>

                  {/* Volume Slider & Fullscreen Toggle */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-slate-400" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={videoProgress.volume}
                        onChange={(e) => videoEngine.setVolume(parseInt(e.target.value, 10))}
                        className="w-20 accent-purple-500 cursor-pointer h-1 bg-slate-800 rounded"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleVideoFullscreen}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                      title="Enter Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Fullscreen</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Library List */}
          <div
            className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl"
            style={panelBgStyle}
          >
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-3">
              Imported Video Songs Library ({localVideoTracks.length})
            </h4>

            {localVideoTracks.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-slate-400 text-xs">
                <Film className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <span>No local video songs imported yet. Click &quot;Import Video Files&quot; above to add MP4 songs.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {localVideoTracks.map((video) => {
                  const isPlaying = audio.activeVideoTrackId === video.id && isVideoActive;

                  return (
                    <div
                      key={video.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
                        isPlaying
                          ? 'border-purple-500/60 bg-purple-500/10 shadow'
                          : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono uppercase font-bold text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/20">
                            {video.format ? video.format.toUpperCase() : 'MP4'}
                          </span>
                          <h5 className="text-xs font-bold text-white mt-1.5 truncate">
                            {video.name}
                          </h5>
                          <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            {video.filePath || 'Local Video Song'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            const next = (audio.videoTracks || []).filter((v) => v.id !== video.id);
                            const nextCustom = (audio.customTracks || []).filter((v) => v.id !== video.id);
                            onUpdateAudio({ videoTracks: next, customTracks: nextCustom });
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          title="Remove from video songs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handlePlayVideoTrack(video)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                            isPlaying
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isPlaying ? 'Playing on Screen' : 'Play Video'}</span>
                        </button>

                        <span className="text-[11px] font-mono text-slate-500">
                          {video.fileSize ? `${(video.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'Local File'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
