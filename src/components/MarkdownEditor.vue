<template>
  <div class="flex-1 h-full bg-white flex flex-col overflow-hidden">
    <!-- Note Empty State -->
    <div v-if="!noteStore.activeNote" class="flex-1 flex flex-col items-center justify-center text-slate-400 select-none">
      <svg class="w-16 h-16 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-sm">选择左侧便签或新建便签开始编辑</p>
    </div>

    <!-- Active Note Editor -->
    <div v-else class="flex-1 flex flex-col h-full overflow-hidden">
      <!-- Top Note Bar -->
      <div class="h-14 px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <!-- Title Input -->
        <input
          v-model="editTitle"
          @input="onContentChanged"
          type="text"
          placeholder="便签标题..."
          class="text-lg font-bold text-slate-800 placeholder-slate-300 border-none outline-none flex-1 mr-4 bg-transparent"
        />

        <!-- Right Action Tools -->
        <div class="flex items-center space-x-3 text-xs select-none shrink-0">
          <!-- Save status indicator -->
          <span class="text-slate-400 text-xs flex items-center">
            <span v-if="noteStore.isSaving" class="flex items-center text-amber-500">
              <svg class="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              保存中...
            </span>
            <span v-else-if="isModified" class="text-slate-400">
              未保存更改
            </span>
            <span v-else class="text-emerald-500 flex items-center">
              <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              已保存
            </span>
          </span>

          <!-- Manual Save Button -->
          <button
            @click="saveNote"
            :disabled="noteStore.isSaving"
            class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition flex items-center"
            title="保存便签 (Ctrl+S)"
          >
            <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            保存
          </button>

          <!-- Sync to other servers button (REQ-3) -->
          <button
            @click="$emit('open-sync')"
            class="px-3 py-1 bg-syno-blue hover:bg-blue-600 text-white rounded-md font-medium shadow-sm transition flex items-center"
            title="将此便签同步到其他 Note Station 服务"
          >
            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            便签同步
          </button>

          <!-- Mode Toggle: Split / Edit / Preview -->
          <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              @click="editorMode = 'split'"
              :class="['px-2 py-0.5 rounded text-[11px] font-medium transition', editorMode === 'split' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800']"
            >
              分屏
            </button>
            <button
              @click="editorMode = 'edit'"
              :class="['px-2 py-0.5 rounded text-[11px] font-medium transition', editorMode === 'edit' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800']"
            >
              编辑
            </button>
            <button
              @click="editorMode = 'preview'"
              :class="['px-2 py-0.5 rounded text-[11px] font-medium transition', editorMode === 'preview' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800']"
            >
              预览
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Markdown Toolbar -->
      <div class="h-9 px-6 bg-slate-50/80 border-b border-slate-100 flex items-center space-x-1 select-none overflow-x-auto shrink-0">
        <button @click="insertMarkdown('**', '**')" class="p-1 rounded hover:bg-slate-200 text-slate-600 font-bold text-xs" title="粗体 (Ctrl+B)">B</button>
        <button @click="insertMarkdown('*', '*')" class="p-1 rounded hover:bg-slate-200 text-slate-600 italic text-xs" title="斜体">I</button>
        <button @click="insertMarkdown('# ')" class="p-1 rounded hover:bg-slate-200 text-slate-600 text-xs font-semibold" title="一级标题">H1</button>
        <button @click="insertMarkdown('## ')" class="p-1 rounded hover:bg-slate-200 text-slate-600 text-xs font-semibold" title="二级标题">H2</button>
        <span class="w-[1px] h-3.5 bg-slate-300 mx-1"></span>
        <button @click="insertMarkdown('- ')" class="p-1 rounded hover:bg-slate-200 text-slate-600 text-xs" title="无序列表">• 列表</button>
        <button @click="insertMarkdown('1. ')" class="p-1 rounded hover:bg-slate-200 text-slate-600 text-xs" title="有序列表">1. 列表</button>
        <button @click="insertMarkdown('- [ ] ')" class="p-1 rounded hover:bg-slate-200 text-slate-600 text-xs" title="任务待办">☑ 任务</button>
        <span class="w-[1px] h-3.5 bg-slate-300 mx-1"></span>
        <button @click="insertMarkdown('```\n', '\n```')" class="p-1 rounded hover:bg-slate-200 text-slate-600 text-xs font-mono" title="代码块">&lt;/&gt;</button>
        <button @click="insertMarkdown('| 列1 | 列2 |\n| :--- | :--- |\n| 内容1 | 内容2 |\n')" class="p-1 rounded hover:bg-slate-200 text-slate-600 text-xs" title="插入表格">表格</button>
        <button @click="insertMarkdown('> ')" class="p-1 rounded hover:bg-slate-200 text-slate-600 text-xs" title="引用">&ldquo; 引用</button>
        <button @click="insertMarkdown('$$ \n', '\n $$')" class="p-1 rounded hover:bg-slate-200 text-slate-600 text-xs" title="LaTeX 数学公式">∑</button>
      </div>

      <!-- Editor Content Area -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Markdown Input Area -->
        <div
          v-show="editorMode === 'split' || editorMode === 'edit'"
          :class="[
            'h-full flex flex-col',
            editorMode === 'split' ? 'w-1/2 border-r border-slate-200' : 'w-full'
          ]"
        >
          <textarea
            ref="textareaRef"
            v-model="editMarkdown"
            @input="onContentChanged"
            @keydown="handleKeydown"
            placeholder="使用 Markdown 编写便签内容..."
            class="w-full h-full p-6 text-sm font-mono text-slate-800 bg-white resize-none outline-none leading-relaxed"
          ></textarea>
        </div>

        <!-- Markdown Preview Area -->
        <div
          v-show="editorMode === 'split' || editorMode === 'preview'"
          :class="[
            'h-full overflow-y-auto p-6 bg-slate-50/50',
            editorMode === 'split' ? 'w-1/2' : 'w-full'
          ]"
        >
          <div
            class="prose prose-sm max-w-none prose-slate prose-headings:font-bold prose-a:text-syno-blue"
            v-html="renderedPreviewHtml"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import MarkdownIt from 'markdown-it';
import { useNoteStore } from '@/stores/noteStore';

defineEmits(['open-sync']);

const noteStore = useNoteStore();
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

const editorMode = ref<'split' | 'edit' | 'preview'>('split');
const editTitle = ref('');
const editMarkdown = ref('');
const isModified = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

let saveTimer: any = null;

// Watch for active note changes
watch(
  () => noteStore.activeNote,
  (note) => {
    if (note) {
      editTitle.value = note.title || '';
      editMarkdown.value = note.markdownContent || '';
      isModified.value = false;
    } else {
      editTitle.value = '';
      editMarkdown.value = '';
      isModified.value = false;
    }
  },
  { immediate: true }
);

const renderedPreviewHtml = computed(() => {
  return md.render(editMarkdown.value || '');
});

function onContentChanged() {
  isModified.value = true;
  clearTimeout(saveTimer);
  // Auto-save debounced after 2.5 seconds of inactivity
  saveTimer = setTimeout(() => {
    if (isModified.value) {
      saveNote();
    }
  }, 2500);
}

async function saveNote() {
  clearTimeout(saveTimer);
  if (!noteStore.activeNoteId) return;

  const title = editTitle.value.trim() || '无标题便签';
  const success = await noteStore.updateActiveNote(title, editMarkdown.value);
  if (success) {
    isModified.value = false;
  }
}

function insertMarkdown(prefix: string, suffix = '') {
  const textarea = textareaRef.value;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = editMarkdown.value;
  const selected = text.substring(start, end);

  const replacement = prefix + selected + suffix;
  editMarkdown.value = text.substring(0, start) + replacement + text.substring(end);

  onContentChanged();

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, end + prefix.length);
  }, 0);
}

function handleKeydown(e: KeyboardEvent) {
  // Ctrl+S or Cmd+S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveNote();
  }
  // Tab key indents by 2 spaces
  if (e.key === 'Tab') {
    e.preventDefault();
    insertMarkdown('  ');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  clearTimeout(saveTimer);
});
</script>

