<template>
  <div
    :class="[
      'h-full bg-slate-100/90 flex flex-col select-none shrink-0 transition-all duration-200 ease-in-out',
      layoutStore.isSidebarCollapsed ? 'w-0 overflow-hidden border-none opacity-0' : 'w-56 border-r border-slate-200/90'
    ]"
  >
    <!-- Header -->
    <div class="h-10 px-3 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700 shrink-0">
      <span class="flex items-center text-slate-600 truncate mr-2">
        <svg class="w-4 h-4 mr-1.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span class="truncate">笔记本目录</span>
      </span>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-1 shrink-0">
        <!-- Refresh Notebooks & Notes Button -->
        <button
          @click="handleRefreshAll"
          :disabled="noteStore.isLoading"
          class="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition disabled:opacity-40"
          title="刷新目录与便签"
        >
          <svg :class="['w-3.5 h-3.5', noteStore.isLoading ? 'animate-spin text-syno-blue' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

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

        <!-- Collapse Sidebar Button -->
        <button
          @click="layoutStore.toggleSidebar"
          class="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
          title="折叠笔记目录"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Notebook List -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div v-if="noteStore.notebooks.length === 0" class="text-center py-8 text-xs text-slate-400">
        {{ sessionStore.activeSessionState?.isLoggedIn ? '暂无笔记本' : '未连接服务' }}
      </div>

      <!-- "全部笔记" Root Node -->
      <div
        v-if="noteStore.notebooks.length > 0"
        @click="noteStore.selectNotebook('__all_notes__')"
        :class="[
          'group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition',
          noteStore.activeNotebookId === '__all_notes__'
            ? 'bg-syno-blue text-white font-medium shadow-sm'
            : 'text-slate-700 hover:bg-slate-200/70'
        ]"
      >
        <div class="flex items-center space-x-2 truncate">
          <svg
            class="w-3.5 h-3.5 shrink-0"
            :class="noteStore.activeNotebookId === '__all_notes__' ? 'text-white' : 'text-slate-400'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span class="truncate font-medium">全部笔记</span>
        </div>

        <span
          :class="[
            'text-[10px] px-1.5 py-0.2 rounded-full font-normal shrink-0',
            noteStore.activeNotebookId === '__all_notes__' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
          ]"
        >
          {{ noteStore.notes.length }}
        </span>
      </div>

      <!-- Divider between All Notes and Notebooks -->
      <div v-if="noteStore.notebooks.length > 0" class="my-1 border-t border-slate-200/80"></div>

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
        <div class="flex items-center space-x-1.5 truncate flex-1 min-w-0 pr-1">
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
          <span
            :class="[
              'text-[11px] font-normal shrink-0 ml-1',
              noteStore.activeNotebookId === nb.object_id ? 'text-blue-100' : 'text-slate-400'
            ]"
          >
            ({{ noteStore.getNotebookNoteCount(nb) }})
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-1 shrink-0">
          <!-- Export Notebook as Zip of Markdown -->
          <button
            @click.stop="handleExportNotebook(nb)"
            :class="[
              'opacity-0 group-hover:opacity-100 p-0.5 rounded transition',
              noteStore.activeNotebookId === nb.object_id ? 'hover:bg-blue-600 text-white' : 'hover:bg-slate-300 text-slate-500 hover:text-slate-800'
            ]"
            title="导出此笔记本内全部便签为 Markdown (.zip)"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

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

    <!-- Tag Filter Section (Requirement 2: 标签筛选栏) -->
    <div class="border-t border-slate-200/90 flex flex-col shrink-0 max-h-56 min-h-[100px] bg-slate-50/50">
      <!-- Tag Filter Header -->
      <div class="h-8 px-3 border-b border-slate-200/70 flex items-center justify-between text-[11px] font-semibold text-slate-600 shrink-0 bg-slate-100/60">
        <span class="flex items-center space-x-1.5 truncate">
          <svg class="w-3.5 h-3.5 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>标签筛选</span>
        </span>
        <button
          v-if="noteStore.selectedTag"
          @click="noteStore.selectTag(null)"
          class="text-[10px] text-syno-blue hover:text-blue-700 font-normal hover:underline cursor-pointer"
          title="清除标签筛选"
        >
          清除筛选
        </button>
        <span v-else class="text-[10px] text-slate-400 font-normal">
          {{ noteStore.tagListWithCounts.length }} 个
        </span>
      </div>

      <!-- Tag Capsule Buttons (Vertically Scrollable) -->
      <div class="flex-1 overflow-y-auto p-2">
        <div v-if="noteStore.tagListWithCounts.length === 0" class="text-center py-4 text-[11px] text-slate-400">
          暂无便签标签
        </div>
        <div v-else class="flex flex-wrap gap-1.5">
          <!-- "全部标签" Pill -->
          <button
            @click="noteStore.selectTag(null)"
            :class="[
              'px-2 py-1 rounded-md text-[11px] transition flex items-center shrink-0 border cursor-pointer',
              !noteStore.selectedTag
                ? 'bg-syno-blue text-white border-syno-blue font-medium shadow-2xs'
                : 'bg-white hover:bg-slate-200/70 text-slate-600 border-slate-200/80'
            ]"
          >
            全部
          </button>

          <!-- Individual Tag Pills -->
          <button
            v-for="tagItem in noteStore.tagListWithCounts"
            :key="tagItem.name"
            @click="noteStore.selectTag(tagItem.name)"
            :class="[
              'px-2 py-1 rounded-md text-[11px] transition flex items-center shrink-0 border cursor-pointer group',
              noteStore.selectedTag === tagItem.name
                ? 'bg-syno-blue text-white border-syno-blue font-medium shadow-2xs'
                : 'bg-white hover:bg-slate-200/70 text-slate-600 border-slate-200/80 hover:border-slate-300'
            ]"
            :title="`筛选 #${tagItem.name} 标签便签 (当前分类共 ${tagItem.count} 篇)`"
          >
            <span class="mr-0.5" :class="noteStore.selectedTag === tagItem.name ? 'text-blue-200' : 'text-slate-400'">#</span>
            <span class="truncate max-w-[120px]">{{ tagItem.name }}</span>
            <span
              :class="[
                'ml-1 text-[10px] px-1 py-0.2 rounded-full',
                noteStore.selectedTag === tagItem.name ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
              ]"
            >
              {{ tagItem.count }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { SynoNotebook } from '@/types/synology';
import { exportNotebookAsZip } from '@/utils/exportMarkdown';

const noteStore = useNoteStore();
const sessionStore = useSessionStore();
const layoutStore = useLayoutStore();

async function handleRefreshAll() {
  await noteStore.fetchNotebooks();
  await noteStore.fetchNotes(undefined, true);
}

async function handleExportNotebook(nb: SynoNotebook) {
  const client = sessionStore.activeClient;
  if (!client) return;

  try {
    const res = await client.listAllNotes(nb.object_id);
    if (!res.notes || res.notes.length === 0) {
      alert(`笔记本【${nb.title || '默认笔记本'}】暂无便签可导出`);
      return;
    }

    // Fetch full note details if markdown content isn't loaded yet
    const fullNotes = await Promise.all(
      res.notes.map(async (n) => {
        if (n.markdownContent) return n;
        try {
          return await client.getNote(n.object_id);
        } catch {
          return n;
        }
      })
    );

    await exportNotebookAsZip(nb.title || '默认笔记本', fullNotes);
  } catch (e: any) {
    alert(`导出笔记本失败: ${e?.message || e}`);
  }
}

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
