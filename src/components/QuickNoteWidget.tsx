import React, { useState, useEffect, useRef } from 'react';
import {
  StickyNote,
  X,
  Pin,
  Check,
  Plus,
  Trash2,
  Copy,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { QuickNoteData, QuickNoteItem } from '../types/app';
import { soundEngine } from '../audio/soundEngine';

interface QuickNoteWidgetProps {
  quickNote?: QuickNoteData;
  onUpdateQuickNote: (data: QuickNoteData) => void;
  onAppendToJournal?: (text: string) => void;
  panelBgStyle?: React.CSSProperties;
}

const NOTE_COLORS = [
  { id: 'slate', name: 'Slate', bg: 'bg-slate-900/95', border: 'border-slate-700/80', dot: '#94a3b8' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-950/90', border: 'border-amber-700/80', dot: '#f59e0b' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-950/90', border: 'border-emerald-700/80', dot: '#10b981' },
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-950/90', border: 'border-indigo-700/80', dot: '#6366f1' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-950/90', border: 'border-rose-700/80', dot: '#f43f5e' },
];

export const QuickNoteWidget: React.FC<QuickNoteWidgetProps> = ({
  quickNote,
  onUpdateQuickNote,
  onAppendToJournal,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => quickNote?.isPinned ?? false);
  const [mode, setMode] = useState<'text' | 'checklist'>(quickNote?.mode || 'text');
  const [text, setText] = useState<string>(quickNote?.text || '');
  const [checklist, setChecklist] = useState<QuickNoteItem[]>(quickNote?.checklist || []);
  const [newItemText, setNewItemText] = useState('');
  const [copied, setCopied] = useState(false);
  const [journalAppended, setJournalAppended] = useState(false);
  const [colorId, setColorId] = useState<string>(quickNote?.color || 'slate');
  const [isPinned, setIsPinned] = useState<boolean>(quickNote?.isPinned ?? false);

  const saveTimeoutRef = useRef<number | null>(null);

  // Sync state if props change from outside
  useEffect(() => {
    if (quickNote) {
      if (quickNote.text !== undefined && quickNote.text !== text) {
        setText(quickNote.text);
      }
      if (quickNote.checklist && JSON.stringify(quickNote.checklist) !== JSON.stringify(checklist)) {
        setChecklist(quickNote.checklist);
      }
      if (quickNote.mode && quickNote.mode !== mode) {
        setMode(quickNote.mode);
      }
      if (quickNote.color && quickNote.color !== colorId) {
        setColorId(quickNote.color);
      }
      if (quickNote.isPinned !== undefined && quickNote.isPinned !== isPinned) {
        setIsPinned(quickNote.isPinned);
        if (quickNote.isPinned) setIsOpen(true);
      }
    }
  }, [quickNote]);

  const triggerPersist = (
    nextText: string,
    nextChecklist: QuickNoteItem[],
    nextMode: 'text' | 'checklist',
    nextColor: string,
    nextPinned: boolean
  ) => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      onUpdateQuickNote({
        text: nextText,
        checklist: nextChecklist,
        mode: nextMode,
        color: nextColor,
        isPinned: nextPinned,
        isMinimized: !isOpen,
        updatedAt: Date.now(),
      });
    }, 300);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    triggerPersist(val, checklist, mode, colorId, isPinned);
  };

  const handleAddChecklistItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    soundEngine.playUiClick();
    const updated = [
      ...checklist,
      { id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: trimmed, done: false },
    ];
    setChecklist(updated);
    setNewItemText('');
    triggerPersist(text, updated, mode, colorId, isPinned);
  };

  const handleToggleItem = (id: string) => {
    soundEngine.playHabitCheck(true);
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setChecklist(updated);
    triggerPersist(text, updated, mode, colorId, isPinned);
  };

  const handleDeleteItem = (id: string) => {
    soundEngine.playUiClick();
    const updated = checklist.filter((item) => item.id !== id);
    setChecklist(updated);
    triggerPersist(text, updated, mode, colorId, isPinned);
  };

  const handleClearNote = () => {
    soundEngine.playUiClick();
    setText('');
    setChecklist([]);
    triggerPersist('', [], mode, colorId, isPinned);
  };

  const handleCopy = () => {
    soundEngine.playNotification();
    const fullContent =
      mode === 'text'
        ? text
        : checklist.map((i) => `${i.done ? '[x]' : '[ ]'} ${i.text}`).join('\n');

    if (!fullContent.trim()) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullContent).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleSendToJournal = () => {
    const fullContent =
      mode === 'text'
        ? text
        : checklist.map((i) => `${i.done ? '✓' : '○'} ${i.text}`).join('\n');

    if (!fullContent.trim()) return;

    soundEngine.playNotification();
    if (onAppendToJournal) {
      onAppendToJournal(`\n\n### ⚡ Quick Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})\n${fullContent}`);
      setJournalAppended(true);
      setTimeout(() => setJournalAppended(false), 2500);
    }
  };

  const toggleOpen = () => {
    soundEngine.playDialogToggle(!isOpen);
    setIsOpen(!isOpen);
  };

  const togglePin = () => {
    soundEngine.playUiClick();
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    triggerPersist(text, checklist, mode, colorId, nextPinned);
  };

  const activeColorObj = NOTE_COLORS.find((c) => c.id === colorId) || NOTE_COLORS[0];
  const totalItems = checklist.length;
  const completedItems = checklist.filter((i) => i.done).length;
  const hasContent = text.trim().length > 0 || checklist.length > 0;

  return (
    <aside
      aria-label="Quick Note Widget"
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end transition-all duration-300"
    >
      {/* Expanded Floating Notepad Card */}
      {isOpen && (
        <div
          className={`w-80 sm:w-96 rounded-2xl border shadow-2xl backdrop-blur-xl mb-3 overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in zoom-in-95 ${activeColorObj.bg} ${activeColorObj.border}`}
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-black/20">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">⚡</span>
              <span className="text-xs font-bold text-white tracking-wide uppercase">
                Quick Note
              </span>
              {hasContent && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono-tabular">
                  {mode === 'checklist' ? `${completedItems}/${totalItems}` : `${text.length} chars`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Color dots */}
              <div className="flex items-center gap-1 mr-1">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setColorId(c.id);
                      triggerPersist(text, checklist, mode, c.id, isPinned);
                    }}
                    title={c.name}
                    className={`w-3 h-3 rounded-full transition-transform cursor-pointer ${
                      colorId === c.id ? 'scale-125 ring-1 ring-white' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.dot }}
                  />
                ))}
              </div>

              {/* Pin toggle */}
              <button
                type="button"
                onClick={togglePin}
                title={isPinned ? 'Unpin Quick Note' : 'Pin Quick Note (keep open)'}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isPinned
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={toggleOpen}
                title="Minimize Quick Note"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center px-3 pt-2 pb-1 gap-2 border-b border-white/5 bg-black/10 text-xs">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setMode('text');
                triggerPersist(text, checklist, 'text', colorId, isPinned);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                mode === 'text'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📝 Freeform Note
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setMode('checklist');
                triggerPersist(text, checklist, 'checklist', colorId, isPinned);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                mode === 'checklist'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ☑️ Mini Checklist
            </button>
          </div>

          {/* Body Content */}
          <div className="p-3 flex-1 overflow-y-auto min-h-[140px] max-h-[320px]">
            {mode === 'text' ? (
              <textarea
                value={text}
                onChange={handleTextChange}
                placeholder="Jot down transient thoughts, sudden ideas, or quick memos..."
                rows={6}
                className="w-full bg-black/25 text-slate-100 placeholder-slate-400/80 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400/50 resize-none leading-relaxed border border-white/5"
              />
            ) : (
              <div className="space-y-2">
                <form onSubmit={handleAddChecklistItem} className="flex gap-1.5 mb-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Add checklist item & press Enter..."
                    className="flex-1 bg-black/25 text-slate-100 placeholder-slate-400/80 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400/50 border border-white/5"
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 transition-colors cursor-pointer shrink-0"
                    title="Add item"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>

                {checklist.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-4">
                    No items yet. Type an item above to keep a transient to-do list.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-colors group"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            item.done
                              ? 'bg-emerald-500 border-emerald-400 text-white'
                              : 'border-slate-500 hover:border-amber-400'
                          }`}
                        >
                          {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                        <span
                          className={`flex-1 text-xs break-all ${
                            item.done
                              ? 'line-through text-slate-400'
                              : 'text-slate-200'
                          }`}
                        >
                          {item.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-400 transition-opacity cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Action Footer Bar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 bg-black/30 text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!hasContent}
                title="Copy note content to clipboard"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              {onAppendToJournal && (
                <button
                  type="button"
                  onClick={handleSendToJournal}
                  disabled={!hasContent}
                  title="Append this note into today's Journal entry"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>{journalAppended ? 'Sent to Journal!' : 'Send to Journal'}</span>
                </button>
              )}
            </div>

            {hasContent && (
              <button
                type="button"
                onClick={handleClearNote}
                title="Clear quick note"
                className="text-slate-400 hover:text-rose-300 p-1 rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Pill Button Trigger */}
      <button
        type="button"
        onClick={toggleOpen}
        title={isOpen ? 'Minimize Quick Note' : 'Open Floating Quick Note (jot transient thoughts)'}
        className={`group flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer ${
          isOpen
            ? 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800'
            : hasContent
            ? 'bg-amber-500/90 hover:bg-amber-500 text-white border-amber-300/50 shadow-amber-500/20 animate-pulse'
            : 'bg-slate-950/85 hover:bg-slate-900 border-slate-800 text-slate-300 shadow-slate-950/50'
        }`}
      >
        <StickyNote className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold tracking-wide">
          Quick Note
        </span>
        {hasContent && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
        )}
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
    </aside>
  );
};
