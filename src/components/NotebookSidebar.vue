<template>
  <div class="w-56 h-full bg-slate-100/90 border-r border-slate-200/90 flex flex-col select-none shrink-0">
    <!-- Header -->
    <div class="h-10 px-3 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
      <span class="flex items-center text-slate-600">
        <svg class="w-4 h-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        笔记本目录
      </span>

      <!-- New Notebook Button -->
      <button
        @click="promptNewNotebook"
        class="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
        title="新建笔记本"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Notebook List -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div v-if="noteStore.notebooks.length === 0" class="text-center py-8 text-xs text-slate-400">
        {{ sessionStore.activeSessionState?.isLoggedIn ? '暂无笔记本' : '未连接服务' }}
      </div>

      <div
        v-for="nb in noteStore.notebooks"
        :key="nb.object_id"
        @click="noteStore.selectNotebook(nb.object_id)"
        :class="[
          'group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition',
          noteStore.activeNotebookId === nb.object_id
            ? 'bg-syno-blue text-white font-medium shadow-sm'
            : 'text-slate-700 hover:bg-slate-200/70'
        ]"
      >
        <div class="flex items-center space-x-2 truncate">
          <svg
            class="w-3.5 h-3.5 shrink-0"
            :class="noteStore.activeNotebookId === nb.object_id ? 'text-white' : 'text-slate-400'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span class="truncate">{{ nb.title || '默认笔记本' }}</span>
        </div>

        <!-- Delete notebook action (hidden for preset) -->
        <button
          v-if="!nb.preset && noteStore.notebooks.length > 1"
          @click.stop="confirmDeleteNotebook(nb)"
          :class="[
            'opacity-0 group-hover:opacity-100 p-0.5 rounded transition',
            noteStore.activeNotebookId === nb.object_id ? 'hover:bg-blue-600 text-white' : 'hover:bg-slate-300 text-slate-500 hover:text-red-600'
          ]"
          title="删除笔记本"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { SynoNotebook } from '@/types/synology';

const noteStore = useNoteStore();
const sessionStore = useSessionStore();

async function promptNewNotebook() {
  const name = window.prompt('请输入新笔记本名称:');
  if (name && name.trim()) {
    try {
      await noteStore.createNotebook(name.trim());
    } catch (e: any) {
      alert(`创建笔记本失败: ${e?.message || e}`);
    }
  }
}

async function confirmDeleteNotebook(nb: SynoNotebook) {
  if (confirm(`确定要删除笔记本【${nb.title}】及其下所有便签吗？此操作无法撤销。`)) {
    try {
      await noteStore.deleteNotebook(nb.object_id);
    } catch (e: any) {
      alert(`删除失败: ${e?.message || e}`);
    }
  }
}
</script>

