<template>
  <div
    :class="[
      'h-full bg-slate-100/90 flex flex-col select-none shrink-0 transition-all duration-200 ease-in-out relative',
      layoutStore.isSidebarCollapsed ? 'w-0 overflow-hidden border-none opacity-0' : 'w-80 border-r border-slate-200/90'
    ]"
  >
    <!-- Top Global Header -->
    <div class="h-10 px-3 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700 shrink-0 bg-white/70 backdrop-blur-xs">
      <span class="flex items-center text-slate-700 truncate mr-2">
        <svg class="w-4 h-4 mr-1.5 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span class="truncate">笔记本与便签</span>
      </span>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-1 shrink-0">
        <!-- Refresh Notebooks & Notes Button -->
        <button
          @click="handleRefreshAll"
          :disabled="noteStore.isLoading"
          class="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition disabled:opacity-40 cursor-pointer"
          title="刷新目录与便签"
        >
          <svg :class="['w-3.5 h-3.5', noteStore.isLoading ? 'animate-spin text-syno-blue' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <!-- New Notebook Button -->
        <button
          @click="openCreateModal"
          class="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          title="新建笔记本"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <!-- Collapse Sidebar Button -->
        <button
          @click="layoutStore.toggleSidebar"
          class="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          title="折叠笔记本与便签面板"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Accordion List Body -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
      <div v-if="noteStore.notebooks.length === 0" class="text-center py-8 text-xs text-slate-400">
        {{ sessionStore.activeSessionState?.isLoggedIn ? '暂无笔记本' : '未连接服务' }}
      </div>

      <!-- 1. "全部笔记" Accordion Panel -->
      <div
        v-if="noteStore.notebooks.length > 0"
        class="border border-slate-200/80 rounded-lg overflow-hidden bg-white/60 shadow-2xs transition"
      >
        <!-- "全部笔记" Accordion Header -->
        <div
          @click="toggleAccordion('__all_notes__')"
          :class="[
            'group flex items-center justify-between px-2.5 py-2 text-xs cursor-pointer transition select-none',
            expandedNotebookId === '__all_notes__'
              ? 'bg-blue-50/90 text-syno-blue font-semibold border-b border-blue-100'
              : 'text-slate-700 hover:bg-slate-200/60'
          ]"
        >
          <div class="flex items-center space-x-1.5 truncate flex-1 min-w-0 pr-1">
            <!-- Chevron arrow indicator -->
            <svg
              :class="[
                'w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0',
                expandedNotebookId === '__all_notes__' ? 'transform rotate-90 text-syno-blue' : ''
              ]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>

            <!-- All Notes Icon -->
            <svg
              class="w-3.5 h-3.5 shrink-0"
              :class="expandedNotebookId === '__all_notes__' ? 'text-syno-blue' : 'text-slate-400'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>

            <span class="truncate">全部笔记</span>
          </div>

          <span
            :class="[
              'text-[10px] px-1.5 py-0.2 rounded-full font-normal shrink-0',
              expandedNotebookId === '__all_notes__' ? 'bg-syno-blue text-white' : 'bg-slate-200 text-slate-500'
            ]"
          >
            {{ noteStore.notes.length }}
          </span>
        </div>

        <!-- "全部笔记" Accordion Content -->
        <div v-if="expandedNotebookId === '__all_notes__'" class="flex flex-col bg-slate-50/50">
          <!-- Dedicated Search Bar Row inside Accordion -->
          <div class="p-2 border-b border-slate-200/60 bg-white">
            <div class="relative w-full flex items-center">
              <svg v-if="!noteStore.isSearchingServer" class="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <svg v-else class="animate-spin w-3.5 h-3.5 absolute left-2.5 text-syno-blue pointer-events-none" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <input
                v-model="noteStore.searchQuery"
                type="text"
                placeholder="在全部笔记中搜索标题及内容..."
                class="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue placeholder:text-slate-400 shadow-2xs transition"
              />
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
          </div>

          <!-- Tag Bubbles under Search Box inside Accordion -->
          <div v-if="panelTags.length > 0" class="px-2 py-1.5 border-b border-slate-200/60 bg-slate-100/60 flex flex-wrap items-center gap-1">
            <button
              @click="noteStore.selectTag(null)"
              :class="[
                'px-2 py-0.5 rounded text-[11px] transition flex items-center shrink-0 border cursor-pointer',
                !noteStore.selectedTag
                  ? 'bg-syno-blue text-white border-syno-blue font-medium shadow-2xs'
                  : 'bg-white hover:bg-slate-200 text-slate-600 border-slate-200/80'
              ]"
            >
              全部
            </button>

            <button
              v-for="tagItem in panelTags"
              :key="tagItem.name"
              @click="noteStore.selectTag(tagItem.name)"
              :class="[
                'px-2 py-0.5 rounded text-[11px] transition flex items-center shrink-0 border cursor-pointer group',
                noteStore.selectedTag === tagItem.name
                  ? 'bg-syno-blue text-white border-syno-blue font-medium shadow-2xs'
                  : 'bg-white hover:bg-slate-200 text-slate-600 border-slate-200/80 hover:border-slate-300'
              ]"
              :title="`筛选 #${tagItem.name} 标签便签 (共 ${tagItem.count} 篇)`"
            >
              <span class="mr-0.5" :class="noteStore.selectedTag === tagItem.name ? 'text-blue-100' : 'text-slate-400'">#</span>
              <span class="truncate max-w-[90px]">{{ tagItem.name }}</span>
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

          <!-- Panel Action Bar: Note Count & New Note Button -->
          <div class="px-2.5 py-1.5 border-b border-slate-200/60 flex items-center justify-between text-xs text-slate-600 bg-white/50">
            <span class="text-[11px] font-medium text-slate-500">
              便签列表 ({{ noteStore.filteredNotes.length }})
            </span>
            <button
              @click="handleCreateNoteInPanel('__all_notes__')"
              :disabled="noteStore.isCreating"
              class="h-6 px-2 bg-syno-blue hover:bg-blue-600 text-white rounded text-[11px] flex items-center shadow-2xs transition disabled:opacity-50 cursor-pointer"
              title="新建便签"
            >
              <svg v-if="noteStore.isCreating" class="animate-spin -ml-0.5 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <svg v-else class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>{{ noteStore.isCreating ? '创建中' : '新建便签' }}</span>
            </button>
          </div>

          <!-- Note Items Container with Year-Month Grouping -->
          <div class="max-h-[calc(100vh-270px)] overflow-y-auto p-2 space-y-2">
            <!-- Loading indicator during note creation -->
            <div
              v-if="noteStore.isCreating"
              class="p-2 rounded-lg border border-syno-blue/40 bg-blue-50/50 animate-pulse flex items-center space-x-2 text-xs text-syno-blue"
            >
              <svg class="animate-spin h-3.5 w-3.5 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span class="font-medium">正在向服务器创建新便签...</span>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="groupedNotes.length === 0"
              class="text-center py-8 text-xs text-slate-400"
            >
              {{ noteStore.searchQuery || noteStore.selectedTag ? '没有找到匹配的便签' : '当前暂无便签' }}
            </div>

            <!-- Month Groups -->
            <div
              v-for="group in groupedNotes"
              :key="group.key"
              class="space-y-1"
            >
              <!-- Group Header -->
              <div class="sticky top-0 z-10 px-2 py-1 bg-gradient-to-r from-blue-50/95 via-sky-50/90 to-slate-100/90 backdrop-blur-md rounded flex items-center justify-between border-l-[3px] border-l-syno-blue border border-blue-200/70 text-slate-800 shadow-2xs mb-1">
                <span class="text-[11px] font-bold text-slate-800 tracking-tight">{{ group.label }}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-syno-blue text-white shadow-2xs shrink-0">
                  {{ group.notes.length }} 篇
                </span>
              </div>

              <!-- Note Cards -->
              <div
                v-for="note in group.notes"
                :key="note.object_id"
                @click="noteStore.selectNote(note.object_id)"
                :class="[
                  'group relative p-2 rounded-lg cursor-pointer transition border',
                  noteStore.activeNoteId === note.object_id
                    ? 'bg-white border-syno-blue/40 shadow-sm ring-1 ring-syno-blue/30'
                    : 'bg-white/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                ]"
              >
                <div class="flex items-start justify-between">
                  <h4
                    class="text-xs font-semibold truncate flex-1 pr-1"
                    :class="noteStore.activeNoteId === note.object_id ? 'text-syno-blue' : 'text-slate-800'"
                  >
                    {{ note.title || '无标题便签' }}
                  </h4>

                  <!-- Actions: Share, History, Export & Delete -->
                  <div class="flex items-center space-x-0.5 shrink-0">
                    <button
                      @click.stop="$emit('open-share', note.object_id, note.title)"
                      class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-syno-blue p-0.5 transition cursor-pointer"
                      title="便签分享管理"
                    >
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>

                    <button
                      @click.stop="$emit('open-history', note.object_id, note.title)"
                      class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-syno-blue p-0.5 transition cursor-pointer"
                      title="查看历史版本"
                    >
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    <button
                      @click.stop="quickExportNote(note)"
                      class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-syno-blue p-0.5 transition cursor-pointer"
                      title="导出为此便签为 .md 文件"
                    >
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>

                    <button
                      @click.stop="openDeleteNoteModal(note)"
                      class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-0.5 transition cursor-pointer"
                      title="删除便签"
                    >
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Tags List on Note Item Card -->
                <div v-if="note.tag && note.tag.length > 0" class="flex items-center flex-wrap gap-1 mt-1">
                  <span
                    v-for="t in note.tag"
                    :key="t"
                    class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium leading-none bg-blue-50 text-syno-blue border border-blue-100 max-w-[100px] truncate"
                    :title="t"
                  >
                    <span class="mr-0.5 text-blue-400">#</span>
                    <span class="truncate">{{ t }}</span>
                  </span>
                </div>

                <!-- Time & Meta -->
                <div class="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>{{ formatTime(note.mtime || note.ctime) }}</span>
                  <span v-if="note.tag && note.tag.length > 0">
                    {{ note.tag.length }} 标签
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Notebooks Accordion Panels (One per notebook) -->
      <div
        v-for="nb in noteStore.notebooks"
        :key="nb.object_id"
        class="border border-slate-200/80 rounded-lg overflow-hidden bg-white/60 shadow-2xs transition"
      >
        <!-- Notebook Accordion Header -->
        <div
          @click="toggleAccordion(nb.object_id)"
          @contextmenu.prevent="openContextMenu($event, nb)"
          :class="[
            'group flex items-center justify-between px-2.5 py-2 text-xs cursor-pointer transition select-none',
            expandedNotebookId === nb.object_id
              ? 'bg-blue-50/90 text-syno-blue font-semibold border-b border-blue-100'
              : 'text-slate-700 hover:bg-slate-200/60'
          ]"
        >
          <div class="flex items-center space-x-1.5 truncate flex-1 min-w-0 pr-1">
            <!-- Chevron arrow indicator -->
            <svg
              :class="[
                'w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0',
                expandedNotebookId === nb.object_id ? 'transform rotate-90 text-syno-blue' : ''
              ]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>

            <!-- Notebook Folder Icon -->
            <svg
              class="w-3.5 h-3.5 shrink-0"
              :class="expandedNotebookId === nb.object_id ? 'text-syno-blue' : 'text-slate-400'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>

            <span class="truncate" :title="nb.title || '默认笔记本'">{{ nb.title || '默认笔记本' }}</span>
          </div>

          <div class="flex items-center space-x-1 shrink-0">
            <!-- Note count badge -->
            <span
              :class="[
                'text-[10px] px-1.5 py-0.2 rounded-full font-normal shrink-0',
                expandedNotebookId === nb.object_id ? 'bg-syno-blue text-white' : 'bg-slate-200 text-slate-500'
              ]"
            >
              {{ noteStore.getNotebookNoteCount(nb) }}
            </span>

            <!-- Action Buttons (Hover) -->
            <!-- Rename notebook button -->
            <button
              @click.stop="openRenameModal(nb)"
              class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              title="重命名笔记本"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            <!-- Export Notebook as Zip -->
            <button
              @click.stop="handleExportNotebook(nb)"
              class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              title="导出此笔记本便签为 Markdown (.zip)"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            <!-- Delete notebook button -->
            <button
              v-if="!nb.preset && noteStore.notebooks.length > 1"
              @click.stop="openDeleteModal(nb)"
              class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200 transition cursor-pointer"
              title="删除笔记本"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Notebook Accordion Content (Only expanded for this notebook) -->
        <div v-if="expandedNotebookId === nb.object_id" class="flex flex-col bg-slate-50/50">
          <!-- 3. Dedicated Search Bar Row inside this Notebook's Accordion -->
          <div class="p-2 border-b border-slate-200/60 bg-white">
            <div class="relative w-full flex items-center">
              <svg v-if="!noteStore.isSearchingServer" class="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <svg v-else class="animate-spin w-3.5 h-3.5 absolute left-2.5 text-syno-blue pointer-events-none" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <input
                v-model="noteStore.searchQuery"
                type="text"
                :placeholder="`在【${nb.title || '当前笔记本'}】中搜索标题及内容...`"
                class="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue placeholder:text-slate-400 shadow-2xs transition"
              />
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
          </div>

          <!-- 4. Tag Bubbles under Search Box inside this Notebook -->
          <div v-if="panelTags.length > 0" class="px-2 py-1.5 border-b border-slate-200/60 bg-slate-100/60 flex flex-wrap items-center gap-1">
            <button
              @click="noteStore.selectTag(null)"
              :class="[
                'px-2 py-0.5 rounded text-[11px] transition flex items-center shrink-0 border cursor-pointer',
                !noteStore.selectedTag
                  ? 'bg-syno-blue text-white border-syno-blue font-medium shadow-2xs'
                  : 'bg-white hover:bg-slate-200 text-slate-600 border-slate-200/80'
              ]"
            >
              全部
            </button>

            <button
              v-for="tagItem in panelTags"
              :key="tagItem.name"
              @click="noteStore.selectTag(tagItem.name)"
              :class="[
                'px-2 py-0.5 rounded text-[11px] transition flex items-center shrink-0 border cursor-pointer group',
                noteStore.selectedTag === tagItem.name
                  ? 'bg-syno-blue text-white border-syno-blue font-medium shadow-2xs'
                  : 'bg-white hover:bg-slate-200 text-slate-600 border-slate-200/80 hover:border-slate-300'
              ]"
              :title="`筛选 #${tagItem.name} 标签便签 (当前笔记本共 ${tagItem.count} 篇)`"
            >
              <span class="mr-0.5" :class="noteStore.selectedTag === tagItem.name ? 'text-blue-100' : 'text-slate-400'">#</span>
              <span class="truncate max-w-[90px]">{{ tagItem.name }}</span>
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

          <!-- Panel Action Bar: Note Count & New Note Button -->
          <div class="px-2.5 py-1.5 border-b border-slate-200/60 flex items-center justify-between text-xs text-slate-600 bg-white/50">
            <span class="text-[11px] font-medium text-slate-500">
              便签列表 ({{ noteStore.filteredNotes.length }})
            </span>
            <button
              @click="handleCreateNoteInPanel(nb.object_id)"
              :disabled="noteStore.isCreating"
              class="h-6 px-2 bg-syno-blue hover:bg-blue-600 text-white rounded text-[11px] flex items-center shadow-2xs transition disabled:opacity-50 cursor-pointer"
              title="在此笔记本中新建便签"
            >
              <svg v-if="noteStore.isCreating" class="animate-spin -ml-0.5 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <svg v-else class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>{{ noteStore.isCreating ? '创建中' : '新建便签' }}</span>
            </button>
          </div>

          <!-- Note Items Container with Year-Month Grouping -->
          <div class="max-h-[calc(100vh-270px)] overflow-y-auto p-2 space-y-2">
            <!-- Loading indicator during note creation -->
            <div
              v-if="noteStore.isCreating"
              class="p-2 rounded-lg border border-syno-blue/40 bg-blue-50/50 animate-pulse flex items-center space-x-2 text-xs text-syno-blue"
            >
              <svg class="animate-spin h-3.5 w-3.5 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span class="font-medium">正在向服务器创建新便签...</span>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="groupedNotes.length === 0"
              class="text-center py-8 text-xs text-slate-400"
            >
              {{ noteStore.searchQuery || noteStore.selectedTag ? '没有找到匹配的便签' : '当前笔记本暂无便签' }}
            </div>

            <!-- Month Groups -->
            <div
              v-for="group in groupedNotes"
              :key="group.key"
              class="space-y-1"
            >
              <!-- Group Header -->
              <div class="sticky top-0 z-10 px-2 py-1 bg-gradient-to-r from-blue-50/95 via-sky-50/90 to-slate-100/90 backdrop-blur-md rounded flex items-center justify-between border-l-[3px] border-l-syno-blue border border-blue-200/70 text-slate-800 shadow-2xs mb-1">
                <span class="text-[11px] font-bold text-slate-800 tracking-tight">{{ group.label }}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-syno-blue text-white shadow-2xs shrink-0">
                  {{ group.notes.length }} 篇
                </span>
              </div>

              <!-- Note Cards -->
              <div
                v-for="note in group.notes"
                :key="note.object_id"
                @click="noteStore.selectNote(note.object_id)"
                :class="[
                  'group relative p-2 rounded-lg cursor-pointer transition border',
                  noteStore.activeNoteId === note.object_id
                    ? 'bg-white border-syno-blue/40 shadow-sm ring-1 ring-syno-blue/30'
                    : 'bg-white/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                ]"
              >
                <div class="flex items-start justify-between">
                  <h4
                    class="text-xs font-semibold truncate flex-1 pr-1"
                    :class="noteStore.activeNoteId === note.object_id ? 'text-syno-blue' : 'text-slate-800'"
                  >
                    {{ note.title || '无标题便签' }}
                  </h4>

                  <!-- Actions: Share, History, Export & Delete -->
                  <div class="flex items-center space-x-0.5 shrink-0">
                    <button
                      @click.stop="$emit('open-share', note.object_id, note.title)"
                      class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-syno-blue p-0.5 transition cursor-pointer"
                      title="便签分享管理"
                    >
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>

                    <button
                      @click.stop="$emit('open-history', note.object_id, note.title)"
                      class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-syno-blue p-0.5 transition cursor-pointer"
                      title="查看历史版本"
                    >
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    <button
                      @click.stop="quickExportNote(note)"
                      class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-syno-blue p-0.5 transition cursor-pointer"
                      title="导出此便签为 .md 文件"
                    >
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>

                    <button
                      @click.stop="openDeleteNoteModal(note)"
                      class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-0.5 transition cursor-pointer"
                      title="删除便签"
                    >
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Tags List on Note Item Card -->
                <div v-if="note.tag && note.tag.length > 0" class="flex items-center flex-wrap gap-1 mt-1">
                  <span
                    v-for="t in note.tag"
                    :key="t"
                    class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium leading-none bg-blue-50 text-syno-blue border border-blue-100 max-w-[100px] truncate"
                    :title="t"
                  >
                    <span class="mr-0.5 text-blue-400">#</span>
                    <span class="truncate">{{ t }}</span>
                  </span>
                </div>

                <!-- Time & Meta -->
                <div class="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>{{ formatTime(note.mtime || note.ctime) }}</span>
                  <span v-if="note.tag && note.tag.length > 0">
                    {{ note.tag.length }} 标签
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right-Click Context Menu for Notebooks -->
    <div
      v-if="contextMenu.isOpen"
      :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
      @click.stop
      class="fixed z-50 w-44 bg-white border border-slate-200 shadow-xl rounded-lg py-1.5 text-xs text-slate-700 animate-in fade-in duration-100"
    >
      <div class="px-3 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-100 truncate mb-1">
        {{ contextMenu.targetNotebook?.title }}
      </div>

      <button
        @click="triggerContextRename"
        class="w-full px-3 py-1.5 text-left hover:bg-slate-50 hover:text-syno-blue flex items-center space-x-2 transition cursor-pointer"
      >
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span>重命名笔记本</span>
      </button>

      <button
        @click="triggerContextExport"
        class="w-full px-3 py-1.5 text-left hover:bg-slate-50 hover:text-syno-blue flex items-center space-x-2 transition cursor-pointer"
      >
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>导出为 Markdown (.zip)</span>
      </button>

      <div class="h-px bg-slate-100 my-1"></div>

      <button
        v-if="!contextMenu.targetNotebook?.preset && noteStore.notebooks.length > 1"
        @click="triggerContextDelete"
        class="w-full px-3 py-1.5 text-left hover:bg-red-50 text-rose-600 flex items-center space-x-2 transition cursor-pointer"
      >
        <svg class="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>删除笔记本</span>
      </button>
      <div v-else class="px-3 py-1 text-[11px] text-slate-400 italic">
        预设笔记本不可删除
      </div>
    </div>

    <!-- Create / Rename Notebook Custom Modal -->
    <div
      v-if="notebookModal.isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      @click.self="closeNotebookModal"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-800 flex items-center">
            <svg class="w-4 h-4 mr-1.5 text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {{ notebookModal.mode === 'create' ? '新建笔记本' : '重命名笔记本' }}
          </h3>
          <button
            @click="closeNotebookModal"
            class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-5 space-y-4">
          <div v-if="notebookModal.error" class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {{ notebookModal.error }}
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">笔记本名称</label>
            <input
              ref="titleInputRef"
              v-model="notebookModal.title"
              @keydown.enter="submitNotebookModal"
              @keydown.esc="closeNotebookModal"
              type="text"
              placeholder="请输入笔记本名称..."
              class="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue transition"
            />
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              @click="closeNotebookModal"
              :disabled="notebookModal.loading"
              class="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              @click="submitNotebookModal"
              :disabled="notebookModal.loading || !notebookModal.title.trim()"
              class="px-4 py-1.5 text-xs bg-syno-blue hover:bg-blue-600 text-white rounded-lg font-medium shadow-2xs transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg v-if="notebookModal.loading" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>{{ notebookModal.mode === 'create' ? '创建' : '保存' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Notebook Custom Confirmation Modal -->
    <div
      v-if="deleteModal.isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      @click.self="closeDeleteModal"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div class="p-5">
          <div class="flex items-start space-x-3">
            <div class="p-2 rounded-full bg-rose-100 text-rose-600 shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-slate-800">删除笔记本</h3>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                确定要删除笔记本【<b class="text-slate-800">{{ deleteModal.targetNotebook?.title }}</b>】吗？
              </p>
              <p class="text-xs text-rose-600 mt-1 font-medium">
                ⚠️ 该笔记本下的全部便签也将被永久删除，此操作无法撤销。
              </p>
            </div>
          </div>

          <div v-if="deleteModal.error" class="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {{ deleteModal.error }}
          </div>

          <div class="flex items-center justify-end space-x-2 mt-5 pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="closeDeleteModal"
              :disabled="deleteModal.loading"
              class="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              @click="confirmDeleteNotebook"
              :disabled="deleteModal.loading"
              class="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium shadow-2xs transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg v-if="deleteModal.loading" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>{{ deleteModal.loading ? '正在删除...' : '确认删除' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Note Custom Confirmation Modal (No window.confirm!) -->
    <div
      v-if="deleteNoteModal.isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      @click.self="closeDeleteNoteModal"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div class="p-5">
          <div class="flex items-start space-x-3">
            <div class="p-2 rounded-full bg-rose-100 text-rose-600 shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-slate-800">移至废纸篓</h3>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                确定要将便签【<b class="text-slate-800">{{ deleteNoteModal.targetNote?.title || '无标题便签' }}</b>】移至废纸篓吗？
              </p>
            </div>
          </div>

          <div v-if="deleteNoteModal.error" class="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {{ deleteNoteModal.error }}
          </div>

          <div class="flex items-center justify-end space-x-2 mt-5 pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="closeDeleteNoteModal"
              :disabled="deleteNoteModal.loading"
              class="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              @click="confirmDeleteNote"
              :disabled="deleteNoteModal.loading"
              class="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium shadow-2xs transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg v-if="deleteNoteModal.loading" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>{{ deleteNoteModal.loading ? '正在删除...' : '确认移至废纸篓' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { SynoNotebook, SynoNote } from '@/types/synology';
import { exportNotebookAsZip, exportSingleNoteAsMarkdown } from '@/utils/exportMarkdown';

defineEmits<{
  (e: 'open-import'): void;
  (e: 'open-share', noteId: string, noteTitle?: string): void;
  (e: 'open-history', noteId: string, noteTitle?: string): void;
}>();

const noteStore = useNoteStore();
const sessionStore = useSessionStore();
const layoutStore = useLayoutStore();

const titleInputRef = ref<HTMLInputElement | null>(null);

// Requirement 2: Strict single-expanded accordion state ("同时只能展开一个折叠面板")
const expandedNotebookId = ref<string>('__all_notes__');

// Sync expanded accordion with active notebook if active notebook changes externally
watch(
  () => noteStore.activeNotebookId,
  (newId) => {
    if (newId && expandedNotebookId.value !== newId) {
      expandedNotebookId.value = newId;
    }
  },
  { immediate: true }
);

/**
 * Toggle accordion panel (strictly only one panel expanded at a time)
 */
function toggleAccordion(notebookId: string) {
  if (expandedNotebookId.value === notebookId) {
    // If user clicks the currently expanded panel, toggle it closed
    expandedNotebookId.value = '';
  } else {
    expandedNotebookId.value = notebookId;
    noteStore.searchQuery = '';
    noteStore.selectTag(null);
    noteStore.selectNotebook(notebookId);
  }
}

/**
 * Calculate tags for the currently expanded notebook
 */
const panelTags = computed<{ name: string; count: number }[]>(() => {
  const currentNbId = expandedNotebookId.value;
  let targetNotes = noteStore.notes;

  if (currentNbId && currentNbId !== '__all_notes__') {
    const targetNb = noteStore.notebooks.find(
      nb => String(nb.object_id) === currentNbId || String((nb as any).notebook_id || '') === currentNbId
    );
    const targetNbItems = new Set(targetNb?.items?.map(i => String(i)) || []);

    targetNotes = targetNotes.filter(n => {
      const pId = String(n.parent_id || '');
      const nbId = String((n as any).notebook_id || '');
      const oId = String(n.object_id || '');
      return pId === currentNbId || nbId === currentNbId || targetNbItems.has(oId);
    });
  }

  const tagMap = new Map<string, number>();
  for (const n of targetNotes) {
    for (const t of n.tag || []) {
      const clean = t?.trim();
      if (clean) {
        tagMap.set(clean, (tagMap.get(clean) || 0) + 1);
      }
    }
  }

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
});

interface NoteMonthGroup {
  key: string;
  label: string;
  notes: SynoNote[];
}

/**
 * Group filtered notes by Year-Month for the expanded notebook
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

async function handleCreateNoteInPanel(targetNotebookId: string) {
  if (noteStore.isCreating) return;
  try {
    if (targetNotebookId && targetNotebookId !== '__all_notes__') {
      await noteStore.selectNotebook(targetNotebookId);
    } else if (!noteStore.activeNotebookId || noteStore.activeNotebookId === '__all_notes__') {
      const firstNb = noteStore.notebooks[0];
      if (firstNb) {
        await noteStore.selectNotebook(firstNb.object_id);
      }
    }
    await noteStore.createNote('新便签', '# 新便签\n\n在此开始编写 Markdown...');
  } catch (e: any) {
    console.error('Failed to create note', e);
  }
}

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
  const nbTitle = noteStore.notebooks.find(
    nb => nb.object_id === (note.parent_id || (note as any).notebook_id)
  )?.title || noteStore.activeNotebook?.title;
  exportSingleNoteAsMarkdown(noteToExport, nbTitle);
}

// ================= Modal States =================

// Notebook Create / Rename Modal State
const notebookModal = reactive({
  isOpen: false,
  mode: 'create' as 'create' | 'rename',
  targetNotebook: null as SynoNotebook | null,
  title: '',
  loading: false,
  error: ''
});

// Delete Notebook Confirmation Modal State
const deleteModal = reactive({
  isOpen: false,
  targetNotebook: null as SynoNotebook | null,
  loading: false,
  error: ''
});

// Delete Note Confirmation Modal State (Custom modal replacing native confirm)
const deleteNoteModal = reactive({
  isOpen: false,
  targetNote: null as SynoNote | null,
  loading: false,
  error: ''
});

// Right-Click Context Menu State
const contextMenu = reactive({
  isOpen: false,
  x: 0,
  y: 0,
  targetNotebook: null as SynoNotebook | null
});

function openContextMenu(event: MouseEvent, nb: SynoNotebook) {
  contextMenu.isOpen = true;
  contextMenu.x = Math.min(event.clientX, window.innerWidth - 180);
  contextMenu.y = Math.min(event.clientY, window.innerHeight - 150);
  contextMenu.targetNotebook = nb;
}

function closeContextMenu() {
  if (contextMenu.isOpen) {
    contextMenu.isOpen = false;
    contextMenu.targetNotebook = null;
  }
}

function triggerContextRename() {
  const nb = contextMenu.targetNotebook;
  closeContextMenu();
  if (nb) {
    openRenameModal(nb);
  }
}

function triggerContextExport() {
  const nb = contextMenu.targetNotebook;
  closeContextMenu();
  if (nb) {
    handleExportNotebook(nb);
  }
}

function triggerContextDelete() {
  const nb = contextMenu.targetNotebook;
  closeContextMenu();
  if (nb) {
    openDeleteModal(nb);
  }
}

function openCreateModal() {
  closeContextMenu();
  notebookModal.isOpen = true;
  notebookModal.mode = 'create';
  notebookModal.targetNotebook = null;
  notebookModal.title = '';
  notebookModal.error = '';
  notebookModal.loading = false;
  nextTick(() => {
    titleInputRef.value?.focus();
  });
}

function openRenameModal(nb: SynoNotebook) {
  closeContextMenu();
  notebookModal.isOpen = true;
  notebookModal.mode = 'rename';
  notebookModal.targetNotebook = nb;
  notebookModal.title = nb.title || '';
  notebookModal.error = '';
  notebookModal.loading = false;
  nextTick(() => {
    titleInputRef.value?.focus();
    titleInputRef.value?.select();
  });
}

function closeNotebookModal() {
  if (notebookModal.loading) return;
  notebookModal.isOpen = false;
  notebookModal.targetNotebook = null;
  notebookModal.title = '';
  notebookModal.error = '';
}

async function submitNotebookModal() {
  const title = notebookModal.title.trim();
  if (!title) {
    notebookModal.error = '笔记本名称不能为空';
    return;
  }

  notebookModal.loading = true;
  notebookModal.error = '';

  try {
    if (notebookModal.mode === 'create') {
      const created = await noteStore.createNotebook(title);
      if (created) {
        expandedNotebookId.value = created.object_id;
      }
    } else if (notebookModal.mode === 'rename' && notebookModal.targetNotebook) {
      await noteStore.renameNotebook(notebookModal.targetNotebook.object_id, title);
    }
    notebookModal.isOpen = false;
  } catch (e: any) {
    notebookModal.error = (notebookModal.mode === 'create' ? '创建笔记本失败: ' : '重命名笔记本失败: ') + (e?.message || e);
  } finally {
    notebookModal.loading = false;
  }
}

function openDeleteModal(nb: SynoNotebook) {
  closeContextMenu();
  deleteModal.isOpen = true;
  deleteModal.targetNotebook = nb;
  deleteModal.loading = false;
  deleteModal.error = '';
}

function closeDeleteModal() {
  if (deleteModal.loading) return;
  deleteModal.isOpen = false;
  deleteModal.targetNotebook = null;
  deleteModal.error = '';
}

async function confirmDeleteNotebook() {
  if (!deleteModal.targetNotebook) return;

  deleteModal.loading = true;
  deleteModal.error = '';

  try {
    await noteStore.deleteNotebook(deleteModal.targetNotebook.object_id);
    deleteModal.isOpen = false;
    deleteModal.targetNotebook = null;
    expandedNotebookId.value = noteStore.notebooks[0]?.object_id || '__all_notes__';
  } catch (e: any) {
    deleteModal.error = `删除失败: ${e?.message || e}`;
  } finally {
    deleteModal.loading = false;
  }
}

function openDeleteNoteModal(note: SynoNote) {
  closeContextMenu();
  deleteNoteModal.isOpen = true;
  deleteNoteModal.targetNote = note;
  deleteNoteModal.loading = false;
  deleteNoteModal.error = '';
}

function closeDeleteNoteModal() {
  if (deleteNoteModal.loading) return;
  deleteNoteModal.isOpen = false;
  deleteNoteModal.targetNote = null;
  deleteNoteModal.error = '';
}

async function confirmDeleteNote() {
  if (!deleteNoteModal.targetNote) return;

  deleteNoteModal.loading = true;
  deleteNoteModal.error = '';

  try {
    await noteStore.deleteNote(deleteNoteModal.targetNote.object_id);
    deleteNoteModal.isOpen = false;
    deleteNoteModal.targetNote = null;
  } catch (e: any) {
    deleteNoteModal.error = `删除便签失败: ${e?.message || e}`;
  } finally {
    deleteNoteModal.loading = false;
  }
}

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
      return;
    }

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
    console.error(`导出笔记本失败: ${e?.message || e}`);
  }
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeContextMenu);
});
</script>
