import {
  FinsaAccount,
  FinsaBudgetConfig,
  FinsaCategory,
  FinsaCurrency,
  FinsaDailySavingsRecord,
  FinsaPaymentMethod,
  FinsaRecurringItem,
  FinsaSavingsGoal,
  FinsaScenario,
  FinsaState,
  FinsaTransaction,
} from '../types/finsa';
import { formatLocalYMD } from '../constants/scenesAndPresets';

/**
 * Currency Symbol Mapping
 */
export const CURRENCY_SYMBOLS: Record<FinsaCurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
  CHF: 'CHF ',
};

export const DEFAULT_FINSA_CATEGORIES: FinsaCategory[] = [
  // Income
  { id: 'cat_inc_salary', name: 'Salary & Compensation', type: 'income', icon: '💼', color: '#10b981' },
  { id: 'cat_inc_freelance', name: 'Freelance & Projects', type: 'income', icon: '💻', color: '#06b6d4' },
  { id: 'cat_inc_investments', name: 'Investments & Returns', type: 'income', icon: '📈', color: '#8b5cf6' },
  { id: 'cat_inc_other', name: 'Other Inflow', type: 'income', icon: '🎁', color: '#6366f1' },

  // Expenses
  { id: 'cat_exp_housing', name: 'Housing & Rent', type: 'expense', icon: '🏠', color: '#f43f5e', budgetLimitCents: 120000 },
  { id: 'cat_exp_groceries', name: 'Food & Groceries', type: 'expense', icon: '🛒', color: '#f59e0b', budgetLimitCents: 45000 },
  { id: 'cat_exp_dining', name: 'Dining & Cafes', type: 'expense', icon: '☕', color: '#fb923c', budgetLimitCents: 20000 },
  { id: 'cat_exp_transport', name: 'Transit & Fuel', type: 'expense', icon: '🚗', color: '#3b82f6', budgetLimitCents: 15000 },
  { id: 'cat_exp_utilities', name: 'Utilities & Internet', type: 'expense', icon: '⚡', color: '#06b6d4', budgetLimitCents: 15000 },
  { id: 'cat_exp_subs', name: 'Subscriptions & Software', type: 'expense', icon: '📺', color: '#a855f7', budgetLimitCents: 8000 },
  { id: 'cat_exp_health', name: 'Health & Wellness', type: 'expense', icon: '🌿', color: '#10b981', budgetLimitCents: 10000 },
  { id: 'cat_exp_shopping', name: 'Shopping & Gear', type: 'expense', icon: '🛍️', color: '#ec4899', budgetLimitCents: 15000 },
  { id: 'cat_exp_other', name: 'Miscellaneous', type: 'expense', icon: '📦', color: '#64748b' },
];

export const DEFAULT_FINSA_ACCOUNTS: FinsaAccount[] = [
  {
    id: 'acc_checking_primary',
    name: 'Primary Checking',
    type: 'checking',
    balanceCents: 0,
    currency: 'INR',
    icon: '💳',
    color: '#6366f1',
    institution: 'Primary Bank',
    isIncludedInNetWorth: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc_savings_reserve',
    name: 'High-Yield Savings',
    type: 'savings',
    balanceCents: 0,
    currency: 'INR',
    icon: '🛡️',
    color: '#10b981',
    institution: 'Savings Vault',
    isIncludedInNetWorth: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc_cash_pocket',
    name: 'Cash Wallet',
    type: 'cash',
    balanceCents: 0,
    currency: 'INR',
    icon: '💵',
    color: '#f59e0b',
    isIncludedInNetWorth: true,
    createdAt: new Date().toISOString(),
  },
];

export function createDefaultFinsaState(): FinsaState {
  return {
    enabled: true,
    currency: 'INR',
    privacyMode: false,
    accounts: DEFAULT_FINSA_ACCOUNTS,
    categories: DEFAULT_FINSA_CATEGORIES,
    transactions: [],
    recurringItems: [],
    savingsGoals: [],
    scenarios: [],
    dailySavings: [],
    counterTheme: 'gold',
    counterReducedMotion: false,
    isLocked: false,
    passcodeHash: null,
    demoMode: false,
    notes: [],
    lastAuditedAt: new Date().toISOString(),
  };
}

/**
 * Format integer minor currency units (cents/paise) into a clean localized currency string.
 * Supports privacyMode balance masking (••••••).
 * Correctly uses Indian number formatting (e.g. ₹1,25,00,000.00) when INR is selected.
 */
export function formatCents(
  cents: number,
  currency: FinsaCurrency = 'INR',
  privacyMode: boolean = false
): string {
  if (privacyMode) return '••••••';
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const symbol = CURRENCY_SYMBOLS[currency] || (currency === 'INR' ? '₹' : '$');

  if (currency === 'JPY') {
    // JPY does not use minor units (1 yen = 1 unit)
    const formatted = Math.round(absCents).toLocaleString('ja-JP');
    return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  }

  const primaryUnits = absCents / 100;
  let formattedDigits: string;

  if (currency === 'INR') {
    // Indian numbering system: thousands, then pairs of 2 digits (lakhs, crores)
    formattedDigits = primaryUnits.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else if (currency === 'EUR') {
    formattedDigits = primaryUnits.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else if (currency === 'GBP') {
    formattedDigits = primaryUnits.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    formattedDigits = primaryUnits.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return isNegative ? `-${symbol}${formattedDigits}` : `${symbol}${formattedDigits}`;
}

/**
 * Format currency in readable abbreviations (e.g. ₹1.25 Cr, ₹12.5 L, $1.25M)
 * strictly for compact summary cards. (The main counter retains the complete formatted value.)
 */
export function formatCompactCurrency(
  cents: number,
  currency: FinsaCurrency = 'INR',
  privacyMode: boolean = false
): string {
  if (privacyMode) return '••••••';
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const symbol = CURRENCY_SYMBOLS[currency] || (currency === 'INR' ? '₹' : '$');
  const primaryUnits = absCents / 100;

  let text = '';
  if (currency === 'INR') {
    // 1 Crore = 10,000,000 INR = 1,000,000,000 paise
    if (primaryUnits >= 10000000) {
      const cr = primaryUnits / 10000000;
      text = `${symbol}${cr >= 100 ? cr.toFixed(1) : cr.toFixed(2).replace(/\.00$/, '')} Cr`;
    } else if (primaryUnits >= 100000) {
      // 1 Lakh = 100,000 INR
      const lk = primaryUnits / 100000;
      text = `${symbol}${lk >= 100 ? lk.toFixed(1) : lk.toFixed(2).replace(/\.00$/, '')} L`;
    } else if (primaryUnits >= 1000) {
      const k = primaryUnits / 1000;
      text = `${symbol}${k.toFixed(1).replace(/\.0$/, '')} K`;
    } else {
      text = formatCents(cents, currency, false);
    }
  } else {
    // Western metric scale (K, M, B)
    if (primaryUnits >= 1000000000) {
      text = `${symbol}${(primaryUnits / 1000000000).toFixed(2).replace(/\.00$/, '')}B`;
    } else if (primaryUnits >= 1000000) {
      text = `${symbol}${(primaryUnits / 1000000).toFixed(2).replace(/\.00$/, '')}M`;
    } else if (primaryUnits >= 1000) {
      text = `${symbol}${(primaryUnits / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    } else {
      text = formatCents(cents, currency, false);
    }
  }

  return isNegative ? `-${text}` : text;
}

export interface CounterReelBreakdown {
  currencySymbol: string;
  integerChars: string[];
  hasDecimals: boolean;
  decimalSeparator: string;
  decimalChars: string[];
  fullFormatted: string;
  isNegative: boolean;
  isMasked: boolean;
  rawCents: number;
}

/**
 * Decompose minor currency units into structured mechanical reel tokens
 * with proper Indian/international digit grouping and decimal handling.
 */
export function formatCounterReelParts(
  cents: number,
  currency: FinsaCurrency = 'INR',
  privacyMode: boolean = false
): CounterReelBreakdown {
  const symbol = CURRENCY_SYMBOLS[currency] || (currency === 'INR' ? '₹' : '$');
  const isNegative = cents < 0;

  if (privacyMode) {
    return {
      currencySymbol: symbol,
      integerChars: ['•', '•', '•', '•', '•'],
      hasDecimals: false,
      decimalSeparator: '.',
      decimalChars: [],
      fullFormatted: `${symbol}••••••`,
      isNegative: false,
      isMasked: true,
      rawCents: cents,
    };
  }

  const absCents = Math.abs(cents);
  const primaryUnits = absCents / 100;

  let formattedNumStr: string;
  if (currency === 'INR') {
    formattedNumStr = primaryUnits.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else if (currency === 'JPY') {
    formattedNumStr = Math.round(absCents).toLocaleString('ja-JP');
  } else if (currency === 'EUR') {
    formattedNumStr = primaryUnits.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    formattedNumStr = primaryUnits.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const decimalSeparator = currency === 'EUR' ? ',' : '.';
  const hasDecimals = currency !== 'JPY';

  let integerPart = formattedNumStr;
  let decimalChars: string[] = [];

  if (hasDecimals) {
    const parts = formattedNumStr.split(decimalSeparator);
    integerPart = parts[0] || '0';
    const decStr = parts[1] || '00';
    decimalChars = decStr.split('').slice(0, 2);
  }

  const integerChars = integerPart.split('');

  return {
    currencySymbol: symbol,
    integerChars,
    hasDecimals,
    decimalSeparator,
    decimalChars,
    fullFormatted: formatCents(cents, currency, false),
    isNegative,
    isMasked: false,
    rawCents: cents,
  };
}

/**
 * Parse user currency input string (e.g. "124.50" or "₹1,24,000.00") into integer cents.
 */
export function parseCurrencyToCents(amountStr: string, currency: FinsaCurrency = 'USD'): number {
  if (!amountStr) return 0;
  // Remove currency symbols, commas, and whitespace
  const clean = amountStr.replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  if (currency === 'JPY') return Math.round(num);
  return Math.round(num * 100);
}

/**
 * Calculate total net worth across all active accounts flagged for net worth inclusion.
 */
export function calculateNetWorth(accounts: FinsaAccount[]): number {
  return accounts
    .filter((a) => !a.isArchived && a.isIncludedInNetWorth)
    .reduce((sum, a) => {
      // Credit card accounts are debt (liabilities)
      if (a.type === 'credit') {
        return sum - Math.abs(a.balanceCents);
      }
      return sum + a.balanceCents;
    }, 0);
}

export interface CashFlowSummary {
  incomeCents: number;
  expensesCents: number;
  netFlowCents: number;
  savingsRatePercent: number;
  transferVolumeCents: number;
}

/**
 * Calculate cash flow metrics for a given date range.
 * Rigorous accounting rule: Transfers between accounts do NOT count toward income or expenses!
 */
export function calculateCashFlow(
  transactions: FinsaTransaction[],
  startDateStr?: string,
  endDateStr?: string
): CashFlowSummary {
  let incomeCents = 0;
  let expensesCents = 0;
  let transferVolumeCents = 0;

  for (const tx of transactions) {
    if (startDateStr && tx.date < startDateStr) continue;
    if (endDateStr && tx.date > endDateStr) continue;

    if (tx.type === 'income') {
      incomeCents += tx.amountCents;
    } else if (tx.type === 'expense') {
      expensesCents += tx.amountCents;
    } else if (tx.type === 'transfer') {
      transferVolumeCents += tx.amountCents;
    }
  }

  const netFlowCents = incomeCents - expensesCents;
  const savingsRatePercent =
    incomeCents > 0 ? Math.max(0, Math.min(100, Math.round((netFlowCents / incomeCents) * 100))) : 0;

  return {
    incomeCents,
    expensesCents,
    netFlowCents,
    savingsRatePercent,
    transferVolumeCents,
  };
}

/**
 * Category-level spending breakdown
 */
export interface CategorySpendingBreakdown {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  icon: string;
  color: string;
  spentCents: number;
  totalCents: number;
  budgetLimitCents?: number;
  percentageOfExpenses: number;
  percentage: number;
}

export function calculateCategoryBreakdown(
  transactions: FinsaTransaction[],
  categories: FinsaCategory[],
  startDateStr?: string,
  endDateStr?: string
): CategorySpendingBreakdown[] {
  const categoryMap = new Map<string, FinsaCategory>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  const spendingMap = new Map<string, number>();
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (startDateStr && tx.date < startDateStr) continue;
    if (endDateStr && tx.date > endDateStr) continue;

    const current = spendingMap.get(tx.categoryId) || 0;
    spendingMap.set(tx.categoryId, current + tx.amountCents);
    totalExpense += tx.amountCents;
  }

  const breakdown: CategorySpendingBreakdown[] = [];
  for (const [catId, spent] of spendingMap.entries()) {
    const cat = categoryMap.get(catId);
    const icon = cat?.icon || '📦';
    const color = cat?.color || '#94a3b8';
    const percentage = totalExpense > 0 ? Math.round((spent / totalExpense) * 100) : 0;
    breakdown.push({
      categoryId: catId,
      categoryName: cat?.name || 'Uncategorized',
      categoryIcon: icon,
      categoryColor: color,
      icon,
      color,
      spentCents: spent,
      totalCents: spent,
      budgetLimitCents: cat?.budgetLimitCents,
      percentageOfExpenses: percentage,
      percentage,
    });
  }

  return breakdown.sort((a, b) => b.spentCents - a.spentCents);
}

/**
 * Money River Visualization Data Structure
 * Models the flow: Inflow Streams -> Inflow River -> Outflow Tributaries (Expenses, Savings, Surplus)
 */
export interface MoneyRiverNode {
  id: string;
  name: string;
  icon: string;
  color: string;
  amountCents: number;
  percent: number;
  category: 'inflow' | 'outflow_expense' | 'outflow_savings' | 'unallocated';
}

export interface MoneyRiverData {
  totalInflowCents: number;
  totalOutflowCents: number;
  netRetainedCents: number;
  inflowSources: MoneyRiverNode[];
  expenseAllocations: MoneyRiverNode[];
  savingsAllocations: MoneyRiverNode[];
}

export function generateMoneyRiverData(
  transactions: FinsaTransaction[],
  categories: FinsaCategory[],
  savingsGoals: FinsaSavingsGoal[],
  startDateStr?: string,
  endDateStr?: string
): MoneyRiverData {
  const catMap = new Map<string, FinsaCategory>();
  for (const c of categories) catMap.set(c.id, c);

  let totalInflowCents = 0;
  let totalOutflowCents = 0;

  const inflowMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  for (const tx of transactions) {
    if (startDateStr && tx.date < startDateStr) continue;
    if (endDateStr && tx.date > endDateStr) continue;

    if (tx.type === 'income') {
      totalInflowCents += tx.amountCents;
      const cur = inflowMap.get(tx.categoryId) || 0;
      inflowMap.set(tx.categoryId, cur + tx.amountCents);
    } else if (tx.type === 'expense') {
      totalOutflowCents += tx.amountCents;
      const cur = expenseMap.get(tx.categoryId) || 0;
      expenseMap.set(tx.categoryId, cur + tx.amountCents);
    }
  }

  const inflowSources: MoneyRiverNode[] = [];
  for (const [catId, amount] of inflowMap.entries()) {
    const cat = catMap.get(catId);
    inflowSources.push({
      id: catId,
      name: cat?.name || 'Income Source',
      icon: cat?.icon || '💼',
      color: cat?.color || '#10b981',
      amountCents: amount,
      percent: totalInflowCents > 0 ? Math.round((amount / totalInflowCents) * 100) : 0,
      category: 'inflow',
    });
  }

  const expenseAllocations: MoneyRiverNode[] = [];
  for (const [catId, amount] of expenseMap.entries()) {
    const cat = catMap.get(catId);
    expenseAllocations.push({
      id: catId,
      name: cat?.name || 'Expense Category',
      icon: cat?.icon || '🛒',
      color: cat?.color || '#f43f5e',
      amountCents: amount,
      percent: totalInflowCents > 0 ? Math.round((amount / totalInflowCents) * 100) : 0,
      category: 'outflow_expense',
    });
  }

  // Monthly savings goals contribution rate
  const savingsAllocations: MoneyRiverNode[] = savingsGoals.map((g) => ({
    id: `goal_${g.id}`,
    name: g.name,
    icon: g.icon || '🎯',
    color: g.color || '#6366f1',
    amountCents: g.monthlyPlannedCents,
    percent: totalInflowCents > 0 ? Math.round((g.monthlyPlannedCents / totalInflowCents) * 100) : 0,
    category: 'outflow_savings',
  }));

  const totalSavingsPlanned = savingsAllocations.reduce((sum, s) => sum + s.amountCents, 0);
  const netRetainedCents = totalInflowCents - totalOutflowCents - totalSavingsPlanned;

  return {
    totalInflowCents,
    totalOutflowCents,
    netRetainedCents,
    inflowSources: inflowSources.sort((a, b) => b.amountCents - a.amountCents),
    expenseAllocations: expenseAllocations.sort((a, b) => b.amountCents - a.amountCents),
    savingsAllocations,
  };
}

/**
 * Financial Time Machine: Balance Forecasting
 * Models projected balance forward over 30, 60, 90, 180, and 365 days.
 */
export interface ForecastDataPoint {
  dateStr: string;
  label: string;
  projectedNetWorthCents: number;
  isProjected: boolean;
  cumulativeSavingsCents: number;
  scheduledBillsDueCents: number;
}

export function calculateFinancialForecast(
  currentNetWorthCents: number,
  recurringItems: FinsaRecurringItem[],
  savingsGoals: FinsaSavingsGoal[],
  daysAhead: number = 180
): ForecastDataPoint[] {
  const points: ForecastDataPoint[] = [];
  const now = new Date();

  // Baseline monthly recurring cash flow
  let monthlyRecurringIncome = 0;
  let monthlyRecurringExpenses = 0;

  for (const item of recurringItems) {
    if (item.status !== 'active') continue;
    let monthlyEquivalent = item.amountCents;
    if (item.frequency === 'daily') monthlyEquivalent = item.amountCents * 30;
    else if (item.frequency === 'weekly') monthlyEquivalent = item.amountCents * 4.33;
    else if (item.frequency === 'biweekly') monthlyEquivalent = item.amountCents * 2.16;
    else if (item.frequency === 'quarterly') monthlyEquivalent = item.amountCents / 3;
    else if (item.frequency === 'yearly') monthlyEquivalent = item.amountCents / 12;

    if (item.type === 'income') monthlyRecurringIncome += monthlyEquivalent;
    else monthlyRecurringExpenses += monthlyEquivalent;
  }

  const monthlyPlannedSavings = savingsGoals.reduce((sum, g) => sum + g.monthlyPlannedCents, 0);
  const netMonthlyGrowth = monthlyRecurringIncome - monthlyRecurringExpenses;

  // Generate 7 projection intervals (Day 0, Day 15, Day 30, Day 60, Day 90, Day 120, Day 180)
  const intervals = [0, 15, 30, 60, 90, 120, 180];
  let runningBalance = currentNetWorthCents;
  let runningSavings = 0;

  for (const days of intervals) {
    if (days > daysAhead) break;
    const targetDate = new Date(now.getTime() + days * 86400000);
    const monthsFraction = days / 30;

    const projectedBalance = Math.round(currentNetWorthCents + netMonthlyGrowth * monthsFraction);
    const cumulativeSavings = Math.round(monthlyPlannedSavings * monthsFraction);

    points.push({
      dateStr: targetDate.toISOString().split('T')[0],
      label: days === 0 ? 'Today' : `+${days}d`,
      projectedNetWorthCents: projectedBalance,
      isProjected: days > 0,
      cumulativeSavingsCents: cumulativeSavings,
      scheduledBillsDueCents: Math.round(monthlyRecurringExpenses * monthsFraction),
    });
  }

  return points;
}

/**
 * What-If Scenario Sandbox Simulation
 */
export interface ScenarioSimulationResult {
  scenarioName: string;
  originalNetWorthCents: number;
  scenarioNetWorthCents: number;
  netImpactCents: number;
  monthlyCashFlowDeltaCents: number;
  goalAchievementDeltaMonths: number;
}

export function simulateScenario(
  currentNetWorthCents: number,
  recurringItems: FinsaRecurringItem[],
  scenario: FinsaScenario,
  monthsAhead: number = 12
): ScenarioSimulationResult {
  let monthlyDelta = scenario.monthlySavingsChangeCents;

  for (const catAdjustment of Object.values(scenario.categoryAdjustmentsCents)) {
    monthlyDelta -= catAdjustment; // Reducing expense is negative catAdjustment -> increases monthlyDelta
  }

  const netImpactCents = monthlyDelta * monthsAhead - scenario.oneTimeExpenseCents;
  const scenarioNetWorthCents = currentNetWorthCents + netImpactCents;

  return {
    scenarioName: scenario.name,
    originalNetWorthCents: currentNetWorthCents,
    scenarioNetWorthCents,
    netImpactCents,
    monthlyCashFlowDeltaCents: monthlyDelta,
    goalAchievementDeltaMonths: monthlyDelta !== 0 ? Math.round(scenario.oneTimeExpenseCents / Math.abs(monthlyDelta)) : 0,
  };
}

/**
 * CSV Export & Import Utilities
 */
export function exportTransactionsToCSV(
  transactions: FinsaTransaction[],
  accounts: FinsaAccount[],
  categories: FinsaCategory[]
): string {
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Account', 'ToAccount', 'Payee', 'Notes'];
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    (t.amountCents / 100).toFixed(2),
    'USD',
    `"${(catMap.get(t.categoryId) || 'Uncategorized').replace(/"/g, '""')}"`,
    `"${(accMap.get(t.accountId) || 'Default').replace(/"/g, '""')}"`,
    t.toAccountId ? `"${(accMap.get(t.toAccountId) || '').replace(/"/g, '""')}"` : '',
    `"${(t.payeeOrPayer || '').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Approximate Offline Exchange Rates (Base: USD)
 */


/**
 * Opt-in Sample Financial Dataset
 * Provides transparent, realistic starter records without fabricating user activity.
 */
export function getFinsaSampleDataset(currency: FinsaCurrency = 'INR'): Partial<FinsaState> {
  const isINR = currency === 'INR';
  const mult = isINR ? 80 : 1;
  const now = new Date();
  const d1 = now.toISOString().split('T')[0];
  const d2 = new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0];
  const d3 = new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0];
  const d4 = new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0];

  const accounts: FinsaAccount[] = [
    {
      id: 'acc_checking_demo',
      name: isINR ? 'HDFC Salary Checking' : 'Primary Checking',
      type: 'checking',
      balanceCents: 45000 * 100 * mult,
      currency,
      icon: '💳',
      color: '#6366f1',
      institution: isINR ? 'HDFC Bank' : 'Main Bank',
      isIncludedInNetWorth: true,
      createdAt: now.toISOString(),
    },
    {
      id: 'acc_savings_demo',
      name: isINR ? 'ICICI High-Yield Vault' : 'Emergency Fund Vault',
      type: 'savings',
      balanceCents: 120000 * 100 * mult,
      currency,
      icon: '🛡️',
      color: '#10b981',
      institution: isINR ? 'ICICI Bank' : 'Vault Reserve',
      isIncludedInNetWorth: true,
      createdAt: now.toISOString(),
    },
    {
      id: 'acc_cash_demo',
      name: 'Physical Cash Reserve',
      type: 'cash',
      balanceCents: 5000 * 100 * mult,
      currency,
      icon: '💵',
      color: '#f59e0b',
      isIncludedInNetWorth: true,
      createdAt: now.toISOString(),
    },
  ];

  const transactions: FinsaTransaction[] = [
    {
      id: 'tx_demo_salary',
      date: d4,
      amountCents: 85000 * 100 * mult,
      type: 'income',
      categoryId: 'cat_inc_salary',
      accountId: 'acc_checking_demo',
      payeeOrPayer: 'Monthly Software Engineering Compensation',
      notes: 'Direct deposit',
      createdAt: now.toISOString(),
    },
    {
      id: 'tx_demo_rent',
      date: d3,
      amountCents: 22000 * 100 * mult,
      type: 'expense',
      categoryId: 'cat_exp_housing',
      accountId: 'acc_checking_demo',
      payeeOrPayer: 'Apartment Sanctuary Lease',
      notes: 'Monthly rent transfer',
      createdAt: now.toISOString(),
    },
    {
      id: 'tx_demo_groceries',
      date: d2,
      amountCents: 4200 * 100 * mult,
      type: 'expense',
      categoryId: 'cat_exp_groceries',
      accountId: 'acc_checking_demo',
      payeeOrPayer: isINR ? 'Nature Basket Organics' : 'Whole Foods Market',
      notes: 'Weekly fresh groceries',
      createdAt: now.toISOString(),
    },
    {
      id: 'tx_demo_transfer',
      date: d1,
      amountCents: 15000 * 100 * mult,
      type: 'transfer',
      categoryId: 'cat_exp_other',
      accountId: 'acc_checking_demo',
      toAccountId: 'acc_savings_demo',
      payeeOrPayer: 'Emergency Vault Allocation',
      notes: 'Transferred 15k to savings',
      createdAt: now.toISOString(),
    },
  ];

  const savingsGoals: FinsaSavingsGoal[] = [
    {
      id: 'goal_emergency_demo',
      name: '6-Month Emergency Vault',
      targetCents: 200000 * 100 * mult,
      currentCents: 120000 * 100 * mult,
      targetDate: new Date(now.getTime() + 180 * 86400000).toISOString().split('T')[0],
      linkedAccountId: 'acc_savings_demo',
      icon: '🛡️',
      color: '#10b981',
      monthlyPlannedCents: 15000 * 100 * mult,
      history: [
        { id: 'h1', date: d4, amountCents: 15000 * 100 * mult, note: 'Initial deposit' },
      ],
      createdAt: now.toISOString(),
    },
    {
      id: 'goal_workstation_demo',
      name: 'Desk Setup & Monitor Upgrade',
      targetCents: 45000 * 100 * mult,
      currentCents: 28000 * 100 * mult,
      targetDate: new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0],
      icon: '💻',
      color: '#6366f1',
      monthlyPlannedCents: 8000 * 100 * mult,
      history: [],
      createdAt: now.toISOString(),
    },
  ];

  const recurringItems: FinsaRecurringItem[] = [
    {
      id: 'rec_fiber_demo',
      name: 'High-Speed Fiber Internet',
      type: 'expense',
      amountCents: 1200 * 100 * mult,
      categoryId: 'cat_exp_utilities',
      accountId: 'acc_checking_demo',
      frequency: 'monthly',
      nextDueDate: new Date(now.getTime() + 8 * 86400000).toISOString().split('T')[0],
      isSubscription: true,
      status: 'active',
      autoLog: true,
    },
    {
      id: 'rec_cloud_demo',
      name: 'Cloud Studio & Storage',
      type: 'expense',
      amountCents: 650 * 100 * mult,
      categoryId: 'cat_exp_subs',
      accountId: 'acc_checking_demo',
      frequency: 'monthly',
      nextDueDate: new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0],
      isSubscription: true,
      status: 'active',
      autoLog: true,
    },
  ];

  return {
    accounts,
    transactions,
    savingsGoals,
    recurringItems,
    demoMode: true,
  };
}

/**
 * Exchange rates against USD base (INR, USD, EUR, GBP, CAD, AUD, JPY, CHF)
 */
export const CURRENCY_RATES_TO_USD: Record<FinsaCurrency, number> = {
  USD: 1.0,
  INR: 0.012, // 1 INR ~ 0.012 USD (~83.3 INR per USD)
  EUR: 1.09,
  GBP: 1.28,
  CAD: 0.74,
  AUD: 0.66,
  JPY: 0.0067,
  CHF: 1.13,
};

export function convertCurrency(
  amountCents: number,
  fromCurrency: FinsaCurrency,
  toCurrency: FinsaCurrency
): number {
  if (fromCurrency === toCurrency) return amountCents;
  const inUSD = (amountCents / 100) * CURRENCY_RATES_TO_USD[fromCurrency];
  const inTarget = inUSD / CURRENCY_RATES_TO_USD[toCurrency];
  return Math.round(inTarget * 100);
}

export interface CompoundInterestResult {
  year: number;
  principalCents: number;
  totalContributionsCents: number;
  interestEarnedCents: number;
  futureValueCents: number;
}

export function calculateCompoundInterest(
  initialPrincipalCents: number,
  monthlyDepositCents: number,
  annualInterestRatePercent: number,
  years: number
): CompoundInterestResult[] {
  const results: CompoundInterestResult[] = [];
  const r = annualInterestRatePercent / 100 / 12;
  let futureValue = initialPrincipalCents;
  let totalDeposits = initialPrincipalCents;

  results.push({
    year: 0,
    principalCents: initialPrincipalCents,
    totalContributionsCents: totalDeposits,
    interestEarnedCents: 0,
    futureValueCents: initialPrincipalCents,
  });

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      futureValue = (futureValue + monthlyDepositCents) * (1 + r);
      totalDeposits += monthlyDepositCents;
    }
    const futureValCents = Math.round(futureValue);
    const interestEarned = Math.max(0, futureValCents - totalDeposits);
    results.push({
      year: y,
      principalCents: initialPrincipalCents,
      totalContributionsCents: Math.round(totalDeposits),
      interestEarnedCents: interestEarned,
      futureValueCents: futureValCents,
    });
  }

  return results;
}

/**
 * Daily Savings Statistical Engine
 */
export interface DailySavingsStats {
  totalCents: number;
  todayCents: number;
  monthCents: number;
  streakDays: number;
  timeline: Array<{ date: string; amountCents: number; displayLabel: string }>;
}

export function calculateDailySavingsStats(
  records: FinsaDailySavingsRecord[] = [],
  filterPeriod: '7d' | '30d' | '3m' | '1y' = '30d'
): DailySavingsStats {
  const now = new Date();
  const todayStr = formatLocalYMD(now);
  const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

  let totalCents = 0;
  let todayCents = 0;
  let monthCents = 0;

  const dateSumMap = new Map<string, number>();

  for (const rec of records) {
    if (rec.amountCents <= 0) continue;
    totalCents += rec.amountCents;

    if (rec.date === todayStr) {
      todayCents += rec.amountCents;
    }
    if (rec.date.startsWith(currentMonthPrefix)) {
      monthCents += rec.amountCents;
    }

    const current = dateSumMap.get(rec.date) || 0;
    dateSumMap.set(rec.date, current + rec.amountCents);
  }

  // Calculate consecutive savings streak ending today or yesterday
  const datesWithSavings = new Set(dateSumMap.keys());
  let streakDays = 0;
  const checkDate = new Date(now);

  // If today doesn't have a record yet, allow yesterday as streak anchor
  const checkDateStr = formatLocalYMD(checkDate);
  if (!datesWithSavings.has(checkDateStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (datesWithSavings.has(formatLocalYMD(checkDate))) {
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Build timeline data based on filterPeriod
  let daysCount = 30;
  if (filterPeriod === '7d') daysCount = 7;
  else if (filterPeriod === '3m') daysCount = 90;
  else if (filterPeriod === '1y') daysCount = 365;

  const timeline: Array<{ date: string; amountCents: number; displayLabel: string }> = [];
  const cursor = new Date(now);
  cursor.setDate(cursor.getDate() - (daysCount - 1));

  for (let i = 0; i < daysCount; i++) {
    const dStr = formatLocalYMD(cursor);
    const amount = dateSumMap.get(dStr) || 0;
    const displayLabel = cursor.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    timeline.push({ date: dStr, amountCents: amount, displayLabel });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    totalCents,
    todayCents,
    monthCents,
    streakDays,
    timeline,
  };
}

/**
 * Spending Dashboard & Budget Calculation Engine
 */
export interface SpendingCategoryMetric {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  spentCents: number;
  percentageOfTotal: number;
  budgetLimitCents?: number;
  remainingBudgetCents?: number;
  isOverBudget: boolean;
  status: 'safe' | 'caution' | 'danger'; // safe < 80%, caution 80-99%, danger >= 100%
}

export interface SpendingDayTrend {
  date: string;
  dayShort: string;
  amountCents: number;
  displayLabel: string;
  isToday: boolean;
}

export interface SpendingStats {
  todaySpentCents: number;
  monthSpentCents: number;
  weekSpentCents: number;
  totalPeriodSpentCents: number;
  overallBudgetLimitCents: number;
  remainingBudgetCents: number;
  budgetUsedPercent: number;
  budgetHealth: 'healthy' | 'warning' | 'critical';
  dailyAverageCents: number;
  projectedMonthEndCents: number;
  weeklyTrend: SpendingDayTrend[];
  categoryMetrics: SpendingCategoryMetric[];
  recentExpenses: FinsaTransaction[];
}

export function calculateSpendingStats(
  transactions: FinsaTransaction[] = [],
  categories: FinsaCategory[] = [],
  budgetConfig?: FinsaBudgetConfig,
  customPeriod?: 'today' | 'week' | 'month' | 'year' | 'all'
): SpendingStats {
  const now = new Date();
  const todayStr = formatLocalYMD(now);
  const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDayOfMonth = Math.max(1, now.getDate());

  // 7-day boundary
  const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000);
  const sevenDaysAgoStr = formatLocalYMD(sevenDaysAgo);

  let todaySpentCents = 0;
  let monthSpentCents = 0;
  let weekSpentCents = 0;
  let totalPeriodSpentCents = 0;

  const categoryMap = new Map<string, FinsaCategory>();
  for (const c of categories) categoryMap.set(c.id, c);

  const monthCategorySpendMap = new Map<string, number>();
  const dailyDateSpendMap = new Map<string, number>();
  const expenseList: FinsaTransaction[] = [];

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    expenseList.push(tx);

    const isToday = tx.date === todayStr;
    const isThisMonth = tx.date.startsWith(currentMonthPrefix);
    const isThisWeek = tx.date >= sevenDaysAgoStr && tx.date <= todayStr;

    if (isToday) todaySpentCents += tx.amountCents;
    if (isThisMonth) {
      monthSpentCents += tx.amountCents;
      const cur = monthCategorySpendMap.get(tx.categoryId) || 0;
      monthCategorySpendMap.set(tx.categoryId, cur + tx.amountCents);
    }
    if (isThisWeek) weekSpentCents += tx.amountCents;

    // Daily map
    const curDaily = dailyDateSpendMap.get(tx.date) || 0;
    dailyDateSpendMap.set(tx.date, curDaily + tx.amountCents);

    // Filter by period for totalPeriodSpentCents
    if (!customPeriod || customPeriod === 'month') {
      if (isThisMonth) totalPeriodSpentCents += tx.amountCents;
    } else if (customPeriod === 'today') {
      if (isToday) totalPeriodSpentCents += tx.amountCents;
    } else if (customPeriod === 'week') {
      if (isThisWeek) totalPeriodSpentCents += tx.amountCents;
    } else {
      totalPeriodSpentCents += tx.amountCents;
    }
  }

  // Calculate Overall Budget
  let overallBudgetLimitCents = budgetConfig?.monthlyOverallLimitCents || 0;
  if (!overallBudgetLimitCents) {
    // If no explicit overall budget, sum category budget limits
    overallBudgetLimitCents = categories
      .filter((c) => c.type === 'expense')
      .reduce((sum, c) => sum + (c.budgetLimitCents || 0), 0);
  }

  const remainingBudgetCents = overallBudgetLimitCents > 0
    ? Math.max(0, overallBudgetLimitCents - monthSpentCents)
    : 0;

  const budgetUsedPercent = overallBudgetLimitCents > 0
    ? Math.min(200, Math.round((monthSpentCents / overallBudgetLimitCents) * 100))
    : 0;

  let budgetHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (budgetUsedPercent >= 100) budgetHealth = 'critical';
  else if (budgetUsedPercent >= 80) budgetHealth = 'warning';

  const dailyAverageCents = Math.round(monthSpentCents / currentDayOfMonth);
  const projectedMonthEndCents = dailyAverageCents * daysInCurrentMonth;

  // 7-Day Weekly Trend
  const weeklyTrend: SpendingDayTrend[] = [];
  const trendCursor = new Date(sevenDaysAgo);

  for (let i = 0; i < 7; i++) {
    const dStr = formatLocalYMD(trendCursor);
    const amount = dailyDateSpendMap.get(dStr) || 0;
    const dayShort = trendCursor.toLocaleDateString(undefined, { weekday: 'short' });
    const displayLabel = trendCursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    weeklyTrend.push({
      date: dStr,
      dayShort,
      amountCents: amount,
      displayLabel,
      isToday: dStr === todayStr,
    });
    trendCursor.setDate(trendCursor.getDate() + 1);
  }

  // Category Metrics
  const categoryMetrics: SpendingCategoryMetric[] = [];
  const processedCategoryIds = new Set<string>();

  for (const [catId, spent] of monthCategorySpendMap.entries()) {
    processedCategoryIds.add(catId);
    const cat = categoryMap.get(catId);
    const limit = budgetConfig?.categoryLimitsCents?.[catId] ?? cat?.budgetLimitCents;
    const percentOfTotal = monthSpentCents > 0 ? Math.round((spent / monthSpentCents) * 100) : 0;
    const isOver = Boolean(limit && spent > limit);
    let status: 'safe' | 'caution' | 'danger' = 'safe';
    if (limit) {
      const ratio = spent / limit;
      if (ratio >= 1.0) status = 'danger';
      else if (ratio >= 0.8) status = 'caution';
    }

    categoryMetrics.push({
      categoryId: catId,
      categoryName: cat?.name || 'Uncategorized',
      icon: cat?.icon || '🛒',
      color: cat?.color || '#fb7185',
      spentCents: spent,
      percentageOfTotal: percentOfTotal,
      budgetLimitCents: limit,
      remainingBudgetCents: limit ? Math.max(0, limit - spent) : undefined,
      isOverBudget: isOver,
      status,
    });
  }

  // Include budgeted categories with 0 spend so user sees their allowance
  for (const cat of categories) {
    if (cat.type !== 'expense' || processedCategoryIds.has(cat.id)) continue;
    const limit = budgetConfig?.categoryLimitsCents?.[cat.id] ?? cat.budgetLimitCents;
    if (limit && limit > 0) {
      categoryMetrics.push({
        categoryId: cat.id,
        categoryName: cat.name,
        icon: cat.icon,
        color: cat.color,
        spentCents: 0,
        percentageOfTotal: 0,
        budgetLimitCents: limit,
        remainingBudgetCents: limit,
        isOverBudget: false,
        status: 'safe',
      });
    }
  }

  // Sort by spent descending
  categoryMetrics.sort((a, b) => b.spentCents - a.spentCents);

  // Recent expenses sorted by date desc, then createdAt desc
  const recentExpenses = expenseList
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 15);

  return {
    todaySpentCents,
    monthSpentCents,
    weekSpentCents,
    totalPeriodSpentCents,
    overallBudgetLimitCents,
    remainingBudgetCents,
    budgetUsedPercent,
    budgetHealth,
    dailyAverageCents,
    projectedMonthEndCents,
    weeklyTrend,
    categoryMetrics,
    recentExpenses,
  };
}

