<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col">
      <!-- Modal Header -->
      <div class="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
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
      <div class="p-5 space-y-4 overflow-y-auto flex-1">
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

          <!-- 版本号与检查更新 -->
          <div class="px-3.5 py-2.5 flex items-center justify-between">
            <span class="text-slate-500 dark:text-slate-400 font-medium flex items-center">
              <svg class="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {{ t('about.version') }}
            </span>
            <div class="flex items-center space-x-2">
              <span class="font-mono text-slate-700 dark:text-slate-300">v{{ appVersion }}</span>
              <button
                @click="handleCheckUpdates"
                :disabled="isCheckingUpdate || downloadStatus === 'downloading'"
                class="px-2 py-0.5 text-[11px] bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-medium transition cursor-pointer flex items-center disabled:opacity-50"
                :title="t('about.checkUpdates')"
              >
                <svg
                  :class="['w-3 h-3 mr-1 text-slate-400', isCheckingUpdate ? 'animate-spin text-syno-blue' : '']"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{{ isCheckingUpdate ? t('about.checkingUpdates') : t('about.checkUpdates') }}</span>
              </button>
            </div>
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

        <!-- ================= 版本更新与下载安装区域 ================= -->

        <!-- 1. 发现新版本状态卡片 -->
        <div
          v-if="updateResult?.hasUpdate"
          class="rounded-lg bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-3 space-y-3 animate-in fade-in duration-200"
        >
          <!-- 头部信息：新版本号与对应安装包 -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center space-x-2 min-w-0">
              <span class="flex h-2.5 w-2.5 relative shrink-0">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-syno-blue"></span>
              </span>
              <div class="text-xs truncate">
                <span class="font-semibold text-slate-800 dark:text-slate-100 mr-1.5">{{ t('about.newVersionAvailable') }}:</span>
                <span class="font-mono font-bold text-syno-blue dark:text-sky-400">v{{ updateResult.latestVersion }}</span>
              </div>
            </div>

            <!-- 当前平台标签 -->
            <span class="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 shrink-0">
              {{ currentPlatformLabel }}
            </span>
          </div>

          <!-- 适配安装包提示与切换 -->
          <div v-if="activeAsset" class="bg-white/80 dark:bg-slate-900/70 border border-blue-100 dark:border-slate-800 rounded-md p-2 flex items-center justify-between gap-2 text-xs">
            <div class="flex items-center space-x-1.5 min-w-0">
              <svg class="w-3.5 h-3.5 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <div class="truncate text-[11px] text-slate-700 dark:text-slate-300">
                <span class="font-mono font-medium">{{ activeAsset.name }}</span>
                <span v-if="activeAsset.sizeFormatted" class="text-slate-400 ml-1.5">({{ activeAsset.sizeFormatted }})</span>
              </div>
            </div>

            <!-- 若有多个同平台安装包，允许切换 (如 Linux AppImage 与 deb) -->
            <div v-if="platformAlternativeAssets.length > 0" class="shrink-0 flex items-center space-x-1">
              <button
                v-for="alt in platformAlternativeAssets"
                :key="alt.name"
                @click="selectedAsset = alt"
                :class="[
                  'text-[10px] px-1.5 py-0.5 rounded border transition cursor-pointer font-medium',
                  activeAsset.name === alt.name
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                ]"
              >
                {{ alt.kind === 'deb' ? 'deb' : (alt.kind === 'portable' ? '便携版' : alt.kind) }}
              </button>
            </div>
          </div>

          <!-- 1.1 状态：准备下载 (Idle) -->
          <div v-if="downloadStatus === 'idle'" class="flex items-center justify-between pt-0.5">
            <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {{ t('about.readyToInstall') }}
            </div>
            <div class="flex items-center space-x-2 shrink-0">
              <button
                @click="handleStartUpdate"
                class="px-3.5 py-1.5 text-xs bg-syno-blue hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded-lg shadow-2xs transition cursor-pointer flex items-center space-x-1"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{{ t('about.updateNow') }}</span>
              </button>
            </div>
          </div>

          <!-- 1.2 状态：正在下载中 (Downloading) -->
          <div v-else-if="downloadStatus === 'downloading'" class="space-y-2 pt-1 animate-in fade-in duration-200">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-600 dark:text-slate-300 font-medium flex items-center space-x-1.5">
                <svg class="w-3.5 h-3.5 animate-spin text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{{ t('about.downloadingUpdate') }}</span>
              </span>
              <span class="font-mono font-semibold text-syno-blue dark:text-sky-400">{{ downloadPercent }}%</span>
            </div>

            <!-- 进度条 -->
            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                class="bg-syno-blue h-2 rounded-full transition-all duration-300 ease-out"
                :style="{ width: `${downloadPercent}%` }"
              ></div>
            </div>

            <!-- 详情与取消 -->
            <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{{ downloadDetailsText }}</span>
              <button
                @click="handleCancelDownload"
                class="text-rose-500 hover:text-rose-600 hover:underline cursor-pointer font-medium"
              >
                {{ t('about.cancelDownload') }}
              </button>
            </div>
          </div>

          <!-- 1.3 状态：下载完成，提示安装 (Downloaded) -->
          <div v-else-if="downloadStatus === 'downloaded'" class="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2.5 animate-in fade-in duration-200">
            <div class="flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300">
              <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="font-semibold">{{ t('about.downloadComplete') }}！{{ t('about.readyToInstall') }}</div>
            </div>

            <div v-if="downloadedFilePath" class="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate bg-white/70 dark:bg-slate-900/60 p-1.5 rounded border border-emerald-100 dark:border-emerald-900">
              {{ downloadedFilePath }}
            </div>

            <!-- 安装操作按钮组 -->
            <div class="flex items-center justify-end space-x-2 pt-1">
              <button
                v-if="downloadedFilePath"
                @click="handleOpenFolder"
                class="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium hover:bg-slate-50 transition cursor-pointer"
              >
                {{ t('about.openFolder') }}
              </button>
              <button
                v-if="downloadedFilePath"
                @click="handleInstall"
                class="px-3.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded font-medium shadow-2xs transition cursor-pointer flex items-center space-x-1"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ t('about.installNow') }}</span>
              </button>
            </div>
          </div>

          <!-- 底部手动下载链接 -->
          <div class="flex items-center justify-between pt-1 border-t border-blue-100/80 dark:border-blue-900/40 text-[11px]">
            <a
              :href="updateResult.releaseUrl"
              target="_blank"
              @click.prevent="openReleaseUrl(updateResult.releaseUrl)"
              class="text-slate-500 hover:text-syno-blue dark:text-slate-400 dark:hover:text-sky-300 underline cursor-pointer"
            >
              {{ t('about.manualDownload') }} (GitHub Releases)
            </a>
            <span class="text-slate-400">{{ updateResult.publishedAt ? new Date(updateResult.publishedAt).toLocaleDateString() : '' }}</span>
          </div>
        </div>

        <!-- 2. 已是最新版本 -->
        <div
          v-else-if="updateResult && !updateResult.hasUpdate"
          class="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-400 animate-in fade-in duration-200"
        >
          <svg class="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-medium">{{ t('about.isLatestVersion') }} (v{{ appVersion }})</span>
        </div>

        <!-- 3. 检查更新异常 -->
        <div
          v-else-if="updateError"
          class="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-200"
        >
          <div class="flex items-center space-x-2 truncate pr-2">
            <svg class="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span class="truncate">{{ updateError }}</span>
          </div>
          <div class="flex items-center space-x-1.5 shrink-0">
            <button
              @click="handleCheckUpdates"
              class="px-2 py-0.5 text-[11px] bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer font-medium"
            >
              {{ t('about.retryCheck') }}
            </button>
            <button
              @click="openReleaseUrl(GITHUB_RELEASES_URL)"
              class="px-2 py-0.5 text-[11px] bg-amber-600 text-white rounded hover:bg-amber-700 transition cursor-pointer font-medium"
            >
              {{ t('about.viewAllReleases') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <button
          @click="$emit('open-logs')"
          class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg transition font-medium cursor-pointer flex items-center shadow-2xs"
        >
          <svg class="w-3.5 h-3.5 mr-1 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {{ t('about.viewLogs') }}
        </button>

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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { t } from '@/i18n';
import pkg from '../../package.json';
import { showToast } from '@/utils/toast';
import {
  checkForUpdates,
  GITHUB_RELEASES_URL,
  type UpdateCheckResult,
  type ReleaseAsset,
  formatBytes
} from '@/services/updateChecker';
import { openInExternalBrowser } from '@/utils/openUrl';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-logs'): void;
}>();

// Read query param test_version if present (for dev testing)
const queryTestVersion = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('test_version') : null;
const appVersion = ref(
  queryTestVersion ||
  ((typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__)
    ? __APP_VERSION__
    : (pkg.version || '20261105.19.35'))
);
const sourceUrl = 'https://github.com/laonaisai/note-station-plus';
const isCopied = ref(false);

const isCheckingUpdate = ref(false);
const updateResult = ref<UpdateCheckResult | null>(null);
const updateError = ref<string | null>(null);

// 下载与安装更新状态
const downloadStatus = ref<'idle' | 'downloading' | 'downloaded'>('idle');
const downloadPercent = ref(0);
const downloadReceivedBytes = ref(0);
const downloadTotalBytes = ref(0);
const downloadSpeed = ref(0);
const downloadedFilePath = ref('');
const selectedAsset = ref<ReleaseAsset | null>(null);

let unsubscribeProgress: (() => void) | null = null;

// 当前选定用于下载的安装包
const activeAsset = computed<ReleaseAsset | null>(() => {
  if (selectedAsset.value) return selectedAsset.value;
  return updateResult.value?.matchedAsset || updateResult.value?.assets?.[0] || null;
});

// 当前平台的备选安装包列表 (例如 Linux 下同时提供 AppImage 和 deb)
const platformAlternativeAssets = computed<ReleaseAsset[]>(() => {
  if (!updateResult.value || !updateResult.value.assets) return [];
  const currentPlatform = updateResult.value.platform;
  return updateResult.value.assets.filter((a) => a.platform === currentPlatform);
});

// 当前运行平台的友好标签
const currentPlatformLabel = computed(() => {
  const p = updateResult.value?.platform || 'other';
  if (p === 'windows') return 'Windows (x64)';
  if (p === 'linux') return 'Linux (x64)';
  if (p === 'mac') return 'macOS';
  return 'Desktop';
});

// 下载进度文本
const downloadDetailsText = computed(() => {
  const receivedStr = formatBytes(downloadReceivedBytes.value);
  const totalStr = formatBytes(downloadTotalBytes.value);
  const speedStr = formatSpeed(downloadSpeed.value);
  return `${receivedStr} / ${totalStr} • ${speedStr}`;
});

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s';
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

async function handleCheckUpdates() {
  if (isCheckingUpdate.value) return;
  isCheckingUpdate.value = true;
  updateError.value = null;
  downloadStatus.value = 'idle';

  try {
    const res = await checkForUpdates(appVersion.value);
    updateResult.value = res;
    selectedAsset.value = res.matchedAsset || (res.assets?.[0] ?? null);
    if (res.hasUpdate) {
      showToast(`${t('about.newVersionAvailable')}: v${res.latestVersion}`, 'info');
    }
  } catch (err: any) {
    updateError.value = err?.message || t('about.updateCheckFailed');
  } finally {
    isCheckingUpdate.value = false;
  }
}

async function handleStartUpdate() {
  const asset = activeAsset.value;
  if (!asset || !asset.downloadUrl) {
    await openReleaseUrl(updateResult.value?.releaseUrl || GITHUB_RELEASES_URL);
    return;
  }

  // 1. 若处于 Electron 桌面客户端环境，调用原生下载与进度跟踪
  if (typeof window !== 'undefined' && window.electronAPI?.updater?.download) {
    downloadStatus.value = 'downloading';
    downloadPercent.value = 0;
    downloadReceivedBytes.value = 0;
    downloadTotalBytes.value = asset.size || 0;
    downloadSpeed.value = 0;

    if (window.electronAPI.updater.onDownloadProgress) {
      unsubscribeProgress = window.electronAPI.updater.onDownloadProgress((p) => {
        downloadPercent.value = p.percent;
        downloadReceivedBytes.value = p.receivedBytes;
        downloadTotalBytes.value = p.totalBytes;
        downloadSpeed.value = p.speedBytesPerSec;
      });
    }

    try {
      const res = await window.electronAPI.updater.download({
        url: asset.downloadUrl,
        fileName: asset.name
      });

      if (res.success && res.filePath) {
        downloadStatus.value = 'downloaded';
        downloadedFilePath.value = res.filePath;
        showToast(t('about.downloadComplete'), 'success');
      } else {
        downloadStatus.value = 'idle';
        const errText = res.error || t('about.downloadFailed');
        updateError.value = errText;
        showToast(errText, 'error');
      }
    } catch (err: any) {
      downloadStatus.value = 'idle';
      const errText = err?.message || t('about.downloadFailed');
      updateError.value = errText;
      showToast(errText, 'error');
    } finally {
      if (unsubscribeProgress) {
        unsubscribeProgress();
        unsubscribeProgress = null;
      }
    }
  } else {
    // 2. 网页版浏览器环境，触发原生浏览器下载
    try {
      const a = document.createElement('a');
      a.href = asset.downloadUrl;
      a.download = asset.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(t('about.browserDownloadStarted'), 'info');
    } catch {
      await openReleaseUrl(asset.downloadUrl);
    }
  }
}

async function handleCancelDownload() {
  if (typeof window !== 'undefined' && window.electronAPI?.updater?.cancelDownload) {
    try {
      await window.electronAPI.updater.cancelDownload();
    } catch {}
  }
  if (unsubscribeProgress) {
    unsubscribeProgress();
    unsubscribeProgress = null;
  }
  downloadStatus.value = 'idle';
}

async function handleInstall() {
  if (!downloadedFilePath.value) return;
  if (typeof window !== 'undefined' && window.electronAPI?.updater?.install) {
    try {
      const res = await window.electronAPI.updater.install({ filePath: downloadedFilePath.value });
      if (!res.success && res.error) {
        showToast(`启动安装失败: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`启动安装异常: ${err?.message || err}`, 'error');
    }
  }
}

async function handleOpenFolder() {
  if (!downloadedFilePath.value) return;
  if (typeof window !== 'undefined' && window.electronAPI?.updater?.showItemInFolder) {
    try {
      await window.electronAPI.updater.showItemInFolder({ filePath: downloadedFilePath.value });
    } catch {}
  }
}

async function openReleaseUrl(url?: string) {
  await openInExternalBrowser(url || GITHUB_RELEASES_URL);
}

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

// Automatically check updates when About modal opens
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (!updateResult.value && !isCheckingUpdate.value) {
        handleCheckUpdates();
      }
    }
  }
);

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  if (!queryTestVersion && window.electronAPI?.getAppVersion) {
    try {
      const ver = await window.electronAPI.getAppVersion();
      if (ver) {
        appVersion.value = ver;
      }
    } catch {}
  }
  if (props.isOpen && !updateResult.value) {
    handleCheckUpdates();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  if (unsubscribeProgress) {
    unsubscribeProgress();
    unsubscribeProgress = null;
  }
});
</script>
