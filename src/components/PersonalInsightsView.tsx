import React, { useState, useMemo } from 'react';
import {
  LineChart,
  CheckCircle2,
  Timer as TimerIcon,
  Calendar as CalendarIcon,
  PiggyBank,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Target,
  Sparkles,
  Flame,
} from 'lucide-react';
import {
  AppDataState,
  NavigationTab,
} from '../types/app';
import { FinsaCurrency } from '../types/finsa';
import { formatLocalYMD } from '../constants/scenesAndPresets';
import { formatCents } from '../services/finsaEngine';
import { calculateHabitStreak } from '../utils/habitStats';
import { soundEngine } from '../audio/soundEngine';

export interface PersonalInsightsViewProps {
  appState: AppDataState;
  onNavigateTab: (tab: NavigationTab) => void;
  styleSettings: AppDataState['style'];
  panelBgStyle?: React.CSSProperties;
}

export const PersonalInsightsView: React.FC<PersonalInsightsViewProps> = ({
  appState,
  onNavigateTab,
  panelBgStyle,
}) => {
  const [expandedFormulaId, setExpandedFormulaId] = useState<string | null>(null);

  const todayStr = formatLocalYMD(new Date());
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const toggleFormula = (id: string) => {
    soundEngine.playUiClick();
    setExpandedFormulaId(expandedFormulaId === id ? null : id);
  };

  // 1. Habit Consistency Calculations
  const activeHabits = (appState.habits || []).filter((h) => !h.archived);
  const completions = appState.completions || {};

  const habitMetrics = useMemo(() => {
    if (activeHabits.length === 0) {
      return {
        consistency7d: 0,
        consistency30d: 0,
        totalCheckins7d: 0,
        activeHabitCount: 0,
        topStreakHabit: null as { name: string; streak: number } | null,
        hasSufficientData: false,
      };
    }

    let checkins7d = 0;
    let checkins30d = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = formatLocalYMD(d);
      activeHabits.forEach((h) => {
        if (completions[`${h.id}_${dStr}`]) checkins7d++;
      });
    }

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = formatLocalYMD(d);
      activeHabits.forEach((h) => {
        if (completions[`${h.id}_${dStr}`]) checkins30d++;
      });
    }

    const potential7d = activeHabits.length * 7;
    const potential30d = activeHabits.length * 30;

    const consistency7d = potential7d > 0 ? Math.round((checkins7d / potential7d) * 100) : 0;
    const consistency30d = potential30d > 0 ? Math.round((checkins30d / potential30d) * 100) : 0;

    let bestStreak = 0;
    let topStreakHabit: { name: string; streak: number } | null = null;
    activeHabits.forEach((h) => {
      const st = calculateHabitStreak(h, completions, now).currentStreak;
      if (st > bestStreak) {
        bestStreak = st;
        topStreakHabit = { name: h.name, streak: st };
      }
    });

    return {
      consistency7d,
      consistency30d,
      totalCheckins7d: checkins7d,
      activeHabitCount: activeHabits.length,
      topStreakHabit,
      hasSufficientData: checkins7d > 0 || checkins30d > 0,
    };
  }, [activeHabits, completions, now]);

  // 2. Focus Time Rhythm Calculations
  const timerHistory = appState.timer.history || [];
  const focusMetrics = useMemo(() => {
    let focusMinsCurrent7d = 0;
    let focusMinsPrior7d = 0;
    let focusSessionsCurrent7d = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysAgoStr = formatLocalYMD(sevenDaysAgo);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);
    const fourteenDaysAgoStr = formatLocalYMD(fourteenDaysAgo);

    timerHistory.forEach((item) => {
      if (item.mode !== 'focus') return;
      const dStr = item.date || todayStr;
      if (dStr >= sevenDaysAgoStr && dStr <= todayStr) {
        focusMinsCurrent7d += item.minutes || 0;
        focusSessionsCurrent7d++;
      } else if (dStr >= fourteenDaysAgoStr && dStr < sevenDaysAgoStr) {
        focusMinsPrior7d += item.minutes || 0;
      }
    });

    const diffMins = focusMinsCurrent7d - focusMinsPrior7d;
    const percentChange =
      focusMinsPrior7d > 0
        ? Math.round((diffMins / focusMinsPrior7d) * 100)
        : focusMinsCurrent7d > 0
        ? 100
        : 0;

    const avgSessionMinutes =
      focusSessionsCurrent7d > 0
        ? Math.round(focusMinsCurrent7d / focusSessionsCurrent7d)
        : 0;

    return {
      current7dMinutes: focusMinsCurrent7d,
      prior7dMinutes: focusMinsPrior7d,
      sessionsCount: focusSessionsCurrent7d,
      diffMinutes: diffMins,
      percentChange,
      avgSessionMinutes,
      hasSufficientData: focusSessionsCurrent7d > 0,
    };
  }, [timerHistory, now, todayStr]);

  // 3. Calendar Commitments & Capacity
  const calendarEvents = appState.calendarEvents || [];
  const calendarMetrics = useMemo(() => {
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);
    const next7DaysStr = formatLocalYMD(next7Days);

    const upcoming7d = calendarEvents.filter(
      (ev) => ev.date >= todayStr && ev.date <= next7DaysStr
    );

    const dayCounts: Record<string, number> = {};
    upcoming7d.forEach((ev) => {
      dayCounts[ev.date] = (dayCounts[ev.date] || 0) + 1;
    });

    let maxDay = '';
    let maxCount = 0;
    Object.entries(dayCounts).forEach(([d, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxDay = d;
      }
    });

    const workloadDensity =
      upcoming7d.length >= 10 ? 'High' : upcoming7d.length >= 4 ? 'Moderate' : 'Light';

    return {
      count7d: upcoming7d.length,
      busiestDate: maxDay || 'None',
      busiestCount: maxCount,
      workloadDensity,
      hasSufficientData: upcoming7d.length > 0,
    };
  }, [calendarEvents, todayStr, now]);

  // 4. FINSA Spending & Burn Rate Calculations
  const finsa = appState.finsa;
  const currency: FinsaCurrency = finsa?.currency || 'INR';
  const privacyMode = Boolean(finsa?.privacyMode);
  const transactions = finsa?.transactions || [];

  const spendingMetrics = useMemo(() => {
    const currentYearMonth = todayStr.slice(0, 7); // YYYY-MM
    const currentMonthExpenses = transactions
      .filter((tx) => tx.type === 'expense' && tx.date.startsWith(currentYearMonth))
      .reduce((sum, tx) => sum + tx.amountCents, 0);

    const budgetLimitCents =
      finsa?.budgetConfig?.monthlyOverallLimitCents || 0;

    // Daily run rate = spent so far / dayOfMonth
    const dailyBurnRateCents =
      dayOfMonth > 0 ? Math.round(currentMonthExpenses / dayOfMonth) : 0;

    // Projected month-end total = dailyBurnRate * daysInCurrentMonth
    const projectedMonthEndCents = dailyBurnRateCents * daysInCurrentMonth;

    const budgetRemainingCents = budgetLimitCents - currentMonthExpenses;
    const isOverBudget = budgetLimitCents > 0 && currentMonthExpenses > budgetLimitCents;
    const isProjectedOverBudget =
      budgetLimitCents > 0 && projectedMonthEndCents > budgetLimitCents;

    return {
      currentMonthExpenses,
      budgetLimitCents,
      dailyBurnRateCents,
      projectedMonthEndCents,
      budgetRemainingCents,
      isOverBudget,
      isProjectedOverBudget,
      hasSufficientData: currentMonthExpenses > 0,
    };
  }, [transactions, todayStr, finsa?.budgetConfig, dayOfMonth, daysInCurrentMonth]);

  // 5. FINSA Savings Pace & Goal Completion Estimation
  const dailySavings = finsa?.dailySavings || [];
  const savingsGoals = finsa?.savingsGoals || [];

  const savingsPaceMetrics = useMemo(() => {
    const totalDailySavingsCents = dailySavings.reduce((sum, s) => sum + s.amountCents, 0);

    // Calculate daily average across distinct saving days
    const uniqueDates = new Set(dailySavings.map((s) => s.date));
    const daysTracked = Math.max(1, uniqueDates.size);

    const averageDailySavingsCents = Math.round(totalDailySavingsCents / daysTracked);
    const projectedMonthlySavingsCents = Math.round(averageDailySavingsCents * 30.4);

    // Goal completion projections
    const goalProjections = savingsGoals.map((goal) => {
      const remainingCents = Math.max(0, goal.targetCents - goal.currentCents);
      const isComplete = goal.currentCents >= goal.targetCents;

      let estimatedDaysToTarget: number | null = null;
      let projectedDateStr: string | null = null;

      if (!isComplete && averageDailySavingsCents > 0) {
        estimatedDaysToTarget = Math.ceil(remainingCents / averageDailySavingsCents);
        const projDate = new Date();
        projDate.setDate(now.getDate() + estimatedDaysToTarget);
        projectedDateStr = formatLocalYMD(projDate);
      }

      return {
        id: goal.id,
        name: goal.name,
        targetCents: goal.targetCents,
        currentCents: goal.currentCents,
        remainingCents,
        isComplete,
        estimatedDaysToTarget,
        projectedDateStr,
      };
    });

    return {
      totalDailySavingsCents,
      daysTracked,
      averageDailySavingsCents,
      projectedMonthlySavingsCents,
      goalProjections,
      hasSufficientData: dailySavings.length > 0,
    };
  }, [dailySavings, savingsGoals, now]);

  return (
    <div
      style={panelBgStyle}
      className="rounded-3xl border border-slate-800/90 bg-slate-950/70 p-5 sm:p-7 shadow-xl space-y-6 text-white"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Personal Insights & Velocity
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Deterministic Arithmetic
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Transparent analytics derived exclusively from your local device records. Zero guessing, zero external AI processing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD 1: HABIT CONSISTENCY */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Habit Consistency Index</span>
              </div>
              <button
                type="button"
                onClick={() => toggleFormula('habit')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Show formula"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {expandedFormulaId === 'habit' && (
              <div className="p-2.5 my-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1 animate-fadeIn">
                <div className="font-semibold text-emerald-400">Mathematical Formula:</div>
                <div className="font-mono text-[10px] text-slate-400">
                  Consistency = (Completed Habit Check-ins) / (Active Habits × Window Days) × 100
                </div>
                <p className="text-[10px] text-slate-400">
                  Calculated by traversing your local IndexedDB completion logs for the past 7 and 30 days.
                </p>
              </div>
            )}

            {habitMetrics.hasSufficientData ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">7-Day Consistency</div>
                    <div className="text-2xl font-mono font-bold text-emerald-400 mt-0.5">
                      {habitMetrics.consistency7d}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">30-Day Consistency</div>
                    <div className="text-2xl font-mono font-bold text-indigo-400 mt-0.5">
                      {habitMetrics.consistency30d}%
                    </div>
                  </div>
                </div>

                {habitMetrics.topStreakHabit && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
                    <span className="text-slate-300 text-[11px]">Top Running Streak:</span>
                    <span className="font-semibold text-amber-300 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {habitMetrics.topStreakHabit.name} ({habitMetrics.topStreakHabit.streak} days)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
                <div>Insufficient habit data.</div>
                <div className="text-[10px] text-slate-400">
                  Check in habits over 3 days to reveal mathematical consistency metrics.
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('habits')}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer text-left"
          >
            Review habits tracker →
          </button>
        </div>

        {/* CARD 2: FOCUS RHYTHM */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <TimerIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Focus Time & Rhythm</span>
              </div>
              <button
                type="button"
                onClick={() => toggleFormula('focus')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Show formula"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {expandedFormulaId === 'focus' && (
              <div className="p-2.5 my-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1 animate-fadeIn">
                <div className="font-semibold text-indigo-400">Mathematical Formula:</div>
                <div className="font-mono text-[10px] text-slate-400">
                  Trend % = ((Focus Mins 7D - Focus Mins Prior 7D) / Prior 7D) × 100
                </div>
                <p className="text-[10px] text-slate-400">
                  Aggregates durationMinutes from genuine completed timer session logs.
                </p>
              </div>
            )}

            {focusMetrics.hasSufficientData ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Past 7 Days Focus</div>
                    <div className="text-2xl font-mono font-bold text-indigo-400 mt-0.5">
                      {focusMetrics.current7dMinutes}m
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Avg Session Length</div>
                    <div className="text-2xl font-mono font-bold text-cyan-400 mt-0.5">
                      {focusMetrics.avgSessionMinutes}m
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-300 flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400">7-Day Trend vs Prior Week:</span>
                  <span
                    className={`font-mono font-semibold ${
                      focusMetrics.diffMinutes >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {focusMetrics.diffMinutes >= 0 ? `+${focusMetrics.diffMinutes}m` : `${focusMetrics.diffMinutes}m`} (
                    {focusMetrics.percentChange > 0 ? `+${focusMetrics.percentChange}%` : `${focusMetrics.percentChange}%`})
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
                <div>No focus sessions logged this week.</div>
                <div className="text-[10px] text-slate-400">
                  Complete focus blocks to reveal focus trend and velocity metrics.
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('timer')}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer text-left"
          >
            Launch focus timer →
          </button>
        </div>

        {/* CARD 3: SPENDING VELOCITY & BURN RATE */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">FINSA Spending Velocity</span>
              </div>
              <button
                type="button"
                onClick={() => toggleFormula('spending')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Show formula"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {expandedFormulaId === 'spending' && (
              <div className="p-2.5 my-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1 animate-fadeIn">
                <div className="font-semibold text-amber-400">Mathematical Formula:</div>
                <div className="font-mono text-[10px] text-slate-400">
                  Daily Burn Rate = Month Spent / Current Day Number
                  <br />
                  Projected Month Total = Daily Burn Rate × Days In Month
                </div>
                <p className="text-[10px] text-slate-400">
                  Strictly separates expenses from account transfers to prevent double counting.
                </p>
              </div>
            )}

            {spendingMetrics.hasSufficientData ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Month Spent</div>
                    <div className="text-xl font-mono font-bold text-rose-400 mt-0.5">
                      {formatCents(spendingMetrics.currentMonthExpenses, currency, privacyMode)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Daily Burn Rate</div>
                    <div className="text-xl font-mono font-bold text-amber-400 mt-0.5">
                      {formatCents(spendingMetrics.dailyBurnRateCents, currency, privacyMode)}/d
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Projected Month-End Outflow:</span>
                  <span className="font-mono font-bold text-white">
                    {formatCents(spendingMetrics.projectedMonthEndCents, currency, privacyMode)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
                <div>No expenses recorded for this month.</div>
                <div className="text-[10px] text-slate-400">
                  Record expenses in FINSA to see your daily burn rate and projection.
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('finsa')}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer text-left"
          >
            Open FINSA Studio →
          </button>
        </div>

        {/* CARD 4: SAVINGS PACE & GOAL PROJECTIONS */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Savings Pace & Goal Projections</span>
              </div>
              <button
                type="button"
                onClick={() => toggleFormula('savings')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Show formula"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {expandedFormulaId === 'savings' && (
              <div className="p-2.5 my-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1 animate-fadeIn">
                <div className="font-semibold text-cyan-400">Mathematical Formula:</div>
                <div className="font-mono text-[10px] text-slate-400">
                  Daily Avg Savings = Total Vault Drops / Distinct Recorded Days
                  <br />
                  Estimated Days to Goal = (Target Cents - Current Cents) / Daily Avg
                </div>
              </div>
            )}

            {savingsPaceMetrics.hasSufficientData ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Avg Daily Savings</div>
                    <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                      {formatCents(savingsPaceMetrics.averageDailySavingsCents, currency, privacyMode)}/d
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Projected 30D Pace</div>
                    <div className="text-xl font-mono font-bold text-cyan-400 mt-0.5">
                      {formatCents(savingsPaceMetrics.projectedMonthlySavingsCents, currency, privacyMode)}
                    </div>
                  </div>
                </div>

                {/* Goals projection list */}
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {savingsPaceMetrics.goalProjections.map((gp) => (
                    <div
                      key={gp.id}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{gp.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {gp.isComplete
                            ? 'Goal Fully Funded!'
                            : gp.projectedDateStr
                            ? `Est. completion: ${gp.projectedDateStr} (${gp.estimatedDaysToTarget} days)`
                            : 'Save daily to project completion date'}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300 font-bold shrink-0">
                        {formatCents(gp.currentCents, currency, privacyMode)}
                      </span>
                    </div>
                  ))}

                  {savingsPaceMetrics.goalProjections.length === 0 && (
                    <div className="p-2 text-center text-[11px] text-slate-500">
                      No active savings goals defined yet in FINSA.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
                <div>No daily savings drops recorded yet.</div>
                <div className="text-[10px] text-slate-400">
                  Drop pocket change into FINSA Vault to calculate goal pace & completion projections.
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('finsa')}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer text-left"
          >
            View savings goals in FINSA →
          </button>
        </div>
      </div>
    </div>
  );
};
