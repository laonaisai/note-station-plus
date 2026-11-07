<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
      <!-- Modal Header -->
      <div class="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center space-x-2 text-white">
          <svg class="w-4 h-4 text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-semibold text-sm">{{ t('about.modalTitle') }}</span>
        </div>
        <button
          @click="$emit('close')"
          class="text-slate-400 hover:text-white transition-colors p-1 rounded cursor-pointer"
          :title="t('common.close')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 space-y-4">
        <!-- Hero section: Logo + Title + Version -->
        <div class="flex flex-col items-center text-center pt-1 pb-2">
          <img
            src="/logo.png"
            alt="Note Station Plus"
            class="w-16 h-16 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 p-1 bg-white dark:bg-slate-800 mb-2.5 object-contain"
          />
          <h3 class="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">Note Station Plus</h3>
          <div class="flex items-center gap-1.5 mt-1">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-blue-50 dark:bg-blue-950/60 text-syno-blue dark:text-sky-400 border border-blue-200 dark:border-blue-900">
              v{{ appVersion }}
            </span>
          </div>
        </div>

        <!-- Description (介绍) -->
        <div class="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {{ t('about.desc') }}
        </div>

        <!-- Meta Details Table -->
        <div class="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700 text-xs">
          <!-- 名称 -->
          <div class="px-3.5 py-2.5 flex items-center justify-between">
            <span class="text-slate-500 dark:text-slate-400 font-medium flex items-center">
              <svg class="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {{ t('about.appName') }}
            </span>
            <span class="font-semibold text-slate-800 dark:text-slate-100">Note Station Plus</span>
          </div>

          <!-- 版本号 -->
          <div class="px-3.5 py-2.5 flex items-center justify-between">
            <span class="text-slate-500 dark:text-slate-400 font-medium flex items-center">
              <svg class="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {{ t('about.version') }}
            </span>
            <span class="font-mono text-slate-700 dark:text-slate-300">v{{ appVersion }}</span>
          </div>

          <!-- 开发者 -->
          <div class="px-3.5 py-2.5 flex items-center justify-between">
            <span class="text-slate-500 dark:text-slate-400 font-medium flex items-center">
              <svg class="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {{ t('about.developer') }}
            </span>
            <span class="font-semibold text-slate-800 dark:text-slate-100">{{ t('about.developerName') }}</span>
          </div>

          <!-- 源码地址 -->
          <div class="px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span class="text-slate-500 dark:text-slate-400 font-medium flex items-center shrink-0">
              <svg class="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              {{ t('about.sourceUrl') }}
            </span>
            <div class="flex items-center space-x-1.5 truncate">
              <a
                :href="sourceUrl"
                target="_blank"
                class="text-syno-blue dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 hover:underline truncate max-w-[210px]"
                :title="sourceUrl"
              >
                {{ sourceUrl }}
              </a>
              <button
                @click="copySourceUrl"
                class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                :title="t('about.copySourceUrl')"
              >
                <svg v-if="!isCopied" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else class="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <button
          @click="$emit('close')"
          class="px-4 py-1.5 bg-syno-blue hover:bg-blue-600 text-white text-xs rounded-lg transition font-medium cursor-pointer shadow-sm"
        >
          {{ t('common.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { t } from '@/i18n';
import pkg from '../../package.json';
import { showToast } from '@/utils/toast';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const appVersion = ref(
  (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__)
    ? __APP_VERSION__
    : (pkg.version || '20261105.19.35')
);
const sourceUrl = 'https://github.com/laonaisai/note-station-plus';
const isCopied = ref(false);

async function copySourceUrl() {
  try {
    await navigator.clipboard.writeText(sourceUrl);
    isCopied.value = true;
    showToast(t('about.sourceCopied'), 'success');
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err) {
    showToast(t('about.copyFailed'), 'error');
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  if (window.electronAPI?.getAppVersion) {
    try {
      const ver = await window.electronAPI.getAppVersion();
      if (ver) {
        appVersion.value = ver;
      }
    } catch {}
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>
