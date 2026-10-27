import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Music,
  Calendar as CalendarIcon,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Plus,
  X,
  Minimize2,
  Maximize2,
  ExternalLink,
  Pin,
  Settings,
  Sparkles,
  Check,
  Timer as TimerIcon,
  PiggyBank,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  Info,
  Flame,
  LayoutGrid,
} from 'lucide-react';
import {
  AppDataState,
  AudioSettings,
  CalendarEvent,
  DesktopWidgetSection,
  DesktopWidgetSettings,
  Habit,
} from '../types/app';
import { FinsaDailySavingsRecord, FinsaCurrency } from '../types/finsa';
import { formatLocalYMD, DEFAULT_WIDGET_SETTINGS } from '../constants/scenesAndPresets';
import { soundEngine } from '../audio/soundEngine';
import { formatCents, CURRENCY_SYMBOLS } from '../services/finsaEngine';
import { calculateHabitStreak } from '../utils/habitStats';

export interface DesktopQuickWidgetProps {
  appState: AppDataState;
  onClose: () => void;
  onToggleHabit: (habitId: string) => void;
  onQuickAddHabit: (name: string) => void;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onOpenFullApp: () => void;
  onUpdateWidgetSettings?: (settings: DesktopWidgetSettings) => void;
  isTimerRunning?: boolean;
  secondsRemaining?: number;
  onToggleTimer?: () => void;
  onResetTimer?: () => void;
  onChangeTimerMode?: (mode: 'focus' | 'short_break' | 'long_break') => void;
  onAddDailySavings?: (record: FinsaDailySavingsRecord) => void;
}

export const DesktopQuickWidget: React.FC<DesktopQuickWidgetProps> = ({
  appState,
  onClose,
  onToggleHabit,
  onQuickAddHabit,
  onUpdateAudio,
  onNextTrack,
  onPrevTrack,
  onOpenFullApp,
  onUpdateWidgetSettings,
  isTimerRunning = false,
  secondsRemaining = 25 * 60,
  onToggleTimer,
  onResetTimer,
  onChangeTimerMode,
  onAddDailySavings,
}) => {
  const widgetSettings = appState.widgetSettings || DEFAULT_WIDGET_SETTINGS;

  const [activeTab, setActiveTab] = useState<DesktopWidgetSection>(
    widgetSettings.activeWidgetTab || 'tasks'
  );
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [savingsAmountInput, setSavingsAmountInput] = useState('');
  const [savingsCategory, setSavingsCategory] = useState('Pocket Change');
  const [savingsNote, setSavingsNote] = useState('');
  const [isPinned, setIsPinned] = useState(Boolean(widgetSettings.alwaysOnTop));
  const [widgetSize, setWidgetSize] = useState<'compact' | 'standard' | 'expanded'>(
    widgetSettings.widgetSize || 'standard'
  );

  const todayStr = formatLocalYMD(new Date());

  // Active Habits & completions
  const activeHabits = (appState.habits || []).filter((h) => !h.archived);
  const completions = appState.completions || {};

  // Music state
  const audio = appState.audio;
  const isPlaying = Boolean(audio.isPlaying);
  const activeSource = audio.activeSource || 'none';
  const customTrack = (audio.customTracks || []).find((t) => t.id === audio.currentTrackId);
  const trackTitle =
    activeSource === 'library'
      ? customTrack?.name || 'Velvet Rain Lo-Fi'
      : activeSource === 'youtube'
      ? 'YouTube Focus Stream'
      : activeSource === 'spotify'
      ? 'Spotify Study Session'
      : activeSource === 'video'
      ? 'Local Video Track'
      : 'No Active Audio';

  // Calendar
  const upcomingEvents = useMemo(() => {
    return (appState.calendarEvents || [])
      .filter((ev) => ev.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''))
      .slice(0, 5);
  }, [appState.calendarEvents, todayStr]);

  // FINSA stats
  const finsaState = appState.finsa;
  const currency: FinsaCurrency = finsaState?.currency || 'INR';
  const privacyMode = Boolean(finsaState?.privacyMode);
  const totalDailySavingsCents = useMemo(() => {
    return (finsaState?.dailySavings || []).reduce((acc, item) => acc + (item.amountCents || 0), 0);
  }, [finsaState?.dailySavings]);

  const currencySymbol = CURRENCY_SYMBOLS[currency] || (currency === 'INR' ? '₹' : '$');

  // Timer format (MM:SS)
  const timerMinutes = Math.floor(secondsRemaining / 60);
  const timerSeconds = secondsRemaining % 60;
  const timerDisplay = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`;

  // Section visibility and order
  const order: DesktopWidgetSection[] = widgetSettings.widgetOrder || [
    'tasks',
    'timer',
    'savings',
    'music',
    'calendar',
  ];

  const sectionConfig: Record<
    DesktopWidgetSection,
    { label: string; icon: React.ReactNode; enabled: boolean }
  > = {
    tasks: {
      label: 'Tasks',
      icon: <CheckSquare className="w-3.5 h-3.5" />,
      enabled: widgetSettings.showTasks !== false,
    },
    timer: {
      label: 'Focus',
      icon: <TimerIcon className="w-3.5 h-3.5" />,
      enabled: widgetSettings.showFocusTimer !== false,
    },
    savings: {
      label: 'Savings',
      icon: <PiggyBank className="w-3.5 h-3.5" />,
      enabled: widgetSettings.showDailySavings !== false,
    },
    music: {
      label: 'Music',
      icon: <Music className="w-3.5 h-3.5" />,
      enabled: widgetSettings.showMusic !== false,
    },
    calendar: {
      label: 'Agenda',
      icon: <CalendarIcon className="w-3.5 h-3.5" />,
      enabled: widgetSettings.showUpcomingEvents !== false,
    },
  };

  const enabledSections = order.filter((sec) => sectionConfig[sec]?.enabled);

  // If current active tab is disabled, switch to first enabled
  const currentTab = enabledSections.includes(activeTab)
    ? activeTab
    : enabledSections[0] || 'tasks';

  const updateSettings = (patch: Partial<DesktopWidgetSettings>) => {
    const updated: DesktopWidgetSettings = {
      ...widgetSettings,
      ...patch,
    };
    if (onUpdateWidgetSettings) {
      onUpdateWidgetSettings(updated);
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    soundEngine.playSaveSuccess();
    onQuickAddHabit(newTaskInput.trim());
    setNewTaskInput('');
  };

  const handleTogglePlayPause = () => {
    soundEngine.playUiClick();
    onUpdateAudio({ isPlaying: !isPlaying });
  };

  const handleStopAudio = () => {
    soundEngine.playUiClick();
    soundEngine.pauseAllPlayback();
    onUpdateAudio({
      isPlaying: false,
      activeSource: 'none',
      activeYouTubeId: null,
      activeSpotifyUri: null,
      activeVideoTrackId: null,
    });
  };

  const handleAddSavingsDrop = (presetAmount?: number) => {
    const rawVal = presetAmount !== undefined ? presetAmount : parseFloat(savingsAmountInput);
    if (isNaN(rawVal) || rawVal <= 0) return;

    const amountCents = currency === 'JPY' ? Math.round(rawVal) : Math.round(rawVal * 100);

    const record: FinsaDailySavingsRecord = {
      id: `save_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: todayStr,
      amountCents,
      category: savingsCategory,
      note: savingsNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    soundEngine.playCoinDrop();
    if (onAddDailySavings) {
      onAddDailySavings(record);
    }
    setSavingsAmountInput('');
    setSavingsNote('');
  };

  const moveSectionOrder = (sec: DesktopWidgetSection, direction: 'up' | 'down') => {
    const idx = order.indexOf(sec);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= order.length) return;
    const newOrder = [...order];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(newIdx, 0, moved);
    updateSettings({ widgetOrder: newOrder });
  };

  // Determine width based on widgetSize
  const containerWidthClass =
    widgetSize === 'compact'
      ? 'w-72 sm:w-80'
      : widgetSize === 'expanded'
      ? 'w-96 sm:w-[460px]'
      : 'w-84 sm:w-96';

  return (
    <div
      role="dialog"
      aria-label="Habitra Desktop Quick Access Deck"
      className={`fixed bottom-6 right-6 z-50 ${containerWidthClass} rounded-3xl border border-slate-700/80 bg-slate-950/95 backdrop-blur-2xl shadow-2xl text-white overflow-hidden transition-all duration-200 select-none`}
      style={{
        boxShadow:
          '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        opacity: widgetSettings.opacity ?? 0.95,
      }}
    >
      {/* 1. Window Drag & Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="truncate flex items-center gap-1.5">
            <span className="text-xs font-bold text-white tracking-wide">
              Habitra Quick Access
            </span>
            <span className="text-[10px] font-mono text-indigo-300 px-1.5 py-0.2 rounded bg-indigo-500/15 border border-indigo-500/30">
              Desktop Dock
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Size toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              const nextSize =
                widgetSize === 'compact'
                  ? 'standard'
                  : widgetSize === 'standard'
                  ? 'expanded'
                  : 'compact';
              setWidgetSize(nextSize);
              updateSettings({ widgetSize: nextSize });
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            title={`Cycle Size (Current: ${widgetSize})`}
          >
            {widgetSize === 'compact' ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : widgetSize === 'expanded' ? (
              <LayoutGrid className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Customize Drawer Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setShowSettingsDrawer(!showSettingsDrawer);
            }}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              showSettingsDrawer
                ? 'text-indigo-400 bg-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Customize Widgets & Reorder"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Always on top / Pin */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              const nextPin = !isPinned;
              setIsPinned(nextPin);
              updateSettings({ alwaysOnTop: nextPin });
            }}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              isPinned ? 'text-emerald-400 bg-emerald-500/15' : 'text-slate-400 hover:text-white'
            }`}
            title={isPinned ? 'Always on top (Active)' : 'Pin to top'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          {/* Open Main App */}
          <button
            type="button"
            onClick={onOpenFullApp}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            title="Open Habitra Full Workspace"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 cursor-pointer transition-colors"
            title="Close Quick Access Panel (Ctrl+Shift+H to reopen)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Settings / Customization Drawer */}
      {showSettingsDrawer && (
        <div className="p-3.5 bg-slate-900 border-b border-slate-800/80 space-y-3 animate-fadeIn text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-semibold text-slate-200">Customize Quick Access</span>
            <span className="text-[10px] text-slate-400 font-mono">Toggles & Order</span>
          </div>

          <div className="space-y-1.5">
            {order.map((secKey) => {
              const conf = sectionConfig[secKey];
              if (!conf) return null;
              return (
                <div
                  key={secKey}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800"
                >
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={conf.enabled}
                      onChange={(e) => {
                        const patchKey =
                          secKey === 'tasks'
                            ? 'showTasks'
                            : secKey === 'timer'
                            ? 'showFocusTimer'
                            : secKey === 'savings'
                            ? 'showDailySavings'
                            : secKey === 'music'
                            ? 'showMusic'
                            : 'showUpcomingEvents';
                        updateSettings({ [patchKey]: e.target.checked });
                      }}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                    />
                    <span className="flex items-center gap-1.5 text-slate-300">
                      {conf.icon}
                      <span>{conf.label}</span>
                    </span>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSectionOrder(secKey, 'up')}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSectionOrder(secKey, 'down')}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Size picker */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400 text-[11px]">Widget Deck Layout:</span>
            <div className="flex items-center gap-1">
              {(['compact', 'standard', 'expanded'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => {
                    setWidgetSize(sz);
                    updateSettings({ widgetSize: sz });
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] capitalize cursor-pointer ${
                    widgetSize === sz
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[10px] text-indigo-300 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
            <div>
              <strong>Windows Tray & Desktop Bridge:</strong> In Electron desktop builds, use{' '}
              <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[9px] text-white">
                Ctrl+Shift+H
              </kbd>{' '}
              to toggle this panel or minimize Habitra to system tray. On browsers, this functions as your in-app persistent quick deck.
            </div>
          </div>
        </div>
      )}

      {/* 2. Navigation Pills (if not in expanded multi-view or when toggling tabs) */}
      <div className="flex items-center gap-1 p-1.5 bg-slate-900/50 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        {enabledSections.map((sec) => {
          const conf = sectionConfig[sec];
          const isCurrent = currentTab === sec;
          return (
            <button
              key={sec}
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setActiveTab(sec);
                updateSettings({ activeWidgetTab: sec });
              }}
              className={`flex-1 py-1 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {conf.icon}
              <span>{conf.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Content Area */}
      <div className="overflow-y-auto max-h-[380px]">
        {/* TAB: TASKS & HABITS */}
        {currentTab === 'tasks' && (
          <div className="p-3.5 space-y-3">
            <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                placeholder="Quick add today's habit or task..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors"
                title="Add task"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {activeHabits.map((habit) => {
                const isDone = Boolean(completions[`${habit.id}_${todayStr}`]);
                const streak = calculateHabitStreak(habit, completions, new Date()).currentStreak;

                return (
                  <div
                    key={habit.id}
                    onClick={() => {
                      soundEngine.playUiClick();
                      onToggleHabit(habit.id);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isDone
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'border-slate-600 bg-slate-950'
                        }`}
                      >
                        {isDone && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span
                        className={`text-xs truncate ${
                          isDone ? 'line-through opacity-70 text-slate-400' : 'font-medium'
                        }`}
                      >
                        {habit.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {streak > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                          {streak}
                        </span>
                      )}
                      <span className="text-sm">{habit.icon}</span>
                    </div>
                  </div>
                );
              })}

              {activeHabits.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500">
                  No active habits yet. Type above to add your first one!
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: FOCUS TIMER */}
        {currentTab === 'timer' && (
          <div className="p-4 space-y-4">
            {/* Mode chips */}
            <div className="flex items-center justify-center gap-1.5">
              {(
                [
                  { id: 'focus', label: 'Focus 25m' },
                  { id: 'short_break', label: 'Short 5m' },
                  { id: 'long_break', label: 'Long 15m' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    if (onChangeTimerMode) onChangeTimerMode(m.id);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    appState.timer.mode === m.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Countdown display */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center relative overflow-hidden">
              <div className="text-[11px] font-mono text-indigo-400 uppercase tracking-widest mb-1">
                {appState.timer.mode.replace('_', ' ')}
              </div>
              <div className="text-4xl font-mono font-black text-white tracking-wider drop-shadow-[0_2px_10px_rgba(99,102,241,0.4)]">
                {timerDisplay}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {isTimerRunning ? 'Session in progress...' : 'Ready to start'}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  if (onResetTimer) onResetTimer();
                }}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  if (onToggleTimer) onToggleTimer();
                }}
                className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>Start Session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB: FINSA DAILY SAVINGS ENTRY */}
        {currentTab === 'savings' && (
          <div className="p-4 space-y-3.5">
            {/* Vault Balance Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-amber-950/40 border border-amber-600/30 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase text-amber-300/80">
                  Total Vault Savings
                </div>
                <div className="text-lg font-mono font-black text-amber-300">
                  {formatCents(totalDailySavingsCents, currency, privacyMode)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <PiggyBank className="w-5 h-5" />
              </div>
            </div>

            {/* Quick Drop Form */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-slate-300 block">
                Quick Drop into Vault ({currencySymbol}):
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={savingsAmountInput}
                    onChange={(e) => setSavingsAmountInput(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddSavingsDrop()}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow"
                >
                  Drop
                </button>
              </div>

              {/* Instant preset chips */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                {(currency === 'INR'
                  ? [50, 100, 200, 500, 1000]
                  : [5, 10, 20, 50, 100]
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddSavingsDrop(preset)}
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-[10px] font-mono cursor-pointer whitespace-nowrap transition-colors"
                  >
                    +{currencySymbol}
                    {preset}
                  </button>
                ))}
              </div>

              {/* Category chips */}
              <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar">
                {[
                  'Pocket Change',
                  'Dining Skipped',
                  'Coffee Saved',
                  'Budget Surplus',
                  'Side Gig',
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSavingsCategory(cat)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] cursor-pointer whitespace-nowrap transition-colors ${
                      savingsCategory === cat
                        ? 'bg-amber-600/30 border border-amber-500 text-amber-200'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Note & link to FINSA */}
            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span>Syncs to FINSA mechanical counter</span>
              <button
                type="button"
                onClick={onOpenFullApp}
                className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                View Counter Studio →
              </button>
            </div>
          </div>
        )}

        {/* TAB: MUSIC CONTROLLER */}
        {currentTab === 'music' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 relative overflow-hidden">
                <Music className="w-6 h-6 relative z-10" />
                {isPlaying && (
                  <div className="absolute inset-0 bg-indigo-500/20 animate-pulse" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                  {activeSource.toUpperCase()}
                </span>
                <div className="text-xs font-bold text-white truncate mt-1">
                  {trackTitle}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isPlaying ? 'Playing • Single authoritative source' : 'Playback stopped'}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onPrevTrack}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer transition-colors"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlayPause}
                className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleStopAudio}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 cursor-pointer transition-colors"
                title="Stop Audio"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>

              <button
                type="button"
                onClick={onNextTrack}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer transition-colors"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-2 pt-1 px-1">
              <button
                type="button"
                onClick={() => onUpdateAudio({ isMuted: !audio.isMuted })}
                className="text-slate-400 hover:text-white cursor-pointer"
                title={audio.isMuted ? 'Unmute' : 'Mute'}
              >
                {audio.isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={audio.isMuted ? 0 : audio.musicVolume}
                onChange={(e) =>
                  onUpdateAudio({
                    musicVolume: parseInt(e.target.value, 10),
                    isMuted: false,
                  })
                }
                className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                {audio.isMuted ? '0%' : `${audio.musicVolume}%`}
              </span>
            </div>
          </div>
        )}

        {/* TAB: UPCOMING CALENDAR AGENDA */}
        {currentTab === 'calendar' && (
          <div className="p-3.5 space-y-2">
            <div className="text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800 flex items-center justify-between">
              <span>Agenda Timeline</span>
              <span>{todayStr}</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-xs flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{ev.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {ev.date} {ev.startTime ? `• ${ev.startTime}` : '• All day'}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {ev.category}
                  </span>
                </div>
              ))}

              {upcomingEvents.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500">
                  No upcoming calendar events for today. Open calendar in full app to schedule events.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer link to main app */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
        <button
          type="button"
          onClick={onOpenFullApp}
          className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition-colors"
        >
          Open Main Workspace →
        </button>
        <span className="font-mono text-slate-500">Ctrl+Shift+H</span>
      </div>
    </div>
  );
};
