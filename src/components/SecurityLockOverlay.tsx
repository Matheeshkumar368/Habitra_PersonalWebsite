import React, { useEffect, useRef, useState } from 'react';
import {
  Lock,
  ShieldCheck,
  KeyRound,
  X,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { hashPasswordWithSalt } from '../db/indexedDb';
import {
  EnvironmentSettings,
  SecuritySettings,
  StyleSettings,
} from '../types/app';
import { PixelEnvironmentCanvas } from './PixelEnvironmentCanvas';

interface SecurityLockOverlayProps {
  security: SecuritySettings;
  environment: EnvironmentSettings;
  styleSettings: StyleSettings;
  userName?: string;
  onUnlock: () => void;
  onUpdateSecurity?: (next: Partial<SecuritySettings>) => void;
  onEmergencyReset?: () => void;
}

export const SecurityLockOverlay: React.FC<SecurityLockOverlayProps> = ({
  security,
  environment,
  styleSettings,
  userName,
  onUnlock,
  onUpdateSecurity,
  onEmergencyReset,
}) => {
  const [mode, setMode] = useState<'unlock' | 'change' | 'remove'>('unlock');
  const [passwordInput, setPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [confirmEmergencyReset, setConfirmEmergencyReset] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  const verifyCurrentPassword = async (candidate: string): Promise<boolean> => {
    if (!security.passwordHash || !security.salt) return true;
    const { hash } = await hashPasswordWithSalt(candidate, security.salt);
    return hash === security.passwordHash;
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!security.passwordHash || !security.salt) {
      onUnlock();
      return;
    }
    if (!passwordInput) {
      setError('Please enter your password to unlock Habitra.');
      inputRef.current?.focus();
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const ok = await verifyCurrentPassword(passwordInput);
      if (ok) {
        setPasswordInput('');
        setFailedAttempts(0);
        onUnlock();
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setPasswordInput('');
        setError(
          nextAttempts > 1
            ? `Incorrect password (${nextAttempts} failed attempts). Please try again.`
            : 'Incorrect password. Please try again.'
        );
        inputRef.current?.focus();
      }
    } catch {
      setError('Failed to verify password.');
    } finally {
      setVerifying(false);
    }
  };

  const handleChangeAndUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) {
      setError('Please enter your current password.');
      return;
    }
    if (newPasswordInput.length < 4) {
      setError('New password must be at least 4 characters.');
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setError('New password and confirmation do not match.');
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const ok = await verifyCurrentPassword(passwordInput);
      if (!ok) {
        setFailedAttempts((c) => c + 1);
        setError('Current password is incorrect.');
        return;
      }
      const { hash, salt } = await hashPasswordWithSalt(newPasswordInput);
      if (onUpdateSecurity) {
        onUpdateSecurity({
          passwordHash: hash,
          salt,
          isLocked: false,
        });
      } else {
        onUnlock();
      }
      setPasswordInput('');
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
    } catch {
      setError('Failed to update password.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveAndUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) {
      setError('Enter your current password to remove protection.');
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const ok = await verifyCurrentPassword(passwordInput);
      if (!ok) {
        setFailedAttempts((c) => c + 1);
        setError('Current password is incorrect. Cannot remove protection.');
        return;
      }
      if (onUpdateSecurity) {
        onUpdateSecurity({
          passwordHash: null,
          salt: null,
          isLocked: false,
        });
      } else {
        onUnlock();
      }
      setPasswordInput('');
    } catch {
      setError('Failed to remove password.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f19] overflow-hidden select-none">
      <PixelEnvironmentCanvas
        environment={environment}
        styleSettings={styleSettings}
        isFocusTimerRunning={false}
        className="absolute inset-0 w-full h-full opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/65 to-[#0b0f19]/75 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4 p-7 sm:p-8 rounded-2xl bg-[#111827]/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl">
        {/* Brand & Lock Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-400 shadow-lg">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-300/90 mb-1">
            Habitra · Small Habits. Big Life.
          </div>
          <h1
            data-testid="lock-screen-greeting"
            className="text-xl sm:text-2xl font-bold text-white tracking-tight"
          >
            {userName && userName.trim()
              ? `Welcome back, ${userName.trim()}`
              : 'Welcome back'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'unlock'
              ? 'Enter your local password to unlock your protected sanctuary'
              : mode === 'change'
              ? 'Verify your current password to set a new password'
              : 'Verify your current password to remove password protection'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        {onUpdateSecurity && (
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950/90 border border-slate-800 mb-5 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('unlock');
                setError(null);
              }}
              className={`py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                mode === 'unlock'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unlock
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('change');
                setError(null);
              }}
              className={`py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                mode === 'change'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('remove');
                setError(null);
              }}
              className={`py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                mode === 'remove'
                  ? 'bg-slate-800 text-rose-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Remove
            </button>
          </div>
        )}

        {/* MODE 1: UNLOCK WORKSPACE */}
        {mode === 'unlock' && (
          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div>
              <label className="sr-only" htmlFor="habitra-unlock-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="habitra-unlock-password"
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your password..."
                  autoFocus
                  autoComplete="current-password"
                  className={`w-full px-4 py-3 pr-10 rounded-xl bg-slate-950/90 border text-white placeholder-slate-500 text-sm focus:outline-none transition-colors ${
                    error
                      ? 'border-rose-500/80 focus:border-rose-400'
                      : 'border-slate-700 focus:border-indigo-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300 text-left"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-95 cursor-pointer disabled:opacity-50 shadow-lg"
              style={{ backgroundColor: styleSettings.accentColor }}
            >
              {verifying ? 'Verifying...' : 'Unlock Habitra (Enter ↵)'}
            </button>
          </form>
        )}

        {/* MODE 2: CHANGE PASSWORD & UNLOCK */}
        {mode === 'change' && (
          <form onSubmit={handleChangeAndUnlock} className="space-y-3.5">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Current Password
              </label>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => {
                    setNewPasswordInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Min 4 chars"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Confirm New
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmNewPasswordInput}
                  onChange={(e) => {
                    setConfirmNewPasswordInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Repeat new"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white transition-opacity hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: styleSettings.accentColor }}
            >
              {verifying ? 'Updating...' : 'Update Password & Unlock'}
            </button>
          </form>
        )}

        {/* MODE 3: REMOVE PASSWORD & UNLOCK */}
        {mode === 'remove' && (
          <form onSubmit={handleRemoveAndUnlock} className="space-y-3.5">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Current Password
              </label>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter current password to remove lock"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-xs text-white transition-colors cursor-pointer"
            >
              {verifying
                ? 'Removing...'
                : 'Remove Password Protection & Unlock'}
            </button>
          </form>
        )}

        {/* Footer Security Info & Emergency Reset */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <div className="text-[11px] text-slate-500 mb-2">
            Secured locally with SHA-256 salted hash · Zero cloud storage
          </div>

          {onEmergencyReset && (
            <div>
              {!confirmEmergencyReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmEmergencyReset(true)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors cursor-pointer"
                >
                  Forgot password? Reset local workspace
                </button>
              ) : (
                <div className="p-3.5 mt-2 rounded-xl bg-rose-950/60 border border-rose-500/35 space-y-2.5 text-left">
                  <p className="text-xs text-rose-200 leading-relaxed">
                    Because Habitra is 100% local-first with zero cloud servers,
                    resetting a forgotten password will clear local workspace
                    data and return to first-launch setup.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmEmergencyReset(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmEmergencyReset(false);
                        onEmergencyReset();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Confirm Factory Reset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PasswordSetupModalProps {
  isOpen: boolean;
  security: SecuritySettings;
  accentColor: string;
  onClose: () => void;
  onSaveSecurity: (next: Partial<SecuritySettings>) => void;
}

export const PasswordSetupModal: React.FC<PasswordSetupModalProps> = ({
  isOpen,
  security,
  accentColor,
  onClose,
  onSaveSecurity,
}) => {
  const hasExistingPassword = Boolean(security.passwordHash && security.salt);
  const [activeTab, setActiveTab] = useState<'set_or_change' | 'remove'>(
    'set_or_change'
  );
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [autoLock, setAutoLock] = useState(security.autoLockMinutes);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('set_or_change');
      setAutoLock(security.autoLockMinutes);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setError(null);
      setStatusMsg(null);
    }
  }, [isOpen, security.autoLockMinutes, hasExistingPassword]);

  if (!isOpen) return null;

  const handleSetOrChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMsg(null);

    if (hasExistingPassword && security.salt) {
      if (!currentPass) {
        setError('Please enter your current password first.');
        return;
      }
      const { hash } = await hashPasswordWithSalt(currentPass, security.salt);
      if (hash !== security.passwordHash) {
        setError('Current password is incorrect.');
        return;
      }
    }

    if (newPass.length < 4) {
      setError('New password must be at least 4 characters.');
      return;
    }

    if (newPass !== confirmPass) {
      setError('New password and confirmation do not match.');
      return;
    }

    const { hash, salt } = await hashPasswordWithSalt(newPass);
    onSaveSecurity({
      passwordHash: hash,
      salt,
      autoLockMinutes: autoLock,
      isLocked: false,
    });
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setStatusMsg(
      hasExistingPassword
        ? 'Password updated and hashed locally with SHA-256.'
        : 'Password protection enabled (SHA-256 salted hash).'
    );
  };

  const handleRemovePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMsg(null);

    if (hasExistingPassword && security.salt) {
      if (!currentPass) {
        setError('Please enter your current password to remove protection.');
        return;
      }
      const { hash } = await hashPasswordWithSalt(currentPass, security.salt);
      if (hash !== security.passwordHash) {
        setError('Current password is incorrect. Cannot remove protection.');
        return;
      }
    }

    onSaveSecurity({
      passwordHash: null,
      salt: null,
      isLocked: false,
    });
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setActiveTab('set_or_change');
    setStatusMsg('Password protection removed. Your workspace data is preserved.');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#111827] border border-slate-700/80 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-semibold text-white">
                Workspace Password Protection
              </h3>
              <p className="text-[11px] text-slate-400">
                Local SHA-256 salted authentication · Never stored in plaintext
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {hasExistingPassword && (
          <div className="mb-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-emerald-400">
                ● Password Protection Active
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Required at the start of every new session
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onSaveSecurity({ isLocked: true });
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              Lock Now
            </button>
          </div>
        )}

        {/* Mode Switcher when password is already enabled */}
        {hasExistingPassword && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-4 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('set_or_change');
                setError(null);
                setStatusMsg(null);
              }}
              className={`py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'set_or_change'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Change Password
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('remove');
                setError(null);
                setStatusMsg(null);
              }}
              className={`py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'remove'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Remove Password
            </button>
          </div>
        )}

        {/* FORM A: SET OR CHANGE PASSWORD */}
        {(!hasExistingPassword || activeTab === 'set_or_change') && (
          <form onSubmit={handleSetOrChangePassword} className="space-y-3.5">
            {hasExistingPassword && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Current Password
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={currentPass}
                  onChange={(e) => {
                    setCurrentPass(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter current password"
                  autoFocus
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">
                  {hasExistingPassword ? 'New Password' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showPass ? (
                    <>
                      <EyeOff className="w-3 h-3" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" /> Show
                    </>
                  )}
                </button>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => {
                  setNewPass(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="At least 4 characters"
                autoFocus={!hasExistingPassword}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Confirm {hasExistingPassword ? 'New ' : ''}Password
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPass}
                onChange={(e) => {
                  setConfirmPass(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Repeat password"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Auto-Lock After Inactivity
              </label>
              <select
                value={autoLock}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAutoLock(val);
                  onSaveSecurity({ autoLockMinutes: val });
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={0}>
                  On new session launch &amp; manual lock only
                </option>
                <option value={1}>After 1 minute idle</option>
                <option value={5}>After 5 minutes idle</option>
                <option value={15}>After 15 minutes idle</option>
                <option value={30}>After 30 minutes idle</option>
                <option value={60}>After 60 minutes idle</option>
              </select>
            </div>

            {error && (
              <div
                role="alert"
                className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {statusMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-opacity hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>
                  {hasExistingPassword ? 'Update Password' : 'Save Password'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* FORM B: REMOVE EXISTING PASSWORD */}
        {hasExistingPassword && activeTab === 'remove' && (
          <form onSubmit={handleRemovePasswordSubmit} className="space-y-3.5">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              Enter your current password to disable password lock. All your
              habits, goals, music, and settings will remain intact.
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">
                  Current Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showPass ? (
                    <>
                      <EyeOff className="w-3 h-3" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" /> Show
                    </>
                  )}
                </button>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={currentPass}
                onChange={(e) => {
                  setCurrentPass(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter current password"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Remove Password</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
