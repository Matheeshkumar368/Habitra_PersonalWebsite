import React, { useEffect, useRef, useState } from 'react';
import { PIXEL_SCENES, ROOM_OBJECT_CATALOG } from '../constants/scenesAndPresets';
import {
  EnvironmentSettings,
  NavigationTab,
  RoomObjectId,
  RoomObjectPlacement,
  StyleSettings,
  TimeOfDay,
} from '../types/app';

export interface WorldHotspotContext {
  dailyProgressPercent: number;
  completedToday: number;
  totalHabits: number;
  currentStreak: number;
  timerFormatted: string;
  isMusicPlaying: boolean;
  currentTrackTitle: string;
  activeGoalsCount: number;
  worldStageName: string;
  onNavigateTab: (tab: NavigationTab) => void;
  onToggleFocusTimer: () => void;
  onToggleMusicPlay: () => void;
  onOpenJournal: () => void;
  onCycleTimeOfDay: () => void;
  onCycleScenePortal: () => void;
  onScrollToSection?: (sectionId: string) => void;
}

interface PixelEnvironmentCanvasProps {
  environment: EnvironmentSettings;
  styleSettings: StyleSettings;
  isFocusTimerRunning: boolean;
  className?: string;
  compactBanner?: boolean;
  roomLayout?: Record<RoomObjectId, RoomObjectPlacement>;
  unlockedObjectIds?: RoomObjectId[];
  interactiveBuilder?: boolean;
  onMoveRoomObject?: (id: RoomObjectId, x: number, y: number) => void;
  lowPowerBackgroundMode?: boolean;
  hotspotContext?: WorldHotspotContext;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
  kind: 'weather' | 'river' | 'music' | 'spirit';
}

export const PixelEnvironmentCanvas: React.FC<PixelEnvironmentCanvasProps> = ({
  environment,
  styleSettings,
  isFocusTimerRunning,
  className = '',
  compactBanner = false,
  roomLayout,
  unlockedObjectIds = [],
  interactiveBuilder = false,
  onMoveRoomObject,
  lowPowerBackgroundMode = true,
  hotspotContext,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [draggingId, setDraggingId] = useState<RoomObjectId | null>(null);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);

  const scene =
    PIXEL_SCENES.find((s) => s.id === environment.sceneId) || PIXEL_SCENES[0];

  useEffect(() => {
    setImgFailed(false);
  }, [scene.imageUrl, environment.sceneId]);

  // Resolve effective time of day (Morning 6-12, Afternoon 12-17, Evening 17-20, Night 20-6)
  const effectiveTime: Exclude<TimeOfDay, 'auto'> = (() => {
    if (environment.timeOfDay !== 'auto') return environment.timeOfDay;
    const hr = new Date().getHours();
    if (hr >= 6 && hr < 12) return 'morning';
    if (hr >= 12 && hr < 17) return 'afternoon';
    if (hr >= 17 && hr < 20) return 'evening';
    return 'night';
  })();

  const dailyProgress = hotspotContext?.dailyProgressPercent ?? 50;
  const isMusicPlaying = hotspotContext?.isMusicPlaying ?? false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let isDocHidden = typeof document !== 'undefined' && document.hidden;
    let width = (canvas.width = canvas.offsetWidth || 960);
    let height = (canvas.height = canvas.offsetHeight || 420);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 960;
      height = canvas.height = canvas.offsetHeight || 420;
    };

    const handleVisibilityChange = () => {
      isDocHidden = document.hidden;
      if (!isDocHidden && !animId && intensityMultiplier > 0) {
        animId = window.requestAnimationFrame(renderFrame);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intensityMultiplier =
      styleSettings.reducedMotion ||
      environment.animationIntensity === 'off' ||
      styleSettings.animationSpeed === 'off'
        ? 0
        : environment.animationIntensity === 'low'
        ? 0.45
        : environment.animationIntensity === 'high'
        ? 1.45
        : 1.0;

    const focusParticleBoost = isFocusTimerRunning ? 1.25 : 1.0;
    const vitalityBoost = 0.8 + (dailyProgress / 100) * 0.55;
    const densityFactor =
      (environment.particlesDensity / 100) *
      intensityMultiplier *
      focusParticleBoost *
      vitalityBoost;

    const weather = environment.weather;
    const isRain =
      weather === 'rain' || weather === 'heavy_rain' || weather === 'storm';
    const isSnow = weather === 'snow';

    const baseCount = isRain
      ? weather === 'heavy_rain' || weather === 'storm'
        ? 150
        : 85
      : isSnow
      ? 75
      : 48;

    const count = Math.max(0, Math.round(baseCount * densityFactor));
    const pixelStep = Math.max(2, styleSettings.pixelDensity * 2);

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: isRain
        ? -1.5 - Math.random() * 1.2
        : scene.id === 'train_journey' || scene.id === 'train_station'
        ? -2.8 - Math.random() * 2.0
        : (Math.random() - 0.5) * 0.55,
      vy: isRain
        ? (8 + Math.random() * 6) * (isFocusTimerRunning ? 1.15 : 1.0)
        : isSnow
        ? 0.8 + Math.random() * 1.2
        : -0.25 - Math.random() * 0.45,
      size: isRain ? 2 : isSnow ? 3 : 3,
      alpha: 0.3 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      color:
        scene.particleType === 'fireflies'
          ? Math.random() > 0.45
            ? '#2dd4bf'
            : '#fde047'
          : scene.particleType === 'sakura'
          ? '#f9a8d4'
          : scene.id === 'astral_observatory'
          ? '#fbbf24'
          : scene.id === 'mountain_cabin' || scene.id === 'night_library'
          ? '#fb923c'
          : '#e2e8f0',
      kind: 'weather',
    }));

    // Add Bioluminescent River Shimmer particles for Living Worlds scenes
    const riverParticleCount =
      scene.id === 'living_sanctuary' || scene.id === 'floating_garden'
        ? Math.round(28 * intensityMultiplier * vitalityBoost)
        : 0;

    for (let i = 0; i < riverParticleCount; i++) {
      particles.push({
        x: width * (0.58 + Math.random() * 0.24),
        y: height * (0.36 + Math.random() * 0.48),
        vx: (Math.random() - 0.5) * 0.35,
        vy: 0.45 + Math.random() * 0.75,
        size: pixelStep,
        alpha: 0.35 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.35 ? '#2dd4bf' : '#38bdf8',
        kind: 'river',
      });
    }

    let tick = 0;
    let lightningAlpha = 0;

    const renderFrame = () => {
      animId = 0;
      if (lowPowerBackgroundMode && isDocHidden) {
        return;
      }

      tick += 0.022;
      ctx.clearRect(0, 0, width, height);

      // If no image or image failed, render a rich procedural pixel-art scene backdrop
      if (!scene.imageUrl || imgFailed) {
        drawProceduralPixelScene(ctx, width, height, scene.id, tick, pixelStep);
      }

      // Subtle living lantern glow pulses on the canvas when intensityMultiplier > 0
      if (intensityMultiplier > 0 && !compactBanner) {
        const lanternPositions =
          scene.id === 'living_sanctuary'
            ? [
                { x: 0.22, y: 0.2 },
                { x: 0.35, y: 0.14 },
                { x: 0.42, y: 0.08 },
                { x: 0.58, y: 0.08 },
                { x: 0.7, y: 0.14 },
                { x: 0.76, y: 0.16 },
              ]
            : [{ x: 0.48, y: 0.22 }];

        const warmthFactor = 0.65 + (dailyProgress / 100) * 0.5;
        for (let i = 0; i < lanternPositions.length; i++) {
          const lp = lanternPositions[i];
          const flicker = 0.82 + 0.18 * Math.sin(tick * 2.6 + i * 1.7);
          const radius = Math.min(width, height) * 0.11 * flicker * warmthFactor;
          const grad = ctx.createRadialGradient(
            width * lp.x,
            height * lp.y,
            2,
            width * lp.x,
            height * lp.y,
            radius
          );
          grad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
          grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(width * lp.x, height * lp.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bioluminescent river aura pulse based on daily habit completion
        if (scene.id === 'living_sanctuary' || scene.id === 'floating_garden') {
          const riverPulse = 0.75 + 0.25 * Math.sin(tick * 1.5);
          const riverRadius = Math.min(width, height) * 0.28 * riverPulse;
          const rx = scene.id === 'living_sanctuary' ? width * 0.7 : width * 0.34;
          const ry = height * 0.58;
          const rGrad = ctx.createRadialGradient(rx, ry, 6, rx, ry, riverRadius);
          const alphaScale = 0.08 + (dailyProgress / 100) * 0.14;
          rGrad.addColorStop(0, `rgba(45, 212, 191, ${alphaScale})`);
          rGrad.addColorStop(0.6, `rgba(56, 189, 248, ${alphaScale * 0.45})`);
          rGrad.addColorStop(1, 'rgba(45, 212, 191, 0)');
          ctx.fillStyle = rGrad;
          ctx.beginPath();
          ctx.arc(rx, ry, riverRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw animated weather, river & ambient particles
      if (intensityMultiplier > 0) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx * intensityMultiplier;
          p.y += p.vy * intensityMultiplier;

          if (p.kind === 'river') {
            const shimmer = 0.4 + 0.6 * Math.sin(tick * 3.2 + p.phase);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha * shimmer;
            const px = Math.floor(p.x / pixelStep) * pixelStep;
            const py = Math.floor(p.y / pixelStep) * pixelStep;
            ctx.fillRect(px, py, pixelStep, pixelStep * 1.5);
            ctx.globalAlpha = 1;

            if (p.y > height * 0.85) {
              p.y = height * (0.35 + Math.random() * 0.12);
              p.x = width * (0.62 + Math.random() * 0.16);
            }
            continue;
          }

          if (isRain) {
            ctx.fillStyle = `rgba(186, 230, 253, ${p.alpha * 0.55})`;
            const px = Math.floor(p.x / 2) * 2;
            const py = Math.floor(p.y / 2) * 2;
            ctx.fillRect(px, py, 2, weather === 'heavy_rain' ? 16 : 11);
          } else if (isSnow) {
            p.x += Math.sin(tick + p.phase) * 0.4;
            ctx.fillStyle = `rgba(248, 250, 252, ${p.alpha * 0.8})`;
            const px = Math.floor(p.x / pixelStep) * pixelStep;
            const py = Math.floor(p.y / pixelStep) * pixelStep;
            ctx.fillRect(px, py, pixelStep, pixelStep);
          } else {
            // Fireflies / Sakura / Stars / Spirit Motes
            const pulse = 0.45 + 0.55 * Math.sin(tick * 2.2 + p.phase);
            p.x += Math.sin(tick + p.phase) * 0.35;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha * pulse * 0.85;
            const px = Math.floor(p.x / pixelStep) * pixelStep;
            const py = Math.floor(p.y / pixelStep) * pixelStep;
            ctx.fillRect(px, py, pixelStep, pixelStep);
            ctx.globalAlpha = 1;
          }

          // Wrap around
          if (p.y > height + 20) {
            p.y = -15;
            p.x = Math.random() * width;
          } else if (p.y < -20) {
            p.y = height + 15;
            p.x = Math.random() * width;
          }
          if (p.x < -20) p.x = width + 15;
          if (p.x > width + 20) p.x = -15;
        }

        // Occasional subtle lightning flash in storm mode
        if (weather === 'storm') {
          if (Math.random() < 0.003) {
            lightningAlpha = 0.28;
          }
          if (lightningAlpha > 0.01) {
            ctx.fillStyle = `rgba(224, 242, 254, ${lightningAlpha})`;
            ctx.fillRect(0, 0, width, height);
            lightningAlpha *= 0.86;
          }
        }
      }

      if (intensityMultiplier > 0 && !(lowPowerBackgroundMode && isDocHidden)) {
        animId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animId) window.cancelAnimationFrame(animId);
    };
  }, [
    scene.id,
    scene.imageUrl,
    scene.particleType,
    imgFailed,
    environment.weather,
    environment.animationIntensity,
    environment.particlesDensity,
    styleSettings.pixelDensity,
    styleSettings.reducedMotion,
    styleSettings.animationSpeed,
    isFocusTimerRunning,
    lowPowerBackgroundMode,
    dailyProgress,
    compactBanner,
  ]);

  // Drag handling for interactive Room Builder mode
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactiveBuilder || !draggingId || !onMoveRoomObject || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.round(Math.max(8, Math.min(92, rawX)));
    const clampedY = Math.round(Math.max(12, Math.min(86, rawY)));
    onMoveRoomObject(draggingId, clampedX, clampedY);
  };

  // Compute time-of-day & warmth overlay filters
  const timeOverlayStyle = (() => {
    switch (effectiveTime) {
      case 'morning':
        return 'rgba(254, 243, 199, 0.12)';
      case 'afternoon':
        return 'rgba(224, 242, 254, 0.06)';
      case 'evening':
        return 'rgba(251, 146, 60, 0.14)';
      case 'night':
      default:
        return isFocusTimerRunning
          ? 'rgba(6, 11, 25, 0.32)'
          : 'rgba(10, 15, 29, 0.18)';
    }
  })();

  const warmthDelta = environment.lightingWarmth - 50; // -50 (cool) to +50 (warm)
  const focusWarmthBoost = isFocusTimerRunning ? 16 : 0;
  const effectiveWarmth = Math.min(65, Math.max(-50, warmthDelta + focusWarmthBoost));

  const warmthColor =
    effectiveWarmth >= 0
      ? `rgba(245, 158, 11, ${(effectiveWarmth / 100) * 0.22})`
      : `rgba(56, 189, 248, ${(Math.abs(effectiveWarmth) / 100) * 0.2})`;

  const showGardenObjects =
    environment.showProgressGardenObjects !== false &&
    roomLayout &&
    unlockedObjectIds.length > 0 &&
    interactiveBuilder;

  const showInteractiveHotspots =
    !compactBanner &&
    !interactiveBuilder &&
    environment.showWorldHotspots !== false &&
    Boolean(hotspotContext);

  // Define interactive hotspots positioned naturally over the fantasy workspace objects
  const worldHotspots = hotspotContext
    ? [
        {
          id: 'hotspot_focus_monitor',
          x: 50,
          y: 66,
          icon: '🖥️',
          label: 'Focus Terminal',
          stateText: isFocusTimerRunning
            ? `Focusing · ${hotspotContext.timerFormatted}`
            : `Ready · ${hotspotContext.timerFormatted}`,
          actionLabel: isFocusTimerRunning ? 'Open Focus Studio' : 'Start Focus Session',
          accent: '#2dd4bf',
          onClick: () => hotspotContext.onNavigateTab('timer'),
          onQuickAction: hotspotContext.onToggleFocusTimer,
          quickActionText: isFocusTimerRunning ? 'Pause Timer' : 'Start Timer',
        },
        {
          id: 'hotspot_gramophone',
          x: 62.5,
          y: 64,
          icon: isMusicPlaying ? '🎶' : '🎺',
          label: 'Sanctuary Gramophone',
          stateText: isMusicPlaying
            ? `Playing · ${hotspotContext.currentTrackTitle}`
            : `Paused · ${hotspotContext.currentTrackTitle}`,
          actionLabel: 'Open Music Library',
          accent: '#f59e0b',
          onClick: () => hotspotContext.onNavigateTab('music'),
          onQuickAction: hotspotContext.onToggleMusicPlay,
          quickActionText: isMusicPlaying ? 'Pause Music' : 'Play Music',
        },
        {
          id: 'hotspot_grimoire',
          x: 49,
          y: 81,
          icon: '📖',
          label: 'Ritual Grimoire & Journal',
          stateText: `${hotspotContext.completedToday}/${hotspotContext.totalHabits} Habits Today`,
          actionLabel: 'Open Daily Journal',
          accent: '#fb923c',
          onClick: hotspotContext.onOpenJournal,
          onQuickAction: () => hotspotContext.onNavigateTab('habits'),
          quickActionText: 'Manage Habits',
        },
        {
          id: 'hotspot_living_flora',
          x: 37,
          y: 65,
          icon: '🌿',
          label: 'Bioluminescent Flora',
          stateText: `${hotspotContext.worldStageName} · ${hotspotContext.currentStreak}d Streak`,
          actionLabel: 'Inspect Living Garden',
          accent: '#10b981',
          onClick: () => {
            if (hotspotContext.onScrollToSection) {
              hotspotContext.onScrollToSection('living-habit-garden');
            } else {
              hotspotContext.onNavigateTab('myspace');
            }
          },
        },
        {
          id: 'hotspot_river_portal',
          x: 71,
          y: 46,
          icon: '🌊',
          label: 'Realm River Portal',
          stateText: `${scene.name} · ${environment.weather.replace('_', ' ')}`,
          actionLabel: 'Travel to Next Realm',
          accent: '#38bdf8',
          onClick: hotspotContext.onCycleScenePortal,
          onQuickAction: () => {
            if (hotspotContext.onScrollToSection) {
              hotspotContext.onScrollToSection('living-realm-portals');
            } else {
              hotspotContext.onNavigateTab('myspace');
            }
          },
          quickActionText: 'All Realm Portals',
        },
        {
          id: 'hotspot_lanterns',
          x: 42.5,
          y: 13,
          icon: '🏮',
          label: 'Sanctuary Lanterns',
          stateText: `Time: ${effectiveTime} · Warmth ${environment.lightingWarmth}%`,
          actionLabel: 'Cycle Time of Day',
          accent: '#fbbf24',
          onClick: hotspotContext.onCycleTimeOfDay,
        },
        {
          id: 'hotspot_astral_spire',
          x: 31.5,
          y: 28,
          icon: '🏰',
          label: 'Citadel of Goals',
          stateText: `${hotspotContext.activeGoalsCount} Active Milestones`,
          actionLabel: 'Open Goals & Quests',
          accent: '#a855f7',
          onClick: () => hotspotContext.onNavigateTab('goals'),
        },
      ]
    : [];

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDraggingId(null)}
      onPointerLeave={() => setDraggingId(null)}
      className={`relative overflow-hidden select-none ${className}`}
      style={{
        background: `linear-gradient(160deg, ${scene.skyGradient[0]}, ${scene.skyGradient[1]}, ${scene.skyGradient[2]})`,
      }}
    >
      {/* Generated Pixel Art Scene Image with Zero-Broken-Image fallback */}
      {scene.imageUrl && !imgFailed && (
        <img
          src={scene.imageUrl}
          alt={`${scene.name} — ${scene.subtitle}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`w-full h-full object-cover object-center transition-transform duration-700 ${
            styleSettings.pixelDensity >= 3 ? 'pixelated' : ''
          } ${isFocusTimerRunning ? 'scale-[1.02]' : 'scale-100'}`}
        />
      )}

      {/* Time of Day & Warm/Cool Lighting Tint */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: timeOverlayStyle }}
      />
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: warmthColor }}
      />

      {/* Interactive Weather, River Shimmer & Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Interactive Diegetic World Hotspots */}
      {showInteractiveHotspots && (
        <div className="absolute inset-0 z-20 pointer-events-none hidden sm:block">
          {worldHotspots.map((spot) => {
            const isHovered = hoveredHotspotId === spot.id;
            return (
              <div
                key={spot.id}
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseEnter={() => setHoveredHotspotId(spot.id)}
                onMouseLeave={() =>
                  setHoveredHotspotId((prev) => (prev === spot.id ? null : prev))
                }
                className="absolute pointer-events-auto"
              >
                {/* Hotspot Interactive Node */}
                <button
                  type="button"
                  onClick={spot.onClick}
                  aria-label={`${spot.label}: ${spot.actionLabel}`}
                  className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-900/95 border border-white/20 hover:border-teal-400/70 shadow-lg backdrop-blur-md transition-all duration-150 hover:scale-105 cursor-pointer"
                >
                  <span className="text-xs leading-none">{spot.icon}</span>
                  <span className="text-[11px] font-medium text-slate-100 whitespace-nowrap">
                    {spot.id === 'hotspot_focus_monitor'
                      ? hotspotContext?.timerFormatted
                      : spot.label.split(' ')[1] || spot.label}
                  </span>
                </button>

                {/* Rich Diegetic Inspection Popover on Hover */}
                {isHovered && (
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 ${
                      spot.y > 60 ? 'bottom-full mb-2' : 'top-full mt-2'
                    } w-56 p-3 rounded-xl bg-slate-950/95 border border-slate-700/90 shadow-2xl backdrop-blur-xl text-left z-30`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-white truncate">
                        {spot.label}
                      </span>
                      <span className="text-xs">{spot.icon}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-mono-tabular mb-2.5 truncate">
                      {spot.stateText}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={spot.onClick}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/35 border border-teal-400/40 text-teal-200 text-[11px] font-semibold text-center transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {spot.actionLabel}
                      </button>
                      {spot.onQuickAction && spot.quickActionText && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            spot.onQuickAction?.();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {spot.quickActionText}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Garden & Room Builder Objects (When in Builder or Custom Object Mode) */}
      {showGardenObjects && roomLayout && (
        <div
          className={`absolute inset-0 ${
            interactiveBuilder ? 'z-20' : 'z-10 pointer-events-none'
          }`}
        >
          {ROOM_OBJECT_CATALOG.map((item) => {
            if (!unlockedObjectIds.includes(item.id)) return null;
            const placement = roomLayout[item.id];
            if (!placement || !placement.visible) return null;

            return (
              <div
                key={item.id}
                onPointerDown={(e) => {
                  if (!interactiveBuilder) return;
                  e.stopPropagation();
                  setDraggingId(item.id);
                }}
                style={{
                  left: `${placement.x}%`,
                  top: `${placement.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={
                  interactiveBuilder
                    ? `${item.name} — Drag to reposition in your room`
                    : `${item.name}`
                }
                className={`absolute flex flex-col items-center transition-transform ${
                  interactiveBuilder
                    ? 'cursor-grab active:cursor-grabbing hover:scale-110 pointer-events-auto'
                    : 'pointer-events-none'
                }`}
              >
                <div
                  className={`flex items-center justify-center rounded-xl backdrop-blur-md transition-all ${
                    compactBanner ? 'w-7 h-7 text-base' : 'w-10 h-10 text-xl'
                  } ${
                    interactiveBuilder
                      ? 'bg-[#0b0f19]/80 border-2 border-indigo-400/70 shadow-lg shadow-indigo-500/20'
                      : 'bg-[#0b0f19]/45 border border-white/15 shadow-md'
                  }`}
                >
                  <span>{item.icon}</span>
                </div>
                {interactiveBuilder && (
                  <span className="mt-1 px-1.5 py-0.5 rounded bg-[#0b0f19]/90 border border-white/15 text-[9px] font-medium text-slate-200 whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Optional Retro Scanline Overlay */}
      {(styleSettings.screenEffects ||
        styleSettings.pixelStyle === 'retro16' ||
        styleSettings.pixelStyle === 'cyber' ||
        styleSettings.pixelStyle === 'classic') && (
        <div className="absolute inset-0 pointer-events-none pixel-scanlines opacity-50" />
      )}

      {/* Measured Scrim for High-Contrast Text Readability */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          compactBanner
            ? 'bg-gradient-to-r from-[#0b0f19]/90 via-[#0b0f19]/45 to-[#0b0f19]/75'
            : 'bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/25 to-[#0b0f19]/30'
        }`}
      />
    </div>
  );
};

// Procedural pixel-art fallback & custom scene renderer for scenes without static image (e.g. Space Station, Sunset Beach)
function drawProceduralPixelScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sceneId: string,
  tick: number,
  pxSize: number
) {
  const step = Math.max(4, pxSize * 2);

  if (sceneId === 'space_station') {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 60; i++) {
      const sx = (i * 137) % w;
      const sy = (i * 89) % (h * 0.8);
      const twinkle = 0.4 + 0.6 * Math.sin(tick * 2 + i);
      ctx.fillStyle = `rgba(226, 232, 240, ${twinkle})`;
      ctx.fillRect(Math.floor(sx / 3) * 3, Math.floor(sy / 3) * 3, 3, 3);
    }

    const cx = w * 0.65;
    const cy = h * 1.35;
    const r = h * 0.95;
    const grad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
    grad.addColorStop(0, '#1d4ed8');
    grad.addColorStop(0.7, '#0ea5e9');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    sky.addColorStop(0, '#1e1b4b');
    sky.addColorStop(0.5, '#7c2d12');
    sky.addColorStop(1, '#f97316');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.65);

    const sunR = Math.min(w, h) * 0.14;
    ctx.fillStyle = '#fde047';
    for (let y = -sunR; y <= sunR; y += step) {
      for (let x = -sunR; x <= sunR; x += step) {
        if (x * x + y * y <= sunR * sunR) {
          ctx.fillRect(w * 0.55 + x, h * 0.42 + y, step, step);
        }
      }
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, h * 0.65, w, h * 0.35);

    for (let row = 0; row < 10; row++) {
      const wy = h * 0.67 + row * step * 1.8;
      const waveWidth = Math.max(20, 120 - row * 8);
      const offset = Math.sin(tick * 2 + row) * 14;
      ctx.fillStyle = row < 4 ? '#fb923c' : '#38bdf8';
      ctx.globalAlpha = 0.55 - row * 0.04;
      ctx.fillRect(w * 0.55 - waveWidth / 2 + offset, wy, waveWidth, step);
    }
    ctx.globalAlpha = 1;
  }
}
