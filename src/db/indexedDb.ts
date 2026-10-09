import { AppDataState, VersionedBackupEntry } from '../types/app';
import { createDefaultAppState, createDefaultRoomLayout, formatLocalYMD } from '../constants/scenesAndPresets';

const DB_NAME = 'SMK_Ambient_Habit_DB';
const DB_VERSION = 2;
const STORE_NAME = 'app_store';
const FALLBACK_STORAGE_KEY = 'smk_ambient_habit_fallback_v1';
const AUTO_BACKUP_STORAGE_KEY = 'habitra_last_known_good_snapshot_v1';

const STORE_KEYS: (keyof AppDataState)[] = [
  'habits',
  'completions',
  'goals',
  'reminders',
  'environment',
  'style',
  'audio',
  'timer',
  'presets',
  'security',
  'profile',
  'notificationHistory',
  'roomLayout',
  'journalEntries',
  'versionedBackups',
];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });
}

function mergeWithDefaults(partial: Partial<AppDataState>): AppDataState {
  const defaults = createDefaultAppState();
  const defaultRoom = createDefaultRoomLayout();
  const isPreLivingWorldsUpgrade = partial.environment?.worldViewMode === undefined;

  const mergedHabits = Array.isArray(partial.habits)
    ? partial.habits
    : defaults.habits;

  const mergedCompletions =
    partial.completions && typeof partial.completions === 'object'
      ? partial.completions
      : defaults.completions;

  const mergedGoals = Array.isArray(partial.goals)
    ? partial.goals
    : defaults.goals;

  const mergedReminders = Array.isArray(partial.reminders)
    ? partial.reminders
    : defaults.reminders;

  const rawSecurity = partial.security || defaults.security;
  const rawProfile = partial.profile || defaults.profile;
  const cleanConfiguredName =
    rawProfile.userNameConfigured === true &&
    typeof rawProfile.userName === 'string'
      ? rawProfile.userName.trim()
      : '';

  return {
    habits: mergedHabits,
    completions: mergedCompletions,
    goals: mergedGoals,
    reminders: mergedReminders,
    environment: {
      ...defaults.environment,
      ...(partial.environment || {}),
      sceneId: isPreLivingWorldsUpgrade
        ? 'living_sanctuary'
        : partial.environment?.sceneId || defaults.environment.sceneId,
      worldViewMode: partial.environment?.worldViewMode || 'living_world',
      showWorldHotspots:
        partial.environment?.showWorldHotspots !== undefined
          ? partial.environment.showWorldHotspots
          : true,
    },
    style: { ...defaults.style, ...(partial.style || {}) },
    audio: {
      ...defaults.audio,
      ...(partial.audio || {}),
      audioPresets:
        partial.audio?.audioPresets && partial.audio.audioPresets.length > 0
          ? partial.audio.audioPresets
          : defaults.audio.audioPresets,
    },
    timer: { ...defaults.timer, ...(partial.timer || {}) },
    presets:
      Array.isArray(partial.presets) && partial.presets.length > 0
        ? partial.presets
        : defaults.presets,
    security: {
      passwordHash: rawSecurity.passwordHash || null,
      salt: rawSecurity.salt || null,
      autoLockMinutes:
        typeof rawSecurity.autoLockMinutes === 'number'
          ? rawSecurity.autoLockMinutes
          : 0,
      isLocked: Boolean(rawSecurity.passwordHash && rawSecurity.salt),
    },
    profile: {
      ...defaults.profile,
      ...rawProfile,
      userName: cleanConfiguredName,
      userNameConfigured: cleanConfiguredName.length > 0,
    },
    notificationHistory: Array.isArray(partial.notificationHistory)
      ? partial.notificationHistory
      : defaults.notificationHistory,
    roomLayout: partial.roomLayout
      ? { ...defaultRoom, ...partial.roomLayout }
      : defaultRoom,
    journalEntries:
      partial.journalEntries && typeof partial.journalEntries === 'object'
        ? partial.journalEntries
        : defaults.journalEntries,
    versionedBackups: Array.isArray(partial.versionedBackups)
      ? partial.versionedBackups
      : defaults.versionedBackups,
  };
}

export async function loadAppStateFromDB(): Promise<{
  state: AppDataState;
  recoveredFromBackup?: boolean;
}> {
  const defaultState = createDefaultAppState();
  let idbCandidate: Partial<AppDataState> | null = null;
  let localCandidate: Partial<AppDataState> | null = null;
  let recoveredFromBackup = false;

  // Read synchronous localStorage mirror first
  try {
    const raw =
      localStorage.getItem(FALLBACK_STORAGE_KEY) ||
      localStorage.getItem(AUTO_BACKUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppDataState>;
      if (parsed && parsed.profile) {
        localCandidate = parsed;
        recoveredFromBackup = !localStorage.getItem(FALLBACK_STORAGE_KEY);
      }
    }
  } catch (e) {
    console.warn('Fallback localStorage parse error:', e);
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const results: Partial<AppDataState> = {};

    await Promise.all(
      STORE_KEYS.map(
        (key) =>
          new Promise<void>((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => {
              if (req.result !== undefined) {
                (results as Record<string, unknown>)[key] = req.result;
              }
              resolve();
            };
            req.onerror = () => resolve();
          })
      )
    );

    db.close();

    if (results.profile && results.habits !== undefined) {
      idbCandidate = results;
    }
  } catch (err) {
    console.warn('IndexedDB load warning, checking localStorage fallback:', err);
  }

  // Pick the freshest candidate between IndexedDB and synchronous localStorage mirror
  let chosenPartial: Partial<AppDataState> | null = null;
  if (idbCandidate && localCandidate) {
    const idbTime = idbCandidate.profile?.lastActiveTimestamp || 0;
    const localTime = localCandidate.profile?.lastActiveTimestamp || 0;
    const localHasWelcomeDone =
      Boolean(localCandidate.profile?.hasSeenWelcome) &&
      !idbCandidate.profile?.hasSeenWelcome;
    chosenPartial =
      localTime > idbTime || localHasWelcomeDone ? localCandidate : idbCandidate;
    recoveredFromBackup = false;
  } else if (idbCandidate) {
    chosenPartial = idbCandidate;
    recoveredFromBackup = false;
  } else if (localCandidate) {
    chosenPartial = localCandidate;
  }

  if (chosenPartial) {
    const merged = mergeWithDefaults(chosenPartial);
    const todayStr = formatLocalYMD(new Date());
    if (merged.profile.lastWaterDate !== todayStr) {
      merged.profile.waterCompletedToday = 0;
      merged.profile.lastWaterDate = todayStr;
    }
    return { state: merged, recoveredFromBackup };
  }

  // First launch: persist default state immediately
  await saveAppStateToDB(defaultState);
  return { state: defaultState, recoveredFromBackup: false };
}

export async function saveAppStateToDB(state: AppDataState): Promise<void> {
  const stampedState: AppDataState = {
    ...state,
    security: {
      passwordHash: state.security.passwordHash || null,
      salt: state.security.salt || null,
      autoLockMinutes: state.security.autoLockMinutes || 0,
      isLocked: Boolean(state.security.isLocked),
    },
    profile: {
      ...state.profile,
      lastActiveTimestamp: Date.now(),
    },
  };

  // Always keep a synchronous mirror in localStorage for instant resilience + corruption recovery
  try {
    const serialized = JSON.stringify(stampedState);
    localStorage.setItem(FALLBACK_STORAGE_KEY, serialized);
    localStorage.setItem(AUTO_BACKUP_STORAGE_KEY, serialized);
  } catch (e) {
    // Ignore quota errors on fallback if custom audio is large
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const key of STORE_KEYS) {
      store.put(stampedState[key], key);
    }

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('IndexedDB transaction failed'));
    };
  });
}

export async function clearAllAppDataInDB(): Promise<AppDataState> {
  const freshState = createDefaultAppState();
  freshState.habits = [];
  freshState.completions = {};
  freshState.goals = [];
  freshState.reminders = [];
  freshState.notificationHistory = [];
  freshState.journalEntries = {};
  freshState.versionedBackups = [];

  try {
    localStorage.removeItem(FALLBACK_STORAGE_KEY);
    localStorage.removeItem(AUTO_BACKUP_STORAGE_KEY);
  } catch (e) {
    // ignore
  }

  await saveAppStateToDB(freshState);
  return freshState;
}

export async function verifyIndexedDBHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  storeKeysCount: number;
  fallbackMirrored: boolean;
  error?: string;
}> {
  const start = performance.now();
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const keysCount = await new Promise<number>((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    const fallbackMirrored = Boolean(
      typeof localStorage !== 'undefined' &&
        localStorage.getItem(FALLBACK_STORAGE_KEY)
    );
    return {
      ok: true,
      latencyMs,
      storeKeysCount: keysCount,
      fallbackMirrored,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      storeKeysCount: 0,
      fallbackMirrored: false,
      error: err instanceof Error ? err.message : 'IndexedDB probe failed',
    };
  }
}

export function createVersionedBackupSnapshot(state: AppDataState): VersionedBackupEntry {
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = monthNames[now.getMonth()];
  const dayStr = String(now.getDate()).padStart(2, '0');
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const label = `Habitra_Backup_${monthStr}_${dayStr}_${timeStr.replace(':', '')}.json`;

  // Exclude recursive versionedBackups inside the snapshot itself to keep size lean
  const cleanCopy: Partial<AppDataState> = {
    ...state,
    versionedBackups: [],
  };
  const snapshotJson = JSON.stringify(cleanCopy);
  const sizeFormatted = estimateDataSizeFormatted(cleanCopy as AppDataState);

  return {
    id: `backup_${Date.now()}`,
    label,
    createdAt: now.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    sizeFormatted,
    snapshotJson,
  };
}

export function exportBackupJson(state: AppDataState): void {
  const payload = {
    app: 'Habitra',
    tagline: 'Small Habits. Big Life.',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    data: state,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = formatLocalYMD(new Date());
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const prettyDate = `${monthNames[now.getMonth()]}_${String(now.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `Habitra_Backup_${prettyDate}_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function estimateDataSizeFormatted(state: AppDataState): string {
  try {
    const serialized = JSON.stringify(state);
    const bytes = new Blob([serialized]).size;
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  } catch {
    return '12.4 KB';
  }
}

export function parseBackupJson(jsonText: string): AppDataState {
  const parsed = JSON.parse(jsonText);
  const data = parsed.data ? parsed.data : parsed;
  if (!data || !Array.isArray(data.habits) || !data.environment || !data.profile) {
    throw new Error('Invalid Habitra backup file format.');
  }
  return mergeWithDefaults(data);
}

export const parseImportedBackupJson = parseBackupJson;
export const exportStateAsJsonBackup = exportBackupJson;

export async function hashPasswordWithSalt(
  password: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const salt =
    existingSalt ||
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  const input = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return { hash, salt };
  }
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return { hash: (h >>> 0).toString(16), salt };
}



