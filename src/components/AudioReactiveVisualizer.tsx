import React, { useEffect, useRef } from 'react';

interface AudioReactiveVisualizerProps {
  isPlaying: boolean;
  volume?: number; // 0 to 100
  accentColor?: string;
  variant?: 'compact' | 'cinematic';
  className?: string;
}

export const AudioReactiveVisualizer: React.FC<AudioReactiveVisualizerProps> = ({
  isPlaying,
  volume = 40,
  accentColor = '#6366f1',
  variant = 'compact',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const barCount = variant === 'cinematic' ? 48 : 24;
    const barHeights: number[] = new Array(barCount).fill(2);
    const targetHeights: number[] = new Array(barCount).fill(2);
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      phase += 0.08;
      const normalizedVol = Math.max(0.1, volume / 100);

      // Compute targets based on simulated harmonic frequencies
      for (let i = 0; i < barCount; i++) {
        if (isPlaying) {
          // Dynamic rhythm synthesis with harmonic harmonics
          const wave1 = Math.sin(phase * 1.5 + i * 0.35);
          const wave2 = Math.cos(phase * 0.8 - i * 0.2);
          const wave3 = Math.sin(phase * 2.2 + i * 0.7);
          const combined = (wave1 + wave2 + wave3 + 3) / 6; // 0 to 1
          const maxH = height * 0.9 * normalizedVol;
          targetHeights[i] = Math.max(3, combined * maxH);
        } else {
          targetHeights[i] = 2; // Flat calm rest state
        }

        // Smooth physical inertia decay
        barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.22;
      }

      // Render vertical bars
      const gap = variant === 'cinematic' ? 3 : 2;
      const totalGaps = (barCount - 1) * gap;
      const barWidth = Math.max(2, (width - totalGaps) / barCount);

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        const h = barHeights[i];
        const y = height - h;

        // Gradient for bars
        const grad = ctx.createLinearGradient(0, y, 0, height);
        grad.addColorStop(0, accentColor);
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.4)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        const r = Math.min(barWidth / 2, 2);
        ctx.roundRect(x, y, barWidth, h, [r, r, 0, 0]);
        ctx.fill();

        // Subtle glowing cap on peak
        if (isPlaying && h > 6) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, Math.min(2, h), [r, r, 0, 0]);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, volume, accentColor, variant]);

  const defaultDimensions =
    variant === 'cinematic'
      ? { width: 480, height: 64 }
      : { width: 140, height: 28 };

  return (
    <canvas
      ref={canvasRef}
      width={defaultDimensions.width}
      height={defaultDimensions.height}
      className={`rounded-lg overflow-hidden select-none pointer-events-none ${className}`}
      title={isPlaying ? 'Audio Reactive Spectrum Visualizer' : 'Visualizer Rest State'}
    />
  );
};
