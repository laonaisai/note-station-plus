<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <h3 class="text-sm font-semibold text-slate-800 flex items-center">
          <svg class="w-4 h-4 mr-2 text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          导入 Markdown 便签
        </h3>
        <button
          @click="closeModal"
          :disabled="isImporting"
          class="text-slate-400 hover:text-slate-600 p-1 rounded-lg disabled:opacity-30 transition"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-4 overflow-y-auto flex-1">
        <!-- Hidden File Input -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".md,.markdown,.txt"
          @change="handleFileInputChange"
          class="hidden"
        />

        <!-- Step 1: File Dropzone / Selected File Display -->
        <div
          v-if="!importedData"
          @click="triggerFilePick"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          :class="[
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2',
            isDragging ? 'border-syno-blue bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
          ]"
        >
          <div class="p-3 bg-white rounded-full shadow-xs text-syno-blue border border-slate-200">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div class="text-xs font-semibold text-slate-700">点击选择或拖拽 Markdown 文件到此处</div>
          <div class="text-[11px] text-slate-400">支持 .md、.markdown 格式（自动解析 Frontmatter 与标签）</div>
        </div>

        <div v-else class="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-2 text-xs">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 truncate">
              <svg class="w-4 h-4 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="font-semibold text-slate-800 truncate">{{ currentFileName }}</span>
            </div>
            <button
              @click="triggerFilePick"
              type="button"
              class="text-[11px] text-syno-blue hover:text-blue-700 shrink-0 font-medium ml-2"
            >
              更换文件
            </button>
          </div>

          <div class="flex items-center space-x-3 text-[11px] text-slate-500">
            <span>字数: <b>{{ importedData.content.length }}</b> 字符</span>
            <span v-if="importedData.tags.length > 0">•</span>
            <span v-if="importedData.tags.length > 0" class="flex items-center space-x-1">
              <span>标签:</span>
              <span
                v-for="tag in importedData.tags"
                :key="tag"
                class="bg-slate-200/80 text-slate-700 px-1 py-0.2 rounded text-[10px]"
              >
                {{ tag }}
              </span>
            </span>
          </div>
        </div>

        <!-- Step 2: Configuration when file is loaded -->
        <template v-if="importedData">
          <!-- Title Input -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">便签标题</label>
            <input
              v-model="editTitle"
              type="text"
              placeholder="请输入便签标题"
              class="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue"
            />
          </div>

          <!-- Target Notebook Selection -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">目标笔记本</label>
            <select
              v-model="selectedNotebookId"
              class="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue"
            >
              <option
                v-for="nb in noteStore.notebooks"
                :key="nb.object_id"
                :value="nb.object_id"
              >
                {{ nb.title || '默认笔记本' }}
              </option>
            </select>
          </div>

          <!-- Import Mode (Update vs Create) -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">导入方式</label>
            <div class="space-y-2">
              <!-- Mode: Update Existing Note -->
              <div
                @click="importMode = 'update'"
                :class="[
                  'p-3 rounded-lg border text-xs cursor-pointer transition',
                  importMode === 'update'
                    ? 'border-syno-blue bg-blue-50/40 ring-1 ring-syno-blue/40'
                    : 'border-slate-200 hover:bg-slate-50'
                ]"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="update"
                      v-model="importMode"
                      class="text-syno-blue focus:ring-syno-blue"
                    />
                    <span class="font-semibold text-slate-800">覆盖更新现有便签</span>
                  </div>
                  <span
                    v-if="matchedNote"
                    class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium"
                  >
                    已匹配同名便签
                  </span>
                </div>

                <div v-if="importMode === 'update'" class="mt-2.5 pl-6 space-y-1.5">
                  <div class="text-[11px] text-slate-500">选择要覆盖更新的便签：</div>
                  <select
                    v-model="targetNoteObjectId"
                    class="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-syno-blue"
                  >
                    <option
                      v-for="n in availableNotesToUpdate"
                      :key="n.object_id"
                      :value="n.object_id"
                    >
                      {{ n.title || '无标题便签' }} {{ n.object_id === matchedNote?.object_id ? '(同名匹配)' : '' }}
                    </option>
                  </select>
                  <div class="text-[10px] text-amber-600">
                    注意：此操作将使用导入的 Markdown 覆盖该便签现有的正文与标题。
                  </div>
                </div>
              </div>

              <!-- Mode: Create New Note -->
              <div
                @click="importMode = 'create'"
                :class="[
                  'p-3 rounded-lg border text-xs cursor-pointer transition',
                  importMode === 'create'
                    ? 'border-syno-blue bg-blue-50/40 ring-1 ring-syno-blue/40'
                    : 'border-slate-200 hover:bg-slate-50'
                ]"
              >
                <div class="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="create"
                    v-model="importMode"
                    class="text-syno-blue focus:ring-syno-blue"
                  />
                  <div>
                    <span class="font-semibold text-slate-800">创建为全新便签</span>
                    <p class="text-[11px] text-slate-400 mt-0.5">在当前笔记本中新建独立便签，不影响现有便签</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Collapsible Preview -->
          <div class="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              @click="showPreview = !showPreview"
              class="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium transition"
            >
              <span>Markdown 正文内容预览 (前 300 字符)</span>
              <svg
                class="w-3.5 h-3.5 transform transition-transform"
                :class="showPreview ? 'rotate-180' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="showPreview" class="p-3 bg-white font-mono text-[11px] text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap border-t border-slate-200">
              {{ importedData.content.slice(0, 300) }}{{ importedData.content.length > 300 ? '...' : '' }}
            </div>
          </div>
        </template>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2 shrink-0">
        <button
          type="button"
          @click="closeModal"
          :disabled="isImporting"
          class="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition disabled:opacity-40"
        >
          取消
        </button>

        <button
          type="button"
          @click="executeImport"
          :disabled="!importedData || !editTitle.trim() || isImporting"
          class="px-4 py-1.5 text-xs text-white bg-syno-blue hover:bg-blue-600 rounded-lg shadow-sm font-medium transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="isImporting" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>{{ isImporting ? '正在导入...' : (importMode === 'update' ? '确认覆盖更新' : '确认创建便签') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useNoteStore } from '@/stores/noteStore';
import { parseImportMarkdown, readMarkdownFile, ParsedMarkdownImport } from '@/utils/importMarkdown';
import { SynoNote } from '@/types/synology';

const props = defineProps<{
  isOpen: boolean;
  initialFile?: File | null;
  targetObjectId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'imported', note: SynoNote): void;
}>();

const noteStore = useNoteStore();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isImporting = ref(false);
const showPreview = ref(false);

const currentFileName = ref<string>('');
const importedData = ref<ParsedMarkdownImport | null>(null);
const editTitle = ref<string>('');
const selectedNotebookId = ref<string>('');
const importMode = ref<'create' | 'update'>('create');
const targetNoteObjectId = ref<string>('');

// Available notes in currently selected notebook
const availableNotesToUpdate = computed(() => {
  return noteStore.notes;
});

// Check if there is an existing note with matching title
const matchedNote = computed<SynoNote | null>(() => {
  if (!editTitle.value.trim()) return null;
  const target = editTitle.value.trim().toLowerCase();
  return noteStore.notes.find(n => n.title.trim().toLowerCase() === target) || null;
});

function triggerFilePick() {
  fileInputRef.value?.click();
}

async function handleFileInputChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    await processFile(input.files[0]);
    input.value = '';
  }
}

async function handleDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    await processFile(e.dataTransfer.files[0]);
  }
}

async function processFile(file: File) {
  try {
    currentFileName.value = file.name;
    const parsed = await readMarkdownFile(file);
    importedData.value = parsed;
    editTitle.value = parsed.title;

    // Check if notebook specified in Frontmatter exists
    if (parsed.notebookTitle) {
      const matchNb = noteStore.notebooks.find(
        nb => nb.title.trim().toLowerCase() === parsed.notebookTitle!.trim().toLowerCase()
      );
      if (matchNb) {
        selectedNotebookId.value = matchNb.object_id;
      }
    }

    // Auto-detect update mode
    decideInitialMode();
  } catch (err: any) {
    alert(`解析 Markdown 文件失败: ${err?.message || err}`);
  }
}

function decideInitialMode() {
  // If user passed a specific targetObjectId (e.g. from current active note)
  if (props.targetObjectId) {
    importMode.value = 'update';
    targetNoteObjectId.value = props.targetObjectId;
    return;
  }

  // If a note with identical title exists in current notes list
  if (matchedNote.value) {
    importMode.value = 'update';
    targetNoteObjectId.value = matchedNote.value.object_id;
  } else {
    importMode.value = 'create';
    if (availableNotesToUpdate.value.length > 0) {
      targetNoteObjectId.value = availableNotesToUpdate.value[0].object_id;
    }
  }
}

// Watch modal open state
watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      selectedNotebookId.value = noteStore.activeNotebookId || (noteStore.notebooks[0]?.object_id || '');
      showPreview.value = false;

      if (props.initialFile) {
        await processFile(props.initialFile);
      } else {
        importedData.value = null;
        currentFileName.value = '';
        editTitle.value = '';
      }
    } else {
      importedData.value = null;
    }
  },
  { immediate: true }
);

// When selected notebook changes, refresh note list for that notebook
watch(
  () => selectedNotebookId.value,
  async (nbId) => {
    if (nbId && nbId !== noteStore.activeNotebookId) {
      await noteStore.fetchNotes(nbId);
      decideInitialMode();
    }
  }
);

// When editTitle changes, adapt matching
watch(
  () => editTitle.value,
  () => {
    if (matchedNote.value && importMode.value === 'update') {
      targetNoteObjectId.value = matchedNote.value.object_id;
    }
  }
);

function closeModal() {
  if (isImporting.value) return;
  emit('close');
}

async function executeImport() {
  if (!importedData.value || !editTitle.value.trim() || isImporting.value) return;

  const targetNbId = selectedNotebookId.value || noteStore.activeNotebookId;
  if (!targetNbId) {
    alert('请选择目标笔记本');
    return;
  }

  isImporting.value = true;
  try {
    const isUpdate = importMode.value === 'update' && !!targetNoteObjectId.value;
    const finalTitle = editTitle.value.trim();
    const finalContent = importedData.value.content;
    const finalTags = importedData.value.tags;

    const resultNote = await noteStore.importNote({
      targetNotebookId: targetNbId,
      title: finalTitle,
      markdownContent: finalContent,
      tags: finalTags,
      updateObjectId: isUpdate ? targetNoteObjectId.value : undefined
    });

    emit('imported', resultNote);
    emit('close');
  } catch (err: any) {
    alert(`导入失败: ${err?.message || err}`);
  } finally {
    isImporting.value = false;
  }
}
</script>
