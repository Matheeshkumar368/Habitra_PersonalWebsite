import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  FastForward,
  Play,
  Pause,
  Upload,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { HabitraLogo } from './HabitraLogo';

interface HabitraIntroVideoProps {
  isOpen: boolean;
  videoSrc?: string;
  onComplete: () => void;
  onSkip: () => void;
  accentColor?: string;
}

export const HabitraIntroVideo: React.FC<HabitraIntroVideoProps> = ({
  isOpen,
  videoSrc = '/habitra-intro.mp4',
  onComplete,
  onSkip,
  accentColor = '#6366f1',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // Strict requirement: Intro video muted by default, with no autoplay sound
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [customSrc, setCustomSrc] = useState<string | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showLogoFallback, setShowLogoFallback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check custom cached video in localStorage if user previously selected one
  useEffect(() => {
    try {
      const savedCustomIntro = localStorage.getItem('habitra_custom_intro_video');
      if (savedCustomIntro) {
        setCustomSrc(savedCustomIntro);
      }
    } catch {
      // Ignore storage limitations
    }
  }, []);

  const activeSrc = customSrc || videoSrc;

  // Video playback & graceful fallback handling
  useEffect(() => {
    if (!isOpen) {
      setIsFadingOut(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    setProgress(0);
    video.volume = volume;
    video.muted = true; // Always muted by default for browser compliance and user comfort

    // If video cannot load or is missing, seamlessly transition to official Habitra Logo reveal fallback
    const checkTimeout = window.setTimeout(() => {
      if (video.readyState < 2 && !isPlaying) {
        setShowLogoFallback(true);
      }
    }, 1200);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setShowLogoFallback(false);
          window.clearTimeout(checkTimeout);
        })
        .catch(() => {
          window.clearTimeout(checkTimeout);
          setShowLogoFallback(true);
        });
    }

    // Keyboard shortcuts: Escape or Space to enter workspace
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        handleFinishOrSkip();
      } else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        handleFinishOrSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(checkTimeout);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activeSrc]);

  // When fallback is shown, auto-advance after 3.5 seconds if user is idle
  useEffect(() => {
    if (!isOpen || !showLogoFallback) return;
    const autoEnterTimer = window.setTimeout(() => {
      handleFinishOrSkip();
    }, 3800);
    return () => window.clearTimeout(autoEnterTimer);
  }, [isOpen, showLogoFallback]);

  const handleFinishOrSkip = () => {
    setIsFadingOut(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    window.setTimeout(() => {
      onSkip();
    }, 350);
  };

  const handleEnded = () => {
    setIsFadingOut(true);
    window.setTimeout(() => {
      onComplete();
    }, 400);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  const handleSelectLocalVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    setCustomSrc(fileUrl);
    setShowLogoFallback(false);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result.length < 25 * 1024 * 1024) {
          localStorage.setItem('habitra_custom_intro_video', reader.result);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      // Ignore storage limitations
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl transition-opacity duration-400 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at center, #0f172a 0%, #030712 100%)',
      }}
    >
      {/* Top Header: Brand badge & Skip Button */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white font-mono">
              HABITRA
            </div>
            <div className="text-[10px] text-slate-400">Welcome Experience</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFinishOrSkip}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-600/80 hover:border-indigo-400/80 shadow-lg shadow-black/50 transition-all flex items-center gap-2 cursor-pointer group"
          title="Enter workspace (ESC)"
        >
          <span>Skip Intro</span>
          <span className="text-[10px] text-slate-400 font-mono group-hover:text-slate-300">
            [ESC]
          </span>
          <FastForward className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Main Presentation Stage */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Hidden / Playing Video Element */}
        <video
          ref={videoRef}
          src={activeSrc}
          playsInline
          muted
          preload="auto"
          onEnded={handleEnded}
          onError={() => setShowLogoFallback(true)}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className={`w-full h-full object-contain max-h-screen transition-opacity duration-300 ${
            showLogoFallback ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'
          }`}
        />

        {/* OFFICIAL HABITRA LOGO REVEAL EXPERIENCE FALLBACK */}
        {showLogoFallback && (
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-500">
            {/* Ambient Glowing Aura */}
            <div
              className="absolute w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none animate-pulse"
              style={{
                background: 'radial-gradient(circle, #6366f1 0%, #ec4899 50%, #f97316 100%)',
              }}
            />

            {/* Official Habitra Logo Emblem */}
            <div className="relative mb-6 transform hover:scale-105 transition-transform duration-300">
              <HabitraLogo variant="icon" size="xl" className="shadow-2xl shadow-indigo-500/20" />
            </div>

            {/* Title & Slogan */}
            <h1
              className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Habitra
            </h1>

            <p className="text-sm sm:text-base font-medium text-slate-300 tracking-wide mb-1">
              Small Habits. Big Life.
            </p>

            <p className="text-xs text-slate-500 max-w-sm mb-8 leading-relaxed font-mono">
              Local-first productivity room, habit tracker, and focus sanctuary.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <button
                type="button"
                onClick={handleFinishOrSkip}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-white shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:scale-102"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 8px 24px -4px ${accentColor}60`,
                }}
              >
                <span>Enter Habitra Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                title="Select a custom logo reveal video file (.mp4)"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Custom Video...</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/*"
                onChange={handleSelectLocalVideoFile}
                className="hidden"
              />
            </div>

            <div className="mt-8 text-[11px] text-slate-500 font-mono">
              Press <span className="text-slate-300 font-semibold">Space</span> or{' '}
              <span className="text-slate-300 font-semibold">Esc</span> to enter
            </div>
          </div>
        )}

        {/* Bottom Playback Bar Controls (Only when video is actively playing) */}
        {!showLogoFallback && isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
            {/* Progress Bar */}
            <div className="w-full h-1 bg-slate-800 rounded-full mb-3 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-100 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const video = videoRef.current;
                    if (!video) return;
                    if (video.paused) {
                      video.play();
                      setIsPlaying(true);
                    } else {
                      video.pause();
                      setIsPlaying(false);
                    }
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      const next = !isMuted;
                      videoRef.current.muted = next;
                      setIsMuted(next);
                    }
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700 cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Press <span className="text-slate-200">Space</span> or{' '}
                <span className="text-slate-200">Esc</span> to enter
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
