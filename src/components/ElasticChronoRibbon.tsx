import React, { useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Plus,
  Clock,
} from 'lucide-react';
import { CalendarEvent } from '../types/app';
import { formatLocalYMD } from '../constants/scenesAndPresets';
import { soundEngine } from '../audio/soundEngine';

interface ElasticChronoRibbonProps {
  selectedDate: Date;
  events: CalendarEvent[];
  reducedMotion?: boolean;
  onSelectDate: (date: Date) => void;
  onOpenCreateEvent?: (dateStr: string) => void;
}

export const ElasticChronoRibbon: React.FC<ElasticChronoRibbonProps> = ({
  selectedDate,
  events,
  reducedMotion = false,
  onSelectDate,
  onOpenCreateEvent,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const todayStr = formatLocalYMD(new Date());
  const selectedStr = formatLocalYMD(selectedDate);

  // Generate a continuous ribbon of 21 days centered around selectedDate (10 days before, 10 days after)
  const ribbonDays = React.useMemo(() => {
    const list: {
      date: Date;
      dateStr: string;
      dayOfWeek: string;
      dayNumber: number;
      monthShort: string;
      isToday: boolean;
      isSelected: boolean;
      dayEvents: CalendarEvent[];
    }[] = [];

    const base = new Date(selectedDate);
    for (let offset = -10; offset <= 10; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      const dStr = formatLocalYMD(d);
      const isToday = dStr === todayStr;
      const isSelected = dStr === selectedStr;

      // Real matching events for this day
      const dayEvents = events.filter((ev) => ev.date === dStr);

      list.push({
        date: d,
        dateStr: dStr,
        dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday,
        isSelected,
        dayEvents,
      });
    }
    return list;
  }, [selectedDate, events, todayStr, selectedStr]);

  // Smoothly center the selected day in view
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const selectedEl = scrollContainerRef.current.querySelector(
      `[data-date="${selectedStr}"]`
    ) as HTMLElement | null;

    if (selectedEl) {
      selectedEl.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedStr, reducedMotion]);

  const handleScrollDelta = (direction: 'left' | 'right') => {
    soundEngine.playUiClick();
    if (!scrollContainerRef.current) return;
    const scrollAmount = 240;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleDayClick = (d: Date) => {
    soundEngine.playStepChange();
    onSelectDate(d);
  };

  const handleCenterToday = () => {
    soundEngine.playUiClick();
    onSelectDate(new Date());
  };

  const getCategoryPipColor = (category?: string) => {
    switch (category) {
      case 'work':
        return 'bg-blue-400';
      case 'personal':
        return 'bg-emerald-400';
      case 'health':
        return 'bg-cyan-400';
      case 'study':
        return 'bg-purple-400';
      case 'birthday':
        return 'bg-pink-400';
      case 'important':
        return 'bg-rose-400';
      default:
        return 'bg-amber-400';
    }
  };

  return (
    <div className="relative w-full rounded-2xl border border-slate-800/90 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3.5 shadow-xl select-none">
      {/* Ribbon Top Control Bar */}
      <div className="flex items-center justify-between gap-3 mb-2 px-1">
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 font-semibold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Elastic Chrono-Ribbon</span>
          <span className="text-[10px] text-slate-400 font-normal normal-case">
            (Sliding Timeline)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCenterToday}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
              selectedStr === todayStr
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleScrollDelta('left')}
            aria-label="Scroll timeline left"
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScrollDelta('right')}
            aria-label="Scroll timeline right"
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* The Scrollable Horizontal Day Ribbon */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {ribbonDays.map((day) => {
          return (
            <div
              key={day.dateStr}
              data-date={day.dateStr}
              onClick={() => handleDayClick(day.date)}
              className={`group relative shrink-0 w-16 sm:w-18 py-2 px-1.5 rounded-2xl border-2 flex flex-col items-center justify-between transition-all duration-300 cursor-pointer select-none ${
                day.isSelected
                  ? 'bg-gradient-to-b from-indigo-900/90 via-slate-900 to-indigo-950/90 border-indigo-400 text-white shadow-[0_8px_20px_rgba(99,102,241,0.35)] -translate-y-1 scale-105'
                  : day.isToday
                  ? 'bg-slate-900/80 hover:bg-slate-850 border-teal-400/60 text-slate-200'
                  : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
              style={{ scrollSnapAlign: 'center' }}
            >
              {/* Month Micro-badge if 1st of month */}
              {day.dayNumber === 1 && (
                <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-indigo-500 text-[8px] font-bold text-white uppercase font-mono">
                  {day.monthShort}
                </span>
              )}

              {/* Day of week */}
              <span
                className={`text-[10px] font-mono uppercase tracking-wider ${
                  day.isSelected
                    ? 'text-indigo-200 font-bold'
                    : day.isToday
                    ? 'text-teal-300 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {day.dayOfWeek}
              </span>

              {/* Date number */}
              <span
                className={`text-lg sm:text-xl font-black font-mono my-0.5 leading-none ${
                  day.isSelected
                    ? 'text-white drop-shadow-sm'
                    : day.isToday
                    ? 'text-teal-200'
                    : 'text-slate-200 group-hover:text-white'
                }`}
              >
                {day.dayNumber}
              </span>

              {/* Scheduled Event Category Pips */}
              <div className="h-2 flex items-center justify-center gap-1 mt-1">
                {day.dayEvents.length > 0 ? (
                  day.dayEvents.slice(0, 3).map((ev, i) => (
                    <span
                      key={ev.id || i}
                      className={`w-1.5 h-1.5 rounded-full ${getCategoryPipColor(
                        ev.category
                      )} shadow-sm`}
                      title={ev.title}
                    />
                  ))
                ) : (
                  <span className="w-1 h-1 rounded-full bg-slate-800" />
                )}
                {day.dayEvents.length > 3 && (
                  <span className="text-[8px] font-mono text-slate-400 font-bold leading-none">
                    +{day.dayEvents.length - 3}
                  </span>
                )}
              </div>

              {/* Today indicator dot */}
              {day.isToday && !day.isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-teal-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
