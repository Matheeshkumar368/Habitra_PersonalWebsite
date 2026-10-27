import React, { useState, useRef, useEffect } from 'react';
import {
  Coins,
  ArrowDown,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { CURRENCY_SYMBOLS } from '../../services/finsaEngine';

interface MechanicalVaultHopperProps {
  currency: string;
  currencySymbol: string;
  theme: string;
  reducedMotion: boolean;
  onDirectDeposit: (amountMajor: number, note?: string) => Promise<string | null> | (string | null);
  onUndoDeposit: (recordId: string) => void;
  onOpenDetailedAddModal: (presetAmount?: number) => void;
  primaryGoalName?: string | null;
}

interface DroppingTokenAnim {
  id: number;
  amount: number;
  color: string;
}

export const MechanicalVaultHopper: React.FC<MechanicalVaultHopperProps> = ({
  currency,
  currencySymbol,
  theme,
  reducedMotion,
  onDirectDeposit,
  onUndoDeposit,
  onOpenDetailedAddModal,
  primaryGoalName,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [customAmount, setCustomAmount] = useState('150');
  const [isLeverPulled, setIsLeverPulled] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const [activeDropAnim, setActiveDropAnim] = useState<DroppingTokenAnim | null>(null);
  const [chuteFlapOpen, setChuteFlapOpen] = useState(false);
  const [recentReceipt, setRecentReceipt] = useState<{
    id: string;
    amount: number;
    timestamp: number;
  } | null>(null);
  const [receiptSecondsLeft, setReceiptSecondsLeft] = useState(0);

  const debounceRef = useRef(false);
  const undoTimerRef = useRef<number | null>(null);

  // Currency-tailored token values
  const tokenDenominations = React.useMemo(() => {
    if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
      return [
        { value: 5, label: `${currencySymbol}5`, style: 'silver' },
        { value: 10, label: `${currencySymbol}10`, style: 'bronze' },
        { value: 20, label: `${currencySymbol}20`, style: 'gold' },
        { value: 50, label: `${currencySymbol}50`, style: 'gold_heavy' },
        { value: 100, label: `${currencySymbol}100`, style: 'platinum' },
      ];
    }
    if (currency === 'JPY') {
      return [
        { value: 100, label: `${currencySymbol}100`, style: 'silver' },
        { value: 500, label: `${currencySymbol}500`, style: 'bronze' },
        { value: 1000, label: `${currencySymbol}1K`, style: 'gold' },
        { value: 2000, label: `${currencySymbol}2K`, style: 'gold_heavy' },
        { value: 5000, label: `${currencySymbol}5K`, style: 'platinum' },
      ];
    }
    // Default INR
    return [
      { value: 20, label: '₹20', style: 'copper' },
      { value: 50, label: '₹50', style: 'silver' },
      { value: 100, label: '₹100', style: 'gold' },
      { value: 200, label: '₹200', style: 'gold_heavy' },
      { value: 500, label: '₹500', style: 'platinum' },
      { value: 1000, label: '₹1,000', style: 'obsidian_gold' },
    ];
  }, [currency, currencySymbol]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    };
  }, []);

  const handleDepositToken = async (amount: number, styleName = 'gold') => {
    if (debounceRef.current || isDropping) return;
    debounceRef.current = true;
    setTimeout(() => {
      debounceRef.current = false;
    }, 700);

    setIsDropping(true);
    setChuteFlapOpen(true);
    setActiveDropAnim({ id: Date.now(), amount, color: styleName });

    // Tactile physical feedback
    soundEngine.playCoinDrop();

    // Trigger chute mechanical snap after coin entry
    setTimeout(() => {
      setChuteFlapOpen(false);
    }, 380);

    // Call real parent handler to deposit savings
    try {
      const recordId = await Promise.resolve(
        onDirectDeposit(
          amount,
          `Direct Vault Hopper Drop (${currencySymbol}${amount})`
        )
      );

      if (recordId) {
        setRecentReceipt({
          id: recordId,
          amount,
          timestamp: Date.now(),
        });
        setReceiptSecondsLeft(6);

        if (undoTimerRef.current) clearInterval(undoTimerRef.current);
        let seconds = 6;
        undoTimerRef.current = window.setInterval(() => {
          seconds -= 1;
          setReceiptSecondsLeft(seconds);
          if (seconds <= 0) {
            if (undoTimerRef.current) clearInterval(undoTimerRef.current);
            setRecentReceipt(null);
          }
        }, 1000);
      }
    } finally {
      setTimeout(() => {
        setIsDropping(false);
        setActiveDropAnim(null);
      }, 550);
    }
  };

  const handlePullCrankLever = async () => {
    const parsed = parseFloat(customAmount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      soundEngine.playWarningTone();
      return;
    }

    setIsLeverPulled(true);
    soundEngine.playStepChange();

    setTimeout(() => {
      setIsLeverPulled(false);
    }, 320);

    await handleDepositToken(parsed, 'custom_bronze');
  };

  const handleUndo = () => {
    if (!recentReceipt) return;
    soundEngine.playUiClick();
    onUndoDeposit(recentReceipt.id);
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    setRecentReceipt(null);
  };

  const getTokenStyleClasses = (style: string) => {
    switch (style) {
      case 'copper':
        return 'from-amber-700 via-orange-600 to-amber-900 border-amber-600 text-amber-100 shadow-amber-900/40';
      case 'silver':
        return 'from-slate-300 via-slate-400 to-slate-600 border-slate-300 text-slate-900 shadow-slate-700/40';
      case 'bronze':
        return 'from-amber-600 via-yellow-700 to-amber-900 border-amber-500 text-amber-100 shadow-amber-950/40';
      case 'gold_heavy':
        return 'from-amber-300 via-yellow-500 to-amber-700 border-yellow-300 text-slate-950 shadow-yellow-600/50';
      case 'platinum':
        return 'from-cyan-100 via-teal-300 to-slate-500 border-cyan-200 text-slate-900 shadow-cyan-500/40';
      case 'obsidian_gold':
        return 'from-stone-800 via-stone-900 to-amber-950 border-amber-400 text-amber-300 shadow-amber-500/30';
      case 'gold':
      default:
        return 'from-yellow-300 via-amber-400 to-yellow-600 border-yellow-200 text-slate-950 shadow-amber-500/40';
    }
  };

  return (
    <div className="relative z-10 w-full mt-4">
      {/* Vault Hopper Deck Housing */}
      <div className="rounded-2xl border-2 border-amber-600/40 bg-gradient-to-b from-[#1c1814] via-[#120f0d] to-[#0c0a09] p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(251,191,36,0.2)]">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-amber-700/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider font-mono">
                  Physical Vault Hopper
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Tactile Token Drop
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Click or drop a coin token to directly deposit into your savings vault.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDetailedAddModal()}
              className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
              title="Open full ledger modal with bank transfer & custom tags"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Ledger Form</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-label={isExpanded ? 'Collapse hopper' : 'Expand hopper'}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            {/* Center: Interactive Mechanical Hopper Slot */}
            <div className="relative flex flex-col items-center justify-center py-2">
              {/* Animated Dropping Coin Particle */}
              {activeDropAnim && !reducedMotion && (
                <div
                  className={`absolute z-30 w-11 h-11 rounded-full bg-gradient-to-b border-2 flex items-center justify-center font-black font-mono text-xs shadow-2xl transition-all duration-400 pointer-events-none animate-bounce ${getTokenStyleClasses(
                    activeDropAnim.color
                  )}`}
                  style={{
                    animationDuration: '0.4s',
                    top: '-12px',
                  }}
                >
                  {currencySymbol}
                  {activeDropAnim.amount}
                </div>
              )}

              {/* The Mechanical Intake Chute Slot */}
              <div
                className={`relative w-48 sm:w-64 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-300 shadow-inner ${
                  chuteFlapOpen
                    ? 'bg-amber-950/80 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                    : 'bg-black/90 border-stone-700 shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)]'
                }`}
              >
                {/* Brass Rivet details on chute corners */}
                <div className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/60 border border-amber-300/40" />
                <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/60 border border-amber-300/40" />
                <div className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/60 border border-amber-300/40" />
                <div className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/60 border border-amber-300/40" />

                {/* Chute Intake Flap */}
                <div
                  className={`w-36 sm:w-48 h-3.5 rounded bg-gradient-to-b from-stone-600 via-stone-800 to-stone-950 border border-stone-600 transition-transform duration-200 flex items-center justify-center ${
                    chuteFlapOpen
                      ? 'rotate-x-45 translate-y-1 opacity-60 bg-amber-900 border-amber-500'
                      : 'hover:border-amber-400/80'
                  }`}
                  style={{ transformOrigin: 'top center' }}
                >
                  <div className="w-16 h-0.5 rounded-full bg-black/80" />
                </div>

                {/* Chute Status Label */}
                <span className="absolute bottom-1 text-[9px] font-mono tracking-widest uppercase text-amber-500/70 select-none">
                  {isDropping ? 'ENGAGING VAULT REEL...' : 'VAULT INTAKE SLOT'}
                </span>
              </div>
            </div>

            {/* Minted Token Chips Tray */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase text-amber-400/80 font-bold tracking-wider">
                  Select Minted Coin to Drop:
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {primaryGoalName ? `Feeds: ${primaryGoalName}` : 'Feeds: Cumulative Vault'}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {tokenDenominations.map((tok) => (
                  <button
                    key={tok.value}
                    type="button"
                    disabled={isDropping}
                    onClick={() => handleDepositToken(tok.value, tok.style)}
                    className={`group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none active:scale-95 disabled:opacity-50 ${
                      reducedMotion
                        ? 'hover:brightness-110'
                        : 'hover:-translate-y-1.5 hover:shadow-xl'
                    } ${getTokenStyleClasses(tok.style)}`}
                    style={{
                      boxShadow:
                        'inset 0 2px 3px rgba(255,255,255,0.4), 0 6px 12px rgba(0,0,0,0.5)',
                    }}
                    title={`Click to drop ${tok.label} into the Mechanical Vault`}
                  >
                    {/* Coin Milled Edge Pattern */}
                    <div className="absolute inset-1 rounded-xl border border-dashed border-current opacity-30 pointer-events-none" />

                    <Coins className="w-4 h-4 mb-1 drop-shadow-sm opacity-90 group-hover:scale-110 transition-transform" />
                    <span className="text-xs sm:text-sm font-black font-mono tracking-tight drop-shadow-sm">
                      {tok.label}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider opacity-75 mt-0.5">
                      Drop
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Crank Lever Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-amber-800/20 bg-stone-950/40 p-3 rounded-xl border border-stone-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-stone-300 font-semibold">
                  Custom Denomination:
                </span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-amber-400 font-bold">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-24 pl-6 pr-2 py-1 rounded-lg bg-stone-900 border border-stone-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Physical Pull Lever Button */}
              <button
                type="button"
                disabled={isDropping}
                onClick={handlePullCrankLever}
                className={`relative px-4 py-1.5 rounded-xl border-2 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 ${
                  isLeverPulled
                    ? 'translate-y-1 bg-amber-700 border-amber-400 text-white'
                    : 'bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800 border-amber-300 text-slate-950 hover:brightness-110'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Pull Deposit Lever</span>
              </button>
            </div>

            {/* Instant Receipt Toast with Safe Undo */}
            {recentReceipt && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/50 shadow-xl text-xs font-mono animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>
                      +{currencySymbol}
                      {recentReceipt.amount}
                    </strong>{' '}
                    locked into vault! Rolling reels updated.
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo ({receiptSecondsLeft}s)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
