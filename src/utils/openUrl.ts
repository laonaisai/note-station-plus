import { showToast } from '@/utils/toast';
import { t } from '@/i18n';

/**
 * 校验 URL 协议是否为支持的外部跳转协议
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:');
}

/**
 * 使用操作系统默认浏览器打开外部链接
 */
export async function openInExternalBrowser(rawUrl: string): Promise<boolean> {
  if (!rawUrl) return false;
  const url = rawUrl.trim();

  if (!isSafeExternalUrl(url)) {
    console.warn('[openInExternalBrowser] Refused to open unsafe URL:', url);
    showToast(t('common.error') || '非法的外部链接协议', 'error');
    return false;
  }

  const win = typeof window !== 'undefined' ? window : undefined;

  // 1. 优先调用 preload 注入的 electronAPI.openExternal
  if (win && typeof (win as any).electronAPI?.openExternal === 'function') {
    try {
      const res = await (win as any).electronAPI.openExternal(url);
      if (res?.success !== false) {
        return true;
      }
    } catch (e) {
      console.warn('[openInExternalBrowser] electronAPI.openExternal call failed:', e);
    }
  }

  // 2. 备用：若存在 Node 环境 require('electron').shell
  try {
    const req = typeof require === 'function' ? require : (win && typeof (win as any).require === 'function' ? (win as any).require : null);
    if (req) {
      const electron = req('electron');
      if (electron?.shell?.openExternal) {
        await electron.shell.openExternal(url);
        return true;
      }
    }
  } catch (e) {
    console.warn('[openInExternalBrowser] require(electron) fallback failed:', e);
  }

  // 3. 浏览器环境 Fallback：通过 window.open
  if (win && typeof win.open === 'function') {
    try {
      const popup = win.open(url, '_blank', 'noopener,noreferrer');
      if (popup) return true;
    } catch (e) {
      console.error('[openInExternalBrowser] window.open failed:', e);
    }
  }

  showToast(t('common.error') || '无法打开外部链接', 'error');
  return false;
}
