import React, { useState } from 'react';
import {
  Check,
  Compass,
  Droplets,
  Edit3,
  Flame,
  Music,
  Plus,
  Sparkles,
  Star,
  Target,
  Timer,
  BarChart2,
  Eye,
  Sun,
  CloudRain,
} from 'lucide-react';
import { PIXEL_SCENES, ROOM_OBJECT_CATALOG } from '../constants/scenesAndPresets';
import {
  AmbientSoundId,
  AudioSettings,
  EnvironmentSettings,
  Goal,
  Habit,
  HabitCompletionMap,
  NavigationTab,
  RoomObjectId,
  SceneId,
  StyleSettings,
  TimeOfDay,
  WeatherType,
} from '../types/app';
import {
  calculateHabitStreak,
  isHabitCompleted,
  OverallDashboardStats,
} from '../utils/habitStats';

interface LivingWorldSanctuaryProps {
  habits: Habit[];
  completions: HabitCompletionMap;
  goals: Goal[];
  stats: OverallDashboardStats;
  selectedDate: Date;
  selectedDateStr: string;
  environment: EnvironmentSettings;
  styleSettings: StyleSettings;
  audio: AudioSettings;
  unlockedObjectIds: RoomObjectId[];
  waterCompleted: number;
  waterGoal: number;
  focusSessionsToday: number;
  focusMinutesToday: number;
  xpLevel: number;
  xpTitle: string;
  totalXP: number;
  nextLevelXP: number;
  currentLevelXP: number;
  panelBgStyle: React.CSSProperties;
  onToggleHabitCompletion: (habitId: string, dateStr: string) => void;
  onOpenAddHabit: () => void;
  onOpenEditHabit: (habit: Habit) => void;
  onInspectHabit: (habit: Habit) => void;
  onOpenAddGoal: () => void;
  onOpenEditGoal: (goal: Goal) => void;
  onUpdateEnvironment: (patch: Partial<EnvironmentSettings>) => void;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onLogWaterCup: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
}

export interface WorldStageInfo {
  stageNumber: number;
  name: string;
  subtitle: string;
  badge: string;
  vitalityPercent: number;
  riverStatus: string;
  floraStatus: string;
}

export function computeWorldStage(
  dailyProgressPercent: number,
  currentStreak: number,
  waterCompleted: number,
  waterGoal: number,
  focusMinutesToday: number,
  xpLevel: number
): WorldStageInfo {
  const hydrationRatio = Math.min(1, waterCompleted / Math.max(1, waterGoal));
  const focusRatio = Math.min(1, focusMinutesToday / 45);
  const streakBonus = Math.min(20, currentStreak * 2);

  const rawVitality = Math.round(
    dailyProgressPercent * 0.55 +
      hydrationRatio * 20 +
      focusRatio * 15 +
      streakBonus * 0.5
  );
  const vitalityPercent = Math.max(12, Math.min(100, rawVitality));

  const compositeScore = vitalityPercent + xpLevel * 8 + currentStreak * 3;

  if (compositeScore >= 115 || vitalityPercent >= 90) {
    return {
      stageNumber: 5,
      name: 'Celestial Living World',
      subtitle: 'All floating islands, spirit trees, and astral waterways are in full bloom',
      badge: '🌌',
      vitalityPercent,
      riverStatus: 'Radiant Astral Current',
      floraStatus: 'Ancient Spirit Canopy',
    };
  }
  if (compositeScore >= 88 || vitalityPercent >= 70) {
    return {
      stageNumber: 4,
      name: 'Flourishing Astral Citadel',
      subtitle: 'Bioluminescent waterfalls and golden lanterns illuminate the sky bridges',
      badge: '🏯',
      vitalityPercent,
      riverStatus: 'Luminous Emerald Flow',
      floraStatus: 'Blooming Spirit Blossoms',
    };
  }
  if (compositeScore >= 62 || vitalityPercent >= 45) {
    return {
      stageNumber: 3,
      name: 'Bioluminescent Archipelago',
      subtitle: 'Crystal rivers awaken and fireflies gather around your study terrace',
      badge: '🏝️',
      vitalityPercent,
      riverStatus: 'Glowing Cyan Stream',
      floraStatus: 'Lush Botanical Ferns',
    };
  }
  if (compositeScore >= 38 || vitalityPercent >= 25) {
    return {
      stageNumber: 2,
      name: 'Awakening Lantern Grove',
      subtitle: 'Warm amber lanterns flicker as morning dew nourishes young sprouts',
      badge: '🏮',
      vitalityPercent,
      riverStatus: 'Gentle Mountain Brook',
      floraStatus: 'Emerging Dew Sprouts',
    };
  }
  return {
    stageNumber: 1,
    name: 'Seedling Sanctuary',
    subtitle: 'Complete today’s habits and focus sessions to awaken the floating islands',
    badge: '🌱',
    vitalityPercent,
    riverStatus: 'Quiet Misty Waters',
    floraStatus: 'Dormant Sanctuary Seeds',
  };
}

interface PlantStage {
  stageName: string;
  symbol: string;
  auraColor: string;
  heightClass: string;
  description: string;
}

function getHabitFloraStage(streak: number, completedToday: boolean): PlantStage {
  if (streak >= 14) {
    return {
      stageName: 'Luminescent Spirit Tree',
      symbol: '🌳',
      auraColor: '#2dd4bf',
      heightClass: 'scale-110',
      description: 'Ancient glowing canopy nourished by 14+ days of consistency',
    };
  }
  if (streak >= 7) {
    return {
      stageName: 'Sakura Blossom Bush',
      symbol: '🌸',
      auraColor: '#f472b6',
      heightClass: 'scale-105',
      description: 'Radiant petals blooming from a full week of dedication',
    };
  }
  if (streak >= 3) {
    return {
      stageName: 'Bioluminescent Fern',
      symbol: '🌿',
      auraColor: '#10b981',
      heightClass: 'scale-100',
      description: 'Thriving emerald foliage with glowing veins',
    };
  }
  if (streak >= 1 || completedToday) {
    return {
      stageName: 'Dewlight Sprout',
      symbol: '🌱',
      auraColor: '#34d399',
      heightClass: 'scale-95',
      description: 'Fresh green shoot reaching toward the lantern light',
    };
  }
  return {
    stageName: 'Sanctuary Seed',
    symbol: '🌰',
    auraColor: '#94a3b8',
    heightClass: 'scale-90',
    description: 'Waiting to be watered by today’s habit completion',
  };
}

export const LivingWorldSanctuary: React.FC<LivingWorldSanctuaryProps> = ({
  habits,
  completions,
  goals,
  stats,
  selectedDate,
  selectedDateStr,
  environment,
  styleSettings,
  audio,
  unlockedObjectIds,
  waterCompleted,
  waterGoal,
  focusSessionsToday,
  focusMinutesToday,
  xpLevel,
  xpTitle,
  totalXP,
  nextLevelXP,
  currentLevelXP,
  panelBgStyle,
  onToggleHabitCompletion,
  onOpenAddHabit,
  onOpenEditHabit,
  onInspectHabit,
  onOpenAddGoal,
  onOpenEditGoal,
  onUpdateEnvironment,
  onUpdateAudio,
  onLogWaterCup,
  onNavigateTab,
}) => {
  const [portalCategory, setPortalCategory] = useState<string>('All');
  const [syncAudioWithPortal, setSyncAudioWithPortal] = useState<boolean>(true);
  const [recentlyWateredId, setRecentlyWateredId] = useState<string | null>(null);

  const worldStage = computeWorldStage(
    stats.dailyProgressPercent,
    stats.overallCurrentStreak,
    waterCompleted,
    waterGoal,
    focusMinutesToday,
    xpLevel
  );

  const featuredScenes = PIXEL_SCENES.filter((sc) =>
    portalCategory === 'All' ? true : sc.category === portalCategory
  );

  const handleWaterHabitPlant = (habitId: string) => {
    setRecentlyWateredId(habitId);
    onToggleHabitCompletion(habitId, selectedDateStr);
    window.setTimeout(() => {
      setRecentlyWateredId((prev) => (prev === habitId ? null : prev));
    }, 900);
  };

  const handleTravelToRealm = (
    sceneId: SceneId,
    defaultWeather: WeatherType,
    defaultTime: TimeOfDay,
    defaultAmbient: AmbientSoundId
  ) => {
    onUpdateEnvironment({
      sceneId,
      weather: defaultWeather,
      timeOfDay: defaultTime,
    });
    if (syncAudioWithPortal && defaultAmbient !== 'silent') {
      onUpdateAudio({
        ambientSoundId: defaultAmbient,
        ambientPlaying: true,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. WORLD EVOLUTION & ATMOSPHERE COMMAND BAR */}
      <section
        className="rounded-2xl border border-slate-800/90 p-5 shadow-xl"
        style={panelBgStyle}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-teal-300 font-medium">
              <span>{worldStage.badge}</span>
              <span>World Evolution Stage {worldStage.stageNumber} of 5</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                Level {xpLevel} {xpTitle} ({totalXP} XP)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {worldStage.name}
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              {worldStage.subtitle}
            </p>
          </div>

          {/* Interactive Atmosphere & World View Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Time of Day Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800/90">
              {(
                [
                  { id: 'morning', label: 'Dawn' },
                  { id: 'afternoon', label: 'Day' },
                  { id: 'evening', label: 'Dusk' },
                  { id: 'night', label: 'Night' },
                ] as { id: TimeOfDay; label: string }[]
              ).map((t) => {
                const active = environment.timeOfDay === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUpdateEnvironment({ timeOfDay: t.id })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Weather Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800/90">
              {(
                [
                  { id: 'clear', label: 'Clear' },
                  { id: 'rain', label: 'Rain' },
                  { id: 'storm', label: 'Storm' },
                  { id: 'snow', label: 'Snow' },
                ] as { id: WeatherType; label: string }[]
              ).map((w) => {
                const active = environment.weather === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onUpdateEnvironment({ weather: w.id })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-teal-500/25 text-teal-200 border border-teal-400/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>

            {/* Toggle Interactive World Hotspots */}
            <button
              type="button"
              onClick={() =>
                onUpdateEnvironment({
                  showWorldHotspots: environment.showWorldHotspots === false,
                })
              }
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                environment.showWorldHotspots !== false
                  ? 'bg-teal-500/20 border-teal-400/40 text-teal-200'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Show or hide interactive clickable pins on the pixel world"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>
                {environment.showWorldHotspots !== false
                  ? 'Hotspots On'
                  : 'Hotspots Off'}
              </span>
            </button>
          </div>
        </div>

        {/* World Vitality Bar & 4 Living Ecosystem Metrics (Unboxed Clean Typography) */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                Sanctuary Vitality & Ecosystem Resonance
              </span>
              <span className="font-mono-tabular font-bold text-teal-300">
                {worldStage.vitalityPercent}% Vitality
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800/80">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${worldStage.vitalityPercent}%`,
                  background:
                    'linear-gradient(90deg, #14b8a6 0%, #38bdf8 55%, #f59e0b 100%)',
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono-tabular">
              <span>River: {worldStage.riverStatus}</span>
              <span aria-hidden="true">·</span>
              <span>Flora: {worldStage.floraStatus}</span>
              <span aria-hidden="true">·</span>
              <span>
                Next Lv: {currentLevelXP}/{nextLevelXP} XP
              </span>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/65 border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Daily Rituals</div>
              <div className="text-base font-bold text-white font-mono-tabular mt-0.5">
                {stats.completedToday}/{stats.totalHabits}
              </div>
              <div className="text-[11px] text-emerald-400 font-mono-tabular mt-0.5">
                {stats.dailyProgressPercent}% complete
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/65 border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Active Streak</div>
              <div className="text-base font-bold text-white font-mono-tabular mt-0.5 flex items-center gap-1">
                <span>{stats.overallCurrentStreak} days</span>
              </div>
              <div className="text-[11px] text-amber-400 font-mono-tabular mt-0.5">
                Best: {stats.overallBestStreak}d
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/65 border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Focus Sanctuary</div>
              <div className="text-base font-bold text-white font-mono-tabular mt-0.5">
                {focusMinutesToday} mins
              </div>
              <div className="text-[11px] text-sky-400 font-mono-tabular mt-0.5">
                {focusSessionsToday} sessions today
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/65 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Spring Water</span>
                <button
                  type="button"
                  onClick={onLogWaterCup}
                  className="text-[11px] font-semibold text-sky-300 hover:text-white cursor-pointer"
                  title="Log +1 cup of water"
                >
                  +1 Cup
                </button>
              </div>
              <div className="text-base font-bold text-white font-mono-tabular mt-0.5">
                {waterCompleted}/{waterGoal} cups
              </div>
              <div className="text-[11px] text-teal-400 font-mono-tabular mt-0.5">
                {unlockedObjectIds.length}/{ROOM_OBJECT_CATALOG.length} relics
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE LIVING HABIT GARDEN + ACTIVE QUEST MILESTONES */}
      <div
        id="living-habit-garden"
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
      >
        {/* LEFT 8 COLS: THE LIVING HABIT GARDEN (Botanical Sprouts + Daily Rituals) */}
        <section
          className="lg:col-span-8 rounded-2xl border border-slate-800/90 p-5 shadow-xl flex flex-col justify-between"
          style={panelBgStyle}
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>🌿</span>
                  <span>The Living Habit Garden & Daily Rituals</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Each habit cultivates a living botanical specimen on your terrace. Completing habits nourishes its growth stage.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onLogWaterCup}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  <span>Drink Water ({waterCompleted}/{waterGoal})</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAddHabit}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap"
                  style={{ backgroundColor: styleSettings.accentColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Plant New Habit</span>
                </button>
              </div>
            </div>

            {habits.length === 0 ? (
              <div className="py-12 px-6 text-center rounded-2xl bg-slate-950/50 border border-dashed border-slate-800">
                <div className="text-3xl mb-2">🌱</div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Your Sanctuary Garden is Ready for Planting
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Add your first daily habit to plant a dormant sanctuary seed. As your streak grows, it evolves into a luminescent spirit tree.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddHabit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: styleSettings.accentColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Plant First Habit</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {habits.map((habit) => {
                  const completed = isHabitCompleted(
                    completions,
                    habit.id,
                    selectedDateStr
                  );
                  const st = calculateHabitStreak(
                    habit,
                    completions,
                    selectedDate
                  );
                  const flora = getHabitFloraStage(st.currentStreak, completed);
                  const isWatering = recentlyWateredId === habit.id;
                  const goalDays = Math.max(1, habit.goalDays || 30);
                  const completedDays = st.totalCompletedDays;
                  const goalProgressPct = Math.min(
                    100,
                    Math.round((completedDays / goalDays) * 100)
                  );
                  const isGoalReached = completedDays >= goalDays;

                  return (
                    <div
                      key={habit.id}
                      data-testid={`habit-card-${habit.id}`}
                      className={`group relative rounded-xl p-3.5 border transition-all duration-200 flex flex-col justify-between ${
                        completed
                          ? 'bg-slate-900/85 border-teal-500/45 shadow-lg shadow-teal-950/30'
                          : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800/85'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: Botanical Specimen Visual + Habit Details */}
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleWaterHabitPlant(habit.id)}
                            aria-label={`Toggle ${habit.name}`}
                            className={`relative w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-transform duration-200 cursor-pointer ${
                              flora.heightClass
                            } ${
                              isWatering ? 'scale-125' : 'hover:scale-105'
                            } ${
                              completed
                                ? 'bg-teal-500/20 border-teal-400/60'
                                : 'bg-slate-900 border-slate-700/80 hover:border-slate-500'
                            }`}
                            title={
                              completed
                                ? 'Completed today! Click to undo'
                                : 'Click to nourish & complete today’s ritual'
                            }
                          >
                            <span className="text-xl leading-none">
                              {flora.symbol}
                            </span>
                            <span className="text-[9px] font-mono-tabular text-slate-300 mt-0.5">
                              {st.currentStreak}d
                            </span>
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>{habit.icon}</span>
                              <span className="truncate">{flora.stageName}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular text-teal-300">
                                {st.weeklyCompletedCount}/7 wk
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onInspectHabit(habit)}
                              className={`text-sm font-semibold text-left truncate block mt-0.5 cursor-pointer ${
                                completed
                                  ? 'text-white hover:text-teal-300'
                                  : 'text-slate-200 hover:text-white'
                              }`}
                            >
                              {habit.name}
                            </button>

                            {habit.description && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {habit.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Complete Check Button */}
                        <button
                          type="button"
                          onClick={() => handleWaterHabitPlant(habit.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                            completed
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{completed ? 'Nourished' : 'Complete'}</span>
                        </button>
                      </div>

                      {/* Habit Goal Visual Progress Bar */}
                      <div
                        className="mt-3 pt-2.5 border-t border-slate-800/70"
                        data-testid={`habit-goal-progress-${habit.id}`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="text-slate-400 font-medium flex items-center gap-1.5">
                            <span>Goal Progress</span>
                            {isGoalReached && (
                              <span className="text-[10px] font-semibold text-emerald-400">
                                ✓ Goal Reached
                              </span>
                            )}
                          </span>
                          <span className="font-mono-tabular font-semibold text-slate-200">
                            {completedDays} / {goalDays} days ({goalProgressPct}%)
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label={`${habit.name} goal progress: ${completedDays} of ${goalDays} days completed`}
                          aria-valuenow={completedDays}
                          aria-valuemin={0}
                          aria-valuemax={goalDays}
                          className="w-full h-2 rounded-full bg-slate-950/90 border border-slate-800/80 overflow-hidden"
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${goalProgressPct}%`,
                              backgroundColor: isGoalReached
                                ? '#10b981'
                                : habit.color || styleSettings.accentColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Bottom Metadata & Quick Inspect / Edit */}
                      <div className="flex items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2 font-mono-tabular">
                          <span className="text-amber-300">
                            Streak: {st.currentStreak}d
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Best: {st.longestStreak}d</span>
                          {habit.reminderTime && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>⏰ {habit.reminderTime}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onInspectHabit(habit)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-teal-300 transition-colors cursor-pointer"
                            title="Inspect 16-Week Heatmap & Growth Stats"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenEditHabit(habit)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit Habit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botanical Growth Legend */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-300">Evolution Stages:</span>
              <span>🌰 0d Seed</span>
              <span aria-hidden="true">·</span>
              <span>🌱 1–2d Sprout</span>
              <span aria-hidden="true">·</span>
              <span>🌿 3–6d Fern</span>
              <span aria-hidden="true">·</span>
              <span>🌸 7–13d Blossom</span>
              <span aria-hidden="true">·</span>
              <span>🌳 14d+ Spirit Tree</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('habits')}
              className="text-teal-300 hover:text-teal-200 font-medium cursor-pointer whitespace-nowrap"
            >
              Open Full Habit Archive →
            </button>
          </div>
        </section>

        {/* RIGHT 4 COLS: CITADEL OF GOALS & SANCTUARY RELICS */}
        <section
          className="lg:col-span-4 rounded-2xl border border-slate-800/90 p-5 shadow-xl flex flex-col justify-between"
          style={panelBgStyle}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>🏰</span>
                  <span>Citadel Milestones</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Long-term quests shaping your sanctuary
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAddGoal}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1 shadow transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: styleSettings.accentColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Goal</span>
              </button>
            </div>

            <div className="space-y-3">
              {goals.filter((g) => !g.archived).length === 0 ? (
                <div className="py-8 px-4 text-center rounded-xl bg-slate-950/50 border border-dashed border-slate-800">
                  <p className="text-xs text-slate-400 mb-3">
                    No active milestones yet. Define a goal to anchor your daily habits.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenAddGoal}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: styleSettings.accentColor }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Goal</span>
                  </button>
                </div>
              ) : (
                goals
                  .filter((g) => !g.archived)
                  .slice(0, 3)
                  .map((goal) => (
                    <div
                      key={goal.id}
                      onClick={() => onOpenEditGoal(goal)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onOpenEditGoal(goal);
                      }}
                      className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-900/90 border border-slate-800/85 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">
                            {goal.icon || '🎯'}
                          </span>
                          <h3 className="text-xs font-semibold text-white truncate">
                            {goal.title}
                          </h3>
                        </div>
                        <span className="text-xs font-mono-tabular font-bold text-teal-300 shrink-0">
                          {goal.progress}%
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden mt-2.5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${goal.progress}%`,
                            backgroundColor: goal.color || styleSettings.accentColor,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono-tabular">
                        <span className="capitalize">{goal.category}</span>
                        <span>Due {goal.deadline}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Unlocked World Relics Showcase */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-2.5">
              <span className="font-semibold text-slate-200">
                Sanctuary Artifacts ({unlockedObjectIds.length}/
                {ROOM_OBJECT_CATALOG.length})
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab('myspace')}
                className="text-teal-300 hover:text-teal-200 text-[11px] font-medium cursor-pointer"
              >
                Place in Room →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ROOM_OBJECT_CATALOG.slice(0, 10).map((item) => {
                const unlocked = unlockedObjectIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    title={
                      unlocked
                        ? `${item.name}: ${item.description}`
                        : `Locked — ${item.unlockRequirementLabel}`
                    }
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-opacity ${
                      unlocked
                        ? 'bg-slate-900/90 border-slate-700/80 text-white'
                        : 'bg-slate-950/40 border-slate-800/50 opacity-35 grayscale'
                    }`}
                  >
                    {item.icon}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* 3. INTERACTIVE REALM PORTALS (SCENE TRAVEL & SOUNDSCAPE PAIRING) */}
      <section
        id="living-realm-portals"
        className="rounded-2xl border border-slate-800/90 p-5 shadow-xl"
        style={panelBgStyle}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>🌀</span>
              <span>Interactive Realm Portals</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Travel across Habitra’s floating islands, cozy interiors, and astral sanctuaries. Each realm pairs with its own lighting and soundscape.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-Sync Soundscape Toggle */}
            <button
              type="button"
              onClick={() => setSyncAudioWithPortal((v) => !v)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                syncAudioWithPortal
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>
                {syncAudioWithPortal ? 'Sync Realm Audio: On' : 'Sync Realm Audio: Off'}
              </span>
            </button>

            {/* Category Filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800/90">
              {['All', 'Nature', 'Indoor', 'Transit', 'Sci-Fi'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPortalCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    portalCategory === cat
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {featuredScenes.slice(0, 8).map((sc) => {
            const isActive = environment.sceneId === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() =>
                  handleTravelToRealm(
                    sc.id,
                    sc.defaultWeather,
                    sc.defaultTime,
                    sc.defaultAmbient
                  )
                }
                className={`group relative rounded-xl overflow-hidden border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-40 ${
                  isActive
                    ? 'border-teal-400 ring-2 ring-teal-400/30 shadow-xl'
                    : 'border-slate-800/90 hover:border-slate-600'
                }`}
              >
                {/* Portal Backdrop Image or Gradient */}
                {sc.imageUrl ? (
                  <img
                    src={sc.imageUrl}
                    alt={sc.name}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${sc.skyGradient[0]}, ${sc.skyGradient[1]}, ${sc.skyGradient[2]})`,
                    }}
                  />
                )}

                {/* Measured Contrast Scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/20" />

                {/* Top Status Row */}
                <div className="relative z-10 p-3 flex items-center justify-between w-full">
                  <span className="text-[11px] font-medium text-slate-200 bg-slate-950/75 px-2 py-0.5 rounded-md backdrop-blur-md">
                    {sc.category}
                  </span>
                  {isActive && (
                    <span className="text-[11px] font-semibold text-teal-300 bg-slate-950/85 px-2 py-0.5 rounded-md border border-teal-400/40">
                      Current Realm
                    </span>
                  )}
                </div>

                {/* Bottom Portal Title & Metadata */}
                <div className="relative z-10 p-3 w-full">
                  <div className="text-sm font-bold text-white group-hover:text-teal-200 transition-colors truncate">
                    {sc.name}
                  </div>
                  <div className="text-[11px] text-slate-300 truncate">
                    {sc.subtitle}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-mono-tabular capitalize">
                    <span>{sc.defaultWeather.replace('_', ' ')}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sc.defaultTime}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sc.defaultAmbient.replace('_', ' ')}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
