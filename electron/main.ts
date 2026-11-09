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

// Safe external browser launcher IPC handler
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  try {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'Invalid URL scheme' };
  } catch (err: any) {
    console.error('[shell:openExternal] failed:', err);
    return { success: false, error: err?.message || String(err) };
  }
});

// Localized strings for main process dialogs and menus
type AppLocale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP' | 'ko-KR';

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
  },
  'ko-KR': {
    title: '앱 종료 확인',
    message: 'Note Station Plus를 종료하시겠습니까?',
    detail: '종료하기 전에 현재 노트 편집이 저장되었는지 확인해 주세요.',
    confirm: '종료',
    cancel: '취소'
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
  'ja-JP': { copy: 'コピー', cut: '切り取り', paste: '貼り付け', selectAll: 'すべて選択', undo: '元に戻す', redo: 'やり直し' },
  'ko-KR': { copy: '복사', cut: '잘라내기', paste: '붙여넣기', selectAll: '모두 선택', undo: '실행 취소', redo: '다시 실행' }
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
  if (lower.startsWith('ko')) {
    return 'ko-KR';
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

// IPC handlers for in-app application updates and installation
let currentDownloadAbortController: AbortController | null = null;
let isQuitting = false;

ipcMain.handle('updater:download', async (event, { url, fileName }: { url: string; fileName: string }) => {
  if (!url) return { success: false, error: '下载地址不能为空' };

  try {
    const downloadsDir = app.getPath('downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    const safeFileName = (fileName || path.basename(new URL(url).pathname) || 'note-station-plus-update').replace(/[\\/:*?"<>|]/g, '_');
    const targetPath = path.join(downloadsDir, safeFileName);

    currentDownloadAbortController = new AbortController();
    const response = await fetch(url, {
      signal: currentDownloadAbortController.signal,
      headers: {
        'User-Agent': 'NoteStationPlus-AppUpdater'
      }
    });

    if (!response.ok || !response.body) {
      return { success: false, error: `下载响应异常 HTTP ${response.status}: ${response.statusText}` };
    }

    const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);
    let receivedBytes = 0;
    let lastTime = Date.now();
    let lastBytes = 0;
    let currentSpeed = 0;

    const fileStream = fs.createWriteStream(targetPath);
    const { Readable } = await import('stream');
    const nodeReadable = Readable.fromWeb(response.body as any);

    return await new Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }>((resolve) => {
      nodeReadable.on('data', (chunk: Buffer) => {
        receivedBytes += chunk.length;
        fileStream.write(chunk);

        const now = Date.now();
        if (now - lastTime >= 250) {
          const deltaBytes = receivedBytes - lastBytes;
          const deltaTime = (now - lastTime) / 1000;
          currentSpeed = deltaTime > 0 ? Math.round(deltaBytes / deltaTime) : 0;
          lastTime = now;
          lastBytes = receivedBytes;

          const percent = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0;
          event.sender.send('updater:downloadProgress', {
            percent,
            receivedBytes,
            totalBytes,
            speedBytesPerSec: currentSpeed,
            isComplete: false
          });
        }
      });

      nodeReadable.on('end', () => {
        fileStream.end();
        currentDownloadAbortController = null;

        // On Linux, make AppImage executable
        if (process.platform === 'linux' && targetPath.toLowerCase().endsWith('.appimage')) {
          try {
            fs.chmodSync(targetPath, 0o755);
          } catch (e) {
            console.warn('[updater] Failed to chmod AppImage:', e);
          }
        }

        event.sender.send('updater:downloadProgress', {
          percent: 100,
          receivedBytes,
          totalBytes: totalBytes || receivedBytes,
          speedBytesPerSec: 0,
          isComplete: true
        });

        resolve({ success: true, filePath: targetPath, fileName: safeFileName });
      });

      nodeReadable.on('error', (err: any) => {
        fileStream.close();
        try { fs.unlinkSync(targetPath); } catch {}
        currentDownloadAbortController = null;
        resolve({ success: false, error: err?.message || String(err) });
      });

      fileStream.on('error', (err: any) => {
        nodeReadable.destroy();
        try { fs.unlinkSync(targetPath); } catch {}
        currentDownloadAbortController = null;
        resolve({ success: false, error: err?.message || String(err) });
      });
    });
  } catch (err: any) {
    currentDownloadAbortController = null;
    return { success: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('updater:cancelDownload', () => {
  if (currentDownloadAbortController) {
    currentDownloadAbortController.abort();
    currentDownloadAbortController = null;
    return { success: true };
  }
  return { success: false, error: '当前没有正在进行的下载' };
});

ipcMain.handle('updater:install', async (_event, { filePath }: { filePath: string }) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return { success: false, error: '安装包文件不存在: ' + filePath };
  }
  try {
    const ext = path.extname(filePath).toLowerCase();
    const { spawn } = await import('child_process');

    if (process.platform === 'win32') {
      // Windows: .exe (NSIS Setup 安装程序或便携版)
      // 使用 detached 独立进程组启动，避免安装包成为 Electron 子进程被误杀
      let hasError = false;
      const child = spawn(filePath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.on('error', (err) => {
        hasError = true;
        console.error('[updater] 启动 Windows 安装程序失败:', err);
      });
      child.unref();

      // 延时 1 秒优雅退出当前应用，释放文件句柄锁，以便安装包顺畅覆盖并更新
      setTimeout(() => {
        if (!hasError) {
          isQuitting = true;
          app.exit(0);
        }
      }, 1000);

      return { success: true };
    } else if (process.platform === 'linux') {
      if (ext === '.appimage') {
        // Linux AppImage:
        // 1. 确保可执行权限 (chmod +x)
        try {
          fs.chmodSync(filePath, 0o755);
        } catch (e) {
          console.warn('[updater] chmod AppImage 失败:', e);
        }

        // 2. 注入 APPIMAGE_EXTRACT_AND_RUN=1，确保在未安装 libfuse2 的现代 Linux 系统（如 Ubuntu 22.04+）上无需 FUSE 即可正常启动
        let hasError = false;
        const env = { ...process.env, APPIMAGE_EXTRACT_AND_RUN: '1' };
        const child = spawn(filePath, [], {
          detached: true,
          stdio: 'ignore',
          env
        });
        child.on('error', (err) => {
          hasError = true;
          console.error('[updater] 启动 Linux AppImage 失败:', err);
        });
        child.unref();

        // 3. 延时 1 秒退出当前应用，让出 singleInstanceLock，保证新 AppImage 顺利拉起
        setTimeout(() => {
          if (!hasError) {
            isQuitting = true;
            app.exit(0);
          }
        }, 1000);

        return { success: true };
      } else if (ext === '.deb') {
        // Debian/Ubuntu deb 安装包：在文件管理器中定位并尝试调用系统安装器
        shell.showItemInFolder(filePath);
        try {
          await shell.openPath(filePath);
        } catch {}
        return { success: true };
      } else {
        const openRes = await shell.openPath(filePath);
        if (openRes) {
          return { success: false, error: openRes };
        }
        return { success: true };
      }
    } else {
      // macOS / 其他平台
      const openRes = await shell.openPath(filePath);
      if (openRes) {
        return { success: false, error: openRes };
      }
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('updater:showItemInFolder', (_event, { filePath }: { filePath: string }) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return { success: true };
  }
  return { success: false, error: '文件不存在' };
});

let mainWindow: BrowserWindow | null = null;

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

  // Prevent accidental in-app navigation when links are clicked, avoiding app UI being overwritten
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl && navigationUrl.startsWith(devUrl)) {
      return;
    }
    if (navigationUrl.startsWith('file://')) {
      return;
    }
    // Block navigation that would overwrite the main application window
    event.preventDefault();

    // Notify renderer process to display the External Link confirmation dialog
    console.log('[will-navigate] Intercepted external navigation, sending prompt to renderer for:', navigationUrl);
    mainWindow?.webContents.send('app:promptExternalLink', navigationUrl);
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


