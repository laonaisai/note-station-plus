<template>
  <div class="w-64 h-full bg-slate-50 border-r border-slate-200 flex flex-col select-none shrink-0">
    <!-- Search & New Note Bar -->
    <div class="p-2 border-b border-slate-200 flex items-center space-x-1.5">
      <div class="relative flex-1">
        <svg class="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="noteStore.searchQuery"
          type="text"
          placeholder="搜索便签..."
          class="w-full pl-8 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue"
        />
      </div>

      <button
        @click="createNewNote"
        class="h-7 px-2 bg-syno-blue hover:bg-blue-600 text-white rounded-md text-xs flex items-center shadow-sm shrink-0 transition"
        title="新建便签"
      >
        <svg class="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新建
      </button>
    </div>

    <!-- Notes List -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div v-if="noteStore.filteredNotes.length === 0" class="text-center py-12 text-xs text-slate-400">
        {{ noteStore.searchQuery ? '没有找到匹配的便签' : '当前笔记本暂无便签' }}
      </div>

      <div
        v-for="note in noteStore.filteredNotes"
        :key="note.object_id"
        @click="noteStore.selectNote(note.object_id)"
        :class="[
          'group relative p-2.5 rounded-lg cursor-pointer transition border',
          noteStore.activeNoteId === note.object_id
            ? 'bg-white border-syno-blue/40 shadow-sm ring-1 ring-syno-blue/30'
            : 'bg-white/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
        ]"
      >
        <div class="flex items-start justify-between">
          <h4
            class="text-xs font-semibold truncate flex-1 pr-2"
            :class="noteStore.activeNoteId === note.object_id ? 'text-syno-blue' : 'text-slate-800'"
          >
            {{ note.title || '无标题便签' }}
          </h4>

          <!-- Actions: Export & Delete -->
          <div class="flex items-center space-x-1 shrink-0">
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

        <div class="flex items-center justify-between mt-1 text-[11px] text-slate-400">
          <span>{{ formatTime(note.mtime || note.ctime) }}</span>
          <span v-if="note.tag && note.tag.length > 0" class="truncate max-w-[80px] bg-slate-100 px-1 py-0.5 rounded text-[10px] text-slate-500">
            {{ note.tag.join(', ') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { SynoNote } from '@/types/synology';
import { exportSingleNoteAsMarkdown } from '@/utils/exportMarkdown';

const noteStore = useNoteStore();
const sessionStore = useSessionStore();

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
  const date = new Date(timestamp * 1000);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
}

async function createNewNote() {
  try {
    await noteStore.createNote('新便签', '# 新便签\n\n在此开始编写 Markdown...');
  } catch (e: any) {
    alert(`创建便签失败: ${e?.message || e}`);
  }
}

async function confirmDeleteNote(note: SynoNote) {
  if (confirm(`确定要将便签【${note.title || '无标题便签'}】移至废纸篓吗？`)) {
    try {
      await noteStore.deleteActiveNote();
    } catch (e: any) {
      alert(`删除便签失败: ${e?.message || e}`);
    }
  }
}
</script>

