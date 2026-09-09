const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process (React app)
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron
});
