import { contextBridge, ipcRenderer } from 'electron';

// Expose safe native capabilities to renderer if contextIsolation is enabled
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron
});
