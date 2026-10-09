import { formatLocalYMD } from '../constants/scenesAndPresets';
import { Habit, HabitCompletionMap } from '../types/app';

export interface HabitStreakStats {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
  weeklyCompletedCount: number; // out of 7
  completionRate30d: number; // 0 - 100
  isCompletedOnDate: boolean;
}

export interface OverallDashboardStats {
  totalHabits: number;
  completedToday: number;
  remainingToday: number;
  dailyProgressPercent: number;
  weeklyProgressPercent: number;
  monthlyProgressPercent: number;
  yearlyProgressPercent: number;
  overallCurrentStreak: number;
  overallBestStreak: number;
  totalCompletedAllTime: number;
  bestDayName: string;
  bestWeekRate: number;
  weekdayBreakdown: { day: string; percent: number; count: number }[];
  dailySeriesForMonth: { day: number; dateStr: string; percent: number; completed: number }[];
}

export function isHabitCompleted(
  completions: HabitCompletionMap,
  habitId: string,
  dateStr: string
): boolean {
  return Boolean(completions[`${habitId}_${dateStr}`]);
}

export function getDatesForMonth(year: number, monthIndex: number): Date[] {
  const dates: Date[] = [];
  const d = new Date(year, monthIndex, 1);
  while (d.getMonth() === monthIndex) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function calculateHabitStreak(
  habit: Habit,
  completions: HabitCompletionMap,
  referenceDate: Date = new Date()
): HabitStreakStats {
  const refStr = formatLocalYMD(referenceDate);
  const isCompletedOnDate = isHabitCompleted(completions, habit.id, refStr);

  // Calculate current streak walking backwards from referenceDate (or yesterday if not completed today yet)
  let currentStreak = 0;
  const cursor = new Date(referenceDate);
  if (!isHabitCompleted(completions, habit.id, formatLocalYMD(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dStr = formatLocalYMD(cursor);
    if (isHabitCompleted(completions, habit.id, dStr)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak & total completed over past 365 days
  let longestStreak = 0;
  let running = 0;
  let totalCompletedDays = 0;
  let completed30d = 0;
  let weeklyCompletedCount = 0;

  const scanCursor = new Date(referenceDate);
  for (let i = 0; i < 365; i++) {
    const dStr = formatLocalYMD(scanCursor);
    const done = isHabitCompleted(completions, habit.id, dStr);
    if (done) {
      totalCompletedDays++;
      running++;
      if (running > longestStreak) {
        longestStreak = running;
      }
      if (i < 30) completed30d++;
      if (i < 7) weeklyCompletedCount++;
    } else {
      running = 0;
    }
    scanCursor.setDate(scanCursor.getDate() - 1);
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const prefix = `${habit.id}_`;
  const allCompletedForHabit = Object.entries(completions).reduce(
    (acc, [k, v]) => (v && k.startsWith(prefix) ? acc + 1 : acc),
    0
  );
  if (allCompletedForHabit > totalCompletedDays) {
    totalCompletedDays = allCompletedForHabit;
  }

  const completionRate30d = Math.round((completed30d / 30) * 100);

  return {
    habitId: habit.id,
    currentStreak,
    longestStreak,
    totalCompletedDays,
    weeklyCompletedCount,
    completionRate30d,
    isCompletedOnDate,
  };
}

export function calculateOverallStats(
  habits: Habit[],
  completions: HabitCompletionMap,
  selectedDate: Date = new Date(),
  monthViewDate: Date = new Date()
): OverallDashboardStats {
  const totalHabits = habits.length;
  const selectedStr = formatLocalYMD(selectedDate);

  if (totalHabits === 0) {
    const monthDates = getDatesForMonth(
      monthViewDate.getFullYear(),
      monthViewDate.getMonth()
    );
    return {
      totalHabits: 0,
      completedToday: 0,
      remainingToday: 0,
      dailyProgressPercent: 0,
      weeklyProgressPercent: 0,
      monthlyProgressPercent: 0,
      yearlyProgressPercent: 0,
      overallCurrentStreak: 0,
      overallBestStreak: 0,
      totalCompletedAllTime: 0,
      bestDayName: '—',
      bestWeekRate: 0,
      weekdayBreakdown: [
        { day: 'Mon', percent: 0, count: 0 },
        { day: 'Tue', percent: 0, count: 0 },
        { day: 'Wed', percent: 0, count: 0 },
        { day: 'Thu', percent: 0, count: 0 },
        { day: 'Fri', percent: 0, count: 0 },
        { day: 'Sat', percent: 0, count: 0 },
        { day: 'Sun', percent: 0, count: 0 },
      ],
      dailySeriesForMonth: monthDates.map((d) => ({
        day: d.getDate(),
        dateStr: formatLocalYMD(d),
        percent: 0,
        completed: 0,
      })),
    };
  }

  const completedToday = habits.filter((h) =>
    isHabitCompleted(completions, h.id, selectedStr)
  ).length;
  const remainingToday = Math.max(0, totalHabits - completedToday);
  const dailyProgressPercent = Math.round((completedToday / totalHabits) * 100);

  // Weekly progress (last 7 days up to selectedDate)
  let weeklyDone = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(selectedDate);
    d.setDate(selectedDate.getDate() - i);
    const dStr = formatLocalYMD(d);
    habits.forEach((h) => {
      if (isHabitCompleted(completions, h.id, dStr)) weeklyDone++;
    });
  }
  const weeklyProgressPercent = Math.round((weeklyDone / (totalHabits * 7)) * 100);

  // Monthly progress (last 30 days)
  let monthlyDone = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(selectedDate);
    d.setDate(selectedDate.getDate() - i);
    const dStr = formatLocalYMD(d);
    habits.forEach((h) => {
      if (isHabitCompleted(completions, h.id, dStr)) monthlyDone++;
    });
  }
  const monthlyProgressPercent = Math.round((monthlyDone / (totalHabits * 30)) * 100);

  // Overall streak: consecutive days where at least 50% of habits (or >= 1 habit) were completed
  let overallCurrentStreak = 0;
  const streakCursor = new Date(selectedDate);
  const countOnCursor = (dt: Date) => {
    const s = formatLocalYMD(dt);
    return habits.filter((h) => isHabitCompleted(completions, h.id, s)).length;
  };

  if (countOnCursor(streakCursor) === 0) {
    streakCursor.setDate(streakCursor.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const c = countOnCursor(streakCursor);
    if (c >= Math.max(1, Math.ceil(totalHabits * 0.5))) {
      overallCurrentStreak++;
      streakCursor.setDate(streakCursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Best streak across habits or overall
  let overallBestStreak = overallCurrentStreak;
  habits.forEach((h) => {
    const st = calculateHabitStreak(h, completions, selectedDate);
    if (st.longestStreak > overallBestStreak) {
      overallBestStreak = st.longestStreak;
    }
  });

  // Total completed all time
  const totalCompletedAllTime = Object.values(completions).filter(Boolean).length;

  // Weekday breakdown over last 4 weeks (28 days)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const dayOccurrences = [0, 0, 0, 0, 0, 0, 0];

  for (let i = 0; i < 28; i++) {
    const d = new Date(selectedDate);
    d.setDate(selectedDate.getDate() - i);
    const dow = d.getDay();
    dayOccurrences[dow]++;
    const dStr = formatLocalYMD(d);
    habits.forEach((h) => {
      if (isHabitCompleted(completions, h.id, dStr)) {
        dayTotals[dow]++;
      }
    });
  }

  const orderedDow = [1, 2, 3, 4, 5, 6, 0]; // Mon -> Sun
  let bestDow = 3; // Wed default
  let bestDowPercent = -1;

  const weekdayBreakdown = orderedDow.map((dow) => {
    const possible = Math.max(1, dayOccurrences[dow] * totalHabits);
    const percent = Math.round((dayTotals[dow] / possible) * 100);
    if (percent > bestDowPercent) {
      bestDowPercent = percent;
      bestDow = dow;
    }
    return {
      day: dayNames[dow],
      percent,
      count: dayTotals[dow],
    };
  });

  // Best week rate over last 4 weeks
  let bestWeekRate = weeklyProgressPercent;
  for (let w = 0; w < 4; w++) {
    let wDone = 0;
    for (let dIdx = 0; dIdx < 7; dIdx++) {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() - (w * 7 + dIdx));
      const dStr = formatLocalYMD(d);
      habits.forEach((h) => {
        if (isHabitCompleted(completions, h.id, dStr)) wDone++;
      });
    }
    const rate = Math.round((wDone / (totalHabits * 7)) * 100);
    if (rate > bestWeekRate) bestWeekRate = rate;
  }

  // Daily series for the selected month in Monthly Progress chart
  const monthDates = getDatesForMonth(
    monthViewDate.getFullYear(),
    monthViewDate.getMonth()
  );
  const todayStr = formatLocalYMD(new Date());

  const dailySeriesForMonth = monthDates.map((d) => {
    const dStr = formatLocalYMD(d);
    const completed = habits.filter((h) =>
      isHabitCompleted(completions, h.id, dStr)
    ).length;
    // For future days in the current month without completions yet, keep a subtle baseline or 0
    const percent =
      dStr > todayStr && completed === 0
        ? 0
        : Math.round((completed / totalHabits) * 100);
    return {
      day: d.getDate(),
      dateStr: dStr,
      percent,
      completed,
    };
  });

  const yearlyProgressPercent = Math.min(
    100,
    Math.round((totalCompletedAllTime / Math.max(1, totalHabits * 45)) * 100)
  );

  return {
    totalHabits,
    completedToday,
    remainingToday,
    dailyProgressPercent,
    weeklyProgressPercent,
    monthlyProgressPercent,
    yearlyProgressPercent,
    overallCurrentStreak,
    overallBestStreak,
    totalCompletedAllTime,
    bestDayName: fullDayNames[bestDow],
    bestWeekRate,
    weekdayBreakdown,
    dailySeriesForMonth,
  };
}
