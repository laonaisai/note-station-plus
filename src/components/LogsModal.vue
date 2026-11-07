<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl h-[85vh] max-h-[800px] overflow-hidden flex flex-col">
      <!-- Modal Header -->
      <div class="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-2 text-white">
          <svg class="w-4 h-4 text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="font-semibold text-sm">{{ t('logs.modalTitle') }}</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {{ t('logs.totalCount', { count: filteredLogs.length }) }}
          </span>
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

      <!-- Filter & Action Toolbar -->
      <div class="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div class="flex items-center space-x-2 flex-1 min-w-[260px]">
          <!-- Search Input -->
          <div class="relative flex-1">
            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchKeyword"
              type="text"
              :placeholder="t('logs.searchPlaceholder')"
              class="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-syno-blue"
            />
            <button
              v-if="searchKeyword"
              @click="searchKeyword = ''"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Level Filter -->
          <select
            v-model="selectedLevel"
            class="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">{{ t('logs.allLevels') }}</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
          </select>

          <!-- Category Filter -->
          <select
            v-model="selectedCategory"
            class="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">{{ t('logs.allCategories') }}</option>
            <option value="note">便签 (note)</option>
            <option value="notebook">笔记本 (notebook)</option>
            <option value="tag">标签 (tag)</option>
            <option value="attachment">附件/图片 (attachment)</option>
            <option value="sync">同步 (sync)</option>
            <option value="auth">认证/登录 (auth)</option>
            <option value="system">系统 (system)</option>
          </select>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-2 shrink-0">
          <button
            @click="refreshLogs"
            class="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center cursor-pointer shadow-2xs"
            :title="t('logs.refresh')"
          >
            <svg class="w-3.5 h-3.5 mr-1 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ t('logs.refresh') }}
          </button>

          <button
            @click="handleCopyLogs"
            class="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center cursor-pointer shadow-2xs"
            :title="t('logs.exportText')"
          >
            <svg class="w-3.5 h-3.5 mr-1 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {{ t('logs.copyAll') }}
          </button>

          <button
            @click="handleDownloadLogs"
            class="px-2.5 py-1.5 text-xs bg-syno-blue hover:bg-blue-600 text-white rounded-lg transition flex items-center cursor-pointer shadow-2xs"
            :title="t('logs.download')"
          >
            <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {{ t('logs.download') }}
          </button>

          <button
            @click="handleClearLogs"
            class="px-2.5 py-1.5 text-xs bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg transition flex items-center cursor-pointer"
            :title="t('logs.clear')"
          >
            <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {{ t('logs.clear') }}
          </button>
        </div>
      </div>

      <!-- Logs Content Area -->
      <div ref="logsContainerRef" class="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-xs text-slate-200 select-text divide-y divide-slate-800/80">
        <div v-if="filteredLogs.length === 0" class="h-full flex flex-col items-center justify-center text-slate-500 py-12">
          <svg class="w-12 h-12 mb-2 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>{{ t('logs.empty') }}</p>
        </div>

        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="py-2.5 px-2 hover:bg-slate-900/80 rounded transition flex flex-col gap-1 group"
        >
          <!-- Log Meta Row -->
          <div class="flex items-center justify-between gap-2 text-[11px]">
            <div class="flex items-center space-x-2 truncate">
              <!-- Level Pill -->
              <span
                :class="[
                  'px-1.5 py-0.2 rounded font-bold uppercase tracking-wider text-[10px]',
                  log.level === 'error' ? 'bg-rose-950 text-rose-400 border border-rose-800' : '',
                  log.level === 'warn' ? 'bg-amber-950 text-amber-300 border border-amber-800' : '',
                  log.level === 'info' ? 'bg-sky-950 text-sky-400 border border-sky-800' : ''
                ]"
              >
                {{ log.level }}
              </span>

              <!-- Category:Action Pill -->
              <span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                {{ log.category }}:{{ log.action }}
              </span>

              <!-- Message -->
              <span class="font-medium text-slate-100 truncate">
                {{ log.message }}
              </span>
            </div>

            <!-- Time -->
            <span class="text-slate-500 shrink-0 text-[11px]">
              {{ log.time }}
            </span>
          </div>

          <!-- Log Details (if present) -->
          <div v-if="log.details && Object.keys(log.details).length > 0" class="mt-1 pl-2 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/60 overflow-x-auto">
            <span class="text-slate-500 font-semibold select-none">Details: </span>
            <span>{{ JSON.stringify(log.details, null, 2) }}</span>
          </div>

          <!-- Log Error (if present) -->
          <div v-if="log.error" class="mt-1 pl-2 text-[11px] text-rose-300 bg-rose-950/40 p-2 rounded border border-rose-900/60 whitespace-pre-wrap break-all">
            <span class="text-rose-400 font-semibold select-none">Error: </span>
            <span>{{ log.error }}</span>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <span class="text-xs text-slate-500 dark:text-slate-400">
          {{ t('logs.totalCount', { count: filteredLogs.length }) }} (最近最多保留 1000 条)
        </span>
        <button
          @click="$emit('close')"
          class="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg transition font-medium cursor-pointer"
        >
          {{ t('common.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { t } from '@/i18n';
import { logger, LogEntry } from '@/services/logger';
import { showToast } from '@/utils/toast';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const logs = ref<LogEntry[]>([]);
const searchKeyword = ref('');
const selectedLevel = ref('all');
const selectedCategory = ref('all');
const logsContainerRef = ref<HTMLDivElement | null>(null);

let unsubscribe: (() => void) | null = null;

function refreshLogs() {
  logs.value = logger.getLogs().reverse(); // Show latest on top
}

const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    if (selectedLevel.value !== 'all' && log.level !== selectedLevel.value) {
      return false;
    }
    if (selectedCategory.value !== 'all' && log.category !== selectedCategory.value) {
      return false;
    }
    if (searchKeyword.value.trim()) {
      const kw = searchKeyword.value.trim().toLowerCase();
      const inMsg = log.message.toLowerCase().includes(kw);
      const inAction = log.action.toLowerCase().includes(kw);
      const inCategory = log.category.toLowerCase().includes(kw);
      const inError = log.error ? log.error.toLowerCase().includes(kw) : false;
      const inDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(kw) : false;
      return inMsg || inAction || inCategory || inError || inDetails;
    }
    return true;
  });
});

async function handleCopyLogs() {
  try {
    const text = logger.exportLogsAsText();
    await navigator.clipboard.writeText(text);
    showToast(t('logs.copied'), 'success');
  } catch (err: any) {
    showToast('复制失败: ' + (err?.message || err), 'error');
  }
}

function handleDownloadLogs() {
  try {
    logger.downloadLogs();
    showToast('日志已导出并开始下载', 'success');
  } catch (err: any) {
    showToast('导出日志失败: ' + (err?.message || err), 'error');
  }
}

function handleClearLogs() {
  if (confirm(t('logs.clearConfirm'))) {
    logger.clearLogs();
    refreshLogs();
    showToast('日志已成功清空', 'success');
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      refreshLogs();
      nextTick(() => {
        if (logsContainerRef.value) {
          logsContainerRef.value.scrollTop = 0;
        }
      });
    }
  }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  refreshLogs();
  unsubscribe = logger.subscribe(() => {
    if (props.isOpen) {
      refreshLogs();
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  if (unsubscribe) {
    unsubscribe();
  }
});
</script>
