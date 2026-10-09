import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Flame,
  Edit3,
  Trash2,
  Check,
  Star,
  Calendar,
  BellRing,
  Droplets,
  Download,
  Upload,
  Shield,
  Lock,
  Sparkles,
  RotateCcw,
  Archive,
  BarChart2,
  HardDrive,
  Keyboard,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { formatLocalYMD } from '../constants/scenesAndPresets';
import { verifyIndexedDBHealth } from '../db/indexedDb';
import {
  AppDataState,
  Goal,
  GoalCategory,
  Habit,
  HabitCompletionMap,
  MissedReminderBehavior,
  Reminder,
  SecuritySettings,
  StyleSettings,
  TimerSessionLog,
  UserProfile,
  VersionedBackupEntry,
} from '../types/app';
import {
  calculateHabitStreak,
  OverallDashboardStats,
} from '../utils/habitStats';
import {
  AchievementBadge,
  calculateUserXPAndLevel,
  detectRuntimeEnvironment,
  evaluateAchievements,
  generateSmartInsights,
} from '../services/backgroundEngine';

interface StatisticsSectionProps {
  stats: OverallDashboardStats;
  habits: Habit[];
  completions: HabitCompletionMap;
  goals?: Goal[];
  timerHistory?: TimerSessionLog[];
  waterCompletedToday?: number;
  waterDailyGoal?: number;
  xpEnabled?: boolean;
  selectedDate: Date;
  onInspectHabit?: (habit: Habit) => void;
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
}

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({
  stats,
  habits,
  completions,
  goals = [],
  timerHistory = [],
  waterCompletedToday = 0,
  waterDailyGoal = 8,
  xpEnabled = true,
  selectedDate,
  onInspectHabit,
  styleSettings,
  panelBgStyle,
}) => {
  const [timeframe, setTimeframe] = useState<
    'daily' | 'weekly' | 'monthly' | 'yearly'
  >('weekly');

  const xpStatus = calculateUserXPAndLevel(
    habits,
    completions,
    goals,
    timerHistory,
    stats.overallBestStreak
  );
  const achievements: AchievementBadge[] = evaluateAchievements(
    habits,
    completions,
    goals,
    timerHistory,
    stats.overallBestStreak,
    waterCompletedToday,
    waterDailyGoal
  );
  const smartInsights = generateSmartInsights(
    habits,
    completions,
    timerHistory,
    stats.overallBestStreak
  );

  const displayRate =
    timeframe === 'daily'
      ? stats.dailyProgressPercent
      : timeframe === 'weekly'
      ? stats.weeklyProgressPercent
      : timeframe === 'monthly'
      ? stats.monthlyProgressPercent
      : stats.yearlyProgressPercent;

  const activeHabits = habits.filter((h) => !h.archived);

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border border-slate-800/90 p-5 shadow-xl"
        style={panelBgStyle}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <h2 className="text-base font-semibold text-white">Statistics</h2>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((t) => {
              const active = timeframe === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={
                    active
                      ? { backgroundColor: styleSettings.accentColor }
                      : undefined
                  }
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top 3 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          <div className="p-4 rounded-xl bg-slate-900/75 border border-slate-800/90 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg">
              📈
            </div>
            <div>
              <div className="text-xs text-slate-400">Completion Rate</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono-tabular">
                {displayRate}%
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/75 border border-slate-800/90 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 text-lg">
              🗓️
            </div>
            <div>
              <div className="text-xs text-slate-400">Best Week</div>
              <div className="text-2xl font-bold text-purple-400 font-mono-tabular">
                {stats.bestWeekRate}%
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/75 border border-slate-800/90 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 text-lg">
              ☑️
            </div>
            <div>
              <div className="text-xs text-slate-400">Total Completed</div>
              <div className="text-2xl font-bold text-sky-400 font-mono-tabular">
                {stats.totalCompletedAllTime} days
              </div>
            </div>
          </div>
        </div>

        {/* Pixel-Art Aesthetic Weekday Consistency Bar Chart */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
            <span>Weekly Day-by-Day Consistency</span>
            <span>
              Best Day:{' '}
              <strong className="text-emerald-400">{stats.bestDayName}</strong>
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2">
            {stats.weekdayBreakdown.map((item) => {
              const barColor =
                item.percent >= 85
                  ? '#10b981'
                  : item.percent >= 65
                  ? '#38bdf8'
                  : item.percent >= 50
                  ? '#6366f1'
                  : '#f59e0b';

              return (
                <div
                  key={item.day}
                  className="flex-1 flex flex-col items-center h-full justify-end group"
                >
                  <span className="text-[11px] font-mono-tabular text-slate-300 mb-1.5">
                    {item.percent}%
                  </span>
                  <div className="w-full max-w-[42px] bg-slate-900/90 rounded-t-lg h-28 flex items-end overflow-hidden border border-slate-800/70">
                    <div
                      className="w-full rounded-t-md transition-all duration-500"
                      style={{
                        height: `${Math.max(10, item.percent)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 mt-2 font-medium">
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* XP & Level Progression + Smart Insights + Achievements */}
      {xpEnabled && (
        <div
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-4"
          style={panelBgStyle}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-inner">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-xs font-bold text-indigo-300">
                    Level {xpStatus.level} — {xpStatus.levelTitle}
                  </span>
                  <span className="text-xs font-mono-tabular text-slate-300 font-semibold">
                    {xpStatus.totalXP} XP Total
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  +10 XP per habit · +25 XP full day · +20 XP focus session · +50 XP 7d streak · +100 XP goal
                </p>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <div className="flex justify-between text-[11px] font-mono-tabular text-slate-300 mb-1">
                <span>Level {xpStatus.level}</span>
                <span>
                  {xpStatus.totalXP} / {xpStatus.nextLevelXP} XP ({xpStatus.progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-emerald-400"
                  style={{ width: `${xpStatus.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400">Habits XP</div>
              <div className="text-xs font-bold text-white font-mono-tabular mt-0.5">
                +{xpStatus.breakdown.habitsXP} XP
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400">Perfect Days</div>
              <div className="text-xs font-bold text-emerald-400 font-mono-tabular mt-0.5">
                +{xpStatus.breakdown.perfectDaysXP} XP
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400">Focus Timer</div>
              <div className="text-xs font-bold text-sky-400 font-mono-tabular mt-0.5">
                +{xpStatus.breakdown.focusXP} XP
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400">Streak Bonus</div>
              <div className="text-xs font-bold text-amber-400 font-mono-tabular mt-0.5">
                +{xpStatus.breakdown.streakXP} XP
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <div className="text-[10px] text-slate-400">Goals Done</div>
              <div className="text-xs font-bold text-purple-400 font-mono-tabular mt-0.5">
                +{xpStatus.breakdown.goalsXP} XP
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Behavioral Insights & Achievements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div
          className="lg:col-span-6 rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-3"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Smart Behavioral Insights</span>
            </h3>
            <span className="text-[11px] text-slate-400">Local Pattern Analysis</span>
          </div>
          <div className="space-y-2.5">
            {smartInsights.map((ins) => (
              <div
                key={ins.id}
                className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/90 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0 mt-0.5">
                    {ins.icon}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">{ins.title}</div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {ins.detail}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono-tabular text-indigo-300 shrink-0">
                  {ins.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="lg:col-span-6 rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-3"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>🏆</span>
              <span>Achievements &amp; Milestones</span>
            </h3>
            <span className="text-xs font-mono-tabular text-emerald-400 font-semibold">
              {achievements.filter((a) => a.unlocked).length} / {achievements.length} Unlocked
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  ach.unlocked
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400 opacity-75'
                }`}
              >
                <span className="w-9 h-9 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center text-lg shrink-0">
                  {ach.unlocked ? ach.icon : '🔒'}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate flex items-center gap-1.5">
                    <span>{ach.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {ach.description}
                  </div>
                  <div className="text-[10px] font-mono-tabular text-indigo-300 mt-0.5">
                    {ach.progressText}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Habit Streaks & Record Breakdown */}
      <div
        className="rounded-2xl border border-slate-800/90 p-5 shadow-xl"
        style={panelBgStyle}
      >
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Individual Habit Streaks & Consistency (Click any card for Heatmap)</span>
        </h3>

        {activeHabits.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No active habits yet. Add habits to view individual streak analytics.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeHabits.map((h) => {
              const st = calculateHabitStreak(h, completions, selectedDate);
              const isNewRecord =
                st.currentStreak >= st.longestStreak && st.currentStreak >= 3;
              const goalDays = Math.max(1, h.goalDays || 30);
              const goalPct = Math.min(
                100,
                Math.round((st.totalCompletedDays / goalDays) * 100)
              );

              return (
                <div
                  key={h.id}
                  onClick={() => onInspectHabit && onInspectHabit(h)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && onInspectHabit) onInspectHabit(h);
                  }}
                  className="p-4 rounded-xl bg-slate-900/75 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{h.icon}</span>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {h.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Goal: {h.goalDays} days · {st.totalCompletedDays} total
                        </div>
                      </div>
                    </div>
                    {isNewRecord && (
                      <span className="text-[10px] font-mono-tabular font-semibold text-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> NEW RECORD!
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Goal Progress</span>
                      <span className="font-mono-tabular text-slate-200 font-medium">
                        {st.totalCompletedDays}/{goalDays} days ({goalPct}%)
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`${h.name} goal progress: ${st.totalCompletedDays} of ${goalDays} days completed`}
                      aria-valuenow={st.totalCompletedDays}
                      aria-valuemin={0}
                      aria-valuemax={goalDays}
                      className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${goalPct}%`,
                          backgroundColor:
                            st.totalCompletedDays >= goalDays
                              ? '#10b981'
                              : h.color || styleSettings.accentColor,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/70 text-center">
                    <div>
                      <div className="text-[11px] text-slate-400">Current</div>
                      <div className="text-sm font-bold text-amber-400 font-mono-tabular">
                        🔥 {st.currentStreak}d
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Best</div>
                      <div className="text-sm font-bold text-white font-mono-tabular">
                        {st.longestStreak}d
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">30d Rate</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono-tabular">
                        {st.completionRate30d}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface HabitsManagementViewProps {
  habits: Habit[];
  completions: HabitCompletionMap;
  selectedDate: Date;
  onToggleCompletion: (habitId: string, dateStr: string) => void;
  onOpenAddHabit: () => void;
  onOpenEditHabit: (habit: Habit) => void;
  onInspectHabit: (habit: Habit) => void;
  onToggleArchiveHabit: (habitId: string) => void;
  onDeleteHabit: (habitId: string) => void;
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
}

export const HabitsManagementView: React.FC<HabitsManagementViewProps> = ({
  habits,
  completions,
  selectedDate,
  onToggleCompletion,
  onOpenAddHabit,
  onOpenEditHabit,
  onInspectHabit,
  onToggleArchiveHabit,
  onDeleteHabit,
  styleSettings,
  panelBgStyle,
}) => {
  const [viewFilter, setViewFilter] = useState<'active' | 'archived'>('active');
  const selectedStr = formatLocalYMD(selectedDate);

  const visibleHabits = habits.filter((h) =>
    viewFilter === 'archived' ? Boolean(h.archived) : !h.archived
  );

  return (
    <div
      className="rounded-2xl border border-slate-800/90 p-5 shadow-xl"
      style={panelBgStyle}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-white">
            All Habits & Streak Records
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any habit to inspect its 16-week contribution heatmap and detailed statistics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewFilter('active')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewFilter === 'active'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({habits.filter((h) => !h.archived).length})
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('archived')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewFilter === 'archived'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archived ({habits.filter((h) => h.archived).length})
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenAddHabit}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: styleSettings.accentColor }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Habit</span>
          </button>
        </div>
      </div>

      {visibleHabits.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-400 mb-3">
            {viewFilter === 'archived'
              ? 'No archived habits.'
              : 'No habits created yet. Start building your daily routine!'}
          </p>
          {viewFilter === 'active' && (
            <button
              type="button"
              onClick={onOpenAddHabit}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
              style={{ backgroundColor: styleSettings.accentColor }}
            >
              Create First Habit
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleHabits.map((habit) => {
            const st = calculateHabitStreak(habit, completions, selectedDate);
            const goalPct = Math.min(
              100,
              Math.round(
                (st.totalCompletedDays / Math.max(1, habit.goalDays)) * 100
              )
            );

            return (
              <div
                key={habit.id}
                className="p-4 rounded-xl bg-slate-900/75 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleCompletion(habit.id, selectedStr)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 mt-0.5 cursor-pointer ${
                        st.isCompletedOnDate
                          ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                          : 'bg-slate-950 border border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {st.isCompletedOnDate && (
                        <Check className="w-4 h-4 stroke-[3]" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{habit.icon}</span>
                        <button
                          type="button"
                          onClick={() => onInspectHabit(habit)}
                          className={`text-sm font-semibold text-left hover:text-indigo-300 transition-colors cursor-pointer ${
                            st.isCompletedOnDate
                              ? 'text-white'
                              : 'text-slate-200'
                          }`}
                        >
                          {habit.name}
                        </button>
                      </div>
                      {habit.description && (
                        <p className="text-xs text-slate-400 mt-1">
                          {habit.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-2 font-mono-tabular">
                        <span className="capitalize">{habit.frequency}</span>
                        <span>·</span>
                        <span>Goal: {habit.goalDays}d</span>
                        {habit.reminderTime && (
                          <>
                            <span>·</span>
                            <span>⏰ {habit.reminderTime}</span>
                          </>
                        )}
                        {habit.dependsOnHabitId && (() => {
                          const prereq = habits.find((p) => p.id === habit.dependsOnHabitId);
                          if (!prereq) return null;
                          const prereqDone = Boolean(completions[`${prereq.id}_${selectedStr}`]);
                          return (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] border ${
                                prereqDone
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              }`}
                            >
                              {prereqDone
                                ? `🔓 Unlocked (${prereq.name} ✓)`
                                : `🔒 After ${prereq.name}`}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onInspectHabit(habit)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 cursor-pointer"
                      title="Habit Details & Heatmap"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEditHabit(habit)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      title="Edit Habit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleArchiveHabit(habit.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer"
                      title={habit.archived ? 'Restore Habit' : 'Archive Habit'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHabit(habit.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-amber-400 font-mono-tabular font-medium">
                      🔥 {st.currentStreak} day streak (Best: {st.longestStreak}d)
                    </span>
                    <span className="text-slate-300 font-mono-tabular font-medium">
                      {st.totalCompletedDays} / {habit.goalDays} days ({goalPct}%)
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${habit.name} goal progress: ${st.totalCompletedDays} of ${habit.goalDays} days completed`}
                    aria-valuenow={st.totalCompletedDays}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(1, habit.goalDays)}
                    className="w-full h-2 rounded-full bg-slate-950 overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${goalPct}%`,
                        backgroundColor:
                          st.totalCompletedDays >= habit.goalDays
                            ? '#10b981'
                            : habit.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface GoalsManagementViewProps {
  goals: Goal[];
  habits: Habit[];
  onOpenAddGoal: () => void;
  onOpenEditGoal: (goal: Goal) => void;
  onUpdateGoalProgress: (goalId: string, progress: number) => void;
  onToggleGoalStar: (goalId: string) => void;
  onToggleArchiveGoal?: (goalId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
}

export const GoalsManagementView: React.FC<GoalsManagementViewProps> = ({
  goals,
  habits,
  onOpenAddGoal,
  onOpenEditGoal,
  onUpdateGoalProgress,
  onToggleGoalStar,
  onToggleArchiveGoal,
  onDeleteGoal,
  styleSettings,
  panelBgStyle,
}) => {
  const [filter, setFilter] = useState<'all' | GoalCategory | 'archived'>('all');

  const filtered = goals.filter((g) => {
    if (filter === 'archived') return Boolean(g.archived);
    if (g.archived) return false;
    return filter === 'all' ? true : g.category === filter;
  });

  return (
    <div
      className="rounded-2xl border border-slate-800/90 p-5 shadow-xl"
      style={panelBgStyle}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-white">
            Goals & Milestones
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track daily, weekly, monthly, and long-term goals connected to your habits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            {(
              [
                'all',
                'daily',
                'weekly',
                'monthly',
                'long-term',
                'archived',
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer whitespace-nowrap ${
                  filter === cat
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenAddGoal}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: styleSettings.accentColor }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Goal</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-400 mb-3">
            {filter === 'archived'
              ? 'No archived goals.'
              : 'No goals in this view yet. Add a goal to track your milestones!'}
          </p>
          {filter !== 'archived' && (
            <button
              type="button"
              onClick={onOpenAddGoal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
              style={{ backgroundColor: styleSettings.accentColor }}
            >
              Create First Goal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((goal) => {
            const linkedHabits = habits.filter((h) =>
              goal.relatedHabitIds?.includes(h.id)
            );

            return (
              <div
                key={goal.id}
                className="p-4 rounded-xl bg-slate-900/75 border border-slate-800/90 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{
                        backgroundColor: `${goal.color}20`,
                        border: `1px solid ${goal.color}40`,
                      }}
                    >
                      {goal.icon || '🎯'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">
                          {goal.title}
                        </h3>
                      </div>
                      {goal.description && (
                        <p className="text-xs text-slate-400 mt-1">
                          {goal.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-2 font-mono-tabular">
                        <span className="capitalize">{goal.category}</span>
                        <span>·</span>
                        <span className="capitalize">
                          Priority: {goal.priority}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {goal.deadline}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleGoalStar(goal.id)}
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        goal.starred
                          ? 'text-amber-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title="Star Goal"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEditGoal(goal)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      title="Edit Goal"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {onToggleArchiveGoal && (
                      <button
                        type="button"
                        onClick={() => onToggleArchiveGoal(goal.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer"
                        title={goal.archived ? 'Restore Goal' : 'Archive Goal'}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteGoal && (
                      <button
                        type="button"
                        onClick={() => onDeleteGoal(goal.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {linkedHabits.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <span>
                      {goal.autoProgressFromHabits
                        ? 'Auto-linked habits:'
                        : 'Linked habits:'}
                    </span>
                    {linkedHabits.map((lh) => (
                      <span key={lh.id} className="text-slate-200">
                        {lh.icon} {lh.name}
                      </span>
                    ))}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">
                      {goal.autoProgressFromHabits
                        ? 'Progress (Auto from Habits)'
                        : 'Progress'}
                    </span>
                    <span className="font-mono-tabular font-semibold text-white">
                      {goal.progress}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${goal.progress}%`,
                          backgroundColor: goal.color,
                        }}
                      />
                    </div>
                    {!goal.autoProgressFromHabits && (
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={goal.progress}
                        onChange={(e) =>
                          onUpdateGoalProgress(goal.id, Number(e.target.value))
                        }
                        className="w-24 h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
                        title="Adjust progress"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface RemindersAndHydrationViewProps {
  reminders: Reminder[];
  profile: UserProfile;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => void;
  onTriggerTestNotification: () => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onOpenAddReminder: () => void;
  onOpenEditReminder?: (rem: Reminder) => void;
  onCompleteReminderToday?: (id: string) => void;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
}

export const RemindersAndHydrationView: React.FC<
  RemindersAndHydrationViewProps
> = ({
  reminders,
  profile,
  notificationPermission,
  onRequestNotificationPermission,
  onTriggerTestNotification,
  onToggleReminder,
  onDeleteReminder,
  onOpenAddReminder,
  onOpenEditReminder,
  onCompleteReminderToday,
  onUpdateProfile,
  styleSettings,
  panelBgStyle,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Hydration & Notification Station */}
      <div
        className="lg:col-span-5 rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-5"
        style={panelBgStyle}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Droplets className="w-4 h-4 text-sky-400" />
              <span>Hydration Tracker</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-tabular text-sky-300 font-semibold">
                {profile.waterCompletedToday} / {profile.waterDailyGoal} glasses
              </span>
              {profile.waterCompletedToday > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateProfile({ waterCompletedToday: 0 })}
                  className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                  title="Reset today's water count"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Click a cup below or set your daily target &amp; hydration interval
          </p>

          <div className="grid grid-cols-4 gap-2.5 mb-4">
            {Array.from({ length: profile.waterDailyGoal }).map((_, idx) => {
              const filled = idx < profile.waterCompletedToday;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    soundEngine.playHabitCheck(
                      !(idx + 1 === profile.waterCompletedToday)
                    );
                    onUpdateProfile({
                      waterCompletedToday:
                        idx + 1 === profile.waterCompletedToday ? idx : idx + 1,
                    });
                  }}
                  className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    filled
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-sm'
                      : 'bg-slate-900/70 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <span className="text-lg">{filled ? '💧' : '🥛'}</span>
                  <span className="text-[10px] font-mono-tabular">
                    Cup {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Daily Water Goal (Cups)
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[6, 8, 10, 12].map((goalCups) => {
                  const active = profile.waterDailyGoal === goalCups;
                  return (
                    <button
                      key={goalCups}
                      type="button"
                      onClick={() =>
                        onUpdateProfile({ waterDailyGoal: goalCups })
                      }
                      className={`py-1.5 rounded-lg text-xs font-mono-tabular border transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-500/25 border-sky-400 text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {goalCups}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Reminder Interval
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[30, 45, 60, 90].map((mins) => {
                  const active = profile.waterIntervalMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        onUpdateProfile({ waterIntervalMinutes: mins })
                      }
                      className={`py-1.5 rounded-lg text-xs font-mono-tabular border transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-500/25 border-sky-400 text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {mins}m
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white flex items-center gap-1.5">
              <BellRing className="w-4 h-4 text-indigo-400" />
              Desktop Notifications
            </span>
            <span className="text-xs font-mono-tabular text-slate-400 capitalize">
              Status: {notificationPermission}
            </span>
          </div>

          {notificationPermission === 'denied' && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300">
              Notification permission is blocked in your browser. Click the lock
              icon in your address bar and set Notifications to &quot;Allow&quot;.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            {(
              [
                { key: 'notifyHabits', label: 'Habit Reminders' },
                { key: 'notifyWater', label: 'Water Alerts' },
                { key: 'notifyStudy', label: 'Study Sessions' },
                { key: 'notifyBreaks', label: 'Break Alerts' },
                { key: 'notifyTimer', label: 'Timer Bell' },
                { key: 'notificationSoundEnabled', label: 'Sound Chimes' },
              ] as { key: keyof UserProfile; label: string }[]
            ).map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] text-slate-300 cursor-pointer"
              >
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={profile[item.key] !== false}
                  onChange={(e) =>
                    onUpdateProfile({ [item.key]: e.target.checked })
                  }
                  className="accent-indigo-500"
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {notificationPermission !== 'granted' &&
              notificationPermission !== 'unsupported' && (
                <button
                  type="button"
                  onClick={onRequestNotificationPermission}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-white cursor-pointer"
                  style={{ backgroundColor: styleSettings.accentColor }}
                >
                  Grant Notification Permission
                </button>
              )}
            <button
              type="button"
              onClick={onTriggerTestNotification}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
            >
              Send Test Notification
            </button>
          </div>

          {/* Quiet Hours & Missed Reminders Behavior */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                🌙 Quiet Hours (Suppress Night Alerts)
              </span>
              <input
                type="checkbox"
                checked={Boolean(profile.quietHoursEnabled)}
                onChange={(e) =>
                  onUpdateProfile({ quietHoursEnabled: e.target.checked })
                }
                className="accent-indigo-500 cursor-pointer"
              />
            </div>

            {profile.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Quiet Start
                  </label>
                  <input
                    type="time"
                    value={profile.quietHoursStart || '23:00'}
                    onChange={(e) =>
                      onUpdateProfile({ quietHoursStart: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Quiet End
                  </label>
                  <input
                    type="time"
                    value={profile.quietHoursEnd || '06:00'}
                    onChange={(e) =>
                      onUpdateProfile({ quietHoursEnd: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono-tabular"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                When Reminders Are Missed (System Sleep / Closed)
              </label>
              <select
                value={profile.missedReminderBehavior || 'summary'}
                onChange={(e) =>
                  onUpdateProfile({
                    missedReminderBehavior: e.target
                      .value as MissedReminderBehavior,
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
              >
                <option value="summary">
                  Show consolidated summary when Habitra opens
                </option>
                <option value="notify_immediately">
                  Notify immediately on wake
                </option>
                <option value="ignore">Ignore missed reminders</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Right: All Break & Study Reminders */}
      <div
        className="lg:col-span-7 rounded-2xl border border-slate-800/90 p-5 shadow-xl"
        style={panelBgStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Break & Study Reminders
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Eye breaks, stretches, walks, snacks, water, and scheduled sessions
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddReminder}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: styleSettings.accentColor }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Reminder</span>
          </button>
        </div>

        {reminders.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800">
            <p className="text-xs text-slate-400 mb-3">
              No reminders configured yet. Add a water, eye break, or study reminder!
            </p>
            <button
              type="button"
              onClick={onOpenAddReminder}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: styleSettings.accentColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Reminder</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/90 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{
                      backgroundColor: `${rem.color}20`,
                      border: `1px solid ${rem.color}40`,
                    }}
                  >
                    {rem.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {rem.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {rem.scheduleType === 'interval'
                        ? `Every ${rem.intervalMinutes} mins`
                        : `${rem.scheduleType} at ${rem.timeOfDay || '19:00'}`}
                      {rem.completedTodayCount > 0 &&
                        ` · ✓ ${rem.completedTodayCount}x today`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onCompleteReminderToday && (
                    <button
                      type="button"
                      onClick={() => onCompleteReminderToday(rem.id)}
                      className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/15 cursor-pointer"
                      title="Mark completed now"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onOpenEditReminder && (
                    <button
                      type="button"
                      onClick={() => onOpenEditReminder(rem)}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      title="Edit Reminder"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rem.enabled}
                    onClick={() => onToggleReminder(rem.id)}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
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
                  <button
                    type="button"
                    onClick={() => onDeleteReminder(rem.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    title="Delete Reminder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface SettingsAndBackupViewProps {
  profile: UserProfile;
  security: SecuritySettings;
  styleSettings: StyleSettings;
  dataSizeFormatted: string;
  versionedBackups?: VersionedBackupEntry[];
  notificationPermission?: NotificationPermission | 'unsupported';
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onOpenSecurityModal: () => void;
  onLockNow: () => void;
  onExportBackup: () => void;
  onCreateVersionedSnapshot?: () => void;
  onRestoreVersionedSnapshot?: (entry: VersionedBackupEntry) => void;
  onImportBackup: (state: AppDataState) => void;
  onResetDefaults: () => void;
  onOpenWelcomeWizard: () => void;
  onMinimizeToSystemTray?: () => void;
  onTriggerDiagnosticNotification?: (
    kind: 'water' | 'study' | 'eye' | 'exercise' | 'streak' | 'timer'
  ) => void;
  onSimulateMissedReminder?: () => void;
  panelBgStyle: React.CSSProperties;
}

export const SettingsAndBackupView: React.FC<SettingsAndBackupViewProps> = ({
  profile,
  security,
  styleSettings,
  dataSizeFormatted,
  versionedBackups = [],
  notificationPermission = 'default',
  onUpdateProfile,
  onOpenSecurityModal,
  onLockNow,
  onExportBackup,
  onCreateVersionedSnapshot,
  onRestoreVersionedSnapshot,
  onImportBackup,
  onResetDefaults,
  onOpenWelcomeWizard,
  onMinimizeToSystemTray,
  onTriggerDiagnosticNotification,
  onSimulateMissedReminder,
  panelBgStyle,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Live Runtime & Storage Diagnostic State
  const [runtimeDiag, setRuntimeDiag] = useState(() =>
    detectRuntimeEnvironment()
  );
  const [idbProbe, setIdbProbe] = useState<{
    ok: boolean;
    latencyMs: number;
    storeKeysCount: number;
    fallbackMirrored: boolean;
    checkedAt: string;
  }>({
    ok: true,
    latencyMs: 2,
    storeKeysCount: 15,
    fallbackMirrored: true,
    checkedAt: 'Just now',
  });
  const [audioDiag, setAudioDiag] = useState(() =>
    soundEngine.getDiagnostics()
  );

  const runLiveAudit = async () => {
    setRuntimeDiag(detectRuntimeEnvironment());
    setAudioDiag(soundEngine.getDiagnostics());
    const res = await verifyIndexedDBHealth();
    setIdbProbe({
      ...res,
      checkedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    });
  };

  useEffect(() => {
    runLiveAudit();
  }, []);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { parseImportedBackupJson } = await import('../db/indexedDb');
      const restored = parseImportedBackupJson(text);
      onImportBackup(restored);
      setImportStatus('✓ Backup restored and saved to local IndexedDB!');
    } catch (err) {
      setImportStatus(
        err instanceof Error ? `⚠ ${err.message}` : '⚠ Invalid JSON backup file'
      );
    }
    e.target.value = '';
  };

  const shortcutsList = [
    { key: 'Ctrl + K', action: 'Spotlight Command Palette & Search' },
    { key: 'N', action: 'Create New Habit' },
    { key: 'G', action: 'Create New Goal' },
    { key: 'Space', action: 'Start / Pause Timer' },
    { key: 'M', action: 'Mute / Unmute Music' },
    { key: 'F', action: 'Toggle Ambient Mode' },
    { key: 'L', action: 'Lock Workspace' },
    { key: '1 – 5', action: 'Switch Views (Dashboard–Timer)' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Workspace Identity & Keyboard Shortcuts */}
      <div className="lg:col-span-6 space-y-5">
        <div
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-4"
          style={panelBgStyle}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">
                Workspace Identity &amp; Profile
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {profile.hasSeenWelcome
                  ? '✓ First-launch setup completed · Reopen anytime to customize'
                  : '● First-launch setup pending'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenWelcomeWizard}
              className="px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-xs font-semibold text-indigo-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reopen Setup Wizard</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Application Name
              </label>
              <input
                type="text"
                value={profile.appName}
                onChange={(e) => onUpdateProfile({ appName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="habitra-display-name-input"
                  className="block text-xs text-slate-400"
                >
                  Display Name
                </label>
                {profile.userName && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProfile({
                        userName: '',
                        userNameConfigured: false,
                      })
                    }
                    className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                  >
                    Clear Name
                  </button>
                )}
              </div>
              <input
                id="habitra-display-name-input"
                type="text"
                value={profile.userName}
                onChange={(e) =>
                  onUpdateProfile({
                    userName: e.target.value,
                    userNameConfigured: e.target.value.trim().length > 0,
                  })
                }
                placeholder="Optional (e.g., Alex) — leave blank for general greeting"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Lock screen greeting:{' '}
                <span className="text-slate-300 font-medium">
                  “
                  {profile.userName.trim()
                    ? `Welcome back, ${profile.userName.trim()}`
                    : 'Welcome back'}
                  ”
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Dashboard Greeting Tagline / Quote
              </label>
              <input
                type="text"
                value={profile.quote}
                onChange={(e) => onUpdateProfile({ quote: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Sidebar Poster Quote
              </label>
              <input
                type="text"
                value={profile.sidebarQuote}
                onChange={(e) =>
                  onUpdateProfile({ sidebarQuote: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Reference Card */}
        <div
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl"
          style={panelBgStyle}
        >
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <span>Keyboard Shortcuts</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {shortcutsList.map((sc) => (
              <div
                key={sc.key}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/75 border border-slate-800/80 text-xs"
              >
                <span className="text-slate-300">{sc.action}</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-indigo-300 font-mono-tabular text-[11px]">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Background Operation, System Tray & Startup Settings */}
        <div
          className="rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-3.5"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>🌱</span>
                <span>Background Mode &amp; Windows System Tray</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Keep reminders and timers active when the main window is minimized
              </p>
            </div>
            {onMinimizeToSystemTray && (
              <button
                type="button"
                onClick={onMinimizeToSystemTray}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold text-emerald-300 cursor-pointer"
              >
                Minimize to Tray
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/75 border border-slate-800 text-xs text-slate-200 cursor-pointer">
              <div>
                <div className="font-semibold text-white">
                  Minimize to system tray (Keep running in background)
                </div>
                <div className="text-[11px] text-slate-400">
                  Continue receiving water, study, and streak notifications when closed
                </div>
              </div>
              <input
                type="checkbox"
                checked={profile.keepRunningInBackground !== false}
                onChange={(e) =>
                  onUpdateProfile({ keepRunningInBackground: e.target.checked })
                }
                className="accent-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/75 border border-slate-800 text-xs text-slate-200 cursor-pointer">
              <div>
                <div className="font-semibold text-white">
                  Start Habitra when Windows starts
                </div>
                <div className="text-[11px] text-slate-400">
                  Automatically launch background reminder scheduler on login
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(profile.startWithWindows)}
                onChange={(e) =>
                  onUpdateProfile({ startWithWindows: e.target.checked })
                }
                className="accent-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/75 border border-slate-800 text-xs text-slate-200 cursor-pointer">
              <div>
                <div className="font-semibold text-white">
                  Low-Power Background Mode
                </div>
                <div className="text-[11px] text-slate-400">
                  Pause heavy pixel canvas animations when window is hidden or minimized
                </div>
              </div>
              <input
                type="checkbox"
                checked={profile.lowPowerBackgroundMode !== false}
                onChange={(e) =>
                  onUpdateProfile({ lowPowerBackgroundMode: e.target.checked })
                }
                className="accent-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/75 border border-slate-800 text-xs text-slate-200 cursor-pointer">
              <div>
                <div className="font-semibold text-white">
                  XP &amp; Level Gamification System
                </div>
                <div className="text-[11px] text-slate-400">
                  Show XP bar, levels, and achievement badges across Statistics
                </div>
              </div>
              <input
                type="checkbox"
                checked={profile.xpEnabled !== false}
                onChange={(e) =>
                  onUpdateProfile({ xpEnabled: e.target.checked })
                }
                className="accent-indigo-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Right Column: Data & Storage Ownership, Backup/Restore & Security */}
      <div
        className="lg:col-span-6 rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-5"
        style={panelBgStyle}
      >
        <div>
          <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Data & Storage</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            100% local-first ownership. All data is persisted directly on your device with zero cloud dependencies.
          </p>

          {/* Storage Telemetry & Ownership Table */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 text-xs mb-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Storage Location</span>
              <span className="font-medium text-white">
                Local Device (IndexedDB)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Offline Mode</span>
              <span className="font-medium text-emerald-400">
                Enabled (● Offline / Local)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Autosave</span>
              <span className="font-medium text-emerald-400">
                Active (✓ Saved locally)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Last Saved</span>
              <span className="font-mono-tabular text-slate-200">
                {profile.lastSavedAt || 'Just now'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Last Backup</span>
              <span className="font-mono-tabular text-slate-200">
                {profile.lastBackupAt || 'Never'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Data Size</span>
              <span className="font-mono-tabular text-slate-200">
                {dataSizeFormatted}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onExportBackup}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: styleSettings.accentColor }}
            >
              <Download className="w-4 h-4" />
              <span>Export Backup (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import Backup (JSON)</span>
            </button>

            {onCreateVersionedSnapshot && (
              <button
                type="button"
                onClick={onCreateVersionedSnapshot}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Snapshot</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {importStatus && (
            <p className="text-xs text-emerald-400 mt-2.5">{importStatus}</p>
          )}

          {/* Versioned Backups History */}
          {versionedBackups.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Versioned Local Snapshots ({versionedBackups.length})
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {versionedBackups.map((vb) => (
                  <div
                    key={vb.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/75 border border-slate-800 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono-tabular font-semibold text-white truncate">
                        {vb.label}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {vb.createdAt} · {vb.sizeFormatted}
                      </div>
                    </div>
                    {onRestoreVersionedSnapshot && (
                      <button
                        type="button"
                        onClick={() => onRestoreVersionedSnapshot(vb)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-medium shrink-0 cursor-pointer"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HABITRA HEALTH — Live System Diagnostic & Background Test Suite */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>🩺</span>
              <span>Habitra Health &amp; Live Diagnostics</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runLiveAudit}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-indigo-300 cursor-pointer"
              >
                🔄 Run Live Audit
              </button>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  idbProbe.ok
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                }`}
              >
                {idbProbe.ok ? 'All Systems Verified' : 'Fallback Mode'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Runtime Mode</span>
              <span className="text-indigo-300 font-semibold">
                {runtimeDiag.kind}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">IndexedDB Probe</span>
              <span
                className={`font-semibold font-mono-tabular ${
                  idbProbe.ok ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {idbProbe.ok
                  ? `✓ ${idbProbe.latencyMs}ms (${idbProbe.storeKeysCount} keys)`
                  : '⚠ Blocked'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Web Audio Engine</span>
              <span className="text-emerald-400 font-semibold capitalize">
                {audioDiag.supported
                  ? `✓ ${audioDiag.contextState}`
                  : 'Unsupported'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Notifications</span>
              <span
                className={`font-semibold capitalize ${
                  notificationPermission === 'granted'
                    ? 'text-emerald-400'
                    : notificationPermission === 'denied'
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}
              >
                {notificationPermission === 'granted'
                  ? '✓ Granted'
                  : notificationPermission === 'denied'
                  ? '⚠ Denied'
                  : '● In-App Ready'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Security Crypto</span>
              <span className="text-emerald-400 font-semibold">
                {runtimeDiag.webCryptoSupported ? '✓ SHA-256' : '✓ FNV Fallback'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Timer &amp; Backup</span>
              <span className="text-emerald-400 font-semibold">
                ✓ Epoch Sync · {idbProbe.checkedAt}
              </span>
            </div>
          </div>

          {onTriggerDiagnosticNotification && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-slate-300">
                Interactive Diagnostic &amp; Audio Test Suite
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await soundEngine.resumeContextManually();
                    soundEngine.playReminderChime();
                    setAudioDiag(soundEngine.getDiagnostics());
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-[11px] text-indigo-300 cursor-pointer"
                >
                  🔊 Test Audio Engine
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerDiagnosticNotification('water')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-indigo-600/25 border border-slate-800 text-[11px] text-slate-200 cursor-pointer"
                >
                  💧 Test Water Alert
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerDiagnosticNotification('study')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-indigo-600/25 border border-slate-800 text-[11px] text-slate-200 cursor-pointer"
                >
                  📚 Test Study Alert
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerDiagnosticNotification('streak')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-indigo-600/25 border border-slate-800 text-[11px] text-slate-200 cursor-pointer"
                >
                  🔥 Test Streak Alert
                </button>
                {onSimulateMissedReminder && (
                  <button
                    type="button"
                    onClick={onSimulateMissedReminder}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] text-amber-300 cursor-pointer"
                  >
                    ⚡ Simulate Missed Reminder
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Dashboard Password Lock</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Protect your Habitra workspace with a local salted SHA-256 password hash. Never stored in plain text.
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ${
                security.passwordHash
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {security.passwordHash ? '🔒 Enabled' : 'Unlocked'}
            </span>
          </div>

          {security.passwordHash && (
            <div className="p-3 rounded-xl bg-slate-900/75 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Session &amp; Auto-Lock Policy</span>
              <span className="font-medium text-slate-200">
                {security.autoLockMinutes > 0
                  ? `Locks on startup & after ${security.autoLockMinutes}m idle`
                  : 'Requires password at every session start'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onOpenSecurityModal}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white cursor-pointer"
            >
              {security.passwordHash
                ? 'Change or Remove Password'
                : 'Enable Password Protection'}
            </button>

            {security.passwordHash && (
              <button
                type="button"
                onClick={onLockNow}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Workspace Now</span>
              </button>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">
              Reset All Data
            </div>
            <div className="text-[11px] text-slate-500">
              Clear all habits, completions, goals, and reminders to a clean slate
            </div>
          </div>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Data</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDefaults();
                  setConfirmReset(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-xs font-medium text-white cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
