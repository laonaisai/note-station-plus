import { showToast } from '@/utils/toast';
import { t } from '@/i18n';
import { logger } from '@/services/logger';

/**
 * 校验并规范化外部跳转链接
 * 支持 http://, https://, mailto:, // 协议相对地址，以及 www. 开头的外部地址
 * 排除 # 页内锚点、javascript:、data:、file: 等内部/危险协议
 */
export function normalizeExternalUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const lower = trimmed.toLowerCase();

  // 严格拒绝危险伪协议
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    logger.warn('system', 'unsafeProtocol', '拦截到危险协议外部链接', { url: trimmed });
    return null;
  }

  // 标准支持的协议
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:')) {
    return trimmed;
  }

  // 协议相对链接 (//example.com)
  if (trimmed.startsWith('//')) {
    return 'https:' + trimmed;
  }

  // 纯域名链接 (例如 www.baidu.com 或 example.com/path)
  if (/^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(trimmed)) {
    return 'https://' + trimmed;
  }

  return null;
}

/**
 * 校验 URL 协议是否为支持的安全外部协议
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  return normalizeExternalUrl(rawUrl) !== null;
}

/**
 * 使用操作系统默认浏览器打开外部链接
 */
export async function openInExternalBrowser(rawUrl: string): Promise<boolean> {
  const url = normalizeExternalUrl(rawUrl);
  if (!url) {
    logger.warn('system', 'invalidUrl', '拒绝打开不合法的外部链接', { rawUrl });
    showToast(t('common.error') || '非法的外部链接协议', 'error');
    return false;
  }

  logger.info('system', 'openExternal', '尝试通过系统默认浏览器打开外部链接', { url });

  const win = typeof window !== 'undefined' ? window : undefined;

  // 1. 优先调用 preload 注入的 electronAPI.openExternal
  if (win && typeof (win as any).electronAPI?.openExternal === 'function') {
    try {
      const res = await (win as any).electronAPI.openExternal(url);
      if (res?.success !== false) {
        logger.info('system', 'openExternalSuccess', '成功通过 electronAPI 打开外部链接', { url });
        return true;
      }
      logger.warn('system', 'openExternalResultFalse', 'electronAPI 打开外部链接返回失败', { url, res });
    } catch (e: any) {
      logger.error('system', 'openExternalError', 'electronAPI.openExternal 调用异常', e, { url });
    }
  }

  // 2. 备用：若存在 Node 环境 require('electron').shell
  try {
    const req = typeof require === 'function' ? require : (win && typeof (win as any).require === 'function' ? (win as any).require : null);
    if (req) {
      const electron = req('electron');
      if (electron?.shell?.openExternal) {
        await electron.shell.openExternal(url);
        logger.info('system', 'openExternalSuccess', '成功通过 require(electron).shell 打开外部链接', { url });
        return true;
      }
    }
  } catch (e: any) {
    logger.warn('system', 'requireFallbackError', 'require(electron) fallback 调用异常', { url, error: e?.message || String(e) });
  }

  // 3. 浏览器环境 Fallback：通过 window.open
  if (win && typeof win.open === 'function') {
    try {
      const popup = win.open(url, '_blank', 'noopener,noreferrer');
      if (popup) {
        logger.info('system', 'openExternalSuccess', '成功通过 window.open 打开外部链接', { url });
        return true;
      }
    } catch (e: any) {
      logger.error('system', 'windowOpenError', 'window.open 调用失败', e, { url });
    }
  }

  logger.error('system', 'openExternalFailed', '所有外部链接打开途径均失败', undefined, { url });
  showToast(t('common.error') || '无法打开外部链接', 'error');
  return false;
}
