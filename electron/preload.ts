import { contextBridge, ipcRenderer } from 'electron';

const api = {
  platform: process.platform,
  version: process.versions.electron
};

// Expose safe native capabilities to renderer
try {
  if (process.contextIsolated) {
    contextBridge.exposeInMainWorld('electronAPI', api);
  } else {
    (window as any).electronAPI = api;
  }
} catch {
  (window as any).electronAPI = api;
}


