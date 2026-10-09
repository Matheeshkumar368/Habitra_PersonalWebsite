export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type NavigationTab =
  | 'dashboard'
  | 'habits'
  | 'calendar'
  | 'goals'
  | 'timer'
  | 'music'
  | 'reminders'
  | 'statistics'
  | 'myspace'
  | 'settings';

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom' | 'interval';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  goalDays: number;
  frequency: HabitFrequency;
  customDays?: number[]; // 0 = Sun, 1 = Mon, ... 6 = Sat
  intervalDays?: number; // e.g., every 2 days
  startDate: string; // YYYY-MM-DD
  targetDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:mm
  description?: string;
  dependsOnHabitId?: string; // Optional prerequisite habit ID
  createdAt: string;
  order: number;
  archived?: boolean;
}

// Keyed by `${habitId}_${YYYY-MM-DD}` -> boolean
export type HabitCompletionMap = Record<string, boolean>;

export type GoalCategory = 'daily' | 'weekly' | 'monthly' | 'long-term';
export type GoalPriority = 'high' | 'medium' | 'low';

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  deadline: string; // YYYY-MM-DD
  priority: GoalPriority;
  progress: number; // 0 - 100
  relatedHabitIds: string[];
  color: string;
  starred: boolean;
  icon: string;
  archived?: boolean;
  autoProgressFromHabits?: boolean;
}

export type ReminderType =
  | 'water'
  | 'eye'
  | 'stretch'
  | 'walk'
  | 'snack'
  | 'rest'
  | 'study'
  | 'sleep'
  | 'exercise'
  | 'custom';

export type ReminderScheduleType =
  | 'interval'
  | 'daily'
  | 'weekly'
  | 'weekdays'
  | 'weekends'
  | 'custom'
  | 'once';

export interface Reminder {
  id: string;
  title: string;
  type: ReminderType;
  scheduleType: ReminderScheduleType;
  intervalMinutes?: number; // e.g. 60
  timeOfDay?: string; // e.g. "19:00"
  customDays?: number[]; // 0 = Sun .. 6 = Sat
  enabled: boolean;
  soundEnabled?: boolean;
  icon: string;
  color: string;
  completedTodayCount: number;
  lastTriggeredAt?: number;
}

export interface NotificationLogItem {
  id: string;
  timestamp: number;
  timeFormatted: string;
  dateStr: string;
  type:
    | 'water'
    | 'study'
    | 'eye'
    | 'exercise'
    | 'streak'
    | 'goal'
    | 'timer'
    | 'missed'
    | 'system'
    | 'custom';
  icon: string;
  title: string;
  message: string;
  read: boolean;
}

export type RoomObjectId =
  | 'panoramic_window'
  | 'small_plant'
  | 'wall_clock'
  | 'desk_lamp'
  | 'stack_of_books'
  | 'coffee_machine'
  | 'potted_monstera'
  | 'bookshelf'
  | 'retro_computer'
  | 'upgraded_desk'
  | 'hanging_ivy'
  | 'wall_posters'
  | 'hearth_fireplace'
  | 'sleeping_cat';

export interface RoomObjectPlacement {
  id: RoomObjectId;
  x: number; // percentage 5..90
  y: number; // percentage 10..85
  visible: boolean;
}

export interface JournalEntry {
  dateStr: string; // YYYY-MM-DD
  content: string;
  mood?: string;
  updatedAt: string;
}

export interface AudioPreset {
  id: string;
  name: string;
  musicTrackId: string;
  musicVolume: number;
  ambientSoundId: AmbientSoundId;
  ambientVolume: number;
}

export interface VersionedBackupEntry {
  id: string;
  label: string; // e.g. "Habitra_Backup_Oct_08.json"
  createdAt: string;
  sizeFormatted: string;
  snapshotJson: string;
}

export type SceneId =
  | 'living_sanctuary'
  | 'floating_garden'
  | 'astral_observatory'
  | 'study_room'
  | 'rainy_cafe'
  | 'train_journey'
  | 'forest_cabin'
  | 'night_library'
  | 'cozy_bedroom'
  | 'train_station'
  | 'mountain_cabin'
  | 'rainy_window'
  | 'night_city'
  | 'beach'
  | 'garden'
  | 'space_station'
  | 'cyberpunk_room'
  | 'japanese_study';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'auto';
export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'snow' | 'storm';
export type AnimationIntensity = 'high' | 'medium' | 'low' | 'off';

export interface EnvironmentSettings {
  sceneId: SceneId;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  lightingWarmth: number; // 0 (cool) to 100 (warm), default 70
  animationIntensity: AnimationIntensity;
  particlesDensity: number; // 0 to 100
  uiTransparency: number; // 30 to 98 (%)
  uiPosition: 'standard' | 'compact' | 'zen';
  minimalMode: boolean;
  showProgressGardenObjects?: boolean;
  showWorldHotspots?: boolean;
  worldViewMode?: 'living_world' | 'classic_studio';
}

export type PixelStyleId =
  | 'cozy'
  | 'classic'
  | 'soft'
  | 'dark'
  | 'retro16'
  | 'minimal'
  | 'cyber'
  | 'anime';

export interface StyleSettings {
  pixelStyle: PixelStyleId;
  pixelDensity: number; // 1 to 4
  uiScale: number; // 90 to 110 (%)
  borderStyle: 'pixel' | 'soft' | 'sharp';
  panelStyle?: 'glass' | 'solid' | 'minimal';
  cornerRadius: number; // 0 to 20 (px)
  fontFamily: 'sans' | 'pixel' | 'mono';
  accentColor: string; // hex e.g. '#6366f1'
  bgOpacity: number; // 40 to 100
  panelOpacity: number; // 50 to 98
  animationSpeed: AnimationIntensity;
  glowEffects?: boolean;
  screenEffects?: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

export type MusicTrackId =
  | 'lofi_rain'
  | 'ambient_piano'
  | 'midnight_synth'
  | 'cozy_guitar'
  | 'cyber_chill'
  | 'silent';

export type AmbientSoundId =
  | 'rain'
  | 'forest'
  | 'ocean'
  | 'cafe'
  | 'train'
  | 'fireplace'
  | 'white_noise'
  | 'brown_noise'
  | 'nature_night'
  | 'silent';

export type MusicCategoryId =
  | 'all'
  | 'ambient'
  | 'focus'
  | 'nature'
  | 'rain'
  | 'instrumental'
  | 'custom'
  | 'favorites';

export type RepeatMode = 'off' | 'all' | 'one';

export interface CustomAudioTrack {
  id: string;
  name: string;
  dataUrl: string;
  category?: 'ambient' | 'focus' | 'nature' | 'rain' | 'instrumental' | 'custom';
  artist?: string;
  description?: string;
  folderName?: string;
  durationSeconds?: number;
  addedAt?: string;
}

export interface UserPlaylist {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  trackIds: string[];
  isBuiltIn?: boolean;
  createdAt?: string;
}

export interface RecentTrackEntry {
  trackId: string;
  playedAt: string;
  timestamp: number;
}

export interface AudioSettings {
  currentTrackId: string;
  isPlaying: boolean;
  ambientPlaying?: boolean;
  musicVolume: number; // 0 - 100
  ambientSoundId: AmbientSoundId;
  ambientVolume: number; // 0 - 100
  notificationVolume: number; // 0 - 100
  uiSoundVolume: number; // 0 - 100
  isMuted: boolean;
  customTracks: CustomAudioTrack[];
  audioPresets?: AudioPreset[];
  shuffle?: boolean;
  repeatMode?: RepeatMode;
  autoSwitchMusicWithScene?: boolean;
  favoriteTrackIds?: string[];
  activeCategory?: MusicCategoryId;
  playlists?: UserPlaylist[];
  activePlaylistId?: string | null;
  recentlyPlayed?: RecentTrackEntry[];
}

export type TimerMode = 'focus' | 'short_break' | 'long_break' | 'custom';

export interface TimerSessionLog {
  id: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  mode: TimerMode;
  completedAt: string;
}

export interface TimerSettings {
  mode: TimerMode;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  customMinutes: number;
  totalCycles: number;
  currentCycle: number;
  pomodoroAutoRepeat: boolean;
  immerseOnFocus: boolean;
  changeSceneOnBreak: boolean;
  muteNotificationsDuringFocus?: boolean;
  sessionsCompletedToday: number;
  totalFocusMinutesToday: number;
  history: TimerSessionLog[];
  // Persistent epoch-based timer fields for zero-drift background accuracy
  timerStatus?: 'idle' | 'running' | 'paused';
  startTimestamp?: number | null;
  endTimestamp?: number | null;
  pausedRemainingSeconds?: number | null;
}

export interface SpacePreset {
  id: string;
  name: string;
  subtitle: string;
  badgeIcon: string;
  isCustom?: boolean;
  sceneId: SceneId;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  lightingWarmth: number;
  animationIntensity?: AnimationIntensity;
  musicTrackId: string;
  ambientSoundId: AmbientSoundId;
  accentColor: string;
  uiTransparency: number;
  focusMinutes: number;
  shortBreakMinutes: number;
}

export interface SecuritySettings {
  passwordHash: string | null;
  salt: string | null;
  autoLockMinutes: number; // 0 = disabled
  isLocked: boolean;
}

export type MissedReminderBehavior = 'summary' | 'notify_immediately' | 'ignore';

export interface UserProfile {
  appName: string;
  userName: string;
  userNameConfigured?: boolean;
  quote: string;
  sidebarQuote: string;
  hasSeenWelcome: boolean;
  notificationsEnabled: boolean;
  notificationSoundEnabled: boolean;
  notifyHabits?: boolean;
  notifyWater?: boolean;
  notifyStudy?: boolean;
  notifyBreaks?: boolean;
  notifyTimer?: boolean;
  notifyGoals?: boolean;
  notifyStreak?: boolean;
  // Quiet hours
  quietHoursEnabled?: boolean;
  quietHoursStart?: string; // "23:00"
  quietHoursEnd?: string; // "06:00"
  allowCriticalTimerInQuietHours?: boolean;
  // Missed reminders & background behavior
  missedReminderBehavior?: MissedReminderBehavior;
  keepRunningInBackground?: boolean; // Minimize to system tray ON by default
  startWithWindows?: boolean;
  hasSeenTrayNotice?: boolean;
  lowPowerBackgroundMode?: boolean;
  // XP & Gamification
  xpEnabled?: boolean;
  // Hydration
  waterIntervalMinutes: number;
  waterCompletedToday: number;
  waterDailyGoal: number;
  lastWaterDate: string; // YYYY-MM-DD
  lastWaterReminderAt?: number;
  // Timestamps & Midnight tracking
  lastActiveTimestamp?: number;
  currentActiveDateStr?: string;
  lastSavedAt?: string;
  lastBackupAt?: string | null;
}

export interface AppDataState {
  habits: Habit[];
  completions: HabitCompletionMap;
  goals: Goal[];
  reminders: Reminder[];
  environment: EnvironmentSettings;
  style: StyleSettings;
  audio: AudioSettings;
  timer: TimerSettings;
  presets: SpacePreset[];
  security: SecuritySettings;
  profile: UserProfile;
  notificationHistory?: NotificationLogItem[];
  roomLayout?: Record<RoomObjectId, RoomObjectPlacement>;
  journalEntries?: Record<string, JournalEntry>;
  versionedBackups?: VersionedBackupEntry[];
}
