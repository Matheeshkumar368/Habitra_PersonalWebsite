import React, { useState } from 'react';
import {
  User,
  Palette,
  Music,
  Target,
  Shield,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Upload,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Clock,
  Droplets,
  AlertCircle,
  Radio,
  Volume2,
} from 'lucide-react';
import { HabitraLogo } from './HabitraLogo';
import {
  AppDataState,
  Habit,
  SceneId,
  AnimationIntensity,
  CustomAudioTrack,
} from '../types/app';
import {
  resolveSceneArtwork,
  formatLocalYMD,
} from '../constants/scenesAndPresets';
import { hashPasswordWithSalt, saveAudioBlob } from '../db/indexedDb';
import { soundEngine } from '../audio/soundEngine';

interface HabitraSetupWizardProps {
  initialState: AppDataState;
  onFinish: (updatedState: AppDataState) => void;
  onClose?: () => void;
  isReopeningFromSettings?: boolean;
}

const STARTER_HABITS_PRESETS: {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}[] = [
  {
    id: 'starter_water',
    name: 'Drink 2L Fresh Water',
    icon: '💧',
    color: '#06b6d4',
    description: 'Stay hydrated throughout your focus sessions.',
  },
  {
    id: 'starter_read',
    name: 'Read 20 Mins',
    icon: '📖',
    color: '#8b5cf6',
    description: 'Nourish your mind with books or articles.',
  },
  {
    id: 'starter_workout',
    name: 'Daily Exercise or Stretch',
    icon: '🏃',
    color: '#10b981',
    description: 'Keep your physical health active and energized.',
  },
  {
    id: 'starter_focus',
    name: 'Deep Work Session',
    icon: '🎯',
    color: '#f59e0b',
    description: 'Complete at least one focused pomodoro cycle.',
  },
  {
    id: 'starter_journal',
    name: 'Evening Reflection',
    icon: '✨',
    color: '#ec4899',
    description: 'Record highlights and thoughts from today.',
  },
];

const STARTING_ENVIRONMENTS: {
  id: SceneId;
  name: string;
  subtitle: string;
}[] = [
  {
    id: 'living_sanctuary',
    name: 'Floating Sanctuary',
    subtitle: 'Sky Terrace & Forest River',
  },
  {
    id: 'study_room',
    name: 'Study Room',
    subtitle: 'Rainy Night Desk & Ambient Lamp',
  },
  {
    id: 'rainy_cafe',
    name: 'Rainy Café',
    subtitle: 'Warm Espresso Bar & Rainy Window',
  },
  {
    id: 'night_library',
    name: 'Night Library',
    subtitle: 'Starlit Archive & Quiet Bookshelves',
  },
  {
    id: 'train_journey',
    name: 'Train Journey',
    subtitle: 'Twilight Mountain Scenic Express',
  },
];

const ACCENT_COLORS = [
  { name: 'Indigo Dream', color: '#6366f1' },
  { name: 'Emerald Sprout', color: '#10b981' },
  { name: 'Violet Velvet', color: '#8b5cf6' },
  { name: 'Sunset Amber', color: '#f59e0b' },
  { name: 'Coral Rose', color: '#f43f5e' },
  { name: 'Ocean Cyan', color: '#06b6d4' },
];

export const HabitraSetupWizard: React.FC<HabitraSetupWizardProps> = ({
  initialState,
  onFinish,
  onClose,
  isReopeningFromSettings = false,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Profile & Required Initial Confirmation
  const [userName, setUserName] = useState(initialState.profile.userName || '');
  const [quote, setQuote] = useState(
    initialState.profile.quote || 'Small Habits. Big Life.'
  );
  const [isSetupConfirmed, setIsSetupConfirmed] = useState(
    isReopeningFromSettings ? true : false
  );
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2: Appearance (Required choice, defaults to living_sanctuary)
  const [sceneId, setSceneId] = useState<SceneId>(
    initialState.environment.sceneId || 'living_sanctuary'
  );
  const [accentColor, setAccentColor] = useState(
    initialState.style.accentColor || '#6366f1'
  );
  const [animationIntensity, setAnimationIntensity] = useState<AnimationIntensity>(
    initialState.environment.animationIntensity || 'medium'
  );

  // Step 3: Required Initial Music Preference ('local' | 'online' | 'later')
  const [musicPreference, setMusicPreference] = useState<'local' | 'online' | 'later'>(
    initialState.audio.musicPreference ||
      (initialState.audio.customTracks && initialState.audio.customTracks.length > 0
        ? 'local'
        : 'later')
  );
  const [importedTracks, setImportedTracks] = useState<CustomAudioTrack[]>(
    initialState.audio.customTracks || []
  );
  const [musicImportStatus, setMusicImportStatus] = useState<string | null>(null);

  // Step 4: Required Productivity Default (Focus Duration) & Optional habits
  const [focusMinutes, setFocusMinutes] = useState(
    initialState.timer.focusMinutes || 45
  );
  const [customFocusInput, setCustomFocusInput] = useState(
    String(initialState.timer.focusMinutes || 45)
  );
  const [step4Error, setStep4Error] = useState<string | null>(null);
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(
    initialState.profile.notifyWater ?? true
  );
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);

  // Step 5: Required Security Choice (Enabled or Disabled)
  const [securityChoice, setSecurityChoice] = useState<'disabled' | 'enabled'>(
    initialState.security.passwordHash ? 'enabled' : 'disabled'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // File picker helper for Step 3 if user chooses "Local Music"
  const handleImportMusic = async () => {
    soundEngine.playUiClick();
    const desktop = (
      window as unknown as {
        habitraDesktop?: {
          openAudioFilesDialog?: () => Promise<
            { filePath: string; name: string; ext: string; size: number }[]
          >;
        };
      }
    ).habitraDesktop;

    if (desktop?.openAudioFilesDialog) {
      try {
        const files = await desktop.openAudioFilesDialog();
        if (files && files.length > 0) {
          const newCustom: CustomAudioTrack[] = files.map((f) => ({
            id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: f.name,
            filePath: f.filePath,
            fileSize: f.size,
            format: f.ext,
            category: 'custom',
            artist: 'Local Music File',
            addedAt: new Date().toISOString(),
          }));
          setImportedTracks((prev) => [...prev, ...newCustom]);
          setMusicImportStatus(`✓ Added ${newCustom.length} track(s) to library.`);
        }
      } catch {
        setMusicImportStatus('⚠ Could not open file picker.');
      }
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,.mp3,.wav,.ogg,.flac,.m4a';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      const added: CustomAudioTrack[] = [];
      for (const file of Array.from(files)) {
        const id = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await saveAudioBlob(id, file);
        added.push({
          id,
          name: file.name.replace(/\.[^/.]+$/, ''),
          blobKey: id,
          fileSize: file.size,
          category: 'custom',
          artist: 'Local Music File',
          addedAt: new Date().toISOString(),
        });
      }
      setImportedTracks((prev) => [...prev, ...added]);
      setMusicImportStatus(`✓ Added ${added.length} track(s) to library.`);
    };
    input.click();
  };

  // Step Navigation Validation
  const validateAndAdvance = (targetStep: 1 | 2 | 3 | 4 | 5) => {
    // Validate Step 1 before leaving it: Display Name and Confirmation are MANDATORY
    if (currentStep === 1 && targetStep > 1) {
      const cleanName = userName.trim();
      if (!cleanName) {
        setStep1Error('Please enter a display name to personalize your workspace (Required).');
        soundEngine.playWarningTone();
        return;
      }
      if (cleanName.length < 2) {
        setStep1Error('Display name must be at least 2 characters long.');
        soundEngine.playWarningTone();
        return;
      }
      if (!isSetupConfirmed) {
        setStep1Error('Please confirm the initial setup acknowledgement below to proceed.');
        soundEngine.playWarningTone();
        return;
      }
      setStep1Error(null);
    }

    // Validate Step 4 before leaving it
    if (currentStep === 4 && targetStep > 4) {
      const mins = parseInt(customFocusInput, 10);
      if (isNaN(mins) || mins < 5 || mins > 180) {
        setStep4Error('Please provide a valid focus duration between 5 and 180 minutes.');
        soundEngine.playWarningTone();
        return;
      }
      setFocusMinutes(mins);
      setStep4Error(null);
    }

    soundEngine.playStepChange();
    setCurrentStep(targetStep);
  };

  // Safe Skip to Workspace (Initializes required choices with safe defaults)
  const handleQuickExplore = () => {
    soundEngine.playSaveSuccess();
    const updatedState: AppDataState = {
      ...initialState,
      profile: {
        ...initialState.profile,
        userName: userName.trim(),
        userNameConfigured: userName.trim().length > 0,
        quote: quote.trim() || 'Small Habits. Big Life.',
        hasSeenWelcome: true,
      },
      environment: {
        ...initialState.environment,
        sceneId: sceneId || 'living_sanctuary',
      },
      audio: {
        ...initialState.audio,
        musicPreference: 'later',
        activeSource: 'none',
      },
      timer: {
        ...initialState.timer,
        focusMinutes: 45,
      },
      security: {
        ...initialState.security,
        passwordHash: null,
        salt: null,
        isLocked: false,
      },
    };
    onFinish(updatedState);
  };

  const handleFinishWizard = async () => {
    // Validate mandatory step 1 fields
    if (!userName.trim() || userName.trim().length < 2) {
      setCurrentStep(1);
      setStep1Error('Please enter a display name (at least 2 characters) before completing setup.');
      soundEngine.playWarningTone();
      return;
    }
    if (!isSetupConfirmed) {
      setCurrentStep(1);
      setStep1Error('Please confirm the initial setup acknowledgement before entering.');
      soundEngine.playWarningTone();
      return;
    }

    // Validate step 4 if currently on it
    const mins = parseInt(customFocusInput, 10);
    const finalFocus = !isNaN(mins) && mins >= 5 && mins <= 180 ? mins : focusMinutes;

    // Validate step 5 (Security)
    setSecurityError(null);
    let passwordHash = initialState.security.passwordHash;
    let salt = initialState.security.salt;
    let isLocked = false;

    if (securityChoice === 'enabled') {
      if (!passwordHash) {
        if (!passwordInput.trim()) {
          setSecurityError('Please enter a password of at least 4 characters, or select "Password Protection Disabled".');
          soundEngine.playWarningTone();
          return;
        }
        if (passwordInput.length < 4) {
          setSecurityError('Password must be at least 4 characters long for adequate protection.');
          soundEngine.playWarningTone();
          return;
        }
        if (passwordInput !== confirmPasswordInput) {
          setSecurityError('Passwords do not match. Please re-enter to confirm.');
          soundEngine.playWarningTone();
          return;
        }
        const hashed = await hashPasswordWithSalt(passwordInput.trim());
        passwordHash = hashed.hash;
        salt = hashed.salt;
        isLocked = false; // Unlocked during current initial setup session
      }
    } else {
      passwordHash = null;
      salt = null;
      isLocked = false;
    }

    // Assemble starter habits if fresh install and user selected habits
    let finalHabits = [...initialState.habits];
    if (finalHabits.length === 0 && selectedHabitIds.length > 0) {
      const todayYmd = formatLocalYMD(new Date());
      const starterItems: Habit[] = selectedHabitIds
        .map((starterId, index) => {
          const preset = STARTER_HABITS_PRESETS.find((p) => p.id === starterId);
          if (!preset) return null;
          return {
            id: `habit_${Date.now()}_${index}`,
            name: preset.name,
            icon: preset.icon,
            color: preset.color,
            goalDays: 7,
            frequency: 'daily',
            startDate: todayYmd,
            createdAt: new Date().toISOString(),
            order: index,
            description: preset.description,
          };
        })
        .filter(Boolean) as Habit[];
      finalHabits = starterItems;
    }

    soundEngine.playSaveSuccess();

    const updatedState: AppDataState = {
      ...initialState,
      habits: finalHabits,
      profile: {
        ...initialState.profile,
        userName: userName.trim(),
        userNameConfigured: userName.trim().length > 0,
        quote: quote.trim() || 'Small Habits. Big Life.',
        hasSeenWelcome: true, // Persistent completion
        notifyWater: waterReminderEnabled,
      },
      environment: {
        ...initialState.environment,
        sceneId,
        animationIntensity,
      },
      style: {
        ...initialState.style,
        accentColor,
      },
      audio: {
        ...initialState.audio,
        musicPreference,
        customTracks: importedTracks,
        activeSource: musicPreference === 'online' ? 'youtube' : musicPreference === 'local' ? 'library' : 'none',
      },
      timer: {
        ...initialState.timer,
        focusMinutes: finalFocus,
      },
      security: {
        ...initialState.security,
        passwordHash,
        salt,
        isLocked,
      },
    };

    onFinish(updatedState);
  };

  const stepsList = [
    { num: 1, label: 'Profile', icon: User },
    { num: 2, label: 'Sanctuary', icon: Palette },
    { num: 3, label: 'Music', icon: Music },
    { num: 4, label: 'Productivity', icon: Target },
    { num: 5, label: 'Security', icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-950/95 text-white shadow-2xl p-6 sm:p-8 overflow-hidden my-auto">
        {/* Glow backdrop */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />

        {/* Wizard Header Bar */}
        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <HabitraLogo variant="icon" size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {isReopeningFromSettings ? 'Sanctuary Settings & Setup' : 'Welcome to Habitra'}
                </h2>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                >
                  Step {currentStep} of 5
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Small Habits. Big Life. · 100% Local-First
              </p>
            </div>
          </div>

          {/* Quick Finish / Safe Explore Option */}
          {isReopeningFromSettings ? (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              Cancel &amp; Close
            </button>
          ) : currentStep > 1 ? (
            <button
              type="button"
              onClick={handleQuickExplore}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Skip optional steps and enter workspace with defaults"
            >
              Skip Optional Steps
            </button>
          ) : null}
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {stepsList.map((s) => {
            const isCompleted = s.num < currentStep;
            const isCurrent = s.num === currentStep;
            const Icon = s.icon;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => validateAndAdvance(s.num as 1 | 2 | 3 | 4 | 5)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center ${
                  isCurrent
                    ? 'bg-slate-800/90 border shadow-sm'
                    : isCompleted
                    ? 'bg-slate-900/60 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-950/40 text-slate-500 border border-slate-900 hover:bg-slate-900/40'
                }`}
                style={
                  isCurrent
                    ? { borderColor: accentColor, color: '#fff' }
                    : undefined
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] font-medium hidden sm:inline truncate">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* STEP CONTENT CONTAINER */}
        <div className="min-h-[290px]">
          {/* STEP 1: PROFILE & EXPLICIT CONFIRMATION */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Your Sanctuary Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Personalize your workspace identity. Display name and initial confirmation are mandatory before entering.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Display Name <span className="text-amber-400">* (Required)</span>
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    if (e.target.value.trim().length >= 2) setStep1Error(null);
                  }}
                  placeholder="e.g., Alex, Fireboy, Studio"
                  maxLength={40}
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    step1Error && !userName.trim() ? 'border-rose-500/80 bg-rose-950/10' : 'border-slate-700/80'
                  }`}
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This name personalizes your dashboard greeting, stats, and achievements.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Daily Motivational Quote <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="Small Habits. Big Life."
                  maxLength={80}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Required Initial Confirmation Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={isSetupConfirmed}
                    onChange={(e) => {
                      soundEngine.playToggle(e.target.checked);
                      setIsSetupConfirmed(e.target.checked);
                      if (e.target.checked) setStep1Error(null);
                    }}
                    className="w-4 h-4 mt-0.5 accent-indigo-500 rounded cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white">
                      I confirm this setup configuration for my local Habitra sanctuary.
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      (Required to proceed) Understand that all data is kept locally on this device.
                    </span>
                  </div>
                </label>
                {step1Error && (
                  <div className="text-xs text-rose-400 mt-2 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{step1Error}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: STARTING APPEARANCE (REQUIRED) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Starting Sanctuary Environment</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select your pixel-art ambient sanctuary scene (Required choice, defaults to Floating Sanctuary).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                {STARTING_ENVIRONMENTS.map((env) => {
                  const isSelected = sceneId === env.id;
                  const artworkUrl = resolveSceneArtwork(env.id);
                  return (
                    <div
                      key={env.id}
                      onClick={() => {
                        soundEngine.playUiClick();
                        setSceneId(env.id);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-400/80 bg-indigo-500/15 shadow-md'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80'
                      }`}
                    >
                      <img
                        src={artworkUrl}
                        alt={env.name}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-700/80"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {env.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {env.subtitle}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mr-1" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Accent Color picker */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Sanctuary Accent Tone
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setAccentColor(c.color);
                      }}
                      className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${
                        accentColor === c.color
                          ? 'border-white text-white shadow'
                          : 'border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      style={{
                        backgroundColor:
                          accentColor === c.color ? c.color : 'rgba(15, 23, 42, 0.6)',
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REQUIRED INITIAL MUSIC PREFERENCE */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Focus Audio &amp; Music Preference</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select your starting music preference (Required choice). You can change this at any time in the Music section.
                </p>
              </div>

              {/* 3 Explicit Valid Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'local',
                    title: 'Local Music',
                    icon: Music,
                    desc: 'Play offline MP3 & WAV files stored locally on your device.',
                    color: 'indigo',
                  },
                  {
                    id: 'online',
                    title: 'Online Services',
                    icon: Radio,
                    desc: 'Connect YouTube study streams and Spotify playlists.',
                    color: 'red',
                  },
                  {
                    id: 'later',
                    title: 'Set Up Later',
                    icon: Volume2,
                    desc: 'Use procedural ambient soundscapes only (rain, fireplace, cafe).',
                    color: 'emerald',
                  },
                ].map((item) => {
                  const isSelected = musicPreference === item.id;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        soundEngine.playUiClick();
                        setMusicPreference(item.id as typeof musicPreference);
                      }}
                      className={`p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-500/15 shadow-md'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Icon className="w-5 h-5 text-indigo-400" />
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
                        {isSelected ? '✓ Selected Preference' : 'Click to select'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Optional Local Import Action if Local Music is selected */}
              {musicPreference === 'local' && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 animate-fadeIn">
                  <div>
                    <div className="text-xs font-bold text-white">Import Starting Audio Files</div>
                    <div className="text-[11px] text-slate-400">
                      {importedTracks.length > 0
                        ? `✓ ${importedTracks.length} track(s) ready in your local library`
                        : 'Optional: Select initial MP3 or WAV files now, or add them later'}
                    </div>
                    {musicImportStatus && (
                      <div className="text-[11px] text-emerald-400 font-mono mt-1">
                        {musicImportStatus}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleImportMusic}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow transition-colors shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Files</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: REQUIRED PRODUCTIVITY DEFAULT & OPTIONAL HABITS */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Daily Productivity &amp; Habits</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set your starting focus duration (Required default) and optional starter habits.
                </p>
              </div>

              {/* Focus Duration Selection (Required) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Focus Timer Duration (Minutes)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[25, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setFocusMinutes(mins);
                        setCustomFocusInput(String(mins));
                        setStep4Error(null);
                      }}
                      className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                        focusMinutes === mins && customFocusInput === String(mins)
                          ? 'border-indigo-400 bg-indigo-500/20 text-white shadow'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Custom minutes:</span>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={customFocusInput}
                    onChange={(e) => {
                      setCustomFocusInput(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n)) setFocusMinutes(n);
                    }}
                    className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                {step4Error && (
                  <div className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{step4Error}</span>
                  </div>
                )}
              </div>

              {/* Water reminder toggle */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Hourly Hydration Water Reminders
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Gentle alerts to stay hydrated during work sessions
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={waterReminderEnabled}
                  onChange={(e) => {
                    soundEngine.playToggle(e.target.checked);
                    setWaterReminderEnabled(e.target.checked);
                  }}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </label>

              {/* Starter habits (Optional) */}
              {initialState.habits.length === 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Optional Starter Habits (Opt-in · Leave unselected for a clean workspace)
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {STARTER_HABITS_PRESETS.map((habit) => {
                      const isSelected = selectedHabitIds.includes(habit.id);
                      return (
                        <div
                          key={habit.id}
                          onClick={() => {
                            soundEngine.playToggle(!isSelected);
                            setSelectedHabitIds((prev) =>
                              prev.includes(habit.id)
                                ? prev.filter((id) => id !== habit.id)
                                : [...prev, habit.id]
                            );
                          }}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-indigo-500/40 bg-indigo-500/10'
                              : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{habit.icon}</span>
                            <span className="text-xs font-semibold text-white truncate">
                              {habit.name}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-3.5 h-3.5 accent-indigo-500 rounded"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: REQUIRED SECURITY CHOICE */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Privacy &amp; Security Choice</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose whether you want password protection enabled or disabled (Required selection).
                </p>
              </div>

              {/* Two explicit radio choices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => {
                    soundEngine.playUiClick();
                    setSecurityChoice('disabled');
                    setSecurityError(null);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    securityChoice === 'disabled'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow'
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Unlock className="w-5 h-5 text-emerald-400" />
                    {securityChoice === 'disabled' && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-white">Password Disabled</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Open directly to your sanctuary without entering a password.
                  </div>
                </div>

                <div
                  onClick={() => {
                    soundEngine.playUiClick();
                    setSecurityChoice('enabled');
                    setSecurityError(null);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    securityChoice === 'enabled'
                      ? 'border-amber-500 bg-amber-500/10 shadow'
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Lock className="w-5 h-5 text-amber-400" />
                    {securityChoice === 'enabled' && (
                      <Check className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-white">Password Protection Enabled</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Requires a master password each time Habitra starts.
                  </div>
                </div>
              </div>

              {/* Password Input Fields if Enabled */}
              {securityChoice === 'enabled' && !initialState.security.passwordHash && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Choose Master Password <span className="text-amber-400">(Min. 4 characters)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Choose master password"
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Re-enter to confirm"
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {securityError && (
                    <div className="text-xs text-rose-400 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{securityError}</span>
                    </div>
                  )}
                </div>
              )}

              {securityChoice === 'enabled' && initialState.security.passwordHash && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Your existing password lock is currently active and will be preserved.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-slate-800">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => validateAndAdvance((currentStep - 1) as 1 | 2 | 3 | 4 | 5)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => validateAndAdvance((currentStep + 1) as 1 | 2 | 3 | 4 | 5)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white flex items-center gap-2 shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishWizard}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white flex items-center gap-2 shadow-xl transition-transform hover:scale-[1.02] cursor-pointer bg-emerald-600 hover:bg-emerald-500"
              >
                <Check className="w-4 h-4" />
                <span>Finish &amp; Enter Sanctuary</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
