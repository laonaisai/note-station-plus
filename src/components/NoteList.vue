<template>
  <div
    :class="[
      'h-full bg-slate-50 flex flex-col select-none shrink-0 transition-all duration-200 ease-in-out',
      layoutStore.isNoteListCollapsed ? 'w-0 overflow-hidden border-none opacity-0' : 'w-64 border-r border-slate-200'
    ]"
  >
    <!-- Top Action Toolbar (Header Row) -->
    <div class="h-9 px-2.5 border-b border-slate-200/70 flex items-center justify-between shrink-0 bg-white/60 backdrop-blur-xs">
      <!-- Title & Note Count -->
      <div class="flex items-center space-x-1 text-xs font-semibold text-slate-700 truncate min-w-0 pr-1">
        <span class="truncate">{{ noteStore.activeNotebook?.title || '便签列表' }}</span>
        <span class="text-[11px] text-slate-400 font-normal shrink-0">({{ noteStore.filteredNotes.length }})</span>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-1 shrink-0">
        <!-- New Note Button -->
        <button
          @click="createNewNote"
          :disabled="noteStore.isCreating || !noteStore.activeNotebookId"
          class="h-6 px-2 bg-syno-blue hover:bg-blue-600 text-white rounded text-xs flex items-center shadow-2xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="新建便签"
        >
          <svg v-if="noteStore.isCreating" class="animate-spin -ml-0.5 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <svg v-else class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ noteStore.isCreating ? '创建中' : '新建' }}</span>
        </button>

        <!-- Refresh Button -->
        <button
          @click="noteStore.fetchNotes(undefined, true)"
          :disabled="noteStore.isLoading"
          class="h-6 w-6 rounded hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition flex items-center justify-center disabled:opacity-40 cursor-pointer"
          title="刷新便签列表"
        >
          <svg :class="['w-3.5 h-3.5', noteStore.isLoading ? 'animate-spin text-syno-blue' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <!-- Collapse NoteList Button -->
        <button
          @click="layoutStore.toggleNoteList"
          class="h-6 w-6 rounded hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition flex items-center justify-center cursor-pointer"
          title="折叠便签列表"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Dedicated Search Bar Row (Requirement 3: 搜索框单独一行，充分释放输入空间) -->
    <div class="p-2 border-b border-slate-200 bg-white/70 backdrop-blur-xs shrink-0">
      <div class="relative w-full flex items-center">
        <svg class="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="noteStore.searchQuery"
          type="text"
          :placeholder="noteStore.selectedTag ? `在 #${noteStore.selectedTag} 下搜索便签...` : (noteStore.filteredNotes.length > 0 ? `搜索便签 (共 ${noteStore.filteredNotes.length} 篇)...` : '搜索便签标题或标签...')"
          class="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue placeholder:text-slate-400 shadow-2xs transition"
        />
        <!-- Clear Search Query Button -->
        <button
          v-if="noteStore.searchQuery"
          @click="noteStore.searchQuery = ''"
          class="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
          title="清空搜索"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Active Tag Filter Badge Strip (if tag is selected) -->
      <div v-if="noteStore.selectedTag" class="mt-1.5 flex items-center justify-between text-[11px] bg-blue-50/80 border border-blue-200/70 rounded px-2 py-0.5 text-syno-blue">
        <span class="flex items-center truncate">
          <span class="font-medium mr-1">标签:</span>
          <span class="truncate">#{{ noteStore.selectedTag }}</span>
        </span>
        <button
          @click="noteStore.selectTag(null)"
          class="ml-1 text-slate-400 hover:text-red-500 font-bold px-1 transition cursor-pointer"
          title="移除此标签筛选"
        >
          ×
        </button>
      </div>
    </div>

    <!-- Notes List with Year-Month Grouping -->
    <div class="flex-1 overflow-y-auto p-2 space-y-3">
      <!-- Loading indicator during note creation -->
      <div
        v-if="noteStore.isCreating"
        class="p-2.5 rounded-lg border border-syno-blue/40 bg-blue-50/50 animate-pulse flex items-center space-x-2 text-xs text-syno-blue"
      >
        <svg class="animate-spin h-3.5 w-3.5 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span class="font-medium">正在向服务器创建新便签...</span>
      </div>

      <!-- Loading indicator when fetching notes -->
      <div
        v-if="noteStore.isLoading && noteStore.notes.length === 0"
        class="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2"
      >
        <svg class="animate-spin h-5 w-5 text-syno-blue" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>正在加载便签列表...</span>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="groupedNotes.length === 0 && !noteStore.isCreating"
        class="text-center py-12 text-xs text-slate-400"
      >
        {{ noteStore.searchQuery ? '没有找到匹配的便签' : '当前笔记本暂无便签' }}
      </div>

      <!-- Month Groups -->
      <div
        v-for="group in groupedNotes"
        :key="group.key"
        class="space-y-1.5"
      >
        <!-- Group Header: Year-Month Separator (高对比度显眼样式) -->
        <div class="sticky top-0 z-10 px-2.5 py-1.5 bg-gradient-to-r from-blue-50/95 via-sky-50/90 to-slate-100/90 backdrop-blur-md rounded-lg flex items-center justify-between border-l-[3.5px] border-l-syno-blue border border-blue-200/70 text-slate-800 shadow-xs mb-1">
          <div class="flex items-center space-x-2">
            <div class="p-1 rounded-md bg-blue-100/80 text-syno-blue flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span class="text-xs font-bold text-slate-800 tracking-tight">{{ group.label }}</span>
          </div>
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-syno-blue text-white shadow-2xs shrink-0">
            {{ group.notes.length }} 篇
          </span>
        </div>

        <!-- Note Cards in this Month -->
        <div
          v-for="note in group.notes"
          :key="note.object_id"
          @click="noteStore.selectNote(note.object_id)"
          :class="[
            'group relative p-2.5 rounded-lg cursor-pointer transition border',
            noteStore.activeNoteId === note.object_id
              ? 'bg-white border-syno-blue/40 shadow-sm ring-1 ring-syno-blue/30'
              : 'bg-white/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
          ]"
        >
          <div class="flex items-start justify-between">
            <h4
              class="text-xs font-semibold truncate flex-1 pr-2"
              :class="noteStore.activeNoteId === note.object_id ? 'text-syno-blue' : 'text-slate-800'"
            >
              {{ note.title || '无标题便签' }}
            </h4>

            <!-- Actions: Share, History, Export & Delete -->
            <div class="flex items-center space-x-1 shrink-0">
              <!-- Share Management -->
              <button
                @click.stop="$emit('open-share', note.object_id, note.title)"
                class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-syno-blue p-0.5 transition"
                title="便签分享管理"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>

              <!-- History Versions -->
              <button
                @click.stop="$emit('open-history', note.object_id, note.title)"
                class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-syno-blue p-0.5 transition"
                title="查看历史版本"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <!-- Quick Export Note to .md -->
              <button
                @click.stop="quickExportNote(note)"
                class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-syno-blue p-0.5 transition"
                title="导出此便签为 .md 文件"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              <!-- Delete Note Action -->
              <button
                @click.stop="confirmDeleteNote(note)"
                class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5 transition"
                title="删除便签"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Tags List on Note Item Card -->
          <div v-if="note.tag && note.tag.length > 0" class="flex items-center flex-wrap gap-1 mt-1.5">
            <span
              v-for="t in note.tag"
              :key="t"
              class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-blue-50 text-syno-blue border border-blue-100 max-w-[120px] truncate"
              :title="t"
            >
              <svg class="w-2.5 h-2.5 mr-0.5 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span class="truncate">{{ t }}</span>
            </span>
          </div>

          <!-- Time & Meta -->
          <div class="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
            <span>{{ formatTime(note.mtime || note.ctime) }}</span>
            <span v-if="note.tag && note.tag.length > 0" class="text-[10px] text-slate-400">
              {{ note.tag.length }} 个标签
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { SynoNote } from '@/types/synology';
import { exportSingleNoteAsMarkdown } from '@/utils/exportMarkdown';

defineEmits<{
  (e: 'open-import'): void;
  (e: 'open-share', noteId: string, noteTitle?: string): void;
  (e: 'open-history', noteId: string, noteTitle?: string): void;
}>();

const noteStore = useNoteStore();
const sessionStore = useSessionStore();
const layoutStore = useLayoutStore();

interface NoteMonthGroup {
  key: string;
  label: string;
  notes: SynoNote[];
}

/**
 * Group filtered notes by Year-Month, sorted newest first
 */
const groupedNotes = computed<NoteMonthGroup[]>(() => {
  const sorted = [...noteStore.filteredNotes].sort((a, b) => {
    const timeA = a.mtime || a.ctime || 0;
    const timeB = b.mtime || b.ctime || 0;
    return timeB - timeA;
  });

  const groupMap = new Map<string, { label: string; notes: SynoNote[] }>();

  for (const note of sorted) {
    const rawTime = note.mtime || note.ctime || 0;
    let label = '更早或未记录时间';
    let key = 'earlier';

    if (rawTime > 0) {
      const ms = rawTime > 10000000000 ? rawTime : rawTime * 1000;
      const d = new Date(ms);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      key = `${y}-${m.toString().padStart(2, '0')}`;
      label = `${y}年${m.toString().padStart(2, '0')}月`;
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, { label, notes: [] });
    }
    groupMap.get(key)!.notes.push(note);
  }

  return Array.from(groupMap.entries()).map(([key, data]) => ({
    key,
    label: data.label,
    notes: data.notes
  }));
});

async function quickExportNote(note: SynoNote) {
  let noteToExport = note;
  if (!noteToExport.markdownContent) {
    const client = sessionStore.activeClient;
    if (client) {
      try {
        noteToExport = await client.getNote(note.object_id);
      } catch (e) {
        console.error('Failed to get note details for export', e);
      }
    }
  }
  exportSingleNoteAsMarkdown(noteToExport, noteStore.activeNotebook?.title);
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '';
  const ms = timestamp > 10000000000 ? timestamp : timestamp * 1000;
  const date = new Date(ms);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
}

async function createNewNote() {
  if (noteStore.isCreating || !noteStore.activeNotebookId) return;
  try {
    await noteStore.createNote('新便签', '# 新便签\n\n在此开始编写 Markdown...');
  } catch (e: any) {
    alert(`创建便签失败: ${e?.message || e}`);
  }
}

async function confirmDeleteNote(note: SynoNote) {
  if (confirm(`确定要将便签【${note.title || '无标题便签'}】移至废纸篓吗？`)) {
    try {
      await noteStore.deleteNote(note.object_id);
    } catch (e: any) {
      alert(`删除便签失败: ${e?.message || e}`);
    }
  }
}
</script>
