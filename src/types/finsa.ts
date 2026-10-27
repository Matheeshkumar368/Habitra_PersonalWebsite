export type FinsaAccountType =
  | 'checking'
  | 'savings'
  | 'cash'
  | 'credit'
  | 'investment'
  | 'custom';

export type FinsaTransactionType = 'income' | 'expense' | 'transfer';

export type FinsaCurrency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'INR'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'CHF';

export interface FinsaAccount {
  id: string;
  name: string;
  type: FinsaAccountType;
  balanceCents: number; // Stored in minor currency units (cents/pence) to prevent float precision drift
  currency: FinsaCurrency;
  icon: string;
  color: string;
  institution?: string;
  isIncludedInNetWorth: boolean;
  isArchived?: boolean;
  createdAt: string;
}

export interface FinsaCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isCustom?: boolean;
  budgetLimitCents?: number;
}

export type CounterTheme =
  | 'vault'
  | 'liquid_gold'
  | 'digital_pulse'
  | 'minimal'
  | 'aurora'
  | 'odometer'
  | 'gold'
  | 'glass'
  | 'mechanical'
  | 'light'
  | 'neon';

export type FinsaPaymentMethod =
  | 'card'
  | 'upi'
  | 'cash'
  | 'netbanking'
  | 'auto_debit'
  | 'other';

export interface FinsaBudgetConfig {
  monthlyOverallLimitCents?: number;
  period?: 'monthly' | 'custom';
  periodStartDate?: string;
  periodEndDate?: string;
  categoryLimitsCents?: Record<string, number>; // categoryId -> limit in cents
}

export interface FinsaTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  amountCents: number; // Stored in positive minor currency units
  type: FinsaTransactionType;
  categoryId: string;
  accountId: string; // Source account (deducted for expense/transfer, credited for income)
  toAccountId?: string; // Destination account for transfers
  payeeOrPayer: string;
  paymentMethod?: FinsaPaymentMethod;
  isRecurringExpense?: boolean;
  notes?: string;
  tags?: string[];
  isPending?: boolean;
  isRecurringInstance?: boolean;
  createdAt: string;
}

export type FinsaRecurringFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface FinsaRecurringItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  amountCents: number;
  categoryId: string;
  accountId: string;
  frequency: FinsaRecurringFrequency;
  nextDueDate: string; // YYYY-MM-DD
  isSubscription: boolean;
  status: 'active' | 'paused' | 'cancelled';
  autoLog: boolean;
  lastLoggedDate?: string;
}

export interface FinsaSavingsGoalContribution {
  id: string;
  date: string;
  amountCents: number;
  note?: string;
}

export interface FinsaSavingsGoal {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  targetDate: string; // YYYY-MM-DD
  linkedAccountId?: string;
  icon: string;
  color: string;
  monthlyPlannedCents: number;
  history: FinsaSavingsGoalContribution[];
  createdAt: string;
}

export interface FinsaScenario {
  id: string;
  name: string;
  description: string;
  monthlySavingsChangeCents: number;
  categoryAdjustmentsCents: Record<string, number>; // categoryId -> delta in cents
  oneTimeExpenseCents: number;
  targetGoalId?: string;
  createdAt: string;
}

export interface FinsaDailySavingsRecord {
  id: string;
  date: string; // YYYY-MM-DD
  amountCents: number; // Stored in minor currency units (cents / paise)
  category: string; // e.g., 'Pocket Change', 'Dining Skipped', 'Side Gig', 'Budget Surplus', 'Challenge'
  note?: string;
  goalId?: string; // Optional linked savings goal ID
  sourceAccountId?: string; // Optional funding account if recording bank transfer
  destinationAccountId?: string; // Optional destination vault account
  createdAt: string;
}

export interface FinsaState {
  enabled: boolean;
  currency: FinsaCurrency;
  privacyMode: boolean; // Masks balances (••••••)
  accounts: FinsaAccount[];
  categories: FinsaCategory[];
  transactions: FinsaTransaction[];
  recurringItems: FinsaRecurringItem[];
  savingsGoals: FinsaSavingsGoal[];
  scenarios: FinsaScenario[];
  dailySavings?: FinsaDailySavingsRecord[];
  budgetConfig?: FinsaBudgetConfig;
  counterTheme?: CounterTheme;
  counterReducedMotion?: boolean;
  counterAnimationIntensity?: 'calm' | 'normal' | 'vivid';
  soundEffectsEnabled?: boolean;
  soundVolume?: number; // 0 to 1
  isLocked: boolean;
  passcodeHash?: string | null;
  lastAuditedAt?: string;
  demoMode?: boolean;
  notes?: Array<{ id: string; title: string; content: string; updatedAt: string }>;
}

