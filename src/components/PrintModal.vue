<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs select-none"
    @click.self="close"
  >
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[88vh] border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-50 text-syno-blue flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-800">便签打印与导出预览</h3>
            <p class="text-[11px] text-slate-400 truncate max-w-md">
              预览便签排版样式，可直接导出为高清 PDF 或发送至物理打印机
            </p>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="flex items-center space-x-2">
          <!-- Toggle Metadata -->
          <label class="flex items-center text-xs text-slate-600 mr-2 cursor-pointer select-none">
            <input
              type="checkbox"
              v-model="showMetadata"
              class="rounded border-slate-300 text-syno-blue focus:ring-syno-blue mr-1.5 cursor-pointer"
            />
            包含基本信息
          </label>

          <!-- Export to PDF Button -->
          <button
            @click="handleExportPdf"
            :disabled="isLoading || isExportingPdf"
            class="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition flex items-center cursor-pointer disabled:opacity-50"
            title="直接保存为矢量高清 PDF 文件"
          >
            <svg v-if="!isExportingPdf" class="w-3.5 h-3.5 mr-1.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <svg v-else class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-slate-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>{{ isExportingPdf ? '正在导出...' : '导出为 PDF' }}</span>
          </button>

          <!-- Print Button -->
          <button
            @click="handlePrintDirect"
            :disabled="isLoading"
            class="px-3.5 py-1.5 text-xs bg-syno-blue hover:bg-blue-600 text-white font-medium rounded-lg shadow-2xs transition flex items-center cursor-pointer disabled:opacity-50"
            title="调用系统打印机打印当前便签"
          >
            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>打印便签</span>
          </button>

          <!-- Close Button -->
          <button
            @click="close"
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer ml-1"
            title="关闭预览"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Preview Sheet Area -->
      <div class="flex-1 overflow-y-auto p-6 bg-slate-100/80 flex justify-center select-text">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center h-64 text-slate-400">
          <svg class="animate-spin h-8 w-8 text-syno-blue mb-3" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span class="text-xs">正在加载便签完整内容与排版...</span>
        </div>

        <!-- A4 Paper Container -->
        <div
          v-else
          class="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-md border border-slate-200/80 p-10 md:p-14 my-2 text-slate-800 rounded-sm"
        >
          <!-- Note Title -->
          <h1 class="text-2xl font-bold text-slate-900 pb-3 mb-3 border-b-2 border-slate-200 break-words">
            {{ displayTitle }}
          </h1>

          <!-- Note Metadata Box -->
          <div
            v-if="showMetadata"
            class="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-md p-2.5 mb-6 flex flex-wrap gap-x-4 gap-y-1.5"
          >
            <span v-if="notebookTitle">
              <strong class="text-slate-600">笔记本:</strong> {{ notebookTitle }}
            </span>
            <span v-if="ctimeStr">
              <strong class="text-slate-600">创建时间:</strong> {{ ctimeStr }}
            </span>
            <span v-if="mtimeStr">
              <strong class="text-slate-600">更新时间:</strong> {{ mtimeStr }}
            </span>
            <span v-if="tagsStr">
              <strong class="text-slate-600">标签:</strong> {{ tagsStr }}
            </span>
          </div>

          <!-- Note Body -->
          <div
            class="prose prose-sm max-w-none text-slate-700 leading-relaxed break-words"
            v-html="renderedContentHtml"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import type { SynoNote } from '@/types/synology';
import { useSessionStore } from '@/stores/sessionStore';
import { healLegacyImagePlaceholders } from '@/utils/markdown';
import { buildPrintHtml, executeIframePrint } from '@/utils/printNote';
import { showToast } from '@/utils/toast';

const props = defineProps<{
  isOpen: boolean;
  note: SynoNote | null;
  notebookTitle?: string;
  markdownContentOverride?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const sessionStore = useSessionStore();

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

const showMetadata = ref(true);
const isLoading = ref(false);
const isExportingPdf = ref(false);
const fullMarkdown = ref('');

// Track when modal opens
watch(
  () => props.isOpen,
  async (open) => {
    if (open && props.note) {
      await loadFullContent();
    }
  },
  { immediate: true }
);

async function loadFullContent() {
  if (!props.note) return;

  // 1. If explicit override content provided (e.g. from live editor), use it
  if (typeof props.markdownContentOverride === 'string' && props.markdownContentOverride.length > 0) {
    fullMarkdown.value = props.markdownContentOverride;
    return;
  }

  // 2. If note already has markdownContent, use it
  if (props.note.markdownContent && props.note.markdownContent.length > 0) {
    fullMarkdown.value = props.note.markdownContent;
    return;
  }

  // 3. Otherwise (e.g. clicked from note list/sidebar), fetch full note from server
  const client = sessionStore.activeClient;
  if (!client) {
    fullMarkdown.value = props.note.content || '';
    return;
  }

  isLoading.value = true;
  try {
    const full = await client.getNote(props.note.object_id);
    fullMarkdown.value = full.markdownContent || full.content || '';
  } catch (e: any) {
    console.error('Failed to load full note for printing', e);
    fullMarkdown.value = props.note.content || '';
  } finally {
    isLoading.value = false;
  }
}

const displayTitle = computed(() => {
  return props.note?.title || '无标题便签';
});

const ctimeStr = computed(() => {
  return props.note?.ctime ? new Date(props.note.ctime * 1000).toLocaleString() : '';
});

const mtimeStr = computed(() => {
  return props.note?.mtime ? new Date(props.note.mtime * 1000).toLocaleString() : '';
});

const tagsStr = computed(() => {
  return (props.note?.tag || []).join(', ');
});

const renderedContentHtml = computed(() => {
  let text = fullMarkdown.value || '';
  const client = sessionStore.activeClient;
  if (props.note?.attachment && props.note.attachment.length > 0 && client) {
    text = healLegacyImagePlaceholders(text, {
      attachments: props.note.attachment,
      getAttachmentUrl: (fileId, filename) => client.getAttachmentDownloadUrl(props.note!.object_id, fileId, filename)
    });
  }

  if (!text.trim()) {
    return '<p class="text-slate-400 italic">（此便签正文为空）</p>';
  }

  return md.render(text);
});

function getFullPrintHtml(): string {
  if (!props.note) return '';
  const client = sessionStore.activeClient;
  const getAttachmentUrl = client
    ? (fileId: string, filename?: string) => client.getAttachmentDownloadUrl(props.note!.object_id, fileId, filename)
    : undefined;

  return buildPrintHtml(
    props.note,
    props.notebookTitle,
    fullMarkdown.value,
    getAttachmentUrl,
    showMetadata.value
  );
}

async function handleExportPdf() {
  if (!props.note) return;
  const html = getFullPrintHtml();
  const electronAPI = (window as any).electronAPI;

  if (electronAPI?.print?.toPdf) {
    isExportingPdf.value = true;
    try {
      const res = await electronAPI.print.toPdf({
        html,
        title: props.note.title || '便签'
      });
      if (res.success) {
        showToast('便签已成功导出为 PDF 文档！', 'success');
      } else if (!res.canceled) {
        showToast(`导出 PDF 失败: ${res.error || '未知错误'}`, 'error');
      }
    } catch (e: any) {
      showToast(`导出 PDF 发生异常: ${e?.message || e}`, 'error');
    } finally {
      isExportingPdf.value = false;
    }
  } else {
    // Web fallback: trigger print dialog (which allows saving as PDF in browser)
    executeIframePrint(html);
  }
}

async function handlePrintDirect() {
  if (!props.note) return;
  const html = getFullPrintHtml();
  const electronAPI = (window as any).electronAPI;

  if (electronAPI?.print?.direct) {
    try {
      await electronAPI.print.direct({ html });
    } catch (e: any) {
      console.warn('Electron direct print failed, falling back to iframe print', e);
      executeIframePrint(html);
    }
  } else {
    executeIframePrint(html);
  }
}

function close() {
  emit('close');
}
</script>

