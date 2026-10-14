import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Home,
  CheckSquare,
  Calendar as CalendarIcon,
  Target,
  Timer as TimerIcon,
  Bell,
  BarChart3,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Lock,
  Search,
  Plus,
  Check,
  Star,
  Flame,
  Trophy,
  PanelLeftClose,
  PanelLeftOpen,
  Shuffle,
  Edit3,
  Eye,
  Maximize2,
  BarChart2,
  Music,
  Camera,
  Menu,
  X,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { CustomizeSpaceView } from './components/CustomizeSpaceView';
import { DailyCameraUpdateView } from './components/DailyCameraUpdateView';
import { HabitCalendarSection } from './components/HabitCalendarSection';
import {
  computeWorldStage,
  LivingWorldSanctuary,
} from './components/LivingWorldSanctuary';
import {
  AmbientModeOverlay,
  GoalFormModal,
  HabitDetailModal,
  HabitFormModal,
  ReminderFormModal,
  WelcomeWizardModal,
} from './components/Modals';
import { MusicPlayerView } from './components/MusicPlayerView';
import { PixelEnvironmentCanvas } from './components/PixelEnvironmentCanvas';
import { RightWorkspaceColumn } from './components/RightWorkspaceColumn';
import {
  GoalsManagementView,
  HabitsManagementView,
  RemindersAndHydrationView,
  SettingsAndBackupView,
  StatisticsSection,
} from './components/SecondaryViews';
import {
  PasswordSetupModal,
  SecurityLockOverlay,
} from './components/SecurityLockOverlay';
import {
  CommandPaletteModal,
  DailyJournalModal,
  NotificationCenterModal,
  SystemTrayBackgroundOverlay,
} from './components/SystemOverlays';
import {
  BUILTIN_MUSIC_TRACKS,
  createDefaultAppState,
  createDefaultRoomLayout,
  formatLocalYMD,
  PIXEL_SCENES,
  ROOM_OBJECT_CATALOG,
} from './constants/scenesAndPresets';
import {
  clearAllAppDataInDB,
  createVersionedBackupSnapshot,
  estimateDataSizeFormatted,
  exportStateAsJsonBackup,
  loadAppStateFromDB,
  parseBackupJson,
  saveAppStateToDB,
} from './db/indexedDb';
import {
  calculateUserXPAndLevel,
  createNotificationLogEntry,
  detectMissedRemindersSinceLastActive,
  dispatchNativeDesktopNotification,
  evaluateAchievements,
  isRoomObjectUnlocked,
  isWithinQuietHours,
  MissedReminderItem,
} from './services/backgroundEngine';
import {
  AppDataState,
  AudioSettings,
  CustomAudioTrack,
  DailyPhotoUpdate,
  EnvironmentSettings,
  Goal,
  Habit,
  NavigationTab,
  NotificationLogItem,
  Reminder,
  RoomObjectId,
  RoomObjectPlacement,
  SaveStatus,
  SecuritySettings,
  SpacePreset,
  StyleSettings,
  TimerMode,
  TimerSettings,
  UserProfile,
  VersionedBackupEntry,
} from './types/app';
import {
  calculateHabitStreak,
  calculateOverallStats,
  isHabitCompleted,
} from './utils/habitStats';

export function App() {
  const [appState, setAppState] = useState<AppDataState>(() =>
    createDefaultAppState()
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  const handleSelectTab = (tab: NavigationTab) => {
    soundEngine.playTabSwitch();
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cameraPreselectedHabitId, setCameraPreselectedHabitId] = useState<
    string | null
  >(null);
  const [ambientModeOpen, setAmbientModeOpen] = useState(false);

  // Selected date for "Today's Habits" & KPI inspection (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  // Month view date for Habit Calendar & Monthly Progress chart
  const [monthViewDate, setMonthViewDate] = useState<Date>(() => new Date());
  const [chartScope, setChartScope] = useState<'daily' | 'weekly' | 'monthly'>(
    'daily'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Modals state
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [inspectingHabitId, setInspectingHabitId] = useState<string | null>(
    null
  );

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);

  // New Overlays: Command Palette (Ctrl+K), Notification Center, Daily Journal, System Tray Mode
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalDateStr, setJournalDateStr] = useState<string | undefined>(
    undefined
  );
  const [isMinimizedToTray, setIsMinimizedToTray] = useState(false);
  const [showFirstTimeTrayToast, setShowFirstTimeTrayToast] = useState(false);
  const [missedReminders, setMissedReminders] = useState<MissedReminderItem[]>(
    []
  );
  const [activeToastAction, setActiveToastAction] = useState<{
    habitId?: string;
    reminderId?: string;
    title: string;
  } | null>(null);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<{
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  } | null>(null);

  // Focus Timer runtime state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(45 * 60);
  const [timerBannerMessage, setTimerBannerMessage] = useState<string | null>(
    null
  );

  // Streak celebration toast
  const [streakToast, setStreakToast] = useState<string | null>(null);
  // Active reminder toast in-app notification
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Web / Native Desktop Notification permission state
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window !== 'undefined') {
      if ((window as unknown as { habitraDesktop?: unknown }).habitraDesktop) {
        return 'granted';
      }
      if ('Notification' in window) {
        return window.Notification.permission;
      }
    }
    return 'unsupported';
  });

  // Track online/offline network status & PWA install prompt
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPwaInstallPrompt(
        e as unknown as {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
        }
      );
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // Load initial state from IndexedDB on mount + Epoch Timestamp Timer Recovery + Missed Reminders Check
  useEffect(() => {
    let mounted = true;
    loadAppStateFromDB().then(({ state, recoveredFromBackup }) => {
      if (!mounted) return;
      if (recoveredFromBackup) {
        setStorageWarning(
          'Recovered your Habitra data from automatic local backup snapshot.'
        );
      }

      const now = new Date();
      // Check for missed reminders while app was closed
      if (state.profile.missedReminderBehavior !== 'ignore') {
        const missed = detectMissedRemindersSinceLastActive(state, now);
        if (missed.length > 0) {
          setMissedReminders(missed);
        }
      }

      // Epoch-based Timer Recovery: if timer was running when closed/refreshed, calculate exact remaining seconds
      if (state.timer.timerStatus === 'running' && state.timer.endTimestamp) {
        const diffSecs = Math.ceil(
          (state.timer.endTimestamp - Date.now()) / 1000
        );
        if (diffSecs > 0) {
          setSecondsRemaining(diffSecs);
          setIsTimerRunning(true);
        } else {
          // Timer completed while in background/closed!
          const defaultSecs = state.timer.focusMinutes * 60;
          setSecondsRemaining(defaultSecs);
          setIsTimerRunning(false);
          state.timer.timerStatus = 'idle';
          state.timer.endTimestamp = null;
        }
      } else if (
        state.timer.timerStatus === 'paused' &&
        typeof state.timer.pausedRemainingSeconds === 'number'
      ) {
        setSecondsRemaining(state.timer.pausedRemainingSeconds);
        setIsTimerRunning(false);
      } else {
        const initialSecs =
          (state.timer.mode === 'focus'
            ? state.timer.focusMinutes
            : state.timer.mode === 'short_break'
            ? state.timer.shortBreakMinutes
            : state.timer.mode === 'long_break'
            ? state.timer.longBreakMinutes
            : state.timer.customMinutes) * 60;
        setSecondsRemaining(initialSecs);
      }

      setAppState({
        ...state,
        security: {
          ...state.security,
          // Always require authentication on every new application launch if a password is set
          isLocked: Boolean(state.security.passwordHash),
        },
        profile: {
          ...state.profile,
          lastActiveTimestamp: Date.now(),
          currentActiveDateStr: formatLocalYMD(now),
        },
      });
      if (!state.profile.hasSeenWelcome) {
        setWelcomeModalOpen(true);
      }
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Google-Docs style Autosave to IndexedDB whenever appState changes
  const isFirstSaveRef = useRef(true);
  useEffect(() => {
    if (!isLoaded) return;
    if (isFirstSaveRef.current) {
      isFirstSaveRef.current = false;
      return;
    }

    setSaveStatus('saving');
    const timerId = window.setTimeout(() => {
      saveAppStateToDB(appState)
        .then(() => {
          setSaveStatus('saved');
        })
        .catch(() => {
          setSaveStatus('error');
          // Automatic retry after 1.5s
          window.setTimeout(() => {
            saveAppStateToDB(appState)
              .then(() => setSaveStatus('saved'))
              .catch(() => setSaveStatus('error'));
          }, 1500);
        });
    }, 150);

    return () => window.clearTimeout(timerId);
  }, [appState, isLoaded]);

  // Sync audio engine with appState.audio and focus timer immersion
  useEffect(() => {
    if (!isLoaded) return;
    soundEngine.syncSettings(appState.audio);
  }, [appState.audio, isLoaded]);

  useEffect(() => {
    soundEngine.setFocusImmersionBoost(
      isTimerRunning &&
        appState.timer.mode === 'focus' &&
        appState.timer.immerseOnFocus
    );
  }, [isTimerRunning, appState.timer.mode, appState.timer.immerseOnFocus]);

  // Auto-lock inactivity monitor when security.autoLockMinutes > 0
  useEffect(() => {
    if (
      !appState.security.passwordHash ||
      appState.security.autoLockMinutes <= 0 ||
      appState.security.isLocked
    ) {
      return;
    }

    let timeoutId: number;
    const resetInactivityTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setAppState((prev) => ({
          ...prev,
          security: { ...prev.security, isLocked: true },
        }));
      }, appState.security.autoLockMinutes * 60 * 1000);
    };

    resetInactivityTimer();
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('keydown', resetInactivityTimer);
      window.removeEventListener('click', resetInactivityTimer);
    };
  }, [
    appState.security.passwordHash,
    appState.security.autoLockMinutes,
    appState.security.isLocked,
  ]);

  // Focus Timer countdown loop with Epoch Timestamp accuracy, Pomodoro cycle progression & session logging
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        // Compute exact remaining time from epoch endTimestamp if available (zero drift in background tabs)
        const targetEnd = appState.timer.endTimestamp;
        const computedNext = targetEnd
          ? Math.max(0, Math.ceil((targetEnd - Date.now()) / 1000))
          : prev - 1;

        if (computedNext <= 0) {
          if (appState.profile.notifyTimer !== false) {
            soundEngine.playTimerCompleteBell();
          }
          const finishedMode = appState.timer.mode;
          const curCycle = appState.timer.currentCycle || 1;
          const maxCycles = appState.timer.totalCycles || 4;

          if (finishedMode === 'focus') {
            const isLongBreakDue = curCycle >= maxCycles;
            const nextMode: TimerMode = isLongBreakDue
              ? 'long_break'
              : 'short_break';
            const nextSecs =
              (isLongBreakDue
                ? appState.timer.longBreakMinutes
                : appState.timer.shortBreakMinutes) * 60;

            setTimerBannerMessage(
              isLongBreakDue
                ? `Cycle ${curCycle}/${maxCycles} complete! Time for a Long Break.`
                : 'Focus session complete. Time for a break.'
            );
            if (appState.profile.notifyTimer !== false) {
              sendDesktopNotification(
                '⏰ TIMER COMPLETE',
                isLongBreakDue
                  ? `Focus session completed! Time for your ${appState.timer.longBreakMinutes}-minute long break.`
                  : `Focus session completed! Time for your ${appState.timer.shortBreakMinutes}-minute break.`,
                'timer',
                '⏰'
              );
            }

            const newLog = {
              id: `session_${Date.now()}`,
              date: formatLocalYMD(new Date()),
              minutes: appState.timer.focusMinutes,
              mode: 'focus' as TimerMode,
              completedAt: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            };

            const autoRepeat = appState.timer.pomodoroAutoRepeat;
            setAppState((st) => ({
              ...st,
              timer: {
                ...st.timer,
                mode: nextMode,
                sessionsCompletedToday: st.timer.sessionsCompletedToday + 1,
                totalFocusMinutesToday:
                  st.timer.totalFocusMinutesToday + st.timer.focusMinutes,
                history: [newLog, ...(st.timer.history || []).slice(0, 49)],
                timerStatus: autoRepeat ? 'running' : 'idle',
                startTimestamp: autoRepeat ? Date.now() : null,
                endTimestamp: autoRepeat ? Date.now() + nextSecs * 1000 : null,
                pausedRemainingSeconds: null,
              },
            }));

            if (!autoRepeat) {
              setIsTimerRunning(false);
            }
            return nextSecs;
          } else {
            setTimerBannerMessage(
              'Break complete! Ready for your next focus block.'
            );
            if (appState.profile.notifyBreaks !== false) {
              sendDesktopNotification(
                '🌱 Break Finished',
                'Ready to start your next focus session?',
                'timer',
                '🌱'
              );
            }
            const nextMode: TimerMode = 'focus';
            const nextSecs = appState.timer.focusMinutes * 60;
            const nextCycle =
              finishedMode === 'long_break'
                ? 1
                : Math.min(maxCycles, curCycle + 1);
            const autoRepeat = appState.timer.pomodoroAutoRepeat;

            setAppState((st) => ({
              ...st,
              timer: {
                ...st.timer,
                mode: nextMode,
                currentCycle: nextCycle,
                timerStatus: autoRepeat ? 'running' : 'idle',
                startTimestamp: autoRepeat ? Date.now() : null,
                endTimestamp: autoRepeat ? Date.now() + nextSecs * 1000 : null,
                pausedRemainingSeconds: null,
              },
            }));
            if (!autoRepeat) {
              setIsTimerRunning(false);
            }
            return nextSecs;
          }
        }
        return computedNext;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    isTimerRunning,
    appState.timer.endTimestamp,
    appState.timer.mode,
    appState.timer.focusMinutes,
    appState.timer.shortBreakMinutes,
    appState.timer.longBreakMinutes,
    appState.timer.currentCycle,
    appState.timer.totalCycles,
    appState.timer.pomodoroAutoRepeat,
    appState.profile.notifyTimer,
    appState.profile.notifyBreaks,
  ]);

  // Real-Time Background Scheduler: Midnight Rollover, Water Interval, Scheduled Reminders, Habit Reminders & Streak Protection
  useEffect(() => {
    if (!isLoaded) return;

    const runBackgroundTick = () => {
      const now = new Date();
      const nowMs = now.getTime();
      const todayStr = formatLocalYMD(now);
      const currentHM = now.toTimeString().slice(0, 5);
      const dayOfWeek = now.getDay();

      // 1. Check Midnight Transition (00:00 rollover)
      if (
        appState.profile.currentActiveDateStr &&
        appState.profile.currentActiveDateStr !== todayStr
      ) {
        setSelectedDate(new Date());
        setAppState((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            currentActiveDateStr: todayStr,
            lastWaterDate: todayStr,
            waterCompletedToday: 0,
            lastActiveTimestamp: nowMs,
          },
          timer: {
            ...prev.timer,
            sessionsCompletedToday: 0,
            totalFocusMinutesToday: 0,
          },
          reminders: prev.reminders.map((r) => ({
            ...r,
            completedTodayCount: 0,
          })),
        }));
        return;
      }

      // 2. Check if notifications are globally enabled & not muted by Quiet Hours or Focus Mode
      if (!appState.profile.notificationsEnabled) return;
      if (isWithinQuietHours(now, appState.profile)) return;
      if (
        isTimerRunning &&
        appState.timer.mode === 'focus' &&
        appState.timer.muteNotificationsDuringFocus
      ) {
        return;
      }

      // 3. Dedicated Hydration Interval Check
      if (
        appState.profile.notifyWater !== false &&
        appState.profile.waterIntervalMinutes > 0 &&
        appState.profile.waterCompletedToday < appState.profile.waterDailyGoal
      ) {
        const lastWater = appState.profile.lastWaterReminderAt || nowMs;
        if (nowMs - lastWater >= appState.profile.waterIntervalMinutes * 60 * 1000) {
          if (appState.profile.notificationSoundEnabled) {
            soundEngine.playReminderChime();
          }
          sendDesktopNotification(
            '💧 WATER REMINDER',
            'Time to drink some water.',
            'water',
            '💧'
          );
          setAppState((prev) => ({
            ...prev,
            profile: {
              ...prev.profile,
              lastWaterReminderAt: nowMs,
              lastActiveTimestamp: nowMs,
            },
          }));
        }
      }

      // 4. Custom & Scheduled Reminders Check
      appState.reminders.forEach((rem) => {
        if (!rem.enabled) return;
        if (rem.scheduleType === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6))
          return;
        if (rem.scheduleType === 'weekends' && dayOfWeek !== 0 && dayOfWeek !== 6)
          return;
        if (
          rem.scheduleType === 'custom' &&
          rem.customDays &&
          !rem.customDays.includes(dayOfWeek)
        )
          return;

        if (rem.scheduleType === 'interval' && rem.intervalMinutes) {
          const last = rem.lastTriggeredAt || nowMs;
          if (nowMs - last >= rem.intervalMinutes * 60 * 1000) {
            triggerReminderAlert(rem);
          }
        } else if (rem.timeOfDay && rem.timeOfDay === currentHM) {
          const last = rem.lastTriggeredAt || 0;
          if (nowMs - last >= 65 * 1000) {
            triggerReminderAlert(rem);
          }
        }
      });

      // 5. Habit Scheduled Reminder Check
      if (appState.profile.notifyHabits !== false) {
        appState.habits.forEach((habit) => {
          if (habit.archived || !habit.reminderTime) return;
          if (appState.completions[`${habit.id}_${todayStr}`]) return;
          if (habit.reminderTime === currentHM) {
            const alreadyNotifiedRecently = (
              appState.notificationHistory || []
            ).some(
              (item) =>
                item.title.includes(habit.name) && nowMs - item.timestamp < 65_000
            );
            if (!alreadyNotifiedRecently) {
              if (appState.profile.notificationSoundEnabled) {
                soundEngine.playReminderChime();
              }
              sendDesktopNotification(
                `${habit.icon} ${habit.name.toUpperCase()}`,
                `Time for your "${habit.name}" habit.`,
                'study',
                habit.icon,
                { habitId: habit.id }
              );
            }
          }
        });
      }

      // 6. Evening Streak Protection Alert at 20:00
      if (appState.profile.notifyStreak !== false && currentHM === '20:00') {
        const activeList = appState.habits.filter((h) => !h.archived);
        const anyIncomplete = activeList.some(
          (h) => !appState.completions[`${h.id}_${todayStr}`]
        );
        const alreadySentStreakToday = (appState.notificationHistory || []).some(
          (item) => item.type === 'streak' && item.dateStr === todayStr
        );
        if (anyIncomplete && !alreadySentStreakToday && activeList.length > 0) {
          sendDesktopNotification(
            '🔥 STREAK REMINDER',
            `Don't break your consistency streak! Complete your remaining habits for today.`,
            'streak',
            '🔥'
          );
        }
      }
    };

    const interval = window.setInterval(runBackgroundTick, 15000);
    return () => window.clearInterval(interval);
  }, [
    isLoaded,
    isTimerRunning,
    appState.timer.mode,
    appState.timer.muteNotificationsDuringFocus,
    appState.reminders,
    appState.habits,
    appState.completions,
    appState.profile,
    appState.notificationHistory,
  ]);

  // Listen to Service Worker Notification Action Buttons ('complete', 'snooze')
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator))
      return;
    const onSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== 'HABITRA_NOTIFICATION_ACTION') return;
      if (data.action === 'complete' && data.payload?.habitId) {
        handleToggleHabitCompletion(
          data.payload.habitId,
          formatLocalYMD(new Date())
        );
      } else if (data.action === 'snooze') {
        setReminderToast('⏰ Snoozed reminder for 10 minutes');
        window.setTimeout(() => setReminderToast(null), 3500);
        window.setTimeout(() => {
          sendDesktopNotification(
            '⏰ SNOOZED REMINDER',
            data.payload?.title || 'Your snoozed Habitra reminder is due now.',
            'custom',
            '⏰',
            data.payload
          );
        }, 10 * 60 * 1000);
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () =>
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, [appState.completions, appState.habits]);

  const sendDesktopNotification = (
    title: string,
    body: string,
    logType: NotificationLogItem['type'] = 'system',
    icon = '🔔',
    actionMeta?: { habitId?: string; reminderId?: string }
  ) => {
    setReminderToast(`${title} — ${body}`);
    setActiveToastAction(
      actionMeta ? { ...actionMeta, title } : { title }
    );
    window.setTimeout(() => {
      setReminderToast((prev) =>
        prev === `${title} — ${body}` ? null : prev
      );
    }, 6500);

    const logEntry = createNotificationLogEntry(logType, icon, title, body);
    setAppState((prev) => ({
      ...prev,
      notificationHistory: [
        logEntry,
        ...(prev.notificationHistory || []).slice(0, 99),
      ],
    }));

    if (appState.profile.notificationsEnabled) {
      dispatchNativeDesktopNotification({
        title,
        body,
        habitId: actionMeta?.habitId,
        reminderId: actionMeta?.reminderId,
      });
    }
  };

  const triggerReminderAlert = (rem: Reminder) => {
    if (
      appState.profile.notificationSoundEnabled &&
      rem.soundEnabled !== false
    ) {
      soundEngine.playReminderChime();
    }
    const logType: NotificationLogItem['type'] =
      rem.type === 'water'
        ? 'water'
        : rem.type === 'study'
        ? 'study'
        : rem.type === 'eye'
        ? 'eye'
        : rem.type === 'exercise'
        ? 'exercise'
        : 'custom';

    sendDesktopNotification(
      `${rem.icon} ${rem.title.toUpperCase()}`,
      rem.type === 'water'
        ? 'Time to drink some water.'
        : rem.type === 'eye'
        ? "You've been focusing for a while. Take a short eye break."
        : rem.type === 'study'
        ? `Your "${rem.title}" study session starts now.`
        : `Time for your "${rem.title}" reminder.`,
      logType,
      rem.icon,
      { reminderId: rem.id }
    );
    setAppState((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === rem.id
          ? {
              ...r,
              lastTriggeredAt: Date.now(),
              enabled: r.scheduleType === 'once' ? false : r.enabled,
            }
          : r
      ),
    }));
  };

  const handleTriggerSpecificTestNotification = (
    kind: 'water' | 'study' | 'eye' | 'exercise' | 'streak' | 'timer'
  ) => {
    if (appState.profile.notificationSoundEnabled) {
      soundEngine.playReminderChime();
    }
    const presets: Record<
      typeof kind,
      { title: string; body: string; icon: string }
    > = {
      water: {
        title: '💧 WATER REMINDER',
        body: 'Time to drink some water.',
        icon: '💧',
      },
      study: {
        title: '📚 STUDY REMINDER',
        body: 'Your Java study session starts now.',
        icon: '📚',
      },
      eye: {
        title: '👀 EYE BREAK',
        body: "You've been focusing for a while. Take a short eye break.",
        icon: '👀',
      },
      exercise: {
        title: '🏃 EXERCISE',
        body: 'Time for your exercise habit.',
        icon: '🏃',
      },
      streak: {
        title: '🔥 STREAK',
        body: `Don't break your ${Math.max(1, stats.overallCurrentStreak)}-day streak!`,
        icon: '🔥',
      },
      timer: {
        title: '⏰ TIMER COMPLETE',
        body: `Focus session completed! Time for your ${appState.timer.shortBreakMinutes}-minute break.`,
        icon: '⏰',
      },
    };
    const p = presets[kind];
    sendDesktopNotification(p.title, p.body, kind, p.icon);
  };

  const requestNotificationPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      (window as unknown as { habitraDesktop?: unknown }).habitraDesktop
    ) {
      setNotificationPermission('granted');
      soundEngine.playReminderChime();
      sendDesktopNotification(
        '💧 Notifications Active',
        'Native Windows desktop notifications are enabled for Habitra.'
      );
      return;
    }
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const res = await window.Notification.requestPermission();
      setNotificationPermission(res);
      if (res === 'granted') {
        soundEngine.playReminderChime();
        sendDesktopNotification(
          '💧 Notifications Active',
          'You will now receive gentle Habitra reminders.'
        );
      }
    } catch {
      // Ignore error
    }
  };

  // Active (non-archived) habits for dashboard & calendar
  const activeHabits = useMemo(
    () => appState.habits.filter((h) => !h.archived),
    [appState.habits]
  );

  // Computed statistics from active habits
  const stats = useMemo(
    () =>
      calculateOverallStats(
        activeHabits,
        appState.completions,
        selectedDate,
        monthViewDate
      ),
    [activeHabits, appState.completions, selectedDate, monthViewDate]
  );

  // Compute goals with automatic progress from linked habits when enabled
  const computedGoals = useMemo(() => {
    return appState.goals.map((g) => {
      if (
        g.autoProgressFromHabits &&
        g.relatedHabitIds &&
        g.relatedHabitIds.length > 0
      ) {
        const linked = appState.habits.filter((h) =>
          g.relatedHabitIds.includes(h.id)
        );
        if (linked.length > 0) {
          const avgPct = Math.round(
            linked.reduce((acc, h) => {
              const st = calculateHabitStreak(
                h,
                appState.completions,
                selectedDate
              );
              return (
                acc +
                Math.min(
                  100,
                  (st.totalCompletedDays / Math.max(1, h.goalDays)) * 100
                )
              );
            }, 0) / linked.length
          );
          return { ...g, progress: avgPct };
        }
      }
      return g;
    });
  }, [appState.goals, appState.habits, appState.completions, selectedDate]);

  const selectedDateStr = formatLocalYMD(selectedDate);
  const currentScene =
    PIXEL_SCENES.find((s) => s.id === appState.environment.sceneId) ||
    PIXEL_SCENES[0];

  // Dynamic Greeting based on current hour
  const greetingText = (() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning,';
    if (hr < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  })();

  // State updater helpers (all trigger automatic IndexedDB save)
  const stampSaveTime = (): string =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleToggleHabitCompletion = (habitId: string, dateStr: string) => {
    const habit = appState.habits.find((h) => h.id === habitId);
    const key = `${habitId}_${dateStr}`;
    const nextVal = !appState.completions[key];

    // Enforce Habit Dependency (if Habit B depends on Habit A, check if Habit A is completed first)
    if (nextVal && habit?.dependsOnHabitId) {
      const prereq = appState.habits.find(
        (p) => p.id === habit.dependsOnHabitId && !p.archived
      );
      if (prereq && !appState.completions[`${prereq.id}_${dateStr}`]) {
        setReminderToast(
          `🔒 "${habit.name}" is unlocked after completing "${prereq.name}"!`
        );
        window.setTimeout(() => setReminderToast(null), 4000);
        return;
      }
    }

    soundEngine.playHabitCheck(nextVal);

    const nextCompletions = {
      ...appState.completions,
      [key]: nextVal,
    };

    // Check if this completion creates a new streak milestone
    if (nextVal) {
      const habit = appState.habits.find((h) => h.id === habitId);
      if (habit) {
        const prevStreak = calculateHabitStreak(
          habit,
          appState.completions,
          selectedDate
        );
        const newStreak = calculateHabitStreak(
          habit,
          nextCompletions,
          selectedDate
        );
        if (
          newStreak.currentStreak > prevStreak.longestStreak &&
          newStreak.currentStreak >= 3
        ) {
          soundEngine.playStreakCelebration();
          setStreakToast(
            `🔥 NEW RECORD! ${habit.name}: ${newStreak.currentStreak} Day Streak!`
          );
          window.setTimeout(() => setStreakToast(null), 4500);
        }
      }
    }

    setAppState((prev) => ({
      ...prev,
      completions: nextCompletions,
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleSaveHabit = (
    habitData: Omit<Habit, 'id' | 'createdAt' | 'order'>,
    existingId?: string
  ) => {
    setAppState((prev) => {
      if (existingId) {
        return {
          ...prev,
          habits: prev.habits.map((h) =>
            h.id === existingId ? { ...h, ...habitData } : h
          ),
          profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
        };
      }
      const newHabit: Habit = {
        ...habitData,
        id: `habit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: formatLocalYMD(new Date()),
        order: prev.habits.length,
      };
      return {
        ...prev,
        habits: [...prev.habits, newHabit],
        profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
      };
    });
  };

  const handleToggleArchiveHabit = (habitId: string) => {
    setAppState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) =>
        h.id === habitId ? { ...h, archived: !h.archived } : h
      ),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleDeleteHabit = (habitId: string) => {
    setAppState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleSaveGoal = (goalData: Omit<Goal, 'id'>, existingId?: string) => {
    setAppState((prev) => {
      if (existingId) {
        return {
          ...prev,
          goals: prev.goals.map((g) =>
            g.id === existingId ? { ...g, ...goalData } : g
          ),
          profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
        };
      }
      const newGoal: Goal = {
        ...goalData,
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      };
      return {
        ...prev,
        goals: [...prev.goals, newGoal],
        profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
      };
    });
  };

  const handleToggleArchiveGoal = (goalId: string) => {
    setAppState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId ? { ...g, archived: !g.archived } : g
      ),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleDeleteGoal = (goalId: string) => {
    setAppState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleUpdateGoalProgress = (goalId: string, progress: number) => {
    setAppState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId ? { ...g, progress } : g
      ),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleToggleGoalStar = (goalId: string) => {
    setAppState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId ? { ...g, starred: !g.starred } : g
      ),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleSaveReminder = (
    remData: Omit<Reminder, 'id' | 'completedTodayCount'>,
    existingId?: string
  ) => {
    setAppState((prev) => {
      if (existingId) {
        return {
          ...prev,
          reminders: prev.reminders.map((r) =>
            r.id === existingId ? { ...r, ...remData } : r
          ),
          profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
        };
      }
      const newRem: Reminder = {
        ...remData,
        id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        completedTodayCount: 0,
        lastTriggeredAt: Date.now(),
      };
      return {
        ...prev,
        reminders: [newRem, ...prev.reminders],
        profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
      };
    });
  };

  const handleCompleteReminderToday = (remId: string) => {
    const rem = appState.reminders.find((r) => r.id === remId);
    if (rem) {
      triggerReminderAlert(rem);
    }
    setAppState((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === remId
          ? {
              ...r,
              completedTodayCount: (r.completedTodayCount || 0) + 1,
              lastTriggeredAt: Date.now(),
            }
          : r
      ),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleToggleReminder = (remId: string) => {
    setAppState((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === remId ? { ...r, enabled: !r.enabled } : r
      ),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleDeleteReminder = (remId: string) => {
    setAppState((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== remId),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleUpdateEnvironment = (patch: Partial<EnvironmentSettings>) => {
    if (patch.sceneId && patch.sceneId !== appState.environment.sceneId) {
      soundEngine.playRealmTravel();
    }
    setAppState((prev) => {
      const nextEnv = { ...prev.environment, ...patch };
      let nextAudio = prev.audio;
      if (patch.sceneId && prev.audio.autoSwitchMusicWithScene) {
        const matchedTrack = BUILTIN_MUSIC_TRACKS.find(
          (t) => t.coverSceneId === patch.sceneId && t.id !== 'silent'
        );
        if (matchedTrack) {
          nextAudio = {
            ...prev.audio,
            currentTrackId: matchedTrack.id,
          };
        }
      }
      return {
        ...prev,
        environment: nextEnv,
        audio: nextAudio,
        profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
      };
    });
  };

  const handleUpdateStyle = (patch: Partial<StyleSettings>) => {
    soundEngine.playUiClick();
    setAppState((prev) => ({
      ...prev,
      style: { ...prev.style, ...patch },
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleUpdateAudio = (patch: Partial<AudioSettings>) => {
    if (
      patch.isPlaying !== undefined &&
      patch.isPlaying !== appState.audio.isPlaying
    ) {
      soundEngine.playMediaAction(patch.isPlaying ? 'play' : 'pause');
    }
    if (
      patch.currentTrackId &&
      patch.currentTrackId !== appState.audio.currentTrackId
    ) {
      soundEngine.playMediaAction('skip');
    }
    setAppState((prev) => ({
      ...prev,
      audio: { ...prev.audio, ...patch },
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleUpdateTimer = (patch: Partial<TimerSettings>) => {
    setAppState((prev) => {
      const nextTimer = { ...prev.timer, ...patch };
      if (!isTimerRunning) {
        const nextSecs =
          (nextTimer.mode === 'focus'
            ? nextTimer.focusMinutes
            : nextTimer.mode === 'short_break'
            ? nextTimer.shortBreakMinutes
            : nextTimer.mode === 'long_break'
            ? nextTimer.longBreakMinutes
            : nextTimer.customMinutes) * 60;
        setSecondsRemaining(nextSecs);
      }
      return {
        ...prev,
        timer: nextTimer,
        profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
      };
    });
  };

  const handleUpdateProfile = (patch: Partial<UserProfile>) => {
    setAppState((prev) => {
      const nextUserName =
        patch.userName !== undefined ? patch.userName : prev.profile.userName;
      const nextConfigured =
        patch.userName !== undefined
          ? patch.userName.trim().length > 0
          : Boolean(prev.profile.userNameConfigured);
      return {
        ...prev,
        profile: {
          ...prev.profile,
          ...patch,
          userName: nextUserName,
          userNameConfigured: nextConfigured,
          lastSavedAt: stampSaveTime(),
        },
      };
    });
  };

  const handleUpdateSecurity = (patch: Partial<SecuritySettings>) => {
    setAppState((prev) => ({
      ...prev,
      security: { ...prev.security, ...patch },
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleApplyPreset = (preset: SpacePreset) => {
    setAppState((prev) => ({
      ...prev,
      environment: {
        ...prev.environment,
        sceneId: preset.sceneId,
        timeOfDay: preset.timeOfDay,
        weather: preset.weather,
        lightingWarmth: preset.lightingWarmth,
        uiTransparency: preset.uiTransparency,
      },
      style: {
        ...prev.style,
        accentColor: preset.accentColor,
      },
      audio: {
        ...prev.audio,
        currentTrackId: preset.musicTrackId,
        ambientSoundId: preset.ambientSoundId,
      },
      timer: {
        ...prev.timer,
        focusMinutes: preset.focusMinutes,
        shortBreakMinutes: preset.shortBreakMinutes,
      },
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
    if (!isTimerRunning) {
      setSecondsRemaining(preset.focusMinutes * 60);
    }
  };

  const handleSaveCustomPreset = (name: string, subtitle: string) => {
    const newPreset: SpacePreset = {
      id: `custom_preset_${Date.now()}`,
      name,
      subtitle,
      badgeIcon: '✨',
      isCustom: true,
      sceneId: appState.environment.sceneId,
      timeOfDay: appState.environment.timeOfDay,
      weather: appState.environment.weather,
      lightingWarmth: appState.environment.lightingWarmth,
      musicTrackId: appState.audio.currentTrackId,
      ambientSoundId: appState.audio.ambientSoundId,
      accentColor: appState.style.accentColor,
      uiTransparency: appState.environment.uiTransparency,
      focusMinutes: appState.timer.focusMinutes,
      shortBreakMinutes: appState.timer.shortBreakMinutes,
    };
    setAppState((prev) => ({
      ...prev,
      presets: [newPreset, ...prev.presets],
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleDeleteCustomPreset = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      presets: prev.presets.filter((p) => p.id !== id),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  // Audio track cycling & playlist/category queue management
  const [manifestTick, setManifestTick] = useState(0);
  useEffect(() => {
    return soundEngine.subscribeManifest(() => setManifestTick((v) => v + 1));
  }, []);

  const unifiedLibraryTracks = useMemo(
    () => soundEngine.getAllLibraryTracks(appState.audio.customTracks),
    [appState.audio.customTracks, manifestTick]
  );

  const allTracksList = useMemo(
    () => unifiedLibraryTracks.map((t) => t.id),
    [unifiedLibraryTracks]
  );

  const activeQueueTrackIds = useMemo(() => {
    if (appState.audio.activePlaylistId) {
      const pl = (appState.audio.playlists || []).find(
        (p) => p.id === appState.audio.activePlaylistId
      );
      if (pl && pl.trackIds.length > 0) {
        return pl.trackIds;
      }
    }
    const cat = appState.audio.activeCategory || 'all';
    if (cat === 'favorites') {
      const favs = appState.audio.favoriteTrackIds || [];
      if (favs.length > 0) return favs;
    } else if (cat === 'custom') {
      const customs = appState.audio.customTracks.map((t) => t.id);
      if (customs.length > 0) return customs;
    } else if (cat !== 'all') {
      const catIds = unifiedLibraryTracks
        .filter((t) => t.category === cat)
        .map((t) => t.id);
      if (catIds.length > 0) return catIds;
    }
    return allTracksList;
  }, [
    appState.audio.activePlaylistId,
    appState.audio.playlists,
    appState.audio.activeCategory,
    appState.audio.favoriteTrackIds,
    appState.audio.customTracks,
    unifiedLibraryTracks,
    allTracksList,
  ]);

  const recordTrackPlay = (
    trackId: string,
    playlistId?: string | null,
    extraPatch?: Partial<AudioSettings>
  ) => {
    const now = new Date();
    const playedAt = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    setAppState((prev) => {
      const prevRecent = (prev.audio.recentlyPlayed || []).filter(
        (r) => r.trackId !== trackId
      );
      const nextRecent = [
        { trackId, playedAt, timestamp: now.getTime() },
        ...prevRecent,
      ].slice(0, 24);
      return {
        ...prev,
        audio: {
          ...prev.audio,
          ...extraPatch,
          currentTrackId: trackId,
          isPlaying: true,
          activePlaylistId:
            playlistId !== undefined ? playlistId : prev.audio.activePlaylistId,
          recentlyPlayed: nextRecent,
        },
        profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
      };
    });
  };

  const handleSelectTrack = (trackId: string, playlistId?: string | null) => {
    recordTrackPlay(trackId, playlistId);
  };

  const handleNextTrack = (manualClick = true) => {
    const queue =
      activeQueueTrackIds.length > 0 ? activeQueueTrackIds : allTracksList;
    if (queue.length === 0) return;

    if (appState.audio.shuffle && queue.length > 1) {
      const others = queue.filter((id) => id !== appState.audio.currentTrackId);
      const randomId = others[Math.floor(Math.random() * others.length)];
      recordTrackPlay(randomId);
      return;
    }

    const idx = queue.indexOf(appState.audio.currentTrackId);
    if (
      !manualClick &&
      appState.audio.repeatMode === 'off' &&
      idx === queue.length - 1
    ) {
      handleUpdateAudio({ isPlaying: false });
      return;
    }
    const nextId = queue[(idx + 1) % queue.length];
    recordTrackPlay(nextId);
  };

  useEffect(() => {
    soundEngine.setOnTrackEnded(() => {
      handleNextTrack(false);
    });
    return () => {
      soundEngine.setOnTrackEnded(null);
    };
  }, [
    activeQueueTrackIds,
    allTracksList,
    appState.audio.currentTrackId,
    appState.audio.shuffle,
    appState.audio.repeatMode,
  ]);

  // Connect to Electron Desktop IPC Bridge (window.habitraDesktop) when running as Windows .exe
  useEffect(() => {
    const desktopApi = (
      window as unknown as {
        habitraDesktop?: {
          setBackgroundPref?: (enabled: boolean) => void;
          setStartupPref?: (enabled: boolean) => void;
          updateTrayTooltip?: (text: string) => void;
          onTrayAction?: (cb: (action: string) => void) => () => void;
          onMinimizedToTray?: (cb: (minimized: boolean) => void) => () => void;
        };
      }
    ).habitraDesktop;
    if (!desktopApi) return;

    desktopApi.setBackgroundPref?.(
      appState.profile.keepRunningInBackground !== false
    );
    desktopApi.setStartupPref?.(Boolean(appState.profile.startWithWindows));
    desktopApi.updateTrayTooltip?.(
      `🌱 Habitra — ${stats.completedToday}/${stats.totalHabits} habits done today`
    );

    const unsubscribeMinimized = desktopApi.onMinimizedToTray?.(
      (minimized: boolean) => {
        setIsMinimizedToTray(minimized);
      }
    );

    const unsubscribe = desktopApi.onTrayAction?.((action: string) => {
      if (action === 'open') {
        setIsMinimizedToTray(false);
      } else if (action === 'progress') {
        setIsMinimizedToTray(false);
        setActiveTab('statistics');
      } else if (action === 'start_focus') {
        if (!isTimerRunning) handleStartPauseTimer();
      } else if (action === 'pause_notif') {
        handleUpdateProfile({ notificationsEnabled: false });
      } else if (action === 'resume_notif') {
        handleUpdateProfile({ notificationsEnabled: true });
      } else if (action === 'lock') {
        if (appState.security.passwordHash) {
          handleUpdateSecurity({ isLocked: true });
        } else {
          setSecurityModalOpen(true);
        }
      } else if (action === 'settings') {
        setIsMinimizedToTray(false);
        setActiveTab('settings');
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof unsubscribeMinimized === 'function') unsubscribeMinimized();
    };
  }, [
    appState.profile.keepRunningInBackground,
    appState.profile.startWithWindows,
    appState.security.passwordHash,
    stats.completedToday,
    stats.totalHabits,
    isTimerRunning,
  ]);

  const handlePrevTrack = () => {
    const queue =
      activeQueueTrackIds.length > 0 ? activeQueueTrackIds : allTracksList;
    if (queue.length === 0) return;
    const idx = queue.indexOf(appState.audio.currentTrackId);
    const prevId =
      queue[(idx - 1 + queue.length) % queue.length];
    recordTrackPlay(prevId);
  };

  const handleUploadLocalTracks = (newTracks: CustomAudioTrack[]) => {
    setAppState((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        customTracks: [...prev.audio.customTracks, ...newTracks],
        currentTrackId: newTracks[0].id,
        isPlaying: true,
      },
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleResetAllData = async () => {
    setIsTimerRunning(false);
    setTimerBannerMessage(null);
    const fresh = await clearAllAppDataInDB();
    setSecondsRemaining(fresh.timer.focusMinutes * 60);
    setAppState(fresh);
    soundEngine.syncSettings(fresh.audio);
    setReminderToast('✓ All local Habitra data has been reset to defaults.');
    window.setTimeout(() => setReminderToast(null), 3500);
  };

  // Timer handlers with persistent epoch timestamps for zero-drift background accuracy
  const handleStartPauseTimer = () => {
    setTimerBannerMessage(null);
    setIsTimerRunning((currentlyRunning) => {
      const nextRunning = !currentlyRunning;
      soundEngine.playTimerAction(nextRunning ? 'start' : 'pause');
      const nowMs = Date.now();
      setAppState((prev) => ({
        ...prev,
        timer: {
          ...prev.timer,
          timerStatus: nextRunning ? 'running' : 'paused',
          startTimestamp: nextRunning ? nowMs : prev.timer.startTimestamp,
          endTimestamp: nextRunning
            ? nowMs + secondsRemaining * 1000
            : null,
          pausedRemainingSeconds: nextRunning ? null : secondsRemaining,
        },
        profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
      }));
      return nextRunning;
    });
  };

  const handleResetTimer = () => {
    soundEngine.playTimerAction('reset');
    setIsTimerRunning(false);
    setTimerBannerMessage(null);
    const secs =
      (appState.timer.mode === 'focus'
        ? appState.timer.focusMinutes
        : appState.timer.mode === 'short_break'
        ? appState.timer.shortBreakMinutes
        : appState.timer.mode === 'long_break'
        ? appState.timer.longBreakMinutes
        : appState.timer.customMinutes) * 60;
    setSecondsRemaining(secs);
    setAppState((prev) => ({
      ...prev,
      timer: {
        ...prev.timer,
        timerStatus: 'idle',
        startTimestamp: null,
        endTimestamp: null,
        pausedRemainingSeconds: null,
      },
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleChangeTimerMode = (mode: TimerMode) => {
    setIsTimerRunning(false);
    setTimerBannerMessage(null);
    const secs =
      (mode === 'focus'
        ? appState.timer.focusMinutes
        : mode === 'short_break'
        ? appState.timer.shortBreakMinutes
        : mode === 'long_break'
        ? appState.timer.longBreakMinutes
        : appState.timer.customMinutes) * 60;
    setSecondsRemaining(secs);
    setAppState((prev) => ({
      ...prev,
      timer: {
        ...prev.timer,
        mode,
        timerStatus: 'idle',
        startTimestamp: null,
        endTimestamp: null,
        pausedRemainingSeconds: null,
      },
    }));
  };

  const handleSkipTimer = () => {
    const nextMode: TimerMode =
      appState.timer.mode === 'focus' ? 'short_break' : 'focus';
    handleChangeTimerMode(nextMode);
  };

  // Room Layout & Journal & Versioned Snapshot handlers
  const handleUpdateRoomObject = (
    id: RoomObjectId,
    patch: Partial<RoomObjectPlacement>
  ) => {
    setAppState((prev) => {
      const currentMap = prev.roomLayout || createDefaultRoomLayout();
      const existing = currentMap[id] || {
        id,
        x: 50,
        y: 50,
        visible: true,
      };
      return {
        ...prev,
        roomLayout: {
          ...currentMap,
          [id]: { ...existing, ...patch },
        },
        profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
      };
    });
  };

  const handleResetRoomLayout = () => {
    setAppState((prev) => ({
      ...prev,
      roomLayout: createDefaultRoomLayout(),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleSaveJournalEntry = (
    dateStr: string,
    content: string,
    mood: string
  ) => {
    setAppState((prev) => ({
      ...prev,
      journalEntries: {
        ...(prev.journalEntries || {}),
        [dateStr]: {
          dateStr,
          content,
          mood,
          updatedAt: stampSaveTime(),
        },
      },
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleOpenCameraForHabit = (habitId?: string) => {
    setCameraPreselectedHabitId(habitId || null);
    setActiveTab('dailylog');
  };

  const handleAddDailyUpdate = (
    update: Omit<DailyPhotoUpdate, 'id'>,
    markHabitDone: boolean
  ) => {
    const newEntry: DailyPhotoUpdate = {
      ...update,
      id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    setAppState((prev) => {
      const nextCompletions = { ...prev.completions };
      if (markHabitDone && update.habitId) {
        nextCompletions[`${update.habitId}_${update.dateStr}`] = true;
      }
      return {
        ...prev,
        completions: nextCompletions,
        dailyUpdates: [newEntry, ...(prev.dailyUpdates || [])],
        profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
      };
    });
  };

  const handleDeleteDailyUpdate = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      dailyUpdates: (prev.dailyUpdates || []).filter((u) => u.id !== id),
      profile: { ...prev.profile, lastSavedAt: stampSaveTime() },
    }));
  };

  const handleCreateVersionedSnapshot = () => {
    const snap = createVersionedBackupSnapshot(appState);
    const todayStr = formatLocalYMD(new Date());
    setAppState((prev) => ({
      ...prev,
      versionedBackups: [snap, ...(prev.versionedBackups || []).slice(0, 14)],
      profile: {
        ...prev.profile,
        lastBackupAt: todayStr,
        lastSavedAt: stampSaveTime(),
      },
    }));
    setReminderToast(`✓ Snapshot saved: ${snap.label}`);
    window.setTimeout(() => setReminderToast(null), 3500);
  };

  const handleRestoreVersionedSnapshot = (entry: VersionedBackupEntry) => {
    try {
      const restored = parseBackupJson(entry.snapshotJson);
      setAppState({
        ...restored,
        versionedBackups: appState.versionedBackups,
      });
      setReminderToast(`✓ Restored snapshot: ${entry.label}`);
      window.setTimeout(() => setReminderToast(null), 3500);
    } catch {
      setReminderToast('⚠ Could not restore snapshot');
    }
  };

  const handleMinimizeToTray = () => {
    setIsMinimizedToTray(true);
    if (!appState.profile.hasSeenTrayNotice) {
      setShowFirstTimeTrayToast(true);
      handleUpdateProfile({ hasSeenTrayNotice: true });
      sendDesktopNotification(
        '🌱 Habitra Running in Background',
        "Habitra is still running in the background. You'll continue receiving your reminders.",
        'system',
        '🌱'
      );
    }
  };

  // Global Keyboard Shortcuts (Ctrl+K, N, G, Space, M, F, L, 1-5, Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Never allow global shortcuts while workspace is password-locked or in the Welcome Wizard
      if (
        (appState.security.isLocked && appState.security.passwordHash) ||
        welcomeModalOpen
      ) {
        return;
      }

      // Ctrl+K or Cmd+K opens Command Palette from anywhere
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
          return;
        }
        if (ambientModeOpen) {
          setAmbientModeOpen(false);
          return;
        }
        setInspectingHabitId(null);
        setHabitModalOpen(false);
        setGoalModalOpen(false);
        setReminderModalOpen(false);
        setSecurityModalOpen(false);
        setNotificationCenterOpen(false);
        setJournalModalOpen(false);
        setShowSearchBar(false);
        return;
      }

      if (isInputFocused || e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        setEditingHabit(null);
        setHabitModalOpen(true);
      } else if (key === 'g') {
        e.preventDefault();
        setEditingGoal(null);
        setGoalModalOpen(true);
      } else if (e.key === ' ') {
        e.preventDefault();
        handleStartPauseTimer();
      } else if (key === 'm') {
        e.preventDefault();
        handleUpdateAudio({ isMuted: !appState.audio.isMuted });
      } else if (key === 'f') {
        e.preventDefault();
        setAmbientModeOpen((v) => !v);
      } else if (key === 'l') {
        e.preventDefault();
        if (appState.security.passwordHash) {
          handleUpdateSecurity({ isLocked: true });
        } else {
          setSecurityModalOpen(true);
        }
      } else if (key === '1') {
        setActiveTab('dashboard');
      } else if (key === '2') {
        setActiveTab('habits');
      } else if (key === '3') {
        setActiveTab('calendar');
      } else if (key === '4') {
        setActiveTab('goals');
      } else if (key === '5') {
        setActiveTab('timer');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    commandPaletteOpen,
    ambientModeOpen,
    welcomeModalOpen,
    appState.audio.isMuted,
    appState.security.isLocked,
    appState.security.passwordHash,
    secondsRemaining,
  ]);

  // Filter active habits by search query for Dashboard & Calendar
  const filteredActiveHabits = useMemo(() => {
    if (!searchQuery.trim()) return activeHabits;
    const q = searchQuery.toLowerCase();
    return activeHabits.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.description && h.description.toLowerCase().includes(q))
    );
  }, [activeHabits, searchQuery]);

  // Filter all habits (including archived) for Habits Management View
  const filteredAllHabits = useMemo(() => {
    if (!searchQuery.trim()) return appState.habits;
    const q = searchQuery.toLowerCase();
    return appState.habits.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.description && h.description.toLowerCase().includes(q))
    );
  }, [appState.habits, searchQuery]);

  const inspectingHabit = useMemo(
    () =>
      inspectingHabitId
        ? appState.habits.find((h) => h.id === inspectingHabitId) || null
        : null,
    [appState.habits, inspectingHabitId]
  );

  const dataSizeFormatted = useMemo(
    () => estimateDataSizeFormatted(appState),
    [appState]
  );

  // Compute XP, Achievements & Unlocked Progress Garden Objects
  const xpStatus = useMemo(
    () =>
      calculateUserXPAndLevel(
        appState.habits,
        appState.completions,
        computedGoals,
        appState.timer.history || [],
        stats.overallBestStreak
      ),
    [
      appState.habits,
      appState.completions,
      computedGoals,
      appState.timer.history,
      stats.overallBestStreak,
    ]
  );

  const achievementsList = useMemo(
    () =>
      evaluateAchievements(
        appState.habits,
        appState.completions,
        computedGoals,
        appState.timer.history || [],
        stats.overallBestStreak,
        appState.profile.waterCompletedToday,
        appState.profile.waterDailyGoal
      ),
    [
      appState.habits,
      appState.completions,
      computedGoals,
      appState.timer.history,
      stats.overallBestStreak,
      appState.profile.waterCompletedToday,
      appState.profile.waterDailyGoal,
    ]
  );

  const unlockedObjectIds = useMemo(() => {
    const totalFocusMins = (appState.timer.history || [])
      .filter((s) => s.mode === 'focus')
      .reduce((acc, s) => acc + s.minutes, 0);
    return ROOM_OBJECT_CATALOG.filter((item) =>
      isRoomObjectUnlocked(
        item,
        stats.overallBestStreak,
        stats.totalCompletedAllTime,
        totalFocusMins
      )
    ).map((item) => item.id);
  }, [
    appState.timer.history,
    stats.overallBestStreak,
    stats.totalCompletedAllTime,
  ]);

  const unreadNotificationCount = useMemo(
    () =>
      (appState.notificationHistory || []).filter((n) => !n.read).length +
      missedReminders.length,
    [appState.notificationHistory, missedReminders.length]
  );

  // Dynamic panel styling based on user's transparency, high-contrast, and font settings
  const panelAlpha = appState.style.highContrast
    ? 0.98
    : Math.min(0.98, Math.max(0.35, appState.environment.uiTransparency / 100));

  const panelBgStyle: React.CSSProperties = {
    backgroundColor: `rgba(17, 24, 39, ${panelAlpha})`,
    backdropFilter: 'blur(12px)',
    borderRadius: `${appState.style.cornerRadius}px`,
  };

  const rootFontClass =
    appState.style.fontFamily === 'pixel'
      ? 'font-pixel'
      : appState.style.fontFamily === 'mono'
      ? 'font-mono-tabular'
      : '';

  // Prevent exposing the dashboard before IndexedDB state & password lock check complete
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col items-center justify-center p-6 select-none">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-3xl mb-3 animate-pulse">
          🏡
        </div>
        <div className="text-lg font-bold text-white tracking-tight">
          Habitra
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          Small Habits. Big Life.
        </div>
      </div>
    );
  }

  // Lock screen check (strictly takes priority before Welcome Setup or Dashboard)
  if (appState.security.isLocked && appState.security.passwordHash) {
    return (
      <SecurityLockOverlay
        security={appState.security}
        environment={appState.environment}
        styleSettings={appState.style}
        userName={appState.profile.userName}
        onUnlock={() => handleUpdateSecurity({ isLocked: false })}
        onUpdateSecurity={handleUpdateSecurity}
        onEmergencyReset={handleResetAllData}
      />
    );
  }

  const navItems: {
    id: NavigationTab;
    label: string;
    subtitle: string;
    group: 'Daily Tracking' | 'Focus & Audio' | 'Insights & Space';
    icon: React.ElementType;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      subtitle: 'Daily overview & sanctuary',
      group: 'Daily Tracking',
      icon: Home,
    },
    {
      id: 'habits',
      label: 'Habits',
      subtitle: 'Manage & track all habits',
      group: 'Daily Tracking',
      icon: CheckSquare,
    },
    {
      id: 'dailylog',
      label: 'Daily Camera',
      subtitle: 'Photo check-ins & visual log',
      group: 'Daily Tracking',
      icon: Camera,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      subtitle: 'Monthly completion matrix',
      group: 'Daily Tracking',
      icon: CalendarIcon,
    },
    {
      id: 'goals',
      label: 'Goals',
      subtitle: 'Long-term milestones',
      group: 'Daily Tracking',
      icon: Target,
    },
    {
      id: 'timer',
      label: 'Focus Timer',
      subtitle: 'Pomodoro & deep work studio',
      group: 'Focus & Audio',
      icon: TimerIcon,
    },
    {
      id: 'music',
      label: 'Music Player',
      subtitle: 'Lo-Fi tracks & ambient mixer',
      group: 'Focus & Audio',
      icon: Music,
    },
    {
      id: 'reminders',
      label: 'Reminders',
      subtitle: 'Alerts & water hydration',
      group: 'Focus & Audio',
      icon: Bell,
    },
    {
      id: 'statistics',
      label: 'Statistics',
      subtitle: 'Streaks, XP & analytics',
      group: 'Insights & Space',
      icon: BarChart3,
    },
    {
      id: 'myspace',
      label: 'My Space',
      subtitle: 'Customize scenes & theme',
      group: 'Insights & Space',
      icon: Sparkles,
    },
    {
      id: 'settings',
      label: 'Settings',
      subtitle: 'Profile, lock & local backup',
      group: 'Insights & Space',
      icon: Settings,
    },
  ];

  const activeNavMeta =
    navItems.find((item) => item.id === activeTab) || navItems[0];
  const ActiveSectionIcon = activeNavMeta.icon;
  const navGroups: ('Daily Tracking' | 'Focus & Audio' | 'Insights & Space')[] =
    ['Daily Tracking', 'Focus & Audio', 'Insights & Space'];

  const sidebarPosterScene =
    PIXEL_SCENES.find((s) => s.id === 'living_sanctuary') || PIXEL_SCENES[0];

  const worldStage = computeWorldStage(
    stats.dailyProgressPercent,
    stats.overallCurrentStreak,
    appState.profile.waterCompletedToday,
    appState.profile.waterDailyGoal,
    appState.timer.totalFocusMinutesToday,
    xpStatus.level
  );

  const currentTrackObj =
    soundEngine
      .getAllLibraryTracks(appState.audio.customTracks)
      .find((t) => t.id === appState.audio.currentTrackId) ||
    BUILTIN_MUSIC_TRACKS[0];

  const timerFormattedStr = `${String(
    Math.floor(secondsRemaining / 60)
  ).padStart(2, '0')}:${String(secondsRemaining % 60).padStart(2, '0')}`;

  const isLivingWorldMode =
    appState.environment.worldViewMode !== 'classic_studio';

  return (
    <div
      className={`min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col md:flex-row relative overflow-x-hidden ${rootFontClass}`}
      style={{
        fontSize: `${appState.style.uiScale}%`,
      }}
    >
      {/* Subtle Full-Window Ambient Backdrop Glow */}
      {!appState.environment.minimalMode && (
        <div
          className="fixed inset-0 pointer-events-none opacity-20 z-0 transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at 50% 15%, ${currentScene.accentGlow}, transparent 65%)`,
          }}
        />
      )}

      {/* Streak Record Toast & Interactive Reminder Toast with Action Buttons */}
      {(streakToast || reminderToast) && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
          {streakToast && (
            <div className="px-4 py-2.5 rounded-xl bg-amber-500/95 text-slate-950 font-semibold text-xs shadow-2xl flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{streakToast}</span>
            </div>
          )}
          {reminderToast && (
            <div className="px-4 py-2.5 rounded-xl bg-[#111827]/95 border border-indigo-500/50 text-white font-medium text-xs shadow-2xl flex flex-wrap items-center gap-3 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{reminderToast}</span>
              </div>
              {activeToastAction && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-white/15">
                  {(activeToastAction.habitId || activeToastAction.reminderId) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeToastAction.habitId) {
                          handleToggleHabitCompletion(
                            activeToastAction.habitId,
                            formatLocalYMD(new Date())
                          );
                        } else if (activeToastAction.reminderId) {
                          const remId = activeToastAction.reminderId;
                          setAppState((prev) => ({
                            ...prev,
                            reminders: prev.reminders.map((r) =>
                              r.id === remId
                                ? {
                                    ...r,
                                    completedTodayCount:
                                      (r.completedTodayCount || 0) + 1,
                                  }
                                : r
                            ),
                          }));
                        }
                        setReminderToast(null);
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold cursor-pointer"
                    >
                      ✓ Complete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const snoozedAction = activeToastAction;
                      setReminderToast('⏰ Snoozed for 10 minutes');
                      setActiveToastAction(null);
                      window.setTimeout(() => setReminderToast(null), 2000);
                      window.setTimeout(() => {
                        sendDesktopNotification(
                          `⏰ ${snoozedAction.title}`,
                          'Snoozed reminder (10m) is due now.',
                          'custom',
                          '⏰',
                          {
                            habitId: snoozedAction.habitId,
                            reminderId: snoozedAction.reminderId,
                          }
                        );
                      }, 10 * 60 * 1000);
                    }}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] cursor-pointer"
                  >
                    Snooze 10m
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderToast(null)}
                    className="text-slate-400 hover:text-white text-[10px] px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Storage Warning Banner (if IndexedDB & localStorage are both blocked) */}
      {storageWarning && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm p-3.5 rounded-xl bg-rose-950/95 border border-rose-500/50 text-xs text-rose-200 shadow-xl">
          ⚠ {storageWarning}
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION (Desktop & Laptop) */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 border-r border-slate-800/80 bg-[#0d1322]/95 backdrop-blur-xl z-20 transition-all duration-200 sticky top-0 h-screen overflow-hidden ${
          sidebarCollapsed ? 'w-[74px]' : 'w-[240px]'
        }`}
      >
        <div className="p-3.5 flex-1 min-h-0 flex flex-col overflow-y-auto">
          {/* Brand Title Row */}
          <div className="flex items-center justify-between gap-2 px-1.5 py-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-base shrink-0">
                🏡
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white tracking-tight truncate">
                    {appState.profile.appName || 'Habitra'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Small Habits. Big Life.
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer shrink-0"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Categorized Nav Links */}
          <nav className="space-y-4">
            {navGroups.map((groupName) => {
              const itemsInGroup = navItems.filter(
                (i) => i.group === groupName
              );
              return (
                <div key={groupName} className="space-y-1">
                  {!sidebarCollapsed && (
                    <div className="px-2.5 pb-1 text-[10px] font-semibold text-slate-500 tracking-wider">
                      {groupName}
                    </div>
                  )}
                  {itemsInGroup.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                          active
                            ? 'text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                        }`}
                        style={
                          active
                            ? { backgroundColor: appState.style.accentColor }
                            : undefined
                        }
                        title={
                          sidebarCollapsed
                            ? `${item.label} — ${item.subtitle}`
                            : item.subtitle
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" />
                          {!sidebarCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>
                        {!sidebarCollapsed &&
                          item.id === 'dailylog' &&
                          (appState.dailyUpdates || []).length > 0 && (
                            <span className="text-[10px] font-mono-tabular opacity-80">
                              {(appState.dailyUpdates || []).length}
                            </span>
                          )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Cozy Pixel Vignette & Quote */}
        {!sidebarCollapsed && !appState.environment.minimalMode && (
          <div className="p-3.5 shrink-0">
            <div className="rounded-2xl overflow-hidden border border-slate-800/90 bg-slate-950/90">
              {sidebarPosterScene.imageUrl && (
                <div className="h-24 w-full relative overflow-hidden">
                  <img
                    src={sidebarPosterScene.imageUrl}
                    alt="Cozy study motivation"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                </div>
              )}
              <div className="p-2 text-center">
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium line-clamp-2">
                  {appState.profile.sidebarQuote}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* MOBILE SLIDE-OVER NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] bg-[#0d1322] border-r border-slate-800 h-full p-4 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-base">
                    🏡
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {appState.profile.appName || 'Habitra'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      All Sections
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {navGroups.map((groupName) => (
                  <div key={groupName} className="space-y-1">
                    <div className="px-2 text-[10px] font-semibold text-slate-500 tracking-wider">
                      {groupName}
                    </div>
                    {navItems
                      .filter((i) => i.group === groupName)
                      .map((item) => {
                        const Icon = item.icon;
                        const active = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                              active
                                ? 'text-white shadow-md'
                                : 'text-slate-300 hover:bg-slate-800/60'
                            }`}
                            style={
                              active
                                ? {
                                    backgroundColor:
                                      appState.style.accentColor,
                                  }
                                : undefined
                            }
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">
                                {item.label}
                              </div>
                              <div
                                className={`text-[10px] truncate ${
                                  active ? 'text-white/80' : 'text-slate-400'
                                }`}
                              >
                                {item.subtitle}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE CONTAINER (Dedicated Single-Section Layout) */}
      <div className="flex-1 flex flex-col min-w-0 z-10 pb-20 md:pb-8">
        <div className="flex-1 flex flex-col gap-4 p-3 sm:p-5 max-w-[1440px] w-full mx-auto">
          {/* CLEAN UNIFIED TOP WORKSPACE HEADER BAR (Mobile & Laptop) */}
          <header
            className="rounded-2xl border border-slate-800/90 px-4 py-3 shadow-lg flex flex-wrap items-center justify-between gap-3"
            style={panelBgStyle}
          >
            {/* Left: Mobile Menu Trigger + Active Section Title & Subtitle */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer shrink-0"
                title="Open All Sections Menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 border border-white/15"
                style={{ backgroundColor: `${appState.style.accentColor}33` }}
              >
                <ActiveSectionIcon className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    {activeNavMeta.label}
                  </h1>
                  <span className="hidden sm:inline text-xs text-slate-500">
                    ·
                  </span>
                  <span className="hidden sm:inline text-xs text-slate-400 truncate">
                    {activeNavMeta.subtitle}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {saveStatus === 'saving' ? (
                    <span className="text-amber-300">Saving...</span>
                  ) : saveStatus === 'error' ? (
                    <span className="text-rose-400">⚠ Save retrying</span>
                  ) : (
                    <span className="text-emerald-400">✓ Saved locally</span>
                  )}
                  {appState.profile.xpEnabled !== false && (
                    <>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('statistics')}
                        className="font-mono-tabular text-indigo-300 hover:text-indigo-200 cursor-pointer"
                      >
                        Lv.{xpStatus.level} ({xpStatus.totalXP} XP)
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Background Timer/Audio Status Pills + Date Control + Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Compact Focus Timer Status Button when on another tab */}
              {activeTab !== 'timer' && (isTimerRunning || appState.timer.timerStatus === 'paused') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('timer')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-xs font-mono-tabular text-indigo-200 flex items-center gap-1.5 cursor-pointer"
                  title="Go to Focus Timer"
                >
                  <TimerIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{timerFormattedStr}</span>
                </button>
              )}

              {/* Compact Music Status Pill when Music is playing and user is on another tab */}
              {activeTab !== 'music' && appState.audio.isPlaying && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/35 text-xs text-amber-200">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateAudio({ isPlaying: !appState.audio.isPlaying })
                    }
                    className="p-1 rounded hover:bg-white/10 cursor-pointer"
                    title="Pause Music"
                  >
                    <Pause className="w-3 h-3 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('music')}
                    className="max-w-[120px] truncate font-medium hover:underline cursor-pointer"
                    title="Open Music Studio"
                  >
                    {currentTrackObj?.title || 'Music Playing'}
                  </button>
                </div>
              )}

              {/* Dashboard View Mode Toggle (only shown on Dashboard) */}
              {activeTab === 'dashboard' && (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/85 border border-slate-800/90">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateEnvironment({
                        worldViewMode: 'living_world',
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      isLivingWorldMode
                        ? 'bg-teal-500/25 text-teal-200 border border-teal-400/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Living World
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateEnvironment({
                        worldViewMode: 'classic_studio',
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      !isLivingWorldMode
                        ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Studio Grid
                  </button>
                </div>
              )}

              {/* Date Picker (shown on daily tracking sections: Dashboard, Habits, Daily Camera) */}
              {(activeTab === 'dashboard' ||
                activeTab === 'habits' ||
                activeTab === 'dailylog') && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800/90 text-xs">
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-white whitespace-nowrap px-1">
                    {selectedDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() - 1);
                      setSelectedDate(d);
                    }}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
                    title="Previous Day"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(new Date())}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
                    title="Jump to Today"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Global Utility Buttons */}
              <div className="flex items-center gap-1.5">
                {pwaInstallPrompt && (
                  <button
                    type="button"
                    onClick={async () => {
                      await pwaInstallPrompt.prompt();
                      setPwaInstallPrompt(null);
                    }}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    <span>📲 Install</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800/90 text-slate-300 hover:text-white cursor-pointer flex items-center gap-1.5 text-xs"
                  title="Search & Command Palette (Ctrl+K)"
                >
                  <Search className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden lg:inline text-[11px] text-slate-400">
                    Search
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJournalDateStr(selectedDateStr);
                    setJournalModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800/90 text-slate-300 hover:text-white cursor-pointer"
                  title="Daily Reflection Journal"
                >
                  <span className="text-xs">📓</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotificationCenterOpen(true)}
                  className="relative p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800/90 text-slate-300 hover:text-white cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (appState.security.passwordHash) {
                      handleUpdateSecurity({ isLocked: true });
                    } else {
                      setSecurityModalOpen(true);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800/90 text-slate-300 hover:text-amber-300 cursor-pointer"
                  title={
                    appState.security.passwordHash
                      ? 'Lock Workspace (Shortcut: L)'
                      : 'Configure Password Lock (Shortcut: L)'
                  }
                >
                  <Lock className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* MOBILE SCROLLABLE SECTION PILL BAR (Quick 1-Tap Access to All 11 Separate Sections) */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                    active
                      ? 'text-white border-transparent shadow'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300'
                  }`}
                  style={
                    active
                      ? { backgroundColor: appState.style.accentColor }
                      : undefined
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN DEDICATED SECTION CONTENT */}
          <main className="flex-1 min-w-0 space-y-5">
            {/* Optional Search Bar */}
            {showSearchBar && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter habits by name or notes..."
                  autoFocus
                  className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* 1. DASHBOARD SECTION (Strictly Dashboard Only — No Attached Calendar, Music Player, or Customize Space) */}
            {activeTab === 'dashboard' && (
              <div className="space-y-5">
                {!appState.environment.minimalMode ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800/90 shadow-2xl">
                    <PixelEnvironmentCanvas
                      environment={appState.environment}
                      styleSettings={appState.style}
                      isFocusTimerRunning={isTimerRunning}
                      roomLayout={appState.roomLayout}
                      unlockedObjectIds={unlockedObjectIds}
                      lowPowerBackgroundMode={
                        appState.profile.lowPowerBackgroundMode !== false
                      }
                      hotspotContext={{
                        dailyProgressPercent: stats.dailyProgressPercent,
                        completedToday: stats.completedToday,
                        totalHabits: stats.totalHabits,
                        currentStreak: stats.overallCurrentStreak,
                        timerFormatted: timerFormattedStr,
                        isMusicPlaying: appState.audio.isPlaying,
                        currentTrackTitle:
                          currentTrackObj?.title || 'Velvet Rain Lo-Fi',
                        activeGoalsCount: computedGoals.filter(
                          (g) => !g.archived
                        ).length,
                        worldStageName: worldStage.name,
                        onNavigateTab: (tab) => setActiveTab(tab),
                        onToggleFocusTimer: handleStartPauseTimer,
                        onToggleMusicPlay: () =>
                          handleUpdateAudio({
                            isPlaying: !appState.audio.isPlaying,
                          }),
                        onOpenJournal: () => {
                          setJournalDateStr(selectedDateStr);
                          setJournalModalOpen(true);
                        },
                        onCycleTimeOfDay: () => {
                          const order: (
                            | 'morning'
                            | 'afternoon'
                            | 'evening'
                            | 'night'
                          )[] = ['morning', 'afternoon', 'evening', 'night'];
                          const cur =
                            appState.environment.timeOfDay === 'auto'
                              ? 'night'
                              : appState.environment.timeOfDay;
                          const next =
                            order[(order.indexOf(cur) + 1) % order.length];
                          soundEngine.playHabitCheck(true);
                          handleUpdateEnvironment({ timeOfDay: next });
                        },
                        onCycleScenePortal: () => {
                          const idx = PIXEL_SCENES.findIndex(
                            (s) => s.id === appState.environment.sceneId
                          );
                          const next =
                            PIXEL_SCENES[(idx + 1) % PIXEL_SCENES.length];
                          soundEngine.playHabitCheck(true);
                          handleUpdateEnvironment({
                            sceneId: next.id,
                            weather: next.defaultWeather,
                          });
                        },
                        onScrollToSection: (sectionId) => {
                          const el = document.getElementById(sectionId);
                          if (el) {
                            el.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                          }
                        },
                      }}
                      className="w-full h-[260px] sm:h-[320px]"
                    />

                    {/* Clean Top-Right Scene & Ambient Controls inside Canvas */}
                    <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const idx = PIXEL_SCENES.findIndex(
                            (s) => s.id === appState.environment.sceneId
                          );
                          const next =
                            PIXEL_SCENES[(idx + 1) % PIXEL_SCENES.length];
                          handleUpdateEnvironment({
                            sceneId: next.id,
                            weather: next.defaultWeather,
                          });
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/90 backdrop-blur-md text-xs text-white transition-colors cursor-pointer"
                        title="Switch Pixel Scene"
                      >
                        <span>{currentScene.name}</span>
                        <Shuffle className="w-3 h-3 text-slate-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setAmbientModeOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/85 hover:bg-indigo-500 border border-indigo-400/50 backdrop-blur-md text-xs font-medium text-white transition-colors cursor-pointer shadow"
                        title="Enter Full-Screen Ambient Mode (Shortcut: F)"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ambient Mode</span>
                      </button>
                    </div>

                    {/* Bottom-Left Greeting Overlay inside Pixel Room */}
                    <div className="absolute left-5 bottom-5 z-10 pointer-events-none max-w-lg">
                      <div className="text-sm sm:text-base text-slate-200 font-medium drop-shadow">
                        {appState.profile.userName
                          ? greetingText
                          : greetingText.replace(',', '')}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2 mt-0.5 drop-shadow-md">
                        <span>{appState.profile.userName || 'Sanctuary'}</span>
                        <span className="text-xl">🌙</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-200/90 mt-1 drop-shadow">
                        “{appState.profile.quote}”
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-2xl border border-slate-800/90 p-4 flex flex-wrap items-center justify-between gap-3"
                    style={panelBgStyle}
                  >
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {appState.profile.userName &&
                        appState.profile.userName.trim()
                          ? `${greetingText} ${appState.profile.userName.trim()}`
                          : greetingText.replace(',', '')}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Minimal Mode · {stats.completedToday}/{stats.totalHabits}{' '}
                        completed today ({stats.dailyProgressPercent}%)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateEnvironment({ minimalMode: false })
                      }
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show Pixel Scene</span>
                    </button>
                  </div>
                )}

                {/* CLEAN 7-CARD KPI SUMMARY ROW (Below Canvas — Never Overlapping) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2.5">
                  <div
                    className="px-3 py-2.5 rounded-xl border border-slate-800/90 flex items-center gap-2.5"
                    style={panelBgStyle}
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0 text-sm">
                      ☑️
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 truncate">
                        Total Habits
                      </div>
                      <div className="text-base font-bold text-white font-mono-tabular">
                        {stats.totalHabits}
                      </div>
                    </div>
                  </div>

                  <div
                    className="px-3 py-2.5 rounded-xl border border-slate-800/90 flex items-center gap-2.5"
                    style={panelBgStyle}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 text-sm">
                      ✅
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 truncate">
                        Completed Today
                      </div>
                      <div className="text-base font-bold text-white font-mono-tabular">
                        {stats.completedToday}
                      </div>
                    </div>
                  </div>

                  <div
                    className="px-3 py-2.5 rounded-xl border border-slate-800/90 flex items-center gap-2.5"
                    style={panelBgStyle}
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shrink-0 text-sm">
                      📋
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 truncate">
                        Remaining Today
                      </div>
                      <div className="text-base font-bold text-white font-mono-tabular">
                        {stats.remainingToday}
                      </div>
                    </div>
                  </div>

                  <div
                    className="px-3 py-2.5 rounded-xl border border-slate-800/90 flex items-center gap-2.5"
                    style={panelBgStyle}
                  >
                    <MiniRingProgress
                      percent={stats.dailyProgressPercent}
                      color="#10b981"
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 truncate">
                        Daily Progress
                      </div>
                      <div className="text-base font-bold text-white font-mono-tabular">
                        {stats.dailyProgressPercent}%
                      </div>
                    </div>
                  </div>

                  <div
                    className="px-3 py-2.5 rounded-xl border border-slate-800/90 flex items-center gap-2.5"
                    style={panelBgStyle}
                  >
                    <MiniRingProgress
                      percent={stats.weeklyProgressPercent}
                      color="#22c55e"
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 truncate">
                        Weekly Progress
                      </div>
                      <div className="text-base font-bold text-white font-mono-tabular">
                        {stats.weeklyProgressPercent}%
                      </div>
                    </div>
                  </div>

                  <div
                    className="px-3 py-2.5 rounded-xl border border-slate-800/90 flex items-center gap-2.5"
                    style={panelBgStyle}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Flame className="w-4 h-4 fill-current" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 truncate">
                        Current Streak
                      </div>
                      <div className="text-sm font-bold text-white font-mono-tabular whitespace-nowrap">
                        {stats.overallCurrentStreak} days
                      </div>
                    </div>
                  </div>

                  <div
                    className="px-3 py-2.5 rounded-xl border border-slate-800/90 flex items-center gap-2.5"
                    style={panelBgStyle}
                  >
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 truncate">
                        Best Streak
                      </div>
                      <div className="text-sm font-bold text-white font-mono-tabular whitespace-nowrap">
                        {stats.overallBestStreak} days
                      </div>
                    </div>
                  </div>
                </div>

                {isLivingWorldMode ? (
                  <LivingWorldSanctuary
                    habits={filteredActiveHabits}
                    completions={appState.completions}
                    goals={computedGoals}
                    stats={stats}
                    selectedDate={selectedDate}
                    selectedDateStr={selectedDateStr}
                    environment={appState.environment}
                    styleSettings={appState.style}
                    audio={appState.audio}
                    unlockedObjectIds={unlockedObjectIds}
                    waterCompleted={appState.profile.waterCompletedToday}
                    waterGoal={appState.profile.waterDailyGoal}
                    focusSessionsToday={appState.timer.sessionsCompletedToday}
                    focusMinutesToday={appState.timer.totalFocusMinutesToday}
                    xpLevel={xpStatus.level}
                    xpTitle={xpStatus.levelTitle}
                    totalXP={xpStatus.totalXP}
                    nextLevelXP={xpStatus.nextLevelXP}
                    currentLevelXP={xpStatus.totalXP}
                    panelBgStyle={panelBgStyle}
                    onToggleHabitCompletion={handleToggleHabitCompletion}
                    onOpenAddHabit={() => {
                      setEditingHabit(null);
                      setHabitModalOpen(true);
                    }}
                    onOpenEditHabit={(habit) => {
                      setEditingHabit(habit);
                      setHabitModalOpen(true);
                    }}
                    onInspectHabit={(habit) => setInspectingHabitId(habit.id)}
                    onOpenAddGoal={() => {
                      setEditingGoal(null);
                      setGoalModalOpen(true);
                    }}
                    onOpenEditGoal={(goal) => {
                      setEditingGoal(goal);
                      setGoalModalOpen(true);
                    }}
                    onUpdateEnvironment={handleUpdateEnvironment}
                    onUpdateAudio={handleUpdateAudio}
                    onLogWaterCup={() => {
                      soundEngine.playHabitCheck(true);
                      handleUpdateProfile({
                        waterCompletedToday: Math.min(
                          appState.profile.waterDailyGoal + 4,
                          appState.profile.waterCompletedToday + 1
                        ),
                      });
                    }}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                    onOpenCameraForHabit={handleOpenCameraForHabit}
                  />
                ) : (
                  /* 3-COLUMN CLASSIC STUDIO GRID: Today's Habits | Monthly Progress | Top Goals */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* COL 1: TODAY'S HABITS */}
                  <section
                    className="lg:col-span-4 rounded-2xl border border-slate-800/90 p-4 shadow-xl flex flex-col justify-between"
                    style={panelBgStyle}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🗓️</span>
                          <h2 className="text-sm font-semibold text-white">
                            Today&apos;s Habits
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHabit(null);
                            setHabitModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1 shadow transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap"
                          style={{ backgroundColor: appState.style.accentColor }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Habit</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {filteredActiveHabits.length === 0 ? (
                          <div className="py-10 px-4 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800">
                            <p className="text-xs text-slate-400 mb-3">
                              Your habit list is empty. Add your first daily habit to begin tracking!
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHabit(null);
                                setHabitModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                              style={{ backgroundColor: appState.style.accentColor }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Create First Habit</span>
                            </button>
                          </div>
                        ) : (
                          filteredActiveHabits.map((habit) => {
                            const completed = isHabitCompleted(
                              appState.completions,
                              habit.id,
                              selectedDateStr
                            );
                            const st = calculateHabitStreak(
                              habit,
                              appState.completions,
                              selectedDate
                            );
                            const goalDays = Math.max(1, habit.goalDays || 30);
                            const completedDays = st.totalCompletedDays;
                            const goalProgressPct = Math.min(
                              100,
                              Math.round((completedDays / goalDays) * 100)
                            );
                            const isGoalReached = completedDays >= goalDays;

                            return (
                              <div
                                key={habit.id}
                                data-testid={`studio-habit-card-${habit.id}`}
                                className="group p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/70 transition-all space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleHabitCompletion(
                                          habit.id,
                                          selectedDateStr
                                        )
                                      }
                                      aria-label={`Toggle ${habit.name}`}
                                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                        completed
                                          ? 'bg-emerald-500 text-slate-950 border border-emerald-400 shadow-sm'
                                          : 'bg-slate-950 border border-slate-700 hover:border-slate-500'
                                      }`}
                                    >
                                      {completed && (
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      )}
                                    </button>

                                    <span className="text-sm shrink-0">
                                      {habit.icon}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setInspectingHabitId(habit.id)
                                      }
                                      className={`text-xs font-medium truncate text-left cursor-pointer ${
                                        completed
                                          ? 'text-white hover:text-indigo-300'
                                          : 'text-slate-300 hover:text-white'
                                      }`}
                                      title="Click to inspect Habit Details & 16-Week Heatmap"
                                    >
                                      {habit.name}
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-mono-tabular text-emerald-400 flex items-center gap-1">
                                      <span className="text-[10px]">📈</span>
                                      <span>{st.weeklyCompletedCount}/7</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setInspectingHabitId(habit.id)
                                      }
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-indigo-300 transition-opacity cursor-pointer"
                                      title="Habit Details & Heatmap"
                                    >
                                      <BarChart2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingHabit(habit);
                                        setHabitModalOpen(true);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-white transition-opacity cursor-pointer"
                                      title="Edit Habit"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Visual Goal Progress Bar */}
                                <div>
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="text-slate-400 font-mono-tabular">
                                      {completedDays} / {goalDays} days completed
                                    </span>
                                    <span className="font-mono-tabular font-semibold text-slate-300">
                                      {goalProgressPct}%
                                    </span>
                                  </div>
                                  <div
                                    role="progressbar"
                                    aria-label={`${habit.name} goal progress: ${completedDays} of ${goalDays} days completed`}
                                    aria-valuenow={completedDays}
                                    aria-valuemin={0}
                                    aria-valuemax={goalDays}
                                    className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden"
                                  >
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${goalProgressPct}%`,
                                        backgroundColor: isGoalReached
                                          ? '#10b981'
                                          : habit.color ||
                                            appState.style.accentColor,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </section>

                  {/* COL 2: MONTHLY PROGRESS CHART */}
                  {!appState.environment.minimalMode && (
                    <section
                      className="lg:col-span-4 rounded-2xl border border-slate-800/90 p-4 shadow-xl flex flex-col justify-between"
                      style={panelBgStyle}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🌿</span>
                          <h2 className="text-sm font-semibold text-white">
                            Monthly Progress
                          </h2>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300">
                          <span>
                            {monthViewDate.toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Pixel-Art Aesthetic Bar + Trend Line Chart */}
                      <div className="flex-1 flex flex-col justify-center my-2">
                        <div className="relative h-40 flex items-end gap-1 pt-4 pb-6 px-2 border-b border-l border-slate-800/90 mb-2">
                          {/* Y-axis labels */}
                          <div className="absolute -left-1 top-1 text-[10px] font-mono-tabular text-slate-500">
                            100%
                          </div>
                          <div className="absolute -left-1 top-1/2 -translate-y-1/2 text-[10px] font-mono-tabular text-slate-500">
                            50%
                          </div>
                          <div className="absolute -left-1 bottom-5 text-[10px] font-mono-tabular text-slate-500">
                            0%
                          </div>

                          {stats.dailySeriesForMonth.slice(0, 28).map((pt) => {
                            const hPct =
                              chartScope === 'daily'
                                ? pt.percent
                                : chartScope === 'weekly'
                                ? Math.min(
                                    100,
                                    Math.round(
                                      (pt.percent + stats.weeklyProgressPercent) /
                                        2
                                    )
                                  )
                                : stats.monthlyProgressPercent;

                            return (
                              <div
                                key={pt.day}
                                className="flex-1 flex flex-col items-center h-full justify-end group relative"
                                title={`${pt.dateStr}: ${pt.percent}% (${pt.completed}/${stats.totalHabits})`}
                              >
                                {/* Glowing emerald dot on top of bar */}
                                <div
                                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 mb-0.5 shrink-0"
                                  style={{
                                    opacity: hPct > 0 ? 1 : 0.25,
                                  }}
                                />
                                {/* Vertical bar */}
                                <div
                                  className="w-full rounded-t-sm transition-all duration-300"
                                  style={{
                                    height: `${Math.max(8, hPct)}%`,
                                    backgroundColor:
                                      pt.dateStr === selectedDateStr
                                        ? '#34d399'
                                        : appState.style.accentColor,
                                    opacity: hPct > 0 ? 0.85 : 0.2,
                                  }}
                                />
                                {/* X-axis labels every 5 days */}
                                {(pt.day === 1 ||
                                  pt.day % 5 === 0 ||
                                  pt.day === 28) && (
                                  <span className="absolute -bottom-4 text-[9px] font-mono-tabular text-slate-400">
                                    {pt.day}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Scope Switcher: Daily | Weekly | Monthly */}
                      <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-slate-950/70 border border-slate-800/80 mt-2">
                        {(['daily', 'weekly', 'monthly'] as const).map((sc) => {
                          const active = chartScope === sc;
                          return (
                            <button
                              key={sc}
                              type="button"
                              onClick={() => setChartScope(sc)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                                active
                                  ? 'bg-slate-800 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {sc}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* COL 3: TOP GOALS */}
                  {!appState.environment.minimalMode && (
                    <section
                      className="lg:col-span-4 rounded-2xl border border-slate-800/90 p-4 shadow-xl flex flex-col justify-between"
                      style={panelBgStyle}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🎯</span>
                            <h2 className="text-sm font-semibold text-white">
                              Top Goals
                            </h2>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGoal(null);
                              setGoalModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1 shadow transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap"
                            style={{
                              backgroundColor: appState.style.accentColor,
                            }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Goal</span>
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {computedGoals.filter((g) => !g.archived).length ===
                          0 ? (
                            <div className="py-10 px-4 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800">
                              <p className="text-xs text-slate-400 mb-3">
                                No goals added yet. Set your first milestone to track progress!
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGoal(null);
                                  setGoalModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                                style={{
                                  backgroundColor: appState.style.accentColor,
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create First Goal</span>
                              </button>
                            </div>
                          ) : (
                            computedGoals
                              .filter((g) => !g.archived)
                              .slice(0, 3)
                              .map((goal) => (
                                <div
                                  key={goal.id}
                                  onClick={() => {
                                    setEditingGoal(goal);
                                    setGoalModalOpen(true);
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      setEditingGoal(goal);
                                      setGoalModalOpen(true);
                                    }
                                  }}
                                  className="p-3 rounded-xl bg-slate-900/65 hover:bg-slate-900/90 border border-slate-800/80 transition-all cursor-pointer"
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5"
                                      style={{
                                        backgroundColor: `${goal.color}22`,
                                        border: `1px solid ${goal.color}45`,
                                      }}
                                    >
                                      {goal.icon || '🚀'}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-xs font-semibold text-white truncate">
                                          {goal.title}
                                        </h3>
                                        <Star
                                          className={`w-3.5 h-3.5 shrink-0 ${
                                            goal.starred
                                              ? 'text-amber-400 fill-current'
                                              : 'text-slate-600'
                                          }`}
                                        />
                                      </div>

                                      {/* Progress Bar + Percentage */}
                                      <div className="flex items-center gap-2.5 mt-2">
                                        <div className="flex-1 h-2 rounded-full bg-slate-950 overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                              width: `${goal.progress}%`,
                                              backgroundColor: goal.color,
                                            }}
                                          />
                                        </div>
                                        <span className="text-xs font-mono-tabular font-semibold text-slate-200 w-9 text-right">
                                          {goal.progress}%
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1.5 font-mono-tabular">
                                        <CalendarIcon className="w-3 h-3" />
                                        <span>{goal.deadline}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </div>
                )}
              </div>
            )}

            {/* 2. HABITS SECTION */}
            {activeTab === 'habits' && (
              <HabitsManagementView
                habits={filteredAllHabits}
                completions={appState.completions}
                selectedDate={selectedDate}
                onToggleCompletion={handleToggleHabitCompletion}
                onOpenAddHabit={() => {
                  setEditingHabit(null);
                  setHabitModalOpen(true);
                }}
                onOpenEditHabit={(habit) => {
                  setEditingHabit(habit);
                  setHabitModalOpen(true);
                }}
                onInspectHabit={(habit) => setInspectingHabitId(habit.id)}
                onToggleArchiveHabit={handleToggleArchiveHabit}
                onDeleteHabit={handleDeleteHabit}
                styleSettings={appState.style}
                panelBgStyle={panelBgStyle}
              />
            )}

            {/* 3. DAILY CAMERA UPDATES SECTION */}
            {activeTab === 'dailylog' && (
              <DailyCameraUpdateView
                habits={appState.habits}
                completions={appState.completions}
                dailyUpdates={appState.dailyUpdates || []}
                selectedDate={selectedDate}
                initialHabitId={cameraPreselectedHabitId}
                styleSettings={appState.style}
                panelBgStyle={panelBgStyle}
                onAddDailyUpdate={handleAddDailyUpdate}
                onDeleteDailyUpdate={handleDeleteDailyUpdate}
              />
            )}

            {/* 4. CALENDAR SECTION */}
            {activeTab === 'calendar' && (
              <HabitCalendarSection
                habits={filteredActiveHabits}
                completions={appState.completions}
                monthViewDate={monthViewDate}
                onChangeMonth={(delta) => {
                  const next = new Date(
                    monthViewDate.getFullYear(),
                    monthViewDate.getMonth() + delta,
                    1
                  );
                  setMonthViewDate(next);
                }}
                onResetToToday={() => setMonthViewDate(new Date())}
                onToggleCompletion={handleToggleHabitCompletion}
                onInspectHabit={(habit) => setInspectingHabitId(habit.id)}
                styleSettings={appState.style}
                panelBgStyle={panelBgStyle}
                fullMonthMode
              />
            )}

            {/* 5. GOALS SECTION */}
            {activeTab === 'goals' && (
              <GoalsManagementView
                goals={computedGoals}
                habits={appState.habits}
                onOpenAddGoal={() => {
                  setEditingGoal(null);
                  setGoalModalOpen(true);
                }}
                onOpenEditGoal={(goal) => {
                  setEditingGoal(goal);
                  setGoalModalOpen(true);
                }}
                onUpdateGoalProgress={handleUpdateGoalProgress}
                onToggleGoalStar={handleToggleGoalStar}
                onToggleArchiveGoal={handleToggleArchiveGoal}
                onDeleteGoal={handleDeleteGoal}
                styleSettings={appState.style}
                panelBgStyle={panelBgStyle}
              />
            )}

            {/* 6. FOCUS TIMER STUDIO SECTION (Complete Standalone View) */}
            {activeTab === 'timer' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left 7 Cols: Main Pomodoro & Deep Work Timer Deck */}
                <section
                  className="lg:col-span-7 rounded-2xl border border-slate-800/90 p-6 shadow-xl flex flex-col items-center justify-between text-center space-y-5"
                  style={panelBgStyle}
                >
                  <div className="w-full flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono-tabular text-indigo-300 font-semibold">
                      Cycle {appState.timer.currentCycle || 1} of{' '}
                      {appState.timer.totalCycles || 4}
                    </span>

                    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/85 border border-slate-800">
                      {(
                        [
                          { id: 'focus', label: 'Focus' },
                          { id: 'short_break', label: 'Short Break' },
                          { id: 'long_break', label: 'Long Break' },
                          { id: 'custom', label: 'Custom' },
                        ] as { id: TimerMode; label: string }[]
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleChangeTimerMode(m.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            appState.timer.mode === m.id
                              ? 'bg-indigo-600 text-white shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setAmbientModeOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-400/40 text-xs text-indigo-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Ambient Mode</span>
                    </button>
                  </div>

                  {timerBannerMessage && (
                    <div className="w-full p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-medium">
                      {timerBannerMessage}
                    </div>
                  )}

                  <div className="py-6 space-y-2">
                    <div className="text-6xl sm:text-7xl font-bold text-white font-mono-tabular tracking-tight">
                      {timerFormattedStr}
                    </div>
                    <p className="text-xs text-slate-400 font-mono-tabular">
                      Completed today: {appState.timer.sessionsCompletedToday}{' '}
                      sessions ({appState.timer.totalFocusMinutesToday} mins
                      deep work)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                    <button
                      type="button"
                      onClick={handleStartPauseTimer}
                      className="px-7 py-3 rounded-xl font-semibold text-sm text-white shadow-lg flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-95"
                      style={{ backgroundColor: appState.style.accentColor }}
                    >
                      {isTimerRunning ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>Pause Session</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Start Focus Session</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetTimer}
                      className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipTimer}
                      className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span>Skip Phase</span>
                    </button>
                  </div>
                </section>

                {/* Right 5 Cols: Timer Durations, Preferences & Today's Session Log */}
                <section
                  className="lg:col-span-5 rounded-2xl border border-slate-800/90 p-5 shadow-xl space-y-5 flex flex-col justify-between"
                  style={panelBgStyle}
                >
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Timer Durations & Cycle Settings
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Customize your Pomodoro intervals and focus immersion preferences.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Focus Duration (mins)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={appState.timer.focusMinutes}
                          onChange={(e) => {
                            const val = Math.max(
                              1,
                              Math.min(180, Number(e.target.value) || 25)
                            );
                            handleUpdateTimer({ focusMinutes: val });
                            if (
                              !isTimerRunning &&
                              appState.timer.mode === 'focus'
                            ) {
                              setSecondsRemaining(val * 60);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono-tabular"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Short Break (mins)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={appState.timer.shortBreakMinutes}
                          onChange={(e) => {
                            const val = Math.max(
                              1,
                              Math.min(60, Number(e.target.value) || 5)
                            );
                            handleUpdateTimer({ shortBreakMinutes: val });
                            if (
                              !isTimerRunning &&
                              appState.timer.mode === 'short_break'
                            ) {
                              setSecondsRemaining(val * 60);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono-tabular"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Long Break (mins)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={appState.timer.longBreakMinutes}
                          onChange={(e) => {
                            const val = Math.max(
                              1,
                              Math.min(90, Number(e.target.value) || 15)
                            );
                            handleUpdateTimer({ longBreakMinutes: val });
                            if (
                              !isTimerRunning &&
                              appState.timer.mode === 'long_break'
                            ) {
                              setSecondsRemaining(val * 60);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono-tabular"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Custom Timer (mins)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={240}
                          value={appState.timer.customMinutes}
                          onChange={(e) => {
                            const val = Math.max(
                              1,
                              Math.min(240, Number(e.target.value) || 30)
                            );
                            handleUpdateTimer({ customMinutes: val });
                            if (
                              !isTimerRunning &&
                              appState.timer.mode === 'custom'
                            ) {
                              setSecondsRemaining(val * 60);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono-tabular"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                        <span>Auto-repeat Pomodoro cycles</span>
                        <input
                          type="checkbox"
                          checked={appState.timer.pomodoroAutoRepeat}
                          onChange={(e) =>
                            handleUpdateTimer({
                              pomodoroAutoRepeat: e.target.checked,
                            })
                          }
                          className="rounded border-slate-700 accent-indigo-500"
                        />
                      </label>
                      <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                        <span>Boost ambient sound during Focus</span>
                        <input
                          type="checkbox"
                          checked={appState.timer.immerseOnFocus}
                          onChange={(e) =>
                            handleUpdateTimer({
                              immerseOnFocus: e.target.checked,
                            })
                          }
                          className="rounded border-slate-700 accent-indigo-500"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Recent Focus Sessions */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="text-xs font-semibold text-slate-300 mb-2">
                      Recent Focus Sessions (
                      {(appState.timer.history || []).length})
                    </div>
                    {(appState.timer.history || []).length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No completed focus sessions yet today. Start the timer to log your first deep work block!
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {(appState.timer.history || [])
                          .slice(0, 5)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs font-mono-tabular"
                            >
                              <span className="text-slate-300 capitalize">
                                {item.mode.replace('_', ' ')} ({item.minutes}m)
                              </span>
                              <span className="text-slate-400">
                                {item.date} · {item.completedAt}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* 7. MUSIC PLAYER STUDIO SECTION (Strictly Standalone) */}
            {activeTab === 'music' && (
              <MusicPlayerView
                audio={appState.audio}
                styleSettings={appState.style}
                panelBgStyle={panelBgStyle}
                onUpdateAudio={handleUpdateAudio}
                onSelectTrack={handleSelectTrack}
                onNextTrack={() => handleNextTrack(true)}
                onPrevTrack={handlePrevTrack}
                onUploadLocalTracks={handleUploadLocalTracks}
              />
            )}

            {/* 8. REMINDERS & HYDRATION SECTION */}
            {activeTab === 'reminders' && (
              <RemindersAndHydrationView
                reminders={appState.reminders}
                profile={appState.profile}
                notificationPermission={notificationPermission}
                onRequestNotificationPermission={requestNotificationPermission}
                onTriggerTestNotification={() => {
                  soundEngine.playReminderChime();
                  sendDesktopNotification(
                    '💧 Time to drink water.',
                    'Stay hydrated while focusing in your Habitra room!'
                  );
                }}
                onToggleReminder={handleToggleReminder}
                onOpenEditReminder={(rem) => {
                  setEditingReminder(rem);
                  setReminderModalOpen(true);
                }}
                onCompleteReminderToday={handleCompleteReminderToday}
                onDeleteReminder={handleDeleteReminder}
                onOpenAddReminder={() => {
                  setEditingReminder(null);
                  setReminderModalOpen(true);
                }}
                onUpdateProfile={handleUpdateProfile}
                styleSettings={appState.style}
                panelBgStyle={panelBgStyle}
              />
            )}

            {/* 9. STATISTICS & ANALYTICS SECTION */}
            {activeTab === 'statistics' && (
              <StatisticsSection
                stats={stats}
                habits={appState.habits}
                completions={appState.completions}
                goals={computedGoals}
                timerHistory={appState.timer.history || []}
                waterCompletedToday={appState.profile.waterCompletedToday}
                waterDailyGoal={appState.profile.waterDailyGoal}
                xpEnabled={appState.profile.xpEnabled !== false}
                selectedDate={selectedDate}
                onInspectHabit={(habit) => setInspectingHabitId(habit.id)}
                styleSettings={appState.style}
                panelBgStyle={panelBgStyle}
              />
            )}

            {/* 10. MY SPACE CUSTOMIZATION SECTION (With Live Environment Preview) */}
            {activeTab === 'myspace' && (
              <div className="space-y-5">
                <div className="relative rounded-2xl overflow-hidden border border-slate-800/90 shadow-xl">
                  <PixelEnvironmentCanvas
                    environment={appState.environment}
                    styleSettings={appState.style}
                    isFocusTimerRunning={isTimerRunning}
                    roomLayout={appState.roomLayout}
                    unlockedObjectIds={unlockedObjectIds}
                    lowPowerBackgroundMode={
                      appState.profile.lowPowerBackgroundMode !== false
                    }
                    className="w-full h-[220px] sm:h-[260px]"
                  />
                  <div className="absolute bottom-3 left-4 px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 backdrop-blur-md">
                    Live Room Preview · {currentScene.name}
                  </div>
                </div>

                <CustomizeSpaceView
                  environment={appState.environment}
                  styleSettings={appState.style}
                  audio={appState.audio}
                  timer={appState.timer}
                  presets={appState.presets}
                  roomLayout={appState.roomLayout}
                  unlockedObjectIds={unlockedObjectIds}
                  onUpdateEnvironment={handleUpdateEnvironment}
                  onUpdateStyle={handleUpdateStyle}
                  onUpdateAudio={handleUpdateAudio}
                  onUpdateTimer={handleUpdateTimer}
                  onApplyPreset={handleApplyPreset}
                  onSaveCustomPreset={handleSaveCustomPreset}
                  onDeleteCustomPreset={handleDeleteCustomPreset}
                  onUpdateRoomObject={handleUpdateRoomObject}
                  onResetRoomLayout={handleResetRoomLayout}
                  panelBgStyle={panelBgStyle}
                />
              </div>
            )}

            {/* 11. SETTINGS & BACKUP SECTION */}
            {activeTab === 'settings' && (
              <SettingsAndBackupView
                profile={appState.profile}
                security={appState.security}
                styleSettings={appState.style}
                dataSizeFormatted={dataSizeFormatted}
                versionedBackups={appState.versionedBackups || []}
                notificationPermission={notificationPermission}
                onUpdateProfile={handleUpdateProfile}
                onOpenSecurityModal={() => setSecurityModalOpen(true)}
                onLockNow={() => handleUpdateSecurity({ isLocked: true })}
                onExportBackup={() => {
                  const nowDate = formatLocalYMD(new Date());
                  handleUpdateProfile({ lastBackupAt: nowDate });
                  exportStateAsJsonBackup({
                    ...appState,
                    profile: { ...appState.profile, lastBackupAt: nowDate },
                  });
                }}
                onCreateVersionedSnapshot={handleCreateVersionedSnapshot}
                onRestoreVersionedSnapshot={handleRestoreVersionedSnapshot}
                onImportBackup={(restored) => setAppState(restored)}
                onResetDefaults={handleResetAllData}
                onOpenWelcomeWizard={() => setWelcomeModalOpen(true)}
                onMinimizeToSystemTray={handleMinimizeToTray}
                onTriggerDiagnosticNotification={
                  handleTriggerSpecificTestNotification
                }
                onSimulateMissedReminder={() => {
                  setMissedReminders([
                    {
                      id: 'sim_water',
                      title: 'Drink Water',
                      timeStr: '14:00',
                      icon: '💧',
                      sourceType: 'reminder',
                    },
                    {
                      id: 'sim_study',
                      title: 'Study Java',
                      timeStr: '16:00',
                      icon: '📚',
                      sourceType: 'habit',
                    },
                  ]);
                  setNotificationCenterOpen(true);
                }}
                panelBgStyle={panelBgStyle}
              />
            )}
          </main>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (<= 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-15 bg-[#0d1322]/95 border-t border-slate-800 backdrop-blur-xl z-40 flex items-center justify-around px-1">
        {(
          [
            { id: 'dashboard', label: 'Home', icon: Home },
            { id: 'habits', label: 'Habits', icon: CheckSquare },
            { id: 'dailylog', label: 'Camera', icon: Camera },
            { id: 'timer', label: 'Timer', icon: TimerIcon },
            { id: 'music', label: 'Music', icon: Music },
          ] as { id: NavigationTab; label: string; icon: React.ElementType }[]
        ).map((m) => {
          const Icon = m.icon;
          const active = activeTab === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectTab(m.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                active ? 'text-indigo-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
            mobileMenuOpen ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>All Sections</span>
        </button>
      </nav>

      {/* FULL-SCREEN AMBIENT MODE OVERLAY */}
      <AmbientModeOverlay
        isOpen={ambientModeOpen}
        environment={appState.environment}
        styleSettings={appState.style}
        timer={appState.timer}
        secondsRemaining={secondsRemaining}
        isTimerRunning={isTimerRunning}
        audio={appState.audio}
        completedToday={stats.completedToday}
        totalHabits={stats.totalHabits}
        dailyProgressPercent={stats.dailyProgressPercent}
        onExit={() => setAmbientModeOpen(false)}
        onStartPauseTimer={handleStartPauseTimer}
        onResetTimer={handleResetTimer}
        onUpdateAudio={handleUpdateAudio}
        onNextTrack={() => handleNextTrack(true)}
      />

      {/* MODALS */}
      <HabitFormModal
        isOpen={habitModalOpen}
        editingHabit={editingHabit}
        allHabits={appState.habits}
        accentColor={appState.style.accentColor}
        onClose={() => setHabitModalOpen(false)}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
        onToggleArchive={handleToggleArchiveHabit}
      />

      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        habits={appState.habits}
        goals={computedGoals}
        reminders={appState.reminders}
        journalEntries={appState.journalEntries || {}}
        timerHistory={appState.timer.history || []}
        achievements={achievementsList}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenNewHabit={() => {
          setEditingHabit(null);
          setHabitModalOpen(true);
        }}
        onOpenNewGoal={() => {
          setEditingGoal(null);
          setGoalModalOpen(true);
        }}
        onStartFocusTimer={() => {
          handleChangeTimerMode('focus');
          setIsTimerRunning(true);
        }}
        onStartBreakTimer={() => {
          handleChangeTimerMode('short_break');
          setIsTimerRunning(true);
        }}
        onSelectScene={(sceneId) => handleUpdateEnvironment({ sceneId })}
        onEnterAmbientMode={() => setAmbientModeOpen(true)}
        onLockApp={() => {
          if (appState.security.passwordHash) {
            handleUpdateSecurity({ isLocked: true });
          } else {
            setSecurityModalOpen(true);
          }
        }}
        onOpenJournal={(dStr) => {
          setJournalDateStr(dStr || selectedDateStr);
          setJournalModalOpen(true);
        }}
        onOpenNotifications={() => setNotificationCenterOpen(true)}
        onInspectHabit={(habit) => setInspectingHabitId(habit.id)}
      />

      <NotificationCenterModal
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        history={appState.notificationHistory || []}
        missedReminders={missedReminders}
        onDismissMissedReminders={() => setMissedReminders([])}
        onCompleteMissedItem={(item) => {
          if (item.sourceType === 'habit') {
            handleToggleHabitCompletion(item.id, formatLocalYMD(new Date()));
          }
          setMissedReminders((prev) =>
            prev.filter((m) => m.id !== item.id)
          );
        }}
        onMarkAllRead={() =>
          setAppState((prev) => ({
            ...prev,
            notificationHistory: (prev.notificationHistory || []).map((n) => ({
              ...n,
              read: true,
            })),
          }))
        }
        onClearHistory={() =>
          setAppState((prev) => ({
            ...prev,
            notificationHistory: [],
          }))
        }
        onTriggerTestNotification={handleTriggerSpecificTestNotification}
        notificationsEnabled={appState.profile.notificationsEnabled}
        onToggleNotificationsEnabled={() =>
          handleUpdateProfile({
            notificationsEnabled: !appState.profile.notificationsEnabled,
          })
        }
      />

      <DailyJournalModal
        isOpen={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        initialDateStr={journalDateStr || selectedDateStr}
        journalEntries={appState.journalEntries || {}}
        onSaveJournalEntry={handleSaveJournalEntry}
      />

      <SystemTrayBackgroundOverlay
        isMinimizedToTray={isMinimizedToTray}
        onRestoreFromTray={() => setIsMinimizedToTray(false)}
        notificationsEnabled={appState.profile.notificationsEnabled}
        onToggleNotifications={() =>
          handleUpdateProfile({
            notificationsEnabled: !appState.profile.notificationsEnabled,
          })
        }
        onStartFocusTimer={() => {
          if (!isTimerRunning) handleStartPauseTimer();
        }}
        onLockHabitra={() => {
          if (appState.security.passwordHash) {
            handleUpdateSecurity({ isLocked: true });
          } else {
            setSecurityModalOpen(true);
          }
        }}
        completedTodayCount={stats.completedToday}
        totalTodayHabits={stats.totalHabits}
        timerRemainingFormatted={`${String(
          Math.floor(secondsRemaining / 60)
        ).padStart(2, '0')}:${String(secondsRemaining % 60).padStart(2, '0')}`}
        isTimerRunning={isTimerRunning}
        showFirstTimeTrayToast={showFirstTimeTrayToast}
        onDismissFirstTimeTrayToast={() => setShowFirstTimeTrayToast(false)}
        onDisableMinimizeToTrayPermanently={() => {
          setShowFirstTimeTrayToast(false);
          setIsMinimizedToTray(false);
          handleUpdateProfile({ keepRunningInBackground: false });
        }}
      />

      <HabitDetailModal
        habit={inspectingHabit}
        completions={appState.completions}
        accentColor={appState.style.accentColor}
        onClose={() => setInspectingHabitId(null)}
        onToggleCompletion={handleToggleHabitCompletion}
        onEdit={(habit) => {
          setEditingHabit(habit);
          setHabitModalOpen(true);
        }}
        onToggleArchive={handleToggleArchiveHabit}
        onDelete={handleDeleteHabit}
      />

      <GoalFormModal
        isOpen={goalModalOpen}
        editingGoal={editingGoal}
        habits={appState.habits}
        accentColor={appState.style.accentColor}
        onClose={() => setGoalModalOpen(false)}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
        onToggleArchive={handleToggleArchiveGoal}
      />

      <ReminderFormModal
        isOpen={reminderModalOpen}
        editingReminder={editingReminder}
        accentColor={appState.style.accentColor}
        onClose={() => {
          setReminderModalOpen(false);
          setEditingReminder(null);
        }}
        onSave={handleSaveReminder}
      />

      <PasswordSetupModal
        isOpen={securityModalOpen}
        security={appState.security}
        accentColor={appState.style.accentColor}
        onClose={() => setSecurityModalOpen(false)}
        onSaveSecurity={handleUpdateSecurity}
      />

      <WelcomeWizardModal
        isOpen={welcomeModalOpen}
        userName={appState.profile.userName}
        accentColor={appState.style.accentColor}
        timerSettings={appState.timer}
        audioSettings={appState.audio}
        profileSettings={appState.profile}
        environmentSettings={appState.environment}
        styleSettings={appState.style}
        notificationPermission={notificationPermission}
        onClose={() => {
          setWelcomeModalOpen(false);
          handleUpdateProfile({ hasSeenWelcome: true });
        }}
        onExploreHabitra={() => {
          setWelcomeModalOpen(false);
          handleUpdateProfile({ hasSeenWelcome: true });
          setActiveTab('dashboard');
        }}
        onSelectPreset={handleApplyPreset}
        onUpdateUserName={(userName) => handleUpdateProfile({ userName })}
        onUpdateTimerSettings={handleUpdateTimer}
        onUpdateAudioSettings={handleUpdateAudio}
        onUpdateProfileSettings={handleUpdateProfile}
        onUpdateEnvironmentSettings={handleUpdateEnvironment}
        onUpdateStyleSettings={handleUpdateStyle}
        onUpdateSecuritySettings={handleUpdateSecurity}
        onQuickAddHabit={(habitName, icon, goalDays, color, description) =>
          handleSaveHabit({
            name: habitName,
            icon: icon || '🌱',
            color: color || '#22c55e',
            description,
            goalDays: goalDays || 30,
            frequency: 'daily',
            startDate: formatLocalYMD(new Date()),
          })
        }
        onQuickAddReminder={(remData) => handleSaveReminder(remData)}
        onRequestNotificationPermission={requestNotificationPermission}
      />
    </div>
  );
}

const MiniRingProgress: React.FC<{ percent: number; color: string }> = ({
  percent,
  color,
}) => {
  const r = 13;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, percent)) / 100);
  return (
    <svg className="w-8 h-8 -rotate-90 shrink-0" viewBox="0 0 32 32">
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="transparent"
        stroke="rgba(148, 163, 184, 0.2)"
        strokeWidth="3.5"
      />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="transparent"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
};

export default App;
