<template>
  <div class="flex-1 h-full bg-white flex flex-col overflow-hidden">
    <!-- Note Empty State -->
    <div v-if="!noteStore.activeNote" class="flex-1 flex flex-col items-center justify-center text-slate-400 select-none">
      <!-- Distraction-free recovery bar if sidebar is collapsed while empty -->
      <div v-if="layoutStore.isSidebarCollapsed" class="mb-4 flex items-center space-x-2">
        <button
          @click="layoutStore.toggleSidebar"
          class="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center transition cursor-pointer"
        >
          » 展开笔记本与便签
        </button>
      </div>

      <svg class="w-16 h-16 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-sm">选择左侧便签或新建便签开始编辑</p>
    </div>

    <!-- Active Note Editor -->
    <div v-else class="flex-1 flex flex-col h-full overflow-hidden">
      <!-- Top Note Bar -->
      <div class="h-14 px-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <!-- Left Side: Sidebar Toggle Icons & Note Title Input -->
        <div class="flex items-center flex-1 mr-4 min-w-0">
          <!-- Sidebar Toggle Buttons (Collapse / Expand controls) -->
          <div class="flex items-center space-x-1 mr-3 shrink-0">
            <button
              @click="layoutStore.toggleSidebar"
              :class="[
                'p-1.5 rounded-md transition text-xs flex items-center cursor-pointer',
                layoutStore.isSidebarCollapsed ? 'bg-blue-50 text-syno-blue' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              ]"
              :title="layoutStore.isSidebarCollapsed ? '展开笔记本与便签' : '折叠笔记本与便签'"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </button>

            <button
              @click="layoutStore.toggleFocusMode"
              :class="[
                'p-1.5 rounded-md transition text-xs flex items-center cursor-pointer',
                layoutStore.isSidebarCollapsed ? 'bg-syno-blue text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              ]"
              :title="layoutStore.isSidebarCollapsed ? '退出专注模式 (恢复侧边栏)' : '开启专注全屏模式 (最大化编辑空间)'"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>

          <!-- Note Title Input -->
          <div class="flex items-center flex-1 mr-4 min-w-0">
            <!-- Share Icon (当前便签已共享) -->
            <svg
              v-if="isNoteShared(noteStore.activeNote)"
              class="w-4 h-4 text-syno-blue mr-2 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              title="当前便签已共享"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <input
              v-model="editTitle"
              @input="onContentChanged"
              type="text"
              placeholder="便签标题..."
              class="text-base font-bold text-slate-800 placeholder-slate-300 border-none outline-none flex-1 bg-transparent truncate"
            />
          </div>
        </div>

        <!-- Right Action Tools -->
        <div class="flex items-center space-x-2.5 text-xs select-none shrink-0">
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
              未保存
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
            class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition flex items-center cursor-pointer disabled:opacity-50"
            title="保存便签 (Ctrl+S)"
          >
            <svg class="w-3.5 h-3.5 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            保存
          </button>

          <!-- Sync to other servers button (REQ-3) -->
          <button
            @click="handleOpenSync"
            class="px-2.5 py-1 bg-syno-blue hover:bg-blue-600 text-white rounded-md font-medium shadow-2xs transition flex items-center cursor-pointer"
            title="将此便签同步到其他 Note Station 服务"
          >
            <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            同步
          </button>

          <!-- More Actions Dropdown (Requirement 4: 整合导入、导出、分享、历史为下拉菜单，置于同步按钮后) -->
          <div class="relative inline-flex items-center">
            <button
              @click.stop="isMoreMenuOpen = !isMoreMenuOpen"
              :class="[
                'px-2 py-1 rounded-md font-medium transition flex items-center border cursor-pointer text-xs',
                isMoreMenuOpen ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
              ]"
              title="更多便签操作 (导入/导出/分享/历史)"
            >
              <svg class="w-3.5 h-3.5 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              <span>更多</span>
              <svg class="w-3 h-3 ml-1 text-slate-400 transition-transform duration-150" :class="isMoreMenuOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="isMoreMenuOpen"
              @click.stop
              class="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 shadow-xl rounded-lg py-1.5 z-40 text-xs animate-in fade-in duration-150"
            >
              <!-- 导入 -->
              <button
                @click="triggerImport"
                class="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-syno-blue flex items-center space-x-2 transition cursor-pointer"
              >
                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>导入 Markdown (.md)</span>
              </button>

              <!-- 导出 -->
              <button
                @click="triggerExport"
                class="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-syno-blue flex items-center space-x-2 transition cursor-pointer"
              >
                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>导出为 Markdown (.md)</span>
              </button>

              <div class="h-px bg-slate-100 my-1"></div>

              <!-- 分享 -->
              <button
                @click="triggerShare"
                class="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-syno-blue flex items-center space-x-2 transition cursor-pointer"
              >
                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>便签分享管理</span>
              </button>

              <!-- 历史 -->
              <button
                @click="triggerHistory"
                class="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-syno-blue flex items-center space-x-2 transition cursor-pointer"
              >
                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>历史版本记录</span>
              </button>
            </div>
          </div>

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

      <!-- Tag Editing Strip (Requirement 2: 便签标签编辑) -->
      <div class="px-5 py-1.5 bg-slate-50/70 border-b border-slate-100 flex items-center flex-wrap gap-1.5 shrink-0 select-none text-xs">
        <span class="flex items-center text-slate-400 text-[11px] mr-1">
          <svg class="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          标签:
        </span>

        <!-- Existing Tag Pills -->
        <span
          v-for="tag in editTags"
          :key="tag"
          class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 border border-slate-200 group transition hover:border-slate-300"
        >
          <span>{{ tag }}</span>
          <button
            @click="removeTag(tag)"
            class="ml-1 text-slate-400 hover:text-rose-500 rounded transition"
            title="移除此标签"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>

        <!-- Add Tag Input / Action -->
        <div class="relative inline-flex items-center">
          <button
            v-if="!isAddingTag"
            @click="startAddTag"
            class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] text-slate-500 hover:text-syno-blue border border-dashed border-slate-300 hover:border-syno-blue bg-white hover:bg-blue-50/40 transition"
            title="添加便签标签"
          >
            <svg class="w-3 h-3 mr-0.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            添加标签
          </button>

          <div v-else class="flex items-center space-x-1">
            <input
              ref="tagInputRef"
              v-model="newTagText"
              @keydown.enter.prevent="confirmAddTag"
              @keydown.esc="cancelAddTag"
              @blur="onTagInputBlur"
              placeholder="输入标签按回车..."
              class="w-32 px-2 py-0.5 text-[11px] bg-white border border-syno-blue rounded-md outline-none focus:ring-1 focus:ring-syno-blue text-slate-800"
            />
            <button
              @mousedown.prevent="confirmAddTag"
              class="px-1.5 py-0.5 bg-syno-blue hover:bg-blue-600 text-white rounded text-[10px] transition"
            >
              添加
            </button>
            <button
              @mousedown.prevent="cancelAddTag"
              class="px-1 py-0.5 text-slate-400 hover:text-slate-600 rounded text-[10px] transition"
            >
              取消
            </button>

            <!-- Autocomplete suggestions dropdown -->
            <div
              v-if="suggestedTags.length > 0"
              class="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-30 min-w-[120px] max-h-36 overflow-y-auto"
            >
              <div
                v-for="sTag in suggestedTags"
                :key="sTag"
                @mousedown.prevent="selectSuggestedTag(sTag)"
                class="px-2.5 py-1 text-[11px] text-slate-700 hover:bg-blue-50 hover:text-syno-blue cursor-pointer truncate"
              >
                {{ sTag }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Markdown Toolbar -->
      <div class="h-9 px-5 bg-slate-50/50 border-b border-slate-100 flex items-center space-x-1 select-none overflow-x-auto shrink-0">
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
            class="markdown-preview prose prose-sm max-w-none prose-slate prose-headings:font-bold prose-a:text-syno-blue"
            v-html="renderedPreviewHtml"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import MarkdownIt from 'markdown-it';
import { useNoteStore } from '@/stores/noteStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { exportSingleNoteAsMarkdown } from '@/utils/exportMarkdown';
import { showToast } from '@/utils/toast';
import { isNoteShared } from '@/utils/shareUtils';

const emit = defineEmits<{
  (e: 'open-sync'): void;
  (e: 'open-import', noteId?: string | null): void;
  (e: 'open-share', noteId: string): void;
  (e: 'open-history', noteId: string): void;
}>();

const noteStore = useNoteStore();
const layoutStore = useLayoutStore();

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

const isMoreMenuOpen = ref(false);
const editorMode = ref<'split' | 'edit' | 'preview'>('split');
const editTitle = ref('');
const editMarkdown = ref('');
const editTags = ref<string[]>([]);
const isModified = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Tag editing state
const isAddingTag = ref(false);
const newTagText = ref('');
const tagInputRef = ref<HTMLInputElement | null>(null);

let saveTimer: any = null;

// Watch for active note changes
watch(
  () => noteStore.activeNote,
  (note) => {
    if (note) {
      editTitle.value = note.title || '';
      editMarkdown.value = note.markdownContent || '';
      editTags.value = [...(note.tag || [])];
      isModified.value = false;
    } else {
      editTitle.value = '';
      editMarkdown.value = '';
      editTags.value = [];
      isModified.value = false;
    }
    isAddingTag.value = false;
    newTagText.value = '';
    isMoreMenuOpen.value = false;
  },
  { immediate: true }
);

// Autocomplete suggestions based on known note tags
const suggestedTags = computed(() => {
  if (!isAddingTag.value) return [];
  const text = newTagText.value.trim().toLowerCase();
  return noteStore.allTags.filter(
    t => !editTags.value.includes(t) && (!text || t.toLowerCase().includes(text))
  );
});

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
  const success = await noteStore.updateActiveNote(title, editMarkdown.value, editTags.value);
  if (success) {
    isModified.value = false;
  }
}

function startAddTag() {
  isAddingTag.value = true;
  newTagText.value = '';
  nextTick(() => {
    tagInputRef.value?.focus();
  });
}

function cancelAddTag() {
  isAddingTag.value = false;
  newTagText.value = '';
}

function onTagInputBlur() {
  setTimeout(() => {
    if (isAddingTag.value) {
      if (newTagText.value.trim()) {
        confirmAddTag();
      } else {
        cancelAddTag();
      }
    }
  }, 150);
}

function confirmAddTag() {
  const tag = newTagText.value.trim();
  if (tag && !editTags.value.includes(tag)) {
    editTags.value.push(tag);
    onContentChanged();
  }
  isAddingTag.value = false;
  newTagText.value = '';
}

function selectSuggestedTag(tag: string) {
  if (tag && !editTags.value.includes(tag)) {
    editTags.value.push(tag);
    onContentChanged();
  }
  isAddingTag.value = false;
  newTagText.value = '';
}

function removeTag(tag: string) {
  const index = editTags.value.indexOf(tag);
  if (index !== -1) {
    editTags.value.splice(index, 1);
    onContentChanged();
  }
}

function exportCurrentNote() {
  if (!noteStore.activeNote) return;
  const currentNote = {
    ...noteStore.activeNote,
    title: editTitle.value.trim() || noteStore.activeNote.title || '无标题便签',
    markdownContent: editMarkdown.value,
    tag: [...editTags.value]
  };
  try {
    exportSingleNoteAsMarkdown(currentNote, noteStore.activeNotebook?.title);
    showToast(`便签【${currentNote.title}】已成功导出为 Markdown 文件！`, 'success');
  } catch (e: any) {
    showToast(`导出便签失败: ${e?.message || e}`, 'error');
  }
}

async function handleOpenSync() {
  if (isModified.value) {
    await saveNote();
  }
  emit('open-sync');
}

function triggerImport() {
  isMoreMenuOpen.value = false;
  emit('open-import', noteStore.activeNoteId);
}

function triggerExport() {
  isMoreMenuOpen.value = false;
  exportCurrentNote();
}

function triggerShare() {
  isMoreMenuOpen.value = false;
  if (noteStore.activeNoteId) {
    emit('open-share', noteStore.activeNoteId);
  }
}

function triggerHistory() {
  isMoreMenuOpen.value = false;
  if (noteStore.activeNoteId) {
    emit('open-history', noteStore.activeNoteId);
  }
}

function onDocumentClick() {
  if (isMoreMenuOpen.value) {
    isMoreMenuOpen.value = false;
  }
}

function insertMarkdown(prefix: string, suffix = '') {
  const textarea = textareaRef.value;
  if (!textarea) return;

  textarea.focus();
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);
  const replacement = prefix + selected + suffix;

  // Use document.execCommand('insertText') to preserve browser native Undo/Redo history (Ctrl+Z)
  let success = false;
  try {
    success = document.execCommand('insertText', false, replacement);
  } catch {
    success = false;
  }

  if (!success) {
    textarea.setRangeText(replacement, start, end, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  editMarkdown.value = textarea.value;
  onContentChanged();

  // Position cursor/selection inside the inserted wrappers
  setTimeout(() => {
    textarea.focus();
    if (selected.length > 0) {
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    } else {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }
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
  document.addEventListener('click', onDocumentClick);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', onDocumentClick);
  clearTimeout(saveTimer);
});
</script>
