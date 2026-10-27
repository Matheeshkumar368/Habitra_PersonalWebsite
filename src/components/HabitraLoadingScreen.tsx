import React, { useEffect, useState } from 'react';
import { HabitraLogo } from './HabitraLogo';
import { Sparkles } from 'lucide-react';

interface HabitraLoadingScreenProps {
  statusText?: string;
  accentColor?: string;
}

export const HabitraLoadingScreen: React.FC<HabitraLoadingScreenProps> = ({
  statusText = 'Restoring local sanctuary & habits...',
  accentColor = '#6366f1',
}) => {
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulsePhase((p) => (p + 1) % 4);
    }, 700);
    return () => clearInterval(timer);
  }, []);

  const subtleHints = [
    'Restoring local sanctuary & habits...',
    'Connecting offline ambient soundscapes...',
    'Loading personal productivity matrix...',
    'Preparing your private space...',
  ];

  const currentHint = subtleHints[pulsePhase] || statusText;

  return (
    <div
      role="alert"
      aria-busy="true"
      aria-label="Loading Habitra Workspace"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090d19] text-white select-none overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 38%, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.8) 55%, #070a14 100%)',
      }}
    >
      {/* Background Pixel-Art Ambient Starfield */}
      <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
        {[
          { top: '15%', left: '12%', size: 'w-1.5 h-1.5', delay: '0s' },
          { top: '22%', left: '82%', size: 'w-1 h-1', delay: '1s' },
          { top: '35%', left: '24%', size: 'w-2 h-2', delay: '1.5s' },
          { top: '48%', left: '76%', size: 'w-1.5 h-1.5', delay: '0.5s' },
          { top: '65%', left: '18%', size: 'w-1 h-1', delay: '2s' },
          { top: '78%', left: '85%', size: 'w-2 h-2', delay: '0.8s' },
          { top: '82%', left: '38%', size: 'w-1.5 h-1.5', delay: '1.2s' },
          { top: '18%', left: '45%', size: 'w-1 h-1', delay: '2.5s' },
        ].map((star, idx) => (
          <div
            key={idx}
            className={`absolute ${star.size} rounded-sm bg-indigo-200 animate-pulse`}
            style={{
              top: star.top,
              left: star.left,
              animationDelay: star.delay,
              boxShadow: '0 0 8px rgba(199, 210, 254, 0.8)',
            }}
          />
        ))}
      </div>

      {/* Center Sanctuary Emblem Card */}
      <div className="relative flex flex-col items-center text-center p-8 max-w-sm w-full z-10">
        {/* Glow Ring Behind Logo */}
        <div
          className="absolute -inset-4 rounded-3xl opacity-25 blur-2xl transition-all duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, rgba(249, 115, 22, 0.4) 60%, transparent 80%)`,
          }}
        />

        {/* Pixel Sanctuary Sprout Graphic */}
        <div className="relative mb-5 transform transition-transform duration-500 hover:scale-105">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/60 shadow-2xl backdrop-blur-xl flex items-center justify-center">
            <HabitraLogo variant="icon" size="xl" />
          </div>

          {/* Floating Sparkle Badge */}
          <div
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center border border-white/20 shadow-md animate-bounce"
            style={{ backgroundColor: accentColor }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Title & Tagline */}
        <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1 drop-shadow-md">
          Habitra
        </h1>
        <p className="text-xs font-medium text-slate-400 tracking-wider uppercase font-mono mb-6">
          Small Habits. Big Life.
        </p>

        {/* Smooth Emerald-to-Indigo Loading Track */}
        <div className="w-56 h-1.5 rounded-full bg-slate-800/80 overflow-hidden relative border border-slate-700/50 shadow-inner mb-3">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${(pulsePhase + 1) * 25}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
              boxShadow: '0 0 10px rgba(99, 102, 241, 0.6)',
            }}
          />
        </div>

        {/* Real-time Status Text */}
        <div className="text-[11px] font-mono text-slate-400 h-4 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>{currentHint}</span>
        </div>

        {/* Privacy reassurance footnote */}
        <div className="mt-8 text-[10px] text-slate-500 font-mono">
          100% Local-First · Zero Cloud Dependence · Private
        </div>
      </div>
    </div>
  );
};
