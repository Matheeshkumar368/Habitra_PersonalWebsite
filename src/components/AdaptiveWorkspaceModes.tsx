import React from 'react';
import {
  Compass,
  Timer as TimerIcon,
  Calendar as CalendarIcon,
  PiggyBank,
  TreePine,
  Sparkles,
  BookmarkCheck,
} from 'lucide-react';
import { NavigationTab, WorkspaceMode } from '../types/app';
import { soundEngine } from '../audio/soundEngine';

export interface AdaptiveWorkspaceModesProps {
  currentMode: WorkspaceMode;
  defaultMode?: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  onSetDefaultMode: (mode: WorkspaceMode) => void;
  onNavigateTab: (tab: NavigationTab) => void;
}

export const WORKSPACE_MODES: Array<{
  id: WorkspaceMode;
  label: string;
  tagline: string;
  icon: React.ElementType;
  primaryTab: NavigationTab;
  accentClass: string;
  borderClass: string;
}> = [
  {
    id: 'daily_life',
    label: 'Daily Life',
    tagline: 'Habits, progress, and balanced daily rhythm',
    icon: Sparkles,
    primaryTab: 'dashboard',
    accentClass: 'text-indigo-400 bg-indigo-500/15',
    borderClass: 'border-indigo-500/40',
  },
  {
    id: 'focus',
    label: 'Focus',
    tagline: 'Distraction-free deep work and Pomodoro timer',
    icon: TimerIcon,
    primaryTab: 'timer',
    accentClass: 'text-cyan-400 bg-cyan-500/15',
    borderClass: 'border-cyan-500/40',
  },
  {
    id: 'planning',
    label: 'Planning',
    tagline: 'Calendar timetable, milestones, and commitments',
    icon: CalendarIcon,
    primaryTab: 'calendar',
    accentClass: 'text-sky-400 bg-sky-500/15',
    borderClass: 'border-sky-500/40',
  },
  {
    id: 'finance',
    label: 'Finance',
    tagline: 'FINSA balances, spending studio, and savings vault',
    icon: PiggyBank,
    primaryTab: 'finsa',
    accentClass: 'text-amber-400 bg-amber-500/15',
    borderClass: 'border-amber-500/40',
  },
  {
    id: 'relax',
    label: 'Relax',
    tagline: 'Pixel Sanctuary living world and lo-fi audio atmosphere',
    icon: TreePine,
    primaryTab: 'myspace',
    accentClass: 'text-emerald-400 bg-emerald-500/15',
    borderClass: 'border-emerald-500/40',
  },
];

export const AdaptiveWorkspaceModes: React.FC<AdaptiveWorkspaceModesProps> = ({
  currentMode,
  defaultMode = 'daily_life',
  onSelectMode,
  onSetDefaultMode,
  onNavigateTab,
}) => {
  const handleModeChange = (modeObj: typeof WORKSPACE_MODES[0]) => {
    soundEngine.playTabSwitch();
    onSelectMode(modeObj.id);
    onNavigateTab(modeObj.primaryTab);
  };

  return (
    <div
      role="toolbar"
      aria-label="Adaptive Workspace Modes"
      className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md overflow-x-auto no-scrollbar shadow-inner"
    >
      <div className="hidden lg:flex items-center gap-1.5 px-2 text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider select-none shrink-0 border-r border-slate-800 pr-2.5">
        <Compass className="w-3.5 h-3.5 text-indigo-400" />
        <span>Mode:</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {WORKSPACE_MODES.map((m) => {
          const Icon = m.icon;
          const isActive = currentMode === m.id;
          const isDefault = defaultMode === m.id;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModeChange(m)}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                isActive
                  ? `${m.accentClass} ${m.borderClass} border shadow-md text-white font-bold`
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title={`${m.label}: ${m.tagline}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{m.label}</span>

              {isDefault && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                  title="Default launch mode"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
