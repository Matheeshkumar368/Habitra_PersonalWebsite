import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { formatLocalYMD } from '../constants/scenesAndPresets';
import { Habit, HabitCompletionMap, StyleSettings } from '../types/app';
import { getDatesForMonth, isHabitCompleted } from '../utils/habitStats';

interface HabitCalendarSectionProps {
  habits: Habit[];
  completions: HabitCompletionMap;
  monthViewDate: Date;
  onChangeMonth: (deltaMonths: number) => void;
  onResetToToday: () => void;
  onToggleCompletion: (habitId: string, dateStr: string) => void;
  onInspectHabit?: (habit: Habit) => void;
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
  fullMonthMode?: boolean;
}

export const HabitCalendarSection: React.FC<HabitCalendarSectionProps> = ({
  habits,
  completions,
  monthViewDate,
  onChangeMonth,
  onResetToToday,
  onToggleCompletion,
  onInspectHabit,
  styleSettings,
  panelBgStyle,
  fullMonthMode = false,
}) => {
  const [pageSlice, setPageSlice] = useState<'first15' | 'second16' | 'all'>(
    fullMonthMode ? 'all' : 'first15'
  );
  const [recentGlowKey, setRecentGlowKey] = useState<string | null>(null);

  const allMonthDates = getDatesForMonth(
    monthViewDate.getFullYear(),
    monthViewDate.getMonth()
  );

  const visibleDates =
    pageSlice === 'all'
      ? allMonthDates
      : pageSlice === 'first15'
      ? allMonthDates.slice(0, 15)
      : allMonthDates.slice(15);

  const monthLabel = monthViewDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const todayStr = formatLocalYMD(new Date());
  const shortDow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleCellClick = (habitId: string, dateStr: string) => {
    const key = `${habitId}_${dateStr}`;
    if (!styleSettings.reducedMotion && styleSettings.animationSpeed !== 'off') {
      setRecentGlowKey(key);
      setTimeout(() => {
        setRecentGlowKey((prev) => (prev === key ? null : prev));
      }, 450);
    }
    onToggleCompletion(habitId, dateStr);
  };

  return (
    <section
      className="rounded-2xl border border-slate-800/90 p-5 shadow-xl transition-all"
      style={panelBgStyle}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-base">🗓️</span>
          <h2 className="text-base font-semibold text-white">Habit Calendar</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Day range toggle so 15 days fit cleanly without horizontal clipping */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setPageSlice('first15')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                pageSlice === 'first15'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Days 1–15
            </button>
            <button
              type="button"
              onClick={() => setPageSlice('second16')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                pageSlice === 'second16'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Days 16–{allMonthDates.length}
            </button>
            <button
              type="button"
              onClick={() => setPageSlice('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                pageSlice === 'all'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Month
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={() => onChangeMonth(-1)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-200 px-2 whitespace-nowrap">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => onChangeMonth(1)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onResetToToday();
              setPageSlice(new Date().getDate() <= 15 ? 'first15' : 'second16');
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            Today
          </button>
        </div>
      </div>

      {/* Interactive Pixel Grid Table */}
      {habits.length === 0 ? (
        <div className="py-10 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800">
          <p className="text-xs text-slate-400">
            No habits created yet. Add a habit above to track your daily completion cells on the calendar.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <table className="w-full border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-slate-800/80">
                <th className="py-2.5 pr-4 text-left text-xs font-medium text-slate-400 w-44">
                  Habit
                </th>
                {visibleDates.map((d) => {
                  const dStr = formatLocalYMD(d);
                  const isToday = dStr === todayStr;
                  return (
                    <th
                      key={dStr}
                      className={`py-2 px-1 text-center font-mono-tabular ${
                        isToday ? 'text-indigo-400' : 'text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] font-normal opacity-80">
                        {shortDow[d.getDay()]}
                      </div>
                      <div
                        className={`text-xs font-semibold mt-0.5 ${
                          isToday
                            ? 'w-5 h-5 mx-auto rounded-md bg-indigo-500/25 border border-indigo-400/50 flex items-center justify-center text-white'
                            : ''
                        }`}
                      >
                        {d.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {habits.map((habit) => (
                <tr
                  key={habit.id}
                  className="hover:bg-slate-900/40 transition-colors group"
                >
                  <td className="py-2.5 pr-4">
                    <button
                      type="button"
                      onClick={() => onInspectHabit && onInspectHabit(habit)}
                      className="flex items-center gap-2.5 text-left hover:text-indigo-300 transition-colors cursor-pointer"
                      title="View Habit Details & Heatmap"
                    >
                      <span className="text-sm shrink-0">{habit.icon}</span>
                      <span className="text-xs font-medium text-slate-200 hover:text-white truncate max-w-[130px]">
                        {habit.name}
                      </span>
                    </button>
                  </td>

                  {visibleDates.map((d) => {
                    const dStr = formatLocalYMD(d);
                    const completed = isHabitCompleted(completions, habit.id, dStr);
                    const cellKey = `${habit.id}_${dStr}`;
                    const isGlowing = recentGlowKey === cellKey;

                    return (
                      <td key={dStr} className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleCellClick(habit.id, dStr)}
                          aria-label={`${habit.name} on ${dStr}: ${
                            completed ? 'Completed' : 'Incomplete'
                          }`}
                          className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all cursor-pointer ${
                            completed
                              ? 'bg-emerald-500 text-slate-950 border border-emerald-400 shadow-sm'
                              : 'bg-slate-900/70 border border-slate-700/80 hover:border-slate-500 text-transparent'
                          } ${isGlowing ? 'scale-125 ring-2 ring-emerald-300' : ''}`}
                        >
                          <Check
                            className={`w-3.5 h-3.5 stroke-[3] ${
                              completed ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
