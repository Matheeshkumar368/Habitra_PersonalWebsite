import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  Circle,
  Play,
  Calendar as CalendarIcon,
  Flame,
  Droplets,
  Sparkles,
  Filter,
  Check,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Zap,
} from 'lucide-react';
import {
  CalendarEvent,
  Goal,
  Habit,
  HabitCompletionMap,
  NavigationTab,
  StyleSettings,
} from '../types/app';
import { calculateHabitStreak, isHabitCompleted } from '../utils/habitStats';
import { soundEngine } from '../audio/soundEngine';

interface UnifiedDailyTimelineProps {
  habits: Habit[];
  completions: HabitCompletionMap;
  calendarEvents: CalendarEvent[];
  selectedDate: Date;
  selectedDateStr: string;
  focusMinutesToday: number;
  waterCompleted: number;
  waterGoal: number;
  panelBgStyle: React.CSSProperties;
  styleSettings: StyleSettings;
  onToggleHabit: (habitId: string, dateStr: string) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onStartFocusTimer: () => void;
  onLogWaterCup: () => void;
}

type TimelineFilter = 'all' | 'habits' | 'focus' | 'calendar';

interface TimelineItem {
  id: string;
  type: 'habit' | 'focus' | 'calendar' | 'hydration';
  title: string;
  subtitle?: string;
  timeLabel: string;
  timeBucket: 'morning' | 'afternoon' | 'evening' | 'night';
  isCompleted: boolean;
  icon: string | React.ReactNode;
  color?: string;
  streak?: number;
  actionText?: string;
  onAction?: () => void;
}

export const UnifiedDailyTimeline: React.FC<UnifiedDailyTimelineProps> = ({
  habits,
  completions,
  calendarEvents,
  selectedDate,
  selectedDateStr,
  focusMinutesToday,
  waterCompleted,
  waterGoal,
  panelBgStyle,
  styleSettings,
  onToggleHabit,
  onNavigateTab,
  onStartFocusTimer,
  onLogWaterCup,
}) => {
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [collapsedBuckets, setCollapsedBuckets] = useState<Record<string, boolean>>({});

  const toggleBucket = (bucket: string) => {
    soundEngine.playUiClick();
    setCollapsedBuckets((prev) => ({ ...prev, [bucket]: !prev[bucket] }));
  };

  // Build structured timeline items
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    // 1. Process Habits
    habits.forEach((habit) => {
      const isDone = isHabitCompleted(completions, habit.id, selectedDateStr);
      const st = calculateHabitStreak(habit, completions, selectedDate);

      // Determine time bucket based on habit reminderTime or distributed default
      let bucket: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
      let timeLabel = 'Daily Ritual';

      if (habit.reminderTime) {
        timeLabel = habit.reminderTime;
        const hr = parseInt(habit.reminderTime.split(':')[0], 10) || 8;
        if (hr < 12) bucket = 'morning';
        else if (hr < 17) bucket = 'afternoon';
        else if (hr < 21) bucket = 'evening';
        else bucket = 'night';
      } else {
        const hash = (habit.name.charCodeAt(0) || 0) % 3;
        if (hash === 0) {
          bucket = 'morning';
          timeLabel = 'Morning';
        } else if (hash === 1) {
          bucket = 'afternoon';
          timeLabel = 'Afternoon';
        } else {
          bucket = 'evening';
          timeLabel = 'Evening';
        }
      }

      items.push({
        id: `habit_${habit.id}`,
        type: 'habit',
        title: habit.name,
        subtitle: `${st.currentStreak} day streak · ${st.weeklyCompletedCount}/7 this week`,
        timeLabel,
        timeBucket: bucket,
        isCompleted: isDone,
        icon: habit.icon || '🌱',
        color: habit.color || styleSettings.accentColor,
        streak: st.currentStreak,
        onAction: () => onToggleHabit(habit.id, selectedDateStr),
      });
    });

    // 2. Process Calendar Events for today
    const todayEvents = calendarEvents.filter((ev) => ev.date === selectedDateStr);
    todayEvents.forEach((ev) => {
      let bucket: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon';
      if (ev.startTime) {
        const hr = parseInt(ev.startTime.split(':')[0], 10) || 12;
        if (hr < 12) bucket = 'morning';
        else if (hr < 17) bucket = 'afternoon';
        else if (hr < 21) bucket = 'evening';
        else bucket = 'night';
      }

      items.push({
        id: `cal_${ev.id}`,
        type: 'calendar',
        title: ev.title,
        subtitle: ev.location ? `📍 ${ev.location}` : ev.category ? `Category: ${ev.category}` : undefined,
        timeLabel: ev.allDay ? 'All Day' : ev.startTime ? `${ev.startTime}${ev.endTime ? ` - ${ev.endTime}` : ''}` : 'Scheduled',
        timeBucket: bucket,
        isCompleted: false,
        icon: '📅',
        color: ev.color || '#38bdf8',
        actionText: 'View in Calendar',
        onAction: () => onNavigateTab('calendar'),
      });
    });

    // 3. Focus Session Item
    items.push({
      id: 'focus_today_session',
      type: 'focus',
      title: 'Deep Work & Concentration',
      subtitle: focusMinutesToday > 0 ? `${focusMinutesToday} minutes invested today` : 'No focus sessions logged yet today',
      timeLabel: focusMinutesToday > 0 ? 'Logged Today' : 'Ready to Start',
      timeBucket: 'afternoon',
      isCompleted: focusMinutesToday >= 45,
      icon: '⏱️',
      color: '#a855f7',
      actionText: focusMinutesToday > 0 ? 'Start Another (25m)' : 'Start Session (25m)',
      onAction: onStartFocusTimer,
    });

    // 4. Hydration Checkpoint
    items.push({
      id: 'water_today_milestone',
      type: 'hydration',
      title: 'Mindful Hydration',
      subtitle: `${waterCompleted} of ${waterGoal} daily cups logged`,
      timeLabel: `${Math.round((waterCompleted / Math.max(1, waterGoal)) * 100)}% Hydrated`,
      timeBucket: 'morning',
      isCompleted: waterCompleted >= waterGoal,
      icon: '💧',
      color: '#06b6d4',
      actionText: '+ Log Cup',
      onAction: onLogWaterCup,
    });

    return items;
  }, [
    habits,
    completions,
    calendarEvents,
    selectedDate,
    selectedDateStr,
    focusMinutesToday,
    waterCompleted,
    waterGoal,
    styleSettings.accentColor,
    onToggleHabit,
    onNavigateTab,
    onStartFocusTimer,
    onLogWaterCup,
  ]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (filter === 'all') return timelineItems;
    if (filter === 'habits') return timelineItems.filter((i) => i.type === 'habit');
    if (filter === 'focus') return timelineItems.filter((i) => i.type === 'focus');
    if (filter === 'calendar') return timelineItems.filter((i) => i.type === 'calendar');
    return timelineItems;
  }, [timelineItems, filter]);

  // Overall completion metrics for timeline
  const completedCount = timelineItems.filter((i) => i.isCompleted).length;
  const totalCount = timelineItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group by Time Bucket
  const BUCKETS: {
    id: 'morning' | 'afternoon' | 'evening' | 'night';
    label: string;
    sub: string;
    icon: any;
  }[] = [
    { id: 'morning', label: 'Morning & Dawn', sub: '06:00 – 12:00', icon: Sun },
    { id: 'afternoon', label: 'Afternoon Flow', sub: '12:00 – 17:00', icon: Coffee },
    { id: 'evening', label: 'Evening Wind-Down', sub: '17:00 – 21:00', icon: Sunset },
    { id: 'night', label: 'Night Sanctuary', sub: '21:00+', icon: Moon },
  ];

  return (
    <div
      className="rounded-3xl border border-slate-800/80 p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-xl"
      style={panelBgStyle}
    >
      {/* Header Deck */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono tracking-wider">
              INTERACTIVE RHYTHM STREAM
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
            <span>Daily Synergy Timeline</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Connecting habits, focus sprints, hydration, and calendar events into one continuous ritual.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0">
          {(
            [
              { id: 'all', label: 'All Synergy' },
              { id: 'habits', label: 'Habits' },
              { id: 'focus', label: 'Focus & Water' },
              { id: 'calendar', label: 'Calendar' },
            ] as { id: TimelineFilter; label: string }[]
          ).map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setFilter(tab.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Track */}
      <div className="py-3 flex items-center justify-between gap-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="text-xs font-mono font-bold text-white">
            {completedCount} of {totalCount} completed today
          </div>
          <span className="text-[11px] text-indigo-400 font-mono font-bold">
            ({progressPercent}%)
          </span>
        </div>
        <div className="w-36 sm:w-48 h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
            }}
          />
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="space-y-6 pt-4">
        {BUCKETS.map((bucket) => {
          const itemsInBucket = filteredItems.filter((i) => i.timeBucket === bucket.id);
          if (itemsInBucket.length === 0 && filter !== 'all') return null;

          const IconComponent = bucket.icon;
          const isCollapsed = Boolean(collapsedBuckets[bucket.id]);

          return (
            <div key={bucket.id} className="relative pl-6 sm:pl-8 group">
              {/* Vertical Spine Line */}
              <div className="absolute left-2.5 sm:left-3.5 top-3 bottom-0 w-0.5 bg-slate-800/80 group-last:bottom-auto group-last:h-6" />

              {/* Bucket Node Icon */}
              <button
                type="button"
                onClick={() => toggleBucket(bucket.id)}
                className="absolute left-0 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-300 shadow cursor-pointer hover:border-indigo-400 transition-colors"
                title={`Toggle ${bucket.label}`}
              >
                <IconComponent className="w-3.5 h-3.5" />
              </button>

              {/* Bucket Header */}
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    {bucket.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {bucket.sub}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleBucket(bucket.id)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {itemsInBucket.length} {itemsInBucket.length === 1 ? 'item' : 'items'}
                </button>
              </div>

              {/* Bucket Cards */}
              {!isCollapsed && (
                <div className="space-y-2 mt-1">
                  {itemsInBucket.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 group/item ${
                        item.isCompleted
                          ? 'bg-slate-900/40 border-slate-800/60 opacity-80'
                          : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800/80 shadow-md hover:border-slate-700'
                      }`}
                    >
                      {/* Left: Icon & Title */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Toggle Check for habits */}
                        {item.type === 'habit' ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playHabitCheck(!item.isCompleted);
                              if (item.onAction) item.onAction();
                            }}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                              item.isCompleted
                                ? 'bg-emerald-500 text-slate-950 shadow-sm border border-emerald-400'
                                : 'bg-slate-950 border border-slate-700 hover:border-slate-500'
                            }`}
                            aria-label={`Toggle habit ${item.title}`}
                          >
                            {item.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xs shrink-0">
                            {item.icon}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs sm:text-sm font-semibold truncate ${
                                item.isCompleted ? 'line-through text-slate-400' : 'text-slate-100'
                              }`}
                            >
                              {item.title}
                            </span>
                            {item.streak !== undefined && item.streak > 0 && (
                              <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                                <Flame className="w-3 h-3 fill-current" />
                                <span>{item.streak}d</span>
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Time Badge & Quick Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400 font-mono bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800">
                          {item.timeLabel}
                        </span>

                        {item.actionText && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              if (item.onAction) item.onAction();
                            }}
                            className="px-2.5 py-1 rounded-xl text-xs font-semibold text-white bg-indigo-600/80 hover:bg-indigo-600 transition-colors cursor-pointer shadow-xs"
                          >
                            {item.actionText}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {itemsInBucket.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No commitments scheduled for this time block.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
