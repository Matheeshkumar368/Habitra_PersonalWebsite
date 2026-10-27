import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Plus,
  Volume2,
  Sparkles,
  Flame,
  Clock,
  ArrowRight,
  Minimize2,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';
import {
  AudioSettings,
  StyleSettings,
  TimerMode,
  TimerSettings,
} from '../types/app';
import { soundEngine } from '../audio/soundEngine';
import { AudioReactiveVisualizer } from './AudioReactiveVisualizer';

interface SpatialFocusPortalProps {
  timer: TimerSettings;
  secondsRemaining: number;
  isTimerRunning: boolean;
  onStartPauseTimer: () => void;
  onResetTimer: () => void;
  onSkipTimer: () => void;
  onChangeTimerMode: (mode: TimerMode) => void;
  onUpdateTimerSettings: (patch: Partial<TimerSettings>) => void;
  audio: AudioSettings;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  styleSettings: StyleSettings;
  onClosePortal?: () => void;
  isFullWorkspace?: boolean;
}

export const SpatialFocusPortal: React.FC<SpatialFocusPortalProps> = ({
  timer,
  secondsRemaining,
  isTimerRunning,
  onStartPauseTimer,
  onResetTimer,
  onSkipTimer,
  onChangeTimerMode,
  onUpdateTimerSettings,
  audio,
  onUpdateAudio,
  styleSettings,
  onClosePortal,
  isFullWorkspace = false,
}) => {
  const [focusIntention, setFocusIntention] = useState('Deep Flow Session');
  const [isEditingIntention, setIsEditingIntention] = useState(false);

  const reducedMotion = Boolean(styleSettings.reducedMotion);

  // Time formatting
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Calculate total seconds for current mode
  const totalModeSeconds = React.useMemo(() => {
    switch (timer.mode) {
      case 'focus':
        return timer.focusMinutes * 60;
      case 'short_break':
        return timer.shortBreakMinutes * 60;
      case 'long_break':
        return timer.longBreakMinutes * 60;
      default:
        return 25 * 60;
    }
  }, [timer.mode, timer.focusMinutes, timer.shortBreakMinutes, timer.longBreakMinutes]);

  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round(((totalModeSeconds - secondsRemaining) / Math.max(1, totalModeSeconds)) * 100))
  );

  const handleQuickAddFive = () => {
    soundEngine.playStepChange();
    const currentMins = timer.focusMinutes;
    onUpdateTimerSettings({ focusMinutes: currentMins + 5 });
  };

  const handleToggleTimer = () => {
    soundEngine.playToggle(isTimerRunning);
    onStartPauseTimer();
  };

  const ambientSoundscapes = [
    { id: 'rain', label: 'Rain', icon: '🌧️' },
    { id: 'forest', label: 'Forest', icon: '🌲' },
    { id: 'ocean', label: 'Ocean', icon: '🌊' },
    { id: 'cafe', label: 'Cafe', icon: '☕' },
    { id: 'fireplace', label: 'Fireplace', icon: '🔥' },
    { id: 'silent', label: 'Mute', icon: '🔇' },
  ];

  return (
    <div
      className={`relative z-20 w-full rounded-3xl border-2 transition-all duration-700 select-none overflow-hidden ${
        isFullWorkspace
          ? 'p-6 sm:p-10 border-indigo-500/40 bg-gradient-to-b from-[#0a0f1d] via-[#050811] to-[#020409] shadow-[0_25px_60px_rgba(0,0,0,0.95)]'
          : 'p-5 sm:p-7 border-teal-500/35 bg-gradient-to-b from-[#0d141e]/95 via-[#080d15]/95 to-[#04070c]/98 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)]'
      }`}
    >
      {/* Background Radial Focus Bloom */}
      <div
        className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-1000 ${
          isTimerRunning
            ? 'bg-teal-400 scale-125'
            : timer.mode === 'focus'
            ? 'bg-indigo-500 scale-100'
            : 'bg-emerald-500 scale-100'
        }`}
      />

      {/* Header Bar: Status & Close */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Spatial Focus Portal
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  isTimerRunning
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isTimerRunning ? 'Flow In Progress' : 'Zen Rest'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sanctuary depth receding into tranquil acoustic flow.
            </p>
          </div>
        </div>

        {onClosePortal && (
          <button
            type="button"
            onClick={onClosePortal}
            aria-label="Return to Sanctuary"
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
            title="Return Sanctuary to crisp foreground"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sanctuary View</span>
          </button>
        )}
      </div>

      {/* Mode Selector Tabs */}
      <div className="relative z-10 flex items-center justify-center gap-2 mb-6">
        <div className="p-1 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onChangeTimerMode('focus');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              timer.mode === 'focus'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Focus ({timer.focusMinutes}m)
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onChangeTimerMode('short_break');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              timer.mode === 'short_break'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Short Break ({timer.shortBreakMinutes}m)
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onChangeTimerMode('long_break');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              timer.mode === 'long_break'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Long Break ({timer.longBreakMinutes}m)
          </button>
        </div>
      </div>

      {/* Center: The Zen Focus Monolith & Breathing Ring */}
      <div className="relative z-10 flex flex-col items-center justify-center my-4">
        {/* Breathing Ring Shell */}
        <div
          className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-700 shadow-2xl ${
            isTimerRunning
              ? 'border-teal-400/60 shadow-[0_0_50px_rgba(20,184,166,0.25)]'
              : 'border-slate-800 shadow-[inset_0_4px_16px_rgba(0,0,0,0.8)]'
          } ${!reducedMotion && isTimerRunning ? 'animate-pulse' : ''}`}
          style={{
            animationDuration: '4s',
          }}
        >
          {/* Radial Circular Progress Border */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(30, 41, 59, 0.4)"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={timer.mode === 'focus' ? '#14b8a6' : '#10b981'}
              strokeWidth="4"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * progressPercent) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Time Countdown Display */}
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            {timeFormatted}
          </div>

          {/* Intention / Active Focus Task */}
          <div className="mt-2 text-center px-4 max-w-[200px]">
            {isEditingIntention ? (
              <input
                type="text"
                value={focusIntention}
                onChange={(e) => setFocusIntention(e.target.value)}
                onBlur={() => setIsEditingIntention(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingIntention(false)}
                autoFocus
                className="w-full text-center text-xs font-mono text-teal-300 bg-slate-900 border border-teal-500 rounded px-1.5 py-0.5 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingIntention(true)}
                className="text-xs font-medium text-slate-300 hover:text-teal-200 transition-colors cursor-pointer truncate block w-full"
                title="Click to edit session focus goal"
              >
                {focusIntention} ✏️
              </button>
            )}
            <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
              {progressPercent}% Complete
            </span>
          </div>

          {/* Audio Reactive Visualizer integrated into monolith core */}
          <div className="mt-3 w-32 h-6 flex items-center justify-center opacity-85">
            <AudioReactiveVisualizer
              isPlaying={isTimerRunning || Boolean(audio.isPlaying || audio.ambientPlaying)}
              volume={audio.musicVolume ?? 40}
              accentColor="#14b8a6"
              variant="compact"
            />
          </div>
        </div>
      </div>

      {/* Tactile Control Buttons Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 mt-6">
        {/* Play / Pause Toggle Button */}
        <button
          type="button"
          onClick={handleToggleTimer}
          className={`px-6 py-2.5 rounded-2xl font-mono text-sm font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer shadow-xl ${
            isTimerRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
              : 'bg-teal-500 hover:bg-teal-400 text-slate-950 active:scale-95 shadow-teal-900/40'
          }`}
        >
          {isTimerRunning ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause Session</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Enter Focus Flow</span>
            </>
          )}
        </button>

        {/* Quick Add +5m Button */}
        <button
          type="button"
          onClick={handleQuickAddFive}
          className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
          title="Add +5 minutes to this session"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+5m</span>
        </button>

        {/* Reset Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onResetTimer();
          }}
          className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
          title="Reset timer to beginning"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Skip to Next Mode */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onSkipTimer();
          }}
          className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
          title="Skip to next phase (focus/break)"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Ambient Soundscape Quick Switcher */}
      <div className="relative z-10 mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Volume2 className="w-3.5 h-3.5 text-teal-400" />
          <span>Ambient Audio Flow:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {ambientSoundscapes.map((amb) => {
            const active = audio.ambientPlaying && audio.ambientSoundId === amb.id;
            return (
              <button
                key={amb.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  if (amb.id === 'silent') {
                    onUpdateAudio({ ambientPlaying: false, ambientSoundId: 'silent' });
                  } else {
                    onUpdateAudio({ ambientPlaying: true, ambientSoundId: amb.id as any });
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                  active
                    ? 'bg-teal-500/25 border border-teal-400 text-teal-200 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{amb.icon}</span>
                <span>{amb.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Focus Rhythm Statistics Footer */}
      <div className="relative z-10 mt-4 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
          <span>Today's Sessions: <strong className="text-white">{timer.sessionsCompletedToday}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          <span>Total Deep Work: <strong className="text-teal-300">{timer.totalFocusMinutesToday} mins</strong></span>
        </div>
      </div>
    </div>
  );
};
