import { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';

// Log and report uncaught exceptions so the user never gets silent failures
process.on('uncaughtException', (err) => {
  const errMsg = `[Uncaught Exception] ${err?.stack || err}`;
  console.error(errMsg);
  try {
    const logPath = path.join(app.getPath('userData'), 'crash.log');
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${errMsg}\n`);
  } catch {}
  try {
    dialog.showErrorBox('程序启动异常', `${err?.message || err}\n\n详细信息已记录至系统日志。`);
  } catch {}
});

process.on('unhandledRejection', (reason) => {
  const errMsg = `[Unhandled Rejection] ${reason instanceof Error ? reason.stack : reason}`;
  console.error(errMsg);
  try {
    const logPath = path.join(app.getPath('userData'), 'crash.log');
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${errMsg}\n`);
  } catch {}
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// IPC handlers for local safeStorage DPAPI encryption
ipcMain.handle('safeStorage:isAvailable', () => {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
});

ipcMain.handle('safeStorage:encryptString', (_event, plainText: string) => {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(plainText).toString('base64');
    }
  } catch (err) {
    console.error('[safeStorage] encrypt failed:', err);
  }
  return null;
});

ipcMain.handle('safeStorage:decryptString', (_event, cipherBase64: string) => {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buf = Buffer.from(cipherBase64, 'base64');
      return safeStorage.decryptString(buf);
    }
  } catch (err) {
    console.error('[safeStorage] decrypt failed:', err);
  }
  return null;
});

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Determine preload script location (prefer .cjs, fallback to .js)
  const preloadCjs = path.join(__dirname, 'preload.cjs');
  const preloadJs = path.join(__dirname, 'preload.js');
  const preloadPath = fs.existsSync(preloadCjs) ? preloadCjs : preloadJs;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Note Station Plus',
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: true,
      contextIsolation: false, // Allows easy IPC and direct native integration in desktop shell
      webSecurity: false // Necessary for connecting to diverse local NAS HTTP/HTTPS endpoints without CORS/SSL blocking
    },
    frame: true,
    show: false,
    backgroundColor: '#f8fafc'
  });

  mainWindow.setMenuBarVisibility(false);

  // Fallback to show window if ready-to-show is delayed
  const showFallbackTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 3000);

  mainWindow.once('ready-to-show', () => {
    clearTimeout(showFallbackTimeout);
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Page failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
    dialog.showErrorBox('页面加载失败', `无法加载页面资源：\n${validatedURL}\n错误代码: ${errorCode} (${errorDescription})`);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open DevTools in development mode for easy debugging
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Support F12 to toggle DevTools during debugging
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

if (gotTheLock) {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}


