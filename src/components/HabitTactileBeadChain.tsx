import React, { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { HabitCompletionMap } from '../types/app';
import { formatLocalYMD } from '../constants/scenesAndPresets';
import { isHabitCompleted } from '../utils/habitStats';
import { soundEngine } from '../audio/soundEngine';

interface HabitTactileBeadChainProps {
  habitId: string;
  habitName: string;
  completions: HabitCompletionMap;
  selectedDate: Date;
  reducedMotion?: boolean;
  accentColor?: string;
  onToggleDate: (habitId: string, dateStr: string) => void;
}

interface ParticleBloom {
  key: string;
  x: number;
  y: number;
}

export const HabitTactileBeadChain: React.FC<HabitTactileBeadChainProps> = ({
  habitId,
  habitName,
  completions,
  selectedDate,
  reducedMotion = false,
  accentColor = '#14b8a6',
  onToggleDate,
}) => {
  const [activeBloomKey, setActiveBloomKey] = useState<string | null>(null);

  // Generate 7 days ending at selectedDate
  const days = React.useMemo(() => {
    const list: { date: Date; dateStr: string; dayAbbr: string; dayNum: number; isToday: boolean }[] = [];
    const todayStr = formatLocalYMD(new Date());

    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - i);
      const dateStr = formatLocalYMD(d);
      const dayAbbr = d.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W, T, F, S, S
      const dayNum = d.getDate();
      list.push({
        date: d,
        dateStr,
        dayAbbr,
        dayNum,
        isToday: dateStr === todayStr,
      });
    }
    return list;
  }, [selectedDate]);

  const handleBeadClick = (e: React.MouseEvent, dateStr: string, completedNow: boolean) => {
    e.stopPropagation();

    // Trigger organic sprout bloom animation
    if (!reducedMotion) {
      const bloomKey = `${habitId}_${dateStr}_${Date.now()}`;
      setActiveBloomKey(bloomKey);
      setTimeout(() => {
        setActiveBloomKey((prev) => (prev === bloomKey ? null : prev));
      }, 700);
    }

    soundEngine.playHabitCheck(!completedNow);
    onToggleDate(habitId, dateStr);
  };

  return (
    <div className="relative mt-2.5 pt-2 border-t border-slate-800/60 select-none">
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1.5 px-0.5">
        <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-slate-400">
          <Sparkles className="w-2.5 h-2.5 text-teal-400" />
          <span>7-Day Tactile Bead Chain</span>
        </span>
        <span className="text-[9px] text-slate-400">Tap bead to check</span>
      </div>

      {/* The 7 tactile beads strand */}
      <div className="flex items-center justify-between gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-slate-800/80">
        {days.map((day) => {
          const completed = isHabitCompleted(completions, habitId, day.dateStr);
          const isBloom = activeBloomKey?.startsWith(`${habitId}_${day.dateStr}`);

          return (
            <div key={day.dateStr} className="relative flex-1 flex flex-col items-center">
              {/* Floating micro bloom particles on completion */}
              {isBloom && !reducedMotion && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center animate-bounce">
                  <span className="text-[10px]">✨🌱</span>
                  <span className="text-[8px] font-bold text-teal-300 font-mono whitespace-nowrap bg-slate-950/90 px-1 rounded shadow">
                    +25 XP
                  </span>
                </div>
              )}

              {/* Day label */}
              <span
                className={`text-[9px] font-mono leading-none mb-1 ${
                  day.isToday ? 'text-teal-300 font-bold' : 'text-slate-400'
                }`}
              >
                {day.dayAbbr}
              </span>

              {/* The Tactile Bead Button */}
              <button
                type="button"
                onClick={(e) => handleBeadClick(e, day.dateStr, completed)}
                aria-label={`${habitName} on ${day.dateStr}: ${completed ? 'Completed' : 'Incomplete'}`}
                className={`group relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  day.isToday
                    ? 'ring-2 ring-teal-400/40'
                    : ''
                } ${
                  completed
                    ? 'bg-gradient-to-b from-teal-400 via-emerald-500 to-teal-700 border-teal-300 text-slate-950 shadow-[0_2px_8px_rgba(20,184,166,0.4),inset_0_1px_2px_rgba(255,255,255,0.6)]'
                    : 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-slate-700/80 hover:border-slate-500 text-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
                } ${
                  reducedMotion
                    ? 'hover:brightness-125'
                    : 'hover:-translate-y-0.5 hover:scale-105 active:scale-95'
                }`}
                title={`${day.date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short',
                })} — ${completed ? 'Completed (click to undo)' : 'Pending (click to complete)'}`}
              >
                {completed ? (
                  <Check className="w-3.5 h-3.5 stroke-[3] drop-shadow-sm" />
                ) : (
                  <span className="text-[10px] font-mono font-bold opacity-60 group-hover:opacity-100">
                    {day.dayNum}
                  </span>
                )}

                {/* Subtle bead jewel highlight cap */}
                {completed && (
                  <div className="absolute top-0.5 left-1 right-1 h-1 rounded-t-lg bg-white/40 pointer-events-none" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
