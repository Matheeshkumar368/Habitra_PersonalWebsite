import React, { useState, useMemo } from 'react';
import {
  Keyboard,
  X,
  Search,
  Command,
  Compass,
  Play,
  Volume2,
  Clock,
  Sparkles,
  Maximize2,
  Plus,
  Layers,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
}

interface ShortcutItem {
  keyCombo: string[];
  description: string;
  category: 'Navigation' | 'Media & Sound' | 'Focus & Sanctuary' | 'Productivity';
}

const SHORTCUTS_LIST: ShortcutItem[] = [
  // Navigation
  { keyCombo: ['Ctrl', 'K'], description: 'Open Universal Command Palette & Search', category: 'Navigation' },
  { keyCombo: ['1'], description: 'Jump to Dashboard & Sanctuary', category: 'Navigation' },
  { keyCombo: ['2'], description: 'Jump to Habits Rituals', category: 'Navigation' },
  { keyCombo: ['3'], description: 'Jump to Calendar & Events', category: 'Navigation' },
  { keyCombo: ['4'], description: 'Jump to Goals & Milestones', category: 'Navigation' },
  { keyCombo: ['5'], description: 'Jump to Focus Timer Studio', category: 'Navigation' },
  { keyCombo: ['6'], description: 'Jump to Music & Video Player', category: 'Navigation' },
  { keyCombo: ['7'], description: 'Jump to FINSA Financial Terminal', category: 'Navigation' },
  { keyCombo: ['8'], description: 'Jump to Statistics & Streaks', category: 'Navigation' },
  { keyCombo: ['9'], description: 'Jump to Settings & Backups', category: 'Navigation' },

  // Focus & Sanctuary
  { keyCombo: ['T'], description: 'Start / Pause Focus Timer Sprint', category: 'Focus & Sanctuary' },
  { keyCombo: ['F'], description: 'Toggle Full-Screen Ambient Sanctuary Mode', category: 'Focus & Sanctuary' },
  { keyCombo: ['W'], description: 'Toggle Desktop Quick Widget (Floating Deck)', category: 'Focus & Sanctuary' },

  // Media & Sound
  { keyCombo: ['Space'], description: 'Play / Pause Current Track or Video', category: 'Media & Sound' },
  { keyCombo: ['M'], description: 'Toggle Audio Mute / Unmute', category: 'Media & Sound' },

  // Productivity
  { keyCombo: ['N'], description: 'Create New Habit Ritual', category: 'Productivity' },
  { keyCombo: ['?'], description: 'Open This Keyboard Shortcuts Guide', category: 'Productivity' },
  { keyCombo: ['Esc'], description: 'Close Active Modal, Drawer, or Palette', category: 'Productivity' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  accentColor = '#6366f1',
}) => {
  const [search, setSearch] = useState('');

  const filteredShortcuts = useMemo(() => {
    if (!search.trim()) return SHORTCUTS_LIST;
    const q = search.toLowerCase();
    return SHORTCUTS_LIST.filter(
      (s) =>
        s.description.toLowerCase().includes(q) ||
        s.keyCombo.some((k) => k.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  const categories = ['Navigation', 'Focus & Sanctuary', 'Media & Sound', 'Productivity'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow"
              style={{ backgroundColor: `${accentColor}25`, border: `1px solid ${accentColor}50` }}
            >
              <Keyboard className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Keyboard Command Center</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  DESKTOP QUICK KEYS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Speed through your habits, focus sessions, and finance with tactile keystrokes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shortcut (e.g. Timer, Space, FINSA, 1-9)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
        </div>

        {/* Shortcuts Categories */}
        <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const inCategory = filteredShortcuts.filter((s) => s.category === cat);
            if (inCategory.length === 0) return null;

            return (
              <div key={cat} className="space-y-2">
                <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
                  {cat}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inCategory.map((sc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3"
                    >
                      <span className="text-xs text-slate-200 truncate">
                        {sc.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {sc.keyCombo.map((k, ki) => (
                          <kbd
                            key={ki}
                            className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-slate-200 shadow-xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              No shortcuts found matching &quot;{search}&quot;.
            </div>
          )}
        </div>

        {/* Footnote */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">?</kbd> anytime to open this sheet</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
