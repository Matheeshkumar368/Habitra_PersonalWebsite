import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  CloudSun,
  Sunset,
  Moon,
  Clock,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Volume2,
  VolumeX,
  Play,
  Pause,
  EyeOff,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  AMBIENT_SOUNDS,
  BUILTIN_MUSIC_TRACKS,
  PIXEL_SCENES,
  ROOM_OBJECT_CATALOG,
} from '../constants/scenesAndPresets';
import {
  AmbientSoundId,
  AnimationIntensity,
  AudioPreset,
  AudioSettings,
  EnvironmentSettings,
  PixelStyleId,
  RoomObjectId,
  RoomObjectPlacement,
  SceneId,
  SpacePreset,
  StyleSettings,
  TimeOfDay,
  TimerSettings,
  WeatherType,
} from '../types/app';
import { PixelEnvironmentCanvas } from './PixelEnvironmentCanvas';

interface CustomizeSpaceViewProps {
  environment: EnvironmentSettings;
  styleSettings: StyleSettings;
  audio: AudioSettings;
  timer: TimerSettings;
  presets: SpacePreset[];
  roomLayout?: Record<RoomObjectId, RoomObjectPlacement>;
  unlockedObjectIds?: RoomObjectId[];
  onUpdateEnvironment: (patch: Partial<EnvironmentSettings>) => void;
  onUpdateStyle: (patch: Partial<StyleSettings>) => void;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  onUpdateTimer: (patch: Partial<TimerSettings>) => void;
  onApplyPreset: (preset: SpacePreset) => void;
  onSaveCustomPreset: (name: string, subtitle: string) => void;
  onDeleteCustomPreset: (id: string) => void;
  onUpdateRoomObject?: (id: RoomObjectId, patch: Partial<RoomObjectPlacement>) => void;
  onResetRoomLayout?: () => void;
  panelBgStyle: React.CSSProperties;
}

const ACCENT_PALETTE = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Sky', hex: '#38bdf8' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Teal', hex: '#14b8a6' },
];

const PIXEL_STYLES: { id: PixelStyleId; label: string; desc: string }[] = [
  { id: 'cozy', label: 'Cozy Pixel', desc: 'Warm rounded lo-fi study aesthetic' },
  { id: 'classic', label: 'Classic Pixel', desc: 'Crisp scanlines & retro edges' },
  { id: 'soft', label: 'Soft Pixel', desc: 'Smooth translucent glass panels' },
  { id: 'dark', label: 'Dark Pixel', desc: 'Deep midnight contrast' },
  { id: 'retro16', label: 'Retro 16-bit', desc: 'CRT scanlines & pixel font headers' },
  { id: 'minimal', label: 'Minimal Pixel', desc: 'Ultra-clean distraction-free frame' },
  { id: 'cyber', label: 'Cyber Pixel', desc: 'High-tech synthwave grid' },
  { id: 'anime', label: 'Anime Ambient', desc: 'Vibrant atmospheric sky tones' },
];

export const CustomizeSpaceView: React.FC<CustomizeSpaceViewProps> = ({
  environment,
  styleSettings,
  audio,
  timer,
  presets,
  roomLayout,
  unlockedObjectIds = [],
  onUpdateEnvironment,
  onUpdateStyle,
  onUpdateAudio,
  onUpdateTimer,
  onApplyPreset,
  onSaveCustomPreset,
  onDeleteCustomPreset,
  onUpdateRoomObject,
  onResetRoomLayout,
  panelBgStyle,
}) => {
  const [activeTab, setActiveTab] = useState<
    'environment' | 'audio' | 'ui' | 'effects' | 'garden'
  >('environment');
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetSubtitle, setNewPresetSubtitle] = useState('');
  const [showPresetCreator, setShowPresetCreator] = useState(false);
  const [newAudioPresetName, setNewAudioPresetName] = useState('');

  const currentSceneIndex = PIXEL_SCENES.findIndex(
    (s) => s.id === environment.sceneId
  );
  const currentScene =
    PIXEL_SCENES[currentSceneIndex >= 0 ? currentSceneIndex : 0];

  const cycleScene = (delta: number) => {
    const nextIdx =
      (currentSceneIndex + delta + PIXEL_SCENES.length) % PIXEL_SCENES.length;
    const nextScene = PIXEL_SCENES[nextIdx];
    onUpdateEnvironment({
      sceneId: nextScene.id,
      weather: nextScene.defaultWeather,
      timeOfDay: nextScene.defaultTime,
    });
  };

  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSaveCustomPreset(
      newPresetName.trim(),
      newPresetSubtitle.trim() || `${currentScene.name} · ${environment.weather}`
    );
    setNewPresetName('');
    setNewPresetSubtitle('');
    setShowPresetCreator(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* LEFT: ENVIRONMENT PRESETS GALLERY (Matches bottom-left of screenshot) */}
      <div
        className="lg:col-span-6 rounded-2xl border border-slate-800/90 p-5 shadow-xl"
        style={panelBgStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🖼️</span>
            <h2 className="text-base font-semibold text-white">
              Environment Presets
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowPresetCreator((v) => !v)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Preset</span>
          </button>
        </div>

        {showPresetCreator && (
          <form
            onSubmit={handleCreatePreset}
            className="mb-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3"
          >
            <div className="text-xs font-medium text-indigo-300">
              Save Current Space as Custom Preset
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset Name (e.g., Rainy Night Study)"
                required
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
              <input
                type="text"
                value={newPresetSubtitle}
                onChange={(e) => setNewPresetSubtitle(e.target.value)}
                placeholder="Short description (optional)"
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPresetCreator(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer"
                style={{ backgroundColor: styleSettings.accentColor }}
              >
                Save Preset
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {presets.map((preset) => {
            const sceneMeta =
              PIXEL_SCENES.find((s) => s.id === preset.sceneId) || PIXEL_SCENES[0];
            const isSelected =
              environment.sceneId === preset.sceneId &&
              environment.weather === preset.weather;

            return (
              <div
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onApplyPreset(preset);
                }}
                className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg'
                    : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                <div
                  className="h-24 w-full relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${sceneMeta.skyGradient[0]}, ${sceneMeta.skyGradient[1]}, ${sceneMeta.skyGradient[2]})`,
                  }}
                >
                  {sceneMeta.imageUrl && (
                    <img
                      src={sceneMeta.imageUrl}
                      alt={preset.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                  <span className="absolute top-2 left-2 text-sm">
                    {preset.badgeIcon}
                  </span>
                  {preset.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomPreset(preset.id);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-md bg-black/60 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                      title="Delete custom preset"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="p-2.5 bg-slate-950/90">
                  <div className="text-xs font-semibold text-white truncate">
                    {preset.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {preset.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* All 15 Pixel Scenes Quick Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="text-xs font-medium text-slate-300 mb-2.5">
            All 15 Pixel-Art Environments
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PIXEL_SCENES.map((sc) => {
              const active = environment.sceneId === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() =>
                    onUpdateEnvironment({
                      sceneId: sc.id as SceneId,
                      weather: sc.defaultWeather,
                    })
                  }
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'text-white border-indigo-400 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  style={
                    active
                      ? { backgroundColor: `${styleSettings.accentColor}40` }
                      : undefined
                  }
                >
                  {sc.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: CUSTOMIZE MY SPACE STUDIO (Matches bottom-center-left of screenshot) */}
      <div
        className="lg:col-span-6 rounded-2xl border border-slate-800/90 p-5 shadow-xl"
        style={panelBgStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🎛️</span>
            <h2 className="text-base font-semibold text-white">
              Customize My Space
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdateEnvironment({ minimalMode: !environment.minimalMode })
            }
            className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              environment.minimalMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Minimal Mode: {environment.minimalMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* 5 Category Tabs: Environment | Audio | UI | Effects | Room Garden */}
        <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 mb-5">
          {(
            [
              { id: 'environment', label: 'Environment' },
              { id: 'audio', label: 'Audio' },
              { id: 'ui', label: 'UI' },
              { id: 'effects', label: 'Effects' },
              { id: 'garden', label: '🌱 Garden' },
            ] as const
          ).map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={
                  active ? { backgroundColor: styleSettings.accentColor } : undefined
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'environment' && (
          <div className="space-y-4">
            {/* Scene Row */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-300 w-32 shrink-0">
                Scene
              </span>
              <div className="flex-1 flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() => cycleScene(-1)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-white truncate px-2">
                  {currentScene.name} ({currentScene.subtitle})
                </span>
                <button
                  type="button"
                  onClick={() => cycleScene(1)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Time of Day Row */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-300 w-32 shrink-0">
                Time of Day
              </span>
              <div className="flex-1 grid grid-cols-5 gap-1.5">
                {(
                  [
                    { id: 'morning', icon: Sun, label: 'Morning' },
                    { id: 'afternoon', icon: CloudSun, label: 'Afternoon' },
                    { id: 'evening', icon: Sunset, label: 'Evening' },
                    { id: 'night', icon: Moon, label: 'Night' },
                    { id: 'auto', icon: Clock, label: 'Auto' },
                  ] as { id: TimeOfDay; icon: React.ElementType; label: string }[]
                ).map((item) => {
                  const Icon = item.icon;
                  const active = environment.timeOfDay === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onUpdateEnvironment({ timeOfDay: item.id })}
                      title={item.label}
                      className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-500/25 border-indigo-400 text-amber-300'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weather Row */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-300 w-32 shrink-0">
                Weather
              </span>
              <div className="flex-1 grid grid-cols-6 gap-1.5">
                {(
                  [
                    { id: 'clear', icon: Sun, label: 'Clear' },
                    { id: 'cloudy', icon: Cloud, label: 'Cloudy' },
                    { id: 'rain', icon: CloudRain, label: 'Rain' },
                    { id: 'heavy_rain', icon: CloudRain, label: 'Heavy' },
                    { id: 'snow', icon: Snowflake, label: 'Snow' },
                    { id: 'storm', icon: CloudLightning, label: 'Storm' },
                  ] as { id: WeatherType; icon: React.ElementType; label: string }[]
                ).map((w) => {
                  const Icon = w.icon;
                  const active = environment.weather === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => onUpdateEnvironment({ weather: w.id })}
                      title={w.label}
                      className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        active
                          ? 'bg-sky-500/25 border-sky-400 text-sky-300'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lighting Warmth Slider */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-300 w-32 shrink-0">
                Lighting
              </span>
              <div className="flex-1 flex items-center gap-2.5">
                <span className="text-[11px] text-sky-400">Cool</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={environment.lightingWarmth}
                  onChange={(e) =>
                    onUpdateEnvironment({ lightingWarmth: Number(e.target.value) })
                  }
                  className="flex-1 h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-amber-400"
                />
                <span className="text-[11px] text-amber-400">Warm</span>
              </div>
            </div>

            {/* Animation Intensity */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-300 w-32 shrink-0">
                Animation Intensity
              </span>
              <div className="flex-1 grid grid-cols-4 gap-1.5">
                {(['high', 'medium', 'low', 'off'] as AnimationIntensity[]).map(
                  (lvl) => {
                    const active = environment.animationIntensity === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() =>
                          onUpdateEnvironment({ animationIntensity: lvl })
                        }
                        className={`py-1.5 rounded-lg text-xs capitalize border transition-colors cursor-pointer ${
                          active
                            ? 'bg-indigo-500/25 border-indigo-400 text-white font-medium'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* UI Transparency */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-300 w-32 shrink-0">
                UI Transparency
              </span>
              <div className="flex-1 flex items-center gap-3">
                <input
                  type="range"
                  min={40}
                  max={98}
                  value={environment.uiTransparency}
                  onChange={(e) =>
                    onUpdateEnvironment({
                      uiTransparency: Number(e.target.value),
                    })
                  }
                  className="flex-1 h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
                />
                <span className="text-xs font-mono-tabular text-slate-300 w-10 text-right">
                  {environment.uiTransparency}%
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="space-y-4">
            {/* Master Audio Transport & Test Bar */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await soundEngine.resumeContextManually();
                    onUpdateAudio({ isPlaying: !audio.isPlaying });
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 shadow cursor-pointer"
                  style={{ backgroundColor: styleSettings.accentColor }}
                >
                  {audio.isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Playing Soundscape</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Soundscape</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateAudio({ isMuted: !audio.isMuted })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer ${
                    audio.isMuted
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {audio.isMuted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Muted</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Mute</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await soundEngine.resumeContextManually();
                  soundEngine.playReminderChime();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-indigo-300 font-medium cursor-pointer"
              >
                🔊 Test Chime
              </button>
            </div>

            {/* Saved Audio Mixer Presets */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  🎧 Soundscape Mixer Presets
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newAudioPresetName}
                    onChange={(e) => setNewAudioPresetName(e.target.value)}
                    placeholder="Save mix as..."
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-white w-28"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newAudioPresetName.trim()) return;
                      const nextPreset: AudioPreset = {
                        id: `ap_${Date.now()}`,
                        name: newAudioPresetName.trim(),
                        musicTrackId: audio.currentTrackId,
                        musicVolume: audio.musicVolume,
                        ambientSoundId: audio.ambientSoundId,
                        ambientVolume: audio.ambientVolume,
                      };
                      onUpdateAudio({
                        audioPresets: [
                          ...(audio.audioPresets || []),
                          nextPreset,
                        ],
                      });
                      setNewAudioPresetName('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium cursor-pointer"
                  >
                    + Save Mix
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(audio.audioPresets || []).map((ap) => (
                  <button
                    key={ap.id}
                    type="button"
                    onClick={async () => {
                      await soundEngine.resumeContextManually();
                      onUpdateAudio({
                        currentTrackId: ap.musicTrackId,
                        musicVolume: ap.musicVolume,
                        ambientSoundId: ap.ambientSoundId,
                        ambientVolume: ap.ambientVolume,
                        isPlaying: true,
                      });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-500/20 border border-slate-800 hover:border-indigo-400 text-[11px] font-medium text-slate-200 transition-colors cursor-pointer"
                  >
                    🎵 {ap.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Music Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BUILTIN_MUSIC_TRACKS.map((tr) => {
                  const active = audio.currentTrackId === tr.id;
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={async () => {
                        await soundEngine.resumeContextManually();
                        onUpdateAudio({
                          currentTrackId: tr.id,
                          isPlaying:
                            tr.id !== 'silent' ||
                            audio.ambientSoundId !== 'silent',
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-500/25 border-indigo-400 text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">
                        {tr.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {tr.genre}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Ambient Environment Soundscape
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {AMBIENT_SOUNDS.map((snd) => {
                  const active = audio.ambientSoundId === snd.id;
                  return (
                    <button
                      key={snd.id}
                      type="button"
                      onClick={async () => {
                        await soundEngine.resumeContextManually();
                        onUpdateAudio({
                          ambientSoundId: snd.id as AmbientSoundId,
                          isPlaying: true,
                        });
                      }}
                      className={`py-2 px-2 rounded-lg text-xs border transition-colors cursor-pointer truncate ${
                        active
                          ? 'bg-emerald-500/25 border-emerald-400 text-white font-medium'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {snd.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> Music
                  </span>
                  <span className="font-mono-tabular">{audio.musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={audio.musicVolume}
                  onChange={(e) =>
                    onUpdateAudio({ musicVolume: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Ambient</span>
                  <span className="font-mono-tabular">
                    {audio.ambientVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={audio.ambientVolume}
                  onChange={(e) =>
                    onUpdateAudio({ ambientVolume: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Alerts</span>
                  <span className="font-mono-tabular">
                    {audio.notificationVolume ?? 30}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={audio.notificationVolume ?? 30}
                  onChange={(e) =>
                    onUpdateAudio({
                      notificationVolume: Number(e.target.value),
                    })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-sky-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>UI Chimes</span>
                  <span className="font-mono-tabular">
                    {audio.uiSoundVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={audio.uiSoundVolume}
                  onChange={(e) =>
                    onUpdateAudio({ uiSoundVolume: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ui' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Accent Color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {ACCENT_PALETTE.map((sw) => {
                  const active = styleSettings.accentColor === sw.hex;
                  return (
                    <button
                      key={sw.hex}
                      type="button"
                      onClick={() => onUpdateStyle({ accentColor: sw.hex })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium text-white flex items-center gap-1.5 transition-transform cursor-pointer ${
                        active
                          ? 'ring-2 ring-white scale-105'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: sw.hex }}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      <span>{sw.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Typography Style
                </label>
                <select
                  value={styleSettings.fontFamily}
                  onChange={(e) =>
                    onUpdateStyle({
                      fontFamily: e.target.value as StyleSettings['fontFamily'],
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                >
                  <option value="sans">Modern Sans (Plus Jakarta)</option>
                  <option value="pixel">Pixel Art Display (Silkscreen)</option>
                  <option value="mono">Developer Mono (JetBrains Mono)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Default Focus Timer (mins)
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={timer.focusMinutes}
                  onChange={(e) =>
                    onUpdateTimer({
                      focusMinutes: Math.max(5, Number(e.target.value)),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono-tabular"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>UI Text Scale</span>
                  <span className="font-mono-tabular">
                    {styleSettings.uiScale}%
                  </span>
                </div>
                <input
                  type="range"
                  min={90}
                  max={110}
                  step={5}
                  value={styleSettings.uiScale}
                  onChange={(e) =>
                    onUpdateStyle({ uiScale: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Panel Corner Radius</span>
                  <span className="font-mono-tabular">
                    {styleSettings.cornerRadius}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={2}
                  value={styleSettings.cornerRadius}
                  onChange={(e) =>
                    onUpdateStyle({ cornerRadius: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                <span>High Contrast Mode</span>
                <input
                  type="checkbox"
                  checked={styleSettings.highContrast}
                  onChange={(e) =>
                    onUpdateStyle({ highContrast: e.target.checked })
                  }
                  className="accent-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                <span>Reduced Motion</span>
                <input
                  type="checkbox"
                  checked={styleSettings.reducedMotion}
                  onChange={(e) =>
                    onUpdateStyle({ reducedMotion: e.target.checked })
                  }
                  className="accent-indigo-500"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Pixel Art Visual Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PIXEL_STYLES.map((st) => {
                  const active = styleSettings.pixelStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onUpdateStyle({ pixelStyle: st.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-500/25 border-indigo-400 text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>{st.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {st.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Pixel Density / Grain</span>
                  <span className="font-mono-tabular">
                    {styleSettings.pixelDensity}x
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={styleSettings.pixelDensity}
                  onChange={(e) =>
                    onUpdateStyle({ pixelDensity: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Weather Particle Density</span>
                  <span className="font-mono-tabular">
                    {environment.particlesDensity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={environment.particlesDensity}
                  onChange={(e) =>
                    onUpdateEnvironment({
                      particlesDensity: Number(e.target.value),
                    })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                <span>Ambient Lamp Glow</span>
                <input
                  type="checkbox"
                  checked={styleSettings.glowEffects !== false}
                  onChange={(e) =>
                    onUpdateStyle({ glowEffects: e.target.checked })
                  }
                  className="accent-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                <span>CRT Scanline Overlay</span>
                <input
                  type="checkbox"
                  checked={Boolean(styleSettings.screenEffects)}
                  onChange={(e) =>
                    onUpdateStyle({ screenEffects: e.target.checked })
                  }
                  className="accent-indigo-500"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'garden' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  🌱 Progress Garden &amp; Interactive Room Builder
                </h3>
                <p className="text-[11px] text-slate-400">
                  Complete habits &amp; streaks to unlock items. Drag unlocked props directly on the room canvas!
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={environment.showProgressGardenObjects !== false}
                    onChange={(e) =>
                      onUpdateEnvironment({
                        showProgressGardenObjects: e.target.checked,
                      })
                    }
                    className="accent-emerald-500"
                  />
                  <span>Show on Scene</span>
                </label>
                {onResetRoomLayout && (
                  <button
                    type="button"
                    onClick={onResetRoomLayout}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300"
                  >
                    Reset Positions
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Drag & Drop Room Builder Canvas */}
            <div className="relative h-48 rounded-xl overflow-hidden border border-indigo-500/40 shadow-inner">
              <PixelEnvironmentCanvas
                environment={environment}
                styleSettings={styleSettings}
                isFocusTimerRunning={false}
                roomLayout={roomLayout}
                unlockedObjectIds={unlockedObjectIds}
                interactiveBuilder={true}
                onMoveRoomObject={(id, x, y) =>
                  onUpdateRoomObject && onUpdateRoomObject(id, { x, y })
                }
                className="w-full h-full"
              />
              <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-[#0b0f19]/85 border border-white/15 text-[10px] font-medium text-indigo-300 pointer-events-none">
                ✋ Drag unlocked objects to customize your room ({unlockedObjectIds.length}/
                {ROOM_OBJECT_CATALOG.length} unlocked)
              </div>
            </div>

            {/* Catalog of 14 Unlockable Pixel Objects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {ROOM_OBJECT_CATALOG.map((item) => {
                const isUnlocked = unlockedObjectIds.includes(item.id);
                const placement = roomLayout?.[item.id];
                const isVisible = placement ? placement.visible : true;

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors ${
                      isUnlocked
                        ? 'bg-slate-900/90 border-slate-800 text-white'
                        : 'bg-slate-950/60 border-slate-900 text-slate-500 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                        {isUnlocked ? item.icon : '🔒'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {isUnlocked ? item.description : item.unlockRequirementLabel}
                        </div>
                      </div>
                    </div>

                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRoomObject &&
                          onUpdateRoomObject(item.id, { visible: !isVisible })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border shrink-0 ${
                          isVisible
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {isVisible ? 'Visible' : 'Hidden'}
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-amber-400/90 shrink-0">
                        Locked
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
