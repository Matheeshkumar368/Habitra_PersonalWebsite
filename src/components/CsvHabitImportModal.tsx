import React, { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Check,
  AlertCircle,
  X,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Habit, HabitFrequency } from '../types/app';

interface CsvHabitImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportHabits: (habitsData: Omit<Habit, 'id' | 'createdAt' | 'order'>[]) => void;
  existingHabits: Habit[];
  accentColor?: string;
}

interface ParsedHabitRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  goalDays: number;
  frequency: HabitFrequency;
  description: string;
  selected: boolean;
  isDuplicate: boolean;
  error?: string;
}

const DEFAULT_SAMPLE_CSV = `name,icon,goalDays,frequency,color,description
Morning Meditation,🧘,30,daily,#10b981,10 minutes of calm breathing and mindfulness
Drink 2L Water,💧,60,daily,#06b6d4,Stay hydrated throughout the workday
Read 20 Pages,📚,30,daily,#8b5cf6,Read non-fiction or inspiring books
Gym & Strength Workout,🏋️,45,weekdays,#f59e0b,Compound lifting and core training
Evening Screen-Free Wind-Down,🌙,21,daily,#6366f1,Dim lights and read before bed
Coding Practice & Deep Work,💻,50,weekdays,#ec4899,Solve algorithms and build side projects`;

/**
 * Intelligent emoji fallback based on keywords in habit title
 */
function guessHabitEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('water') || lower.includes('drink') || lower.includes('hydrate')) return '💧';
  if (lower.includes('meditat') || lower.includes('breathe') || lower.includes('mindful')) return '🧘';
  if (lower.includes('read') || lower.includes('book') || lower.includes('study')) return '📚';
  if (lower.includes('gym') || lower.includes('workout') || lower.includes('lift') || lower.includes('train')) return '🏋️';
  if (lower.includes('run') || lower.includes('walk') || lower.includes('jog') || lower.includes('cardio')) return '🏃';
  if (lower.includes('code') || lower.includes('dev') || lower.includes('program') || lower.includes('tech')) return '💻';
  if (lower.includes('sleep') || lower.includes('night') || lower.includes('bed')) return '🌙';
  if (lower.includes('write') || lower.includes('journal') || lower.includes('note')) return '✍️';
  if (lower.includes('clean') || lower.includes('tidy') || lower.includes('room')) return '✨';
  if (lower.includes('walk') || lower.includes('nature') || lower.includes('hike')) return '🌲';
  if (lower.includes('food') || lower.includes('eat') || lower.includes('diet') || lower.includes('cook')) return '🥗';
  if (lower.includes('stretch') || lower.includes('yoga')) return '🧘‍♂️';
  return '🎯';
}

/**
 * Robust CSV line splitter that handles quotes, escaped quotes, and commas
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses raw CSV content into validated habit objects
 */
function parseCsvContent(csvText: string, existingHabits: Habit[]): ParsedHabitRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Inspect first line as headers
  const firstLineCells = parseCsvLine(lines[0]);
  const hasHeader = firstLineCells.some((c) =>
    ['name', 'title', 'habit', 'habit_name', 'icon', 'emoji', 'goaldays', 'goal', 'frequency'].includes(
      c.toLowerCase().replace(/[^a-z]/g, '')
    )
  );

  let headerIndices = {
    name: 0,
    icon: 1,
    goalDays: 2,
    frequency: 3,
    color: 4,
    description: 5,
  };

  let dataLines = lines;

  if (hasHeader) {
    const normalized = firstLineCells.map((c) => c.toLowerCase().replace(/[^a-z]/g, ''));
    headerIndices = {
      name: normalized.findIndex((c) => ['name', 'title', 'habit', 'habitname'].includes(c)),
      icon: normalized.findIndex((c) => ['icon', 'emoji', 'badge'].includes(c)),
      goalDays: normalized.findIndex((c) => ['goaldays', 'goal', 'days', 'target', 'targetdays'].includes(c)),
      frequency: normalized.findIndex((c) => ['frequency', 'freq', 'schedule', 'period'].includes(c)),
      color: normalized.findIndex((c) => ['color', 'accent', 'hex', 'accentcolor'].includes(c)),
      description: normalized.findIndex((c) => ['description', 'desc', 'notes', 'note', 'details'].includes(c)),
    };

    // If name header not found, default to col 0
    if (headerIndices.name === -1) headerIndices.name = 0;
    dataLines = lines.slice(1);
  }

  const existingNames = new Set(existingHabits.map((h) => h.name.trim().toLowerCase()));
  const parsedRows: ParsedHabitRow[] = [];

  dataLines.forEach((line, index) => {
    if (!line.trim() || line.startsWith('#') || line.startsWith('//')) return;

    const cells = parseCsvLine(line);
    const rawName = (headerIndices.name >= 0 ? cells[headerIndices.name] : cells[0]) || '';
    const cleanName = rawName.replace(/^["']|["']$/g, '').trim();

    if (!cleanName) return; // Skip rows without name

    const rawIcon = (headerIndices.icon >= 0 ? cells[headerIndices.icon] : '') || '';
    const cleanIcon = rawIcon.replace(/^["']|["']$/g, '').trim() || guessHabitEmoji(cleanName);

    const rawGoal = (headerIndices.goalDays >= 0 ? cells[headerIndices.goalDays] : '') || '30';
    const parsedGoal = parseInt(rawGoal.replace(/\D/g, ''), 10);
    const goalDays = isNaN(parsedGoal) || parsedGoal <= 0 ? 30 : Math.min(365, parsedGoal);

    const rawFreq = (headerIndices.frequency >= 0 ? cells[headerIndices.frequency] : '') || 'daily';
    const cleanFreq = rawFreq.toLowerCase().replace(/[^a-z]/g, '');
    let frequency: HabitFrequency = 'daily';
    if (cleanFreq.includes('weekday')) frequency = 'weekdays';
    else if (cleanFreq.includes('weekend')) frequency = 'weekends';
    else if (cleanFreq.includes('custom')) frequency = 'custom';
    else if (cleanFreq.includes('interval')) frequency = 'interval';

    const rawColor = (headerIndices.color >= 0 ? cells[headerIndices.color] : '') || '#6366f1';
    const cleanColor = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
    const validColor = /^#[0-9A-Fa-f]{6}$/.test(cleanColor) ? cleanColor : '#6366f1';

    const rawDesc = (headerIndices.description >= 0 ? cells[headerIndices.description] : '') || '';
    const cleanDesc = rawDesc.replace(/^["']|["']$/g, '').trim();

    const isDuplicate = existingNames.has(cleanName.toLowerCase());

    parsedRows.push({
      id: `parsed_${index}_${Date.now()}`,
      name: cleanName,
      icon: cleanIcon,
      color: validColor,
      goalDays,
      frequency,
      description: cleanDesc,
      selected: !isDuplicate, // Default uncheck duplicates
      isDuplicate,
    });
  });

  return parsedRows;
}

export const CsvHabitImportModal: React.FC<CsvHabitImportModalProps> = ({
  isOpen,
  onClose,
  onImportHabits,
  existingHabits,
  accentColor = '#6366f1',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvText, setCsvText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedHabitRow[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcessCsv = (rawText: string) => {
    setCsvText(rawText);
    const rows = parseCsvContent(rawText, existingHabits);
    setParsedRows(rows);
    if (rows.length === 0) {
      setStatusMessage('No valid habit rows found in the CSV. Please check formatting.');
    } else {
      setStatusMessage(`Found ${rows.length} habit(s) in CSV. Review and confirm below.`);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        handleProcessCsv(content);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([DEFAULT_SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'habitra-habits-sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleRowSelection = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: select ? (skipDuplicates ? !r.isDuplicate : true) : false,
      }))
    );
  };

  const selectedCount = parsedRows.filter((r) => r.selected).length;

  const handleConfirmImport = () => {
    const selectedRows = parsedRows.filter((r) => r.selected);
    if (selectedRows.length === 0) return;

    const habitsToImport: Omit<Habit, 'id' | 'createdAt' | 'order'>[] = selectedRows.map((r) => ({
      name: r.name,
      icon: r.icon,
      color: r.color,
      goalDays: r.goalDays,
      frequency: r.frequency,
      startDate: new Date().toISOString().split('T')[0],
      description: r.description || undefined,
    }));

    onImportHabits(habitsToImport);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border border-slate-700/80 bg-slate-950/95 shadow-2xl p-5 sm:p-6 text-white my-8 overflow-hidden relative"
        style={{
          boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Import Habits from CSV</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  Bulk Upload
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bulk-upload habits from any spreadsheet, CSV export, or habit tracking app.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Zone & Actions */}
        <div className="mt-4 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-400 bg-indigo-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-300 mx-auto flex items-center justify-center mb-2.5">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-xs font-semibold text-white">
              Click to select a CSV file or drag and drop here
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Supports standard column headers: <code className="text-indigo-300">name, icon, goalDays, frequency, color, description</code>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download Sample CSV Template</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPasteArea((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showPasteArea ? 'Hide Text Input' : 'Paste CSV Text Directly'}</span>
            </button>
          </div>

          {showPasteArea && (
            <div className="space-y-2">
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV lines here..."
                rows={4}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleProcessCsv(csvText)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Parse CSV Text
              </button>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span>Habits Preview</span>
                  <span className="text-[11px] text-slate-400">
                    ({selectedCount} of {parsedRows.length} selected)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => {
                        const skip = e.target.checked;
                        setSkipDuplicates(skip);
                        if (skip) {
                          setParsedRows((prev) =>
                            prev.map((r) => (r.isDuplicate ? { ...r, selected: false } : r))
                          );
                        }
                      }}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Skip already existing habit names</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="text-[11px] text-slate-400 hover:underline cursor-pointer"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 divide-y divide-slate-800/80">
                {parsedRows.map((row) => (
                  <div
                    key={row.id}
                    onClick={() => handleToggleRowSelection(row.id)}
                    className={`p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                      row.selected
                        ? 'bg-indigo-950/20 hover:bg-indigo-950/30'
                        : 'opacity-50 hover:opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => handleToggleRowSelection(row.id)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />

                      <span className="text-lg shrink-0">{row.icon}</span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate max-w-xs">
                            {row.name}
                          </span>
                          {row.isDuplicate && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                              Already Exists
                            </span>
                          )}
                        </div>
                        {row.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-sm">
                            {row.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 uppercase font-mono">
                        {row.frequency}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-mono">
                        {row.goalDays}d goal
                      </span>
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: row.color }}
                        title={`Color: ${row.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={handleConfirmImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
              selectedCount === 0
                ? 'opacity-40 cursor-not-allowed bg-slate-800'
                : 'hover:opacity-95'
            }`}
            style={selectedCount > 0 ? { backgroundColor: accentColor } : undefined}
          >
            <Check className="w-4 h-4" />
            <span>Import {selectedCount} Habit(s)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
