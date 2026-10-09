// Electron Main Process for Habitra Windows Desktop (.exe) & System Tray Background Operation
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  ipcMain,
  nativeImage,
  shell,
} = require('electron');
const path = require('path');
const fs = require('fs');

// Set application name and Windows AppUserModelID before app ready
app.setName('Habitra');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.habitra.desktop');
}

// Store persistent user data in %APPDATA%\Habitra (outside the read-only installation directory)
try {
  const userDataDir = path.join(app.getPath('appData'), 'Habitra');
  fs.mkdirSync(userDataDir, { recursive: true });
  app.setPath('userData', userDataDir);
} catch {
  // Fallback to default Electron userData path
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
let keepRunningInBackground = true;

function resolveAssetPath(filename) {
  const candidates = [
    path.join(__dirname, '../dist', filename),
    path.join(__dirname, '../public', filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveWindowIconPath() {
  if (process.platform === 'win32') {
    return (
      resolveAssetPath('icon.ico') ||
      resolveAssetPath('icon.png') ||
      undefined
    );
  }
  return (
    resolveAssetPath('icon.png') ||
    resolveAssetPath('icon.ico') ||
    undefined
  );
}

function createFallbackTrayNativeImage() {
  // 16x16 emerald sprout pixel icon fallback in case icon files are missing
  const fallbackDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABMSURBVDhPY2RgYPgPxFQBjAwMDIw0NQxUgA8wNjL8B+L/pJrAwMDAgM0wXBqwaSAJ4NKAaQAmDSQBXBowDcCkASOAqAaYBoYBAJ4kE8F0v2v2AAAAAElFTkSuQmCC';
  return nativeImage.createFromDataURL(fallbackDataUrl);
}

function resolveTrayNativeImage() {
  const candidates = [
    resolveAssetPath('tray-icon.png'),
    resolveAssetPath('icon.ico'),
    resolveAssetPath('icon.png'),
  ].filter(Boolean);

  for (const filePath of candidates) {
    try {
      const img = nativeImage.createFromPath(filePath);
      if (img && !img.isEmpty()) {
        return process.platform === 'win32'
          ? img.resize({ width: 16, height: 16 })
          : img.resize({ width: 20, height: 20 });
      }
    } catch {
      // Continue to next candidate
    }
  }
  return createFallbackTrayNativeImage();
}

function sendToRenderer(channel, payload) {
  if (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    mainWindow.webContents &&
    !mainWindow.webContents.isDestroyed()
  ) {
    mainWindow.webContents.send(channel, payload);
  }
}

function showAndFocusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

// Enforce Single Instance Lock so launching Habitra again restores the existing window from tray
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showAndFocusMainWindow();
    sendToRenderer('habitra-tray-action', 'open');
  });
}

function createTray() {
  if (tray) return;
  try {
    const img = resolveTrayNativeImage();
    tray = new Tray(img);
    tray.setToolTip('🌱 Habitra — Small Habits. Big Life.');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Habitra',
        click: () => {
          showAndFocusMainWindow();
          sendToRenderer('habitra-tray-action', 'open');
        },
      },
      {
        label: "Today's Progress",
        click: () => {
          showAndFocusMainWindow();
          sendToRenderer('habitra-tray-action', 'progress');
        },
      },
      {
        label: 'Start Focus Timer',
        click: () => {
          showAndFocusMainWindow();
          sendToRenderer('habitra-tray-action', 'start_focus');
        },
      },
      { type: 'separator' },
      {
        label: 'Pause Notifications',
        click: () => {
          sendToRenderer('habitra-tray-action', 'pause_notif');
        },
      },
      {
        label: 'Resume Notifications',
        click: () => {
          sendToRenderer('habitra-tray-action', 'resume_notif');
        },
      },
      { type: 'separator' },
      {
        label: 'Lock Habitra',
        click: () => {
          showAndFocusMainWindow();
          sendToRenderer('habitra-tray-action', 'lock');
        },
      },
      {
        label: 'Settings',
        click: () => {
          showAndFocusMainWindow();
          sendToRenderer('habitra-tray-action', 'settings');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Habitra',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      showAndFocusMainWindow();
      sendToRenderer('habitra-tray-action', 'open');
    });
    tray.on('double-click', () => {
      showAndFocusMainWindow();
      sendToRenderer('habitra-tray-action', 'open');
    });
  } catch {
    // Tray initialization fallback if OS environment is headless
  }
}

function createWindow() {
  const iconPath = resolveWindowIconPath();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Habitra — Small Habits. Big Life.',
    backgroundColor: '#0b0f19',
    icon: iconPath,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false, // Keep focus timer & reminder scheduler accurate when minimized
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  // Open external http/https links in the user's default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url).catch(() => {});
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Only allow ELECTRON_START_URL in unpackaged local development mode
  const devStartUrl = !app.isPackaged ? process.env.ELECTRON_START_URL : null;
  if (devStartUrl) {
    mainWindow.loadURL(devStartUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting && keepRunningInBackground) {
      event.preventDefault();
      mainWindow.hide();
      sendToRenderer('habitra-minimized-to-tray', true);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Read bundled music manifest & discover audio files in dist/music or public/music
ipcMain.handle('habitra-get-music-manifest', async () => {
  try {
    const manifestPath = resolveAssetPath('music/manifest.json');
    if (!manifestPath) return null;

    const raw = fs.readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    const musicRoot = path.dirname(manifestPath);
    const categories = ['ambient', 'focus', 'nature', 'rain', 'instrumental'];
    const existingSrcSet = new Set(
      Array.isArray(parsed.tracks)
        ? parsed.tracks.map((t) => String(t.src || '').replace(/^\.\//, ''))
        : []
    );

    if (!Array.isArray(parsed.tracks)) {
      parsed.tracks = [];
    }

    for (const category of categories) {
      const catDir = path.join(musicRoot, category);
      if (!fs.existsSync(catDir)) continue;
      const entries = fs.readdirSync(catDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!/\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i.test(entry.name)) continue;
        const relSrc = `music/${category}/${entry.name}`;
        if (!existingSrcSet.has(relSrc)) {
          existingSrcSet.add(relSrc);
          const cleanTitle = entry.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          parsed.tracks.push({
            id: `bundled_${category}_${entry.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
            title: cleanTitle,
            artist: 'Local Music Folder',
            category,
            src: `./${relSrc}`,
            source: 'bundled_file',
          });
        }
      }
    }

    return parsed;
  } catch {
    return null;
  }
});

ipcMain.on('habitra-update-tray-tooltip', (_event, statusText) => {
  if (tray) {
    tray.setToolTip(statusText || '🌱 Habitra — Running');
  }
});

ipcMain.on('habitra-set-background-pref', (_event, enabled) => {
  keepRunningInBackground = Boolean(enabled);
});

ipcMain.on('habitra-set-startup-pref', (_event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      openAsHidden: true,
    });
  } catch {
    // Ignore on unsupported non-Windows/macOS platforms
  }
});

ipcMain.on('habitra-native-notification', (_event, payload) => {
  if (Notification.isSupported()) {
    const iconPath = resolveWindowIconPath();
    const notif = new Notification({
      title: (payload && payload.title) || '🌱 Habitra',
      body: (payload && payload.body) || '',
      silent: Boolean(payload && payload.silent),
      icon: iconPath,
    });
    notif.on('click', () => {
      showAndFocusMainWindow();
      sendToRenderer('habitra-tray-action', 'open');
    });
    notif.show();
  }
});

app.whenReady().then(() => {
  if (gotTheLock) {
    createWindow();
    createTray();
  }
});

app.on('activate', () => {
  showAndFocusMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && (!keepRunningInBackground || isQuitting)) {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
