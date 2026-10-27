import React, { useState, useMemo } from 'react';
import {
  Sun,
  Moon,
  Sunrise,
  CheckCircle2,
  Circle,
  Calendar as CalendarIcon,
  Timer as TimerIcon,
  PiggyBank,
  Music,
  Play,
  Pause,
  SkipForward,
  ChevronDown,
  ChevronUp,
  X,
  Settings2,
  Sparkles,
  ArrowRight,
  Flame,
  Plus,
} from 'lucide-react';
import {
  AppDataState,
  CalendarEvent,
  DailyBriefSections,
  Habit,
  NavigationTab,
} from '../types/app';
import { formatLocalYMD } from '../constants/scenesAndPresets';
import { soundEngine } from '../audio/soundEngine';
import { formatCents } from '../services/finsaEngine';
import { calculateHabitStreak } from '../utils/habitStats';
import { FinsaDailySavingsRecord } from '../types/finsa';

export interface PersonalDailyBriefProps {
  appState: AppDataState;
  onNavigateTab: (tab: NavigationTab) => void;
  onToggleHabit: (habitId: string) => void;
  onStartFocusSession: () => void;
  onQuickDropSavings: (record: FinsaDailySavingsRecord) => void;
  onDismissBrief: () => void;
  onUpdateSections: (sections: DailyBriefSections) => void;
  isTimerRunning?: boolean;
  onToggleTimer?: () => void;
}

export const PersonalDailyBrief: React.FC<PersonalDailyBriefProps> = ({
  appState,
  onNavigateTab,
  onToggleHabit,
  onStartFocusSession,
  onQuickDropSavings,
  onDismissBrief,
  onUpdateSections,
  isTimerRunning = false,
  onToggleTimer,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const todayStr = formatLocalYMD(new Date());
  const now = new Date();
  const hours = now.getHours();

  // Dynamic greeting
  const greeting =
    hours < 12
      ? 'Good morning'
      : hours < 17
      ? 'Good afternoon'
      : 'Good evening';

  const GreetingIcon =
    hours < 12 ? Sunrise : hours < 18 ? Sun : Moon;

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const userName = appState.profile.userName?.trim() || 'Sanctuary Explorer';

  const sections: DailyBriefSections = appState.profile.dailyBriefSections || {
    habits: true,
    calendar: true,
    focus: true,
    finance: true,
    music: true,
  };

  // 1. Habit calculations
  const activeHabits = (appState.habits || []).filter((h) => !h.archived);
  const completions = appState.completions || {};
  const completedHabitsCount = activeHabits.filter(
    (h) => completions[`${h.id}_${todayStr}`]
  ).length;
  const habitCompletionPercent =
    activeHabits.length > 0
      ? Math.round((completedHabitsCount / activeHabits.length) * 100)
      : 0;

  // 2. Calendar calculations
  const upcomingEvents = useMemo(() => {
    return (appState.calendarEvents || [])
      .filter((ev) => ev.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''))
      .slice(0, 3);
  }, [appState.calendarEvents, todayStr]);

  // 3. Focus timer calculations
  const todayFocusMinutes = useMemo(() => {
    const history = appState.timer.history || [];
    return history
      .filter((item) => item.date === todayStr && item.mode === 'focus')
      .reduce((sum, item) => sum + (item.minutes || 0), 0);
  }, [appState.timer.history, todayStr]);

  const todayFocusCount = useMemo(() => {
    return (appState.timer.history || []).filter(
      (item) => item.date === todayStr && item.mode === 'focus'
    ).length;
  }, [appState.timer.history, todayStr]);

  // 4. FINSA calculations
  const finsa = appState.finsa;
  const currency = finsa?.currency || 'INR';
  const privacyMode = Boolean(finsa?.privacyMode);
  const totalDailySavingsCents = useMemo(() => {
    return (finsa?.dailySavings || []).reduce((acc, item) => acc + (item.amountCents || 0), 0);
  }, [finsa?.dailySavings]);

  const todaySavedCents = useMemo(() => {
    return (finsa?.dailySavings || [])
      .filter((item) => item.date === todayStr)
      .reduce((acc, item) => acc + (item.amountCents || 0), 0);
  }, [finsa?.dailySavings, todayStr]);

  const topSavingsGoal = (finsa?.savingsGoals || []).find((g) => g.currentCents < g.targetCents);

  // 5. Audio playback
  const audio = appState.audio;
  const isPlaying = Boolean(audio.isPlaying);
  const customTrack = (audio.customTracks || []).find((t) => t.id === audio.currentTrackId);
  const currentTrackName =
    audio.activeSource === 'library'
      ? customTrack?.name || 'Velvet Rain Lo-Fi'
      : audio.activeSource === 'youtube'
      ? 'YouTube Focus Stream'
      : audio.activeSource === 'spotify'
      ? 'Spotify Session'
      : audio.activeSource === 'video'
      ? 'Local Video Track'
      : 'Calm Sanctuary Atmosphere';

  const handleQuickDropPreset = (amount: number) => {
    const amountCents = currency === 'JPY' ? Math.round(amount) : Math.round(amount * 100);
    const newRecord: FinsaDailySavingsRecord = {
      id: `save_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: todayStr,
      amountCents,
      category: 'Pocket Change',
      note: 'Quick daily brief drop',
      createdAt: new Date().toISOString(),
    };
    soundEngine.playCoinDrop();
    onQuickDropSavings(newRecord);
  };

  return (
    <section
      aria-label="Personal Daily Brief"
      className="relative rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-5 shadow-2xl text-white overflow-hidden transition-all duration-300 backdrop-blur-xl"
    >
      {/* Decorative ambient background accents */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <GreetingIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {greeting}, {userName}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                Daily Brief
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {formattedDate} • Based on genuine local records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Customize sections button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setIsSettingsOpen(!isSettingsOpen);
            }}
            className={`p-2 rounded-xl cursor-pointer transition-colors ${
              isSettingsOpen
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Customize Daily Brief Sections"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Expand / Collapse */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setIsExpanded(!isExpanded);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer transition-colors"
            title={isExpanded ? 'Collapse Daily Brief' : 'Expand Daily Brief'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Dismiss for today */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onDismissBrief();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
            title="Dismiss Brief for Today"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customize Drawer */}
      {isSettingsOpen && (
        <div className="relative z-10 p-3 my-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 animate-fadeIn space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-semibold text-slate-200">Visible Brief Modules</span>
            <span className="text-[10px] text-slate-400 font-mono">Real-time local state</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {(
              [
                { key: 'habits', label: "Today's Habits" },
                { key: 'calendar', label: 'Upcoming Agenda' },
                { key: 'focus', label: 'Focus Sessions' },
                { key: 'finance', label: 'FINSA Savings' },
                { key: 'music', label: 'Music Controls' },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 select-none"
              >
                <input
                  type="checkbox"
                  checked={Boolean(sections[item.key])}
                  onChange={(e) => {
                    const updated = { ...sections, [item.key]: e.target.checked };
                    onUpdateSections(updated);
                  }}
                  className="rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <span className="text-slate-300 truncate">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed summary pill */}
      {!isExpanded && (
        <div className="relative z-10 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-300">
            <span>
              <strong>{completedHabitsCount}/{activeHabits.length}</strong> habits done today
            </span>
            <span>•</span>
            <span>
              <strong>{todayFocusMinutes}m</strong> focused ({todayFocusCount} sessions)
            </span>
            <span>•</span>
            <span>
              <strong>{upcomingEvents.length}</strong> upcoming commitments
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
          >
            Show Full Daily Brief →
          </button>
        </div>
      )}

      {/* Expanded Multi-Module Grid */}
      {isExpanded && (
        <div className="relative z-10 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. HABITS MODULE */}
          {sections.habits && (
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Today's Habits</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                    {completedHabitsCount}/{activeHabits.length} ({habitCompletionPercent}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 my-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${habitCompletionPercent}%` }}
                  />
                </div>

                {/* Habit checklist */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activeHabits.slice(0, 4).map((habit) => {
                    const isDone = Boolean(completions[`${habit.id}_${todayStr}`]);
                    const streak = calculateHabitStreak(habit, completions, new Date()).currentStreak;
                    return (
                      <div
                        key={habit.id}
                        onClick={() => onToggleHabit(habit.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isDone
                            ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-200'
                            : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className={`text-xs truncate ${isDone ? 'line-through opacity-75' : 'font-medium'}`}>
                            {habit.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {streak > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-mono text-amber-300 font-bold px-1 rounded bg-amber-500/10">
                              <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                              {streak}
                            </span>
                          )}
                          <span className="text-xs">{habit.icon}</span>
                        </div>
                      </div>
                    );
                  })}

                  {activeHabits.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No active habits. Add habits to track your daily rhythm!
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('habits')}
                className="pt-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View all habits</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* 2. FOCUS & PRODUCTIVITY MODULE */}
          {sections.focus && (
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <TimerIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Focus & Deep Work</span>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-400 font-semibold">
                    {todayFocusMinutes}m logged
                  </span>
                </div>

                <div className="my-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Today's Sessions</div>
                    <div className="text-lg font-mono font-bold text-white">
                      {todayFocusCount} <span className="text-xs font-normal text-slate-400">completed</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      if (onToggleTimer) onToggleTimer();
                    }}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all ${
                      isTimerRunning
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        <span>Start Session</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  {isTimerRunning
                    ? 'Timer is actively running in background.'
                    : 'Ready for your next Pomodoro or deep work block.'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('timer')}
                className="pt-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Open timer workspace</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* 3. CALENDAR AGENDA MODULE */}
          {sections.calendar && (
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">Upcoming Agenda</span>
                  </div>
                  <span className="text-[11px] font-mono text-sky-400">
                    {upcomingEvents.length} upcoming
                  </span>
                </div>

                <div className="space-y-1.5 my-2.5 max-h-36 overflow-y-auto pr-1">
                  {upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{ev.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {ev.date} {ev.startTime ? `• ${ev.startTime}` : '• All day'}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                        {ev.category}
                      </span>
                    </div>
                  ))}

                  {upcomingEvents.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No commitments scheduled for today or tomorrow. Enjoy the open space!
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('calendar')}
                className="pt-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Open full calendar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* 4. FINSA SAVINGS MODULE */}
          {sections.finance && (
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">FINSA Wealth Pulse</span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    {formatCents(totalDailySavingsCents, currency, privacyMode)}
                  </span>
                </div>

                <div className="my-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-950/30 to-slate-950 border border-amber-600/25">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400 text-[11px]">Today's Dropped Savings:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {formatCents(todaySavedCents, currency, privacyMode)}
                    </span>
                  </div>

                  {/* Quick Drop Preset Buttons */}
                  <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                    {(currency === 'INR' ? [50, 100, 200, 500] : [5, 10, 20, 50]).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickDropPreset(amt)}
                        className="flex-1 py-1 px-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-300 text-[10px] font-mono cursor-pointer transition-colors text-center"
                      >
                        +{currency === 'INR' ? '₹' : '$'}{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {topSavingsGoal && (
                  <div className="text-[10px] text-slate-400">
                    Goal: <strong>{topSavingsGoal.name}</strong> •{' '}
                    {Math.round((topSavingsGoal.currentCents / topSavingsGoal.targetCents) * 100)}% funded
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('finsa')}
                className="pt-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Open FINSA Studio</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* 5. AUDIO & ATMOSPHERE MODULE */}
          {sections.music && (
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Atmosphere & Audio</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {(audio.activeSource || 'none').toUpperCase()}
                  </span>
                </div>

                <div className="my-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{currentTrackName}</div>
                    <div className="text-[10px] text-slate-400">
                      {isPlaying ? 'Playing • Single authoritative source' : 'Playback paused'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        // Toggle play/pause
                      }}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  Sanctuary scene: <strong>{appState.environment.sceneId.replace(/_/g, ' ')}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('music')}
                className="pt-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Open audio library</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
