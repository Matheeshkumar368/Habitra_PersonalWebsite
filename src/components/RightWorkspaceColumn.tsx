import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Settings2,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Plus,
  Upload,
  FolderOpen,
  Shuffle,
  Repeat,
  Star,
  ListMusic,
  Droplets,
  Sliders,
  CheckCircle2,
  Edit3,
  Trash2,
} from 'lucide-react';
import { PlaybackProgressState, soundEngine } from '../audio/soundEngine';
import {
  AMBIENT_SOUNDS,
  BUILTIN_MUSIC_TRACKS,
  PIXEL_SCENES,
} from '../constants/scenesAndPresets';
import {
  AmbientSoundId,
  AudioSettings,
  CustomAudioTrack,
  MusicCategoryId,
  Reminder,
  RepeatMode,
  StyleSettings,
  TimerMode,
  TimerSettings,
} from '../types/app';

interface RightWorkspaceColumnProps {
  timer: TimerSettings;
  secondsRemaining: number;
  isTimerRunning: boolean;
  timerBannerMessage: string | null;
  onStartPauseTimer: () => void;
  onResetTimer: () => void;
  onSkipTimer: () => void;
  onChangeTimerMode: (mode: TimerMode) => void;
  onUpdateTimerSettings: (patch: Partial<TimerSettings>) => void;

  audio: AudioSettings;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onSelectTrack?: (trackId: string, playlistId?: string | null) => void;
  onOpenMusicPage?: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onUploadLocalTracks: (tracks: CustomAudioTrack[]) => void;

  reminders: Reminder[];
  onToggleReminder: (id: string) => void;
  onOpenAddReminder: () => void;
  onOpenEditReminder?: (rem: Reminder) => void;
  waterCompleted: number;
  waterGoal: number;
  onLogWaterCup: () => void;

  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
}

export const RightWorkspaceColumn: React.FC<RightWorkspaceColumnProps> = ({
  timer,
  secondsRemaining,
  isTimerRunning,
  timerBannerMessage,
  onStartPauseTimer,
  onResetTimer,
  onSkipTimer,
  onChangeTimerMode,
  onUpdateTimerSettings,
  audio,
  onUpdateAudio,
  onSelectTrack,
  onOpenMusicPage,
  onNextTrack,
  onPrevTrack,
  onUploadLocalTracks,
  reminders,
  onToggleReminder,
  onOpenAddReminder,
  onOpenEditReminder,
  waterCompleted,
  waterGoal,
  onLogWaterCup,
  styleSettings,
  panelBgStyle,
}) => {
  const [showTimerConfig, setShowTimerConfig] = useState(false);
  const [showAudioMixer, setShowAudioMixer] = useState(false);
  const [showLibraryBrowser, setShowLibraryBrowser] = useState(true);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
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

  const [manifestVersion, setManifestVersion] = useState(0);
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

  const formatAudioTime = (secs: number): string => {
    if (!Number.isFinite(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalSecondsForMode =
    (timer.mode === 'focus'
      ? timer.focusMinutes
      : timer.mode === 'short_break'
      ? timer.shortBreakMinutes
      : timer.mode === 'long_break'
      ? timer.longBreakMinutes
      : timer.customMinutes) * 60;

  const progressFraction =
    totalSecondsForMode > 0
      ? Math.min(1, Math.max(0, 1 - secondsRemaining / totalSecondsForMode))
      : 0;

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const allLibraryTracks = React.useMemo(
    () => soundEngine.getAllLibraryTracks(audio.customTracks),
    [audio.customTracks, manifestVersion]
  );

  const activeUnifiedTrack =
    allLibraryTracks.find((t) => t.id === audio.currentTrackId) ||
    allLibraryTracks[0];

  const trackTitle = activeUnifiedTrack?.title || 'Velvet Rain Lo-Fi';
  const trackSubtitle =
    activeUnifiedTrack?.subtitle || 'Bundled CC0 WAV · public/music/rain/';
  const coverScene =
    PIXEL_SCENES.find((s) => s.imageUrl === activeUnifiedTrack?.coverImageUrl) ||
    PIXEL_SCENES[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const audioFiles = Array.from(files).filter(
      (f) =>
        f.type.startsWith('audio/') ||
        /\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i.test(f.name)
    );

    if (audioFiles.length === 0) {
      setUploadStatusMsg('⚠ No supported audio files (.mp3, .wav, .ogg, .flac, .m4a) found in selection.');
      window.setTimeout(() => setUploadStatusMsg(null), 4000);
      e.target.value = '';
      return;
    }

    setUploadingAudio(true);
    try {
      const readPromises = audioFiles.map(
        (file) =>
          new Promise<CustomAudioTrack>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const relPath = (file as File & { webkitRelativePath?: string })
                .webkitRelativePath;
              const folderParts = relPath ? relPath.split('/') : [];
              const folderName =
                folderParts.length > 1 ? folderParts[0] : undefined;
              resolve({
                id: `custom_${Date.now()}_${Math.random()
                  .toString(36)
                  .slice(2, 7)}`,
                name: file.name.replace(/\.[^/.]+$/, ''),
                dataUrl: String(reader.result || ''),
                category: 'custom',
                folderName,
              });
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      );

      const newTracks = await Promise.all(readPromises);
      if (newTracks.length > 0) {
        onUploadLocalTracks(newTracks);
        setUploadStatusMsg(
          `✓ Imported ${newTracks.length} local audio track${
            newTracks.length > 1 ? 's' : ''
          }`
        );
        window.setTimeout(() => setUploadStatusMsg(null), 3500);
      }
    } catch {
      setUploadStatusMsg('⚠ Failed to import one or more audio files.');
      window.setTimeout(() => setUploadStatusMsg(null), 4000);
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const handleToggleFavoriteTrack = (trackId: string) => {
    const currentFavs = audio.favoriteTrackIds || [];
    const exists = currentFavs.includes(trackId);
    onUpdateAudio({
      favoriteTrackIds: exists
        ? currentFavs.filter((id) => id !== trackId)
        : [...currentFavs, trackId],
    });
  };

  const handleCycleRepeatMode = () => {
    const order: RepeatMode[] = ['all', 'one', 'off'];
    const current = audio.repeatMode || 'all';
    const next = order[(order.indexOf(current) + 1) % order.length];
    onUpdateAudio({ repeatMode: next });
  };

  const activeCategory: MusicCategoryId = audio.activeCategory || 'all';
  const favoriteIds = audio.favoriteTrackIds || [];

  const libraryItems = allLibraryTracks.map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: t.subtitle,
    category: t.category as MusicCategoryId,
    isCustom: t.isCustom,
    sourceBadge: t.sourceBadge,
  }));

  const filteredLibraryItems = libraryItems.filter((item) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'favorites') return favoriteIds.includes(item.id);
    if (activeCategory === 'custom') return item.isCustom;
    return item.category === activeCategory;
  });

  const handleDeleteCustomTrack = (id: string) => {
    const remaining = audio.customTracks.filter((t) => t.id !== id);
    const nextTrackId =
      audio.currentTrackId === id ? 'lofi_rain' : audio.currentTrackId;
    onUpdateAudio({
      customTracks: remaining,
      currentTrackId: nextTrackId,
    });
  };

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressFraction);

  return (
    <aside className="w-full xl:w-[320px] shrink-0 space-y-4">
      {/* 1. FOCUS TIMER PANEL */}
      <div
        className="rounded-2xl border border-slate-800/90 p-4 shadow-xl transition-all"
        style={panelBgStyle}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🌱</span>
            <h2 className="text-sm font-semibold text-white">Focus Timer</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onSkipTimer}
              title="Skip phase"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowTimerConfig((v) => !v)}
              title="Timer Settings"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-4">
          {(
            [
              { id: 'focus', label: 'Focus' },
              { id: 'short_break', label: 'Short' },
              { id: 'long_break', label: 'Long' },
              { id: 'custom', label: 'Custom' },
            ] as { id: TimerMode; label: string }[]
          ).map((m) => {
            const active = timer.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChangeTimerMode(m.id)}
                className={`py-1.5 px-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap truncate ${
                  active
                    ? 'text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={
                  active
                    ? { backgroundColor: styleSettings.accentColor }
                    : undefined
                }
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Timer Completion Notification Banner */}
        {timerBannerMessage && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{timerBannerMessage}</span>
          </div>
        )}

        {/* Circular Timer Ring with Cozy Backdrop */}
        <div className="relative rounded-xl overflow-hidden py-4 flex flex-col items-center justify-center bg-slate-950/60 border border-slate-800/60 mb-4">
          {coverScene.imageUrl && (
            <img
              src={coverScene.imageUrl}
              alt="Focus timer ambient backdrop"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/70 pointer-events-none" />

          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 148 148">
              <circle
                cx="74"
                cy="74"
                r={radius}
                fill="rgba(15, 23, 42, 0.78)"
                stroke="rgba(148, 163, 184, 0.2)"
                strokeWidth="6"
              />
              <circle
                cx="74"
                cy="74"
                r={radius}
                fill="transparent"
                stroke={styleSettings.accentColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-indigo-300 mb-0.5">
                Cycle {timer.currentCycle || 1} / {timer.totalCycles || 4}
              </span>
              <span className="text-2xl font-bold text-white font-mono-tabular tracking-tight">
                {formattedTime}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 capitalize">
                {timer.mode.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 mt-2 text-[11px] text-slate-300 font-mono-tabular">
            <span>Sessions: {timer.sessionsCompletedToday}</span>
            <span>·</span>
            <span>Focused: {timer.totalFocusMinutesToday}m</span>
          </div>
        </div>

        {/* Inline Timer Settings Drawer */}
        {showTimerConfig && (
          <div className="mb-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
            <div className="grid grid-cols-5 gap-1.5">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Focus
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={timer.focusMinutes}
                  onChange={(e) =>
                    onUpdateTimerSettings({
                      focusMinutes: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full px-1.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-tabular text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Short
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={timer.shortBreakMinutes}
                  onChange={(e) =>
                    onUpdateTimerSettings({
                      shortBreakMinutes: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full px-1.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-tabular text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Long
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={timer.longBreakMinutes}
                  onChange={(e) =>
                    onUpdateTimerSettings({
                      longBreakMinutes: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full px-1.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-tabular text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Custom
                </label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={timer.customMinutes}
                  onChange={(e) =>
                    onUpdateTimerSettings({
                      customMinutes: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full px-1.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-tabular text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Cycles
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={timer.totalCycles || 4}
                  onChange={(e) =>
                    onUpdateTimerSettings({
                      totalCycles: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full px-1.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-tabular text-center"
                />
              </div>
            </div>

            <label className="flex items-center justify-between text-slate-300 cursor-pointer pt-1">
              <span>Auto-repeat Pomodoro cycles</span>
              <input
                type="checkbox"
                checked={timer.pomodoroAutoRepeat}
                onChange={(e) =>
                  onUpdateTimerSettings({
                    pomodoroAutoRepeat: e.target.checked,
                  })
                }
                className="accent-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between text-slate-300 cursor-pointer">
              <span>Immerse scene during Focus</span>
              <input
                type="checkbox"
                checked={timer.immerseOnFocus}
                onChange={(e) =>
                  onUpdateTimerSettings({ immerseOnFocus: e.target.checked })
                }
                className="accent-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between text-slate-300 cursor-pointer">
              <span>Change scene on Break</span>
              <input
                type="checkbox"
                checked={Boolean(timer.changeSceneOnBreak)}
                onChange={(e) =>
                  onUpdateTimerSettings({
                    changeSceneOnBreak: e.target.checked,
                  })
                }
                className="accent-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between text-slate-300 cursor-pointer">
              <span>Mute alerts during Focus</span>
              <input
                type="checkbox"
                checked={Boolean(timer.muteNotificationsDuringFocus)}
                onChange={(e) =>
                  onUpdateTimerSettings({
                    muteNotificationsDuringFocus: e.target.checked,
                  })
                }
                className="accent-indigo-500"
              />
            </label>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTimerConfig((v) => !v)}
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Configure Timer"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onStartPauseTimer}
            className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs text-white flex items-center justify-center gap-2 shadow-md transition-opacity hover:opacity-95 cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: styleSettings.accentColor }}
          >
            {isTimerRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onResetTimer}
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. AMBIENT MUSIC & SOUNDSCAPE PANEL */}
      <div
        className="rounded-2xl border border-slate-800/90 p-4 shadow-xl transition-all"
        style={panelBgStyle}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🎶</span>
            <h2 className="text-sm font-semibold text-white">Mini Player</h2>
            {onOpenMusicPage && (
              <button
                type="button"
                onClick={onOpenMusicPage}
                className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                title="Open Dedicated Full-Page Music Studio"
              >
                Full Studio →
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAudio}
              title="Import Multiple Audio Files (.mp3, .wav, .ogg, .flac, .m4a)"
              className="px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>+ Files</span>
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploadingAudio}
              title="Import Entire Music Folder"
              className="px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3 h-3" />
              <span>+ Folder</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
              multiple
              {...({
                webkitdirectory: '',
                directory: '',
              } as React.InputHTMLAttributes<HTMLInputElement>)}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => setShowLibraryBrowser((v) => !v)}
              title="Toggle Music Library Playlist"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                showLibraryBrowser
                  ? 'text-indigo-400 bg-indigo-500/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowAudioMixer((v) => !v)}
              title="Multi-Channel Sound Mixer"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                showAudioMixer
                  ? 'text-indigo-400 bg-indigo-500/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {uploadStatusMsg && (
          <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[11px] text-indigo-200">
            {uploadStatusMsg}
          </div>
        )}

        {playbackProgress.playbackError && (
          <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300">
            ⚠ {playbackProgress.playbackError}
          </div>
        )}

        <div className="flex items-center gap-3.5 mb-2.5">
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-700/80 bg-slate-900 relative">
            {coverScene.imageUrl ? (
              <img
                src={coverScene.imageUrl}
                alt={trackTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">
                🎧
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <div className="text-sm font-semibold text-white truncate">
                {trackTitle}
              </div>
              <button
                type="button"
                onClick={() => handleToggleFavoriteTrack(audio.currentTrackId)}
                className={`p-1 rounded cursor-pointer shrink-0 ${
                  favoriteIds.includes(audio.currentTrackId)
                    ? 'text-amber-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title={
                  favoriteIds.includes(audio.currentTrackId)
                    ? 'Remove from Saved Favorites'
                    : 'Add to Saved Favorites'
                }
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    favoriteIds.includes(audio.currentTrackId)
                      ? 'fill-current'
                      : ''
                  }`}
                />
              </button>
            </div>
            <div className="text-xs text-slate-400 truncate mt-0.5">
              {trackSubtitle}
            </div>

            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => onUpdateAudio({ shuffle: !audio.shuffle })}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  audio.shuffle
                    ? 'text-indigo-400 bg-indigo-500/15'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title={audio.shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.resumeContextManually();
                  onPrevTrack();
                }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.resumeContextManually();
                  onUpdateAudio({ isPlaying: !audio.isPlaying });
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow transition-opacity hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: styleSettings.accentColor }}
                title={audio.isPlaying ? 'Pause Audio' : 'Play Audio'}
              >
                {audio.isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.resumeContextManually();
                  onNextTrack();
                }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCycleRepeatMode}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5 ${
                  (audio.repeatMode || 'all') !== 'off'
                    ? 'text-indigo-400 bg-indigo-500/15'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title={`Repeat Mode: ${(audio.repeatMode || 'all').toUpperCase()}`}
              >
                <Repeat className="w-3.5 h-3.5" />
                {audio.repeatMode === 'one' && (
                  <span className="text-[9px] font-bold">1</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Playback Progress & Seek Bar */}
        <div className="mb-3 space-y-1">
          <input
            type="range"
            min={0}
            max={Math.max(1, playbackProgress.duration || 12)}
            step={0.25}
            value={Math.min(
              playbackProgress.currentTime,
              Math.max(1, playbackProgress.duration || 12)
            )}
            onChange={(e) => soundEngine.seekTo(Number(e.target.value))}
            disabled={!playbackProgress.isSeekable}
            className="w-full h-1 bg-slate-800 rounded-lg cursor-pointer accent-indigo-400"
            title="Seek playback position"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-tabular">
            <span>{formatAudioTime(playbackProgress.currentTime)}</span>
            <span className="uppercase text-[9px] text-slate-500">
              {playbackProgress.sourceType === 'bundled_file'
                ? 'Bundled WAV'
                : playbackProgress.sourceType === 'custom_file'
                ? 'Local File'
                : 'Live Synth'}
            </span>
            <span>{formatAudioTime(playbackProgress.duration || 12)}</span>
          </div>
        </div>

        {/* Primary Volume Slider */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onUpdateAudio({ isMuted: !audio.isMuted })}
            className="text-slate-400 hover:text-white cursor-pointer"
            title={audio.isMuted ? 'Unmute' : 'Mute'}
          >
            {audio.isMuted || audio.musicVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
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
            className="flex-1 h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
          />
          <span className="text-xs text-slate-400 font-mono-tabular w-8 text-right">
            {audio.isMuted ? '0%' : `${audio.musicVolume}%`}
          </span>
        </div>

        {/* Categorized Music Library Browser */}
        {showLibraryBrowser && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'rain', label: '🌧️ Rain' },
                  { id: 'focus', label: '🎧 Focus' },
                  { id: 'ambient', label: '✨ Ambient' },
                  { id: 'nature', label: '🌲 Nature' },
                  { id: 'instrumental', label: '🎹 Piano/Arp' },
                  { id: 'custom', label: `📁 Local (${audio.customTracks.length})` },
                  { id: 'favorites', label: `★ (${favoriteIds.length})` },
                ] as { id: MusicCategoryId; label: string }[]
              ).map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onUpdateAudio({ activeCategory: cat.id })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-indigo-600/30 border-indigo-400 text-white'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Track List or Empty Library Message */}
            {filteredLibraryItems.length === 0 ? (
              <div className="py-4 px-3 rounded-xl bg-slate-950/70 border border-dashed border-slate-800 text-center space-y-1.5">
                <div className="text-xs font-medium text-slate-300">
                  {activeCategory === 'custom'
                    ? 'No local music imported yet'
                    : activeCategory === 'favorites'
                    ? 'No favorite tracks saved yet'
                    : 'No tracks in this category'}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {activeCategory === 'custom'
                    ? 'Click "+ Files" or "+ Folder" above to load MP3, WAV, OGG, FLAC, or M4A tracks from your computer, or place audio files inside public/music/.'
                    : 'Click the ★ icon on any track to add it to your Favorites playlist.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                {filteredLibraryItems.map((item) => {
                  const isCurrent = audio.currentTrackId === item.id;
                  const isFav = favoriteIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                        isCurrent
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.resumeContextManually();
                          if (onSelectTrack) {
                            onSelectTrack(item.id, null);
                          } else {
                            onUpdateAudio({
                              currentTrackId: item.id,
                              isPlaying: true,
                            });
                          }
                        }}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium truncate">
                            {isCurrent && audio.isPlaying ? '▶ ' : ''}
                            {item.title}
                          </span>
                          <span className="px-1 py-0.2 rounded bg-slate-800 text-[9px] text-slate-400 font-mono-tabular shrink-0">
                            {item.sourceBadge}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.subtitle}
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleFavoriteTrack(item.id)}
                          className={`p-1 rounded cursor-pointer ${
                            isFav
                              ? 'text-amber-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title={isFav ? 'Unfavorite' : 'Favorite'}
                        >
                          <Star
                            className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`}
                          />
                        </button>
                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomTrack(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="Remove imported track"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Multi-Channel Ambient Soundscape Mixer Drawer */}
        {showAudioMixer && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Background Environment Sound
              </label>
              <select
                value={audio.ambientSoundId}
                onChange={(e) => {
                  const nextAmbient = e.target.value as AmbientSoundId;
                  soundEngine.resumeContextManually();
                  onUpdateAudio({
                    ambientSoundId: nextAmbient,
                    ambientPlaying: nextAmbient !== 'silent',
                  });
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                {AMBIENT_SOUNDS.map((snd) => (
                  <option key={snd.id} value={snd.id}>
                    {snd.name} — {snd.description}
                  </option>
                ))}
              </select>
            </div>

            {audio.customTracks.length > 0 && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Uploaded Custom Tracks ({audio.customTracks.length})
                </label>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {audio.customTracks.map((ct) => (
                    <div
                      key={ct.id}
                      className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-800"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateAudio({
                            currentTrackId: ct.id,
                            isPlaying: true,
                          })
                        }
                        className={`text-[11px] truncate text-left flex-1 cursor-pointer ${
                          audio.currentTrackId === ct.id
                            ? 'text-indigo-300 font-semibold'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        🎵 {ct.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomTrack(ct.id)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                        title="Remove uploaded track"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Ambient Sound Volume</span>
                <span className="font-mono-tabular">{audio.ambientVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={audio.ambientVolume}
                onChange={(e) =>
                  onUpdateAudio({ ambientVolume: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Notification Bell Volume</span>
                <span className="font-mono-tabular">
                  {audio.notificationVolume ?? 30}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={audio.notificationVolume ?? 30}
                onChange={(e) =>
                  onUpdateAudio({ notificationVolume: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>UI Interaction Chimes</span>
                <span className="font-mono-tabular">{audio.uiSoundVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={audio.uiSoundVolume}
                onChange={(e) =>
                  onUpdateAudio({ uiSoundVolume: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
              />
            </div>

            <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer pt-1">
              <span>Scene-specific music when switching scenes</span>
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
            </label>

            <button
              type="button"
              onClick={async () => {
                await soundEngine.resumeContextManually();
                soundEngine.playReminderChime();
              }}
              className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-medium text-indigo-300 cursor-pointer"
            >
              🔊 Test Chime &amp; Verify Audio Output
            </button>
          </div>
        )}
      </div>

      {/* 3. QUICK REMINDERS PANEL */}
      <div
        className="rounded-2xl border border-slate-800/90 p-4 shadow-xl transition-all"
        style={panelBgStyle}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔔</span>
            <h2 className="text-sm font-semibold text-white">Quick Reminders</h2>
          </div>
          <button
            type="button"
            onClick={onOpenAddReminder}
            className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>

        {/* Hydration Quick Bar */}
        <div className="mb-3 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-xs font-medium text-white">
                Hydration: {waterCompleted}/{waterGoal} cups
              </div>
              <div className="text-[11px] text-slate-400">
                Daily water target
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogWaterCup}
            className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-300 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            +1 Cup
          </button>
        </div>

        <div className="space-y-2">
          {reminders.length === 0 ? (
            <div className="py-5 px-3 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800">
              <p className="text-[11px] text-slate-400">
                No active reminders yet. Click &quot;+ Add&quot; to set a break
                or study reminder.
              </p>
            </div>
          ) : (
            reminders.slice(0, 5).map((rem) => (
              <div
                key={rem.id}
                className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700/70 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{
                      backgroundColor: `${rem.color}20`,
                      border: `1px solid ${rem.color}40`,
                    }}
                  >
                    {rem.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {rem.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {rem.scheduleType === 'interval'
                        ? `Every ${rem.intervalMinutes} minutes`
                        : `${rem.scheduleType} at ${rem.timeOfDay || '19:00'}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onOpenEditReminder && (
                    <button
                      type="button"
                      onClick={() => onOpenEditReminder(rem)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition-opacity cursor-pointer"
                      title="Edit Reminder"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rem.enabled}
                    onClick={() => onToggleReminder(rem.id)}
                    className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      rem.enabled ? 'bg-indigo-500' : 'bg-slate-700'
                    }`}
                    style={
                      rem.enabled
                        ? { backgroundColor: styleSettings.accentColor }
                        : undefined
                    }
                  >
                    <span
                      className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform transform ${
                        rem.enabled ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};
