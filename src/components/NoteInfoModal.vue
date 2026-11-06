<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    @click.self="close"
    @keydown.esc="close"
  >
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div class="flex items-center space-x-2">
          <div class="p-1.5 rounded-lg bg-blue-50 text-syno-blue">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-sm font-bold text-slate-800">便签信息</h3>
        </div>
        <button
          @click="close"
          class="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          title="关闭"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content Form (Scrollable) -->
      <div class="p-6 space-y-4 overflow-y-auto text-xs flex-1">
        <!-- Error Alert -->
        <div v-if="errorMessage" class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between">
          <span>{{ errorMessage }}</span>
          <button @click="errorMessage = ''" class="text-rose-500 hover:text-rose-700 ml-2">×</button>
        </div>

        <!-- 1. 标题 (Title) -->
        <div class="space-y-1.5">
          <label class="block font-medium text-slate-700">标题</label>
          <input
            v-model="formTitle"
            type="text"
            placeholder="便签标题..."
            class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue text-slate-800"
          />
        </div>

        <!-- 2. 所属笔记本 (Notebook) -->
        <div class="space-y-1.5">
          <label class="block font-medium text-slate-700">所属笔记本</label>
          <select
            v-model="formParentId"
            class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue text-slate-800 cursor-pointer"
          >
            <option
              v-for="nb in regularNotebooks"
              :key="nb.object_id"
              :value="nb.object_id"
            >
              {{ nb.title }}
            </option>
          </select>
        </div>

        <!-- 3. 标签 (Tags) -->
        <div class="space-y-1.5">
          <label class="block font-medium text-slate-700">标签</label>
          <div v-if="targetNote?.tag && targetNote.tag.length > 0" class="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200/60">
            <span
              v-for="t in targetNote.tag"
              :key="t"
              class="px-2 py-0.5 rounded-md text-[11px] bg-white border border-slate-200 text-slate-700 shadow-2xs"
            >
              # {{ t }}
            </span>
          </div>
          <div v-else class="text-slate-400 italic py-1">
            无标签
          </div>
        </div>

        <!-- 4. 时间与所有者 (Timestamps & Owner Grid) -->
        <div class="grid grid-cols-2 gap-3 p-3 bg-slate-50/70 rounded-lg border border-slate-200/60 text-[11px]">
          <div>
            <span class="text-slate-400 block mb-0.5">所有者</span>
            <span class="font-medium text-slate-700 truncate block">
              {{ targetNote?.owner?.display_name || sessionStore.activeProfile?.account || 'notedev' }}
            </span>
          </div>

          <div>
            <span class="text-slate-400 block mb-0.5">历史版本</span>
            <button
              @click="handleOpenHistory"
              class="text-syno-blue hover:underline font-medium flex items-center cursor-pointer"
            >
              <span>查看版本记录</span>
              <svg class="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div>
            <span class="text-slate-400 block mb-0.5">创建时间</span>
            <span class="text-slate-600">
              {{ formatDateTime(targetNote?.ctime) }}
            </span>
          </div>

          <div>
            <span class="text-slate-400 block mb-0.5">修改时间</span>
            <span class="text-slate-600">
              {{ formatDateTime(targetNote?.mtime) }}
            </span>
          </div>
        </div>

        <!-- 5. 统计信息 (Word Count & Size) -->
        <div class="grid grid-cols-3 gap-2 p-3 bg-slate-50/50 rounded-lg border border-slate-200/60 text-center">
          <div>
            <span class="text-slate-400 text-[10px] block">字数 (词)</span>
            <span class="font-bold text-slate-700 text-sm">{{ wordCount }}</span>
          </div>
          <div>
            <span class="text-slate-400 text-[10px] block">字符数</span>
            <span class="font-bold text-slate-700 text-sm">{{ charCount }}</span>
          </div>
          <div>
            <span class="text-slate-400 text-[10px] block">估算容量</span>
            <span class="font-bold text-slate-700 text-sm">{{ noteSizeFormatted }}</span>
          </div>
        </div>

        <!-- 6. 来源链接 (Source URL) -->
        <div class="space-y-1.5">
          <label class="block font-medium text-slate-700">来源链接</label>
          <input
            v-model="formSourceUrl"
            type="text"
            placeholder="https://..."
            class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue text-slate-800"
          />
        </div>

        <!-- 7. 位置信息 (GPS / Location if any) -->
        <div v-if="targetNote?.location || (targetNote?.latitude && targetNote?.longitude)" class="space-y-1.5">
          <label class="block font-medium text-slate-700">地理位置</label>
          <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center space-x-2 text-slate-600">
            <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="truncate">{{ targetNote.location || `${targetNote.latitude}, ${targetNote.longitude}` }}</span>
          </div>
        </div>

        <!-- 8. 便签链接 (Note Link & Object ID) -->
        <div class="space-y-1.5">
          <label class="block font-medium text-slate-700">便签链接 (用于便签间交叉引用)</label>
          <div class="flex items-center space-x-2">
            <input
              type="text"
              readonly
              :value="noteLinkUri"
              class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono text-[11px] select-all outline-none"
            />
            <button
              @click="handleCopyNoteLink"
              class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition flex items-center shrink-0 cursor-pointer"
              title="复制便签链接"
            >
              <svg class="w-3.5 h-3.5 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>复制链接</span>
            </button>
          </div>
        </div>

        <!-- 9. 附件与文件 (Attachments if any) -->
        <div v-if="targetNote?.attachment && targetNote.attachment.length > 0" class="space-y-1.5">
          <label class="block font-medium text-slate-700">关联附件 ({{ targetNote.attachment.length }})</label>
          <div class="space-y-1 p-2 bg-slate-50 rounded-lg border border-slate-200/60 max-h-36 overflow-y-auto">
            <div
              v-for="att in targetNote.attachment"
              :key="att.id"
              class="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200/80 text-[11px]"
            >
              <div class="flex items-center space-x-1.5 truncate flex-1 min-w-0 pr-2">
                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span class="truncate font-medium text-slate-700">{{ att.name }}</span>
                <span class="text-slate-400 shrink-0">({{ formatFileSize(att.size) }})</span>
              </div>
              <a
                :href="getDownloadUrl(att.id, att.name)"
                target="_blank"
                download
                class="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-syno-blue rounded text-[10px] font-medium transition shrink-0"
              >
                下载
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end space-x-2 shrink-0">
        <button
          type="button"
          @click="close"
          class="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          取消
        </button>
        <button
          type="button"
          @click="handleSave"
          :disabled="isSaving"
          class="px-4 py-1.5 text-xs bg-syno-blue hover:bg-blue-600 text-white rounded-lg font-medium shadow-2xs transition flex items-center disabled:opacity-50 cursor-pointer"
        >
          <svg v-if="isSaving" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>{{ isSaving ? '保存中...' : '确定' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { SynoNote } from '@/types/synology';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { showToast } from '@/utils/toast';

const props = defineProps<{
  isOpen: boolean;
  targetNote: SynoNote | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-history', noteId: string): void;
}>();

const noteStore = useNoteStore();
const sessionStore = useSessionStore();

const formTitle = ref('');
const formParentId = ref('');
const formSourceUrl = ref('');
const isSaving = ref(false);
const errorMessage = ref('');

const regularNotebooks = computed(() => {
  return noteStore.notebooks.filter(nb => !nb.object_id.startsWith('__'));
});

watch(
  () => props.targetNote,
  (note) => {
    if (note) {
      formTitle.value = note.title || '';
      formParentId.value = note.parent_id || '';
      formSourceUrl.value = note.source_url || '';
      errorMessage.value = '';
    }
  },
  { immediate: true }
);

const noteLinkUri = computed(() => {
  if (!props.targetNote) return '';
  return `notestation://remote/self/${props.targetNote.object_id}`;
});

const wordCount = computed(() => {
  const text = (props.targetNote?.markdownContent || props.targetNote?.content || '').replace(/<[^>]*>/g, '').trim();
  if (!text) return 0;
  // Match words / CJK characters
  const words = text.match(/[\w'-]+|[\u4e00-\u9fa5]/g);
  return words ? words.length : 0;
});

const charCount = computed(() => {
  const text = (props.targetNote?.markdownContent || props.targetNote?.content || '').replace(/<[^>]*>/g, '').trim();
  return text.length;
});

const noteSizeFormatted = computed(() => {
  const contentBytes = new Blob([props.targetNote?.content || props.targetNote?.markdownContent || '']).size;
  let totalBytes = contentBytes;
  if (props.targetNote?.attachment) {
    for (const a of props.targetNote.attachment) {
      totalBytes += a.size || 0;
    }
  }
  return formatFileSize(totalBytes);
});

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDateTime(unixSeconds?: number): string {
  if (!unixSeconds) return '-';
  return new Date(unixSeconds * 1000).toLocaleString();
}

function getDownloadUrl(fileId: string, filename?: string): string {
  const client = sessionStore.activeClient;
  if (!client || !props.targetNote) return '#';
  return client.getAttachmentDownloadUrl(props.targetNote.object_id, fileId, filename);
}

function handleCopyNoteLink() {
  if (!noteLinkUri.value) return;
  navigator.clipboard.writeText(noteLinkUri.value);
  showToast('便签链接已复制到剪贴板', 'success');
}

function handleOpenHistory() {
  if (!props.targetNote) return;
  emit('open-history', props.targetNote.object_id);
  close();
}

function close() {
  if (isSaving.value) return;
  errorMessage.value = '';
  emit('close');
}

async function handleSave() {
  if (!props.targetNote) return;
  const newTitle = formTitle.value.trim() || '无标题便签';
  const newParentId = formParentId.value;
  const newSourceUrl = formSourceUrl.value.trim();

  const titleChanged = newTitle !== props.targetNote.title;
  const parentChanged = newParentId && newParentId !== props.targetNote.parent_id;
  const sourceChanged = newSourceUrl !== (props.targetNote.source_url || '');

  if (!titleChanged && !parentChanged && !sourceChanged) {
    close();
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    // If notebook changed, move note
    if (parentChanged) {
      await noteStore.moveNote(props.targetNote.object_id, newParentId);
    }

    // If title or source_url changed, update note
    if (titleChanged || sourceChanged) {
      props.targetNote.title = newTitle;
      props.targetNote.source_url = newSourceUrl;
      if (noteStore.activeNoteId === props.targetNote.object_id) {
        await noteStore.updateActiveNote(newTitle, props.targetNote.markdownContent || '', props.targetNote.tag || []);
      }
    }

    showToast('便签信息已更新', 'success');
    close();
  } catch (e: any) {
    errorMessage.value = `保存失败: ${e?.message || e}`;
  } finally {
    isSaving.value = false;
  }
}
</script>

