// Electron Main Process for Habitra Windows Desktop (.exe) & System Tray Background Operation
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  ipcMain,
  nativeImage,
} = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure Windows 10/11 Toast Notifications work properly with AppUserModelID
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

// Enforce Single Instance Lock so launching Habitra again restores the existing window from tray
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function resolveIconPath() {
  const distIcon = path.join(__dirname, '../dist/icon.svg');
  const publicIcon = path.join(__dirname, '../public/icon.svg');
  return fs.existsSync(distIcon) ? distIcon : publicIcon;
}

function createTray() {
  try {
    const iconPath = resolveIconPath();
    const img = nativeImage.createFromPath(iconPath);
    tray = new Tray(img);
    tray.setToolTip('🌱 Habitra — Small Habits. Big Life.');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Habitra',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('habitra-tray-action', 'open');
          }
        },
      },
      {
        label: "Today's Progress",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('habitra-tray-action', 'progress');
          }
        },
      },
      {
        label: 'Start Focus Timer',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('habitra-tray-action', 'start_focus');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Pause Notifications',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('habitra-tray-action', 'pause_notif');
          }
        },
      },
      {
        label: 'Resume Notifications',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('habitra-tray-action', 'resume_notif');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Lock Habitra',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.webContents.send('habitra-tray-action', 'lock');
          }
        },
      },
      {
        label: 'Settings',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('habitra-tray-action', 'settings');
          }
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
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch {
    // Tray initialization fallback if OS environment is headless
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Habitra — Small Habits. Big Life.',
    backgroundColor: '#0b0f19',
    icon: resolveIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false, // Keep focus timer & reminder scheduler accurate when minimized
    },
  });

  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting && keepRunningInBackground) {
      event.preventDefault();
      mainWindow.hide();
      mainWindow.webContents.send('habitra-minimized-to-tray', true);
    }
  });
}

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
    const notif = new Notification({
      title: payload.title || '🌱 Habitra',
      body: payload.body || '',
      silent: Boolean(payload.silent),
    });
    notif.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    notif.show();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('before-quit', () => {
  isQuitting = true;
});
