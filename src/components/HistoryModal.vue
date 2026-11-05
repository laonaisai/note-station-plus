<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-50 text-syno-blue flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-800">历史版本记录</h3>
            <p class="text-[11px] text-slate-400 truncate max-w-md">{{ noteTitle || '查看并还原便签的历史修改记录' }}</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingList" class="flex-1 flex flex-col items-center justify-center text-slate-400">
        <svg class="animate-spin h-7 w-7 text-syno-blue mb-2.5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <p class="text-xs">正在拉取历史版本列表...</p>
      </div>

      <!-- Main Body: 2-Column Layout -->
      <div v-else-if="versions.length > 0" class="flex-1 flex overflow-hidden">
        <!-- Left Column: Version Timeline List -->
        <div class="w-72 border-r border-slate-100 flex flex-col bg-slate-50/50 shrink-0 overflow-y-auto">
          <div class="px-4 py-2.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>版本列表 (共 {{ versions.length }} 个)</span>
          </div>

          <div class="divide-y divide-slate-100">
            <div
              v-for="(ver, index) in versions"
              :key="ver.version"
              @click="selectVersion(ver)"
              :class="[
                'px-4 py-3 cursor-pointer transition text-xs flex flex-col space-y-1',
                selectedVersion?.version === ver.version
                  ? 'bg-blue-50/80 border-l-3 border-syno-blue text-slate-900'
                  : 'hover:bg-slate-100/60 text-slate-600'
              ]"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-1.5 font-bold">
                  <span class="text-slate-800">#{{ versions.length - index }}</span>
                  <span v-if="index === 0" class="text-[10px] px-1.5 py-0.2 rounded font-normal bg-emerald-100 text-emerald-700">
                    当前最新
                  </span>
                </div>
                <span class="text-[11px] text-slate-400 font-mono">
                  {{ ver.version.substring(0, 7) }}
                </span>
              </div>

              <div class="text-[11px] text-slate-500 flex items-center space-x-1">
                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ formatTime(ver.mtime) }}</span>
              </div>

              <div class="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
                <span>作者: {{ ver.author || '默认用户' }}</span>
                <span v-if="ver.commit_msg?.device" class="text-[10px] text-slate-400">
                  {{ ver.commit_msg.device }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Version Preview & Restore -->
        <div class="flex-1 flex flex-col bg-white overflow-hidden">
          <!-- Preview Header Bar -->
          <div class="px-6 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div class="flex items-center space-x-3 min-w-0">
              <div class="truncate">
                <h4 class="text-xs font-bold text-slate-800 truncate">
                  {{ previewNote?.title || '加载中...' }}
                </h4>
                <div class="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                  <span>版本: <code class="font-mono text-[10px] bg-slate-100 px-1 rounded">{{ selectedVersion?.version.substring(0, 8) }}</code></span>
                  <span>•</span>
                  <span>修改时间: {{ selectedVersion ? formatTime(selectedVersion.mtime) : '' }}</span>
                </div>
              </div>
            </div>

            <!-- Action Controls -->
            <div class="flex items-center space-x-2 shrink-0">
              <!-- Mode Toggle (Preview vs Markdown Source) -->
              <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  @click="viewMode = 'preview'"
                  :class="['px-2 py-0.5 rounded text-[11px] font-medium transition', viewMode === 'preview' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800']"
                >
                  预览
                </button>
                <button
                  @click="viewMode = 'source'"
                  :class="['px-2 py-0.5 rounded text-[11px] font-medium transition', viewMode === 'source' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800']"
                >
                  Markdown 源码
                </button>
              </div>

              <!-- Restore Button -->
              <button
                @click="confirmRestore"
                :disabled="isRestoring || isLatestSelected"
                :class="[
                  'px-3 py-1 rounded-md text-xs font-medium transition flex items-center shadow-xs',
                  isLatestSelected
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                ]"
                :title="isLatestSelected ? '当前已是最新版本' : '将便签恢复至此版本'"
              >
                <svg v-if="isRestoring" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <svg v-else class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                {{ isRestoring ? '还原中...' : (isLatestSelected ? '当前版本' : '还原此版本') }}
              </button>
            </div>
          </div>

          <!-- Preview Content Area -->
          <div class="flex-1 overflow-y-auto p-6 text-xs">
            <div v-if="isLoadingContent" class="h-full flex flex-col items-center justify-center text-slate-400">
              <svg class="animate-spin h-6 w-6 text-syno-blue mb-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>正在获取版本内容...</span>
            </div>

            <div v-else>
              <!-- Rendered Preview Mode -->
              <div
                v-if="viewMode === 'preview'"
                class="prose prose-sm prose-slate max-w-none text-slate-800 leading-relaxed"
                v-html="renderedContent"
              />

              <!-- Raw Markdown Source Mode -->
              <pre
                v-else
                class="bg-slate-50 border border-slate-100 rounded-lg p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap break-all leading-relaxed"
              >{{ previewNote?.markdownContent || '无内容' }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State if note has no versions -->
      <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
        <svg class="w-12 h-12 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-xs">暂无历史版本记录</p>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        <span class="text-[11px] text-slate-400">
          提示：还原版本后，便签内容将替换为该历史时刻的内容并自动保存为新版本
        </span>

        <button
          @click="$emit('close')"
          class="px-4 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import MarkdownIt from 'markdown-it';
import { useNoteStore } from '@/stores/noteStore';
import { NoteVersion, SynoNote } from '@/types/synology';

const props = defineProps<{
  isOpen: boolean;
  noteId: string | null;
  noteTitle?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'restored', noteId: string): void;
}>();

const noteStore = useNoteStore();

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

const isLoadingList = ref(false);
const isLoadingContent = ref(false);
const isRestoring = ref(false);

const versions = ref<NoteVersion[]>([]);
const selectedVersion = ref<NoteVersion | null>(null);
const previewNote = ref<SynoNote | null>(null);
const viewMode = ref<'preview' | 'source'>('preview');

const isLatestSelected = computed(() => {
  if (!selectedVersion.value || versions.value.length === 0) return false;
  return selectedVersion.value.version === versions.value[0].version;
});

const renderedContent = computed(() => {
  if (!previewNote.value?.markdownContent) return '<p class="text-slate-400 italic">空便签内容</p>';
  return md.render(previewNote.value.markdownContent);
});

watch(
  () => [props.isOpen, props.noteId],
  async ([open, id]) => {
    if (open && id) {
      await loadVersions(id as string);
    }
  },
  { immediate: true }
);

async function loadVersions(id: string) {
  isLoadingList.value = true;
  versions.value = [];
  selectedVersion.value = null;
  previewNote.value = null;

  try {
    const list = await noteStore.listNoteVersions(id);
    // Sort latest first (by id descending or mtime descending)
    versions.value = [...list].sort((a, b) => b.mtime - a.mtime || b.id - a.id);

    if (versions.value.length > 0) {
      await selectVersion(versions.value[0]);
    }
  } catch (err) {
    console.error('Failed to load note versions', err);
  } finally {
    isLoadingList.value = false;
  }
}

async function selectVersion(ver: NoteVersion) {
  if (!props.noteId) return;
  selectedVersion.value = ver;
  isLoadingContent.value = true;
  try {
    const note = await noteStore.getNoteVersionContent(props.noteId, ver.version);
    previewNote.value = note;
  } catch (err) {
    console.error('Failed to load version content', err);
  } finally {
    isLoadingContent.value = false;
  }
}

async function confirmRestore() {
  if (!props.noteId || !selectedVersion.value || isLatestSelected.value) return;

  const verTime = formatTime(selectedVersion.value.mtime);
  const confirmed = window.confirm(`确定要将当前便签还原至 ${verTime} 的历史版本吗？`);
  if (!confirmed) return;

  isRestoring.value = true;
  try {
    const ok = await noteStore.restoreNoteVersion(props.noteId, selectedVersion.value.version);
    if (ok) {
      emit('restored', props.noteId);
      emit('close');
    } else {
      alert('还原失败，请重试');
    }
  } catch (err: any) {
    console.error('Failed to restore note version', err);
    alert('还原版本失败: ' + (err.message || '未知错误'));
  } finally {
    isRestoring.value = false;
  }
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}
</script>

