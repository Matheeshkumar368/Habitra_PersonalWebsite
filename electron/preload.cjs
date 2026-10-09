// Secure Electron Preload Bridge for Habitra Windows Desktop Application
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('habitraDesktop', {
  isElectron: true,
  platform: process.platform,
  sendNativeNotification: (payload) => {
    ipcRenderer.send('habitra-native-notification', payload);
  },
  updateTrayTooltip: (statusText) => {
    ipcRenderer.send('habitra-update-tray-tooltip', statusText);
  },
  setBackgroundPref: (enabled) => {
    ipcRenderer.send('habitra-set-background-pref', Boolean(enabled));
  },
  setStartupPref: (enabled) => {
    ipcRenderer.send('habitra-set-startup-pref', Boolean(enabled));
  },
  getMusicManifest: () => {
    return ipcRenderer.invoke('habitra-get-music-manifest').catch(() => null);
  },
  onTrayAction: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('habitra-tray-action', listener);
    return () => {
      ipcRenderer.removeListener('habitra-tray-action', listener);
    };
  },
  onMinimizedToTray: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, minimized) => callback(Boolean(minimized));
    ipcRenderer.on('habitra-minimized-to-tray', listener);
    return () => {
      ipcRenderer.removeListener('habitra-minimized-to-tray', listener);
    };
  },
});
