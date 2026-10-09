import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Bell,
  BookOpen,
  Check,
  Clock,
  Flame,
  Lock,
  Maximize2,
  Play,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
  Volume2,
  VolumeX,
  Power,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Award,
} from 'lucide-react';
import {
  Goal,
  Habit,
  JournalEntry,
  NavigationTab,
  NotificationLogItem,
  Reminder,
  SceneId,
  TimerSessionLog,
} from '../types/app';
import { AchievementBadge, MissedReminderItem } from '../services/backgroundEngine';
import { PIXEL_SCENES, formatLocalYMD } from '../constants/scenesAndPresets';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  goals: Goal[];
  reminders: Reminder[];
  journalEntries: Record<string, JournalEntry>;
  timerHistory: TimerSessionLog[];
  achievements: AchievementBadge[];
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenNewHabit: () => void;
  onOpenNewGoal: () => void;
  onStartFocusTimer: () => void;
  onStartBreakTimer: () => void;
  onSelectScene: (sceneId: SceneId) => void;
  onEnterAmbientMode: () => void;
  onLockApp: () => void;
  onOpenJournal: (dateStr?: string) => void;
  onOpenNotifications: () => void;
  onInspectHabit: (habit: Habit) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  habits,
  goals,
  reminders,
  journalEntries,
  timerHistory,
  achievements,
  onNavigateTab,
  onOpenNewHabit,
  onOpenNewGoal,
  onStartFocusTimer,
  onStartBreakTimer,
  onSelectScene,
  onEnterAmbientMode,
  onLockApp,
  onOpenJournal,
  onOpenNotifications,
  onInspectHabit,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();

    const baseCommands = [
      {
        id: 'cmd_new_habit',
        category: 'Quick Command',
        icon: '🌱',
        title: 'New Habit',
        subtitle: 'Create a new daily or custom habit (Shortcut: N)',
        action: () => {
          onClose();
          onOpenNewHabit();
        },
      },
      {
        id: 'cmd_new_goal',
        category: 'Quick Command',
        icon: '🎯',
        title: 'New Goal',
        subtitle: 'Create a new milestone target (Shortcut: G)',
        action: () => {
          onClose();
          onOpenNewGoal();
        },
      },
      {
        id: 'cmd_start_focus',
        category: 'Quick Command',
        icon: '⏱️',
        title: 'Start Focus Timer',
        subtitle: 'Begin your deep work Pomodoro session (Shortcut: Space)',
        action: () => {
          onClose();
          onStartFocusTimer();
        },
      },
      {
        id: 'cmd_start_break',
        category: 'Quick Command',
        icon: '☕',
        title: 'Start Break Timer',
        subtitle: 'Switch to a relaxing recharge break',
        action: () => {
          onClose();
          onStartBreakTimer();
        },
      },
      {
        id: 'cmd_music_studio',
        category: 'Quick Command',
        icon: '🎶',
        title: 'Open Music Studio & Library',
        subtitle: 'Browse Music Library, My Music, Playlists, Ambient Sounds & Volume Mixer',
        action: () => {
          onClose();
          onNavigateTab('music');
        },
      },
      {
        id: 'cmd_ambient_mode',
        category: 'Quick Command',
        icon: '✨',
        title: 'Enter Full-Screen Ambient Mode',
        subtitle: 'Immersive pixel environment with floating timer & music (Shortcut: F)',
        action: () => {
          onClose();
          onEnterAmbientMode();
        },
      },
      {
        id: 'cmd_journal',
        category: 'Quick Command',
        icon: '📓',
        title: "Open Today's Reflection Journal",
        subtitle: 'Write daily notes and mood reflections locally',
        action: () => {
          onClose();
          onOpenJournal();
        },
      },
      {
        id: 'cmd_notifications',
        category: 'Quick Command',
        icon: '🔔',
        title: 'Open Notification History & Alerts',
        subtitle: 'Review water, study, streak, and timer alerts',
        action: () => {
          onClose();
          onOpenNotifications();
        },
      },
      {
        id: 'cmd_lock',
        category: 'Quick Command',
        icon: '🔒',
        title: 'Lock Habitra',
        subtitle: 'Activate local security screen lock (Shortcut: L)',
        action: () => {
          onClose();
          onLockApp();
        },
      },
      {
        id: 'cmd_health',
        category: 'Quick Command',
        icon: '🩺',
        title: 'Habitra Health & Diagnostics',
        subtitle: 'Verify IndexedDB, Background Scheduler, and Windows Notifications',
        action: () => {
          onClose();
          onNavigateTab('settings');
        },
      },
    ];

    const sceneCommands = PIXEL_SCENES.slice(0, 6).map((scene) => ({
      id: `scene_${scene.id}`,
      category: 'Switch Scene',
      icon: '🖼️',
      title: `Switch Scene: ${scene.name}`,
      subtitle: scene.subtitle,
      action: () => {
        onClose();
        onSelectScene(scene.id);
      },
    }));

    const habitItems = habits.map((h) => ({
      id: `habit_${h.id}`,
      category: h.archived ? 'Archived Habit' : 'Habit',
      icon: h.icon || '🌱',
      title: h.name,
      subtitle: `${h.frequency} • Goal: ${h.goalDays}d${h.reminderTime ? ` • Reminder ${h.reminderTime}` : ''}`,
      action: () => {
        onClose();
        onInspectHabit(h);
      },
    }));

    const goalItems = goals.map((g) => ({
      id: `goal_${g.id}`,
      category: 'Goal',
      icon: g.icon || '🎯',
      title: g.title,
      subtitle: `${g.progress}% complete • ${g.category} • Due ${g.deadline}`,
      action: () => {
        onClose();
        onNavigateTab('goals');
      },
    }));

    const reminderItems = reminders.map((r) => ({
      id: `rem_${r.id}`,
      category: 'Reminder',
      icon: r.icon || '🔔',
      title: r.title,
      subtitle:
        r.scheduleType === 'interval'
          ? `Every ${r.intervalMinutes} mins`
          : `At ${r.timeOfDay || '09:00'} (${r.scheduleType})`,
      action: () => {
        onClose();
        onNavigateTab('reminders');
      },
    }));

    const journalItems = (Object.values(journalEntries) as JournalEntry[]).map((j) => ({
      id: `journal_${j.dateStr}`,
      category: 'Journal Reflection',
      icon: j.mood || '📓',
      title: `Journal — ${j.dateStr}`,
      subtitle: j.content.slice(0, 80) || 'Empty reflection',
      action: () => {
        onClose();
        onOpenJournal(j.dateStr);
      },
    }));

    const achievementItems = achievements.map((a) => ({
      id: `ach_${a.id}`,
      category: a.unlocked ? 'Achievement Unlocked' : 'Achievement Locked',
      icon: a.icon,
      title: a.title,
      subtitle: `${a.description} (${a.progressText})`,
      action: () => {
        onClose();
        onNavigateTab('statistics');
      },
    }));

    const sessionItems = timerHistory.slice(0, 8).map((s) => ({
      id: `sess_${s.id}`,
      category: 'Focus Session Log',
      icon: '⏱️',
      title: `${s.minutes}m ${s.mode === 'focus' ? 'Focus Session' : 'Break'} (${s.date})`,
      subtitle: `Completed at ${s.completedAt}`,
      action: () => {
        onClose();
        onNavigateTab('timer');
      },
    }));

    const all = [
      ...baseCommands,
      ...habitItems,
      ...goalItems,
      ...reminderItems,
      ...journalItems,
      ...achievementItems,
      ...sessionItems,
      ...sceneCommands,
    ];

    if (!q) return all.slice(0, 14);
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [
    query,
    habits,
    goals,
    reminders,
    journalEntries,
    timerHistory,
    achievements,
    onClose,
    onOpenNewHabit,
    onOpenNewGoal,
    onStartFocusTimer,
    onStartBreakTimer,
    onEnterAmbientMode,
    onOpenJournal,
    onOpenNotifications,
    onLockApp,
    onNavigateTab,
    onSelectScene,
    onInspectHabit,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        items.length > 0 ? (prev - 1 + items.length) % items.length : 0
      );
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      items[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#111827] border border-white/15 shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-[#0b0f19]/60">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search habits, goals, journal, focus sessions, scenes..."
            autoFocus
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono-tabular text-slate-300 border border-white/10">
            ESC
          </kbd>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-white/5">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No matching commands, habits, goals, or journal entries found.
            </div>
          ) : (
            items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors ${
                  idx === selectedIndex
                    ? 'bg-indigo-600/25 border border-indigo-500/40 text-white'
                    : 'hover:bg-white/5 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-medium text-slate-300 shrink-0">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 bg-[#0b0f19]/90 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Execute</span>
            <span>Ctrl+K Toggle</span>
          </div>
          <span className="text-indigo-400 font-medium">Habitra Spotlight Search</span>
        </div>
      </div>
    </div>
  );
};

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: NotificationLogItem[];
  missedReminders: MissedReminderItem[];
  onDismissMissedReminders: () => void;
  onCompleteMissedItem: (item: MissedReminderItem) => void;
  onMarkAllRead: () => void;
  onClearHistory: () => void;
  onTriggerTestNotification: (
    kind: 'water' | 'study' | 'eye' | 'exercise' | 'streak' | 'timer'
  ) => void;
  notificationsEnabled: boolean;
  onToggleNotificationsEnabled: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  history,
  missedReminders,
  onDismissMissedReminders,
  onCompleteMissedItem,
  onMarkAllRead,
  onClearHistory,
  onTriggerTestNotification,
  notificationsEnabled,
  onToggleNotificationsEnabled,
}) => {
  const [filter, setFilter] = useState<'today' | 'all'>('today');
  const todayStr = formatLocalYMD(new Date());

  if (!isOpen) return null;

  const filtered =
    filter === 'today'
      ? history.filter((item) => item.dateStr === todayStr)
      : history;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#111827] border border-white/15 shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0b0f19]/60">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Notification Center & Background Log
              </h2>
              <p className="text-[11px] text-slate-400">
                Real-time desktop alerts, missed reminders catch-up, and today&apos;s log
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleNotificationsEnabled}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                notificationsEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}
            >
              {notificationsEnabled ? '● Alerts Active' : '⏸ Alerts Paused'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Missed Reminders Catch-up Banner */}
          {missedReminders.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    You missed {missedReminders.length} reminder
                    {missedReminders.length > 1 ? 's' : ''} while away:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onDismissMissedReminders}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Dismiss Summary
                </button>
              </div>
              <div className="space-y-1.5">
                {missedReminders.map((m) => (
                  <div
                    key={`${m.sourceType}_${m.id}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0b0f19]/70 border border-white/10 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span>{m.icon}</span>
                      <span className="font-semibold text-white">{m.title}</span>
                      <span className="text-slate-400 font-mono-tabular">({m.timeStr})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCompleteMissedItem(m)}
                      className="px-2.5 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold"
                    >
                      ✓ Mark Done
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instant Real Notification Test Suite */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Trigger Real Desktop Notification Preview
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { id: 'water', label: '💧 Water' },
                { id: 'study', label: '📚 Study' },
                { id: 'eye', label: '👀 Eye Break' },
                { id: 'exercise', label: '🏃 Exercise' },
                { id: 'streak', label: '🔥 Streak' },
                { id: 'timer', label: '⏰ Timer' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() =>
                    onTriggerTestNotification(
                      btn.id as 'water' | 'study' | 'eye' | 'exercise' | 'streak' | 'timer'
                    )
                  }
                  className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-600/25 border border-white/10 hover:border-indigo-500/40 text-[11px] font-medium text-slate-200 transition-colors text-center"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('today')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filter === 'today'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Today&apos;s Notifications
              </button>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                All History ({history.length})
              </button>
            </div>
            <div className="flex items-center gap-2">
              {history.some((h) => !h.read) && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Mark all read
                </button>
              )}
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-[11px] text-slate-400 hover:text-rose-400 font-medium"
                >
                  Clear log
                </button>
              )}
            </div>
          </div>

          {/* Notification Log List */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="py-10 text-center rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-2xl mb-1.5">🔔</div>
                <div className="text-xs font-medium text-slate-300">
                  No notifications logged {filter === 'today' ? 'today' : 'yet'}.
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Background scheduler is active and monitoring your reminders.
                </div>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-colors ${
                    item.read
                      ? 'bg-white/[0.02] border-white/5 text-slate-300'
                      : 'bg-indigo-500/10 border-indigo-500/30 text-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{item.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{item.title}</span>
                        <span className="text-[10px] font-mono-tabular text-slate-400">
                          {item.timeFormatted}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{item.message}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-tabular text-slate-500 shrink-0">
                    {item.dateStr}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DailyJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateStr?: string;
  journalEntries: Record<string, JournalEntry>;
  onSaveJournalEntry: (dateStr: string, content: string, mood: string) => void;
}

const MOOD_OPTIONS = [
  { emoji: '✨', label: 'Inspired' },
  { emoji: '🎯', label: 'Focused' },
  { emoji: '🌿', label: 'Calm' },
  { emoji: '💪', label: 'Productive' },
  { emoji: '☕', label: 'Cozy' },
  { emoji: '🌧️', label: 'Reflective' },
];

export const DailyJournalModal: React.FC<DailyJournalModalProps> = ({
  isOpen,
  onClose,
  initialDateStr,
  journalEntries,
  onSaveJournalEntry,
}) => {
  const todayStr = formatLocalYMD(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDateStr || todayStr);
  const currentEntry = journalEntries[selectedDate];
  const [content, setContent] = useState(currentEntry?.content || '');
  const [mood, setMood] = useState(currentEntry?.mood || '🌿');

  useEffect(() => {
    if (isOpen) {
      const targetDate = initialDateStr || todayStr;
      setSelectedDate(targetDate);
      const entry = journalEntries[targetDate];
      setContent(entry?.content || '');
      setMood(entry?.mood || '🌿');
    }
  }, [isOpen, initialDateStr, todayStr]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const entry = journalEntries[newDate];
    setContent(entry?.content || '');
    setMood(entry?.mood || '🌿');
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    onSaveJournalEntry(selectedDate, val, mood);
  };

  const handleMoodChange = (newMood: string) => {
    setMood(newMood);
    onSaveJournalEntry(selectedDate, content, newMood);
  };

  if (!isOpen) return null;

  const pastEntries = (Object.values(journalEntries) as JournalEntry[])
    .filter((e) => e.content.trim().length > 0)
    .sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#111827] border border-white/15 shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0b0f19]/60">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white">Today&apos;s Reflection & Journal</h2>
              <p className="text-[11px] text-slate-400">
                Autosaved locally in IndexedDB • Private to your device
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-emerald-400 font-medium">✓ Saved locally</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#0b0f19] border border-white/15 text-xs text-white font-mono-tabular focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => handleMoodChange(m.emoji)}
                  title={m.label}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                    mood === m.emoji
                      ? 'bg-indigo-600/30 border-indigo-400 text-white scale-105'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.emoji} <span className="hidden sm:inline text-[10px]">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Write your thoughts, wins, gratitude, or study reflections for today..."
              className="w-full p-4 rounded-xl bg-[#0b0f19]/90 border border-white/15 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
            />
          </div>

          {pastEntries.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recent Reflections ({pastEntries.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-44 overflow-y-auto">
                {pastEntries.slice(0, 6).map((entry) => (
                  <button
                    key={entry.dateStr}
                    type="button"
                    onClick={() => handleDateChange(entry.dateStr)}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      entry.dateStr === selectedDate
                        ? 'bg-indigo-600/20 border-indigo-500/40'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                      <span>
                        {entry.mood || '📓'} {entry.dateStr}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {entry.updatedAt}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2">{entry.content}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SystemTrayBackgroundOverlayProps {
  isMinimizedToTray: boolean;
  onRestoreFromTray: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  onStartFocusTimer: () => void;
  onLockHabitra: () => void;
  completedTodayCount: number;
  totalTodayHabits: number;
  timerRemainingFormatted: string;
  isTimerRunning: boolean;
  showFirstTimeTrayToast: boolean;
  onDismissFirstTimeTrayToast: () => void;
  onDisableMinimizeToTrayPermanently: () => void;
}

export const SystemTrayBackgroundOverlay: React.FC<SystemTrayBackgroundOverlayProps> = ({
  isMinimizedToTray,
  onRestoreFromTray,
  notificationsEnabled,
  onToggleNotifications,
  onStartFocusTimer,
  onLockHabitra,
  completedTodayCount,
  totalTodayHabits,
  timerRemainingFormatted,
  isTimerRunning,
  showFirstTimeTrayToast,
  onDismissFirstTimeTrayToast,
  onDisableMinimizeToTrayPermanently,
}) => {
  const [menuOpen, setMenuOpen] = useState(true);

  if (!isMinimizedToTray) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050811]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 select-none animate-fadeIn">
      {/* Center status card showing Low-Power Background Mode */}
      <div className="max-w-md w-full p-6 rounded-2xl bg-[#111827]/90 border border-white/15 shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto">
          🌱
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300 mb-2">
            ● Running in System Tray (Low-Power Mode)
          </div>
          <h2 className="text-lg font-bold text-white">
            Habitra is Active in the Background
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Heavy pixel animations and UI rendering are paused to save CPU &amp; battery. Your
            real-time notification scheduler and timestamp focus timer continue running
            accurately.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#0b0f19]/80 border border-white/10 text-left">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Today&apos;s Habits
            </div>
            <div className="text-sm font-bold text-white font-mono-tabular mt-0.5">
              {completedTodayCount} / {totalTodayHabits} Completed
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Focus Timer
            </div>
            <div className="text-sm font-bold text-indigo-300 font-mono-tabular mt-0.5">
              {isTimerRunning ? `Running (${timerRemainingFormatted})` : 'Standby'}
            </div>
          </div>
        </div>

        {showFirstTimeTrayToast && (
          <div className="p-3.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-left space-y-2">
            <div className="text-xs font-semibold text-indigo-200">
              💡 Habitra is still running in the background. You&apos;ll continue receiving your
              reminders.
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={onDismissFirstTimeTrayToast}
                className="text-indigo-300 hover:text-white font-medium"
              >
                Got it
              </button>
              <button
                type="button"
                onClick={onDisableMinimizeToTrayPermanently}
                className="text-slate-400 hover:text-rose-300 underline"
              >
                Disable minimize to tray
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onRestoreFromTray}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/30"
        >
          Open Habitra Workspace
        </button>
      </div>

      {/* Simulated Windows System Tray Right-Click Menu at bottom-right */}
      <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2">
        {menuOpen && (
          <div className="w-60 rounded-xl bg-[#111827] border border-white/20 shadow-2xl py-1.5 text-xs text-slate-200 overflow-hidden">
            <div className="px-3.5 py-2 border-b border-white/10 flex items-center justify-between bg-[#0b0f19]/60">
              <span className="font-bold text-white flex items-center gap-1.5">
                🌱 Habitra
              </span>
              <span className="text-[10px] font-mono-tabular text-emerald-400">
                {completedTodayCount}/{totalTodayHabits} Done
              </span>
            </div>

            <button
              type="button"
              onClick={onRestoreFromTray}
              className="w-full px-3.5 py-2 text-left hover:bg-indigo-600/30 flex items-center justify-between"
            >
              <span>Open Habitra</span>
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={onToggleNotifications}
              className="w-full px-3.5 py-2 text-left hover:bg-indigo-600/30 flex items-center justify-between"
            >
              <span>
                {notificationsEnabled ? 'Pause Notifications' : 'Resume Notifications'}
              </span>
              <Bell className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onStartFocusTimer();
                onRestoreFromTray();
              }}
              className="w-full px-3.5 py-2 text-left hover:bg-indigo-600/30 flex items-center justify-between"
            >
              <span>Start Focus Timer</span>
              <Play className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <div className="px-3.5 py-1.5 text-[11px] text-slate-400 border-y border-white/5 bg-white/[0.02]">
              Today&apos;s Progress: {completedTodayCount} / {totalTodayHabits} habits
            </div>

            <button
              type="button"
              onClick={() => {
                onRestoreFromTray();
                onLockHabitra();
              }}
              className="w-full px-3.5 py-2 text-left hover:bg-indigo-600/30 flex items-center justify-between"
            >
              <span>Lock Habitra</span>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={onRestoreFromTray}
              className="w-full px-3.5 py-2 text-left hover:bg-rose-500/20 text-rose-300 flex items-center justify-between border-t border-white/10"
            >
              <span>Quit Background Mode</span>
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111827] border border-emerald-500/40 shadow-xl text-xs font-semibold text-white hover:bg-[#1e293b]"
        >
          <span>🌱 Habitra Tray</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>
    </div>
  );
};
