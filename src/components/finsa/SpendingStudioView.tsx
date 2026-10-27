import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Repeat,
  Trash2,
  Edit2,
  X,
  Sliders,
  PieChart,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Wallet,
  ShoppingBag,
  Utensils,
  Car,
  FileText,
  HeartPulse,
  GraduationCap,
  Film,
  Zap,
} from 'lucide-react';
import {
  FinsaAccount,
  FinsaCategory,
  FinsaCurrency,
  FinsaPaymentMethod,
  FinsaState,
  FinsaTransaction,
  FinsaBudgetConfig,
} from '../../types/finsa';
import {
  calculateSpendingStats,
  formatCents,
  formatCompactCurrency,
  parseCurrencyToCents,
  CURRENCY_SYMBOLS,
} from '../../services/finsaEngine';
import { formatLocalYMD } from '../../constants/scenesAndPresets';
import { soundEngine } from '../../audio/soundEngine';

interface SpendingStudioViewProps {
  finsaState: FinsaState;
  onUpdateFinsa: (patch: Partial<FinsaState>) => void;
  panelBgStyle?: React.CSSProperties;
}

/**
 * Common category presets with icons for spending
 */
const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'cat_food', name: 'Food & Dining', icon: '🍔' },
  { id: 'cat_groceries', name: 'Groceries', icon: '🛒' },
  { id: 'cat_transport', name: 'Transport & Fuel', icon: '🚗' },
  { id: 'cat_shopping', name: 'Shopping & Retail', icon: '🛍️' },
  { id: 'cat_bills', name: 'Bills & Utilities', icon: '⚡' },
  { id: 'cat_entertainment', name: 'Entertainment & OTT', icon: '🎬' },
  { id: 'cat_health', name: 'Health & Pharmacy', icon: '💊' },
  { id: 'cat_education', name: 'Education & Books', icon: '📚' },
  { id: 'cat_travel', name: 'Travel & Vacation', icon: '✈️' },
  { id: 'cat_personal', name: 'Personal Care', icon: '✨' },
];

const PAYMENT_METHODS: { id: FinsaPaymentMethod; label: string; icon: any }[] = [
  { id: 'upi', label: 'UPI / QR', icon: Smartphone },
  { id: 'card', label: 'Card (Debit/Credit)', icon: CreditCard },
  { id: 'cash', label: 'Physical Cash', icon: Banknote },
  { id: 'netbanking', label: 'Net Banking', icon: Building2 },
  { id: 'auto_debit', label: 'Auto-Debit / Mandate', icon: Repeat },
  { id: 'other', label: 'Other Method', icon: Wallet },
];

export const SpendingStudioView: React.FC<SpendingStudioViewProps> = ({
  finsaState,
  onUpdateFinsa,
  panelBgStyle,
}) => {
  const currency = finsaState.currency || 'INR';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || '₹';
  const privacyMode = Boolean(finsaState.privacyMode);

  // Quick Amount presets based on currency
  const quickAmounts = useMemo(() => {
    if (currency === 'INR') return [100, 250, 500, 1000, 2000, 5000];
    if (currency === 'JPY') return [500, 1000, 2000, 5000, 10000];
    return [5, 10, 20, 50, 100, 200];
  }, [currency]);

  // Modals state
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isBudgetConfigOpen, setIsBudgetConfigOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FinsaTransaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');

  // Form states for Expense entry
  const [amountStr, setAmountStr] = useState('');
  const [dateStr, setDateStr] = useState(() => formatLocalYMD(new Date()));
  const [timeStr, setTimeStr] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [categoryId, setCategoryId] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<FinsaPaymentMethod>('upi');
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Budget Config
  const [budgetMonthlyStr, setBudgetMonthlyStr] = useState(() => {
    const lim = finsaState.budgetConfig?.monthlyOverallLimitCents;
    return lim ? String(lim / 100) : '35000';
  });
  const [categoryLimitsMap, setCategoryLimitsMap] = useState<Record<string, string>>(() => {
    const res: Record<string, string> = {};
    const existing = finsaState.budgetConfig?.categoryLimitsCents || {};
    Object.entries(existing).forEach(([catId, val]) => {
      res[catId] = String(val / 100);
    });
    return res;
  });

  // Calculate high-precision spending stats via engine
  const spendingStats = useMemo(() => {
    return calculateSpendingStats(
      finsaState.transactions,
      finsaState.categories,
      finsaState.budgetConfig
    );
  }, [finsaState.transactions, finsaState.categories, finsaState.budgetConfig]);

  // Filtered expense ledger
  const filteredExpenses = useMemo(() => {
    return finsaState.transactions.filter((tx) => {
      if (tx.type !== 'expense') return false;
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;
      if (filterPaymentMethod !== 'all' && tx.paymentMethod !== filterPaymentMethod) return false;
      if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = finsaState.categories.find((c) => c.id === tx.categoryId)?.name || '';
        const acc = finsaState.accounts.find((a) => a.id === tx.accountId)?.name || '';
        const match =
          tx.payeeOrPayer.toLowerCase().includes(q) ||
          (tx.notes || '').toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q) ||
          acc.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    finsaState.transactions,
    filterCategory,
    filterPaymentMethod,
    filterAccount,
    searchQuery,
    finsaState.categories,
    finsaState.accounts,
  ]);

  // Open Add modal with defaults
  const handleOpenAddExpense = () => {
    soundEngine.playUiClick();
    setEditingExpense(null);
    setAmountStr('');
    setDateStr(formatLocalYMD(new Date()));
    const now = new Date();
    setTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setCategoryId(finsaState.categories.find((c) => c.type === 'expense')?.id || 'cat_food');
    setCustomCategoryName('');
    setAccountId(finsaState.accounts[0]?.id || '');
    setPaymentMethod('upi');
    setPayee('');
    setNotes('');
    setIsRecurring(false);
    setFormError(null);
    setIsAddExpenseModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEditExpense = (tx: FinsaTransaction) => {
    soundEngine.playUiClick();
    setEditingExpense(tx);
    setAmountStr(String(tx.amountCents / 100));
    setDateStr(tx.date);
    setTimeStr(tx.time || '12:00');
    setCategoryId(tx.categoryId);
    setCustomCategoryName('');
    setAccountId(tx.accountId);
    setPaymentMethod(tx.paymentMethod || 'other');
    setPayee(tx.payeeOrPayer);
    setNotes(tx.notes || '');
    setIsRecurring(Boolean(tx.isRecurringExpense));
    setFormError(null);
    setIsAddExpenseModalOpen(true);
  };

  // Save Expense (Handles creation or update, and strictly updates account balance)
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseCurrencyToCents(amountStr, currency);
    if (cents <= 0) {
      setFormError('Please enter a valid positive expense amount.');
      soundEngine.playWarningTone();
      return;
    }
    if (!accountId) {
      setFormError('Please select a payment account.');
      soundEngine.playWarningTone();
      return;
    }

    let finalCatId = categoryId;
    let updatedCategories = [...finsaState.categories];

    // If custom category was chosen
    if (categoryId === 'custom') {
      const trimmed = customCategoryName.trim();
      if (!trimmed) {
        setFormError('Please enter a custom category name.');
        return;
      }
      finalCatId = `cat_custom_${Date.now()}`;
      const newCat: FinsaCategory = {
        id: finalCatId,
        name: trimmed,
        type: 'expense',
        icon: '🏷️',
        color: '#f43f5e',
      };
      updatedCategories.push(newCat);
    }

    let updatedAccounts = [...finsaState.accounts];
    let updatedTransactions = [...finsaState.transactions];

    if (editingExpense) {
      // Revert previous expense impact on the original account balance
      const prevCents = editingExpense.amountCents;
      const prevAccId = editingExpense.accountId;
      updatedAccounts = updatedAccounts.map((a) => {
        if (a.id === prevAccId) {
          return { ...a, balanceCents: a.balanceCents + prevCents };
        }
        return a;
      });

      // Deduct new expense from the new selected account
      updatedAccounts = updatedAccounts.map((a) => {
        if (a.id === accountId) {
          return { ...a, balanceCents: a.balanceCents - cents };
        }
        return a;
      });

      // Update transaction record
      updatedTransactions = updatedTransactions.map((tx) => {
        if (tx.id === editingExpense.id) {
          return {
            ...tx,
            amountCents: cents,
            date: dateStr,
            time: timeStr,
            categoryId: finalCatId,
            accountId,
            paymentMethod,
            payeeOrPayer: payee.trim() || 'General Expense',
            notes: notes.trim(),
            isRecurringExpense: isRecurring,
          };
        }
        return tx;
      });
    } else {
      // Create new expense transaction
      const newTx: FinsaTransaction = {
        id: `tx_exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: dateStr,
        time: timeStr,
        amountCents: cents,
        type: 'expense',
        categoryId: finalCatId,
        accountId,
        paymentMethod,
        payeeOrPayer: payee.trim() || 'Expense',
        notes: notes.trim(),
        isRecurringExpense: isRecurring,
        createdAt: new Date().toISOString(),
      };

      // Deduct from account balance
      updatedAccounts = updatedAccounts.map((a) => {
        if (a.id === accountId) {
          return { ...a, balanceCents: a.balanceCents - cents };
        }
        return a;
      });

      updatedTransactions = [newTx, ...updatedTransactions];
    }

    soundEngine.playSaveSuccess();
    onUpdateFinsa({
      transactions: updatedTransactions,
      accounts: updatedAccounts,
      categories: updatedCategories,
    });
    setIsAddExpenseModalOpen(false);
  };

  // Delete Expense (Restores the deducted balance back to the account)
  const handleDeleteExpense = (txId: string) => {
    const tx = finsaState.transactions.find((t) => t.id === txId);
    if (!tx) return;

    soundEngine.playStepChange();
    // Revert account balance
    const updatedAccounts = finsaState.accounts.map((a) => {
      if (a.id === tx.accountId) {
        return { ...a, balanceCents: a.balanceCents + tx.amountCents };
      }
      return a;
    });

    const updatedTransactions = finsaState.transactions.filter((t) => t.id !== txId);
    onUpdateFinsa({
      transactions: updatedTransactions,
      accounts: updatedAccounts,
    });
    setDeleteConfirmId(null);
  };

  // Save Budget Configuration
  const handleSaveBudgetConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const overallCents = parseCurrencyToCents(budgetMonthlyStr, currency);
    const catMapCents: Record<string, number> = {};
    Object.entries(categoryLimitsMap).forEach(([catId, val]) => {
      const parsed = parseCurrencyToCents(val, currency);
      if (parsed > 0) catMapCents[catId] = parsed;
    });

    const newConfig: FinsaBudgetConfig = {
      monthlyOverallLimitCents: overallCents > 0 ? overallCents : 3500000,
      period: 'monthly',
      categoryLimitsCents: catMapCents,
    };

    soundEngine.playSaveSuccess();
    onUpdateFinsa({ budgetConfig: newConfig });
    setIsBudgetConfigOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Terminal Top Banner */}
      <div
        className="p-6 sm:p-8 rounded-3xl border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-slate-950/80 to-slate-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        style={panelBgStyle}
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono tracking-wider">
                MONEY-OUT TERMINAL
              </span>
              <span className="text-xs text-rose-200/70 font-mono flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-rose-400" />
                <span>Precision Expense Control & Budget Protection</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Spending Studio</span>
              <span className="text-rose-400 text-sm font-mono px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                {currency}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Track outflows, control category limits, and observe spending trends. Every rupee logged directly deducts from your selected account with zero double-counting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Manage Budget Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setIsBudgetConfigOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold flex items-center gap-2 shadow cursor-pointer transition-colors"
            >
              <Sliders className="w-4 h-4 text-rose-400" />
              <span>Budget Limits</span>
            </button>

            {/* Record Expense CTA */}
            <button
              type="button"
              onClick={handleOpenAddExpense}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Spending Metric Terminal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Spent Today */}
        <div
          className="p-5 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl relative overflow-hidden"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Spent Today</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2 font-mono tracking-tight">
            {formatCents(spendingStats.todaySpentCents, currency, privacyMode)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span>Daily Avg:</span>
            <span className="text-slate-300 font-mono font-semibold">
              {formatCents(spendingStats.dailyAverageCents, currency, privacyMode)}
            </span>
          </p>
        </div>

        {/* Spent This Month */}
        <div
          className="p-5 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Spent This Month</span>
            <Calendar className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono tracking-tight">
            {formatCents(spendingStats.monthSpentCents, currency, privacyMode)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Projected end of month:{' '}
            <span className="text-slate-300 font-mono font-semibold">
              {formatCompactCurrency(spendingStats.projectedMonthEndCents, currency)}
            </span>
          </p>
        </div>

        {/* Remaining Monthly Budget */}
        <div
          className="p-5 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Remaining Budget</span>
            <ShieldAlert
              className={`w-4 h-4 ${
                spendingStats.budgetHealth === 'critical'
                  ? 'text-rose-500 animate-pulse'
                  : spendingStats.budgetHealth === 'warning'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            />
          </div>
          <div
            className={`text-2xl font-black mt-2 font-mono tracking-tight ${
              spendingStats.remainingBudgetCents < 0
                ? 'text-rose-500'
                : spendingStats.remainingBudgetCents < spendingStats.overallBudgetLimitCents * 0.2
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {formatCents(spendingStats.remainingBudgetCents, currency, privacyMode)}
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-400">Total Limit:</span>
            <span className="text-slate-300 font-mono font-semibold">
              {formatCents(spendingStats.overallBudgetLimitCents, currency, privacyMode)}
            </span>
          </div>
        </div>

        {/* Budget Health / Burn Rate */}
        <div
          className="p-5 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Budget Consumed</span>
            <PieChart className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-2 font-mono tracking-tight">
            {spendingStats.budgetUsedPercent}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {Math.max(0, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate())} days remaining in current billing cycle
          </p>
        </div>
      </div>

      {/* 3. Overspending Warning / Budget Alert Banner */}
      {spendingStats.budgetHealth === 'critical' && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold">Overspending Warning:</span> Monthly expenditures have exceeded your designated budget by{' '}
              <span className="font-mono font-bold text-white">
                {formatCents(Math.abs(spendingStats.remainingBudgetCents), currency)}
              </span>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBudgetConfigOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/40 text-white text-xs font-bold cursor-pointer shrink-0"
          >
            Adjust Limit
          </button>
        </div>
      )}

      {/* 4. Spending Visualizations: 7-Day Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Outflow Trend Bar Visualizer */}
        <div
          className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl space-y-4 lg:col-span-1"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span>7-Day Spending Velocity</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              Past 7 Days
            </span>
          </div>

          <div className="pt-4 flex items-end justify-between gap-2 h-44">
            {(() => {
              const maxVal = Math.max(...spendingStats.weeklyTrend.map((d) => d.amountCents), 1);
              return spendingStats.weeklyTrend.map((day) => {
                const heightPercent = Math.max(8, Math.round((day.amountCents / maxVal) * 100));
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatCompactCurrency(day.amountCents, currency)}
                    </div>
                    <div
                      className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 ${
                        day.isToday
                          ? 'bg-gradient-to-t from-rose-600 to-rose-400 shadow-lg shadow-rose-500/30'
                          : day.amountCents > 0
                          ? 'bg-slate-700 hover:bg-slate-600'
                          : 'bg-slate-800/40'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${day.date}: ${formatCents(day.amountCents, currency)}`}
                    />
                    <span className={`text-[11px] font-mono ${day.isToday ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      {day.dayShort}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
          <p className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-800/80">
            Hover over bars to see daily outflow amounts
          </p>
        </div>

        {/* Category Allocation & Limits Breakdown */}
        <div
          className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl space-y-4 lg:col-span-2"
          style={panelBgStyle}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <span>Category Allocation & Budget Protection</span>
            </h2>
            <button
              type="button"
              onClick={() => setIsBudgetConfigOpen(true)}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
            >
              Configure Limits
            </button>
          </div>

          <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
            {spendingStats.categoryMetrics.length > 0 ? (
              spendingStats.categoryMetrics.map((cat) => (
                <div key={cat.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span>
                      <span className="font-semibold text-slate-200">{cat.categoryName}</span>
                      {cat.isOverBudget && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold">
                          LIMIT EXCEEDED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-white">
                        {formatCents(cat.spentCents, currency, privacyMode)}
                      </span>
                      <span className="text-slate-400 text-[11px]">({cat.percentageOfTotal}%)</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat.isOverBudget
                          ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                          : 'bg-gradient-to-r from-rose-500/80 to-amber-500/80'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(3, cat.percentageOfTotal))}%` }}
                    />
                  </div>

                  {Boolean(cat.budgetLimitCents && cat.budgetLimitCents > 0) && (
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Limit: {formatCents(cat.budgetLimitCents || 0, currency, privacyMode)}</span>
                      <span>
                        {cat.spentCents > (cat.budgetLimitCents || 0)
                          ? `Over by ${formatCents(cat.spentCents - (cat.budgetLimitCents || 0), currency)}`
                          : `${formatCents((cat.budgetLimitCents || 0) - cat.spentCents, currency)} left`}
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No expense records logged for this period yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Expense Transaction Ledger & Filter Bar */}
      <div
        className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl space-y-4"
        style={panelBgStyle}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-400" />
              <span>Expense Records Ledger</span>
            </h2>
            <p className="text-xs text-slate-400">
              {filteredExpenses.length} expense transactions recorded
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merchant, memo..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 w-44 sm:w-56"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Categories</option>
              {finsaState.categories
                .filter((c) => c.type === 'expense')
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>

            {/* Payment Method Filter */}
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Methods</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expenses List */}
        <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto pr-1">
          {filteredExpenses.map((tx) => {
            const cat = finsaState.categories.find((c) => c.id === tx.categoryId);
            const acc = finsaState.accounts.find((a) => a.id === tx.accountId);
            const isDeleting = deleteConfirmId === tx.id;

            return (
              <div
                key={tx.id}
                className="py-3 px-2 rounded-xl hover:bg-slate-900/60 transition-colors flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-lg shrink-0">
                    {cat?.icon || '💳'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-2">
                      <span>{tx.payeeOrPayer}</span>
                      {tx.isRecurringExpense && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300 font-mono flex items-center gap-1">
                          <Repeat className="w-2.5 h-2.5" />
                          <span>Recurring</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="font-mono text-slate-300">{tx.date} {tx.time ? `· ${tx.time}` : ''}</span>
                      <span>·</span>
                      <span className="text-slate-300">{cat?.name || 'General'}</span>
                      <span>·</span>
                      <span className="text-slate-400">{acc?.name || 'Account'}</span>
                      {tx.paymentMethod && (
                        <>
                          <span>·</span>
                          <span className="uppercase text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            {tx.paymentMethod}
                          </span>
                        </>
                      )}
                    </div>
                    {tx.notes && (
                      <p className="text-[11px] text-slate-400 italic truncate max-w-md mt-0.5">
                        &quot;{tx.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-black font-mono text-rose-400">
                      -{formatCents(tx.amountCents, currency, privacyMode)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleOpenEditExpense(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      title="Edit Expense"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {isDeleting ? (
                      <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-lg border border-rose-500/40 animate-fadeIn">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(tx.id)}
                          className="px-2 py-0.5 rounded text-[10px] bg-rose-600 text-white font-bold cursor-pointer hover:bg-rose-500"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-0.5 rounded text-[10px] text-slate-300 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(tx.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                        title="Delete Expense (Restores Account Balance)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredExpenses.length === 0 && (
            <div className="p-10 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              No matching expense transactions found. Click &quot;Record Expense&quot; above to log spending.
            </div>
          )}
        </div>
      </div>

      {/* 6. RECORD / EDIT EXPENSE MODAL */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <span>{editingExpense ? 'Edit Expense Record' : 'Record New Expense'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-4">
              {/* Amount & Fast Shortcuts */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount Spent ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400 font-bold font-mono text-base">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="e.g. 250, 1500"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-lg focus:outline-none focus:border-rose-500"
                    required
                    autoFocus
                  />
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountStr(String(amt))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors ${
                        amountStr === String(amt)
                          ? 'bg-rose-500 text-white font-bold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      +{currencySymbol}{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Spending Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                >
                  {finsaState.categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon || '🏷️'} {c.name}
                      </option>
                    ))}
                  <option value="custom">+ Create Custom Category</option>
                </select>

                {categoryId === 'custom' && (
                  <input
                    type="text"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="Enter custom category name (e.g. Pet Care, Gadgets)..."
                    className="w-full mt-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                    required
                  />
                )}
              </div>

              {/* Payment Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Account (Balance will be deducted) *
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                  required
                >
                  {finsaState.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — Balance: {formatCents(acc.balanceCents, currency)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const isSelected = paymentMethod === pm.id;
                    const IconComp = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`p-2 rounded-xl border text-left cursor-pointer transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] truncate">{pm.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payee / Merchant */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Merchant / Payee Name
                </label>
                <input
                  type="text"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  placeholder="e.g. Swiggy, Amazon, Metro Fuel, Coffee Shop"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Description / Memo Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Note (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Dinner with team, monthly internet bill"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Recurring Setting Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Recurring Monthly Expense</span>
                  <span className="text-[11px] text-slate-400">Flag for ongoing monthly commitments</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    isRecurring ? 'bg-rose-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isRecurring ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 cursor-pointer transition-colors"
                >
                  {editingExpense ? 'Save Changes' : 'Deduct & Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. BUDGET MANAGEMENT FLOW MODAL */}
      {isBudgetConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-rose-400" />
                <h2 className="text-base font-bold text-white">Monthly Budget Limits</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsBudgetConfigOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudgetConfig} className="space-y-4">
              {/* Overall Monthly Limit */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Overall Monthly Spending Cap ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400 font-bold font-mono text-base">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={budgetMonthlyStr}
                    onChange={(e) => setBudgetMonthlyStr(e.target.value)}
                    placeholder="e.g. 45000"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-base focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  You will receive cautionary warnings as cumulative spending crosses 80% and 100%.
                </p>
              </div>

              {/* Per-Category Limit Allocations */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Per-Category Limits (Optional)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {finsaState.categories
                    .filter((c) => c.type === 'expense')
                    .map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-slate-300 flex items-center gap-1.5">
                          <span>{cat.icon || '🏷️'}</span>
                          <span>{cat.name}</span>
                        </span>
                        <div className="w-32 relative shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                            {currencySymbol}
                          </span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Limit"
                            value={categoryLimitsMap[cat.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCategoryLimitsMap((prev) => ({ ...prev, [cat.id]: val }));
                            }}
                            className="w-full pl-6 pr-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBudgetConfigOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 cursor-pointer transition-colors"
                >
                  Save Budget Cap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
