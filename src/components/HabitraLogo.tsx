import React from 'react';

export interface HabitraLogoProps {
  /**
   * 'full': Icon + "Habitra" + "HABIT TRACKER" subtitle
   * 'compact': Icon + "Habitra" title
   * 'icon': Icon squircle mark only
   * 'banner': Full card banner with dark navy background
   */
  variant?: 'full' | 'compact' | 'icon' | 'banner';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  title?: string;
}

export const HabitraLogo: React.FC<HabitraLogoProps> = ({
  variant = 'compact',
  size = 'md',
  className = '',
  onClick,
  title = 'Habitra — Small Habits. Big Life.',
}) => {
  // Sizing definitions
  const iconDimensions = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-8 h-8 rounded-xl',
    lg: 'w-10 h-10 rounded-2xl',
    xl: 'w-14 h-14 rounded-2xl',
  }[size];

  const titleSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-2xl',
  }[size];

  const subtitleSizes = {
    sm: 'text-[8px] tracking-[0.18em]',
    md: 'text-[9px] tracking-[0.2em]',
    lg: 'text-[11px] tracking-[0.22em]',
    xl: 'text-xs tracking-[0.25em]',
  }[size];

  // Standalone vector icon representation of the new purple-to-orange H-leaf logo
  const iconGraphic = (
    <div
      className={`relative shrink-0 flex items-center justify-center overflow-hidden shadow-sm transition-transform duration-200 ${iconDimensions}`}
      style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 35%, #ea580c 75%, #f97316 100%)',
      }}
    >
      {/* Subtle depth inner border */}
      <div className="absolute inset-0 rounded-[inherit] border border-white/20 pointer-events-none" />

      {/* Stylized H-leaf emblem SVG matching the official logo */}
      <svg
        viewBox="0 0 512 512"
        className="w-[82%] h-[82%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hlg_leaf" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>
          <linearGradient id="hlg_stem" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.95)" />
          </linearGradient>
        </defs>

        {/* Left vertical capsule loop */}
        <path
          d="M 188 152
             C 160 152 138 174 138 202
             L 138 310
             C 138 338 160 360 188 360
             C 216 360 238 338 238 310
             L 238 202
             C 238 174 216 152 188 152 Z"
          fill="none"
          stroke="url(#hlg_stem)"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right vertical U-shape stem */}
        <path
          d="M 374 230
             L 374 310
             C 374 338 352 360 324 360
             C 296 360 274 338 274 310
             L 274 245"
          fill="none"
          stroke="#fff7ed"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Connecting ribbon swooping across to leaf */}
        <path
          d="M 148 316
             C 170 300 216 280 256 256
             C 296 232 328 198 344 158"
          fill="none"
          stroke="#fff7ed"
          strokeWidth="32"
          strokeLinecap="round"
        />

        {/* Leaf apex */}
        <path
          d="M 314 220
             C 314 168 356 132 396 124
             C 400 168 376 210 334 234
             C 322 238 314 232 314 220 Z"
          fill="url(#hlg_leaf)"
        />

        {/* Leaf central spine */}
        <path
          d="M 324 222
             C 344 196 366 168 388 138"
          fill="none"
          stroke="#ea580c"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </div>
  );

  if (variant === 'icon') {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        onClick={onClick}
        title={title}
      >
        {iconGraphic}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-[#0c101d] border border-slate-800 p-4 flex items-center gap-4 ${className}`}
        onClick={onClick}
        title={title}
      >
        <img
          src="./images/habitra-logo.svg"
          alt="Habitra — Habit Tracker"
          className="w-full h-auto max-w-sm rounded-lg"
          onError={(e) => {
            // Fallback to local PNG if SVG fails
            (e.currentTarget as HTMLImageElement).src = './images/habitra-logo.png';
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 min-w-0 select-none ${className}`}
      onClick={onClick}
      title={title}
    >
      {iconGraphic}

      <div className="min-w-0 flex flex-col justify-center">
        <div
          className={`font-bold text-white tracking-tight leading-none truncate ${titleSizes}`}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Habitra
        </div>

        {variant === 'full' ? (
          <div
            className={`font-semibold text-slate-400 uppercase mt-1 leading-none truncate ${subtitleSizes}`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            HABIT TRACKER
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 truncate mt-0.5 leading-none">
            Small Habits. Big Life.
          </div>
        )}
      </div>
    </div>
  );
};
