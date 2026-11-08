<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    @click.self="handleClose"
  >
    <div
      class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      @keydown.esc="handleClose"
      tabindex="-1"
    >
      <!-- Modal Header -->
      <div class="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center space-x-2 text-white">
          <svg class="w-4 h-4 text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span class="font-semibold text-sm">{{ t('externalLink.modalTitle') }}</span>
        </div>
        <button
          @click="handleClose"
          class="text-slate-400 hover:text-white transition-colors p-1 rounded cursor-pointer"
          :title="t('externalLink.close')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 space-y-3.5">
        <p class="text-xs med:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
          {{ t('externalLink.message') }}
        </p>

        <!-- URL Display Box -->
        <div class="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg group transition-colors">
          <div class="flex items-start space-x-2">
            <svg class="w-4 h-4 text-syno-blue dark:text-sky-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <div class="flex-1 min-w-0">
              <span class="text-xs font-mono text-syno-blue dark:text-sky-400 break-all select-all leading-normal">
                {{ targetUrl }}
              </span>
            </div>
          </div>
        </div>

        <!-- Safety Warning Note -->
        <div class="flex items-center space-x-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-md border border-amber-200/80 dark:border-amber-900/50">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span class="leading-tight">{{ t('externalLink.warning') }}</span>
        </div>
      </div>

      <!-- Modal Footer Action Buttons -->
      <div class="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <!-- 复制链接按钮 -->
        <button
          type="button"
          @click="handleCopyLink"
          class="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:text-syno-blue dark:hover:text-sky-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          :title="t('externalLink.copyLink')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>{{ t('externalLink.copyLink') }}</span>
        </button>

        <div class="flex items-center space-x-2">
          <!-- 关闭按钮 -->
          <button
            type="button"
            @click="handleClose"
            class="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            {{ t('externalLink.close') }}
          </button>

          <!-- 打开链接按钮 -->
          <button
            type="button"
            @click="handleOpenLink"
            class="px-4 py-1.5 text-xs bg-syno-blue hover:bg-blue-600 text-white rounded-lg font-medium shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>{{ t('externalLink.openLink') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { t } from '@/i18n';
import { isLinkModalOpen, pendingLinkUrl, closeExternalLinkPrompt } from '@/utils/externalLinkModal';
import { openInExternalBrowser } from '@/utils/openUrl';
import { showToast } from '@/utils/toast';

const props = defineProps<{
  isOpen?: boolean;
  url?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const isOpen = computed(() => {
  return props.isOpen !== undefined ? props.isOpen : isLinkModalOpen.value;
});

const targetUrl = computed(() => {
  return props.url || pendingLinkUrl.value || '';
});

function handleClose() {
  closeExternalLinkPrompt();
  emit('close');
}

async function handleCopyLink() {
  if (!targetUrl.value) return;
  try {
    await navigator.clipboard.writeText(targetUrl.value);
    showToast(t('externalLink.copySuccess'), 'success');
  } catch (err) {
    console.error('Failed to copy link to clipboard:', err);
    showToast(t('common.error'), 'error');
  }
  handleClose();
}

async function handleOpenLink() {
  const url = targetUrl.value;
  handleClose();
  if (url) {
    await openInExternalBrowser(url);
  }
}
</script>
