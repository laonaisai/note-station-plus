import { ref } from 'vue';

export const isLinkModalOpen = ref(false);
export const pendingLinkUrl = ref('');

/**
 * 弹出外部链接确认询问对话框
 * @param url 待访问的外部链接地址
 */
export function openExternalLinkPrompt(url: string): void {
  if (!url || typeof url !== 'string') return;
  const cleanUrl = url.trim();
  if (!cleanUrl) return;

  pendingLinkUrl.value = cleanUrl;
  isLinkModalOpen.value = true;
}

/**
 * 关闭外部链接确认对话框
 */
export function closeExternalLinkPrompt(): void {
  isLinkModalOpen.value = false;
  pendingLinkUrl.value = '';
}
