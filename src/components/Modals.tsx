import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Check,
  Plus,
  Flame,
  Trophy,
  BarChart2,
  Calendar,
  Edit3,
  Archive,
  Trash2,
  Bell,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Minimize2,
  Eye,
  EyeOff,
  Lock,
  Music,
  Palette,
  User,
  Timer,
  Compass,
} from 'lucide-react';
import {
  formatLocalYMD,
  DEFAULT_PRESETS,
  BUILTIN_MUSIC_TRACKS,
  DEFAULT_PLAYLISTS,
  AMBIENT_SOUNDS,
  PIXEL_SCENES,
  STARTER_HABIT_TEMPLATES,
  STARTER_REMINDER_TEMPLATES,
} from '../constants/scenesAndPresets';
import { hashPasswordWithSalt } from '../db/indexedDb';
import {
  AmbientSoundId,
  AnimationIntensity,
  AudioSettings,
  EnvironmentSettings,
  Goal,
  GoalCategory,
  GoalPriority,
  Habit,
  HabitCompletionMap,
  HabitFrequency,
  PixelStyleId,
  Reminder,
  ReminderScheduleType,
  ReminderType,
  SceneId,
  SecuritySettings,
  SpacePreset,
  StyleSettings,
  TimerSettings,
  UserProfile,
} from '../types/app';
import { calculateHabitStreak, isHabitCompleted } from '../utils/habitStats';
import { PixelEnvironmentCanvas } from './PixelEnvironmentCanvas';

const HABIT_ICONS = [
  '📘',
  '🏋️',
  '💧',
  '📖',
  '☕',
  '🌙',
  '🧘',
  '💻',
  '🎨',
  '🎸',
  '🥗',
  '🏃',
  '✍️',
  '🌱',
];
const REMINDER_ICONS = ['💧', '👀', '📚', '🏃', '🧘', '🍎', '🍵', '🌙', '🔔', '🚶'];
const COLOR_SWATCHES = [
  '#6366f1',
  '#38bdf8',
  '#22c55e',
  '#f59e0b',
  '#fb923c',
  '#c084fc',
  '#f43f5e',
  '#14b8a6',
];

interface HabitFormModalProps {
  isOpen: boolean;
  editingHabit: Habit | null;
  allHabits?: Habit[];
  accentColor: string;
  onClose: () => void;
  onSave: (
    habitData: Omit<Habit, 'id' | 'createdAt' | 'order'>,
    existingId?: string
  ) => void;
  onDelete?: (habitId: string) => void;
  onToggleArchive?: (habitId: string) => void;
}

export const HabitFormModal: React.FC<HabitFormModalProps> = ({
  isOpen,
  editingHabit,
  allHabits = [],
  accentColor,
  onClose,
  onSave,
  onDelete,
  onToggleArchive,
}) => {
  const todayStr = formatLocalYMD(new Date());
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📘');
  const [color, setColor] = useState('#38bdf8');
  const [goalDays, setGoalDays] = useState(60);
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [intervalDays, setIntervalDays] = useState(2);
  const [startDate, setStartDate] = useState(todayStr);
  const [targetDate, setTargetDate] = useState('');
  const [reminderTime, setReminderTime] = useState('19:00');
  const [description, setDescription] = useState('');
  const [dependsOnHabitId, setDependsOnHabitId] = useState('');

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setIcon(editingHabit.icon);
      setColor(editingHabit.color);
      setGoalDays(editingHabit.goalDays);
      setFrequency(editingHabit.frequency);
      setCustomDays(editingHabit.customDays || [1, 2, 3, 4, 5]);
      setIntervalDays(editingHabit.intervalDays || 2);
      setStartDate(editingHabit.startDate || todayStr);
      setTargetDate(editingHabit.targetDate || '');
      setReminderTime(editingHabit.reminderTime || '');
      setDescription(editingHabit.description || '');
      setDependsOnHabitId(editingHabit.dependsOnHabitId || '');
    } else {
      setName('');
      setIcon('📘');
      setColor('#38bdf8');
      setGoalDays(60);
      setFrequency('daily');
      setCustomDays([1, 2, 3, 4, 5]);
      setIntervalDays(2);
      setStartDate(todayStr);
      setTargetDate('');
      setReminderTime('19:00');
      setDescription('');
      setDependsOnHabitId('');
    }
  }, [editingHabit, isOpen, todayStr]);

  if (!isOpen) return null;

  const toggleCustomDay = (dow: number) => {
    setCustomDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(
      {
        name: name.trim(),
        icon,
        color,
        goalDays: Math.max(1, Number(goalDays) || 30),
        frequency,
        customDays: frequency === 'custom' ? customDays : undefined,
        intervalDays: frequency === 'interval' ? intervalDays : undefined,
        startDate,
        targetDate: targetDate || undefined,
        reminderTime: reminderTime || undefined,
        description: description.trim() || undefined,
        dependsOnHabitId: dependsOnHabitId || undefined,
        archived: editingHabit?.archived || false,
      },
      editingHabit?.id
    );
    onClose();
  };

  const dayLabels = [
    { dow: 1, label: 'Mon' },
    { dow: 2, label: 'Tue' },
    { dow: 3, label: 'Wed' },
    { dow: 4, label: 'Thu' },
    { dow: 5, label: 'Fri' },
    { dow: 6, label: 'Sat' },
    { dow: 0, label: 'Sun' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-[#111827] border border-slate-700/80 p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">
            {editingHabit ? 'Edit Habit' : 'Create New Habit'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Study Java, Morning Run, Read 20 Pages"
              required
              autoFocus
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {HABIT_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                      icon === ic
                        ? 'bg-indigo-500/30 border border-indigo-400 scale-105'
                        : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Accent Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw}
                    type="button"
                    onClick={() => setColor(sw)}
                    className={`w-7 h-7 rounded-lg transition-transform cursor-pointer flex items-center justify-center ${
                      color === sw
                        ? 'scale-110 ring-2 ring-white'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: sw }}
                  >
                    {color === sw && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Goal Target (Days)
              </label>
              <input
                type="number"
                min={1}
                max={3650}
                value={goalDays}
                onChange={(e) => setGoalDays(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono-tabular focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays (Mon–Fri)</option>
                <option value="weekends">Weekends (Sat–Sun)</option>
                <option value="custom">Custom Days</option>
                <option value="interval">Specific Interval</option>
              </select>
            </div>
          </div>

          {frequency === 'custom' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Select Active Days
              </label>
              <div className="flex gap-1.5">
                {dayLabels.map((d) => (
                  <button
                    key={d.dow}
                    type="button"
                    onClick={() => toggleCustomDay(d.dow)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      customDays.includes(d.dow)
                        ? 'bg-indigo-600 text-white border-indigo-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {frequency === 'interval' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Repeat Every N Days
              </label>
              <input
                type="number"
                min={2}
                max={30}
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono-tabular"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                End / Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Reminder
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional motivation or instructions..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Habit Dependency (Unlocked After)
              </label>
              <select
                value={dependsOnHabitId}
                onChange={(e) => setDependsOnHabitId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">None (Always Unlocked)</option>
                {allHabits
                  .filter((h) => !h.archived && h.id !== editingHabit?.id)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.icon} {h.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              {editingHabit && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(editingHabit.id);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              )}
              {editingHabit && onToggleArchive && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleArchive(editingHabit.id);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 transition-colors cursor-pointer"
                >
                  {editingHabit.archived ? 'Restore Habit' : 'Archive'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                {editingHabit ? 'Save Changes' : 'Create Habit'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface HabitDetailModalProps {
  habit: Habit | null;
  completions: HabitCompletionMap;
  accentColor: string;
  onClose: () => void;
  onToggleCompletion: (habitId: string, dateStr: string) => void;
  onEdit: (habit: Habit) => void;
  onToggleArchive: (habitId: string) => void;
  onDelete: (habitId: string) => void;
}

export const HabitDetailModal: React.FC<HabitDetailModalProps> = ({
  habit,
  completions,
  accentColor,
  onClose,
  onToggleCompletion,
  onEdit,
  onToggleArchive,
  onDelete,
}) => {
  if (!habit) return null;

  const stats = calculateHabitStreak(habit, completions, new Date());

  // Build 16 weeks (112 days) GitHub-style pixel contribution heatmap ending today
  const totalDays = 112; // 16 columns x 7 rows
  const today = new Date();
  const heatmapDays: { dateStr: string; label: string; done: boolean }[] = [];

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = formatLocalYMD(d);
    heatmapDays.push({
      dateStr: dStr,
      label: d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      done: isHabitCompleted(completions, habit.id, dStr),
    });
  }

  // Group into weeks of 7 days
  const weeks: typeof heatmapDays[] = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    weeks.push(heatmapDays.slice(i, i + 7));
  }

  const goalPct = Math.min(
    100,
    Math.round((stats.totalCompletedDays / Math.max(1, habit.goalDays)) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-[#111827] border border-slate-700/80 p-6 shadow-2xl my-auto">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{
                backgroundColor: `${habit.color}20`,
                border: `1px solid ${habit.color}50`,
              }}
            >
              {habit.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{habit.name}</h3>
                {habit.archived && (
                  <span className="text-xs text-amber-400">· Archived</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {habit.description || 'Consistent daily habit tracking'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1.5 font-mono-tabular">
                <span className="capitalize">{habit.frequency}</span>
                <span>·</span>
                <span>Start: {habit.startDate}</span>
                {habit.targetDate && (
                  <>
                    <span>·</span>
                    <span>Target: {habit.targetDate}</span>
                  </>
                )}
                {habit.reminderTime && (
                  <>
                    <span>·</span>
                    <span>⏰ {habit.reminderTime}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Key Streak & Completion Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Current Streak</span>
            </div>
            <div className="text-lg font-bold text-amber-400 font-mono-tabular">
              {stats.currentStreak} days
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>Best Streak</span>
            </div>
            <div className="text-lg font-bold text-white font-mono-tabular">
              {stats.longestStreak} days
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completion</span>
            </div>
            <div className="text-lg font-bold text-emerald-400 font-mono-tabular">
              {stats.completionRate30d}%
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Total Done</span>
            </div>
            <div className="text-lg font-bold text-sky-400 font-mono-tabular">
              {stats.totalCompletedDays} days
            </div>
          </div>
        </div>

        {/* Goal Target Progress Bar */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-300">
              Goal Progress ({stats.totalCompletedDays} / {habit.goalDays} days)
            </span>
            <span className="font-mono-tabular text-white font-semibold">
              {goalPct}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${goalPct}%`, backgroundColor: habit.color }}
            />
          </div>
        </div>

        {/* GitHub-Style Contribution Heatmap */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-300">
              Completion Heatmap (Last 16 Weeks · Click any day to toggle)
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span>Missed</span>
              <span className="w-3 h-3 rounded-sm bg-slate-900 border border-slate-800 inline-block" />
              <span
                className="w-3 h-3 rounded-sm inline-block"
                style={{ backgroundColor: habit.color }}
              />
              <span>Completed</span>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 justify-between">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day) => (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => onToggleCompletion(habit.id, day.dateStr)}
                    title={`${day.label}: ${day.done ? 'Completed ✓' : 'Not completed'}`}
                    className={`w-4 h-4 rounded-sm transition-transform hover:scale-125 cursor-pointer ${
                      day.done
                        ? 'shadow-sm'
                        : 'bg-slate-900 border border-slate-800/80 hover:border-slate-600'
                    }`}
                    style={
                      day.done ? { backgroundColor: habit.color } : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(habit);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Habit</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleArchive(habit.id);
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{habit.archived ? 'Restore' : 'Archive'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDelete(habit.id);
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-medium text-rose-400 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white cursor-pointer"
            style={{ backgroundColor: accentColor }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface GoalFormModalProps {
  isOpen: boolean;
  editingGoal: Goal | null;
  habits: Habit[];
  accentColor: string;
  onClose: () => void;
  onSave: (goalData: Omit<Goal, 'id'>, existingId?: string) => void;
  onDelete?: (goalId: string) => void;
  onToggleArchive?: (goalId: string) => void;
}

export const GoalFormModal: React.FC<GoalFormModalProps> = ({
  isOpen,
  editingGoal,
  habits,
  accentColor,
  onClose,
  onSave,
  onDelete,
  onToggleArchive,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('long-term');
  const [deadline, setDeadline] = useState('2026-12-31');
  const [priority, setPriority] = useState<GoalPriority>('high');
  const [progress, setProgress] = useState(50);
  const [autoProgressFromHabits, setAutoProgressFromHabits] = useState(false);
  const [relatedHabitIds, setRelatedHabitIds] = useState<string[]>([]);
  const [color, setColor] = useState('#22c55e');
  const [starred, setStarred] = useState(true);
  const [icon, setIcon] = useState('🚀');

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description);
      setCategory(editingGoal.category);
      setDeadline(editingGoal.deadline);
      setPriority(editingGoal.priority);
      setProgress(editingGoal.progress);
      setAutoProgressFromHabits(Boolean(editingGoal.autoProgressFromHabits));
      setRelatedHabitIds(editingGoal.relatedHabitIds || []);
      setColor(editingGoal.color);
      setStarred(editingGoal.starred);
      setIcon(editingGoal.icon || '🚀');
    } else {
      setTitle('');
      setDescription('');
      setCategory('long-term');
      setDeadline('2026-12-31');
      setPriority('high');
      setProgress(0);
      setAutoProgressFromHabits(false);
      setRelatedHabitIds([]);
      setColor('#22c55e');
      setStarred(true);
      setIcon('🚀');
    }
  }, [editingGoal, isOpen]);

  if (!isOpen) return null;

  const toggleRelatedHabit = (id: string) => {
    setRelatedHabitIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        category,
        deadline,
        priority,
        progress: Math.min(100, Math.max(0, Number(progress))),
        autoProgressFromHabits,
        relatedHabitIds,
        color,
        starred,
        icon,
        archived: editingGoal?.archived || false,
      },
      editingGoal?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-[#111827] border border-slate-700/80 p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">
            {editingGoal ? 'Edit Goal' : 'Create New Goal'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Goal Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Complete Java Preparation"
              required
              autoFocus
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Horizon</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="daily">Daily Goal</option>
                <option value="weekly">Weekly Goal</option>
                <option value="monthly">Monthly Goal</option>
                <option value="long-term">Long-Term Goal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as GoalPriority)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono-tabular"
              />
            </div>
          </div>

          {/* Progress Mode: Manual or Automatic from Linked Habits */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
            <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
              <span>Auto-calculate progress from linked habits</span>
              <input
                type="checkbox"
                checked={autoProgressFromHabits}
                onChange={(e) => setAutoProgressFromHabits(e.target.checked)}
                className="accent-indigo-500"
              />
            </label>

            {!autoProgressFromHabits && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Manual Progress</span>
                  <span className="font-mono-tabular text-white font-semibold">
                    {progress}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Bar Color
            </label>
            <div className="flex gap-2">
              {COLOR_SWATCHES.map((sw) => (
                <button
                  key={sw}
                  type="button"
                  onClick={() => setColor(sw)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer ${
                    color === sw ? 'ring-2 ring-white scale-105' : 'opacity-75'
                  }`}
                  style={{ backgroundColor: sw }}
                >
                  {color === sw && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {habits.length > 0 && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Related Habits
              </label>
              <div className="flex flex-wrap gap-1.5">
                {habits.map((h) => {
                  const selected = relatedHabitIds.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleRelatedHabit(h.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-indigo-500/25 border-indigo-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {h.icon} {h.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Milestone details..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              {editingGoal && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(editingGoal.id);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 cursor-pointer"
                >
                  Delete
                </button>
              )}
              {editingGoal && onToggleArchive && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleArchive(editingGoal.id);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 cursor-pointer"
                >
                  {editingGoal.archived ? 'Restore' : 'Archive'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-medium text-white cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                {editingGoal ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ReminderFormModalProps {
  isOpen: boolean;
  editingReminder?: Reminder | null;
  accentColor: string;
  onClose: () => void;
  onSave: (
    rem: Omit<Reminder, 'id' | 'completedTodayCount'>,
    existingId?: string
  ) => void;
  onDelete?: (id: string) => void;
}

export const ReminderFormModal: React.FC<ReminderFormModalProps> = ({
  isOpen,
  editingReminder,
  accentColor,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('Drink Water');
  const [type, setType] = useState<ReminderType>('water');
  const [scheduleType, setScheduleType] =
    useState<ReminderScheduleType>('interval');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [timeOfDay, setTimeOfDay] = useState('19:00');
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]);
  const [icon, setIcon] = useState('💧');
  const [color, setColor] = useState('#38bdf8');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (editingReminder) {
      setTitle(editingReminder.title);
      setType(editingReminder.type);
      setScheduleType(editingReminder.scheduleType);
      setIntervalMinutes(editingReminder.intervalMinutes || 60);
      setTimeOfDay(editingReminder.timeOfDay || '19:00');
      setCustomDays(editingReminder.customDays || [1, 3, 5]);
      setIcon(editingReminder.icon || '💧');
      setColor(editingReminder.color || '#38bdf8');
      setSoundEnabled(editingReminder.soundEnabled !== false);
      setEnabled(editingReminder.enabled);
    } else {
      setTitle('Drink Water');
      setType('water');
      setScheduleType('interval');
      setIntervalMinutes(60);
      setTimeOfDay('19:00');
      setCustomDays([1, 3, 5]);
      setIcon('💧');
      setColor('#38bdf8');
      setSoundEnabled(true);
      setEnabled(true);
    }
  }, [isOpen, editingReminder]);

  if (!isOpen) return null;

  const toggleCustomDay = (dow: number) => {
    setCustomDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]
    );
  };

  const handleTypePreset = (nextType: ReminderType) => {
    setType(nextType);
    const map: Record<
      ReminderType,
      { title: string; icon: string; color: string; schedule: ReminderScheduleType }
    > = {
      water: {
        title: 'Drink Water',
        icon: '💧',
        color: '#38bdf8',
        schedule: 'interval',
      },
      eye: {
        title: 'Eye Break',
        icon: '👀',
        color: '#60a5fa',
        schedule: 'interval',
      },
      stretch: {
        title: 'Stretch Break',
        icon: '🧘',
        color: '#34d399',
        schedule: 'interval',
      },
      walk: {
        title: 'Short Walk',
        icon: '🚶',
        color: '#a78bfa',
        schedule: 'interval',
      },
      snack: {
        title: 'Healthy Snack',
        icon: '🍎',
        color: '#fb923c',
        schedule: 'interval',
      },
      rest: {
        title: 'Mindful Rest',
        icon: '🍵',
        color: '#facc15',
        schedule: 'interval',
      },
      study: {
        title: 'Study Session',
        icon: '📚',
        color: '#818cf8',
        schedule: 'daily',
      },
      exercise: {
        title: 'Exercise Habit',
        icon: '🏃',
        color: '#22c55e',
        schedule: 'daily',
      },
      sleep: {
        title: 'Sleep Early',
        icon: '🌙',
        color: '#c084fc',
        schedule: 'daily',
      },
      custom: {
        title: title || 'Custom Reminder',
        icon: '🔔',
        color: '#6366f1',
        schedule: 'daily',
      },
    };
    const preset = map[nextType];
    setTitle(preset.title);
    setIcon(preset.icon);
    setColor(preset.color);
    setScheduleType(preset.schedule);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(
      {
        title: title.trim(),
        type,
        scheduleType,
        intervalMinutes:
          scheduleType === 'interval' ? intervalMinutes : undefined,
        timeOfDay: scheduleType !== 'interval' ? timeOfDay : undefined,
        customDays: scheduleType === 'custom' ? customDays : undefined,
        enabled,
        soundEnabled,
        icon,
        color,
      },
      editingReminder?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#111827] border border-slate-700/80 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">
            {editingReminder ? 'Edit Reminder' : 'Create Reminder'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Quick Templates
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  'water',
                  'eye',
                  'study',
                  'stretch',
                  'walk',
                  'snack',
                  'rest',
                  'sleep',
                  'custom',
                ] as ReminderType[]
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypePreset(t)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs capitalize border transition-colors cursor-pointer ${
                    type === t
                      ? 'bg-indigo-600/30 border-indigo-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Reminder Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Drink Water, Study, Exercise"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer ${
                    icon === ic
                      ? 'bg-indigo-500/30 border border-indigo-400'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Repeat</label>
              <select
                value={scheduleType}
                onChange={(e) =>
                  setScheduleType(e.target.value as ReminderScheduleType)
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="interval">Every X Minutes (Interval)</option>
                <option value="daily">Daily at Specific Time</option>
                <option value="weekly">Weekly</option>
                <option value="weekdays">Weekdays Only (Mon–Fri)</option>
                <option value="weekends">Weekends Only (Sat–Sun)</option>
                <option value="custom">Custom Days (Mon/Wed/Fri)</option>
                <option value="once">One-Time Reminder</option>
              </select>
            </div>

            {scheduleType === 'interval' ? (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Every (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={360}
                  value={intervalMinutes}
                  onChange={(e) =>
                    setIntervalMinutes(Math.max(5, Number(e.target.value)))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono-tabular"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Time</label>
                <input
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono-tabular"
                />
              </div>
            )}
          </div>

          {scheduleType === 'custom' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Custom Days
              </label>
              <div className="flex gap-1.5">
                {[
                  { dow: 1, label: 'Mon' },
                  { dow: 2, label: 'Tue' },
                  { dow: 3, label: 'Wed' },
                  { dow: 4, label: 'Thu' },
                  { dow: 5, label: 'Fri' },
                  { dow: 6, label: 'Sat' },
                  { dow: 0, label: 'Sun' },
                ].map((d) => (
                  <button
                    key={d.dow}
                    type="button"
                    onClick={() => toggleCustomDay(d.dow)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      customDays.includes(d.dow)
                        ? 'bg-indigo-600 text-white border-indigo-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
              <span>Chime Sound</span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="accent-indigo-500"
              />
            </label>
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-indigo-500"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {editingReminder && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(editingReminder.id);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 cursor-pointer"
              >
                Delete
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-medium text-white cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                {editingReminder ? 'Save Changes' : 'Save Reminder'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface WelcomeWizardModalProps {
  isOpen: boolean;
  userName: string;
  accentColor: string;
  timerSettings: TimerSettings;
  audioSettings?: AudioSettings;
  profileSettings?: UserProfile;
  environmentSettings?: EnvironmentSettings;
  styleSettings?: StyleSettings;
  notificationPermission: NotificationPermission | 'unsupported';
  onClose: () => void;
  onExploreHabitra?: () => void;
  onSelectPreset: (preset: SpacePreset) => void;
  onUpdateUserName: (name: string) => void;
  onUpdateTimerSettings: (patch: Partial<TimerSettings>) => void;
  onUpdateAudioSettings?: (patch: Partial<AudioSettings>) => void;
  onUpdateProfileSettings?: (patch: Partial<UserProfile>) => void;
  onUpdateEnvironmentSettings?: (patch: Partial<EnvironmentSettings>) => void;
  onUpdateStyleSettings?: (patch: Partial<StyleSettings>) => void;
  onUpdateSecuritySettings?: (patch: Partial<SecuritySettings>) => void;
  onQuickAddHabit: (name: string, icon: string, goalDays: number, color?: string, description?: string) => void;
  onQuickAddReminder?: (reminderData: Omit<Reminder, 'id' | 'completedTodayCount'>) => void;
  onRequestNotificationPermission: () => void;
}

const INSPIRATION_QUOTES = [
  'Small Habits. Big Life.',
  'Consistency crafts the sanctuary.',
  'Quiet focus compounds every single day.',
  'Discipline today creates the life you want tomorrow.',
];

export const WelcomeWizardModal: React.FC<WelcomeWizardModalProps> = ({
  isOpen,
  userName,
  accentColor,
  timerSettings,
  audioSettings,
  profileSettings,
  environmentSettings,
  styleSettings,
  notificationPermission,
  onClose,
  onExploreHabitra,
  onSelectPreset,
  onUpdateUserName,
  onUpdateTimerSettings,
  onUpdateAudioSettings,
  onUpdateProfileSettings,
  onUpdateEnvironmentSettings,
  onUpdateStyleSettings,
  onUpdateSecuritySettings,
  onQuickAddHabit,
  onQuickAddReminder,
  onRequestNotificationPermission,
}) => {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);

  // Step 1: Profile state
  const [nameInput, setNameInput] = useState(userName || '');
  const [quoteInput, setQuoteInput] = useState(
    profileSettings?.quote || 'Small Habits. Big Life.'
  );

  // Step 2: Appearance state
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESETS[0].id);
  const [selectedSceneId, setSelectedSceneId] = useState<SceneId>(
    environmentSettings?.sceneId || 'living_sanctuary'
  );
  const [selectedThemeStyle, setSelectedThemeStyle] = useState<PixelStyleId>(
    styleSettings?.pixelStyle || 'cozy'
  );
  const [selectedAccent, setSelectedAccent] = useState<string>(
    styleSettings?.accentColor || accentColor || '#6366f1'
  );
  const [animIntensity, setAnimIntensity] = useState<AnimationIntensity>(
    environmentSettings?.animationIntensity || 'high'
  );
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (styleSettings?.reducedMotion !== undefined) {
      return styleSettings.reducedMotion;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Step 3: Music state
  const [musicSourceTab, setMusicSourceTab] = useState<'tracks' | 'playlists' | 'silent'>('tracks');
  const [selectedTrackId, setSelectedTrackId] = useState(
    audioSettings?.currentTrackId || 'bundled_velvet_rain_lofi'
  );
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    audioSettings?.activePlaylistId || null
  );
  const [selectedAmbientId, setSelectedAmbientId] = useState<AmbientSoundId>(
    audioSettings?.ambientSoundId || 'rain'
  );
  const [musicVol, setMusicVol] = useState(audioSettings?.musicVolume ?? 40);
  const [ambientVol, setAmbientVol] = useState(audioSettings?.ambientVolume ?? 65);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Step 4: Productivity state
  const [focusMins, setFocusMins] = useState(timerSettings.focusMinutes);
  const [shortBreakMins, setShortBreakMins] = useState(
    timerSettings.shortBreakMinutes
  );
  const [cycles, setCycles] = useState(timerSettings.totalCycles || 4);
  const [enableReminders, setEnableReminders] = useState(
    profileSettings?.notificationsEnabled !== false
  );
  const [waterGoal, setWaterGoal] = useState(profileSettings?.waterDailyGoal ?? 8);
  const [selectedStarterReminderIds, setSelectedStarterReminderIds] = useState<string[]>([]);
  const [selectedStarterHabitIds, setSelectedStarterHabitIds] = useState<string[]>([]);
  const [customHabitsQueue, setCustomHabitsQueue] = useState<
    { id: string; name: string; icon: string; goalDays: number }[]
  >([]);
  const [firstHabitInput, setFirstHabitInput] = useState('');
  const [firstHabitIcon, setFirstHabitIcon] = useState('📘');
  const [firstHabitGoal, setFirstHabitGoal] = useState(30);

  // Step 5: Security state
  const [enablePasswordLock, setEnablePasswordLock] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [setupAutoLockMins, setSetupAutoLockMins] = useState(0);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setNameInput(userName || '');
      setQuoteInput(profileSettings?.quote || 'Small Habits. Big Life.');
      setSelectedSceneId(environmentSettings?.sceneId || 'living_sanctuary');
      setSelectedThemeStyle(styleSettings?.pixelStyle || 'cozy');
      setSelectedAccent(styleSettings?.accentColor || accentColor || '#6366f1');
      setAnimIntensity(environmentSettings?.animationIntensity || 'high');
      setFocusMins(timerSettings.focusMinutes);
      setShortBreakMins(timerSettings.shortBreakMinutes);
      setCycles(timerSettings.totalCycles || 4);
      setSelectedTrackId(
        audioSettings?.currentTrackId || 'bundled_velvet_rain_lofi'
      );
      setSelectedAmbientId(audioSettings?.ambientSoundId || 'rain');
      setMusicVol(audioSettings?.musicVolume ?? 40);
      setAmbientVol(audioSettings?.ambientVolume ?? 65);
      setWaterGoal(profileSettings?.waterDailyGoal ?? 8);
      setSelectedStarterHabitIds([]);
      setSelectedStarterReminderIds([]);
      setCustomHabitsQueue([]);
      setEnablePasswordLock(false);
      setSetupPassword('');
      setSetupPasswordConfirm('');
      setPasswordError('');
      setIsPreviewPlaying(Boolean(audioSettings?.isPlaying));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleReducedMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    if (onUpdateStyleSettings) {
      onUpdateStyleSettings({
        reducedMotion: next,
        animationSpeed: next ? 'off' : animIntensity,
      });
    }
  };

  const applyStep1Profile = () => {
    const cleanName = nameInput.trim();
    const cleanQuote = quoteInput.trim() || 'Small Habits. Big Life.';
    onUpdateUserName(cleanName);
    if (onUpdateProfileSettings) {
      onUpdateProfileSettings({
        userName: cleanName,
        userNameConfigured: cleanName.length > 0,
        quote: cleanQuote,
      });
    }
  };

  const applyStep2Appearance = () => {
    if (onUpdateEnvironmentSettings) {
      const sceneObj =
        PIXEL_SCENES.find((s) => s.id === selectedSceneId) || PIXEL_SCENES[0];
      onUpdateEnvironmentSettings({
        sceneId: selectedSceneId,
        weather: sceneObj.defaultWeather,
        timeOfDay: sceneObj.defaultTime,
        animationIntensity: animIntensity,
      });
    }
    if (onUpdateStyleSettings) {
      onUpdateStyleSettings({
        pixelStyle: selectedThemeStyle,
        accentColor: selectedAccent,
        reducedMotion,
        animationSpeed: reducedMotion ? 'off' : animIntensity,
      });
    }
  };

  const applyStep3Music = () => {
    if (!onUpdateAudioSettings) return;
    if (musicSourceTab === 'silent') {
      onUpdateAudioSettings({
        currentTrackId: 'silent',
        isPlaying: false,
        ambientPlaying: false,
        musicVolume: musicVol,
        ambientVolume: ambientVol,
      });
      return;
    }
    onUpdateAudioSettings({
      currentTrackId: selectedTrackId,
      activePlaylistId: selectedPlaylistId,
      ambientSoundId: selectedAmbientId,
      musicVolume: musicVol,
      ambientVolume: ambientVol,
    });
  };

  const applyStep4Productivity = () => {
    onUpdateTimerSettings({
      focusMinutes: Math.max(1, focusMins),
      shortBreakMinutes: Math.max(1, shortBreakMins),
      totalCycles: Math.max(1, cycles),
      currentCycle: 1,
    });
    if (onUpdateProfileSettings) {
      onUpdateProfileSettings({
        notificationsEnabled: enableReminders,
        waterDailyGoal: Math.max(1, waterGoal),
      });
    }
    // Add any opt-in starter habits chosen by the user
    selectedStarterHabitIds.forEach((tplId) => {
      const tpl = STARTER_HABIT_TEMPLATES.find((t) => t.id === tplId);
      if (tpl) {
        onQuickAddHabit(
          tpl.name,
          tpl.icon,
          tpl.goalDays,
          tpl.color,
          tpl.description
        );
      }
    });
    // Add any custom habits queued by the user
    customHabitsQueue.forEach((ch) => {
      onQuickAddHabit(ch.name, ch.icon, ch.goalDays);
    });
    // Also add if the user typed into the custom habit input without clicking "+ Add"
    if (firstHabitInput.trim()) {
      onQuickAddHabit(
        firstHabitInput.trim(),
        firstHabitIcon,
        Math.max(1, firstHabitGoal)
      );
      setFirstHabitInput('');
    }
    // Add any opt-in starter reminders chosen by the user
    if (onQuickAddReminder) {
      selectedStarterReminderIds.forEach((remId) => {
        const tpl = STARTER_REMINDER_TEMPLATES.find((r) => r.id === remId);
        if (tpl) {
          onQuickAddReminder({
            title: tpl.title,
            type: tpl.type,
            scheduleType: tpl.scheduleType,
            intervalMinutes: tpl.intervalMinutes,
            timeOfDay: tpl.timeOfDay,
            enabled: true,
            soundEnabled: true,
            icon: tpl.icon,
            color: tpl.color,
          });
        }
      });
    }
  };

  const handleFinishWithOptionalPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (enablePasswordLock || setupPassword.trim()) {
      if (setupPassword.length < 4) {
        setPasswordError('Password must be at least 4 characters.');
        return;
      }
      if (setupPassword !== setupPasswordConfirm) {
        setPasswordError('Passwords do not match.');
        return;
      }
      if (onUpdateSecuritySettings) {
        const { hash, salt } = await hashPasswordWithSalt(setupPassword);
        onUpdateSecuritySettings({
          passwordHash: hash,
          salt,
          autoLockMinutes: setupAutoLockMins,
          isLocked: false,
        });
      }
    }
    onClose();
  };

  const previewEnv: EnvironmentSettings = {
    sceneId: selectedSceneId,
    timeOfDay: environmentSettings?.timeOfDay || 'night',
    weather: environmentSettings?.weather || 'clear',
    lightingWarmth: environmentSettings?.lightingWarmth ?? 78,
    animationIntensity: animIntensity,
    particlesDensity: reducedMotion ? 0 : 75,
    uiTransparency: 76,
    uiPosition: 'standard',
    minimalMode: false,
    showProgressGardenObjects: false,
    showWorldHotspots: false,
    worldViewMode: 'living_world',
  };

  const previewStyle: StyleSettings = {
    pixelStyle: selectedThemeStyle,
    pixelDensity: styleSettings?.pixelDensity ?? 2,
    uiScale: 100,
    borderStyle: 'soft',
    panelStyle: 'glass',
    cornerRadius: 12,
    fontFamily: 'sans',
    accentColor: selectedAccent,
    bgOpacity: 85,
    panelOpacity: 80,
    animationSpeed: reducedMotion ? 'off' : animIntensity,
    glowEffects: true,
    screenEffects: false,
    highContrast: false,
    reducedMotion,
  };

  const availableTracks = BUILTIN_MUSIC_TRACKS.filter((t) => t.id !== 'silent');

  const stepsMeta: { id: 1 | 2 | 3 | 4 | 5; label: string }[] = [
    { id: 1, label: '1. Profile' },
    { id: 2, label: '2. Appearance' },
    { id: 3, label: '3. Music' },
    { id: 4, label: '4. Productivity' },
    { id: 5, label: '5. Security' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#090d16] overflow-y-auto select-none">
      {/* Live Atmospheric Pixel-Art Fantasy World Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <PixelEnvironmentCanvas
          environment={previewEnv}
          styleSettings={previewStyle}
          isFocusTimerRunning={false}
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090d16]/95 via-[#090d16]/65 to-[#090d16]/80" />
      </div>

      {/* Top Navigation & Accessibility Bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-lg shadow">
            🏝️
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight">
              Habitra
            </div>
            <div className="text-[11px] text-teal-300 font-medium">
              Small Habits. Big Life.
            </div>
          </div>
        </div>

        {/* Step Pills when inside Wizard */}
        {step > 0 && (
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-950/85 border border-slate-800/90 backdrop-blur-md">
            {stepsMeta.map((s) => {
              const active = step === s.id;
              const completed = step > s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-white border border-slate-600'
                      : completed
                      ? 'text-teal-300 hover:text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleReducedMotion}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              reducedMotion
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Toggle reduced motion and pause background particle animations"
          >
            {reducedMotion ? 'Reduced Motion: On' : 'Reduced Motion: Off'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            Skip Setup
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 my-auto py-6">
        {/* SCREEN 0: CINEMATIC WELCOME EXPERIENCE */}
        {step === 0 && (
          <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-700/80 backdrop-blur-xl p-6 sm:p-9 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/90">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Living Pixel-Art Sanctuary · 100% Local &amp; Offline</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Habitra —{' '}
                  <span className="text-teal-300">Small Habits. Big Life.</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Welcome to a living fantasy workspace that evolves as you build
                  better daily rituals. Everything stays privately on your device
                  with zero cloud accounts, zero subscriptions, and instant local
                  autosave.
                </p>
              </div>

              {/* Interactive Background Realm Preview Switcher */}
              <div className="p-3 rounded-xl bg-slate-950/85 border border-slate-800/90 shrink-0 space-y-1.5">
                <div className="text-[11px] font-medium text-slate-400">
                  Preview Sanctuary Realm:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PIXEL_SCENES.slice(0, 4).map((sc) => {
                    const active = selectedSceneId === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          setSelectedSceneId(sc.id);
                          if (onUpdateEnvironmentSettings) {
                            onUpdateEnvironmentSettings({
                              sceneId: sc.id,
                              weather: sc.defaultWeather,
                              timeOfDay: sc.defaultTime,
                            });
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-left transition-colors cursor-pointer truncate ${
                          active
                            ? 'bg-teal-500/25 border border-teal-400/50 text-teal-200'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {sc.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4 Core Pillars Introduction */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-950/75 border border-slate-800/90 space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>🌿</span>
                  <span>Living Habits &amp; Botanical Garden</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Each habit cultivates a living sprout on your terrace. Completing
                  daily habits nourishes your garden into luminescent spirit trees
                  and awakens the bioluminescent river.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/75 border border-slate-800/90 space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>⏱️</span>
                  <span>Deep Focus &amp; Mindful Reminders</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Run zero-drift Pomodoro focus sessions that dim the room lighting
                  for deep work, paired with gentle hydration and posture reminders.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/75 border border-slate-800/90 space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>🎶</span>
                  <span>Local Music Library &amp; Soundscapes</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Listen to bundled CC0 tracks, curated study playlists, live
                  procedural synths, and layered rain or fireplace ambience—or
                  import your own local music folders.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/75 border border-slate-800/90 space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>🔒</span>
                  <span>Personal Progress &amp; Local Security</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Inspect 16-week heatmaps, unlock sanctuary relics, export JSON
                  backups anytime, and optionally lock your workspace with a local
                  SHA-256 salted password.
                </p>
              </div>
            </div>

            {/* Primary Welcome Action Bar: Get Started / Explore Habitra / Skip Setup */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800/90">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Skip Setup
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (onExploreHabitra) {
                      onExploreHabitra();
                    } else {
                      onClose();
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-teal-300" />
                  <span>Explore Habitra</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-opacity hover:opacity-95 cursor-pointer"
                  style={{ backgroundColor: selectedAccent }}
                >
                  Get Started →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: PROFILE (Display Name & Motivational Quote) */}
        {step === 1 && (
          <div className="rounded-2xl bg-[#0f172a]/92 border border-slate-700/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div>
              <div className="text-xs font-semibold text-teal-300 mb-1">
                Step 1 of 5 · Profile
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Personalize Your Sanctuary Identity
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Set your optional display name and daily guiding quote. You can
                skip this step or change these anytime in Settings.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g., Alex"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Personal Motivational Quote (Optional)
                </label>
                <input
                  type="text"
                  value={quoteInput}
                  onChange={(e) => setQuoteInput(e.target.value)}
                  placeholder="Small Habits. Big Life."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {INSPIRATION_QUOTES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuoteInput(q)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors cursor-pointer ${
                        quoteInput === q
                          ? 'bg-teal-500/20 border-teal-400/50 text-teal-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      “{q}”
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/90">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Skip Step
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyStep1Profile();
                    setStep(2);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: selectedAccent }}
                >
                  Next: Appearance →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: APPEARANCE (Theme, Starting Environment, Animation Intensity) */}
        {step === 2 && (
          <div className="rounded-2xl bg-[#0f172a]/92 border border-slate-700/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div>
              <div className="text-xs font-semibold text-teal-300 mb-1">
                Step 2 of 5 · Appearance
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Theme, Starting Realm &amp; Motion
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose your visual theme, starting pixel-art environment, and
                animation intensity. The background updates live as you choose.
              </p>
            </div>

            {/* Starting Environment Grid */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Starting Pixel-Art Environment
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {PIXEL_SCENES.slice(0, 8).map((sc) => {
                  const active = selectedSceneId === sc.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => {
                        setSelectedSceneId(sc.id);
                        if (onUpdateEnvironmentSettings) {
                          onUpdateEnvironmentSettings({
                            sceneId: sc.id,
                            weather: sc.defaultWeather,
                            timeOfDay: sc.defaultTime,
                          });
                        }
                      }}
                      className={`group relative rounded-xl overflow-hidden border text-left h-24 p-2.5 flex flex-col justify-end transition-all cursor-pointer ${
                        active
                          ? 'border-teal-400 ring-2 ring-teal-400/30'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {sc.imageUrl ? (
                        <img
                          src={sc.imageUrl}
                          alt={sc.name}
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(135deg, ${sc.skyGradient[0]}, ${sc.skyGradient[1]})`,
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-white truncate">
                          {sc.name}
                        </div>
                        <div className="text-[10px] text-slate-300 truncate">
                          {sc.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Style & Accent Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Visual Theme Style
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'cozy', label: 'Cozy Warm' },
                      { id: 'classic', label: '16-Bit Pixel' },
                      { id: 'dark', label: 'Deep Night' },
                      { id: 'soft', label: 'Soft Dusk' },
                      { id: 'cyber', label: 'Astral Neon' },
                      { id: 'minimal', label: 'Minimal' },
                    ] as { id: PixelStyleId; label: string }[]
                  ).map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setSelectedThemeStyle(th.id)}
                      className={`px-2.5 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                        selectedThemeStyle === th.id
                          ? 'bg-teal-500/20 border-teal-400 text-white'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Accent Color &amp; Animation Intensity
                </label>
                <div className="flex items-center gap-2 mb-3">
                  {COLOR_SWATCHES.map((sw) => (
                    <button
                      key={sw}
                      type="button"
                      onClick={() => setSelectedAccent(sw)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer ${
                        selectedAccent === sw
                          ? 'ring-2 ring-white scale-105'
                          : 'opacity-75'
                      }`}
                      style={{ backgroundColor: sw }}
                    >
                      {selectedAccent === sw && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'low', label: 'Low' },
                      { id: 'medium', label: 'Medium' },
                      { id: 'high', label: 'High' },
                    ] as { id: AnimationIntensity; label: string }[]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setReducedMotion(false);
                        setAnimIntensity(item.id);
                      }}
                      className={`py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                        !reducedMotion && animIntensity === item.id
                          ? 'bg-teal-500/25 border-teal-400 text-white'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setReducedMotion(true)}
                    className={`py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                      reducedMotion
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400'
                    }`}
                  >
                    Off
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/90">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Skip Step
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyStep2Appearance();
                    setStep(3);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: selectedAccent }}
                >
                  Next: Music →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: MUSIC (Bundled Track or Playlist + Music & Ambience Volume) */}
        {step === 3 && (
          <div className="rounded-2xl bg-[#0f172a]/92 border border-slate-700/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-teal-300 mb-1">
                  Step 3 of 5 · Music &amp; Soundscapes
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Select a Bundled Track or Playlist
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pick a starting track or playlist and adjust your music and
                  ambience volume, or skip if you prefer silence.
                </p>
              </div>

              {musicSourceTab !== 'silent' && onUpdateAudioSettings && (
                <button
                  type="button"
                  onClick={() => {
                    const nextPlay = !isPreviewPlaying;
                    setIsPreviewPlaying(nextPlay);
                    onUpdateAudioSettings({
                      currentTrackId: selectedTrackId,
                      ambientSoundId: selectedAmbientId,
                      musicVolume: musicVol,
                      ambientVolume: ambientVol,
                      isPlaying: nextPlay,
                    });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-xs font-semibold text-teal-200 flex items-center gap-1.5 cursor-pointer"
                >
                  {isPreviewPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Audio Preview</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Preview Selected Track</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Source Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setMusicSourceTab('tracks')}
                className={`py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  musicSourceTab === 'tracks'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🎵 Bundled Tracks ({availableTracks.length})
              </button>
              <button
                type="button"
                onClick={() => setMusicSourceTab('playlists')}
                className={`py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  musicSourceTab === 'playlists'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📀 Curated Playlists ({DEFAULT_PLAYLISTS.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setMusicSourceTab('silent');
                  setIsPreviewPlaying(false);
                  if (onUpdateAudioSettings) {
                    onUpdateAudioSettings({ isPlaying: false });
                  }
                }}
                className={`py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  musicSourceTab === 'silent'
                    ? 'bg-slate-800 text-amber-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔇 Start Quiet / Skip Music
              </button>
            </div>

            {/* Bundled Tracks List */}
            {musicSourceTab === 'tracks' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {availableTracks.map((t) => {
                  const active = selectedTrackId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTrackId(t.id);
                        setSelectedPlaylistId(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-teal-500/20 border-teal-400 text-white'
                          : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {t.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {t.genre} ·{' '}
                          {t.source === 'bundled_file'
                            ? 'Bundled WAV'
                            : 'Live Synth'}
                        </div>
                      </div>
                      {active && (
                        <Check className="w-4 h-4 text-teal-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Playlists List */}
            {musicSourceTab === 'playlists' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEFAULT_PLAYLISTS.map((pl) => {
                  const active = selectedPlaylistId === pl.id;
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlaylistId(pl.id);
                        if (pl.trackIds[0]) {
                          setSelectedTrackId(pl.trackIds[0]);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-teal-500/20 border-teal-400 text-white'
                          : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">
                          {pl.icon} {pl.name}
                        </span>
                        <span className="text-[10px] font-mono-tabular text-slate-400">
                          {pl.trackIds.length} tracks
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        {pl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Ambient Soundscape & Volume Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Ambient Soundscape
                </label>
                <select
                  value={selectedAmbientId}
                  onChange={(e) =>
                    setSelectedAmbientId(e.target.value as AmbientSoundId)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  {AMBIENT_SOUNDS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Music Volume</span>
                  <span className="font-mono-tabular">{musicVol}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={musicVol}
                  onChange={(e) => setMusicVol(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-teal-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Ambience Volume</span>
                  <span className="font-mono-tabular">{ambientVol}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={ambientVol}
                  onChange={(e) => setAmbientVol(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-teal-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/90">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Skip Step
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyStep3Music();
                    setStep(4);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: selectedAccent }}
                >
                  Next: Productivity →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PRODUCTIVITY (Focus Duration, Reminder Preferences, Optional Starting Habits) */}
        {step === 4 && (
          <div className="rounded-2xl bg-[#0f172a]/92 border border-slate-700/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div>
              <div className="text-xs font-semibold text-teal-300 mb-1">
                Step 4 of 5 · Productivity
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Focus Duration, Reminders &amp; Starting Habits
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure your default focus timer, reminder preferences, and
                select any optional starting habits you want in your garden.
              </p>
            </div>

            {/* 1. Focus Duration & Reminders Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-white">
                  Default Focus Duration
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '25 / 5m', f: 25, b: 5 },
                    { label: '45 / 10m', f: 45, b: 10 },
                    { label: '50 / 10m', f: 50, b: 10 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        setFocusMins(opt.f);
                        setShortBreakMins(opt.b);
                      }}
                      className={`py-1.5 rounded-lg border text-xs font-mono-tabular cursor-pointer ${
                        focusMins === opt.f
                          ? 'bg-teal-500/20 border-teal-400 text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Focus (minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={focusMins}
                      onChange={(e) => setFocusMins(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Break (minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={shortBreakMins}
                      onChange={(e) => setShortBreakMins(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono-tabular"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Reminder Preferences */}
              <div className="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Reminder Preferences
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableReminders}
                      onChange={(e) => setEnableReminders(e.target.checked)}
                      className="accent-teal-400"
                    />
                    <span>Enable Alerts</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STARTER_REMINDER_TEMPLATES.map((rem) => {
                    const selected = selectedStarterReminderIds.includes(rem.id);
                    return (
                      <button
                        key={rem.id}
                        type="button"
                        onClick={() =>
                          setSelectedStarterReminderIds((prev) =>
                            prev.includes(rem.id)
                              ? prev.filter((id) => id !== rem.id)
                              : [...prev, rem.id]
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 cursor-pointer ${
                          selected
                            ? 'bg-teal-500/20 border-teal-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{rem.icon}</span>
                        <span>{rem.title}</span>
                        {selected && <Check className="w-3 h-3 text-teal-300" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Desktop Notifications: {notificationPermission}
                  </span>
                  {notificationPermission !== 'granted' &&
                    notificationPermission !== 'unsupported' && (
                      <button
                        type="button"
                        onClick={onRequestNotificationPermission}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-teal-300 cursor-pointer"
                      >
                        Allow Permission
                      </button>
                    )}
                </div>
              </div>
            </div>

            {/* 3. Optional Starting Habits (Opt-in templates + Custom Habit creator) */}
            <div className="p-4 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">
                    Optional Starting Habits
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Click any habit below to include it, or add your own custom
                    habit. Leave unselected to start with an empty garden.
                  </div>
                </div>
                <span className="text-[11px] font-mono-tabular text-teal-300">
                  {selectedStarterHabitIds.length + customHabitsQueue.length}{' '}
                  selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {STARTER_HABIT_TEMPLATES.map((tpl) => {
                  const selected = selectedStarterHabitIds.includes(tpl.id);
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() =>
                        setSelectedStarterHabitIds((prev) =>
                          prev.includes(tpl.id)
                            ? prev.filter((id) => id !== tpl.id)
                            : [...prev, tpl.id]
                        )
                      }
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        selected
                          ? 'bg-teal-500/20 border-teal-400 text-white'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{tpl.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {tpl.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono-tabular">
                            Goal: {tpl.goalDays}d
                          </div>
                        </div>
                      </div>
                      {selected && (
                        <Check className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Starting Habit */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1">
                  {['📘', '💧', '📖', '🧘', '💻', '🌱'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setFirstHabitIcon(ic)}
                      className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center cursor-pointer ${
                        firstHabitIcon === ic
                          ? 'bg-teal-500/30 border border-teal-400'
                          : 'bg-slate-900 border border-slate-800'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={firstHabitInput}
                  onChange={(e) => setFirstHabitInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && firstHabitInput.trim()) {
                      e.preventDefault();
                      setCustomHabitsQueue((prev) => [
                        ...prev,
                        {
                          id: `custom_${Date.now()}`,
                          name: firstHabitInput.trim(),
                          icon: firstHabitIcon,
                          goalDays: Math.max(1, firstHabitGoal),
                        },
                      ]);
                      setFirstHabitInput('');
                    }
                  }}
                  placeholder="Or type a custom starting habit..."
                  className="flex-1 min-w-[180px] px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!firstHabitInput.trim()) return;
                    setCustomHabitsQueue((prev) => [
                      ...prev,
                      {
                        id: `custom_${Date.now()}`,
                        name: firstHabitInput.trim(),
                        icon: firstHabitIcon,
                        goalDays: Math.max(1, firstHabitGoal),
                      },
                    ]);
                    setFirstHabitInput('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white cursor-pointer"
                >
                  + Add Custom
                </button>
              </div>

              {customHabitsQueue.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customHabitsQueue.map((ch) => (
                    <span
                      key={ch.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-400/40 text-xs text-teal-200"
                    >
                      <span>
                        {ch.icon} {ch.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomHabitsQueue((prev) =>
                            prev.filter((item) => item.id !== ch.id)
                          )
                        }
                        className="text-slate-300 hover:text-white cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/90">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Skip Step
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyStep4Productivity();
                    setStep(5);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: selectedAccent }}
                >
                  Next: Security →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SECURITY (Optional Local Password Protection) */}
        {step === 5 && (
          <form
            onSubmit={handleFinishWithOptionalPassword}
            className="rounded-2xl bg-[#0f172a]/92 border border-slate-700/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-5"
          >
            <div>
              <div className="text-xs font-semibold text-teal-300 mb-1">
                Step 5 of 5 · Security
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Optional Local Password Protection
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose whether to require a local password when opening Habitra,
                or leave password protection off to open your workspace
                immediately.
              </p>
            </div>

            {/* Mode choice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEnablePasswordLock(false);
                  setSetupPassword('');
                  setSetupPasswordConfirm('');
                  setPasswordError('');
                }}
                className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  !enablePasswordLock
                    ? 'bg-teal-500/20 border-teal-400 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-white mb-1">
                  🔓 No Password (Default)
                </div>
                <p className="text-[11px] text-slate-400">
                  Open your Habitra workspace directly without a lock screen.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEnablePasswordLock(true)}
                className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  enablePasswordLock
                    ? 'bg-amber-500/20 border-amber-400 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-white mb-1">
                  🔒 Enable Password Protection
                </div>
                <p className="text-[11px] text-slate-400">
                  Require your password at the start of every new session.
                </p>
              </button>
            </div>

            {enablePasswordLock && (
              <div className="space-y-3.5 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300">
                    Set Local Workspace Password
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword((v) => !v)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {showSetupPassword ? (
                      <>
                        <EyeOff className="w-3 h-3" /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Show
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Password (min 4 characters)
                    </label>
                    <input
                      type={showSetupPassword ? 'text' : 'password'}
                      value={setupPassword}
                      onChange={(e) => {
                        setSetupPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Enter password"
                      autoFocus
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type={showSetupPassword ? 'text' : 'password'}
                      value={setupPasswordConfirm}
                      onChange={(e) => {
                        setSetupPasswordConfirm(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Confirm password"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Auto-Lock After Inactivity
                  </label>
                  <select
                    value={setupAutoLockMins}
                    onChange={(e) =>
                      setSetupAutoLockMins(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value={0}>
                      Only lock on new session launch &amp; manual lock
                    </option>
                    <option value={5}>After 5 minutes idle</option>
                    <option value={15}>After 15 minutes idle</option>
                    <option value={30}>After 30 minutes idle</option>
                  </select>
                </div>

                {passwordError && (
                  <p className="text-xs text-rose-400 font-medium">
                    {passwordError}
                  </p>
                )}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950/75 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Privacy &amp; Security:</strong>{' '}
              Passwords are salted with 128-bit random entropy and hashed using
              Web Crypto SHA-256. Plaintext passwords are never stored in
              localStorage or IndexedDB.
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/90">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Skip Password &amp; Finish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg cursor-pointer"
                  style={{ backgroundColor: selectedAccent }}
                >
                  <Check className="w-4 h-4" />
                  <span>Finish &amp; Enter Habitra</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* Bottom Footer Status */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-4 text-center text-[11px] text-slate-400">
        Habitra Desktop · 100% Offline-First · Reopen setup anytime in Settings
      </footer>
    </div>
  );
};

interface AmbientModeOverlayProps {
  isOpen: boolean;
  environment: EnvironmentSettings;
  styleSettings: StyleSettings;
  timer: TimerSettings;
  secondsRemaining: number;
  isTimerRunning: boolean;
  audio: AudioSettings;
  completedToday: number;
  totalHabits: number;
  dailyProgressPercent: number;
  onExit: () => void;
  onStartPauseTimer: () => void;
  onResetTimer: () => void;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onNextTrack: () => void;
}

export const AmbientModeOverlay: React.FC<AmbientModeOverlayProps> = ({
  isOpen,
  environment,
  styleSettings,
  timer,
  secondsRemaining,
  isTimerRunning,
  audio,
  completedToday,
  totalHabits,
  dailyProgressPercent,
  onExit,
  onStartPauseTimer,
  onResetTimer,
  onUpdateAudio,
  onNextTrack,
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isOpen) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [isOpen]);

  if (!isOpen) return null;

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const activeTrack =
    BUILTIN_MUSIC_TRACKS.find((t) => t.id === audio.currentTrackId) ||
    BUILTIN_MUSIC_TRACKS[0];

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f19] overflow-hidden flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Full-Screen Pixel Art Environment */}
      <PixelEnvironmentCanvas
        environment={environment}
        styleSettings={styleSettings}
        isFocusTimerRunning={isTimerRunning}
        className="absolute inset-0 w-full h-full"
      />

      {/* Top Row: Minimal Habit Progress & Exit Ambient Mode */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="px-4 py-2 rounded-2xl bg-slate-950/75 border border-slate-800/80 backdrop-blur-md flex items-center gap-3">
          <span className="text-xs font-medium text-slate-300">
            Today&apos;s Habits:
          </span>
          <span className="text-xs font-mono-tabular font-bold text-emerald-400">
            {completedToday}/{totalHabits} ({dailyProgressPercent}%)
          </span>
          <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${dailyProgressPercent}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 backdrop-blur-md text-xs font-medium text-slate-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Exit Ambient Mode (Esc)</span>
        </button>
      </div>

      {/* Center: Current Clock, Date, and Large Focus Timer */}
      <div className="relative z-10 my-auto text-center max-w-lg mx-auto space-y-6">
        <div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-200 font-mono-tabular tracking-tight drop-shadow">
            {timeString}
          </div>
          <div className="text-xs sm:text-sm text-slate-300/90 mt-1 drop-shadow">
            {dateString}
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-slate-950/65 border border-slate-800/80 backdrop-blur-md shadow-2xl">
          <div className="text-xs font-semibold text-indigo-300 tracking-widest uppercase mb-1">
            {timer.mode.replace('_', ' ')} Session · Cycle {timer.currentCycle || 1} /{' '}
            {timer.totalCycles || 4}
          </div>
          <div className="text-6xl sm:text-7xl font-bold text-white font-mono-tabular tracking-tight my-3">
            {formattedTimer}
          </div>

          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              type="button"
              onClick={onStartPauseTimer}
              className="px-6 py-3 rounded-xl font-semibold text-xs text-white flex items-center gap-2 shadow-lg transition-opacity hover:opacity-95 cursor-pointer"
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
              className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Floating Minimal Music Bar */}
      <div className="relative z-10 flex justify-center">
        <div className="px-5 py-3 rounded-2xl bg-slate-950/75 border border-slate-800/80 backdrop-blur-md flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🎵</span>
            <div>
              <div className="text-xs font-semibold text-white">
                {activeTrack.title}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                Ambient: {audio.ambientSoundId.replace('_', ' ')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateAudio({ isPlaying: !audio.isPlaying })}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: styleSettings.accentColor }}
            >
              {audio.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Music</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onNextTrack}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateAudio({ isMuted: !audio.isMuted })}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              {audio.isMuted ? (
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
              onChange={(e) =>
                onUpdateAudio({
                  musicVolume: Number(e.target.value),
                  isMuted: false,
                })
              }
              className="w-24 h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
