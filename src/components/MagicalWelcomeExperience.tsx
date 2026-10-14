import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Volume2, VolumeX, ArrowRight, Compass, Eye, ShieldCheck } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { HabitraLogo } from './HabitraLogo';

interface MagicalWelcomeExperienceProps {
  isOpen: boolean;
  onEnterWorld: () => void;
  onSkip: () => void;
  accentColor?: string;
  userName?: string;
}

type Stage = 'awakening' | 'alive' | 'identity' | 'ready';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  baseOpacity: number;
  color: string;
  pulseSpeed: number;
  pulsePhase: number;
}

export const MagicalWelcomeExperience: React.FC<MagicalWelcomeExperienceProps> = ({
  isOpen,
  onEnterWorld,
  onSkip,
  accentColor = '#6366f1',
  userName,
}) => {
  const [stage, setStage] = useState<Stage>('awakening');
  const [isEntering, setIsEntering] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  
  // Parallax coordinates (-1 to 1)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Timed stage progression
  useEffect(() => {
    if (!isOpen) return;

    if (reducedMotion) {
      setStage('ready');
      return;
    }

    // Stage progression timers
    const timer1 = setTimeout(() => {
      setStage((prev) => (prev === 'awakening' ? 'alive' : prev));
    }, 2800);

    const timer2 = setTimeout(() => {
      setStage((prev) => (prev === 'awakening' || prev === 'alive' ? 'identity' : prev));
    }, 5600);

    const timer3 = setTimeout(() => {
      setStage('ready');
    }, 7800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isOpen, reducedMotion]);

  // Pointer move for subtle parallax depth
  const handlePointerMove = (e: React.PointerEvent) => {
    if (reducedMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setMousePos({ x, y });
  };

  // Canvas pixel stardust & magical motes
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleColors = [
      '#a78bfa', // soft violet
      '#6ee7b7', // soft mint
      '#38bdf8', // soft cyan
      '#fbbf24', // golden star
      '#e0e7ff', // starlight white
    ];

    const particles: Particle[] = Array.from({ length: 48 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.2 ? 3 : Math.random() < 0.6 ? 2 : 1.5,
      speedY: -(0.2 + Math.random() * 0.4),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.7 + 0.2,
      baseOpacity: Math.random() * 0.6 + 0.3,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
      pulseSpeed: 0.02 + Math.random() * 0.03,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    let frameCount = 0;
    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // Draw subtle twinkling pixel particles
      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX;
        p.pulsePhase += p.pulseSpeed;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const dynamicOpacity = Math.max(0.1, Math.min(1, p.baseOpacity + Math.sin(p.pulsePhase) * 0.25));

        ctx.fillStyle = p.color;
        ctx.globalAlpha = dynamicOpacity;
        // Crisp pixel rendering (snapped to integer coordinates)
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);

        // Soft halo on larger particles
        if (p.size >= 2.5) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = dynamicOpacity * 0.25;
          ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), p.size + 2, p.size + 2);
        }
      }

      ctx.globalAlpha = 1.0;
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen]);

  // Handle Enter World with magical dissolution transition
  const handleEnter = () => {
    if (isEntering) return;
    setIsEntering(true);
    if (soundEnabled) {
      soundEngine.playRealmTravel();
    } else {
      soundEngine.playUiClick();
    }

    setTimeout(() => {
      onEnterWorld();
      setIsEntering(false);
    }, 850);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      soundEngine.playNotification('success');
    }
  };

  if (!isOpen) return null;

  // Parallax offsets
  const pxBg = mousePos.x * 6;
  const pyBg = mousePos.y * 6;
  const pxMid = mousePos.x * -12;
  const pyMid = mousePos.y * -10;
  const pxFore = mousePos.x * -20;
  const pyFore = mousePos.y * -16;

  const isAwakening = stage === 'awakening';
  const isAliveOrLater = stage === 'alive' || stage === 'identity' || stage === 'ready';
  const isIdentityOrLater = stage === 'identity' || stage === 'ready';
  const isReady = stage === 'ready';

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden select-none transition-all duration-700 ${
        isEntering ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 45%, #0e162e 0%, #080c1a 60%, #03050c 100%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Habitra"
    >
      {/* Background canvas for lightweight pixel stardust */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Atmospheric ambient lighting gradients */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
        style={{
          transform: `translate(${pxBg}px, ${pyBg}px)`,
          opacity: isAliveOrLater ? 0.9 : 0.4,
          background: `
            radial-gradient(ellipse 600px 380px at 50% 50%, rgba(99, 102, 241, 0.18) 0%, transparent 70%),
            radial-gradient(ellipse 450px 300px at 48% 54%, rgba(16, 185, 129, 0.12) 0%, transparent 65%),
            radial-gradient(ellipse 700px 500px at 52% 46%, rgba(139, 92, 246, 0.14) 0%, transparent 80%)
          `,
        }}
      />

      {/* Ambient scanline texture for authentic retro pixel aesthetic */}
      <div className="absolute inset-0 pixel-scanlines opacity-40 pointer-events-none z-0" />

      {/* Top action bar: Skip Intro & Sound toggle */}
      <div className="absolute top-6 left-6 right-6 z-40 flex items-center justify-between text-xs">
        {/* Sound toggle button */}
        <button
          type="button"
          onClick={handleToggleSound}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-md shadow-sm"
          title={soundEnabled ? 'Mute welcome sound' : 'Enable ambient sound'}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Chimes On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span>Sound Off</span>
            </>
          )}
        </button>

        {/* Quick Skip button */}
        <button
          type="button"
          onClick={onSkip}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60 text-slate-400 hover:text-slate-200 transition-all cursor-pointer backdrop-blur-xs"
        >
          <span>Skip intro</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Centerpiece Stage Container */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-2xl w-full px-6 text-center">
        {/* =========================================================================
            STAGE C: Habitra Identity (Logo, Name, Tagline)
            ========================================================================= */}
        <div
          className={`transition-all duration-1000 mb-6 ${
            isIdentityOrLater ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'
          }`}
          style={{ transform: isIdentityOrLater ? `translate(${pxFore * 0.4}px, ${pyFore * 0.4}px)` : undefined }}
        >
          {/* Official Habitra Logo (Icon + Wordmark + Subtitle) */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <HabitraLogo variant="full" size="lg" />
          </div>

          {/* Exact Tagline with celestial shimmer effect */}
          <div className="relative inline-block overflow-hidden py-1">
            <p className="text-sm md:text-base font-medium tracking-wide text-indigo-200/90">
              Small Habits. <span className="text-emerald-300 font-semibold">Big Life.</span>
            </p>
            {/* Gentle light bar passing across tagline */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-300/25 to-transparent -translate-x-full animate-[shimmer_4s_2s_infinite]" />
          </div>
        </div>

        {/* =========================================================================
            STAGE A & B: The Awakening Portal & Living World Island
            ========================================================================= */}
        <div
          className="relative w-72 h-72 md:w-88 md:h-88 flex items-center justify-center my-2"
          style={{
            transform: `translate(${pxMid}px, ${pyMid}px)`,
          }}
        >
          {/* Outer Mystic Portal Ring (Stage A) */}
          <div
            className={`absolute inset-0 rounded-full border-2 transition-all duration-1000 ${
              isAwakening
                ? 'border-indigo-500/30 scale-90 opacity-60 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                : 'border-indigo-400/70 scale-100 opacity-90 shadow-[0_0_50px_rgba(99,102,241,0.45)]'
            }`}
            style={{
              boxShadow: isAliveOrLater
                ? '0 0 60px rgba(99, 102, 241, 0.4), inset 0 0 40px rgba(16, 185, 129, 0.25)'
                : undefined,
            }}
          >
            {/* Concentric rotating rune orbit */}
            <div className="absolute inset-1 rounded-full border border-teal-500/25 border-dashed animate-[spin_40s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border border-violet-500/20 animate-[spin_30s_linear_infinite_reverse]" />

            {/* Cardinal magical energy nodes */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 rounded-sm shadow-[0_0_10px_#34d399] rotate-45" />
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-400 rounded-sm shadow-[0_0_10px_#818cf8] rotate-45" />
            <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-teal-400 rounded-sm shadow-[0_0_10px_#2dd4bf] rotate-45" />
            <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-violet-400 rounded-sm shadow-[0_0_10px_#a78bfa] rotate-45" />
          </div>

          {/* Portal Gateway Mask with Living World Inside */}
          <div
            className={`relative w-64 h-64 md:w-76 md:h-76 rounded-full overflow-hidden transition-all duration-1000 ${
              isAwakening
                ? 'scale-75 opacity-40 bg-indigo-950/40 backdrop-blur-xs'
                : 'scale-100 opacity-100 bg-[#090d1f] shadow-inner'
            }`}
          >
            {/* Deep portal starry sky background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#060814] via-[#0d1428] to-[#111936]">
              {/* Twinkling star cluster inside portal */}
              <div className="absolute top-6 left-12 w-1.5 h-1.5 bg-indigo-200 rounded-full animate-ping" />
              <div className="absolute top-14 right-16 w-1 h-1 bg-teal-200 rounded-full animate-pulse" />
              <div className="absolute top-20 left-20 w-1 h-1 bg-amber-200 rounded-full animate-pulse" />
              <div className="absolute top-10 right-28 w-2 h-2 bg-violet-300/80 rounded-full shadow-[0_0_8px_#c4b5fd]" />
            </div>

            {/* Glowing crescent moon & nebula aura */}
            <div className="absolute top-4 right-12 w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500/20 via-teal-400/20 to-transparent blur-md pointer-events-none" />

            {/* Soft drifting pixel clouds */}
            <div className="absolute top-16 -left-10 w-32 h-6 bg-indigo-400/10 rounded-full blur-xs animate-[drift_14s_linear_infinite]" />
            <div className="absolute top-24 -right-8 w-28 h-5 bg-teal-400/10 rounded-full blur-xs animate-[drift_18s_linear_infinite_reverse]" />

            {/* =========================================================================
                STAGE B: Miniature Floating Island & Growing Sprout
                ========================================================================= */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${
                isAliveOrLater ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-8'
              }`}
            >
              {/* Floating Island Group with gentle bobbing animation */}
              <div className="relative flex flex-col items-center animate-[float_4.5s_ease-in-out_infinite]">
                {/* Growing Sprout on top of the island */}
                <div className="relative mb-[-4px] z-10 flex flex-col items-center">
                  {/* Sprout's glowing energy aura */}
                  <div
                    className={`absolute -top-3 w-12 h-12 rounded-full bg-emerald-400/25 blur-md transition-all duration-1000 ${
                      isAliveOrLater ? 'scale-100 opacity-90' : 'scale-0 opacity-0'
                    }`}
                  />

                  {/* SVG Pixel Sprout with growth animation */}
                  <svg
                    viewBox="0 0 64 64"
                    className={`w-14 h-14 md:w-16 md:h-16 transition-all duration-1000 origin-bottom ${
                      isAliveOrLater ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`}
                  >
                    <defs>
                      <linearGradient id="sproutGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="60%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>

                    {/* Stem */}
                    <rect x="30" y="28" width="4" height="24" rx="2" fill="url(#sproutGrad)" />

                    {/* Left Sprout Leaf (growing out) */}
                    <path
                      d="M30 40 C20 40 16 30 24 26 C28 26 30 34 30 40 Z"
                      fill="#34d399"
                      className="origin-bottom-right animate-[leafWiggle_3s_ease-in-out_infinite]"
                    />

                    {/* Right Sprout Leaf (unfurling) */}
                    <path
                      d="M34 34 C44 34 48 24 40 20 C36 20 34 28 34 34 Z"
                      fill="#6ee7b7"
                      className="origin-bottom-left animate-[leafWiggle_3s_ease-in-out_infinite_reverse]"
                    />

                    {/* Golden Bud / Flower at tip */}
                    <circle
                      cx="32"
                      cy="24"
                      r="4.5"
                      fill="#fde047"
                      className="animate-pulse shadow-[0_0_12px_#fde047]"
                    />
                    <circle cx="32" cy="24" r="2" fill="#fff" />

                    {/* Rising sparkle motes */}
                    <rect x="22" y="16" width="2" height="2" fill="#38bdf8" className="animate-ping" />
                    <rect x="42" y="14" width="2" height="2" fill="#fbbf24" className="animate-ping" />
                  </svg>
                </div>

                {/* The Floating Island Base (Multi-layered pixel land) */}
                <div className="relative z-0 flex flex-col items-center">
                  {/* Top Grass Plateau with rich emerald and teal foliage */}
                  <div className="relative w-44 h-9 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-t-xl border-t border-emerald-300/60 shadow-[0_2px_12px_rgba(16,185,129,0.3)]">
                    {/* Tiny Pixel Grass Blades */}
                    <div className="absolute -top-1.5 left-6 w-2 h-2 bg-emerald-300 rounded-t-xs" />
                    <div className="absolute -top-1.5 left-10 w-2.5 h-2 bg-emerald-400 rounded-t-xs" />
                    <div className="absolute -top-1.5 right-8 w-2 h-2 bg-emerald-300 rounded-t-xs" />
                    <div className="absolute -top-1.5 right-14 w-2 h-2 bg-teal-300 rounded-t-xs" />

                    {/* Cozy Pixel Lantern on the edge of the island */}
                    <div className="absolute -top-5 right-5 flex flex-col items-center">
                      {/* Lantern pole */}
                      <div className="w-0.5 h-3 bg-amber-900" />
                      {/* Lantern box */}
                      <div className="w-2.5 h-3 bg-amber-950 border border-amber-600/80 rounded-xs flex items-center justify-center relative">
                        <div className="w-1.5 h-1.5 bg-amber-300 rounded-full animate-pulse shadow-[0_0_8px_#f59e0b]" />
                      </div>
                    </div>
                  </div>

                  {/* Earth & Rock Strata (under-island) */}
                  <div
                    className="w-40 h-10 bg-gradient-to-b from-[#2d1b14] via-[#1f130d] to-[#120a07] rounded-b-2xl border-t border-amber-950/40 relative overflow-hidden"
                    style={{
                      clipPath: 'polygon(0% 0%, 100% 0%, 82% 100%, 18% 100%)',
                    }}
                  >
                    {/* Pixel rock highlights */}
                    <div className="absolute top-2 left-6 w-3 h-1.5 bg-amber-900/60 rounded-xs" />
                    <div className="absolute top-4 right-8 w-4 h-1.5 bg-amber-900/40 rounded-xs" />
                    <div className="absolute top-6 left-12 w-2 h-1 bg-amber-950 rounded-xs" />
                  </div>

                  {/* Hanging roots / stalactite points */}
                  <div className="flex gap-4 -mt-1">
                    <div className="w-1.5 h-3 bg-[#1a0e0a] rounded-b-xs" />
                    <div className="w-2 h-5 bg-[#170c08] rounded-b-xs" />
                    <div className="w-1.5 h-2.5 bg-[#1a0e0a] rounded-b-xs" />
                  </div>

                  {/* Island Shadow in portal bottom */}
                  <div className="w-28 h-3 bg-indigo-950/60 rounded-full blur-xs mt-2" />
                </div>

                {/* Tiny orbiting satellite rocks */}
                <div className="absolute -left-6 top-8 w-3 h-3 bg-slate-700 border border-slate-600 rounded-xs rotate-12 animate-[float_3.2s_ease-in-out_infinite_reverse]" />
                <div className="absolute -right-5 top-12 w-2.5 h-2.5 bg-slate-800 border border-slate-700 rounded-xs -rotate-12 animate-[float_4s_ease-in-out_infinite]" />
              </div>
            </div>

            {/* Stage A Awakening Portal Ring shimmer */}
            {isAwakening && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full border border-indigo-400 animate-ping opacity-60" />
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            STAGE D: "Enter Your World" Animated Button & Guidance
            ========================================================================= */}
        <div
          className={`mt-4 flex flex-col items-center gap-3 transition-all duration-1000 ${
            isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          {/* Welcome User Greeting if present */}
          {userName && (
            <div className="text-xs text-indigo-300/80 font-mono flex items-center gap-1.5">
              <span>Welcome back,</span>
              <span className="font-semibold text-white">{userName}</span>
            </div>
          )}

          {/* Primary Call to Action: "Enter Your World" */}
          <button
            type="button"
            onClick={handleEnter}
            disabled={isEntering}
            className="group relative px-8 py-3.5 rounded-xl font-bold text-sm md:text-base text-white tracking-wide cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.7)] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #10b981 100%)',
            }}
          >
            {/* Background animated radiance */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Shimmer line across button */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

            <div className="relative flex items-center justify-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-200 group-hover:rotate-12 transition-transform duration-300" />
              <span>Enter Your World</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </button>

          {/* Quiet reassurance label */}
          <p className="text-[11px] text-slate-400/80 max-w-xs mt-1 leading-relaxed">
            Local-first ambient productivity · 100% offline private space
          </p>
        </div>

        {/* Stage Progress Scrubbing Dots (Allowing seamless inspection of stages) */}
        <div className="mt-6 flex items-center gap-2">
          {(['awakening', 'alive', 'identity', 'ready'] as Stage[]).map((stg, i) => {
            const isActive = stage === stg;
            const isPassed =
              (stg === 'awakening') ||
              (stg === 'alive' && isAliveOrLater) ||
              (stg === 'identity' && isIdentityOrLater) ||
              (stg === 'ready' && isReady);

            return (
              <button
                key={stg}
                type="button"
                onClick={() => setStage(stg)}
                title={`Stage ${i + 1}: ${stg.charAt(0).toUpperCase() + stg.slice(1)}`}
                className={`transition-all cursor-pointer rounded-full ${
                  isActive
                    ? 'w-6 h-1.5 bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : isPassed
                    ? 'w-2 h-1.5 bg-indigo-400/70 hover:bg-indigo-300'
                    : 'w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Custom Keyframe Styles for Floating & Shimmer Effects */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes leafWiggle {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(4deg);
          }
        }

        @keyframes drift {
          0% {
            transform: translateX(-30px);
            opacity: 0;
          }
          20% {
            opacity: 0.6;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            transform: translateX(30px);
            opacity: 0;
          }
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};
