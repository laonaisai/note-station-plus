import { contextBridge, ipcRenderer } from 'electron';

const api = {
  platform: process.platform,
  version: process.versions.electron,
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  setLocale: (locale: string) => ipcRenderer.send('app:setLocale', locale),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  onPromptExternalLink: (callback: (url: string) => void) => {
    const handler = (_event: any, url: string) => callback(url);
    ipcRenderer.on('app:promptExternalLink', handler);
    return () => ipcRenderer.removeListener('app:promptExternalLink', handler);
  },
  safeStorage: {
    isAvailable: () => ipcRenderer.invoke('safeStorage:isAvailable'),
    encryptString: (plainText: string) => ipcRenderer.invoke('safeStorage:encryptString', plainText),
    decryptString: (encryptedBase64: string) => ipcRenderer.invoke('safeStorage:decryptString', encryptedBase64)
  },
  print: {
    toPdf: (params: { html: string; title: string }) => ipcRenderer.invoke('print:toPdf', params),
    direct: (params: { html: string }) => ipcRenderer.invoke('print:direct', params)
  },
  updater: {
    download: (params: { url: string; fileName: string }) => ipcRenderer.invoke('updater:download', params),
    cancelDownload: () => ipcRenderer.invoke('updater:cancelDownload'),
    install: (params: { filePath: string }) => ipcRenderer.invoke('updater:install', params),
    showItemInFolder: (params: { filePath: string }) => ipcRenderer.invoke('updater:showItemInFolder', params),
    onDownloadProgress: (callback: (progress: { percent: number; receivedBytes: number; totalBytes: number; speedBytesPerSec: number; isComplete: boolean }) => void) => {
      const handler = (_event: any, p: any) => callback(p);
      ipcRenderer.on('updater:downloadProgress', handler);
      return () => ipcRenderer.removeListener('updater:downloadProgress', handler);
    }
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


