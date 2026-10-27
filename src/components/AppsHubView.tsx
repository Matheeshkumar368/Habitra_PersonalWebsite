import React, { useState } from 'react';
import {
  Youtube,
  Radio,
  Music,
  Globe,
  ExternalLink,
  Search,
  CheckCircle2,
  Sparkles,
  Layers,
  Calendar,
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  Play,
  Pause,
} from 'lucide-react';
import {
  AudioSettings,
  CustomAppShortcut,
  NavigationTab,
  StyleSettings,
} from '../types/app';
import { soundEngine } from '../audio/soundEngine';

interface AppsHubViewProps {
  customShortcuts: CustomAppShortcut[];
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
  audioSettings: AudioSettings;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onSaveShortcuts: (shortcuts: CustomAppShortcut[]) => void;
}

export const AppsHubView: React.FC<AppsHubViewProps> = ({
  customShortcuts,
  styleSettings,
  panelBgStyle,
  audioSettings,
  onUpdateAudio,
  onNavigateTab,
  onSaveShortcuts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [launchFeedback, setLaunchFeedback] = useState<string | null>(null);
  const [pauseAudioOnLaunch, setPauseAudioOnLaunch] = useState(true);

  // Modal State for Adding / Editing Shortcuts
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<CustomAppShortcut | null>(null);
  const [shortcutName, setShortcutName] = useState('');
  const [shortcutIcon, setShortcutIcon] = useState('✨');
  const [shortcutUrl, setShortcutUrl] = useState('');
  const [shortcutCategory, setShortcutCategory] = useState<'media' | 'tools' | 'productivity' | 'custom'>('custom');
  const [shortcutDescription, setShortcutDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Safe URL validator
  const validateUrl = (urlStr: string): boolean => {
    const trimmed = urlStr.trim().toLowerCase();
    if (trimmed.startsWith('habitra://')) return true;
    if (trimmed.startsWith('spotify:')) return true;
    if (trimmed.startsWith('mailto:')) return true;
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleOpenApp = (shortcut: CustomAppShortcut) => {
    soundEngine.playUiClick();

    // Check if internal target
    if (shortcut.url.startsWith('habitra://')) {
      const target = shortcut.url.replace('habitra://', '') as NavigationTab;
      onNavigateTab(target);
      setLaunchFeedback(`✓ Navigated to ${shortcut.name}`);
      window.setTimeout(() => setLaunchFeedback(null), 2500);
      return;
    }

    // Single source playback coordination: pause Habitra audio when launching external media apps
    if (pauseAudioOnLaunch && audioSettings.isPlaying) {
      onUpdateAudio({ isPlaying: false });
    }

    const isExternalMedia =
      shortcut.category === 'media' ||
      shortcut.url.includes('youtube') ||
      shortcut.url.includes('spotify');

    if (typeof window !== 'undefined') {
      const desktop = (
        window as unknown as {
          habitraDesktop?: { openExternal?: (u: string) => Promise<boolean> };
        }
      ).habitraDesktop;

      if (desktop?.openExternal) {
        desktop.openExternal(shortcut.url).then((success) => {
          if (success) {
            setLaunchFeedback(
              isExternalMedia
                ? `✓ Opened ${shortcut.name} in external application. Habitra playback paused.`
                : `✓ Launched ${shortcut.name}`
            );
          } else {
            setLaunchFeedback(`⚠ Could not open native app. Using browser fallback.`);
            window.open(shortcut.url, '_blank', 'noopener,noreferrer');
          }
          window.setTimeout(() => setLaunchFeedback(null), 4000);
        });
        return;
      }

      window.open(shortcut.url, '_blank', 'noopener,noreferrer');
      setLaunchFeedback(
        isExternalMedia
          ? `✓ Opened ${shortcut.name} in browser. Playback is now controlled externally.`
          : `✓ Opened ${shortcut.name}`
      );
      window.setTimeout(() => setLaunchFeedback(null), 4000);
    }
  };

  const openCreateModal = () => {
    soundEngine.playDialogToggle(true);
    setEditingShortcut(null);
    setShortcutName('');
    setShortcutIcon('✨');
    setShortcutUrl('');
    setShortcutCategory('custom');
    setShortcutDescription('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (shortcut: CustomAppShortcut) => {
    soundEngine.playDialogToggle(true);
    setEditingShortcut(shortcut);
    setShortcutName(shortcut.name);
    setShortcutIcon(shortcut.icon || '✨');
    setShortcutUrl(shortcut.url);
    setShortcutCategory(shortcut.category || 'custom');
    setShortcutDescription(shortcut.description || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveModalShortcut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcutName.trim()) {
      setFormError('Please provide an application name.');
      soundEngine.playWarningTone();
      return;
    }
    if (!validateUrl(shortcutUrl)) {
      setFormError('Please provide a valid URL (https://..., spotify:..., or habitra://...).');
      soundEngine.playWarningTone();
      return;
    }

    soundEngine.playSaveSuccess();

    if (editingShortcut) {
      const updated = customShortcuts.map((s) =>
        s.id === editingShortcut.id
          ? {
              ...s,
              name: shortcutName.trim(),
              icon: shortcutIcon.trim() || '✨',
              url: shortcutUrl.trim(),
              category: shortcutCategory,
              description: shortcutDescription.trim(),
            }
          : s
      );
      onSaveShortcuts(updated);
    } else {
      const newShortcut: CustomAppShortcut = {
        id: `shortcut_${Date.now()}`,
        name: shortcutName.trim(),
        icon: shortcutIcon.trim() || '✨',
        url: shortcutUrl.trim(),
        category: shortcutCategory,
        description: shortcutDescription.trim(),
        isDefault: false,
      };
      onSaveShortcuts([...customShortcuts, newShortcut]);
    }

    setModalOpen(false);
  };

  const handleDeleteShortcut = (id: string) => {
    soundEngine.playUiClick();
    const updated = customShortcuts.filter((s) => s.id !== id);
    onSaveShortcuts(updated);
  };

  const categories = ['all', 'media', 'productivity', 'tools', 'custom'];

  const filteredShortcuts = customShortcuts.filter((s) => {
    const matchesCategory =
      selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fadeIn">
      {/* 1. Header Banner */}
      <div
        className="p-6 rounded-3xl border border-slate-800/90 shadow-2xl relative overflow-hidden"
        style={panelBgStyle}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200">
                  Application Launcher
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Habitra Apps Hub
                </span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
                Apps &amp; Quick Launchers
              </h1>
              <p className="text-xs text-slate-400">
                Launch external music services, your default browser, or jump directly to Habitra productivity tools.
              </p>
            </div>
          </div>

          {/* Search bar & Add Button */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add App</span>
            </button>
          </div>
        </div>

        {/* Category Pills & Playback Switch Option */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setSelectedCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-900/70 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pauseAudioOnLaunch}
              onChange={(e) => {
                soundEngine.playToggle(e.target.checked);
                setPauseAudioOnLaunch(e.target.checked);
              }}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Pause Habitra audio before launching external apps</span>
          </label>
        </div>

        {/* Launch Feedback Banner */}
        {launchFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{launchFeedback}</span>
          </div>
        )}
      </div>

      {/* 2. Grid of Application Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShortcuts.map((card) => {
          const isInternal = card.url.startsWith('habitra://');

          return (
            <div
              key={card.id}
              className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between group"
              style={panelBgStyle}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border bg-slate-800/80 border-slate-700 text-xl">
                    {card.icon}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase tracking-wider bg-slate-800/80 border-slate-700 text-slate-300">
                      {card.category || 'App'}
                    </span>
                    {!card.isDefault && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEditModal(card)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                          title="Edit shortcut"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShortcut(card.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Remove shortcut"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {card.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {card.description || card.url}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleOpenApp(card)}
                  className={`w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow ${
                    isInternal
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                  }`}
                >
                  {isInternal ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Open in Habitra</span>
                    </>
                  ) : (
                    <>
                      <span>Open Application</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredShortcuts.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-lg">🧩</div>
          <p className="text-slate-300 font-medium">
            {searchQuery ? `No applications match "${searchQuery}".` : 'No custom application shortcuts configured yet.'}
          </p>
          <p className="text-slate-500 text-xs max-w-sm">
            Launch your daily workspace tools (Notion, Spotify, Discord, Figma) directly from Habitra with single-source audio pause.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Shortcut</span>
          </button>
        </div>
      )}

      {/* 3. Modal: Add / Edit Shortcut */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{editingShortcut ? 'Edit Application Shortcut' : 'Add Application Shortcut'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalShortcut} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Application Name *
                </label>
                <input
                  type="text"
                  value={shortcutName}
                  onChange={(e) => setShortcutName(e.target.value)}
                  placeholder="e.g. Notion, Discord, GitHub"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Emoji / Icon
                  </label>
                  <input
                    type="text"
                    value={shortcutIcon}
                    onChange={(e) => setShortcutIcon(e.target.value)}
                    placeholder="🚀"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={shortcutCategory}
                    onChange={(e) => setShortcutCategory(e.target.value as typeof shortcutCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="media">Media &amp; Music</option>
                    <option value="productivity">Productivity</option>
                    <option value="tools">Tools &amp; Dev</option>
                    <option value="custom">General / Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Website URL or Launch Target *
                </label>
                <input
                  type="text"
                  value={shortcutUrl}
                  onChange={(e) => setShortcutUrl(e.target.value)}
                  placeholder="https://... or spotify:... or habitra://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Supports standard secure HTTPS links, Spotify URI protocol, or Habitra internal paths.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={shortcutDescription}
                  onChange={(e) => setShortcutDescription(e.target.value)}
                  placeholder="Short note about what this tool is for..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow cursor-pointer transition-colors"
                >
                  {editingShortcut ? 'Save Changes' : 'Add Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footnote */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Single-source playback guarantee: opening external media pauses Habitra audio automatically.
          </span>
        </div>
        <span className="text-slate-500 hidden sm:inline">Habitra 2.7 Apps Hub</span>
      </div>
    </div>
  );
};
