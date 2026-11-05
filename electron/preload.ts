import { contextBridge, ipcRenderer } from 'electron';

const api = {
  platform: process.platform,
  version: process.versions.electron,
  safeStorage: {
    isAvailable: () => ipcRenderer.invoke('safeStorage:isAvailable'),
    encryptString: (plainText: string) => ipcRenderer.invoke('safeStorage:encryptString', plainText),
    decryptString: (encryptedBase64: string) => ipcRenderer.invoke('safeStorage:decryptString', encryptedBase64)
  }
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


