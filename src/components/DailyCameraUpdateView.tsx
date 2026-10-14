import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  RefreshCw,
  Upload,
  Check,
  Trash2,
  Download,
  Maximize2,
  X,
  Timer,
  Sparkles,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { formatLocalYMD } from '../constants/scenesAndPresets';
import {
  DailyPhotoUpdate,
  Habit,
  HabitCompletionMap,
  StyleSettings,
} from '../types/app';
import { isHabitCompleted } from '../utils/habitStats';

interface DailyCameraUpdateViewProps {
  habits: Habit[];
  completions: HabitCompletionMap;
  dailyUpdates: DailyPhotoUpdate[];
  selectedDate: Date;
  initialHabitId?: string | null;
  styleSettings: StyleSettings;
  panelBgStyle: React.CSSProperties;
  onAddDailyUpdate: (
    update: Omit<DailyPhotoUpdate, 'id'>,
    markHabitDone: boolean
  ) => void;
  onDeleteDailyUpdate: (id: string) => void;
}

const MOOD_OPTIONS = [
  { id: 'Energized', icon: '🔥', label: 'Energized' },
  { id: 'Focused', icon: '🎯', label: 'Focused' },
  { id: 'Calm', icon: '🌿', label: 'Calm' },
  { id: 'Proud', icon: '💪', label: 'Proud' },
  { id: 'Grateful', icon: '✨', label: 'Grateful' },
];

export const DailyCameraUpdateView: React.FC<DailyCameraUpdateViewProps> = ({
  habits,
  completions,
  dailyUpdates,
  selectedDate,
  initialHabitId,
  styleSettings,
  panelBgStyle,
  onAddDailyUpdate,
  onDeleteDailyUpdate,
}) => {
  const activeHabits = habits.filter((h) => !h.archived);
  const selectedDateStr = formatLocalYMD(selectedDate);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mirrorPreview, setMirrorPreview] = useState(true);
  const [useCountdown, setUseCountdown] = useState(false);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const [stampOverlayOnPhoto, setStampOverlayOnPhoto] = useState(true);

  // Captured / uploaded image & video form state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedMediaType, setCapturedMediaType] = useState<'image' | 'video'>('image');
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string>(
    initialHabitId || ''
  );
  const [markHabitCompleted, setMarkHabitCompleted] = useState(true);
  const [selectedMood, setSelectedMood] = useState<string>('Focused');
  const [caption, setCaption] = useState('');
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  useEffect(() => {
    if (initialHabitId) {
      setSelectedHabitId(initialHabitId);
    }
  }, [initialHabitId]);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraActive, capturedImage]);

  // Gallery filter & lightbox
  const [habitFilter, setHabitFilter] = useState<string>('all');
  const [lightboxItem, setLightboxItem] = useState<DailyPhotoUpdate | null>(
    null
  );

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const startCamera = async (preferredFacing: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    stopCameraStream();

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        'Live camera preview is not supported in this browser context. Use the "Take / Upload Photo" button below to capture with your device camera or select an image.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: preferredFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraError(
        'Camera permission was denied or no camera was detected. You can still click "Take / Upload Photo" to use your phone camera or choose a photo from your device.'
      );
    }
  };

  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    setMirrorPreview(nextFacing === 'user');
    if (cameraActive) {
      startCamera(nextFacing);
    }
  };

  const renderCanvasSnapshot = (sourceEl: HTMLVideoElement | HTMLImageElement, srcW: number, srcH: number, mirror: boolean): string => {
    const maxDim = 960;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.save();
    if (mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(sourceEl, 0, 0, width, height);
    ctx.restore();

    if (stampOverlayOnPhoto) {
      const linkedHabit = activeHabits.find((h) => h.id === selectedHabitId);
      const now = new Date();
      const dateLabel = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeLabel = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      const stampText = linkedHabit
        ? `Habitra · ${linkedHabit.name} · ${dateLabel} ${timeLabel}`
        : `Habitra Daily Check-In · ${dateLabel} ${timeLabel}`;

      ctx.fillStyle = 'rgba(11, 15, 25, 0.72)';
      const barHeight = Math.max(28, Math.round(height * 0.065));
      ctx.fillRect(0, height - barHeight, width, barHeight);

      ctx.fillStyle = '#f8fafc';
      const fontSize = Math.max(11, Math.round(barHeight * 0.44));
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(stampText, 14, height - barHeight / 2);
    }

    return canvas.toDataURL('image/jpeg', 0.82);
  };

  const captureFrameNow = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const dataUrl = renderCanvasSnapshot(
      video,
      video.videoWidth,
      video.videoHeight,
      mirrorPreview
    );
    if (dataUrl) {
      soundEngine.playHabitCheck(true);
      setCapturedImage(dataUrl);
      stopCameraStream();
    }
  };

  const handleSnapButton = () => {
    if (!cameraActive) return;
    if (!useCountdown) {
      captureFrameNow();
      return;
    }

    setCountdownSec(3);
    let current = 3;
    const interval = window.setInterval(() => {
      current -= 1;
      if (current <= 0) {
        window.clearInterval(interval);
        setCountdownSec(null);
        captureFrameNow();
      } else {
        setCountdownSec(current);
      }
    }, 1000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name)) {
      if (file.size > 25 * 1024 * 1024) {
        setCameraError(
          'Video file exceeds 25MB local storage limit. Please select a shorter video clip or compress the file.'
        );
        e.target.value = '';
        return;
      }
      setCameraError(null);
      try {
        const videoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        // Generate a crisp thumbnail frame from the video
        const tempVideo = document.createElement('video');
        tempVideo.src = videoDataUrl;
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        tempVideo.currentTime = 0.2;
        tempVideo.onloadeddata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = tempVideo.videoWidth || 640;
          canvas.height = tempVideo.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            const thumb = canvas.toDataURL('image/jpeg', 0.82);
            setCapturedImage(thumb);
          } else {
            setCapturedImage(videoDataUrl);
          }
          setCapturedMediaType('video');
          setCapturedVideoUrl(videoDataUrl);
          stopCameraStream();
        };
        tempVideo.onerror = () => {
          setCapturedImage(videoDataUrl);
          setCapturedMediaType('video');
          setCapturedVideoUrl(videoDataUrl);
          stopCameraStream();
        };
      } catch {
        setCameraError('Failed to read video file. Please check format.');
      }
      e.target.value = '';
      return;
    }

    // Otherwise, process as an image
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const compressed = renderCanvasSnapshot(
          img,
          img.naturalWidth || 800,
          img.naturalHeight || 600,
          false
        );
        setCapturedImage(compressed || String(reader.result || ''));
        setCapturedMediaType('image');
        setCapturedVideoUrl(null);
        stopCameraStream();
      };
      img.onerror = () => {
        setCameraError('Invalid or unsupported image file.');
      };
      img.src = String(reader.result || '');
    };
    reader.onerror = () => {
      setCameraError('Failed to load image file.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveDailyUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImage) return;

    const now = new Date();
    const linkedHabit = activeHabits.find((h) => h.id === selectedHabitId);
    const moodObj =
      MOOD_OPTIONS.find((m) => m.id === selectedMood) || MOOD_OPTIONS[1];

    onAddDailyUpdate(
      {
        dateStr: selectedDateStr,
        timestamp: now.getTime(),
        timeFormatted: now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        imageDataUrl: capturedImage,
        mediaType: capturedMediaType,
        videoDataUrl: capturedVideoUrl || undefined,
        caption:
          caption.trim() ||
          (linkedHabit
            ? `Completed ${linkedHabit.name}`
            : 'Daily progress check-in'),
        mood: `${moodObj.icon} ${moodObj.label}`,
        habitId: linkedHabit?.id,
        habitName: linkedHabit?.name,
        habitIcon: linkedHabit?.icon,
      },
      Boolean(linkedHabit && markHabitCompleted)
    );

    soundEngine.playHabitCheck(true);
    setCapturedImage(null);
    setCapturedVideoUrl(null);
    setCapturedMediaType('image');
    setCaption('');
    setSaveBanner('✓ Daily check-in update saved to your local log!');
    window.setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleDownloadPhoto = (item: DailyPhotoUpdate) => {
    const a = document.createElement('a');
    a.href = item.videoDataUrl || item.imageDataUrl;
    a.download = `Habitra_Update_${item.dateStr}_${item.id.slice(-5)}.${
      item.mediaType === 'video' ? 'mp4' : 'jpg'
    }`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredUpdates = dailyUpdates.filter((u) => {
    if (habitFilter === 'all') return true;
    return u.habitId === habitFilter;
  });

  const todayUpdatesCount = dailyUpdates.filter(
    (u) => u.dateStr === selectedDateStr
  ).length;

  return (
    <div className="space-y-6">
      {/* Hidden mobile native camera & desktop/mobile gallery file inputs (Photos & Videos) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* TOP STUDIO GRID: Left Camera Viewfinder | Right Check-In Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT 7 COLS: LIVE CAMERA VIEWFINDER & SNAPSHOT */}
        <section
          className="lg:col-span-7 rounded-2xl border border-slate-800/90 p-5 shadow-xl flex flex-col justify-between"
          style={panelBgStyle}
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-teal-400" />
                  <span>Daily Camera Check-In</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Snap a daily progress photo with your laptop webcam or mobile camera. Stored 100% locally on your device.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-300">
                <span>Today: {todayUpdatesCount} snapped</span>
                <span aria-hidden="true">·</span>
                <span>Total: {dailyUpdates.length}</span>
              </div>
            </div>

            {/* Viewfinder or Captured Media Preview */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              {capturedImage ? (
                <>
                  {capturedMediaType === 'video' && capturedVideoUrl ? (
                    <video
                      src={capturedVideoUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={capturedImage}
                      alt="Captured daily update"
                      className="w-full h-full object-contain bg-black"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImage(null);
                      setCapturedVideoUrl(null);
                      setCapturedMediaType('image');
                      startCamera(facingMode);
                    }}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake</span>
                  </button>
                </>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                      cameraActive ? 'block' : 'hidden'
                    } ${mirrorPreview ? 'scale-x-[-1]' : ''}`}
                  />

                  {!cameraActive && (
                    <div className="p-6 text-center max-w-md space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-300 mx-auto">
                        <Camera className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          Ready for Today&apos;s Visual Check-In
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Capture your study desk, workout, healthy meal, or reading session to build a visual timeline of your habits.
                        </p>
                      </div>

                      {cameraError && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 text-left">
                          {cameraError}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => startCamera(facingMode)}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2 shadow-lg cursor-pointer transition-opacity hover:opacity-95"
                          style={{ backgroundColor: styleSettings.accentColor }}
                        >
                          <Camera className="w-4 h-4" />
                          <span>Open Live Camera</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Camera className="w-4 h-4 text-teal-400" />
                          <span>Phone Camera</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Upload className="w-4 h-4 text-indigo-400" />
                          <span>Upload Photo</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {countdownSec !== null && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                      <span className="text-6xl font-bold text-white font-mono-tabular animate-ping">
                        {countdownSec}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Camera Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              {cameraActive ? (
                <>
                  <button
                    type="button"
                    onClick={handleSnapButton}
                    disabled={countdownSec !== null}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {useCountdown ? 'Snap Photo (3s)' : 'Snap Photo Now'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    title="Switch between Front and Rear camera on mobile/tablets"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Flip Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMirrorPreview((v) => !v)}
                    className={`px-3 py-2 rounded-xl border text-xs cursor-pointer ${
                      mirrorPreview
                        ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    Mirror: {mirrorPreview ? 'On' : 'Off'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseCountdown((v) => !v)}
                    className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-1 cursor-pointer ${
                      useCountdown
                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>3s Timer: {useCountdown ? 'On' : 'Off'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs text-rose-300 cursor-pointer"
                  >
                    Stop Camera
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-teal-400" />
                    <span>Start Webcam</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Upload Photo</span>
                  </button>
                </>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={stampOverlayOnPhoto}
                onChange={(e) => setStampOverlayOnPhoto(e.target.checked)}
                className="rounded border-slate-700 accent-teal-500"
              />
              <span>Stamp date on photo</span>
            </label>
          </div>
        </section>

        {/* RIGHT 5 COLS: DAILY UPDATE DETAILS & HABIT LINKING FORM */}
        <section
          className="lg:col-span-5 rounded-2xl border border-slate-800/90 p-5 shadow-xl flex flex-col justify-between"
          style={panelBgStyle}
        >
          <form onSubmit={handleSaveDailyUpdate} className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Log Daily Update Details</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Attach your photo to a habit, record your mood, and add a reflection note.
              </p>
            </div>

            {saveBanner && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-medium">
                {saveBanner}
              </div>
            )}

            {/* 1. Link to Habit */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Link to Habit (Optional)
              </label>
              <select
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">General Daily Check-In (No specific habit)</option>
                {activeHabits.map((h) => {
                  const doneToday = isHabitCompleted(
                    completions,
                    h.id,
                    selectedDateStr
                  );
                  return (
                    <option key={h.id} value={h.id}>
                      {h.icon} {h.name} {doneToday ? '(✓ Done today)' : ''}
                    </option>
                  );
                })}
              </select>

              {selectedHabitId && (
                <label className="flex items-center gap-2 text-xs text-teal-300 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markHabitCompleted}
                    onChange={(e) => setMarkHabitCompleted(e.target.checked)}
                    className="rounded border-slate-700 accent-teal-500"
                  />
                  <span>
                    Automatically mark this habit as completed for{' '}
                    {selectedDateStr}
                  </span>
                </label>
              )}
            </div>

            {/* 2. Mood Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                How are you feeling?
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {MOOD_OPTIONS.map((m) => {
                  const active = selectedMood === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMood(m.id)}
                      className={`py-2 px-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        active
                          ? 'bg-teal-500/20 border-teal-400/60 text-white'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-base">{m.icon}</span>
                      <span className="text-[11px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Daily Caption / Note */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Daily Update Note / Caption
              </label>
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What did you accomplish today? (e.g., Finished 45m Java session, morning run completed...)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!capturedImage}
              className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                capturedImage
                  ? 'text-white cursor-pointer hover:opacity-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              style={
                capturedImage
                  ? { backgroundColor: styleSettings.accentColor }
                  : undefined
              }
            >
              <Check className="w-4 h-4" />
              <span>
                {capturedImage
                  ? 'Save Daily Photo Update'
                  : 'Snap or Upload a Photo First'}
              </span>
            </button>
          </form>
        </section>
      </div>

      {/* BOTTOM GALLERY: DAILY VISUAL PROGRESS TIMELINE */}
      <section
        className="rounded-2xl border border-slate-800/90 p-5 shadow-xl"
        style={panelBgStyle}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <span>Daily Visual Progress Timeline ({filteredUpdates.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Your chronological photo check-in gallery across habits and daily milestones
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={habitFilter}
              onChange={(e) => setHabitFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Habits & Check-Ins ({dailyUpdates.length})</option>
              {activeHabits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.icon} {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredUpdates.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-xl bg-slate-950/50 border border-dashed border-slate-800">
            <p className="text-sm text-slate-300 font-medium mb-1">
              No daily camera updates yet
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Use the camera above to snap your first daily check-in photo on your laptop or phone.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUpdates.map((item) => (
              <div
                key={item.id}
                className="rounded-xl overflow-hidden bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img
                      src={item.imageDataUrl}
                      alt={item.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onClick={() => setLightboxItem(item)}
                    />
                    {item.mediaType === 'video' && (
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/80 border border-white/20 text-[10px] font-medium text-white flex items-center gap-1 shadow">
                        <span>📹</span> Video
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLightboxItem(item)}
                        className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700/80 cursor-pointer"
                        title="View Full Size"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPhoto(item)}
                        className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700/80 cursor-pointer"
                        title="Download Photo"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDailyUpdate(item.id)}
                        className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700/80 cursor-pointer"
                        title="Delete Photo Update"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono-tabular mb-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-teal-400" />
                        <span>{item.dateStr}</span>
                        <span>·</span>
                        <span>{item.timeFormatted}</span>
                      </span>
                      <span className="text-slate-300">{item.mood}</span>
                    </div>

                    {item.habitName && (
                      <div className="text-xs font-semibold text-teal-300 mb-1">
                        {item.habitIcon} {item.habitName}
                      </div>
                    )}

                    <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">
                      {item.caption}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="max-w-3xl w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="text-xs text-slate-300 font-mono-tabular">
                {lightboxItem.dateStr} · {lightboxItem.timeFormatted} ·{' '}
                {lightboxItem.mood}
                {lightboxItem.habitName
                  ? ` · ${lightboxItem.habitIcon || ''} ${lightboxItem.habitName}`
                  : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPhoto(lightboxItem)}
                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-black max-h-[70vh] flex items-center justify-center">
              {lightboxItem.mediaType === 'video' ? (
                <video
                  src={lightboxItem.videoDataUrl || lightboxItem.imageDataUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[70vh] w-auto object-contain mx-auto"
                />
              ) : (
                <img
                  src={lightboxItem.imageDataUrl}
                  alt={lightboxItem.caption}
                  className="max-h-[70vh] w-auto object-contain"
                />
              )}
            </div>
            <div className="p-4 text-sm text-slate-200">
              {lightboxItem.caption}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
