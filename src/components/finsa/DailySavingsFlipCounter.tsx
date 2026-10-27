import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Coins,
  Plus,
  Flame,
  Calendar,
  Clock,
  Target,
  Sparkles,
  TrendingUp,
  Search,
  Filter,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Eye,
  EyeOff,
  Palette,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import {
  CounterTheme,
  FinsaAccount,
  FinsaDailySavingsRecord,
  FinsaSavingsGoal,
  FinsaState,
  FinsaTransaction,
} from '../../types/finsa';
import {
  calculateDailySavingsStats,
  formatCents,
  formatCompactCurrency,
  formatCounterReelParts,
  parseCurrencyToCents,
  CURRENCY_SYMBOLS,
} from '../../services/finsaEngine';
import { soundEngine } from '../../audio/soundEngine';
import { MechanicalVaultHopper } from './MechanicalVaultHopper';
import { formatLocalYMD } from '../../constants/scenesAndPresets';

interface DailySavingsFlipCounterProps {
  finsaState: FinsaState;
  onUpdateFinsa: (patch: Partial<FinsaState>) => void;
  panelBgStyle?: React.CSSProperties;
}

/**
 * Visual styling configurations for the 6 mechanical counter themes
 */
const COUNTER_THEME_STYLES: Record<
  CounterTheme,
  {
    name: string;
    description: string;
    housingBg: string;
    housingBorder: string;
    cardBg: string;
    cardBorder: string;
    digitColor: string;
    hingeColor: string;
    glowShadow: string;
    badgeStyle: string;
    accentGlow: string;
  }
> = {
  vault: {
    name: 'Mechanical Vault',
    description: 'Physical rolling drums with brushed bronze bevels, industrial carbon depth, and mechanical feel',
    housingBg: 'bg-gradient-to-b from-[#24211e] via-[#141210] to-[#24211e]',
    housingBorder: 'border-amber-600/50 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(251,191,36,0.2)]',
    cardBg: 'bg-gradient-to-b from-[#2d2926] via-[#1a1715] to-[#0f0e0d]',
    cardBorder: 'border-amber-700/40 shadow-[inset_0_3px_6px_rgba(0,0,0,0.8)]',
    digitColor: 'text-amber-300 font-mono font-black drop-shadow-[0_2px_10px_rgba(217,119,6,0.5)]',
    hingeColor: 'bg-black/90 border-t border-b border-amber-600/40',
    glowShadow: 'rgba(217, 119, 6, 0.4)',
    badgeStyle: 'bg-amber-600/20 text-amber-300 border-amber-600/40',
    accentGlow: 'from-amber-600/20 to-orange-600/10',
  },
  liquid_gold: {
    name: 'Liquid Gold',
    description: 'Digits emerge through a flowing metallic 24k gold highlight on deep obsidian',
    housingBg: 'bg-gradient-to-b from-[#1a1610] via-[#0d0a06] to-[#1a1610]',
    housingBorder: 'border-yellow-500/50 shadow-[0_0_55px_-8px_rgba(234,179,8,0.35)]',
    cardBg: 'bg-gradient-to-b from-[#2a2215] via-[#16120a] to-[#0a0805]',
    cardBorder: 'border-yellow-500/40 shadow-[inset_0_2px_6px_rgba(253,224,71,0.2)]',
    digitColor: 'text-yellow-400 font-mono font-black drop-shadow-[0_2px_12px_rgba(234,179,8,0.6)]',
    hingeColor: 'bg-black/85 border-t border-b border-yellow-500/35',
    glowShadow: 'rgba(234, 179, 8, 0.45)',
    badgeStyle: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    accentGlow: 'from-yellow-500/20 to-amber-600/10',
  },
  digital_pulse: {
    name: 'Digital Pulse',
    description: 'Subtle light trails, electric cyan-emerald pulse, and crisp cybernetic transitions',
    housingBg: 'bg-gradient-to-b from-[#09151e] via-[#04090f] to-[#09151e]',
    housingBorder: 'border-cyan-500/45 shadow-[0_0_50px_-10px_rgba(6,182,212,0.35)]',
    cardBg: 'bg-gradient-to-b from-[#0e2230] via-[#06121b] to-[#02070c]',
    cardBorder: 'border-cyan-400/35 shadow-[inset_0_2px_6px_rgba(34,211,238,0.2)]',
    digitColor: 'text-cyan-300 font-mono font-black drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]',
    hingeColor: 'bg-black/90 border-t border-b border-cyan-400/40',
    glowShadow: 'rgba(6, 182, 212, 0.4)',
    badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    accentGlow: 'from-cyan-500/20 to-teal-500/10',
  },
  minimal: {
    name: 'Precision Minimal',
    description: 'Crisp swiss typography with surgical monochrome contrast and restrained micro-movement',
    housingBg: 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900',
    housingBorder: 'border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.7)]',
    cardBg: 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950',
    cardBorder: 'border-slate-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.06)]',
    digitColor: 'text-slate-100 font-mono font-black drop-shadow-[0_1px_4px_rgba(255,255,255,0.2)]',
    hingeColor: 'bg-black/90 border-t border-b border-slate-700/50',
    glowShadow: 'rgba(255, 255, 255, 0.12)',
    badgeStyle: 'bg-slate-800 text-slate-300 border-slate-700',
    accentGlow: 'from-slate-700/20 to-slate-900/10',
  },
  aurora: {
    name: 'Aurora Flow',
    description: 'Flowing northern-lights emerald and violet luminescence across frosted acrylic panels',
    housingBg: 'bg-gradient-to-b from-emerald-950/40 via-slate-950/90 to-teal-950/40 backdrop-blur-2xl',
    housingBorder: 'border-emerald-500/40 shadow-[0_0_55px_-10px_rgba(16,185,129,0.35)]',
    cardBg: 'bg-gradient-to-b from-emerald-900/35 via-slate-900/70 to-slate-950/90',
    cardBorder: 'border-emerald-500/35 shadow-[inset_0_2px_6px_rgba(16,185,129,0.25)]',
    digitColor: 'text-emerald-300 font-mono font-black drop-shadow-[0_2px_12px_rgba(16,185,129,0.6)]',
    hingeColor: 'bg-emerald-950/90 border-t border-b border-emerald-500/40',
    glowShadow: 'rgba(16, 185, 129, 0.45)',
    badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accentGlow: 'from-emerald-500/20 to-teal-500/10',
  },
  odometer: {
    name: 'Classic Odometer',
    description: 'Traditional mechanical rolling odometer wheels with cylindrical curvature shading',
    housingBg: 'bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900',
    housingBorder: 'border-stone-700 shadow-[0_16px_45px_rgba(0,0,0,0.85)]',
    cardBg: 'bg-gradient-to-b from-stone-800 via-stone-900 to-black',
    cardBorder: 'border-stone-700/90 shadow-[inset_0_4px_8px_rgba(0,0,0,0.85)]',
    digitColor: 'text-stone-100 font-mono font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
    hingeColor: 'bg-black border-t border-b border-stone-600',
    glowShadow: 'rgba(214, 211, 209, 0.25)',
    badgeStyle: 'bg-stone-800 text-stone-300 border-stone-600',
    accentGlow: 'from-stone-600/20 to-stone-900/10',
  },
  // Backwards compatibility aliases
  gold: {
    name: 'Liquid Gold',
    description: 'Digits emerge through a flowing metallic 24k gold highlight on deep obsidian',
    housingBg: 'bg-gradient-to-b from-[#1a1610] via-[#0d0a06] to-[#1a1610]',
    housingBorder: 'border-yellow-500/50 shadow-[0_0_55px_-8px_rgba(234,179,8,0.35)]',
    cardBg: 'bg-gradient-to-b from-[#2a2215] via-[#16120a] to-[#0a0805]',
    cardBorder: 'border-yellow-500/40 shadow-[inset_0_2px_6px_rgba(253,224,71,0.2)]',
    digitColor: 'text-yellow-400 font-mono font-black drop-shadow-[0_2px_12px_rgba(234,179,8,0.6)]',
    hingeColor: 'bg-black/85 border-t border-b border-yellow-500/35',
    glowShadow: 'rgba(234, 179, 8, 0.45)',
    badgeStyle: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    accentGlow: 'from-yellow-500/20 to-amber-600/10',
  },
  glass: {
    name: 'Aurora Flow',
    description: 'Flowing northern-lights emerald and violet luminescence across frosted acrylic panels',
    housingBg: 'bg-gradient-to-b from-emerald-950/40 via-slate-950/90 to-teal-950/40 backdrop-blur-2xl',
    housingBorder: 'border-emerald-500/40 shadow-[0_0_55px_-10px_rgba(16,185,129,0.35)]',
    cardBg: 'bg-gradient-to-b from-emerald-900/35 via-slate-900/70 to-slate-950/90',
    cardBorder: 'border-emerald-500/35 shadow-[inset_0_2px_6px_rgba(16,185,129,0.25)]',
    digitColor: 'text-emerald-300 font-mono font-black drop-shadow-[0_2px_12px_rgba(16,185,129,0.6)]',
    hingeColor: 'bg-emerald-950/90 border-t border-b border-emerald-500/40',
    glowShadow: 'rgba(16, 185, 129, 0.45)',
    badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accentGlow: 'from-emerald-500/20 to-teal-500/10',
  },
  mechanical: {
    name: 'Mechanical Vault',
    description: 'Physical rolling drums with brushed bronze bevels, industrial carbon depth, and mechanical feel',
    housingBg: 'bg-gradient-to-b from-[#24211e] via-[#141210] to-[#24211e]',
    housingBorder: 'border-amber-600/50 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(251,191,36,0.2)]',
    cardBg: 'bg-gradient-to-b from-[#2d2926] via-[#1a1715] to-[#0f0e0d]',
    cardBorder: 'border-amber-700/40 shadow-[inset_0_3px_6px_rgba(0,0,0,0.8)]',
    digitColor: 'text-amber-300 font-mono font-black drop-shadow-[0_2px_10px_rgba(217,119,6,0.5)]',
    hingeColor: 'bg-black/90 border-t border-b border-amber-600/40',
    glowShadow: 'rgba(217, 119, 6, 0.4)',
    badgeStyle: 'bg-amber-600/20 text-amber-300 border-amber-600/40',
    accentGlow: 'from-amber-600/20 to-orange-600/10',
  },
  light: {
    name: 'Clean Light',
    description: 'Pristine porcelain surface with deep sapphire digits',
    housingBg: 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-100',
    housingBorder: 'border-slate-300 shadow-[0_12px_36px_rgba(0,0,0,0.12)]',
    cardBg: 'bg-gradient-to-b from-white via-slate-50 to-slate-200',
    cardBorder: 'border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]',
    digitColor: 'text-slate-900 font-mono font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]',
    hingeColor: 'bg-slate-300 border-t border-b border-slate-400',
    glowShadow: 'rgba(15, 23, 42, 0.1)',
    badgeStyle: 'bg-slate-200 text-slate-800 border-slate-300',
    accentGlow: 'from-slate-200/50 to-slate-300/20',
  },
  neon: {
    name: 'Digital Pulse',
    description: 'Subtle light trails, electric cyan-emerald pulse, and crisp cybernetic transitions',
    housingBg: 'bg-gradient-to-b from-[#09151e] via-[#04090f] to-[#09151e]',
    housingBorder: 'border-cyan-500/45 shadow-[0_0_50px_-10px_rgba(6,182,212,0.35)]',
    cardBg: 'bg-gradient-to-b from-[#0e2230] via-[#06121b] to-[#02070c]',
    cardBorder: 'border-cyan-400/35 shadow-[inset_0_2px_6px_rgba(34,211,238,0.2)]',
    digitColor: 'text-cyan-300 font-mono font-black drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]',
    hingeColor: 'bg-black/90 border-t border-b border-cyan-400/40',
    glowShadow: 'rgba(6, 182, 212, 0.4)',
    badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    accentGlow: 'from-cyan-500/20 to-teal-500/10',
  },
};


/**
 * Quick contribution presets (in Major units: ₹10, ₹50, etc.)
 */
const QUICK_AMOUNT_PRESETS = [10, 50, 100, 200, 500, 1000];

/**
 * Standard categorized savings tags
 */
const SAVINGS_CATEGORIES = [
  'Pocket Change',
  'Dining Out Skipped',
  'Impulse Purchase Avoided',
  'Coffee / Snack Skipped',
  'Side Hustle Bonus',
  'Cashback / Discount',
  'Daily Challenge (₹100)',
  'General Daily Vault',
];

export const DailySavingsFlipCounter: React.FC<DailySavingsFlipCounterProps> = ({
  finsaState,
  onUpdateFinsa,
  panelBgStyle,
}) => {
  const currency = finsaState.currency || 'INR';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || '₹';
  const privacyMode = Boolean(finsaState.privacyMode);
  const activeTheme = finsaState.counterTheme || 'gold';
  const reducedMotion = Boolean(finsaState.counterReducedMotion);

  // Time filter for savings history timeline
  const [timelinePeriod, setTimelinePeriod] = useState<'7d' | '30d' | '3m' | '1y'>('30d');

  // Modal form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinsaDailySavingsRecord | null>(null);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  // Form input fields
  const [amountInput, setAmountInput] = useState('100');
  const [dateInput, setDateInput] = useState(() => formatLocalYMD(new Date()));
  const [categoryInput, setCategoryInput] = useState(SAVINGS_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [goalIdInput, setGoalIdInput] = useState<string>('');
  const [fundingAccountId, setFundingAccountId] = useState<string>('');
  const [destinationVaultId, setDestinationVaultId] = useState<string>('');
  const [isBankTransfer, setIsBankTransfer] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Search & filter in history list
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('all');

  const records = useMemo(() => {
    return finsaState.dailySavings || [];
  }, [finsaState.dailySavings]);

  const stats = useMemo(() => {
    return calculateDailySavingsStats(records, timelinePeriod);
  }, [records, timelinePeriod]);

  // Structured breakdown of complete currency value with Indian numbering and decimal handling
  const reelParts = useMemo(() => {
    return formatCounterReelParts(stats.totalCents, currency, privacyMode);
  }, [stats.totalCents, currency, privacyMode]);

  // Total tokens in reel for responsive tile scaling
  const totalReelCount = useMemo(() => {
    return (
      reelParts.integerChars.length +
      (reelParts.hasDecimals ? 1 + reelParts.decimalChars.length : 0) +
      1
    );
  }, [reelParts]);

  // Sizing tiers to guarantee fit across all device widths without horizontal clipping
  const sizeTier = useMemo<'large' | 'medium' | 'compact'>(() => {
    if (totalReelCount <= 8) return 'large';
    if (totalReelCount <= 12) return 'medium';
    return 'compact';
  }, [totalReelCount]);

  const themeStyle = COUNTER_THEME_STYLES[activeTheme] || COUNTER_THEME_STYLES.vault;

  // Selected goal details if user has savings targets
  const linkedGoals = finsaState.savingsGoals || [];
  const primaryGoal = linkedGoals[0] || null;

  // Sound generator for mechanical clicks/ticks
  const triggerMechanicalSound = () => {
    if (finsaState.soundEffectsEnabled === false) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const vol = finsaState.soundVolume ?? 0.2;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // AudioContext unavailable
    }
  };

  // Handlers
  const handleOpenAddModal = (presetAmount?: number) => {
    soundEngine.playUiClick();
    triggerMechanicalSound();
    setEditingRecord(null);
    setAmountInput(presetAmount ? String(presetAmount) : '100');
    setDateInput(formatLocalYMD(new Date()));
    setCategoryInput(SAVINGS_CATEGORIES[0]);
    setCustomCategory('');
    setNoteInput('');
    setGoalIdInput(primaryGoal?.id || '');
    setIsBankTransfer(false);
    setFundingAccountId(finsaState.accounts[0]?.id || '');
    setDestinationVaultId(
      finsaState.accounts.find((a) => a.type === 'savings')?.id || finsaState.accounts[1]?.id || ''
    );
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (rec: FinsaDailySavingsRecord) => {
    soundEngine.playUiClick();
    triggerMechanicalSound();
    setEditingRecord(rec);
    setAmountInput(String(rec.amountCents / 100));
    setDateInput(rec.date);
    if (SAVINGS_CATEGORIES.includes(rec.category)) {
      setCategoryInput(rec.category);
      setCustomCategory('');
    } else {
      setCategoryInput('custom');
      setCustomCategory(rec.category);
    }
    setNoteInput(rec.note || '');
    setGoalIdInput(rec.goalId || '');
    setIsBankTransfer(Boolean(rec.sourceAccountId && rec.destinationAccountId));
    setFundingAccountId(rec.sourceAccountId || finsaState.accounts[0]?.id || '');
    setDestinationVaultId(
      rec.destinationAccountId || finsaState.accounts.find((a) => a.type === 'savings')?.id || ''
    );
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleDeleteRecord = (id: string) => {
    soundEngine.playUiClick();
    if (!confirm('Are you sure you want to delete this savings record? Your total will automatically recalculate.')) {
      return;
    }
    const targetRec = records.find((r) => r.id === id);
    if (!targetRec) return;

    const filtered = records.filter((r) => r.id !== id);
    let updatedGoals = finsaState.savingsGoals;
    let updatedAccounts = finsaState.accounts;
    let updatedTransactions = finsaState.transactions;

    // Revert linked goal
    if (targetRec.goalId) {
      updatedGoals = updatedGoals.map((g) => {
        if (g.id === targetRec.goalId) {
          return {
            ...g,
            currentCents: Math.max(0, g.currentCents - targetRec.amountCents),
            history: g.history.filter(
              (h) => !(h.amountCents === targetRec.amountCents && h.date === targetRec.date)
            ),
          };
        }
        return g;
      });
    }

    // Revert bank transfer if configured
    if (targetRec.sourceAccountId && targetRec.destinationAccountId) {
      updatedAccounts = updatedAccounts.map((a) => {
        if (a.id === targetRec.sourceAccountId) return { ...a, balanceCents: a.balanceCents + targetRec.amountCents };
        if (a.id === targetRec.destinationAccountId) return { ...a, balanceCents: a.balanceCents - targetRec.amountCents };
        return a;
      });
      updatedTransactions = updatedTransactions.filter(
        (tx) =>
          !(
            tx.type === 'transfer' &&
            tx.accountId === targetRec.sourceAccountId &&
            tx.toAccountId === targetRec.destinationAccountId &&
            tx.amountCents === targetRec.amountCents &&
            tx.date === targetRec.date
          )
      );
    }

    onUpdateFinsa({
      dailySavings: filtered,
      savingsGoals: updatedGoals,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
    });
    setSaveSuccessNotice('Savings record removed. Total updated.');
    window.setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleDirectVaultDrop = (amountMajor: number, note?: string): string => {
    const parsedCents = Math.round(amountMajor * 100);
    if (parsedCents <= 0) return '';

    const newRecordId = `rec_vault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const todayStr = formatLocalYMD(new Date());
    const newRecord: FinsaDailySavingsRecord = {
      id: newRecordId,
      date: todayStr,
      amountCents: parsedCents,
      category: 'Daily Vault Drop',
      note: note || `Direct deposit via Mechanical Vault Hopper (+${currencySymbol}${amountMajor})`,
      goalId: primaryGoal?.id || undefined,
      createdAt: new Date().toISOString(),
    };

    let updatedGoals = finsaState.savingsGoals;
    if (primaryGoal) {
      updatedGoals = finsaState.savingsGoals.map((g) => {
        if (g.id === primaryGoal.id) {
          return {
            ...g,
            currentCents: g.currentCents + parsedCents,
            history: [
              {
                id: `contrib_${Date.now()}`,
                date: todayStr,
                amountCents: parsedCents,
                note: newRecord.note,
              },
              ...g.history,
            ],
          };
        }
        return g;
      });
    }

    onUpdateFinsa({
      dailySavings: [newRecord, ...records],
      ...(updatedGoals ? { savingsGoals: updatedGoals } : {}),
    });

    return newRecordId;
  };

  const handleUndoVaultDrop = (recordId: string) => {
    const targetRec = records.find((r) => r.id === recordId);
    const filtered = records.filter((r) => r.id !== recordId);

    let updatedGoals = finsaState.savingsGoals;
    if (targetRec && targetRec.goalId) {
      updatedGoals = finsaState.savingsGoals.map((g) => {
        if (g.id === targetRec.goalId) {
          return {
            ...g,
            currentCents: Math.max(0, g.currentCents - targetRec.amountCents),
            history: g.history.filter((h) => h.note !== targetRec.note),
          };
        }
        return g;
      });
    }

    onUpdateFinsa({
      dailySavings: filtered,
      ...(updatedGoals ? { savingsGoals: updatedGoals } : {}),
    });
    setSaveSuccessNotice('Vault deposit undone. Balance restored.');
    window.setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedCents = parseCurrencyToCents(amountInput, currency);
    if (parsedCents <= 0) {
      setFormError('Please enter a valid savings amount greater than 0.');
      return;
    }
    if (!dateInput) {
      setFormError('Please select a valid date.');
      return;
    }

    if (isBankTransfer) {
      if (!fundingAccountId || !destinationVaultId) {
        setFormError('Please select both funding and destination accounts for the bank transfer.');
        return;
      }
      if (fundingAccountId === destinationVaultId) {
        setFormError('Funding and destination accounts must be different.');
        return;
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    const finalCategory =
      categoryInput === 'custom'
        ? customCategory.trim() || 'Custom Daily Savings'
        : categoryInput;

    let updatedAccounts = [...finsaState.accounts];
    let updatedTransactions = [...finsaState.transactions];
    let updatedGoals = [...finsaState.savingsGoals];

    // If editing existing record, first revert the previous record's goal & account allocations
    if (editingRecord) {
      if (editingRecord.goalId) {
        updatedGoals = updatedGoals.map((g) => {
          if (g.id === editingRecord.goalId) {
            return {
              ...g,
              currentCents: Math.max(0, g.currentCents - editingRecord.amountCents),
              history: g.history.filter(
                (h) => !(h.amountCents === editingRecord.amountCents && h.date === editingRecord.date)
              ),
            };
          }
          return g;
        });
      }

      if (editingRecord.sourceAccountId && editingRecord.destinationAccountId) {
        updatedAccounts = updatedAccounts.map((a) => {
          if (a.id === editingRecord.sourceAccountId) return { ...a, balanceCents: a.balanceCents + editingRecord.amountCents };
          if (a.id === editingRecord.destinationAccountId) return { ...a, balanceCents: a.balanceCents - editingRecord.amountCents };
          return a;
        });
        updatedTransactions = updatedTransactions.filter(
          (tx) =>
            !(
              tx.type === 'transfer' &&
              tx.accountId === editingRecord.sourceAccountId &&
              tx.toAccountId === editingRecord.destinationAccountId &&
              tx.amountCents === editingRecord.amountCents &&
              tx.date === editingRecord.date
            )
        );
      }
    }

    // Now apply new Bank Transfer if enabled
    if (isBankTransfer && fundingAccountId && destinationVaultId) {
      updatedAccounts = updatedAccounts.map((a) => {
        if (a.id === fundingAccountId) return { ...a, balanceCents: a.balanceCents - parsedCents };
        if (a.id === destinationVaultId) return { ...a, balanceCents: a.balanceCents + parsedCents };
        return a;
      });

      const newTransferTx: FinsaTransaction = {
        id: `tx_ds_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: dateInput,
        amountCents: parsedCents,
        type: 'transfer',
        categoryId: 'cat_savings_vault',
        accountId: fundingAccountId,
        toAccountId: destinationVaultId,
        payeeOrPayer: `Daily Savings: ${finalCategory}`,
        notes: noteInput.trim() || 'Allocated via Daily Savings Studio',
        createdAt: new Date().toISOString(),
      };
      updatedTransactions = [newTransferTx, ...updatedTransactions];
    }

    // Apply new Goal progress if linked
    if (goalIdInput) {
      updatedGoals = updatedGoals.map((g) => {
        if (g.id === goalIdInput) {
          const newContrib = {
            id: `contrib_${Date.now()}`,
            date: dateInput,
            amountCents: parsedCents,
            note: noteInput.trim() || undefined,
          };
          return {
            ...g,
            currentCents: g.currentCents + parsedCents,
            history: [newContrib, ...g.history],
          };
        }
        return g;
      });
    }

    if (editingRecord) {
      // Edit existing record
      const updatedList = records.map((r) => {
        if (r.id === editingRecord.id) {
          return {
            ...r,
            date: dateInput,
            amountCents: parsedCents,
            category: finalCategory,
            note: noteInput.trim() || undefined,
            goalId: goalIdInput || undefined,
            sourceAccountId: isBankTransfer ? fundingAccountId : undefined,
            destinationAccountId: isBankTransfer ? destinationVaultId : undefined,
          };
        }
        return r;
      });
      onUpdateFinsa({
        dailySavings: updatedList,
        accounts: updatedAccounts,
        transactions: updatedTransactions,
        savingsGoals: updatedGoals,
      });
      soundEngine.playSaveSuccess();
      triggerMechanicalSound();
      setSaveSuccessNotice(`✓ Updated savings record of ${formatCents(parsedCents, currency)}`);
    } else {
      // Add new record
      const newRec: FinsaDailySavingsRecord = {
        id: `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: dateInput,
        amountCents: parsedCents,
        category: finalCategory,
        note: noteInput.trim() || undefined,
        goalId: goalIdInput || undefined,
        sourceAccountId: isBankTransfer ? fundingAccountId : undefined,
        destinationAccountId: isBankTransfer ? destinationVaultId : undefined,
        createdAt: new Date().toISOString(),
      };
      onUpdateFinsa({
        dailySavings: [newRec, ...records],
        accounts: updatedAccounts,
        transactions: updatedTransactions,
        savingsGoals: updatedGoals,
      });
      soundEngine.playStreakCelebration();
      triggerMechanicalSound();
      setSaveSuccessNotice(`🎉 Saved ${formatCents(parsedCents, currency)} into your vault!`);
    }

    setIsAddModalOpen(false);
    setIsSubmitting(false);
    window.setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  // Filtered history list
  const filteredHistory = useMemo(() => {
    return records
      .filter((r) => {
        const matchesSearch =
          r.category.toLowerCase().includes(historySearch.toLowerCase()) ||
          (r.note && r.note.toLowerCase().includes(historySearch.toLowerCase()));
        const matchesCategory =
          historyCategoryFilter === 'all' || r.category === historyCategoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, historySearch, historyCategoryFilter]);

  // Max timeline value for SVG chart height scaling
  const maxTimelineAmount = useMemo(() => {
    const max = Math.max(...stats.timeline.map((t) => t.amountCents), 100);
    return max;
  }, [stats.timeline]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      {/* 1. Header Banner & Theme Selector */}
      <div
        className="relative p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-stone-950/90 to-slate-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
        style={panelBgStyle}
      >
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono tracking-wider ${themeStyle.badgeStyle}`}>
                MECHANICAL SAVINGS VAULT
              </span>
              <span className="text-xs text-amber-200/70 font-mono flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-current" />
                <span>{stats.streakDays} Day Saving Streak</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Daily Savings Studio</span>
              <span className="text-amber-400 text-lg font-serif">₹</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Build daily financial discipline one rupee at a time. Every amount you record rolls into your physical mechanical counter and accelerates your savings goals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Theme Picker Trigger Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setIsThemePickerOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold flex items-center gap-2 shadow cursor-pointer transition-colors"
              title="Configure Visual Style, Animation & Sound"
            >
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Style: {themeStyle.name.split(' ')[0]}</span>
            </button>

            {/* Main Action: Add Today's Savings */}
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Today's Savings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notice Notification */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessNotice(null)}
            className="text-amber-400 hover:text-amber-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. THE SIGNATURE MECHANICAL SPLIT-FLAP / ODOMETER COUNTER */}
      <div className="relative flex flex-col items-center justify-center p-4 sm:p-8 md:p-10 rounded-3xl border border-slate-800/80 bg-slate-950/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Subtle Ambient Backlight Glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 blur-3xl transition-all duration-700"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${themeStyle.glowShadow} 0%, transparent 70%)`,
          }}
        />

        {/* Counter Header Label */}
        <div className="relative z-10 flex items-center gap-3 mb-5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-slate-300 font-mono">
            TOTAL CUMULATIVE SAVINGS
          </span>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        </div>

        {/* Outer scroll-safe container preventing any horizontal clipping */}
        <div className="w-full flex justify-center overflow-x-auto scrollbar-none py-2 px-1">
          {/* Physical Mechanical Reel Housing Unit */}
          <div
            className={`relative z-10 p-3 sm:p-5 md:p-7 rounded-3xl border-2 sm:border-4 shadow-2xl flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 select-none transition-all duration-500 max-w-full flex-nowrap ${themeStyle.housingBg} ${themeStyle.housingBorder}`}
            style={{
              boxShadow: `0 20px 50px -10px rgba(0, 0, 0, 0.9), 0 0 40px -10px ${themeStyle.glowShadow}`,
            }}
          >
            {/* Currency Reel Symbol Cell */}
            <div
              className={`rounded-xl sm:rounded-2xl border flex items-center justify-center relative overflow-hidden shadow-inner shrink-0 ${themeStyle.cardBg} ${themeStyle.cardBorder} ${
                sizeTier === 'large'
                  ? 'w-9 sm:w-12 md:w-15 h-15 sm:h-20 md:h-26'
                  : sizeTier === 'medium'
                  ? 'w-7 sm:w-9 md:w-12 h-12 sm:h-16 md:h-21'
                  : 'w-5 sm:w-7 md:w-9 h-10 sm:h-13 md:h-17'
              }`}
            >
              <span
                className={`font-black ${themeStyle.digitColor} ${
                  sizeTier === 'large'
                    ? 'text-xl sm:text-3xl md:text-5xl'
                    : sizeTier === 'medium'
                    ? 'text-lg sm:text-2xl md:text-3xl'
                    : 'text-sm sm:text-lg md:text-2xl'
                }`}
              >
                {reelParts.currencySymbol}
              </span>
              <div className={`absolute top-1/2 left-0 right-0 h-[1.5px] -translate-y-1/2 pointer-events-none ${themeStyle.hingeColor}`} />
            </div>

            {/* Integer Digits & Commas */}
            {reelParts.integerChars.map((char, index) => {
              const isComma = char === ',';
              const isBullet = char === '•';

              if (isComma) {
                return (
                  <div
                    key={`comma_${index}`}
                    className={`flex items-end justify-center pb-1.5 sm:pb-2.5 shrink-0 ${
                      sizeTier === 'large'
                        ? 'w-3 sm:w-4 md:w-5 h-15 sm:h-20 md:h-26'
                        : sizeTier === 'medium'
                        ? 'w-2.5 sm:w-3 md:w-4 h-12 sm:h-16 md:h-21'
                        : 'w-2 sm:w-2.5 md:w-3 h-10 sm:h-13 md:h-17'
                    }`}
                  >
                    <span
                      className={`font-black ${themeStyle.digitColor} ${
                        sizeTier === 'large'
                          ? 'text-xl sm:text-3xl md:text-5xl'
                          : sizeTier === 'medium'
                          ? 'text-lg sm:text-2xl md:text-3xl'
                          : 'text-sm sm:text-lg md:text-2xl'
                      }`}
                    >
                      ,
                    </span>
                  </div>
                );
              }

              if (isBullet) {
                return (
                  <div
                    key={`bullet_${index}`}
                    className={`rounded-xl sm:rounded-2xl border flex items-center justify-center relative overflow-hidden shadow-inner shrink-0 ${themeStyle.cardBg} ${themeStyle.cardBorder} ${
                      sizeTier === 'large'
                        ? 'w-9 sm:w-12 md:w-15 h-15 sm:h-20 md:h-26'
                        : sizeTier === 'medium'
                        ? 'w-7 sm:w-9 md:w-12 h-12 sm:h-16 md:h-21'
                        : 'w-5 sm:w-7 md:w-9 h-10 sm:h-13 md:h-17'
                    }`}
                  >
                    <span
                      className={`font-black ${themeStyle.digitColor} ${
                        sizeTier === 'large'
                          ? 'text-xl sm:text-3xl md:text-4xl'
                          : sizeTier === 'medium'
                          ? 'text-base sm:text-2xl md:text-3xl'
                          : 'text-xs sm:text-base md:text-xl'
                      }`}
                    >
                      •
                    </span>
                    <div className={`absolute top-1/2 left-0 right-0 h-[1.5px] -translate-y-1/2 pointer-events-none ${themeStyle.hingeColor}`} />
                  </div>
                );
              }

              const digitVal = parseInt(char, 10);
              const validDigit = Number.isNaN(digitVal) ? 0 : digitVal;

              const animDurationClass =
                finsaState.counterAnimationIntensity === 'calm'
                  ? 'duration-400'
                  : finsaState.counterAnimationIntensity === 'vivid'
                  ? 'duration-1000'
                  : 'duration-700';

              return (
                <div
                  key={`int_reel_${index}`}
                  className={`rounded-xl sm:rounded-2xl border relative overflow-hidden shadow-inner shrink-0 ${themeStyle.cardBg} ${themeStyle.cardBorder} ${
                    sizeTier === 'large'
                      ? 'w-9 sm:w-12 md:w-15 h-15 sm:h-20 md:h-26'
                      : sizeTier === 'medium'
                      ? 'w-7 sm:w-9 md:w-12 h-12 sm:h-16 md:h-21'
                      : 'w-5 sm:w-7 md:w-9 h-10 sm:h-13 md:h-17'
                  }`}
                >
                  {/* Rolling Digit Ribbon containing 0 through 9 */}
                  <div
                    className={`w-full flex flex-col items-center justify-start ${
                      reducedMotion ? '' : `transition-transform ${animDurationClass} ease-[cubic-bezier(0.34,1.56,0.64,1)]`
                    }`}
                    style={{
                      transform: `translateY(-${validDigit * 10}%)`,
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <div
                        key={num}
                        className={`w-full flex items-center justify-center shrink-0 ${
                          sizeTier === 'large'
                            ? 'h-15 sm:h-20 md:h-26'
                            : sizeTier === 'medium'
                            ? 'h-12 sm:h-16 md:h-21'
                            : 'h-10 sm:h-13 md:h-17'
                        }`}
                      >
                        <span
                          className={`font-black ${themeStyle.digitColor} ${
                            sizeTier === 'large'
                              ? 'text-xl sm:text-3xl md:text-5xl'
                              : sizeTier === 'medium'
                              ? 'text-lg sm:text-2xl md:text-3xl'
                              : 'text-sm sm:text-lg md:text-2xl'
                          }`}
                        >
                          {num}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Split-Flap Center Hinge Crease */}
                  <div
                    className={`absolute top-1/2 left-0 right-0 h-[1.5px] -translate-y-1/2 pointer-events-none shadow-sm ${themeStyle.hingeColor}`}
                  />

                  {/* Specular Bevel Highlights */}
                  <div className="absolute inset-x-0 top-0 h-1.5 sm:h-2 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-1.5 sm:h-2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>
              );
            })}

            {/* Decimal Point Dot Tile (if currency supports minor units) */}
            {reelParts.hasDecimals && (
              <div
                className={`flex items-end justify-center pb-1.5 sm:pb-2.5 shrink-0 ${
                  sizeTier === 'large'
                    ? 'w-3 sm:w-4 md:w-5 h-15 sm:h-20 md:h-26'
                    : sizeTier === 'medium'
                    ? 'w-2.5 sm:w-3 md:w-4 h-12 sm:h-16 md:h-21'
                    : 'w-2 sm:w-2.5 md:w-3 h-10 sm:h-13 md:h-17'
                }`}
              >
                <div
                  className={`rounded-full ${themeStyle.digitColor} bg-current mb-1 sm:mb-2 ${
                    sizeTier === 'large'
                      ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3'
                      : sizeTier === 'medium'
                      ? 'w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5'
                      : 'w-1.5 h-1.5 sm:w-2 sm:h-2'
                  }`}
                />
              </div>
            )}

            {/* Decimal Digits (e.g. .00) */}
            {reelParts.hasDecimals &&
              reelParts.decimalChars.map((decChar, dIdx) => {
                const decVal = parseInt(decChar, 10);
                const validDecVal = Number.isNaN(decVal) ? 0 : decVal;
                const animDurationClass =
                  finsaState.counterAnimationIntensity === 'calm'
                    ? 'duration-400'
                    : finsaState.counterAnimationIntensity === 'vivid'
                    ? 'duration-1000'
                    : 'duration-700';

                return (
                  <div
                    key={`dec_reel_${dIdx}`}
                    className={`rounded-xl sm:rounded-2xl border relative overflow-hidden shadow-inner shrink-0 opacity-90 ${themeStyle.cardBg} ${themeStyle.cardBorder} ${
                      sizeTier === 'large'
                        ? 'w-8 sm:w-10 md:w-13 h-15 sm:h-20 md:h-26'
                        : sizeTier === 'medium'
                        ? 'w-6 sm:w-8 md:w-10 h-12 sm:h-16 md:h-21'
                        : 'w-4.5 sm:w-6 md:w-8 h-10 sm:h-13 md:h-17'
                    }`}
                  >
                    <div
                      className={`w-full flex flex-col items-center justify-start ${
                        reducedMotion ? '' : `transition-transform ${animDurationClass} ease-[cubic-bezier(0.34,1.56,0.64,1)]`
                      }`}
                      style={{
                        transform: `translateY(-${validDecVal * 10}%)`,
                      }}
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <div
                          key={num}
                          className={`w-full flex items-center justify-center shrink-0 ${
                            sizeTier === 'large'
                              ? 'h-15 sm:h-20 md:h-26'
                              : sizeTier === 'medium'
                              ? 'h-12 sm:h-16 md:h-21'
                              : 'h-10 sm:h-13 md:h-17'
                          }`}
                        >
                          <span
                            className={`font-black ${themeStyle.digitColor} ${
                              sizeTier === 'large'
                                ? 'text-lg sm:text-2xl md:text-4xl'
                                : sizeTier === 'medium'
                                ? 'text-base sm:text-xl md:text-3xl'
                                : 'text-xs sm:text-base md:text-xl'
                            }`}
                          >
                            {num}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      className={`absolute top-1/2 left-0 right-0 h-[1.5px] -translate-y-1/2 pointer-events-none shadow-sm ${themeStyle.hingeColor}`}
                    />
                    <div className="absolute inset-x-0 top-0 h-1.5 sm:h-2 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-1.5 sm:h-2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  </div>
                );
              })}
          </div>
        </div>

        {/* Complete Amount & Compact Notation Badge */}
        <div className="relative z-10 flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300">
          <span>Full Value:</span>
          <span className="font-bold text-amber-300">{reelParts.fullFormatted}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            Compact: <strong className="text-emerald-400">{formatCompactCurrency(stats.totalCents, currency, privacyMode)}</strong>
          </span>
        </div>

        {/* Signature Physical Mechanical Vault Hopper & Token Drop Deck */}
        <MechanicalVaultHopper
          currency={currency}
          currencySymbol={currencySymbol}
          theme={activeTheme}
          reducedMotion={reducedMotion}
          onDirectDeposit={handleDirectVaultDrop}
          onUndoDeposit={handleUndoVaultDrop}
          onOpenDetailedAddModal={handleOpenAddModal}
          primaryGoalName={primaryGoal?.name}
        />
      </div>


      {/* 3. SAVINGS DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Savings */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>TODAY'S VAULT</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {formatCents(stats.todayCents, currency, privacyMode)}
          </div>
          <div className="text-[11px] text-slate-400">
            {stats.todayCents > 0 ? '✓ Daily contribution logged' : 'No savings added today yet'}
          </div>
        </div>

        {/* This Month */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>THIS MONTH</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {formatCents(stats.monthCents, currency, privacyMode)}
          </div>
          <div className="text-[11px] text-slate-400">
            Accumulated for {new Date().toLocaleDateString(undefined, { month: 'long' })}
          </div>
        </div>

        {/* Savings Streak */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>SAVING STREAK</span>
            <Flame className="w-4 h-4 text-orange-400 fill-current" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-400 font-mono flex items-center gap-1.5">
            <span>{stats.streakDays}</span>
            <span className="text-xs text-slate-400 font-normal">Consecutive Days</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {stats.streakDays > 0 ? 'Consistent habit active' : 'Start your streak today'}
          </div>
        </div>

        {/* Primary Savings Goal Progress */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>TARGET GOAL</span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          {primaryGoal ? (
            <>
              <div className="text-sm font-bold text-white truncate">{primaryGoal.name}</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <span>{formatCents(stats.totalCents, currency, privacyMode)}</span>
                  <span>{formatCents(primaryGoal.targetCents, currency, privacyMode)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-indigo-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((stats.totalCents / primaryGoal.targetCents) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 pt-1">
              No goal created yet. Create one in Savings Goals tab.
            </div>
          )}
        </div>
      </div>

      {/* 4. DAILY SAVINGS TIMELINE CHART */}
      <div
        className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl space-y-4"
        style={panelBgStyle}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Savings Inflow Timeline</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily contributions over selected timeframe. Hover over bars to see individual amounts.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {(['7d', '30d', '3m', '1y'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setTimelinePeriod(period)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors ${
                  timelinePeriod === period
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Bar Timeline Visualizer */}
        <div className="pt-2">
          <div className="h-44 sm:h-52 w-full flex items-end gap-1 sm:gap-2 px-2 pt-6 pb-2 border-b border-slate-800 overflow-x-auto">
            {stats.timeline.map((item, idx) => {
              const heightPercent =
                item.amountCents > 0
                  ? Math.max(8, Math.min(100, Math.round((item.amountCents / maxTimelineAmount) * 100)))
                  : 3;
              const hasAmount = item.amountCents > 0;

              return (
                <div
                  key={item.date}
                  className="flex-1 min-w-[12px] sm:min-w-[18px] flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded shadow-xl whitespace-nowrap pointer-events-none z-20">
                    {item.date}: {formatCents(item.amountCents, currency, privacyMode)}
                  </div>

                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      hasAmount
                        ? 'bg-gradient-to-t from-amber-600 to-amber-400 group-hover:brightness-125'
                        : 'bg-slate-800/40 group-hover:bg-slate-700/60'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 px-2">
            <span>{stats.timeline[0]?.displayLabel}</span>
            <span>{stats.timeline[Math.floor(stats.timeline.length / 2)]?.displayLabel}</span>
            <span>{stats.timeline[stats.timeline.length - 1]?.displayLabel}</span>
          </div>
        </div>
      </div>

      {/* 5. SAVINGS HISTORY & RECORDS MANAGEMENT */}
      <div
        className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md shadow-2xl space-y-4"
        style={panelBgStyle}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Savings History Ledger ({filteredHistory.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review, edit, or delete individual contributions. Totals update dynamically.
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search notes or category..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs w-44 sm:w-56 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <select
              value={historyCategoryFilter}
              onChange={(e) => setHistoryCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none"
            >
              <option value="all">All Sources</option>
              {SAVINGS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table / List */}
        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-3">
            <Coins className="w-12 h-12 text-slate-700 mx-auto" />
            <div className="text-sm font-bold text-slate-300">No Savings Records Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start recording small daily amounts. Drop ₹10 or ₹50 to watch your mechanical counter roll!
            </p>
            <button
              type="button"
              onClick={() => handleOpenAddModal(50)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs shadow cursor-pointer hover:bg-amber-400 transition-colors"
            >
              Add First ₹50 Today
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 text-[11px] font-mono text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Source / Category</th>
                  <th className="py-2.5 px-3">Note</th>
                  <th className="py-2.5 px-3 text-right">Amount Saved</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredHistory.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-900/40 transition-colors group">
                    <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {rec.date}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {rec.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {rec.note || '—'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400 text-right whitespace-nowrap">
                      +{formatCents(rec.amountCents, currency, privacyMode)}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(rec)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. RECORD / EDIT DAILY SAVINGS MODAL */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span>{editingRecord ? 'Edit Savings Drop' : "Add Today's Savings"}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleSaveRecord} className="space-y-4">
              {/* Amount Input & Fast Shortcuts */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount Saved ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold font-mono text-base">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="e.g. 50, 100, 500"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-lg focus:outline-none focus:border-amber-500"
                    required
                    autoFocus
                  />
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {QUICK_AMOUNT_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountInput(String(amt))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors ${
                        amountInput === String(amt)
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {currencySymbol}{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Date of Savings *
                </label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Category / Source */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Source / Habit Category
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  {SAVINGS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="custom">+ Custom Category</option>
                </select>

                {categoryInput === 'custom' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category name..."
                    className="w-full mt-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    required
                  />
                )}
              </div>

              {/* Optional Goal Link */}
              {linkedGoals.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Link to Savings Goal (Optional)
                  </label>
                  <select
                    value={goalIdInput}
                    onChange={(e) => setGoalIdInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">None (Vault General Savings)</option>
                    {linkedGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (Target: {formatCents(g.targetCents, currency)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bank Transfer Allocation (Preserves Net Worth & Financial Balance) */}
              {finsaState.accounts && finsaState.accounts.length >= 2 && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBankTransfer}
                      onChange={(e) => {
                        setIsBankTransfer(e.target.checked);
                        if (e.target.checked && !fundingAccountId) {
                          setFundingAccountId(finsaState.accounts[0]?.id || '');
                          setDestinationVaultId(finsaState.accounts[1]?.id || '');
                        }
                      }}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      Fund from Bank Account (Logs Internal Transfer)
                    </span>
                  </label>

                  {isBankTransfer && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-fadeIn">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Source Account (Funds Out)
                        </label>
                        <select
                          value={fundingAccountId}
                          onChange={(e) => setFundingAccountId(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                        >
                          {finsaState.accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({formatCents(acc.balanceCents, currency)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Vault / Savings Account (Funds In)
                        </label>
                        <select
                          value={destinationVaultId}
                          onChange={(e) => setDestinationVaultId(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                        >
                          {finsaState.accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({formatCents(acc.balanceCents, currency)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Note Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Note / Memo (Optional)
                </label>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="e.g. Skipped takeout lunch, saved ₹150!"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold shadow cursor-pointer transition-colors"
                >
                  {isSubmitting ? 'Saving...' : editingRecord ? 'Save Changes' : 'Drop into Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. COUNTER THEME STUDIO MODAL (Immune to parent overflow-hidden clipping) */}
      {isThemePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Palette className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Counter Theme Studio</h2>
                  <p className="text-xs text-slate-400">Select mechanical aesthetic, motion dynamics, and tactile feedback</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsThemePickerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 6 Theme Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Selectable Visual Styles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'vault', name: 'Mechanical Vault', desc: 'Physical rolling drums with brushed bronze bevels & mechanical depth' },
                  { id: 'liquid_gold', name: 'Liquid Gold', desc: 'Digits emerge through flowing metallic 24k gold highlights on obsidian' },
                  { id: 'digital_pulse', name: 'Digital Pulse', desc: 'Subtle light trails, electric cyan-emerald pulse & electronic transition' },
                  { id: 'minimal', name: 'Precision Minimal', desc: 'Crisp typography with surgical contrast and restrained micro-movement' },
                  { id: 'aurora', name: 'Aurora Flow', desc: 'Flowing northern-lights luminescence across frosted panels' },
                  { id: 'odometer', name: 'Classic Odometer', desc: 'Traditional mechanical rolling odometer wheels with cylindrical curvature' },
                ].map((th) => {
                  const isSelected = activeTheme === th.id || (activeTheme === 'gold' && th.id === 'liquid_gold') || (activeTheme === 'mechanical' && th.id === 'vault') || (activeTheme === 'neon' && th.id === 'digital_pulse');
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        triggerMechanicalSound();
                        onUpdateFinsa({ counterTheme: th.id as CounterTheme });
                      }}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 scale-[1.01]'
                          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-sm font-bold ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                          {th.name}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {th.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Animation Dynamics & Sound Controls */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Motion Dynamics & Tactile Sound</span>
              </h3>

              {/* Animation Intensity */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Animation Intensity:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['calm', 'normal', 'vivid'] as const).map((intensity) => {
                    const isCur = (finsaState.counterAnimationIntensity || 'normal') === intensity;
                    return (
                      <button
                        key={intensity}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onUpdateFinsa({ counterAnimationIntensity: intensity });
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer border transition-colors ${
                          isCur
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {intensity}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reduced Motion Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Reduced Motion</span>
                  <span className="text-[11px] text-slate-400">Instantly snap values without rolling cylinders</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onUpdateFinsa({ counterReducedMotion: !reducedMotion });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    reducedMotion ? 'bg-amber-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      reducedMotion ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Effects Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Mechanical Ticks & Sound</span>
                  <span className="text-[11px] text-slate-400">Synthesizes physical odometer click upon digit roll</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !(finsaState.soundEffectsEnabled ?? true);
                    onUpdateFinsa({ soundEffectsEnabled: nextVal });
                    if (nextVal) triggerMechanicalSound();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    (finsaState.soundEffectsEnabled ?? true) ? 'bg-amber-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      (finsaState.soundEffectsEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsThemePickerOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg cursor-pointer"
              >
                Apply & Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
