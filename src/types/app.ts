import { FinsaState } from './finsa';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type NavigationTab =
  | 'dashboard'
  | 'habits'
  | 'dailylog'
  | 'calendar'
  | 'goals'
  | 'timer'
  | 'music'
  | 'streaming'
  | 'apps'
  | 'finsa'
  | 'reminders'
  | 'statistics'
  | 'insights'
  | 'timeline'
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

export interface DailyPhotoUpdate {
  id: string;
  dateStr: string; // YYYY-MM-DD
  timestamp: number;
  timeFormatted: string;
  imageDataUrl: string;
  mediaType?: 'image' | 'video';
  videoDataUrl?: string;
  caption: string;
  mood: string;
  habitId?: string;
  habitName?: string;
  habitIcon?: string;
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
  customBackgroundUrl?: string;
  customBackgroundType?: 'image' | 'video';
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

export type MusicActiveSource = 'ambient' | 'library' | 'youtube' | 'spotify' | 'video' | 'none';

export type AmbientMoodId =
  | 'peaceful_exploration'
  | 'rainy_forest'
  | 'underground_cave'
  | 'night_sky'
  | 'cozy_library'
  | 'deep_focus';

export interface YouTubeSavedItem {
  id: string;
  title: string;
  url: string;
  embedId: string;
  type: 'video' | 'playlist';
  addedAt: string;
}

export interface SpotifySavedItem {
  id: string;
  title: string;
  url: string;
  embedUri: string;
  type: 'track' | 'album' | 'playlist';
  addedAt: string;
}

export interface CustomAudioTrack {
  id: string;
  name: string;
  dataUrl?: string;
  filePath?: string;
  blobKey?: string;
  fileSize?: number;
  format?: string;
  mediaType?: 'audio' | 'video';
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
  playbackStatus?: 'stopped' | 'loading' | 'playing' | 'paused' | 'error';
  ambientPlaying?: boolean;
  musicVolume: number; // 0 - 100
  ambientSoundId: AmbientSoundId;
  ambientVolume: number; // 0 - 100
  notificationVolume: number; // 0 - 100
  uiSoundVolume: number; // 0 - 100
  uiSoundEnabled?: boolean;
  isMuted: boolean;
  customTracks: CustomAudioTrack[];
  videoTracks?: CustomAudioTrack[];
  musicPreference?: 'local' | 'online' | 'later';
  audioPresets?: AudioPreset[];
  shuffle?: boolean;
  repeatMode?: RepeatMode;
  autoSwitchMusicWithScene?: boolean;
  favoriteTrackIds?: string[];
  activeCategory?: MusicCategoryId;
  playlists?: UserPlaylist[];
  activePlaylistId?: string | null;
  recentlyPlayed?: RecentTrackEntry[];
  // Redesigned Music Engine fields
  activeSource?: MusicActiveSource;
  selectedMood?: AmbientMoodId;
  sleepTimerMinutes?: number | null;
  sleepTimerEndTimestamp?: number | null;
  crossfadeEnabled?: boolean;
  autoStartOnLaunch?: boolean;
  continueBetweenPages?: boolean;
  youtubeItems?: YouTubeSavedItem[];
  activeYouTubeId?: string | null;
  spotifyItems?: SpotifySavedItem[];
  activeSpotifyUri?: string | null;
  spotifyClientId?: string;
  activeVideoTrackId?: string | null;
  playIntroOnStartup?: boolean;
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

export type WorkspaceMode = 'daily_life' | 'focus' | 'planning' | 'finance' | 'relax';

export interface DailyBriefSections {
  habits: boolean;
  calendar: boolean;
  focus: boolean;
  finance: boolean;
  music: boolean;
}

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
  // Posture & Stretch reminders
  notifyPosture?: boolean;
  postureIntervalMinutes?: number;
  lastPostureReminderAt?: number;
  // UI Sound settings
  uiSoundEnabled?: boolean;
  uiSoundVolume?: number;
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
  // Adaptive Workspace & Personal Intelligence
  workspaceMode?: WorkspaceMode;
  defaultWorkspaceMode?: WorkspaceMode;
  dailyBriefDismissedDate?: string;
  dailyBriefSections?: DailyBriefSections;
  layoutSpacing?: 'compact' | 'comfortable' | 'spacious';
  mediaBarPosition?: 'bottom_fixed' | 'floating_dock' | 'hidden';
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
}

export type CalendarEventCategory =
  | 'work'
  | 'personal'
  | 'health'
  | 'study'
  | 'birthday'
  | 'anniversary'
  | 'important'
  | 'other';

export type CalendarEventRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  allDay: boolean;
  location?: string;
  category: CalendarEventCategory;
  color: string;
  reminderMinutesBefore?: number; // e.g. 0 (at event), 5, 10, 15, 30, 60
  recurrence: CalendarEventRecurrence;
  isImportant?: boolean;
  createdAt: string;
  lastRemindedTimestamp?: number;
}

export interface CustomAppShortcut {
  id: string;
  name: string;
  icon: string; // emoji or icon name
  url: string; // http(s):// or custom protocol
  category?: 'media' | 'tools' | 'productivity' | 'custom';
  description?: string;
  isDefault?: boolean;
}

export type DesktopWidgetSection = 'tasks' | 'timer' | 'savings' | 'music' | 'calendar';

export interface DesktopWidgetSettings {
  showTasks: boolean;
  showMusic: boolean;
  showUpcomingEvents: boolean;
  showFocusTimer?: boolean;
  showDailySavings?: boolean;
  widgetOrder?: DesktopWidgetSection[];
  widgetSize?: 'compact' | 'standard' | 'expanded';
  activeWidgetTab?: DesktopWidgetSection;
  alwaysOnTop: boolean;
  opacity: number;
  compactMode: boolean;
}

export interface QuickNoteItem {
  id: string;
  text: string;
  done: boolean;
}

export interface QuickNoteData {
  text: string;
  checklist?: QuickNoteItem[];
  mode?: 'text' | 'checklist';
  color?: string;
  isPinned?: boolean;
  isMinimized?: boolean;
  updatedAt: number;
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
  dailyUpdates?: DailyPhotoUpdate[];
  versionedBackups?: VersionedBackupEntry[];
  quickNote?: QuickNoteData;
  calendarEvents?: CalendarEvent[];
  customAppShortcuts?: CustomAppShortcut[];
  widgetSettings?: DesktopWidgetSettings;
  finsa?: FinsaState;
}
