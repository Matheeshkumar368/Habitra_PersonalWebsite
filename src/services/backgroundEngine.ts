import {
  AppDataState,
  Goal,
  Habit,
  HabitCompletionMap,
  NotificationLogItem,
  Reminder,
  TimerSessionLog,
  UserProfile,
} from '../types/app';
import { formatLocalYMD, ROOM_OBJECT_CATALOG, RoomObjectCatalogItem } from '../constants/scenesAndPresets';

export type RuntimeEnvironmentKind =
  | 'Electron Desktop'
  | 'Tauri Desktop'
  | 'Installed PWA'
  | 'Browser Workspace';

export function detectRuntimeEnvironment(): {
  kind: RuntimeEnvironmentKind;
  isStandalonePwa: boolean;
  isNativeDesktop: boolean;
  webCryptoSupported: boolean;
  notificationApiSupported: boolean;
  serviceWorkerSupported: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      kind: 'Browser Workspace',
      isStandalonePwa: false,
      isNativeDesktop: false,
      webCryptoSupported: false,
      notificationApiSupported: false,
      serviceWorkerSupported: false,
    };
  }

  const win = window as unknown as {
    habitraDesktop?: unknown;
    electronAPI?: unknown;
    __TAURI__?: unknown;
  };

  const isElectron = Boolean(win.habitraDesktop || win.electronAPI);
  const isTauri = Boolean(win.__TAURI__);
  const isStandalonePwa =
    Boolean(
      window.matchMedia &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: window-controls-overlay)').matches)
    ) || Boolean((navigator as unknown as { standalone?: boolean }).standalone);

  const kind: RuntimeEnvironmentKind = isElectron
    ? 'Electron Desktop'
    : isTauri
    ? 'Tauri Desktop'
    : isStandalonePwa
    ? 'Installed PWA'
    : 'Browser Workspace';

  return {
    kind,
    isStandalonePwa,
    isNativeDesktop: isElectron || isTauri,
    webCryptoSupported: Boolean(
      typeof crypto !== 'undefined' && crypto.subtle
    ),
    notificationApiSupported: 'Notification' in window,
    serviceWorkerSupported:
      typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  };
}

export function isWithinQuietHours(now: Date, profile: UserProfile): boolean {
  if (!profile.quietHoursEnabled) return false;
  const startStr = profile.quietHoursStart || '23:00';
  const endStr = profile.quietHoursEnd || '06:00';

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);
  if (isNaN(startH) || isNaN(endH)) return false;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = startH * 60 + (startM || 0);
  const endMins = endH * 60 + (endM || 0);

  if (startMins <= endMins) {
    return currentMins >= startMins && currentMins < endMins;
  } else {
    // Overnight window, e.g., 23:00 to 06:00
    return currentMins >= startMins || currentMins < endMins;
  }
}

export async function dispatchNativeDesktopNotification(options: {
  title: string;
  body: string;
  tag?: string;
  actionType?: string;
  habitId?: string;
  reminderId?: string;
}): Promise<boolean> {
  // 1. Check Electron / Tauri native desktop bridges if present
  const win = window as unknown as {
    habitraDesktop?: {
      sendNativeNotification?: (opts: { title: string; body: string }) => void;
    };
    electronAPI?: {
      sendNotification?: (opts: { title: string; body: string }) => void;
    };
    __TAURI__?: {
      notification?: {
        sendNotification?: (opts: { title: string; body: string }) => void;
      };
    };
  };

  if (win.habitraDesktop?.sendNativeNotification) {
    win.habitraDesktop.sendNativeNotification({
      title: options.title,
      body: options.body,
    });
    return true;
  }

  if (win.electronAPI?.sendNotification) {
    win.electronAPI.sendNotification({ title: options.title, body: options.body });
    return true;
  }

  if (win.__TAURI__?.notification?.sendNotification) {
    win.__TAURI__.notification.sendNotification({ title: options.title, body: options.body });
    return true;
  }

  // 2. Web / PWA Service Worker Notification API with Action Buttons
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        const swOptions: NotificationOptions & {
          actions?: Array<{ action: string; title: string }>;
          data?: Record<string, unknown>;
        } = {
          body: options.body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: options.tag || `habitra_${Date.now()}`,
          data: {
            actionType: options.actionType,
            habitId: options.habitId,
            reminderId: options.reminderId,
          },
          actions: [
            { action: 'complete', title: '✓ Mark Completed' },
            { action: 'snooze', title: '⏰ Snooze 10m' },
          ],
        };
        await reg.showNotification(options.title, swOptions);
        return true;
      }
    }
  } catch {
    // Fallback to standard Notification constructor below
  }

  try {
    const n = new Notification(options.title, {
      body: options.body,
      icon: '/icon.svg',
      tag: options.tag || `habitra_${Date.now()}`,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

export function createNotificationLogEntry(
  type: NotificationLogItem['type'],
  icon: string,
  title: string,
  message: string
): NotificationLogItem {
  const now = new Date();
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now.getTime(),
    timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    dateStr: formatLocalYMD(now),
    type,
    icon,
    title,
    message,
    read: false,
  };
}

export interface MissedReminderItem {
  title: string;
  timeStr: string;
  icon: string;
  sourceType: 'habit' | 'reminder';
  id: string;
}

export function detectMissedRemindersSinceLastActive(
  state: AppDataState,
  now: Date
): MissedReminderItem[] {
  const lastActive = state.profile.lastActiveTimestamp || now.getTime();
  // Only scan if at least 2 minutes elapsed
  if (now.getTime() - lastActive < 90_000) return [];

  const todayStr = formatLocalYMD(now);
  const lastDate = new Date(lastActive);
  // Only scan missed times from today
  const scanStartMins =
    formatLocalYMD(lastDate) === todayStr ? lastDate.getHours() * 60 + lastDate.getMinutes() : 0;
  const currentMins = now.getHours() * 60 + now.getMinutes();

  if (currentMins <= scanStartMins) return [];

  const missed: MissedReminderItem[] = [];
  const dayOfWeek = now.getDay();

  // 1. Check scheduled reminders
  for (const rem of state.reminders) {
    if (!rem.enabled || !rem.timeOfDay) continue;
    if (rem.scheduleType === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
    if (rem.scheduleType === 'weekends' && dayOfWeek !== 0 && dayOfWeek !== 6) continue;
    if (rem.scheduleType === 'custom' && rem.customDays && !rem.customDays.includes(dayOfWeek)) continue;

    const [h, m] = rem.timeOfDay.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) continue;
    const remMins = h * 60 + m;

    const alreadyTriggeredToday =
      rem.lastTriggeredAt && formatLocalYMD(new Date(rem.lastTriggeredAt)) === todayStr;

    if (remMins > scanStartMins && remMins < currentMins && !alreadyTriggeredToday) {
      missed.push({
        id: rem.id,
        title: rem.title,
        timeStr: rem.timeOfDay,
        icon: rem.icon || '🔔',
        sourceType: 'reminder',
      });
    }
  }

  // 2. Check habits with reminderTime that aren't completed today
  for (const habit of state.habits) {
    if (habit.archived || !habit.reminderTime) continue;
    if (state.completions[`${habit.id}_${todayStr}`]) continue;

    const [h, m] = habit.reminderTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) continue;
    const habitMins = h * 60 + m;

    if (habitMins > scanStartMins && habitMins < currentMins) {
      missed.push({
        id: habit.id,
        title: habit.name,
        timeStr: habit.reminderTime,
        icon: habit.icon || '🌱',
        sourceType: 'habit',
      });
    }
  }

  return missed;
}

export interface XPStatus {
  totalXP: number;
  level: number;
  levelTitle: string;
  currentLevelMinXP: number;
  nextLevelXP: number;
  progressPercent: number;
  breakdown: {
    habitsXP: number;
    perfectDaysXP: number;
    focusXP: number;
    streakXP: number;
    goalsXP: number;
  };
}

const LEVEL_THRESHOLDS = [
  { level: 1, title: 'Starter', minXP: 0, nextXP: 100 },
  { level: 2, title: 'Consistent', minXP: 100, nextXP: 250 },
  { level: 3, title: 'Focused', minXP: 250, nextXP: 500 },
  { level: 4, title: 'Builder', minXP: 500, nextXP: 900 },
  { level: 5, title: 'Disciplined', minXP: 900, nextXP: 1500 },
  { level: 6, title: 'Master', minXP: 1500, nextXP: 2500 },
  { level: 7, title: 'Legend', minXP: 2500, nextXP: 5000 },
];

export function calculateUserXPAndLevel(
  habits: Habit[],
  completions: HabitCompletionMap,
  goals: Goal[],
  timerHistory: TimerSessionLog[],
  bestStreak: number
): XPStatus {
  const totalCheckins = Object.values(completions).filter(Boolean).length;
  const habitsXP = totalCheckins * 10;

  // Calculate perfect days in the last 30 days
  const activeHabits = habits.filter((h) => !h.archived);
  let perfectDaysCount = 0;
  if (activeHabits.length > 0) {
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = formatLocalYMD(d);
      const allDone = activeHabits.every((h) => Boolean(completions[`${h.id}_${dStr}`]));
      if (allDone) perfectDaysCount++;
    }
  }
  const perfectDaysXP = perfectDaysCount * 25;

  const focusSessions = timerHistory.filter((s) => s.mode === 'focus').length;
  const focusXP = focusSessions * 20;

  const sevenDayMilestones = Math.floor(bestStreak / 7);
  const streakXP = sevenDayMilestones * 50;

  const completedGoals = goals.filter((g) => !g.archived && g.progress >= 100).length;
  const goalsXP = completedGoals * 100;

  const totalXP = habitsXP + perfectDaysXP + focusXP + streakXP + goalsXP;

  let currentTier = LEVEL_THRESHOLDS[0];
  for (const tier of LEVEL_THRESHOLDS) {
    if (totalXP >= tier.minXP) {
      currentTier = tier;
    }
  }

  const span = Math.max(1, currentTier.nextXP - currentTier.minXP);
  const intoLevel = Math.max(0, totalXP - currentTier.minXP);
  const progressPercent = Math.min(100, Math.round((intoLevel / span) * 100));

  return {
    totalXP,
    level: currentTier.level,
    levelTitle: currentTier.title,
    currentLevelMinXP: currentTier.minXP,
    nextLevelXP: currentTier.nextXP,
    progressPercent,
    breakdown: {
      habitsXP,
      perfectDaysXP,
      focusXP,
      streakXP,
      goalsXP,
    },
  };
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progressText: string;
}

export function evaluateAchievements(
  habits: Habit[],
  completions: HabitCompletionMap,
  goals: Goal[],
  timerHistory: TimerSessionLog[],
  bestStreak: number,
  waterCompletedToday: number,
  waterDailyGoal: number
): AchievementBadge[] {
  const totalCheckins = Object.values(completions).filter(Boolean).length;
  const totalFocusMins = timerHistory
    .filter((s) => s.mode === 'focus')
    .reduce((acc, s) => acc + s.minutes, 0);
  const completedGoalsCount = goals.filter((g) => g.progress >= 100).length;

  return [
    {
      id: 'first_habit',
      title: 'First Habit',
      description: 'Create your first daily habit in Habitra',
      icon: '🌱',
      unlocked: habits.length >= 1,
      progressText: `${Math.min(1, habits.length)} / 1 habit`,
    },
    {
      id: 'streak_7',
      title: '7-Day Streak',
      description: 'Maintain a 7-day consistency streak',
      icon: '🔥',
      unlocked: bestStreak >= 7,
      progressText: `${Math.min(7, bestStreak)} / 7 days`,
    },
    {
      id: 'streak_30',
      title: '30-Day Streak',
      description: 'Maintain a 30-day master streak',
      icon: '🏆',
      unlocked: bestStreak >= 30,
      progressText: `${Math.min(30, bestStreak)} / 30 days`,
    },
    {
      id: 'habits_100',
      title: '100 Habits Completed',
      description: 'Check off 100 total habit completions',
      icon: '💯',
      unlocked: totalCheckins >= 100,
      progressText: `${Math.min(100, totalCheckins)} / 100 check-ins`,
    },
    {
      id: 'focus_10h',
      title: '10 Hours Focus',
      description: 'Complete 600 minutes of deep focus sessions',
      icon: '⏱️',
      unlocked: totalFocusMins >= 600,
      progressText: `${Math.round((totalFocusMins / 60) * 10) / 10} / 10 hrs`,
    },
    {
      id: 'hydration_master',
      title: 'Hydration Master',
      description: 'Reach your full daily water intake target',
      icon: '💧',
      unlocked: waterCompletedToday >= waterDailyGoal && waterDailyGoal > 0,
      progressText: `${waterCompletedToday} / ${waterDailyGoal} glasses`,
    },
    {
      id: 'goal_crusher',
      title: 'Goal Finisher',
      description: 'Complete a personal milestone goal (100%)',
      icon: '🎯',
      unlocked: completedGoalsCount >= 1,
      progressText: `${completedGoalsCount} completed`,
    },
  ];
}

export function isRoomObjectUnlocked(
  item: RoomObjectCatalogItem,
  bestStreak: number,
  totalCheckins: number,
  totalFocusMinutes: number
): boolean {
  if (
    item.requiredStreak === 0 &&
    item.requiredHabitsCompleted === 0 &&
    item.requiredFocusHours === 0
  ) {
    return true;
  }
  const focusHours = totalFocusMinutes / 60;
  if (item.requiredStreak > 0 && bestStreak >= item.requiredStreak) return true;
  if (item.requiredHabitsCompleted > 0 && totalCheckins >= item.requiredHabitsCompleted) return true;
  if (item.requiredFocusHours > 0 && focusHours >= item.requiredFocusHours) return true;
  return false;
}

export function getUnlockedRoomObjectsCount(
  bestStreak: number,
  totalCheckins: number,
  totalFocusMinutes: number
): number {
  return ROOM_OBJECT_CATALOG.filter((item) =>
    isRoomObjectUnlocked(item, bestStreak, totalCheckins, totalFocusMinutes)
  ).length;
}

export interface SmartInsight {
  id: string;
  icon: string;
  title: string;
  detail: string;
  badge: string;
}

export function generateSmartInsights(
  habits: Habit[],
  completions: HabitCompletionMap,
  timerHistory: TimerSessionLog[],
  bestStreak: number
): SmartInsight[] {
  const activeHabits = habits.filter((h) => !h.archived);
  if (activeHabits.length === 0) {
    return [
      {
        id: 'empty_1',
        icon: '🌱',
        title: 'Ready to Analyze Your Rhythm',
        detail: 'Add your first habit and check off completions to unlock personalized behavioral insights.',
        badge: 'Getting Started',
      },
    ];
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayScores = [0, 0, 0, 0, 0, 0, 0];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];

  const today = new Date();
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = formatLocalYMD(d);
    const dow = d.getDay();
    dayTotals[dow] += activeHabits.length;
    for (const h of activeHabits) {
      if (completions[`${h.id}_${dStr}`]) {
        dayScores[dow] += 1;
      }
    }
  }

  let bestDow = 1;
  let bestDowRate = -1;
  let weekdayDone = 0;
  let weekdayPossible = 0;
  let weekendDone = 0;
  let weekendPossible = 0;

  for (let dow = 0; dow < 7; dow++) {
    const rate = dayTotals[dow] > 0 ? Math.round((dayScores[dow] / dayTotals[dow]) * 100) : 0;
    if (rate > bestDowRate) {
      bestDowRate = rate;
      bestDow = dow;
    }
    if (dow === 0 || dow === 6) {
      weekendDone += dayScores[dow];
      weekendPossible += dayTotals[dow];
    } else {
      weekdayDone += dayScores[dow];
      weekdayPossible += dayTotals[dow];
    }
  }

  const weekdayRate = weekdayPossible > 0 ? Math.round((weekdayDone / weekdayPossible) * 100) : 0;
  const weekendRate = weekendPossible > 0 ? Math.round((weekendDone / weekendPossible) * 100) : 0;

  // Find most consistent habit
  let topHabit = activeHabits[0];
  let topHabitCount = -1;
  for (const h of activeHabits) {
    let c = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (completions[`${h.id}_${formatLocalYMD(d)}`]) c++;
    }
    if (c > topHabitCount) {
      topHabitCount = c;
      topHabit = h;
    }
  }

  const totalFocusMins = timerHistory
    .filter((s) => s.mode === 'focus')
    .reduce((acc, s) => acc + s.minutes, 0);

  return [
    {
      id: 'peak_day',
      icon: '📅',
      title: `Peak Consistency Day: ${dayNames[bestDow]}`,
      detail: `Your highest completion rate is on ${dayNames[bestDow]}s (${Math.max(0, bestDowRate)}% over the last 4 weeks).`,
      badge: `${Math.max(0, bestDowRate)}% Peak`,
    },
    {
      id: 'weekday_vs_weekend',
      icon: '📊',
      title:
        weekdayRate >= weekendRate
          ? 'Stronger Weekday Routine'
          : 'Weekend Momentum Builder',
      detail: `You complete ${weekdayRate}% of scheduled habits on weekdays compared to ${weekendRate}% on weekends.`,
      badge: `${weekdayRate}% vs ${weekendRate}%`,
    },
    {
      id: 'anchor_habit',
      icon: topHabit.icon || '⭐',
      title: `Anchor Habit: ${topHabit.name}`,
      detail: `"${topHabit.name}" is your strongest habit with ${topHabitCount} completions in the last 30 days. Stack new habits after it!`,
      badge: `${topHabitCount}d / 30d`,
    },
    {
      id: 'focus_synergy',
      icon: '⏱️',
      title: 'Deep Focus & Streak Momentum',
      detail:
        totalFocusMins > 0
          ? `You've logged ${totalFocusMins} focus minutes across ${timerHistory.length} sessions while building a ${bestStreak}-day best streak.`
          : `Start a 25m or 45m Focus Timer session while working on "${topHabit.name}" to boost daily completion rates.`,
      badge: `${bestStreak}d Best Streak`,
    },
  ];
}
