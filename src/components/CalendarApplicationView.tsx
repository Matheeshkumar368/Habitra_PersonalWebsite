import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Tag,
  AlertCircle,
  Search,
  Filter,
  Trash2,
  Edit2,
  X,
  Bell,
  Star,
  Sparkles,
  CalendarDays,
  CalendarRange,
  ListOrdered,
  Grid,
} from 'lucide-react';
import {
  CalendarEvent,
  CalendarEventCategory,
  CalendarEventRecurrence,
  StyleSettings,
} from '../types/app';
import { formatLocalYMD } from '../constants/scenesAndPresets';
import { soundEngine } from '../audio/soundEngine';
import { ElasticChronoRibbon } from './ElasticChronoRibbon';

interface CalendarApplicationViewProps {
  events: CalendarEvent[];
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
  onUpdateEvents: (events: CalendarEvent[]) => void;
  onQuickCreateTask?: (title: string) => void;
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'year';

const CATEGORY_COLORS: Record<CalendarEventCategory, { bg: string; text: string; border: string; label: string }> = {
  work: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', label: 'Work' },
  personal: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'Personal' },
  health: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30', label: 'Health' },
  study: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', label: 'Study' },
  birthday: { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30', label: 'Birthday' },
  anniversary: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', label: 'Anniversary' },
  important: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30', label: 'Important' },
  other: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30', label: 'General' },
};

export const CalendarApplicationView: React.FC<CalendarApplicationViewProps> = ({
  events,
  styleSettings,
  panelBgStyle,
  onUpdateEvents,
  onQuickCreateTask,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State for Event Creation / Editing
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarEvent | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formLocation, setFormLocation] = useState('');
  const [formCategory, setFormCategory] = useState<CalendarEventCategory>('personal');
  const [formColor, setFormColor] = useState('#6366f1');
  const [formReminder, setFormReminder] = useState<number>(15);
  const [formRecurrence, setFormRecurrence] = useState<CalendarEventRecurrence>('none');
  const [formImportant, setFormImportant] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const todayStr = formatLocalYMD(new Date());

  // Navigation handlers
  const handleNavigatePeriod = (delta: number) => {
    soundEngine.playUiClick();
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() + delta);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() + delta * 7);
      } else if (viewMode === 'day') {
        next.setDate(next.getDate() + delta);
      } else if (viewMode === 'year') {
        next.setFullYear(next.getFullYear() + delta);
      }
      return next;
    });
  };

  const handleResetToToday = () => {
    soundEngine.playUiClick();
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Open Create Event Modal
  const openCreateModal = (defaultDateStr?: string) => {
    soundEngine.playDialogToggle(true);
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(defaultDateStr || formatLocalYMD(selectedDate));
    setFormEndDate('');
    setFormAllDay(false);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormLocation('');
    setFormCategory('personal');
    setFormColor('#6366f1');
    setFormReminder(15);
    setFormRecurrence('none');
    setFormImportant(false);
    setFormError(null);
    setEventModalOpen(true);
  };

  // Open Edit Event Modal
  const openEditModal = (event: CalendarEvent) => {
    soundEngine.playDialogToggle(true);
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || '');
    setFormDate(event.date);
    setFormEndDate(event.endDate || '');
    setFormAllDay(Boolean(event.allDay));
    setFormStartTime(event.startTime || '09:00');
    setFormEndTime(event.endTime || '10:00');
    setFormLocation(event.location || '');
    setFormCategory(event.category || 'personal');
    setFormColor(event.color || '#6366f1');
    setFormReminder(event.reminderMinutesBefore !== undefined ? event.reminderMinutesBefore : 15);
    setFormRecurrence(event.recurrence || 'none');
    setFormImportant(Boolean(event.isImportant));
    setFormError(null);
    setEventModalOpen(true);
    setSelectedEventDetails(null);
  };

  // Save Event
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please enter an event title.');
      soundEngine.playWarningTone();
      return;
    }
    if (!formDate) {
      setFormError('Please select a date.');
      soundEngine.playWarningTone();
      return;
    }
    if (!formAllDay && formStartTime && formEndTime && formStartTime > formEndTime) {
      setFormError('End time cannot be earlier than start time.');
      soundEngine.playWarningTone();
      return;
    }

    soundEngine.playSaveSuccess();

    if (editingEvent) {
      const updated = events.map((ev) =>
        ev.id === editingEvent.id
          ? {
              ...ev,
              title: formTitle.trim(),
              description: formDescription.trim(),
              date: formDate,
              endDate: formEndDate || undefined,
              allDay: formAllDay,
              startTime: formAllDay ? undefined : formStartTime,
              endTime: formAllDay ? undefined : formEndTime,
              location: formLocation.trim() || undefined,
              category: formCategory,
              color: formColor,
              reminderMinutesBefore: formReminder,
              recurrence: formRecurrence,
              isImportant: formImportant,
            }
          : ev
      );
      onUpdateEvents(updated);
    } else {
      const newEvent: CalendarEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: formTitle.trim(),
        description: formDescription.trim(),
        date: formDate,
        endDate: formEndDate || undefined,
        allDay: formAllDay,
        startTime: formAllDay ? undefined : formStartTime,
        endTime: formAllDay ? undefined : formEndTime,
        location: formLocation.trim() || undefined,
        category: formCategory,
        color: formColor,
        reminderMinutesBefore: formReminder,
        recurrence: formRecurrence,
        isImportant: formImportant,
        createdAt: new Date().toISOString(),
      };
      onUpdateEvents([...events, newEvent]);
    }

    setEventModalOpen(false);
  };

  // Delete Event
  const handleDeleteEvent = (id: string) => {
    soundEngine.playUiClick();
    onUpdateEvents(events.filter((ev) => ev.id !== id));
    setSelectedEventDetails(null);
  };

  // Helper to check if event matches a given date (accounting for recurrence)
  const isEventOnDate = (ev: CalendarEvent, targetDateStr: string): boolean => {
    if (ev.date === targetDateStr) return true;
    if (ev.endDate && targetDateStr >= ev.date && targetDateStr <= ev.endDate) return true;

    if (ev.recurrence === 'daily') {
      return targetDateStr >= ev.date;
    }
    if (ev.recurrence === 'weekly') {
      if (targetDateStr < ev.date) return false;
      const originDay = new Date(ev.date + 'T00:00:00').getDay();
      const targetDay = new Date(targetDateStr + 'T00:00:00').getDay();
      return originDay === targetDay;
    }
    if (ev.recurrence === 'monthly') {
      if (targetDateStr < ev.date) return false;
      const originDay = ev.date.split('-')[2];
      const targetDay = targetDateStr.split('-')[2];
      return originDay === targetDay;
    }
    if (ev.recurrence === 'yearly') {
      if (targetDateStr < ev.date) return false;
      const originMD = ev.date.substring(5);
      const targetMD = targetDateStr.substring(5);
      return originMD === targetMD;
    }
    return false;
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesCategory =
        selectedCategory === 'all' || ev.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [events, selectedCategory, searchQuery]);

  // Month grid computation
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const daysInMonth = lastDay.getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateStr: formatLocalYMD(prevDate),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const curr = new Date(year, month, i);
      days.push({
        dateStr: formatLocalYMD(curr),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill complete grid of 35 or 42
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        dateStr: formatLocalYMD(nextDate),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Week View Data computation
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day; // Start from Sunday
    const startOfWeek = new Date(curr.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        dateStr: formatLocalYMD(d),
        date: d,
        dayNum: d.getDate(),
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
      };
    });
  }, [currentDate]);

  // Formatted headers
  const monthYearTitle = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fadeIn">
      {/* 1. Header Control Bar */}
      <div
        className="p-5 rounded-3xl border border-slate-800/90 shadow-2xl relative overflow-hidden"
        style={panelBgStyle}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200">
                  Productivity Calendar
                </span>
                <span className="text-xs text-slate-400 font-mono">Local Agenda</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
                {monthYearTitle}
              </h1>
            </div>
          </div>

          {/* Navigation & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Today shortcut & arrows */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleNavigatePeriod(-1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Previous Period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetToToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleNavigatePeriod(1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Next Period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              {(['month', 'week', 'day', 'year'] as CalendarViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setViewMode(mode);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    viewMode === mode
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* New Event Button */}
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Event</span>
            </button>
          </div>
        </div>

        {/* Search, Categories, and Quick Task */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['all', 'work', 'personal', 'health', 'study', 'birthday', 'important'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setSelectedCategory(cat);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 1.5 SIGNATURE ELASTIC CHRONO-RIBBON (Tactile Day Ribbon Navigation) */}
      <ElasticChronoRibbon
        selectedDate={selectedDate}
        events={events}
        reducedMotion={styleSettings.reducedMotion}
        onSelectDate={(newDate) => {
          setSelectedDate(newDate);
          if (
            newDate.getMonth() !== currentDate.getMonth() ||
            newDate.getFullYear() !== currentDate.getFullYear()
          ) {
            setCurrentDate(newDate);
          }
        }}
        onOpenCreateEvent={(dateStr) => openCreateModal(dateStr)}
      />

      {/* 2. MAIN CALENDAR VIEW AREA */}

      {/* A. MONTH VIEW */}
      {viewMode === 'month' && (
        <div
          className="rounded-3xl border border-slate-800/90 bg-slate-950/70 backdrop-blur-md overflow-hidden shadow-2xl p-4"
          style={panelBgStyle}
        >
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-slate-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Month Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {monthData.map((day) => {
              const dayEvents = filteredEvents.filter((ev) => isEventOnDate(ev, day.dateStr));
              const isToday = day.dateStr === todayStr;
              const isSelected = formatLocalYMD(selectedDate) === day.dateStr;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => {
                    soundEngine.playUiClick();
                    setSelectedDate(new Date(day.dateStr + 'T00:00:00'));
                  }}
                  onDoubleClick={() => openCreateModal(day.dateStr)}
                  className={`min-h-[100px] p-2 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/20'
                      : day.isCurrentMonth
                      ? 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/50'
                      : 'border-slate-900/40 bg-slate-950/30 opacity-40 hover:opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-indigo-600 text-white font-mono shadow'
                          : 'text-slate-300'
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateModal(day.dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-white transition-opacity"
                      title="Add event on this date"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 mt-1 overflow-y-auto max-h-[75px] scrollbar-none">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const catStyle = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.other;
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.playUiClick();
                            setSelectedEventDetails(ev);
                          }}
                          className={`px-1.5 py-0.5 rounded-lg text-[10px] font-medium truncate border flex items-center gap-1 ${catStyle.bg} ${catStyle.text} ${catStyle.border} hover:brightness-125 transition-all`}
                        >
                          {ev.isImportant && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />}
                          {!ev.allDay && ev.startTime && (
                            <span className="opacity-70 text-[9px]">{ev.startTime}</span>
                          )}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-slate-400 font-mono block pl-1">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* B. WEEK VIEW */}
      {viewMode === 'week' && (
        <div
          className="rounded-3xl border border-slate-800/90 bg-slate-950/70 backdrop-blur-md overflow-hidden shadow-2xl p-4"
          style={panelBgStyle}
        >
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((col) => {
              const dayEvents = filteredEvents.filter((ev) => isEventOnDate(ev, col.dateStr));
              const isToday = col.dateStr === todayStr;

              return (
                <div
                  key={col.dateStr}
                  className={`rounded-2xl border p-3 flex flex-col min-h-[360px] ${
                    isToday
                      ? 'border-indigo-500/80 bg-indigo-950/15'
                      : 'border-slate-800/80 bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400">{col.dayName}</div>
                      <div className={`text-base font-bold ${isToday ? 'text-indigo-400' : 'text-white'}`}>
                        {col.dayNum}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateModal(col.dateStr)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2 flex-1 overflow-y-auto">
                    {dayEvents.map((ev) => {
                      const catStyle = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.other;
                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEventDetails(ev)}
                          className={`p-2 rounded-xl border text-xs cursor-pointer ${catStyle.bg} ${catStyle.text} ${catStyle.border} hover:brightness-125 transition-all`}
                        >
                          <div className="flex items-center justify-between gap-1 font-semibold">
                            <span className="truncate">{ev.title}</span>
                            {ev.isImportant && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                          </div>
                          {!ev.allDay && ev.startTime && (
                            <div className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{ev.startTime}{ev.endTime ? ` - ${ev.endTime}` : ''}</span>
                            </div>
                          )}
                          {ev.location && (
                            <div className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1 truncate">
                              <MapPin className="w-2.5 h-2.5" />
                              <span>{ev.location}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayEvents.length === 0 && (
                      <div className="text-center text-[10px] text-slate-600 pt-8">
                        No events
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* C. DAY VIEW */}
      {viewMode === 'day' && (
        <div
          className="rounded-3xl border border-slate-800/90 bg-slate-950/70 backdrop-blur-md overflow-hidden shadow-2xl p-6"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs text-indigo-400 font-mono">Day Schedule</span>
              <h2 className="text-lg font-bold text-white">
                {currentDate.toLocaleDateString('default', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => openCreateModal(formatLocalYMD(currentDate))}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event Today</span>
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {filteredEvents.filter((ev) => isEventOnDate(ev, formatLocalYMD(currentDate))).map((ev) => {
              const catStyle = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.other;
              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEventDetails(ev)}
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer ${catStyle.bg} ${catStyle.border} hover:brightness-110 transition-all`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-mono font-bold ${catStyle.text}`}>
                      {ev.allDay ? 'ALL DAY' : ev.startTime || 'EVENT'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{ev.title}</h3>
                        {ev.isImportant && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${catStyle.text} border ${catStyle.border}`}>
                          {ev.category}
                        </span>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-slate-300 mt-1">{ev.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 font-mono">
                        {!ev.allDay && ev.startTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ev.startTime}{ev.endTime ? ` - ${ev.endTime}` : ''}
                          </span>
                        )}
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {ev.location}
                          </span>
                        )}
                        {ev.reminderMinutesBefore !== undefined && ev.reminderMinutesBefore >= 0 && (
                          <span className="flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            {ev.reminderMinutesBefore === 0 ? 'At event time' : `${ev.reminderMinutesBefore}m before`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(ev);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(ev.id);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredEvents.filter((ev) => isEventOnDate(ev, formatLocalYMD(currentDate))).length === 0 && (
              <div className="p-12 text-center text-slate-500 text-xs">
                No events scheduled for this day. Double click anywhere to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* D. YEAR VIEW */}
      {viewMode === 'year' && (
        <div
          className="rounded-3xl border border-slate-800/90 bg-slate-950/70 backdrop-blur-md overflow-hidden shadow-2xl p-6"
          style={panelBgStyle}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 12 }, (_, monthIdx) => {
              const monthDate = new Date(currentDate.getFullYear(), monthIdx, 1);
              const mName = monthDate.toLocaleString('default', { month: 'long' });
              const daysInMonth = new Date(currentDate.getFullYear(), monthIdx + 1, 0).getDate();
              const firstDayOfWeek = monthDate.getDay();

              return (
                <div
                  key={mName}
                  onClick={() => {
                    soundEngine.playUiClick();
                    setCurrentDate(monthDate);
                    setViewMode('month');
                  }}
                  className="p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:border-indigo-500/60 cursor-pointer transition-colors"
                >
                  <div className="text-xs font-bold text-white mb-2">{mName}</div>
                  <div className="grid grid-cols-7 gap-1 text-[9px] text-center font-mono">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty_${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const dNum = i + 1;
                      const dStr = `${currentDate.getFullYear()}-${String(monthIdx + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
                      const hasEvents = events.some((ev) => isEventOnDate(ev, dStr));
                      const isToday = dStr === todayStr;

                      return (
                        <div
                          key={dNum}
                          className={`w-4 h-4 mx-auto rounded-full flex items-center justify-center ${
                            isToday
                              ? 'bg-indigo-600 text-white font-bold'
                              : hasEvents
                              ? 'bg-indigo-500/30 text-indigo-200 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {dNum}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. EVENT CREATION / EDITING MODAL */}
      {eventModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setEventModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                <span>{editingEvent ? 'Edit Event' : 'Create New Event'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setEventModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Design review, Doctor appointment, Project launch"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formAllDay}
                    onChange={(e) => setFormAllDay(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>All-day Event</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formImportant}
                    onChange={(e) => setFormImportant(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Important Date
                  </span>
                </label>
              </div>

              {!formAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as CalendarEventCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health &amp; Fitness</option>
                    <option value="study">Study</option>
                    <option value="birthday">Birthday</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="important">Important</option>
                    <option value="other">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Repeat / Recurrence
                  </label>
                  <select
                    value={formRecurrence}
                    onChange={(e) => setFormRecurrence(e.target.value as CalendarEventRecurrence)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Every day</option>
                    <option value="weekly">Every week</option>
                    <option value="monthly">Every month</option>
                    <option value="yearly">Every year (Anniversary)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reminder Notification
                </label>
                <select
                  value={formReminder}
                  onChange={(e) => setFormReminder(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={-1}>No reminder</option>
                  <option value={0}>At time of event</option>
                  <option value={5}>5 minutes before</option>
                  <option value={10}>10 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Room 204, Zoom, Central Library"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Additional agenda or preparation notes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow cursor-pointer"
                >
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. EVENT DETAILS MODAL */}
      {selectedEventDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedEventDetails(null)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase tracking-wider bg-slate-800 text-slate-300">
                  {selectedEventDetails.category}
                </span>
                <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-1.5">
                  <span>{selectedEventDetails.title}</span>
                  {selectedEventDetails.isImportant && (
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{selectedEventDetails.date}</span>
                {selectedEventDetails.endDate && <span>→ {selectedEventDetails.endDate}</span>}
              </div>

              {!selectedEventDetails.allDay && selectedEventDetails.startTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{selectedEventDetails.startTime}{selectedEventDetails.endTime ? ` - ${selectedEventDetails.endTime}` : ''}</span>
                </div>
              )}

              {selectedEventDetails.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{selectedEventDetails.location}</span>
                </div>
              )}

              {selectedEventDetails.reminderMinutesBefore !== undefined && selectedEventDetails.reminderMinutesBefore >= 0 && (
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Reminder: {selectedEventDetails.reminderMinutesBefore === 0 ? 'At event time' : `${selectedEventDetails.reminderMinutesBefore} minutes prior`}
                  </span>
                </div>
              )}
            </div>

            {selectedEventDetails.description && (
              <p className="text-xs text-slate-300 p-3 rounded-xl bg-slate-950/70 border border-slate-800 leading-relaxed">
                {selectedEventDetails.description}
              </p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleDeleteEvent(selectedEventDetails.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
              <button
                type="button"
                onClick={() => openEditModal(selectedEventDetails)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
