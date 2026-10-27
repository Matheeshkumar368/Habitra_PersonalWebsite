import React, { useState, useMemo } from 'react';
import {
  History,
  CheckCircle2,
  Timer as TimerIcon,
  Calendar as CalendarIcon,
  PiggyBank,
  Receipt,
  Trophy,
  Filter,
  Search,
  ArrowRight,
  Sparkles,
  Flame,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from 'lucide-react';
import {
  AppDataState,
  CalendarEvent,
  Goal,
  Habit,
  NavigationTab,
} from '../types/app';
import { FinsaCurrency, FinsaTransaction, FinsaDailySavingsRecord } from '../types/finsa';
import { formatLocalYMD } from '../constants/scenesAndPresets';
import { formatCents } from '../services/finsaEngine';
import { soundEngine } from '../audio/soundEngine';

export type ActivityFilterType =
  | 'all'
  | 'habits'
  | 'focus'
  | 'finance'
  | 'calendar'
  | 'goals';

export type ActivityDateRange = 'today' | '7days' | '30days' | 'all';

export interface ActivityTimelineItem {
  id: string;
  sourceType: 'habit' | 'focus' | 'calendar' | 'savings' | 'transaction' | 'goal';
  title: string;
  subtitle?: string;
  dateStr: string; // YYYY-MM-DD
  timestamp: number;
  iconEmoji?: string;
  badgeText: string;
  badgeClass: string;
  targetTab: NavigationTab;
  amountCents?: number;
  currency?: FinsaCurrency;
  txType?: 'income' | 'expense' | 'transfer';
}

export interface PersonalActivityTimelineProps {
  appState: AppDataState;
  onNavigateTab: (tab: NavigationTab) => void;
  styleSettings: AppDataState['style'];
  panelBgStyle?: React.CSSProperties;
}

export const PersonalActivityTimeline: React.FC<PersonalActivityTimelineProps> = ({
  appState,
  onNavigateTab,
  panelBgStyle,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<ActivityFilterType>('all');
  const [selectedRange, setSelectedRange] = useState<ActivityDateRange>('7days');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = formatLocalYMD(new Date());

  // Aggregate all genuine underlying records
  const allActivities = useMemo(() => {
    const list: ActivityTimelineItem[] = [];

    // 1. Habit completions
    const habitMap = new Map<string, Habit>();
    (appState.habits || []).forEach((h) => habitMap.set(h.id, h));

    const completions = appState.completions || {};
    Object.entries(completions).forEach(([key, isDone]) => {
      if (!isDone) return;
      const [habitId, dateStr] = key.split('_');
      const habit = habitMap.get(habitId);
      if (!habit || !dateStr) return;

      const dateObj = new Date(dateStr);
      list.push({
        id: `act_habit_${key}`,
        sourceType: 'habit',
        title: habit.name,
        subtitle: `Habit checked in • ${habit.frequency || 'daily'} rhythm`,
        dateStr,
        timestamp: isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime(),
        iconEmoji: habit.icon || '🌱',
        badgeText: 'Habit Done',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        targetTab: 'habits',
      });
    });

    // 2. Focus timer sessions
    const timerHistory = appState.timer.history || [];
    timerHistory.forEach((session, idx) => {
      const dateStr = session.date || todayStr;
      const dateObj = new Date(dateStr);
      list.push({
        id: session.id || `act_focus_${idx}_${dateStr}`,
        sourceType: 'focus',
        title: `${session.mode === 'focus' ? 'Focus Session' : 'Break'} (${session.minutes}m)`,
        subtitle: `Completed ${session.minutes} minutes of concentration`,
        dateStr,
        timestamp: dateObj.getTime(),
        iconEmoji: '⏱️',
        badgeText: 'Focus',
        badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        targetTab: 'timer',
      });
    });

    // 3. Calendar events
    const calendarEvents = appState.calendarEvents || [];
    calendarEvents.forEach((ev) => {
      const dateObj = new Date(ev.date);
      list.push({
        id: `act_cal_${ev.id}`,
        sourceType: 'calendar',
        title: ev.title,
        subtitle: `${ev.category.toUpperCase()} • ${ev.startTime ? ev.startTime : 'All day'}`,
        dateStr: ev.date,
        timestamp: dateObj.getTime(),
        iconEmoji: '📅',
        badgeText: 'Calendar',
        badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        targetTab: 'calendar',
      });
    });

    // 4. FINSA daily savings contributions
    const finsa = appState.finsa;
    const currency = finsa?.currency || 'INR';
    const dailySavings = finsa?.dailySavings || [];
    dailySavings.forEach((s) => {
      const dateObj = new Date(s.date);
      list.push({
        id: `act_save_${s.id}`,
        sourceType: 'savings',
        title: `Saved ${formatCents(s.amountCents, currency, false)} to Vault`,
        subtitle: `${s.category}${s.note ? ` • ${s.note}` : ''}`,
        dateStr: s.date,
        timestamp: dateObj.getTime(),
        iconEmoji: '💰',
        badgeText: 'Vault Savings',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        targetTab: 'finsa',
        amountCents: s.amountCents,
        currency,
      });
    });

    // 5. FINSA financial transactions
    const transactions = finsa?.transactions || [];
    transactions.forEach((tx) => {
      const dateObj = new Date(tx.date);
      const isInc = tx.type === 'income';
      const isTrf = tx.type === 'transfer';
      list.push({
        id: `act_tx_${tx.id}`,
        sourceType: 'transaction',
        title: `${isInc ? 'Received' : isTrf ? 'Transfer' : 'Spent'} ${formatCents(tx.amountCents, currency, false)}`,
        subtitle: `${tx.payeeOrPayer || 'Transaction'}${tx.notes ? ` • ${tx.notes}` : ''}`,
        dateStr: tx.date,
        timestamp: dateObj.getTime(),
        iconEmoji: isInc ? '📈' : isTrf ? '🔄' : '💳',
        badgeText: isInc ? 'Income' : isTrf ? 'Transfer' : 'Expense',
        badgeClass: isInc
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          : isTrf
          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
          : 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        targetTab: 'finsa',
        amountCents: tx.amountCents,
        currency,
        txType: tx.type,
      });
    });

    // 6. Achieved goals
    const goals = appState.goals || [];
    goals.forEach((g) => {
      if (g.progress >= 100) {
        list.push({
          id: `act_goal_${g.id}`,
          sourceType: 'goal',
          title: `Goal Achieved: ${g.title}`,
          subtitle: `${g.category.toUpperCase()} milestone completed`,
          dateStr: g.deadline || todayStr,
          timestamp: Date.now(),
          iconEmoji: g.icon || '🏆',
          badgeText: 'Goal Mastered',
          badgeClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
          targetTab: 'goals',
        });
      }
    });

    // Sort chronologically (newest date first)
    return list.sort((a, b) => {
      if (a.dateStr !== b.dateStr) {
        return b.dateStr.localeCompare(a.dateStr);
      }
      return b.timestamp - a.timestamp;
    });
  }, [
    appState.habits,
    appState.completions,
    appState.timer.history,
    appState.calendarEvents,
    appState.finsa?.dailySavings,
    appState.finsa?.transactions,
    appState.finsa?.currency,
    appState.goals,
    todayStr,
  ]);

  // Filter by date range
  const filteredByRange = useMemo(() => {
    if (selectedRange === 'all') return allActivities;

    const now = new Date();
    const cutoff = new Date();

    if (selectedRange === 'today') {
      return allActivities.filter((item) => item.dateStr === todayStr);
    } else if (selectedRange === '7days') {
      cutoff.setDate(now.getDate() - 7);
    } else if (selectedRange === '30days') {
      cutoff.setDate(now.getDate() - 30);
    }

    const cutoffStr = formatLocalYMD(cutoff);
    return allActivities.filter((item) => item.dateStr >= cutoffStr);
  }, [allActivities, selectedRange, todayStr]);

  // Filter by category
  const filteredByCategory = useMemo(() => {
    if (selectedFilter === 'all') return filteredByRange;
    if (selectedFilter === 'habits') {
      return filteredByRange.filter((item) => item.sourceType === 'habit');
    }
    if (selectedFilter === 'focus') {
      return filteredByRange.filter((item) => item.sourceType === 'focus');
    }
    if (selectedFilter === 'finance') {
      return filteredByRange.filter(
        (item) => item.sourceType === 'savings' || item.sourceType === 'transaction'
      );
    }
    if (selectedFilter === 'calendar') {
      return filteredByRange.filter((item) => item.sourceType === 'calendar');
    }
    if (selectedFilter === 'goals') {
      return filteredByRange.filter((item) => item.sourceType === 'goal');
    }
    return filteredByRange;
  }, [filteredByRange, selectedFilter]);

  // Filter by search query
  const finalActivities = useMemo(() => {
    if (!searchQuery.trim()) return filteredByCategory;
    const q = searchQuery.toLowerCase();
    return filteredByCategory.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.dateStr.includes(q)
    );
  }, [filteredByCategory, searchQuery]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityTimelineItem[]> = {};
    finalActivities.forEach((item) => {
      if (!groups[item.dateStr]) {
        groups[item.dateStr] = [];
      }
      groups[item.dateStr].push(item);
    });
    return groups;
  }, [finalActivities]);

  // Summary counts
  const totalCount = allActivities.length;
  const todayCount = allActivities.filter((a) => a.dateStr === todayStr).length;

  return (
    <div
      style={panelBgStyle}
      className="rounded-3xl border border-slate-800/90 bg-slate-950/70 p-5 sm:p-7 shadow-xl space-y-6 text-white"
    >
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Personal Activity Timeline
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  Audit Trail
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Chronological timeline of genuine local habits, focus blocks, events, and FINSA transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Quick stat cards */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Today's Logs</div>
            <div className="text-base font-bold font-mono text-emerald-400">{todayCount}</div>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Total Records</div>
            <div className="text-base font-bold font-mono text-indigo-400">{totalCount}</div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All Activities', icon: Sparkles },
              { id: 'habits', label: 'Habits', icon: CheckCircle2 },
              { id: 'focus', label: 'Focus', icon: TimerIcon },
              { id: 'finance', label: 'Finance', icon: PiggyBank },
              { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
              { id: 'goals', label: 'Goals', icon: Trophy },
            ] as const
          ).map((filter) => {
            const Icon = filter.icon;
            const isSelected = selectedFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setSelectedFilter(filter.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Range & Search */}
        <div className="flex items-center gap-2">
          {/* Range picker */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7days', label: '7D' },
                { id: '30days', label: '30D' },
                { id: 'all', label: 'All' },
              ] as const
            ).map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setSelectedRange(range.id);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono cursor-pointer transition-colors ${
                  selectedRange === range.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activity..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* 3. Chronological Day-Grouped Feed */}
      <div className="space-y-6 pt-2">
        {Object.entries(groupedActivities).map(([dateStr, items]) => {
          const isToday = dateStr === todayStr;
          const dateObj = new Date(dateStr);
          const formattedGroupHeader = isNaN(dateObj.getTime())
            ? dateStr
            : dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

          return (
            <div key={dateStr} className="space-y-3">
              {/* Date Header Stamp */}
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                    isToday
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {isToday ? 'Today' : formattedGroupHeader}
                </span>
                <div className="flex-1 h-px bg-slate-800/80" />
                <span className="text-[10px] font-mono text-slate-500">
                  {items.length} {items.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {/* Items for this date */}
              <div className="space-y-2 pl-2 sm:pl-4 border-l-2 border-slate-800/80">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      soundEngine.playUiClick();
                      onNavigateTab(item.targetTab);
                    }}
                    className="group p-3 rounded-2xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                        {item.iconEmoji || '✨'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[11px] text-slate-400 truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${item.badgeClass}`}
                      >
                        {item.badgeText}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {Object.keys(groupedActivities).length === 0 && (
          <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/60 space-y-2">
            <History className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No activity recorded for this period</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No events match "${searchQuery}". Try clearing your search.`
                : 'As you complete habits, run focus sessions, and record transactions, your chronological timeline will assemble here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
