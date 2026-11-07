import { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, Menu, MenuItem } from 'electron';
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

// Allow self-signed SSL certificates for local NAS endpoints
app.commandLine.appendSwitch('ignore-certificate-errors');

app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  event.preventDefault();
  callback(true);
});

// App version IPC handler
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// Localized strings for main process dialogs and menus
type AppLocale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP';

const quitDialogMessages: Record<AppLocale, { title: string; message: string; detail: string; confirm: string; cancel: string }> = {
  'zh-CN': {
    title: '退出应用确认',
    message: '确定要关闭并退出 Note Station Plus 吗？',
    detail: '退出前请确保已完成当前便签编辑。',
    confirm: '确认退出',
    cancel: '取消'
  },
  'zh-TW': {
    title: '結束應用程式確認',
    message: '確定要關閉並結束 Note Station Plus 嗎？',
    detail: '結束前請確認已完成目前便箋編輯。',
    confirm: '確認結束',
    cancel: '取消'
  },
  'en-US': {
    title: 'Exit Confirmation',
    message: 'Are you sure you want to close and exit Note Station Plus?',
    detail: 'Please make sure your note edits are saved before exiting.',
    confirm: 'Exit',
    cancel: 'Cancel'
  },
  'ja-JP': {
    title: 'アプリ終了の確認',
    message: 'Note Station Plus を終了してもよろしいですか？',
    detail: '終了する前にノートの編集が保存されていることを確認してください。',
    confirm: '終了する',
    cancel: 'キャンセル'
  }
};

const contextMenuMessages: Record<AppLocale, {
  copy: string;
  cut: string;
  paste: string;
  selectAll: string;
  undo: string;
  redo: string;
}> = {
  'zh-CN': { copy: '复制', cut: '剪切', paste: '粘贴', selectAll: '全选', undo: '撤销', redo: '重做' },
  'zh-TW': { copy: '複製', cut: '剪下', paste: '貼上', selectAll: '全選', undo: '復原', redo: '重做' },
  'en-US': { copy: 'Copy', cut: 'Cut', paste: 'Paste', selectAll: 'Select All', undo: 'Undo', redo: 'Redo' },
  'ja-JP': { copy: 'コピー', cut: '切り取り', paste: '貼り付け', selectAll: 'すべて選択', undo: '元に戻す', redo: 'やり直し' }
};

function normalizeLocale(rawLocale?: string): AppLocale {
  if (!rawLocale) return 'zh-CN';
  const lower = rawLocale.toLowerCase();
  if (lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-mo') || lower.startsWith('zh-hant')) {
    return 'zh-TW';
  }
  if (lower.startsWith('zh')) {
    return 'zh-CN';
  }
  if (lower.startsWith('ja')) {
    return 'ja-JP';
  }
  if (lower.startsWith('en')) {
    return 'en-US';
  }
  return 'zh-CN';
}

let currentAppLocale: AppLocale = 'zh-CN';

ipcMain.on('app:setLocale', (_event, locale: string) => {
  currentAppLocale = normalizeLocale(locale);
});

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

// IPC handlers for note printing and PDF export
ipcMain.handle('print:toPdf', async (_event, { html, title }: { html: string; title: string }) => {
  if (!mainWindow) return { success: false, error: '主窗口未就绪' };
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '导出便签为 PDF 文档',
      defaultPath: `${(title || '便签').replace(/[\\/:*?"<>|]/g, '_')}.pdf`,
      filters: [{ name: 'PDF 文档 (*.pdf)', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfBuffer = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        marginType: 'custom',
        top: 0.8,
        bottom: 0.8,
        left: 0.8,
        right: 0.8
      }
    });
    printWin.destroy();
    fs.writeFileSync(filePath, pdfBuffer);
    return { success: true, filePath };
  } catch (err: any) {
    console.error('[print:toPdf] failed:', err);
    return { success: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('print:direct', async (_event, { html }: { html: string }) => {
  try {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    printWin.webContents.print({ silent: false, printBackground: true }, (_success, _failureReason) => {
      try {
        if (!printWin.isDestroyed()) printWin.destroy();
      } catch {}
    });
    return { success: true };
  } catch (err: any) {
    console.error('[print:direct] failed:', err);
    return { success: false, error: err?.message || String(err) };
  }
});

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

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

  // Register context menu for text selection, copy, paste, etc.
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();
    const cm = contextMenuMessages[currentAppLocale] || contextMenuMessages['zh-CN'];

    if (params.selectionText && params.selectionText.trim().length > 0) {
      menu.append(new MenuItem({ label: cm.copy, role: 'copy' }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.isEditable) {
      menu.append(new MenuItem({ label: cm.undo, role: 'undo' }));
      menu.append(new MenuItem({ label: cm.redo, role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: cm.cut, role: 'cut' }));
      menu.append(new MenuItem({ label: cm.copy, role: 'copy' }));
      menu.append(new MenuItem({ label: cm.paste, role: 'paste' }));
      menu.append(new MenuItem({ label: cm.selectAll, role: 'selectAll' }));
    } else if (params.selectionText && params.selectionText.trim().length > 0) {
      menu.append(new MenuItem({ label: cm.selectAll, role: 'selectAll' }));
    }

    if (menu.items.length > 0) {
      menu.popup({ window: mainWindow || undefined });
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('close', (e) => {
    if (isQuitting) {
      return;
    }

    e.preventDefault();

    const texts = quitDialogMessages[currentAppLocale] || quitDialogMessages['zh-CN'];
    const choice = dialog.showMessageBoxSync(mainWindow!, {
      type: 'question',
      buttons: [texts.confirm, texts.cancel],
      defaultId: 0,
      cancelId: 1,
      title: texts.title,
      message: texts.message,
      detail: texts.detail,
      noLink: true
    });

    if (choice === 0) {
      isQuitting = true;
      mainWindow?.destroy();
      app.quit();
    }
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
    currentAppLocale = normalizeLocale(app.getLocale());
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


