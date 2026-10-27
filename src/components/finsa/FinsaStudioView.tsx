import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PieChart,
  Calendar,
  Shield,
  Eye,
  EyeOff,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Sparkles,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Flame,
  X,
  CreditCard,
  Wallet,
  PiggyBank,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  Compass,
  FileSpreadsheet,
  Calculator,
  Settings,
  FileText,
  Coins,
  RotateCcw,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import {
  FinsaAccount,
  FinsaCategory,
  FinsaCurrency,
  FinsaRecurringItem,
  FinsaSavingsGoal,
  FinsaScenario,
  FinsaState,
  FinsaTransaction,
  FinsaTransactionType,
} from '../../types/finsa';
import {
  calculateCashFlow,
  calculateCategoryBreakdown,
  calculateCompoundInterest,
  calculateFinancialForecast,
  calculateNetWorth,
  convertCurrency,
  exportTransactionsToCSV,
  formatCents,
  generateMoneyRiverData,
  getFinsaSampleDataset,
  parseCurrencyToCents,
  simulateScenario,
  CURRENCY_SYMBOLS,
} from '../../services/finsaEngine';
import { soundEngine } from '../../audio/soundEngine';
import { StyleSettings } from '../../types/app';
import { DailySavingsFlipCounter } from './DailySavingsFlipCounter';
import { SpendingStudioView } from './SpendingStudioView';
import { calculateDailySavingsStats } from '../../services/finsaEngine';
import { formatLocalYMD } from '../../constants/scenesAndPresets';

interface FinsaStudioViewProps {
  finsaState: FinsaState;
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
  onUpdateFinsa: (patch: Partial<FinsaState>) => void;
  onQuickNavigateTab?: (tab: string) => void;
  userName?: string;
}

type FinsaSubTab =
  | 'overview'
  | 'daily_savings'
  | 'spending'
  | 'river'
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'savings'
  | 'forecast'
  | 'reports'
  | 'tools'
  | 'settings';

export const FinsaStudioView: React.FC<FinsaStudioViewProps> = ({
  finsaState,
  styleSettings,
  panelBgStyle,
  onUpdateFinsa,
  userName,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FinsaSubTab>('overview');
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year' | 'all'>('month');

  // Daily savings calculated metrics
  const dailySavingsStats = useMemo(() => {
    return calculateDailySavingsStats(finsaState.dailySavings || []);
  }, [finsaState.dailySavings]);

  // Modals
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isAddRecurringModalOpen, setIsAddRecurringModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinsaTransaction | null>(null);

  // Form states
  const [txType, setTxType] = useState<FinsaTransactionType>('expense');
  const [txAmountStr, setTxAmountStr] = useState('');
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txAccountId, setTxAccountId] = useState('');
  const [txToAccountId, setTxToAccountId] = useState('');
  const [txDate, setTxDate] = useState(() => formatLocalYMD(new Date()));
  const [txPayee, setTxPayee] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txError, setTxError] = useState<string | null>(null);

  // Account Modal
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<FinsaAccount['type']>('checking');
  const [accBalanceStr, setAccBalanceStr] = useState('0');
  const [accIcon, setAccIcon] = useState('💳');

  // Goal Modal
  const [goalName, setGoalName] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalMonthlyStr, setGoalMonthlyStr] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalIcon, setGoalIcon] = useState('🎯');

  // Filter / Search in Transactions
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Interactive Money River selected node
  const [selectedRiverNodeId, setSelectedRiverNodeId] = useState<string | null>(null);

  // What-If Scenario sandbox local state
  const [sandboxMonthlySavings, setSandboxMonthlySavings] = useState(15000); // +$150/mo
  const [sandboxOneTimeExpense, setSandboxOneTimeExpense] = useState(0);

  // Calculator & Converter state
  const [calcFromCurrency, setCalcFromCurrency] = useState<FinsaCurrency>('INR');
  const [calcToCurrency, setCalcToCurrency] = useState<FinsaCurrency>('USD');
  const [calcAmountStr, setCalcAmountStr] = useState('10000');

  // Compound Interest Calculator state
  const [ciPrincipalStr, setCiPrincipalStr] = useState('100000');
  const [ciMonthlyStr, setCiMonthlyStr] = useState('10000');
  const [ciRateStr, setCiRateStr] = useState('10');
  const [ciYears, setCiYears] = useState(5);

  // Financial Notes Scratchpad
  const [notesDraft, setNotesDraft] = useState(() => {
    return localStorage.getItem('habitra_finsa_scratchpad') || '• Target: Maintain 6 months of living expenses in High-Yield Vault.\n• Review recurring cloud and app subscriptions every quarter.\n• Automate 20% of monthly income into long-term savings goals.';
  });
  const [notesSavedToast, setNotesSavedToast] = useState(false);

  const currency = finsaState.currency || 'INR';
  const privacyMode = Boolean(finsaState.privacyMode);

  // Date boundary calculation based on timeframe
  const dateRange = useMemo(() => {
    const now = new Date();
    const endStr = formatLocalYMD(now);
    if (timeframe === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: formatLocalYMD(start), end: endStr };
    }
    if (timeframe === 'quarter') {
      const start = new Date(now.getTime() - 90 * 86400000);
      return { start: formatLocalYMD(start), end: endStr };
    }
    if (timeframe === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: formatLocalYMD(start), end: endStr };
    }
    return { start: undefined, end: undefined };
  }, [timeframe]);

  // Calculations
  const netWorthCents = useMemo(
    () => calculateNetWorth(finsaState.accounts),
    [finsaState.accounts]
  );

  const cashFlow = useMemo(
    () => calculateCashFlow(finsaState.transactions, dateRange.start, dateRange.end),
    [finsaState.transactions, dateRange]
  );

  const categoryBreakdown = useMemo(
    () =>
      calculateCategoryBreakdown(
        finsaState.transactions,
        finsaState.categories,
        dateRange.start,
        dateRange.end
      ),
    [finsaState.transactions, finsaState.categories, dateRange]
  );

  const riverData = useMemo(
    () =>
      generateMoneyRiverData(
        finsaState.transactions,
        finsaState.categories,
        finsaState.savingsGoals,
        dateRange.start,
        dateRange.end
      ),
    [finsaState.transactions, finsaState.categories, finsaState.savingsGoals, dateRange]
  );

  const forecastPoints = useMemo(
    () =>
      calculateFinancialForecast(
        netWorthCents,
        finsaState.recurringItems,
        finsaState.savingsGoals,
        180
      ),
    [netWorthCents, finsaState.recurringItems, finsaState.savingsGoals]
  );

  const sandboxScenario = useMemo<FinsaScenario>(() => {
    return {
      id: 'sc_sandbox',
      name: 'Custom Sandbox Scenario',
      description: 'Interactive what-if projection',
      monthlySavingsChangeCents: sandboxMonthlySavings,
      categoryAdjustmentsCents: {},
      oneTimeExpenseCents: sandboxOneTimeExpense,
      createdAt: new Date().toISOString(),
    };
  }, [sandboxMonthlySavings, sandboxOneTimeExpense]);

  const scenarioResult = useMemo(
    () => simulateScenario(netWorthCents, finsaState.recurringItems, sandboxScenario, 12),
    [netWorthCents, finsaState.recurringItems, sandboxScenario]
  );

  // Currency Converter calculation
  const calcConvertedAmount = useMemo(() => {
    const rawCents = parseCurrencyToCents(calcAmountStr, calcFromCurrency);
    if (rawCents <= 0) return 0;
    return convertCurrency(rawCents, calcFromCurrency, calcToCurrency);
  }, [calcAmountStr, calcFromCurrency, calcToCurrency]);

  // Compound Interest simulation table
  const compoundInterestRows = useMemo(() => {
    const p = parseCurrencyToCents(ciPrincipalStr, currency);
    const m = parseCurrencyToCents(ciMonthlyStr, currency);
    const r = parseFloat(ciRateStr) || 8;
    return calculateCompoundInterest(p, m, r, ciYears);
  }, [ciPrincipalStr, ciMonthlyStr, ciRateStr, ciYears, currency]);

  // Filtered transactions ledger
  const filteredTransactions = useMemo(() => {
    return finsaState.transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false;
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;
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
    filterType,
    filterAccount,
    filterCategory,
    searchQuery,
    finsaState.categories,
    finsaState.accounts,
  ]);

  // Handlers
  const handleTogglePrivacy = () => {
    soundEngine.playUiClick();
    onUpdateFinsa({ privacyMode: !privacyMode });
  };

  const handleCurrencyChange = (newCur: FinsaCurrency) => {
    soundEngine.playUiClick();
    onUpdateFinsa({ currency: newCur });
  };

  const handleOpenAddTx = (type: FinsaTransactionType = 'expense') => {
    soundEngine.playDialogToggle(true);
    setTxType(type);
    setTxAmountStr('');
    setTxCategoryId(
      type === 'income'
        ? finsaState.categories.find((c) => c.type === 'income')?.id || ''
        : finsaState.categories.find((c) => c.type === 'expense')?.id || ''
    );
    setTxAccountId(finsaState.accounts[0]?.id || '');
    setTxToAccountId(finsaState.accounts[1]?.id || '');
    setTxPayee('');
    setTxNotes('');
    setTxError(null);
    setEditingTx(null);
    setIsAddTxModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = parseCurrencyToCents(txAmountStr, currency);
    if (amountCents <= 0) {
      setTxError('Please enter a valid positive amount.');
      soundEngine.playWarningTone();
      return;
    }
    if (!txAccountId) {
      setTxError('Please select a valid account.');
      soundEngine.playWarningTone();
      return;
    }
    if (txType === 'transfer' && (!txToAccountId || txToAccountId === txAccountId)) {
      setTxError('Transfers must be between two different accounts.');
      soundEngine.playWarningTone();
      return;
    }

    soundEngine.playSaveSuccess();

    if (editingTx) {
      // Revert previous transaction from accounts
      let updatedAccounts = [...finsaState.accounts];
      if (editingTx.type === 'income') {
        updatedAccounts = updatedAccounts.map((a) =>
          a.id === editingTx.accountId ? { ...a, balanceCents: a.balanceCents - editingTx.amountCents } : a
        );
      } else if (editingTx.type === 'expense') {
        updatedAccounts = updatedAccounts.map((a) =>
          a.id === editingTx.accountId ? { ...a, balanceCents: a.balanceCents + editingTx.amountCents } : a
        );
      } else if (editingTx.type === 'transfer') {
        updatedAccounts = updatedAccounts.map((a) => {
          if (a.id === editingTx.accountId) return { ...a, balanceCents: a.balanceCents + editingTx.amountCents };
          if (a.id === editingTx.toAccountId) return { ...a, balanceCents: a.balanceCents - editingTx.amountCents };
          return a;
        });
      }

      // Apply updated transaction
      if (txType === 'income') {
        updatedAccounts = updatedAccounts.map((a) =>
          a.id === txAccountId ? { ...a, balanceCents: a.balanceCents + amountCents } : a
        );
      } else if (txType === 'expense') {
        updatedAccounts = updatedAccounts.map((a) =>
          a.id === txAccountId ? { ...a, balanceCents: a.balanceCents - amountCents } : a
        );
      } else if (txType === 'transfer') {
        updatedAccounts = updatedAccounts.map((a) => {
          if (a.id === txAccountId) return { ...a, balanceCents: a.balanceCents - amountCents };
          if (a.id === txToAccountId) return { ...a, balanceCents: a.balanceCents + amountCents };
          return a;
        });
      }

      const updatedTxs = finsaState.transactions.map((t) =>
        t.id === editingTx.id
          ? {
              ...t,
              amountCents,
              type: txType,
              date: txDate,
              categoryId: txCategoryId,
              accountId: txAccountId,
              toAccountId: txType === 'transfer' ? txToAccountId : undefined,
              payeeOrPayer: txPayee.trim() || 'General Transaction',
              notes: txNotes.trim(),
            }
          : t
      );

      onUpdateFinsa({ transactions: updatedTxs, accounts: updatedAccounts });
    } else {
      // New transaction
      const newTx: FinsaTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: txDate,
        amountCents,
        type: txType,
        categoryId: txCategoryId,
        accountId: txAccountId,
        toAccountId: txType === 'transfer' ? txToAccountId : undefined,
        payeeOrPayer: txPayee.trim() || (txType === 'transfer' ? 'Account Transfer' : 'General Transaction'),
        notes: txNotes.trim(),
        createdAt: new Date().toISOString(),
      };

      // Update account balances
      const updatedAccounts = finsaState.accounts.map((a) => {
        if (txType === 'income' && a.id === txAccountId) {
          return { ...a, balanceCents: a.balanceCents + amountCents };
        }
        if (txType === 'expense' && a.id === txAccountId) {
          return { ...a, balanceCents: a.balanceCents - amountCents };
        }
        if (txType === 'transfer') {
          if (a.id === txAccountId) return { ...a, balanceCents: a.balanceCents - amountCents };
          if (a.id === txToAccountId) return { ...a, balanceCents: a.balanceCents + amountCents };
        }
        return a;
      });

      onUpdateFinsa({
        transactions: [newTx, ...finsaState.transactions],
        accounts: updatedAccounts,
      });
    }

    setIsAddTxModalOpen(false);
  };

  const handleDeleteTransaction = (id: string) => {
    soundEngine.playUiClick();
    const tx = finsaState.transactions.find((t) => t.id === id);
    if (!tx) return;

    // Rollback account balances
    const updatedAccounts = finsaState.accounts.map((a) => {
      if (tx.type === 'income' && a.id === tx.accountId) {
        return { ...a, balanceCents: a.balanceCents - tx.amountCents };
      }
      if (tx.type === 'expense' && a.id === tx.accountId) {
        return { ...a, balanceCents: a.balanceCents + tx.amountCents };
      }
      if (tx.type === 'transfer') {
        if (a.id === tx.accountId) return { ...a, balanceCents: a.balanceCents + tx.amountCents };
        if (a.id === tx.toAccountId) return { ...a, balanceCents: a.balanceCents - tx.amountCents };
      }
      return a;
    });

    onUpdateFinsa({
      transactions: finsaState.transactions.filter((t) => t.id !== id),
      accounts: updatedAccounts,
    });
  };

  const handleExportCSV = () => {
    soundEngine.playUiClick();
    const csvData = exportTransactionsToCSV(
      finsaState.transactions,
      finsaState.accounts,
      finsaState.categories
    );
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FINSA_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* 1. FINSA Studio Sunset Welcome Banner */}
      <div
        className="relative p-6 sm:p-7 rounded-3xl border border-amber-500/25 bg-gradient-to-r from-amber-950/40 via-slate-950/95 to-slate-900/90 backdrop-blur-xl shadow-2xl overflow-hidden"
        style={panelBgStyle}
      >
        {/* Warm Sunset Atmospheric Orbs & Light Spill */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/3 w-48 h-48 rounded-full bg-yellow-500/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono tracking-wider">
                SUNSET STUDIO EDITION
              </span>
              <span className="text-xs text-amber-200/70 font-mono">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>FINSA Studio</span>
                  <span className="text-amber-400 font-serif italic text-base sm:text-lg font-normal">
                    · {userName ? `Welcome back, ${userName}` : 'Personal Wealth Sanctuary'}
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Money River · Real Cash Allocation · Time Machine Projections
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 italic max-w-xl font-serif pt-1 text-amber-100/80">
              &ldquo;A budget is telling your money where to go instead of wondering where it went.&rdquo;
            </p>
          </div>

          {/* Global Quick Actions Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Privacy Toggle */}
            <button
              type="button"
              onClick={handleTogglePrivacy}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                privacyMode
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title={privacyMode ? 'Reveal Balances' : 'Mask Balances (Privacy Mode)'}
            >
              {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{privacyMode ? 'Masked' : 'Privacy'}</span>
            </button>

            {/* Currency Selector */}
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value as FinsaCurrency)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (CA$)</option>
              <option value="AUD">AUD (AU$)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="CHF">CHF</option>
            </select>

            {/* Transfer Button */}
            <button
              type="button"
              onClick={() => handleOpenAddTx('transfer')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Transfer</span>
            </button>

            {/* Add Transaction Button */}
            <button
              type="button"
              onClick={() => handleOpenAddTx('expense')}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Record Transaction</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80">
        {[
          { id: 'overview', label: 'Financial Overview', icon: PieChart },
          { id: 'daily_savings', label: 'Daily Savings Counter', icon: Coins },
          { id: 'spending', label: 'Spending & Outflow', icon: ArrowDownRight },
          { id: 'river', label: 'Money River', icon: Layers },
          { id: 'transactions', label: 'Ledger & Transactions', icon: FileSpreadsheet },
          { id: 'accounts', label: 'Accounts & Vaults', icon: Wallet },
          { id: 'budgets', label: 'Budgets & Bills', icon: Repeat },
          { id: 'savings', label: 'Savings Goals', icon: PiggyBank },
          { id: 'forecast', label: 'Time Machine & What-If', icon: Compass },
          { id: 'reports', label: 'Analytics & Reports', icon: Sparkles },
          { id: 'tools', label: 'Calculator & Tools', icon: Calculator },
          { id: 'settings', label: 'Settings & Privacy', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setActiveSubTab(tab.id as FinsaSubTab);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. SUBTAB CONTENT */}

      {/* SUBTAB: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Net Worth */}
            <div
              className="p-5 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl"
              style={panelBgStyle}
            >
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Calculated Net Worth</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2 tracking-tight">
                {formatCents(netWorthCents, currency, privacyMode)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Across {finsaState.accounts.filter((a) => !a.isArchived).length} tracked accounts
              </p>
            </div>

            {/* Income Inflow */}
            <div
              className="p-5 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl"
              style={panelBgStyle}
            >
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Inflow (Period)</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2 tracking-tight">
                {formatCents(cashFlow.incomeCents, currency, privacyMode)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">From salary & other income sources</p>
            </div>

            {/* Outflow */}
            <div
              className="p-5 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl"
              style={panelBgStyle}
            >
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Outflow (Period)</span>
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-2 tracking-tight">
                {formatCents(cashFlow.expensesCents, currency, privacyMode)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Excludes intra-account transfers
              </p>
            </div>

            {/* Net Savings & Rate */}
            <div
              className="p-5 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl"
              style={panelBgStyle}
            >
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Net Cash Flow</span>
                <PiggyBank className="w-4 h-4 text-indigo-400" />
              </div>
              <div
                className={`text-2xl font-black mt-2 tracking-tight ${
                  cashFlow.netFlowCents >= 0 ? 'text-indigo-400' : 'text-rose-400'
                }`}
              >
                {formatCents(cashFlow.netFlowCents, currency, privacyMode)}
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-slate-400">Savings Rate:</span>
                <span className="font-bold text-indigo-300 font-mono">
                  {cashFlow.savingsRatePercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Sunset Daily Savings Flip Counter Highlight Banner */}
          <div
            className="p-5 sm:p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-950/80 to-slate-900/90 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={panelBgStyle}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
                <Coins className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Daily Savings Vault
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400 fill-current" />
                    <span>{dailySavingsStats.streakDays} Day Streak</span>
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                  {formatCents(dailySavingsStats.totalCents, currency, privacyMode)}
                </div>
                <p className="text-[11px] text-slate-400">
                  {dailySavingsStats.todayCents > 0
                    ? `✓ ${formatCents(dailySavingsStats.todayCents, currency, privacyMode)} added today`
                    : 'Drop small amounts daily to spin your mechanical odometer counter'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setActiveSubTab('daily_savings');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-black shadow-lg cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <span>Launch Flip Counter</span>
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Middle Row: Money River Teaser + Quick Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Money River Glance */}
            <div
              className="lg:col-span-2 p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl space-y-4"
              style={panelBgStyle}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Money River Flow Overview</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Visual cash allocation from income streams into expenses & savings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('river')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  Explore Interactive River →
                </button>
              </div>

              {/* Visual Flow Stream Bars */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-400">
                      Inflow ({formatCents(riverData.totalInflowCents, currency, privacyMode)})
                    </span>
                    <span className="text-slate-400">100% Inflow</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-rose-400">
                      Expense Outflow ({formatCents(riverData.totalOutflowCents, currency, privacyMode)})
                    </span>
                    <span className="text-slate-400">
                      {riverData.totalInflowCents > 0
                        ? Math.round((riverData.totalOutflowCents / riverData.totalInflowCents) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                      style={{
                        width: `${
                          riverData.totalInflowCents > 0
                            ? Math.min(100, (riverData.totalOutflowCents / riverData.totalInflowCents) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-indigo-400">
                      Net Retained Surplus ({formatCents(riverData.netRetainedCents, currency, privacyMode)})
                    </span>
                    <span className="text-slate-400">
                      {riverData.totalInflowCents > 0
                        ? Math.max(0, Math.round((riverData.netRetainedCents / riverData.totalInflowCents) * 100))
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                      style={{
                        width: `${
                          riverData.totalInflowCents > 0
                            ? Math.max(0, Math.min(100, (riverData.netRetainedCents / riverData.totalInflowCents) * 100))
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions List */}
            <div
              className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl space-y-4"
              style={panelBgStyle}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Recent Activity</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('transactions')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  View All ({finsaState.transactions.length})
                </button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-none">
                {finsaState.transactions.slice(0, 5).map((tx) => {
                  const cat = finsaState.categories.find((c) => c.id === tx.categoryId);
                  const isInc = tx.type === 'income';
                  const isTrf = tx.type === 'transfer';
                  return (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                          {cat?.icon || (isTrf ? '🔄' : isInc ? '💼' : '🛒')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-200 truncate">{tx.payeeOrPayer}</p>
                          <p className="text-[10px] text-slate-400">{tx.date}</p>
                        </div>
                      </div>
                      <div
                        className={`font-mono font-bold shrink-0 ${
                          isInc ? 'text-emerald-400' : isTrf ? 'text-indigo-300' : 'text-rose-400'
                        }`}
                      >
                        {isInc ? '+' : isTrf ? '↔ ' : '-'}
                        {formatCents(tx.amountCents, currency, privacyMode)}
                      </div>
                    </div>
                  );
                })}

                {finsaState.transactions.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    No transactions recorded yet. Click &quot;Record Transaction&quot; to begin.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: DEDICATED DAILY SAVINGS FLIP COUNTER */}
      {activeSubTab === 'daily_savings' && (
        <DailySavingsFlipCounter
          finsaState={finsaState}
          onUpdateFinsa={onUpdateFinsa}
          panelBgStyle={panelBgStyle}
        />
      )}

      {/* SUBTAB: DEDICATED SPENDING & OUTFLOW STUDIO */}
      {activeSubTab === 'spending' && (
        <SpendingStudioView
          finsaState={finsaState}
          onUpdateFinsa={onUpdateFinsa}
          panelBgStyle={panelBgStyle}
        />
      )}

      {/* SUBTAB: MONEY RIVER */}
      {activeSubTab === 'river' && (
        <div
          className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl space-y-6"
          style={panelBgStyle}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Money River — Capital Flow Visualization</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic visual representation of capital cascading from sources to allocations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Timeframe:</span>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}
                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="month">This Month</option>
                <option value="quarter">Last 90 Days</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {/* Interactive River Tributaries Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Inflow Tributaries */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4" />
                <span>Inflow Sources ({riverData.inflowSources.length})</span>
              </h3>
              <div className="space-y-2">
                {riverData.inflowSources.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedRiverNodeId(node.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedRiverNodeId === node.id
                        ? 'border-emerald-500 bg-emerald-950/30'
                        : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{node.icon}</span>
                        <span className="font-semibold text-white">{node.name}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatCents(node.amountCents, currency, privacyMode)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${node.percent}%` }}
                      />
                    </div>
                  </div>
                ))}

                {riverData.inflowSources.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    No income sources recorded in this period.
                  </div>
                )}
              </div>
            </div>

            {/* Center Column: The River Hub */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-inner">
                🌊
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">The Central Current</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  All income combines here before streaming into essential expenses, goals, and savings reserves.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 w-full text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Gross River Volume:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatCents(riverData.totalInflowCents, currency, privacyMode)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Outflow Allocations:</span>
                  <span className="text-rose-400 font-mono font-bold">
                    {formatCents(riverData.totalOutflowCents, currency, privacyMode)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                  <span className="text-slate-300">Net Retained Stream:</span>
                  <span className="text-indigo-400 font-mono">
                    {formatCents(riverData.netRetainedCents, currency, privacyMode)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Outflow Allocations */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4" />
                <span>Outflow Streams ({riverData.expenseAllocations.length})</span>
              </h3>
              <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-none">
                {riverData.expenseAllocations.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedRiverNodeId(node.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedRiverNodeId === node.id
                        ? 'border-rose-500 bg-rose-950/30'
                        : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{node.icon}</span>
                        <span className="font-semibold text-white">{node.name}</span>
                      </div>
                      <span className="font-mono font-bold text-rose-400">
                        {formatCents(node.amountCents, currency, privacyMode)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
                      <div
                        className="h-full bg-rose-400 rounded-full"
                        style={{ width: `${node.percent}%` }}
                      />
                    </div>
                  </div>
                ))}

                {riverData.expenseAllocations.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    No expense outflows recorded in this period.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: TRANSACTIONS & LEDGER */}
      {activeSubTab === 'transactions' && (
        <div
          className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl space-y-4"
          style={panelBgStyle}
        >
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Financial Ledger ({filteredTransactions.length} records)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete transactional audit trail with integer-precision accounting.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddTx('expense')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Record</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search payees, notes, categories..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="income">Income (+)</option>
              <option value="expense">Expenses (-)</option>
              <option value="transfer">Transfers (↔)</option>
            </select>

            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs cursor-pointer"
            >
              <option value="all">All Accounts</option>
              {finsaState.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Payee / Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Account</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((tx) => {
                  const cat = finsaState.categories.find((c) => c.id === tx.categoryId);
                  const acc = finsaState.accounts.find((a) => a.id === tx.accountId);
                  const toAcc = finsaState.accounts.find((a) => a.id === tx.toAccountId);
                  const isInc = tx.type === 'income';
                  const isTrf = tx.type === 'transfer';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{tx.date}</td>
                      <td className="p-3 font-medium text-white">
                        <div>{tx.payeeOrPayer}</div>
                        {tx.notes && <div className="text-[10px] text-slate-400">{tx.notes}</div>}
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1 w-fit"
                          style={{
                            backgroundColor: `${cat?.color || '#6366f1'}15`,
                            color: cat?.color || '#a5b4fc',
                            borderColor: `${cat?.color || '#6366f1'}30`,
                          }}
                        >
                          <span>{cat?.icon || '📦'}</span>
                          <span>{cat?.name || 'General'}</span>
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {isTrf ? (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <span>{acc?.name}</span>
                            <span>→</span>
                            <span className="text-indigo-400">{toAcc?.name}</span>
                          </span>
                        ) : (
                          <span>{acc?.name || 'Primary'}</span>
                        )}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
                          isInc ? 'text-emerald-400' : isTrf ? 'text-indigo-300' : 'text-rose-400'
                        }`}
                      >
                        {isInc ? '+' : isTrf ? '↔ ' : '-'}
                        {formatCents(tx.amountCents, currency, privacyMode)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      No transactions match your search or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB: ACCOUNTS & VAULTS */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                <span>Tracked Accounts & Cash Vaults</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage personal accounts, cash reserves, credit cards, and investments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddAccountModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finsaState.accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-xl space-y-3"
                style={panelBgStyle}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">
                      {acc.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{acc.name}</h3>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">{acc.type}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      acc.isIncludedInNetWorth
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {acc.isIncludedInNetWorth ? 'In Net Worth' : 'Excluded'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400">Current Balance</span>
                  <div className="text-xl font-black text-white font-mono mt-0.5">
                    {formatCents(acc.balanceCents, currency, privacyMode)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB: FORECAST & WHAT-IF */}
      {activeSubTab === 'forecast' && (
        <div className="space-y-6">
          {/* Time Machine Projections */}
          <div
            className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl space-y-4"
            style={panelBgStyle}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-400" />
                  <span>Financial Time Machine — Balance Forecasting</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Algorithmic forward balance projection based on scheduled recurring income, bills, and savings.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
                180-Day Outlook
              </span>
            </div>

            {/* Forecast Projection Points */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
              {forecastPoints.map((pt) => (
                <div
                  key={pt.label}
                  className={`p-3 rounded-2xl border text-center space-y-1 ${
                    pt.label === 'Today'
                      ? 'border-indigo-500 bg-indigo-950/30'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-mono block">{pt.label}</span>
                  <div className="text-xs font-bold text-white font-mono">
                    {formatCents(pt.projectedNetWorthCents, currency, privacyMode)}
                  </div>
                  <span className="text-[9px] text-slate-500 block">{pt.dateStr}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What-If Studio Sandbox */}
          <div
            className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl space-y-5"
            style={panelBgStyle}
          >
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>What-If Studio — Decision Sandbox</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate financial adjustments and preview their compound impact on your 12-month net worth.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Monthly Savings Adjustment: {formatCents(sandboxMonthlySavings, currency)}/mo
                  </label>
                  <input
                    type="range"
                    min="-50000"
                    max="100000"
                    step="2500"
                    value={sandboxMonthlySavings}
                    onChange={(e) => setSandboxMonthlySavings(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>-$500/mo</span>
                    <span>$0</span>
                    <span>+$1,000/mo</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Hypothetical One-Time Purchase: {formatCents(sandboxOneTimeExpense, currency)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="500000"
                    step="5000"
                    value={sandboxOneTimeExpense}
                    onChange={(e) => setSandboxOneTimeExpense(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>$0</span>
                    <span>$2,500</span>
                    <span>$5,000</span>
                  </div>
                </div>
              </div>

              {/* Scenario Results Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                  Simulated 12-Month Impact
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Net Worth Delta:</span>
                    <span
                      className={`font-mono font-bold ${
                        scenarioResult.netImpactCents >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {scenarioResult.netImpactCents >= 0 ? '+' : ''}
                      {formatCents(scenarioResult.netImpactCents, currency, privacyMode)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Projected 1-Year Balance:</span>
                    <span className="font-mono font-bold text-white">
                      {formatCents(scenarioResult.scenarioNetWorthCents, currency, privacyMode)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* SUBTAB: ANALYTICS & REPORTS */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <div
            className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl space-y-6"
            style={panelBgStyle}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Financial Analytics & Smart Insights</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Algorithmic spending pattern breakdown and automated fiscal health signals.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Timeframe:</span>
                {(['month', 'quarter', 'year', 'all'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize cursor-pointer transition-colors ${
                      timeframe === tf
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Shield className="w-4 h-4" />
                  <span>Emergency Runway</span>
                </div>
                <div className="text-xl font-black text-white">
                  {cashFlow.expensesCents > 0
                    ? `${(netWorthCents / cashFlow.expensesCents).toFixed(1)} Months`
                    : 'Indefinite (No Expenses)'}
                </div>
                <p className="text-[11px] text-slate-400">
                  Calculated based on current liquid net worth vs monthly burn rate.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Savings Velocity</span>
                </div>
                <div className="text-xl font-black text-emerald-400">
                  {cashFlow.savingsRatePercent}%
                </div>
                <p className="text-[11px] text-slate-400">
                  {cashFlow.savingsRatePercent >= 20
                    ? 'Excellent! Well above the recommended 20% benchmark.'
                    : 'Target at least 20% monthly savings for compound freedom.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                  <PieChart className="w-4 h-4" />
                  <span>Top Expense Category</span>
                </div>
                <div className="text-xl font-black text-white truncate">
                  {categoryBreakdown.length > 0 ? categoryBreakdown[0].categoryName : 'None'}
                </div>
                <p className="text-[11px] text-slate-400">
                  {categoryBreakdown.length > 0
                    ? `${categoryBreakdown[0].percentage}% of total outflows (${formatCents(
                        categoryBreakdown[0].totalCents,
                        currency,
                        privacyMode
                      )})`
                    : 'No expense records found for this period.'}
                </p>
              </div>
            </div>

            {/* Category Outflows Table */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Category Expense Distribution
              </h3>
              {categoryBreakdown.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-slate-400 text-xs">
                  <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <span>No expense data recorded in this period.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {categoryBreakdown.map((cat) => (
                    <div
                      key={cat.categoryId}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <span className="text-lg">{cat.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-white">{cat.categoryName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {cat.percentage}% of expenses
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 max-w-md hidden sm:block">
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: cat.color || '#f59e0b',
                            }}
                          />
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-white">
                          {formatCents(cat.totalCents, currency, privacyMode)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: CALCULATOR & TOOLS */}
      {activeSubTab === 'tools' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Currency Converter */}
            <div
              className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl space-y-4"
              style={panelBgStyle}
            >
              <div className="pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Currency Converter</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time multi-currency exchange conversion with Indian Rupee (INR) reference.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Amount ({CURRENCY_SYMBOLS[calcFromCurrency]})
                  </label>
                  <input
                    type="number"
                    value={calcAmountStr}
                    onChange={(e) => setCalcAmountStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">From</label>
                    <select
                      value={calcFromCurrency}
                      onChange={(e) => setCalcFromCurrency(e.target.value as FinsaCurrency)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none"
                    >
                      <option value="INR">INR (₹ Indian Rupee)</option>
                      <option value="USD">USD ($ US Dollar)</option>
                      <option value="EUR">EUR (€ Euro)</option>
                      <option value="GBP">GBP (£ British Pound)</option>
                      <option value="CAD">CAD (CA$ Canadian Dollar)</option>
                      <option value="AUD">AUD (AU$ Australian Dollar)</option>
                      <option value="JPY">JPY (¥ Japanese Yen)</option>
                      <option value="CHF">CHF (Swiss Franc)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">To</label>
                    <select
                      value={calcToCurrency}
                      onChange={(e) => setCalcToCurrency(e.target.value as FinsaCurrency)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none"
                    >
                      <option value="USD">USD ($ US Dollar)</option>
                      <option value="INR">INR (₹ Indian Rupee)</option>
                      <option value="EUR">EUR (€ Euro)</option>
                      <option value="GBP">GBP (£ British Pound)</option>
                      <option value="CAD">CAD (CA$ Canadian Dollar)</option>
                      <option value="AUD">AUD (AU$ Australian Dollar)</option>
                      <option value="JPY">JPY (¥ Japanese Yen)</option>
                      <option value="CHF">CHF (Swiss Franc)</option>
                    </select>
                  </div>
                </div>

                {/* Conversion Result Display */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
                  <span className="text-[11px] font-mono text-amber-300/80 uppercase tracking-wider">
                    Converted Result
                  </span>
                  <div className="text-2xl font-black text-amber-300 font-mono">
                    {formatCents(calcConvertedAmount, calcToCurrency)}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Notes Scratchpad */}
            <div
              className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl flex flex-col justify-between space-y-4"
              style={panelBgStyle}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Financial Notes & Fiscal Scratchpad</span>
                  </h3>
                  {notesSavedToast && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      Saved ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2 mb-3">
                  Private offline memo for tax planning, savings rules, upcoming purchases, and wealth guidelines.
                </p>
                <textarea
                  value={notesDraft}
                  onChange={(e) => {
                    setNotesDraft(e.target.value);
                    localStorage.setItem('habitra_finsa_scratchpad', e.target.value);
                  }}
                  rows={7}
                  placeholder="Type financial notes, milestones, reminders..."
                  className="w-full p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('habitra_finsa_scratchpad', notesDraft);
                    setNotesSavedToast(true);
                    window.setTimeout(() => setNotesSavedToast(false), 2000);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer transition-colors"
                >
                  Save Scratchpad
                </button>
              </div>
            </div>
          </div>

          {/* Compound Interest Wealth Accumulator Simulator */}
          <div
            className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl space-y-6"
            style={panelBgStyle}
          >
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>Compound Interest Wealth Accumulator</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculate the exponential growth of initial investments and monthly disciplined contributions over time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Initial Principal ({CURRENCY_SYMBOLS[currency]})
                </label>
                <input
                  type="text"
                  value={ciPrincipalStr}
                  onChange={(e) => setCiPrincipalStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Monthly Contribution ({CURRENCY_SYMBOLS[currency]})
                </label>
                <input
                  type="text"
                  value={ciMonthlyStr}
                  onChange={(e) => setCiMonthlyStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Estimated Annual Return (%)
                </label>
                <input
                  type="number"
                  value={ciRateStr}
                  onChange={(e) => setCiRateStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Time Horizon (Years)
                </label>
                <select
                  value={ciYears}
                  onChange={(e) => setCiYears(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none"
                >
                  <option value={1}>1 Year</option>
                  <option value={3}>3 Years</option>
                  <option value={5}>5 Years</option>
                  <option value={10}>10 Years</option>
                  <option value={15}>15 Years</option>
                  <option value={20}>20 Years</option>
                </select>
              </div>
            </div>

            {/* Growth Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Timeline</th>
                    <th className="py-2.5 px-3">Total Invested</th>
                    <th className="py-2.5 px-3">Compound Interest Earned</th>
                    <th className="py-2.5 px-3 text-right">Projected Total Wealth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {compoundInterestRows.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 text-slate-300 font-sans font-bold">
                        {row.year === 0 ? 'Start (Year 0)' : `Year ${row.year}`}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {formatCents(row.totalContributionsCents, currency, privacyMode)}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">
                        +{formatCents(row.interestEarnedCents, currency, privacyMode)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-300">
                        {formatCents(row.futureValueCents, currency, privacyMode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: SETTINGS & DATA PRIVACY */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          <div
            className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl space-y-6"
            style={panelBgStyle}
          >
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>FINSA Studio Preferences & Data Management</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Control privacy masking, default currency, backup exports, and demo data datasets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preferences */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Display & Currency
                </h3>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Default Ledger Currency</div>
                      <div className="text-[11px] text-slate-400">Currency used across balances and charts</div>
                    </div>
                    <select
                      value={currency}
                      onChange={(e) => handleCurrencyChange(e.target.value as FinsaCurrency)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD (CA$)</option>
                      <option value="AUD">AUD (AU$)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CHF">CHF</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-white">Balance Masking (Privacy Mode)</div>
                      <div className="text-[11px] text-slate-400">Censors amounts with •••••• in public</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleTogglePrivacy}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        privacyMode
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {privacyMode ? 'Masking Active' : 'Revealed'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Data & Datasets */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Sample Data & Clean Slate
                </h3>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Sample Dataset</div>
                      <div className="text-[11px] text-slate-400">Load sample realistic transactions & accounts</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        const sample = getFinsaSampleDataset(currency);
                        onUpdateFinsa({
                          accounts: sample.accounts,
                          transactions: sample.transactions,
                          savingsGoals: sample.savingsGoals,
                          recurringItems: sample.recurringItems,
                          demoMode: true,
                        });
                        alert('Sample dataset loaded! You can reset to a clean slate anytime.');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 cursor-pointer transition-colors"
                    >
                      Load Sample Data
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-rose-300">Clean Slate (Zero Fake Data)</div>
                      <div className="text-[11px] text-slate-400">Reset accounts to 0 and clear transactions</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        if (confirm('Reset to clean slate? This will clear all transactions and reset account balances to 0.')) {
                          onUpdateFinsa({
                            transactions: [],
                            accounts: finsaState.accounts.map((a) => ({ ...a, balanceCents: 0 })),
                            demoMode: false,
                          });
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 cursor-pointer transition-colors"
                    >
                      Reset to Clean Slate
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isAddTxModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsAddTxModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">
                {editingTx ? 'Edit Transaction' : 'Record Transaction'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddTxModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {txError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {txError}
                </div>
              )}

              {/* Type selector */}
              <div className="grid grid-cols-3 gap-2">
                {(['expense', 'income', 'transfer'] as FinsaTransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTxType(t)}
                    className={`py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer ${
                      txType === t
                        ? t === 'income'
                          ? 'bg-emerald-600 text-white'
                          : t === 'expense'
                          ? 'bg-rose-600 text-white'
                          : 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Amount ({CURRENCY_SYMBOLS[currency] || '$'}) *
                  </label>
                  <input
                    type="text"
                    value={txAmountStr}
                    onChange={(e) => setTxAmountStr(e.target.value)}
                    placeholder="e.g. 45.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Payee */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payee / Description *
                </label>
                <input
                  type="text"
                  value={txPayee}
                  onChange={(e) => setTxPayee(e.target.value)}
                  placeholder="e.g. Trader Joe's, Monthly Salary, Rent"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Account selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {txType === 'transfer' ? 'From Account' : 'Account'} *
                  </label>
                  <select
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    required
                  >
                    {finsaState.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCents(a.balanceCents, currency, privacyMode)})
                      </option>
                    ))}
                  </select>
                </div>

                {txType === 'transfer' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      To Account *
                    </label>
                    <select
                      value={txToAccountId}
                      onChange={(e) => setTxToAccountId(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                      required
                    >
                      {finsaState.accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                    <select
                      value={txCategoryId}
                      onChange={(e) => setTxCategoryId(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    >
                      {finsaState.categories
                        .filter((c) => c.type === txType)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.icon} {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="Optional context or memo"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTxModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
