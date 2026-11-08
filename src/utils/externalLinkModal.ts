import { ref } from 'vue';
import { normalizeExternalUrl } from './openUrl';
import { logger } from '@/services/logger';

export const isLinkModalOpen = ref(false);
export const pendingLinkUrl = ref('');

type LinkPromptListener = (url: string) => void;
const listeners = new Set<LinkPromptListener>();

/**
 * 注册外部链接弹窗唤起监听器 (供 App.vue 挂载响应)
 */
export function onExternalLinkPrompt(callback: LinkPromptListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * 弹出外部链接确认询问对话框
 * @param rawUrl 待访问的外部链接地址
 */
export function openExternalLinkPrompt(rawUrl: string): void {
  const url = normalizeExternalUrl(rawUrl);
  if (!url) {
    logger.warn('system', 'invalidUrl', '忽略非外部跳转链接', { rawUrl });
    return;
  }

  logger.info('system', 'promptModal', '唤起便签外部链接确认弹窗', { targetUrl: url });
  pendingLinkUrl.value = url;
  isLinkModalOpen.value = true;

  // 通知所有已注册的活跃监听器
  for (const listener of listeners) {
    try {
      listener(url);
    } catch (err: any) {
      logger.error('system', 'promptCallbackError', '外部链接弹窗监听器回调异常', err);
    }
  }
}

/**
 * 关闭外部链接确认对话框
 */
export function closeExternalLinkPrompt(): void {
  isLinkModalOpen.value = false;
  pendingLinkUrl.value = '';
}
