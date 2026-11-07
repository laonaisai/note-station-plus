<template>
  <div
    :class="[
      'h-full bg-slate-100/90 dark:bg-slate-900/90 flex flex-col select-none shrink-0 transition-all duration-200 ease-in-out relative',
      layoutStore.isSidebarCollapsed ? 'w-0 overflow-hidden border-none opacity-0' : 'w-80 border-r border-slate-200/90 dark:border-slate-800'
    ]"
  >
    <!-- Top Global Header -->
    <div class="h-10 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs">
      <span class="flex items-center text-slate-700 dark:text-slate-200 truncate mr-2">
        <svg class="w-4 h-4 mr-1.5 text-syno-blue dark:text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span class="truncate">{{ t('sidebar.notebooks') }}</span>
      </span>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-1 shrink-0">
        <!-- Refresh / Sync with Server Button -->
        <button
          @click="handleRefreshAll"
          :disabled="noteStore.isLoading || noteStore.isSyncingWithServer"
          class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition disabled:opacity-40 cursor-pointer"
          :title="t('editor.syncWithServer')"
        >
          <svg :class="['w-3.5 h-3.5', (noteStore.isLoading || noteStore.isSyncingWithServer) ? 'animate-spin text-syno-blue' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <!-- New Notebook Button -->
        <button
          @click="openCreateModal"
          class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          :title="t('sidebar.addNotebook')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <!-- Collapse Sidebar Button -->
        <button
          @click="layoutStore.toggleSidebar"
          class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          :title="t('editor.collapseSidebar')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Accordion List Body (无外层多余滚动条，仅内部展开列表滚动) -->
    <div
      :class="[
        'flex-1 p-2 flex flex-col min-h-0 space-y-1.5',
        expandedNotebookId ? 'overflow-hidden' : 'overflow-y-auto'
      ]"
    >
      <div v-if="noteStore.notebooks.length === 0" class="text-center py-8 text-xs text-slate-400">
        {{ sessionStore.activeSessionState?.isLoggedIn ? t('sidebar.emptyNotebooks') : t('sidebar.notConnected') }}
      </div>

      <!-- 0. "收藏夹" Accordion Panel (展开时独占显示，收起时与其他笔记本并列显示) -->
      <div
        v-if="noteStore.notebooks.length > 0"
        v-show="!expandedNotebookId || expandedNotebookId === '__favorites__'"
        :class="[
          'border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden bg-white/60 dark:bg-slate-900/60 shadow-2xs transition',
          expandedNotebookId === '__favorites__' ? 'flex-1 flex flex-col min-h-0' : 'shrink-0'
        ]"
      >
        <!-- "收藏夹" Accordion Header -->
        <div
          @click="toggleAccordion('__favorites__')"
          :class="[
            'group flex items-center justify-between px-2.5 py-2 text-xs cursor-pointer transition select-none shrink-0',
            expandedNotebookId === '__favorites__'
              ? 'bg-blue-50/90 dark:bg-blue-950/40 text-syno-blue dark:text-sky-400 font-semibold border-b border-blue-100 dark:border-blue-900/40'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          ]"
        >
          <div class="flex items-center space-x-1.5 truncate flex-1 min-w-0 pr-1">
            <!-- Chevron arrow indicator -->
            <svg
              :class="[
                'w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0',
                expandedNotebookId === '__favorites__' ? 'transform rotate-90 text-syno-blue dark:text-sky-400' : ''
              ]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>

            <!-- Star Icon (收藏夹图标) -->
            <svg
              class="w-3.5 h-3.5 shrink-0"
              :class="expandedNotebookId === '__favorites__' ? 'text-amber-500 fill-amber-400' : 'text-slate-400'"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>

            <span class="truncate">{{ t('sidebar.favorites') }}</span>
          </div>

          <span
            :class="[
              'text-[10px] px-1.5 py-0.2 rounded-full font-normal shrink-0',
              expandedNotebookId === '__favorites__' ? 'bg-syno-blue text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            ]"
          >
            {{ noteStore.favoriteNotes.length }}
          </span>
        </div>

        <!-- "收藏夹" Accordion Content -->
        <div v-if="expandedNotebookId === '__favorites__'" class="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
          <!-- Dedicated Search Bar Row inside Accordion -->
          <div class="p-2 border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
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
                :placeholder="t('sidebar.searchPlaceholder')"
                class="w-full pl-8 pr-7 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs transition"
              />
              <button
                v-if="noteStore.searchQuery"
                @click="noteStore.searchQuery = ''"
                class="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
                :title="t('sidebar.clearSearch')"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Tags Multi-Select Dropdown Filter Row -->
          <div v-if="panelTags.length > 0" class="px-2 py-1.5 border-b border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 relative shrink-0">
            <div class="flex items-center justify-between text-[11px]">
              <div class="relative flex-1 mr-2">
                <button
                  type="button"
                  @click="isTagDropdownOpen = !isTagDropdownOpen"
                  class="w-full flex items-center justify-between px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-left text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-2xs cursor-pointer"
                >
                  <span class="truncate flex items-center">
                    <svg class="w-3 h-3 text-slate-400 mr-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span v-if="noteStore.selectedTags.length === 0" class="text-slate-400 dark:text-slate-500">{{ t('sidebar.filterByTag') }}...</span>
                    <span v-else class="text-syno-blue dark:text-sky-400 font-medium">{{ t('sidebar.selectedTagsCount', { count: noteStore.selectedTags.length }) }}</span>
                  </span>
                  <svg class="w-3 h-3 text-slate-400 shrink-0 ml-1 transition-transform" :class="isTagDropdownOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div
                  v-if="isTagDropdownOpen"
                  class="absolute left-0 top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-30 py-1 max-h-48 overflow-y-auto"
                >
                  <div
                    v-for="tag in panelTags"
                    :key="tag.name"
                    @click="noteStore.toggleTag(tag.name)"
                    class="px-2.5 py-1 text-[11px] flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition select-none"
                    :class="noteStore.selectedTags.includes(tag.name) ? 'text-syno-blue dark:text-sky-400 font-medium bg-blue-50/50 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-300'"
                  >
                    <span class="flex items-center space-x-1.5 truncate">
                      <input
                        type="checkbox"
                        :checked="noteStore.selectedTags.includes(tag.name)"
                        class="rounded border-slate-300 dark:border-slate-600 text-syno-blue pointer-events-none"
                      />
                      <span class="truncate"># {{ tag.name }}</span>
                    </span>
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal shrink-0 ml-1">{{ tag.count }}</span>
                  </div>
                </div>
              </div>

              <button
                v-if="noteStore.selectedTags.length > 0"
                @click="noteStore.clearTags()"
                class="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:underline shrink-0 text-[10px] transition cursor-pointer"
              >
                {{ t('common.clear') }}
              </button>
            </div>
          </div>

          <!-- Notes Scrollable List (按年月分组) -->
          <div class="flex-1 overflow-y-auto p-1.5 space-y-3 min-h-0">
            <div v-if="groupedNotes.length === 0" class="text-center py-6 text-xs text-slate-400">
              <svg class="w-8 h-8 mx-auto mb-1.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {{ noteStore.searchQuery || noteStore.selectedTags.length > 0 ? t('sidebar.emptyNotes') : t('sidebar.noFavorites') }}
            </div>

            <div v-for="group in groupedNotes" :key="group.key" class="space-y-1">
              <!-- Year-Month Group Header -->
              <div class="sticky top-0 z-10 px-2 py-1 bg-gradient-to-r from-blue-50/95 via-sky-50/90 to-slate-100/90 dark:from-slate-800/95 dark:via-slate-800/90 dark:to-slate-900/90 backdrop-blur-md rounded flex items-center justify-between border-l-[3px] border-l-syno-blue border border-blue-200/70 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs mb-1">
                <span class="text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-tight">{{ group.label }}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-syno-blue text-white shadow-2xs shrink-0">
                  {{ group.notes.length }} {{ t('sidebar.noteCountSuffix') }}
                </span>
              </div>

              <!-- Note Items in Group -->
              <div
                v-for="note in group.notes"
                :key="note.object_id"
                @click="noteStore.selectNote(note.object_id)"
                @contextmenu.prevent="openNoteContextMenu($event, note)"
                :class="[
                  'group relative p-2 rounded-lg cursor-pointer transition border',
                  noteStore.activeNoteId === note.object_id
                    ? 'bg-slate-800 dark:bg-blue-950/60 border-slate-700 dark:border-sky-500 shadow-md text-white'
                    : 'bg-white/70 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                ]"
              >
                <div class="flex items-start justify-between">
                  <h4
                    class="text-xs font-semibold truncate flex-1 pr-1 flex items-center gap-1.5 min-w-0"
                    :class="noteStore.activeNoteId === note.object_id ? 'text-white' : 'text-slate-800 dark:text-slate-200'"
                  >
                    <!-- Loading Spinner (便签内容加载中) -->
                    <svg
                      v-if="noteStore.isLoadingNote && noteStore.activeNoteId === note.object_id"
                      class="animate-spin w-3.5 h-3.5 shrink-0"
                      :class="noteStore.activeNoteId === note.object_id ? 'text-sky-300' : 'text-syno-blue'"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>

                    <!-- Favorite Icon (已收藏图标) -->
                    <svg
                      v-if="noteStore.isFavorite(note.object_id)"
                      class="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      :title="t('sidebar.addToFavorites')"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>

                    <!-- Share Icon (已共享图标) -->
                    <svg
                      v-if="isNoteShared(note)"
                      class="w-3.5 h-3.5 shrink-0"
                      :class="noteStore.activeNoteId === note.object_id ? 'text-sky-300' : 'text-syno-blue'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      :title="t('editor.sharedBadge')"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>

                    <span class="truncate">{{ note.title || t('editor.untitledNote') }}</span>
                  </h4>

                  <!-- Note Menu Button (点击显示操作下拉菜单) -->
                  <button
                    @click.stop="openNoteMenuFromButton($event, note)"
                    class="opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded transition cursor-pointer shrink-0"
                    :class="[
                      noteStore.activeNoteId === note.object_id
                        ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
                      noteContextMenu.isOpen && noteContextMenu.targetNote?.object_id === note.object_id
                        ? (noteStore.activeNoteId === note.object_id ? '!opacity-100 bg-slate-700 text-white' : '!opacity-100 bg-slate-200 text-slate-700')
                        : ''
                    ]"
                    :title="t('common.actions')"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                <p
                  class="text-[11px] line-clamp-2 mt-1"
                  :class="noteStore.activeNoteId === note.object_id ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'"
                >
                  {{ note.brief || note.markdownContent || t('common.info') }}
                </p>

                <div
                  class="flex items-center justify-between mt-2 pt-1.5 border-t text-[10px]"
                  :class="noteStore.activeNoteId === note.object_id ? 'border-slate-700/80 text-slate-400' : 'border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500'"
                >
                  <span>{{ formatTime(note.mtime || note.ctime) }}</span>
                  <div class="flex items-center space-x-1">
                    <span
                      v-for="t in (note.tag || []).slice(0, 2)"
                      :key="t"
                      class="px-1.5 py-0.2 rounded font-normal"
                      :class="noteStore.activeNoteId === note.object_id ? 'bg-slate-700 dark:bg-blue-900/60 text-slate-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'"
                    >
                      #{{ t }}
                    </span>
                    <span v-if="(note.tag || []).length > 2" class="text-[9px]">
                      +{{ (note.tag || []).length - 2 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 1. "全部笔记" Accordion Panel (展开时独占显示，收起时与其他笔记本并列显示) -->
      <div
        v-if="noteStore.notebooks.length > 0"
        v-show="!expandedNotebookId || expandedNotebookId === '__all_notes__'"
        :class="[
          'border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden bg-white/60 dark:bg-slate-900/60 shadow-2xs transition',
          expandedNotebookId === '__all_notes__' ? 'flex-1 flex flex-col min-h-0' : 'shrink-0'
        ]"
      >
        <!-- "全部笔记" Accordion Header -->
        <div
          @click="toggleAccordion('__all_notes__')"
          :class="[
            'group flex items-center justify-between px-2.5 py-2 text-xs cursor-pointer transition select-none shrink-0',
            expandedNotebookId === '__all_notes__'
              ? 'bg-blue-50/90 dark:bg-blue-950/40 text-syno-blue dark:text-sky-400 font-semibold border-b border-blue-100 dark:border-blue-900/40'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          ]"
        >
          <div class="flex items-center space-x-1.5 truncate flex-1 min-w-0 pr-1">
            <!-- Chevron arrow indicator -->
            <svg
              :class="[
                'w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0',
                expandedNotebookId === '__all_notes__' ? 'transform rotate-90 text-syno-blue dark:text-sky-400' : ''
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

            <span class="truncate">{{ t('sidebar.allNotes') }}</span>
          </div>

          <span
            :class="[
              'text-[10px] px-1.5 py-0.2 rounded-full font-normal shrink-0',
              expandedNotebookId === '__all_notes__' ? 'bg-syno-blue text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            ]"
          >
            {{ noteStore.notes.length }}
          </span>
        </div>

        <!-- "全部笔记" Accordion Content -->
        <div v-if="expandedNotebookId === '__all_notes__'" class="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
          <!-- Dedicated Search Bar Row inside Accordion -->
          <div class="p-2 border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
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
                :placeholder="t('sidebar.searchPlaceholder')"
                class="w-full pl-8 pr-7 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs transition"
              />
              <button
                v-if="noteStore.searchQuery"
                @click="noteStore.searchQuery = ''"
                class="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
                :title="t('sidebar.clearSearch')"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Tag Dropdown Multi-Select Row inside Accordion -->
          <div v-if="panelTags.length > 0" class="px-2 py-1.5 border-b border-slate-200/60 bg-slate-100/50 relative shrink-0">
            <div class="flex items-center justify-between">
              <!-- Dropdown Trigger Button -->
              <button
                type="button"
                @click.stop="isTagDropdownOpen = !isTagDropdownOpen"
                :class="[
                  'flex-1 flex items-center justify-between px-2 py-1 text-xs rounded border transition cursor-pointer text-left',
                  noteStore.selectedTags.length > 0
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-syno-blue/40 dark:border-sky-500/40 text-syno-blue dark:text-sky-400 font-medium'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                ]"
              >
                <div class="flex items-center space-x-1.5 truncate mr-1">
                  <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span class="truncate">
                    <template v-if="noteStore.selectedTags.length === 0">
                      {{ t('sidebar.filterByTag') }} ({{ panelTags.length }})
                    </template>
                    <template v-else>
                      {{ t('sidebar.selectedTagsCount', { count: noteStore.selectedTags.length }) }}: {{ noteStore.selectedTags.map(t => '#' + t).join(', ') }}
                    </template>
                  </span>
                </div>

                <div class="flex items-center space-x-1 shrink-0">
                  <span
                    v-if="noteStore.selectedTags.length > 0"
                    class="text-[10px] px-1.5 py-0.2 rounded-full bg-syno-blue text-white font-semibold"
                  >
                    {{ noteStore.selectedTags.length }}
                  </span>
                  <svg
                    :class="['w-3.5 h-3.5 text-slate-400 transition-transform duration-150', isTagDropdownOpen ? 'transform rotate-180' : '']"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <!-- Clear Tags Button -->
              <button
                v-if="noteStore.selectedTags.length > 0"
                @click.stop="noteStore.clearTags()"
                class="ml-1 px-1.5 py-1 text-[11px] text-slate-400 hover:text-rose-500 rounded hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                :title="t('sidebar.clearTags')"
              >
                {{ t('common.clear') }}
              </button>
            </div>

            <!-- Dropdown Floating Panel -->
            <div
              v-if="isTagDropdownOpen"
              @click.stop
              class="absolute left-2 right-2 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg p-1.5 max-h-56 overflow-y-auto space-y-0.5 animate-in fade-in duration-100"
            >
              <div class="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between mb-1">
                <span>{{ t('sidebar.filterByTag') }}</span>
                <button
                  v-if="noteStore.selectedTags.length > 0"
                  @click="noteStore.clearTags()"
                  class="text-syno-blue hover:underline cursor-pointer"
                >
                  {{ t('sidebar.clearTags') }}
                </button>
              </div>

              <label
                v-for="tagItem in panelTags"
                :key="tagItem.name"
                class="flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition select-none"
              >
                <div class="flex items-center space-x-2 truncate flex-1 pr-1">
                  <input
                    type="checkbox"
                    :checked="noteStore.selectedTags.includes(tagItem.name)"
                    @change="noteStore.toggleTag(tagItem.name)"
                    class="rounded text-syno-blue dark:text-sky-400 focus:ring-syno-blue w-3.5 h-3.5 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                  />
                  <span class="truncate text-slate-700 dark:text-slate-200"># {{ tagItem.name }}</span>
                </div>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono">
                  {{ tagItem.count }}
                </span>
              </label>
            </div>
          </div>

          <!-- Panel Action Bar: Note Count & New Note Button -->
          <div class="px-2.5 py-1.5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 shrink-0">
            <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {{ t('sidebar.notesList') }} ({{ noteStore.filteredNotes.length }})
            </span>
            <button
              @click="handleCreateNoteInPanel('__all_notes__')"
              :disabled="noteStore.isCreating"
              class="h-6 px-2 bg-syno-blue hover:bg-blue-600 text-white rounded text-[11px] flex items-center shadow-2xs transition disabled:opacity-50 cursor-pointer"
              :title="t('sidebar.newNote')"
            >
              <svg v-if="noteStore.isCreating" class="animate-spin -ml-0.5 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <svg v-else class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>{{ noteStore.isCreating ? t('sidebar.creating') : t('sidebar.newNote') }}</span>
            </button>
          </div>

          <!-- Note Items Container with Year-Month Grouping (滚动条仅在内部展示) -->
          <div class="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
            <!-- Loading indicator during note creation -->
            <div
              v-if="noteStore.isCreating"
              class="p-2 rounded-lg border border-syno-blue/40 bg-blue-50/50 animate-pulse flex items-center space-x-2 text-xs text-syno-blue"
            >
              <svg class="animate-spin h-3.5 w-3.5 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span class="font-medium">{{ t('sidebar.creatingNoteTip') }}</span>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="groupedNotes.length === 0"
              class="text-center py-8 text-xs text-slate-400"
            >
              {{ noteStore.searchQuery || noteStore.selectedTags.length > 0 ? t('sidebar.emptyNotes') : t('sidebar.noNotes') }}
            </div>

            <!-- Month Groups -->
            <div
              v-for="group in groupedNotes"
              :key="group.key"
              class="space-y-1"
            >
              <!-- Group Header -->
              <div class="sticky top-0 z-10 px-2 py-1 bg-gradient-to-r from-blue-50/95 via-sky-50/90 to-slate-100/90 dark:from-slate-800/95 dark:via-slate-800/90 dark:to-slate-900/90 backdrop-blur-md rounded flex items-center justify-between border-l-[3px] border-l-syno-blue border border-blue-200/70 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs mb-1">
                <span class="text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-tight">{{ group.label }}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-syno-blue text-white shadow-2xs shrink-0">
                  {{ group.notes.length }} {{ t('sidebar.noteCountSuffix') }}
                </span>
              </div>

              <!-- Note Cards (支持右键上下文菜单) -->
              <div
                v-for="note in group.notes"
                :key="note.object_id"
                @click="noteStore.selectNote(note.object_id)"
                @contextmenu.prevent="openNoteContextMenu($event, note)"
                :class="[
                  'group relative p-2 rounded-lg cursor-pointer transition border',
                  noteStore.activeNoteId === note.object_id
                    ? 'bg-slate-800 dark:bg-blue-950/60 border-slate-700 dark:border-sky-500 shadow-md text-white'
                    : 'bg-white/70 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                ]"
              >
                <div class="flex items-start justify-between">
                  <h4
                    class="text-xs font-semibold truncate flex-1 pr-1 flex items-center gap-1.5 min-w-0"
                    :class="noteStore.activeNoteId === note.object_id ? 'text-white' : 'text-slate-800 dark:text-slate-200'"
                  >
                    <!-- Loading Spinner (便签内容加载中) -->
                    <svg
                      v-if="noteStore.isLoadingNote && noteStore.activeNoteId === note.object_id"
                      class="animate-spin w-3.5 h-3.5 shrink-0"
                      :class="noteStore.activeNoteId === note.object_id ? 'text-sky-300' : 'text-syno-blue'"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>

                    <!-- Favorite Icon (已收藏图标) -->
                    <svg
                      v-if="noteStore.isFavorite(note.object_id)"
                      class="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      :title="t('sidebar.addToFavorites')"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>

                    <!-- Share Icon (已共享图标) -->
                    <svg
                      v-if="isNoteShared(note)"
                      class="w-3.5 h-3.5 shrink-0"
                      :class="noteStore.activeNoteId === note.object_id ? 'text-sky-300' : 'text-syno-blue'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      :title="t('editor.sharedBadge')"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>

                    <span class="truncate">{{ note.title || t('editor.untitledNote') }}</span>
                  </h4>

                  <!-- Note Menu Button (点击显示操作下拉菜单) -->
                  <button
                    @click.stop="openNoteMenuFromButton($event, note)"
                    class="opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded transition cursor-pointer shrink-0"
                    :class="[
                      noteStore.activeNoteId === note.object_id
                        ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200',
                      noteContextMenu.isOpen && noteContextMenu.targetNote?.object_id === note.object_id
                        ? (noteStore.activeNoteId === note.object_id ? '!opacity-100 bg-slate-700 text-white' : '!opacity-100 bg-slate-200 text-slate-700')
                        : ''
                    ]"
                    :title="t('common.actions')"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01" />
                    </svg>
                  </button>
                </div>

                <!-- Tags List on Note Item Card -->
                <div v-if="note.tag && note.tag.length > 0" class="flex items-center flex-wrap gap-1 mt-1">
                  <span
                    v-for="t in note.tag"
                    :key="t"
                    class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium leading-none max-w-[100px] truncate"
                    :class="noteStore.activeNoteId === note.object_id ? 'bg-slate-700/80 text-blue-200 border border-slate-600' : 'bg-blue-50 text-syno-blue border border-blue-100'"
                    :title="t"
                  >
                    <span class="mr-0.5" :class="noteStore.activeNoteId === note.object_id ? 'text-blue-300' : 'text-blue-400'">#</span>
                    <span class="truncate">{{ t }}</span>
                  </span>
                </div>

                <!-- Time & Meta -->
                <div class="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>{{ formatTime(note.mtime || note.ctime) }}</span>
                  <span v-if="note.tag && note.tag.length > 0">
                    {{ note.tag.length }} {{ t('sidebar.tags') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. "共享便签" Accordion Panel (展开时独占显示，收起时与其他笔记本并列显示) -->
      <div
        v-if="noteStore.notebooks.length > 0"
        v-show="!expandedNotebookId || expandedNotebookId === '__shared_notes__'"
        :class="[
          'border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden bg-white/60 dark:bg-slate-900/60 shadow-2xs transition',
          expandedNotebookId === '__shared_notes__' ? 'flex-1 flex flex-col min-h-0' : 'shrink-0'
        ]"
      >
        <!-- "共享便签" Accordion Header -->
        <div
          @click="toggleAccordion('__shared_notes__')"
          :class="[
            'group flex items-center justify-between px-2.5 py-2 text-xs cursor-pointer transition select-none shrink-0',
            expandedNotebookId === '__shared_notes__'
              ? 'bg-blue-50/90 dark:bg-blue-950/40 text-syno-blue dark:text-sky-400 font-semibold border-b border-blue-100 dark:border-blue-900/40'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          ]"
        >
          <div class="flex items-center space-x-1.5 truncate flex-1 min-w-0 pr-1">
            <!-- Chevron arrow indicator -->
            <svg
              :class="[
                'w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0',
                expandedNotebookId === '__shared_notes__' ? 'transform rotate-90 text-syno-blue dark:text-sky-400' : ''
              ]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>

            <!-- Shared Notes Icon -->
            <svg
              class="w-3.5 h-3.5 shrink-0"
              :class="expandedNotebookId === '__shared_notes__' ? 'text-syno-blue' : 'text-slate-400'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>

            <span class="truncate">{{ t('sidebar.sharedNotes') }}</span>
          </div>

          <span
            :class="[
              'text-[10px] px-1.5 py-0.2 rounded-full font-normal shrink-0',
              expandedNotebookId === '__shared_notes__' ? 'bg-syno-blue text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            ]"
          >
            {{ sharedNotesCount }}
          </span>
        </div>

        <!-- "共享便签" Accordion Content -->
        <div v-if="expandedNotebookId === '__shared_notes__'" class="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
          <!-- Dedicated Search Bar Row inside Accordion -->
          <div class="p-2 border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
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
                :placeholder="t('sidebar.searchPlaceholder')"
                class="w-full pl-8 pr-7 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs transition"
              />
              <button
                v-if="noteStore.searchQuery"
                @click="noteStore.searchQuery = ''"
                class="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
                :title="t('sidebar.clearSearch')"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Tag Dropdown Multi-Select Row inside Accordion -->
          <div v-if="panelTags.length > 0" class="px-2 py-1.5 border-b border-slate-200/60 bg-slate-100/50 relative shrink-0">
            <div class="flex items-center justify-between">
              <!-- Dropdown Trigger Button -->
              <button
                type="button"
                @click.stop="isTagDropdownOpen = !isTagDropdownOpen"
                :class="[
                  'flex-1 flex items-center justify-between px-2 py-1 text-xs rounded border transition cursor-pointer text-left',
                  noteStore.selectedTags.length > 0
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-syno-blue/40 dark:border-sky-500/40 text-syno-blue dark:text-sky-400 font-medium'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                ]"
              >
                <div class="flex items-center space-x-1.5 truncate mr-1">
                  <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span class="truncate">
                    <template v-if="noteStore.selectedTags.length === 0">
                      {{ t('sidebar.filterByTag') }} ({{ panelTags.length }})
                    </template>
                    <template v-else>
                      {{ t('sidebar.selectedTagsCount', { count: noteStore.selectedTags.length }) }}: {{ noteStore.selectedTags.map(t => '#' + t).join(', ') }}
                    </template>
                  </span>
                </div>

                <div class="flex items-center space-x-1 shrink-0">
                  <span
                    v-if="noteStore.selectedTags.length > 0"
                    class="text-[10px] px-1.5 py-0.2 rounded-full bg-syno-blue text-white font-semibold"
                  >
                    {{ noteStore.selectedTags.length }}
                  </span>
                  <svg
                    :class="['w-3.5 h-3.5 text-slate-400 transition-transform duration-150', isTagDropdownOpen ? 'transform rotate-180' : '']"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <!-- Clear Tags Button -->
              <button
                v-if="noteStore.selectedTags.length > 0"
                @click.stop="noteStore.clearTags()"
                class="ml-1 px-1.5 py-1 text-[11px] text-slate-400 hover:text-rose-500 rounded hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                :title="t('sidebar.clearTags')"
              >
                {{ t('common.clear') }}
              </button>
            </div>

            <!-- Dropdown Floating Panel -->
            <div
              v-if="isTagDropdownOpen"
              @click.stop
              class="absolute left-2 right-2 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg p-1.5 max-h-56 overflow-y-auto space-y-0.5 animate-in fade-in duration-100"
            >
              <div class="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between mb-1">
                <span>{{ t('sidebar.filterByTag') }}</span>
                <button
                  v-if="noteStore.selectedTags.length > 0"
                  @click="noteStore.clearTags()"
                  class="text-syno-blue hover:underline cursor-pointer"
                >
                  {{ t('sidebar.clearTags') }}
                </button>
              </div>

              <label
                v-for="tagItem in panelTags"
                :key="tagItem.name"
                class="flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition select-none"
              >
                <div class="flex items-center space-x-2 truncate flex-1 pr-1">
                  <input
                    type="checkbox"
                    :checked="noteStore.selectedTags.includes(tagItem.name)"
                    @change="noteStore.toggleTag(tagItem.name)"
                    class="rounded text-syno-blue dark:text-sky-400 focus:ring-syno-blue w-3.5 h-3.5 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                  />
                  <span class="truncate text-slate-700 dark:text-slate-200"># {{ tagItem.name }}</span>
                </div>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono">
                  {{ tagItem.count }}
                </span>
              </label>
            </div>
          </div>

          <!-- Panel Action Bar: Note Count & New Note Button -->
          <div class="px-2.5 py-1.5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 shrink-0">
            <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {{ t('sidebar.notesList') }} ({{ noteStore.filteredNotes.length }})
            </span>
            <button
              @click="handleCreateNoteInPanel('__shared_notes__')"
              :disabled="noteStore.isCreating"
              class="h-6 px-2 bg-syno-blue hover:bg-blue-600 text-white rounded text-[11px] flex items-center shadow-2xs transition disabled:opacity-50 cursor-pointer"
              :title="t('sidebar.newNote')"
            >
              <svg v-if="noteStore.isCreating" class="animate-spin -ml-0.5 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <svg v-else class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>{{ noteStore.isCreating ? t('sidebar.creating') : t('sidebar.newNote') }}</span>
            </button>
          </div>

          <!-- Note Items Container with Year-Month Grouping -->
          <div class="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
            <!-- Loading indicator during note creation -->
            <div
              v-if="noteStore.isCreating"
              class="p-2 rounded-lg border border-syno-blue/40 bg-blue-50/50 animate-pulse flex items-center space-x-2 text-xs text-syno-blue"
            >
              <svg class="animate-spin h-3.5 w-3.5 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span class="font-medium">{{ t('sidebar.creatingNoteTip') }}</span>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="groupedNotes.length === 0"
              class="text-center py-8 text-xs text-slate-400"
            >
              {{ noteStore.searchQuery || noteStore.selectedTags.length > 0 ? t('sidebar.emptyNotes') : t('sidebar.noShared') }}
            </div>

            <!-- Month Groups -->
            <div
              v-for="group in groupedNotes"
              :key="group.key"
              class="space-y-1"
            >
              <!-- Group Header -->
              <div class="sticky top-0 z-10 px-2 py-1 bg-gradient-to-r from-blue-50/95 via-sky-50/90 to-slate-100/90 dark:from-slate-800/95 dark:via-slate-800/90 dark:to-slate-900/90 backdrop-blur-md rounded flex items-center justify-between border-l-[3px] border-l-syno-blue border border-blue-200/70 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs mb-1">
                <span class="text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-tight">{{ group.label }}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-syno-blue text-white shadow-2xs shrink-0">
                  {{ group.notes.length }} {{ t('sidebar.noteCountSuffix') }}
                </span>
              </div>

              <!-- Note Cards (支持右键上下文菜单) -->
              <div
                v-for="note in group.notes"
                :key="note.object_id"
                @click="noteStore.selectNote(note.object_id)"
                @contextmenu.prevent="openNoteContextMenu($event, note)"
                :class="[
                  'group relative p-2 rounded-lg cursor-pointer transition border',
                  noteStore.activeNoteId === note.object_id
                    ? 'bg-slate-800 dark:bg-blue-950/60 border-slate-700 dark:border-sky-500 shadow-md text-white'
                    : 'bg-white/70 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                ]"
              >
                <div class="flex items-start justify-between">
                  <h4
                    class="text-xs font-semibold truncate flex-1 pr-1 flex items-center gap-1.5 min-w-0"
                    :class="noteStore.activeNoteId === note.object_id ? 'text-white' : 'text-slate-800 dark:text-slate-200'"
                  >
                    <!-- Loading Spinner (便签内容加载中) -->
                    <svg
                      v-if="noteStore.isLoadingNote && noteStore.activeNoteId === note.object_id"
                      class="animate-spin w-3.5 h-3.5 shrink-0"
                      :class="noteStore.activeNoteId === note.object_id ? 'text-sky-300' : 'text-syno-blue'"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>

                    <!-- Favorite Icon (已收藏图标) -->
                    <svg
                      v-if="noteStore.isFavorite(note.object_id)"
                      class="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      :title="t('sidebar.addToFavorites')"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>

                    <!-- Share Icon (已共享图标) -->
                    <svg
                      v-if="isNoteShared(note)"
                      class="w-3.5 h-3.5 shrink-0"
                      :class="noteStore.activeNoteId === note.object_id ? 'text-sky-300' : 'text-syno-blue'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      :title="t('editor.sharedBadge')"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>

                    <span class="truncate">{{ note.title || t('editor.untitledNote') }}</span>
                  </h4>

                  <!-- Note Menu Button (点击显示操作下拉菜单) -->
                  <button
                    @click.stop="openNoteMenuFromButton($event, note)"
                    class="opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded transition cursor-pointer shrink-0"
                    :class="[
                      noteStore.activeNoteId === note.object_id
                        ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200',
                      noteContextMenu.isOpen && noteContextMenu.targetNote?.object_id === note.object_id
                        ? (noteStore.activeNoteId === note.object_id ? '!opacity-100 bg-slate-700 text-white' : '!opacity-100 bg-slate-200 text-slate-700')
                        : ''
                    ]"
                    :title="t('common.actions')"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01" />
                    </svg>
                  </button>
                </div>

                <!-- Tags List on Note Item Card -->
                <div v-if="note.tag && note.tag.length > 0" class="flex items-center flex-wrap gap-1 mt-1">
                  <span
                    v-for="t in note.tag"
                    :key="t"
                    class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium leading-none max-w-[100px] truncate"
                    :class="noteStore.activeNoteId === note.object_id ? 'bg-slate-700/80 text-blue-200 border border-slate-600' : 'bg-blue-50 text-syno-blue border border-blue-100'"
                    :title="t"
                  >
                    <span class="mr-0.5" :class="noteStore.activeNoteId === note.object_id ? 'text-blue-300' : 'text-blue-400'">#</span>
                    <span class="truncate">{{ t }}</span>
                  </span>
                </div>

                <!-- Time & Meta -->
                <div class="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>{{ formatTime(note.mtime || note.ctime) }}</span>
                  <span v-if="note.tag && note.tag.length > 0">
                    {{ note.tag.length }} {{ t('sidebar.tags') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. "回收站" Accordion Panel (展开时独占显示，收起时与其他笔记本并列显示) -->
      <div
        v-if="noteStore.notebooks.length > 0"
        v-show="!expandedNotebookId || expandedNotebookId === '__recycle_bin__'"
        :class="[
          'border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden bg-white/60 dark:bg-slate-900/60 shadow-2xs transition',
          expandedNotebookId === '__recycle_bin__' ? 'flex-1 flex flex-col min-h-0' : 'shrink-0'
        ]"
      >
        <!-- "回收站" Accordion Header -->
        <div
          @click="toggleAccordion('__recycle_bin__')"
          :class="[
            'group flex items-center justify-between px-2.5 py-2 text-xs cursor-pointer transition select-none shrink-0',
            expandedNotebookId === '__recycle_bin__'
              ? 'bg-blue-50/90 dark:bg-blue-950/40 text-syno-blue dark:text-sky-400 font-semibold border-b border-blue-100 dark:border-blue-900/40'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          ]"
        >
          <div class="flex items-center space-x-1.5 truncate flex-1 min-w-0 pr-1">
            <!-- Chevron arrow indicator -->
            <svg
              :class="[
                'w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0',
                expandedNotebookId === '__recycle_bin__' ? 'transform rotate-90 text-syno-blue dark:text-sky-400' : ''
              ]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>

            <!-- Trash Can Icon -->
            <svg
              class="w-3.5 h-3.5 shrink-0"
              :class="expandedNotebookId === '__recycle_bin__' ? 'text-syno-blue' : 'text-slate-400'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>

            <span class="truncate">{{ t('sidebar.recycleBin') }}</span>
          </div>

          <span
            :class="[
              'text-[10px] px-1.5 py-0.2 rounded-full font-normal shrink-0',
              expandedNotebookId === '__recycle_bin__' ? 'bg-syno-blue text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            ]"
          >
            {{ noteStore.recycledNotes.length }}
          </span>
        </div>

        <!-- "回收站" Accordion Content -->
        <div v-if="expandedNotebookId === '__recycle_bin__'" class="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
          <!-- Dedicated Search Bar Row inside Accordion -->
          <div class="p-2 border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
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
                :placeholder="t('sidebar.searchPlaceholder')"
                class="w-full pl-8 pr-7 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs transition"
              />
              <button
                v-if="noteStore.searchQuery"
                @click="noteStore.searchQuery = ''"
                class="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
                :title="t('sidebar.clearSearch')"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Tag Dropdown Multi-Select Row inside Accordion -->
          <div v-if="panelTags.length > 0" class="px-2 py-1.5 border-b border-slate-200/60 bg-slate-100/50 relative shrink-0">
            <div class="flex items-center justify-between">
              <!-- Dropdown Trigger Button -->
              <button
                type="button"
                @click.stop="isTagDropdownOpen = !isTagDropdownOpen"
                :class="[
                  'flex-1 flex items-center justify-between px-2 py-1 text-xs rounded border transition cursor-pointer text-left',
                  noteStore.selectedTags.length > 0
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-syno-blue/40 dark:border-sky-500/40 text-syno-blue dark:text-sky-400 font-medium'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                ]"
              >
                <div class="flex items-center space-x-1.5 truncate mr-1">
                  <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span class="truncate">
                    <template v-if="noteStore.selectedTags.length === 0">
                      {{ t('sidebar.filterByTag') }} ({{ panelTags.length }})
                    </template>
                    <template v-else>
                      {{ t('sidebar.selectedTagsCount', { count: noteStore.selectedTags.length }) }}: {{ noteStore.selectedTags.map(t => '#' + t).join(', ') }}
                    </template>
                  </span>
                </div>

                <div class="flex items-center space-x-1 shrink-0">
                  <span
                    v-if="noteStore.selectedTags.length > 0"
                    class="text-[10px] px-1.5 py-0.2 rounded-full bg-syno-blue text-white font-semibold"
                  >
                    {{ noteStore.selectedTags.length }}
                  </span>
                  <svg
                    :class="['w-3.5 h-3.5 text-slate-400 transition-transform duration-150', isTagDropdownOpen ? 'transform rotate-180' : '']"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <!-- Clear Tags Button -->
              <button
                v-if="noteStore.selectedTags.length > 0"
                @click.stop="noteStore.clearTags()"
                class="ml-1 px-1.5 py-1 text-[11px] text-slate-400 hover:text-rose-500 rounded hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                :title="t('sidebar.clearTags')"
              >
                {{ t('common.clear') }}
              </button>
            </div>

            <!-- Dropdown Floating Panel -->
            <div
              v-if="isTagDropdownOpen"
              @click.stop
              class="absolute left-2 right-2 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg p-1.5 max-h-56 overflow-y-auto space-y-0.5 animate-in fade-in duration-100"
            >
              <div class="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between mb-1">
                <span>{{ t('sidebar.filterByTag') }}</span>
                <button
                  v-if="noteStore.selectedTags.length > 0"
                  @click="noteStore.clearTags()"
                  class="text-syno-blue hover:underline cursor-pointer"
                >
                  {{ t('sidebar.clearTags') }}
                </button>
              </div>

              <label
                v-for="tagItem in panelTags"
                :key="tagItem.name"
                class="flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition select-none"
              >
                <div class="flex items-center space-x-2 truncate flex-1 pr-1">
                  <input
                    type="checkbox"
                    :checked="noteStore.selectedTags.includes(tagItem.name)"
                    @change="noteStore.toggleTag(tagItem.name)"
                    class="rounded text-syno-blue dark:text-sky-400 focus:ring-syno-blue w-3.5 h-3.5 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                  />
                  <span class="truncate text-slate-700 dark:text-slate-200"># {{ tagItem.name }}</span>
                </div>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono">
                  {{ tagItem.count }}
                </span>
              </label>
            </div>
          </div>

          <!-- Panel Action Bar: Note Count Only (No New Note button in Recycle Bin) -->
          <div class="px-2.5 py-1.5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 shrink-0">
            <span class="font-medium text-slate-700 dark:text-slate-300">{{ t('sidebar.notesList') }} ({{ noteStore.filteredNotes.length }})</span>
            <span class="text-[11px] text-slate-400 dark:text-slate-500">{{ t('sidebar.recycledNotes') }}</span>
          </div>

          <!-- Notes Scrollable List inside Accordion Panel -->
          <div class="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0 bg-white">
            <div v-if="noteStore.isLoading" class="p-6 text-center text-xs text-slate-400">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-syno-blue inline-block" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              {{ t('common.loading') }}
            </div>
            <div v-else-if="noteStore.filteredNotes.length === 0" class="p-8 text-center text-xs text-slate-400">
              <svg class="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{{ t('sidebar.emptyRecycleBin') }}</span>
            </div>
            <div v-else>
              <div
                v-for="note in noteStore.filteredNotes"
                :key="note.object_id"
                @click="noteStore.selectNote(note.object_id)"
                @contextmenu.prevent="openNoteContextMenu($event, note)"
                :class="[
                  'group p-2.5 transition cursor-pointer select-none border-l-2',
                  noteStore.activeNoteId === note.object_id
                    ? 'bg-slate-800 text-white border-syno-blue shadow-xs'
                    : 'border-transparent hover:bg-slate-50 text-slate-800'
                ]"
              >
                <!-- Title Row & Menu Button -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-1.5 flex-1 min-w-0 pr-1">
                    <!-- Loading Spinner (便签内容加载中) -->
                    <svg
                      v-if="noteStore.isLoadingNote && noteStore.activeNoteId === note.object_id"
                      class="animate-spin w-3.5 h-3.5 shrink-0"
                      :class="noteStore.activeNoteId === note.object_id ? 'text-blue-300' : 'text-syno-blue'"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>

                    <!-- Favorite Icon (已收藏图标) -->
                    <svg
                      v-if="noteStore.isFavorite(note.object_id)"
                      class="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      :title="t('sidebar.addToFavorites')"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>

                    <svg
                      v-if="isNoteShared(note)"
                      class="w-3.5 h-3.5 shrink-0"
                      :class="noteStore.activeNoteId === note.object_id ? 'text-blue-300' : 'text-syno-blue'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      :title="t('editor.sharedBadge')"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>

                    <h4
                      :class="[
                        'text-xs font-semibold truncate',
                        noteStore.activeNoteId === note.object_id ? 'text-white' : 'text-slate-800'
                      ]"
                    >
                      {{ note.title || t('editor.untitledNote') }}
                    </h4>
                  </div>

                  <!-- Note Actions Menu Trigger Button -->
                  <button
                    @click.stop="openNoteMenuFromButton($event, note)"
                    :class="[
                      'p-1 rounded transition cursor-pointer shrink-0 opacity-0 group-hover:opacity-100',
                      noteStore.activeNoteId === note.object_id
                        ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200',
                      noteContextMenu.isOpen && noteContextMenu.targetNote?.object_id === note.object_id
                        ? (noteStore.activeNoteId === note.object_id ? '!opacity-100 bg-slate-700 text-white' : '!opacity-100 bg-slate-200 text-slate-700')
                        : ''
                    ]"
                    :title="t('common.actions')"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01" />
                    </svg>
                  </button>
                </div>

                <!-- Tags List on Note Item Card -->
                <div v-if="note.tag && note.tag.length > 0" class="flex items-center flex-wrap gap-1 mt-1">
                  <span
                    v-for="t in note.tag"
                    :key="t"
                    class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium leading-none max-w-[100px] truncate"
                    :class="noteStore.activeNoteId === note.object_id ? 'bg-slate-700/80 text-blue-200 border border-slate-600' : 'bg-blue-50 text-syno-blue border border-blue-100'"
                    :title="t"
                  >
                    <span class="mr-0.5" :class="noteStore.activeNoteId === note.object_id ? 'text-blue-300' : 'text-blue-400'">#</span>
                    <span class="truncate">{{ t }}</span>
                  </span>
                </div>

                <!-- Time & Meta -->
                <div class="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>{{ formatTime(note.mtime || note.ctime) }}</span>
                  <span v-if="note.tag && note.tag.length > 0">
                    {{ note.tag.length }} {{ t('sidebar.tags') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Notebooks Accordion Panels (展开时独占显示，隐藏其他笔记本；收起时全部恢复显示) -->
      <div
        v-for="nb in noteStore.notebooks"
        :key="nb.object_id"
        v-show="!expandedNotebookId || expandedNotebookId === nb.object_id"
        :class="[
          'border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden bg-white/60 dark:bg-slate-900/60 shadow-2xs transition',
          expandedNotebookId === nb.object_id ? 'flex-1 flex flex-col min-h-0' : 'shrink-0'
        ]"
      >
        <!-- Notebook Accordion Header -->
        <div
          @click="toggleAccordion(nb.object_id)"
          @contextmenu.prevent="openContextMenu($event, nb)"
          :class="[
            'group flex items-center justify-between px-2.5 py-2 text-xs cursor-pointer transition select-none shrink-0',
            expandedNotebookId === nb.object_id
              ? 'bg-blue-50/90 dark:bg-blue-950/40 text-syno-blue dark:text-sky-400 font-semibold border-b border-blue-100 dark:border-blue-900/40'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          ]"
        >
          <div class="flex items-center space-x-1.5 truncate flex-1 min-w-0 pr-1">
            <!-- Chevron arrow indicator -->
            <svg
              :class="[
                'w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0',
                expandedNotebookId === nb.object_id ? 'transform rotate-90 text-syno-blue dark:text-sky-400' : ''
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

            <span class="truncate" :title="nb.title || t('sidebar.notebooks')">{{ nb.title || t('sidebar.notebooks') }}</span>
          </div>

          <div class="flex items-center space-x-1 shrink-0">
            <!-- Action Buttons (Hover) -->
            <!-- Rename notebook button -->
            <button
              @click.stop="openRenameModal(nb)"
              class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              :title="t('sidebar.editNotebook')"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            <!-- Export Notebook as Zip -->
            <button
              @click.stop="handleExportNotebook(nb)"
              class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              :title="t('sidebar.exportZip')"
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
              :title="t('sidebar.deleteNotebookTitle')"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <!-- Note count badge (放在操作按钮后面，统一靠右整齐对齐) -->
            <span
              :class="[
                'text-[10px] px-1.5 py-0.2 rounded-full font-normal shrink-0 ml-0.5',
                expandedNotebookId === nb.object_id ? 'bg-syno-blue text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              ]"
            >
              {{ noteStore.getNotebookNoteCount(nb) }}
            </span>
          </div>
        </div>

        <!-- Notebook Accordion Content (Only expanded for this notebook) -->
        <div v-if="expandedNotebookId === nb.object_id" class="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
          <!-- Dedicated Search Bar Row inside this Notebook's Accordion -->
          <div class="p-2 border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
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
                :placeholder="t('sidebar.searchPlaceholder')"
                class="w-full pl-8 pr-7 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-syno-blue focus:border-syno-blue placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs transition"
              />
              <button
                v-if="noteStore.searchQuery"
                @click="noteStore.searchQuery = ''"
                class="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
                :title="t('sidebar.clearSearch')"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Tag Dropdown Multi-Select Row inside this Notebook -->
          <div v-if="panelTags.length > 0" class="px-2 py-1.5 border-b border-slate-200/60 bg-slate-100/50 relative shrink-0">
            <div class="flex items-center justify-between">
              <!-- Dropdown Trigger Button -->
              <button
                type="button"
                @click.stop="isTagDropdownOpen = !isTagDropdownOpen"
                :class="[
                  'flex-1 flex items-center justify-between px-2 py-1 text-xs rounded border transition cursor-pointer text-left',
                  noteStore.selectedTags.length > 0
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-syno-blue/40 dark:border-sky-500/40 text-syno-blue dark:text-sky-400 font-medium'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                ]"
              >
                <div class="flex items-center space-x-1.5 truncate mr-1">
                  <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span class="truncate">
                    <template v-if="noteStore.selectedTags.length === 0">
                      {{ t('sidebar.filterByTag') }} ({{ panelTags.length }})
                    </template>
                    <template v-else>
                      {{ t('sidebar.selectedTagsCount', { count: noteStore.selectedTags.length }) }}: {{ noteStore.selectedTags.map(t => '#' + t).join(', ') }}
                    </template>
                  </span>
                </div>

                <div class="flex items-center space-x-1 shrink-0">
                  <span
                    v-if="noteStore.selectedTags.length > 0"
                    class="text-[10px] px-1.5 py-0.2 rounded-full bg-syno-blue text-white font-semibold"
                  >
                    {{ noteStore.selectedTags.length }}
                  </span>
                  <svg
                    :class="['w-3.5 h-3.5 text-slate-400 transition-transform duration-150', isTagDropdownOpen ? 'transform rotate-180' : '']"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <!-- Clear Tags Button -->
              <button
                v-if="noteStore.selectedTags.length > 0"
                @click.stop="noteStore.clearTags()"
                class="ml-1 px-1.5 py-1 text-[11px] text-slate-400 hover:text-rose-500 rounded hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                :title="t('sidebar.clearTags')"
              >
                {{ t('common.clear') }}
              </button>
            </div>

            <!-- Dropdown Floating Panel -->
            <div
              v-if="isTagDropdownOpen"
              @click.stop
              class="absolute left-2 right-2 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg p-1.5 max-h-56 overflow-y-auto space-y-0.5 animate-in fade-in duration-100"
            >
              <div class="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between mb-1">
                <span>{{ t('sidebar.filterByTag') }}</span>
                <button
                  v-if="noteStore.selectedTags.length > 0"
                  @click="noteStore.clearTags()"
                  class="text-syno-blue hover:underline cursor-pointer"
                >
                  {{ t('sidebar.clearTags') }}
                </button>
              </div>

              <label
                v-for="tagItem in panelTags"
                :key="tagItem.name"
                class="flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition select-none"
              >
                <div class="flex items-center space-x-2 truncate flex-1 pr-1">
                  <input
                    type="checkbox"
                    :checked="noteStore.selectedTags.includes(tagItem.name)"
                    @change="noteStore.toggleTag(tagItem.name)"
                    class="rounded text-syno-blue dark:text-sky-400 focus:ring-syno-blue w-3.5 h-3.5 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                  />
                  <span class="truncate text-slate-700 dark:text-slate-200"># {{ tagItem.name }}</span>
                </div>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono">
                  {{ tagItem.count }}
                </span>
              </label>
            </div>
          </div>

          <!-- Panel Action Bar: Note Count & New Note Button -->
          <div class="px-2.5 py-1.5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 shrink-0">
            <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {{ t('sidebar.notesList') }} ({{ noteStore.filteredNotes.length }})
            </span>
            <button
              @click="handleCreateNoteInPanel(nb.object_id)"
              :disabled="noteStore.isCreating"
              class="h-6 px-2 bg-syno-blue hover:bg-blue-600 text-white rounded text-[11px] flex items-center shadow-2xs transition disabled:opacity-50 cursor-pointer"
              :title="t('sidebar.newNote')"
            >
              <svg v-if="noteStore.isCreating" class="animate-spin -ml-0.5 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <svg v-else class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>{{ noteStore.isCreating ? t('sidebar.creating') : t('sidebar.newNote') }}</span>
            </button>
          </div>

          <!-- Note Items Container with Year-Month Grouping (滚动条仅在内部展示) -->
          <div class="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
            <!-- Loading indicator during note creation -->
            <div
              v-if="noteStore.isCreating"
              class="p-2 rounded-lg border border-syno-blue/40 bg-blue-50/50 animate-pulse flex items-center space-x-2 text-xs text-syno-blue"
            >
              <svg class="animate-spin h-3.5 w-3.5 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span class="font-medium">{{ t('sidebar.creatingNoteTip') }}</span>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="groupedNotes.length === 0"
              class="text-center py-8 text-xs text-slate-400"
            >
              {{ noteStore.searchQuery || noteStore.selectedTags.length > 0 ? t('sidebar.emptyNotes') : t('sidebar.noNotes') }}
            </div>

            <!-- Month Groups -->
            <div
              v-for="group in groupedNotes"
              :key="group.key"
              class="space-y-1"
            >
              <!-- Group Header -->
              <div class="sticky top-0 z-10 px-2 py-1 bg-gradient-to-r from-blue-50/95 via-sky-50/90 to-slate-100/90 dark:from-slate-800/95 dark:via-slate-800/90 dark:to-slate-900/90 backdrop-blur-md rounded flex items-center justify-between border-l-[3px] border-l-syno-blue border border-blue-200/70 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs mb-1">
                <span class="text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-tight">{{ group.label }}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-syno-blue text-white shadow-2xs shrink-0">
                  {{ group.notes.length }} {{ t('sidebar.noteCountSuffix') }}
                </span>
              </div>

              <!-- Note Cards (支持右键上下文菜单) -->
              <div
                v-for="note in group.notes"
                :key="note.object_id"
                @click="noteStore.selectNote(note.object_id)"
                @contextmenu.prevent="openNoteContextMenu($event, note)"
                :class="[
                  'group relative p-2 rounded-lg cursor-pointer transition border',
                  noteStore.activeNoteId === note.object_id
                    ? 'bg-slate-800 dark:bg-blue-950/60 border-slate-700 dark:border-sky-500 shadow-md text-white'
                    : 'bg-white/70 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                ]"
              >
                <div class="flex items-start justify-between">
                  <h4
                    class="text-xs font-semibold truncate flex-1 pr-1 flex items-center gap-1.5 min-w-0"
                    :class="noteStore.activeNoteId === note.object_id ? 'text-white' : 'text-slate-800 dark:text-slate-200'"
                  >
                    <!-- Loading Spinner (便签内容加载中) -->
                    <svg
                      v-if="noteStore.isLoadingNote && noteStore.activeNoteId === note.object_id"
                      class="animate-spin w-3.5 h-3.5 shrink-0"
                      :class="noteStore.activeNoteId === note.object_id ? 'text-sky-300' : 'text-syno-blue'"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>

                    <!-- Favorite Icon (已收藏图标) -->
                    <svg
                      v-if="noteStore.isFavorite(note.object_id)"
                      class="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      :title="t('sidebar.addToFavorites')"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>

                    <!-- Share Icon (已共享图标) -->
                    <svg
                      v-if="isNoteShared(note)"
                      class="w-3.5 h-3.5 shrink-0"
                      :class="noteStore.activeNoteId === note.object_id ? 'text-sky-300' : 'text-syno-blue'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      :title="t('editor.sharedBadge')"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>

                    <span class="truncate">{{ note.title || t('editor.untitledNote') }}</span>
                  </h4>

                  <!-- Note Menu Button (点击显示操作下拉菜单) -->
                  <button
                    @click.stop="openNoteMenuFromButton($event, note)"
                    class="opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded transition cursor-pointer shrink-0"
                    :class="[
                      noteStore.activeNoteId === note.object_id
                        ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200',
                      noteContextMenu.isOpen && noteContextMenu.targetNote?.object_id === note.object_id
                        ? (noteStore.activeNoteId === note.object_id ? '!opacity-100 bg-slate-700 text-white' : '!opacity-100 bg-slate-200 text-slate-700')
                        : ''
                    ]"
                    :title="t('common.actions')"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01" />
                    </svg>
                  </button>
                </div>

                <!-- Tags List on Note Item Card -->
                <div v-if="note.tag && note.tag.length > 0" class="flex items-center flex-wrap gap-1 mt-1">
                  <span
                    v-for="t in note.tag"
                    :key="t"
                    class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium leading-none max-w-[100px] truncate"
                    :class="noteStore.activeNoteId === note.object_id ? 'bg-slate-700/80 text-blue-200 border border-slate-600' : 'bg-blue-50 text-syno-blue border border-blue-100'"
                    :title="t"
                  >
                    <span class="mr-0.5" :class="noteStore.activeNoteId === note.object_id ? 'text-blue-300' : 'text-blue-400'">#</span>
                    <span class="truncate">{{ t }}</span>
                  </span>
                </div>

                <!-- Time & Meta -->
                <div class="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>{{ formatTime(note.mtime || note.ctime) }}</span>
                  <span v-if="note.tag && note.tag.length > 0">
                    {{ note.tag.length }} {{ t('sidebar.tags') }}
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
      class="fixed z-50 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg py-1.5 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in duration-100"
    >
      <div class="px-3 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-700 truncate mb-1">
        {{ contextMenu.targetNotebook?.title }}
      </div>

      <button
        @click="triggerContextRename"
        class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
      >
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span>{{ t('sidebar.editNotebook') }}</span>
      </button>

      <button
        @click="triggerContextExport"
        class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
      >
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>{{ t('sidebar.exportZip') }}</span>
      </button>

      <div class="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>

      <button
        v-if="!contextMenu.targetNotebook?.preset && noteStore.notebooks.length > 1"
        @click="triggerContextDelete"
        class="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center space-x-2 transition cursor-pointer"
      >
        <svg class="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>{{ t('sidebar.deleteNotebookTitle') }}</span>
      </button>
      <div v-else class="px-3 py-1 text-[11px] text-slate-400 italic">
        {{ t('sidebar.cannotDeletePreset') }}
      </div>
    </div>

    <!-- Right-Click Context Menu for Notes (便签项右键上下文菜单) -->
    <div
      v-if="noteContextMenu.isOpen"
      :style="{ top: `${noteContextMenu.y}px`, left: `${noteContextMenu.x}px` }"
      @click.stop
      class="fixed z-50 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg py-1.5 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in duration-100"
    >
      <div class="px-3 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-700 truncate mb-1">
        {{ noteContextMenu.targetNote?.title || t('editor.untitledNote') }}
      </div>

      <!-- 回收站中的便签操作：仅有“恢复”和“彻底删除” -->
      <template v-if="expandedNotebookId === '__recycle_bin__' || noteContextMenu.targetNote?.recycle">
        <!-- 1. 恢复 -->
        <button
          @click="triggerNoteRestore"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>{{ t('sidebar.restoreNote') }}</span>
        </button>

        <div class="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>

        <!-- 2. 彻底删除 -->
        <button
          @click="triggerNotePermanentDelete"
          class="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>{{ t('sidebar.permDelete') }}</span>
        </button>
      </template>

      <!-- 普通便签操作：复制, 加入收藏夹, 移动到.., 分享, 同步, 历史版本, 导出.md文件, 打印, 复制便签链接, 信息, 删除 -->
      <template v-else>
        <!-- 1. 复制 -->
        <button
          @click="triggerNoteCopy"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>{{ t('sidebar.copyNote') }}</span>
        </button>

        <!-- 2. 加入收藏夹 / 从收藏夹删除 -->
        <button
          @click="triggerNoteToggleFavorite"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg
            class="w-3.5 h-3.5"
            :class="noteContextMenu.targetNote && noteStore.isFavorite(noteContextMenu.targetNote.object_id) ? 'text-amber-500 fill-amber-400' : 'text-slate-400'"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>{{ noteContextMenu.targetNote && noteStore.isFavorite(noteContextMenu.targetNote.object_id) ? t('sidebar.removeFromFavorites') : t('sidebar.addToFavorites') }}</span>
        </button>

        <!-- 3. 移动到.. (Requirement 2) -->
        <button
          @click="triggerNoteMove"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>{{ t('sidebar.moveNoteTo') }}</span>
        </button>

        <!-- 4. 分享 -->
        <button
          @click="triggerNoteShare"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>{{ t('editor.shareManage') }}</span>
        </button>

        <!-- 5. 同步到其他NAS (跨NAS便签同步) -->
        <button
          @click="triggerNoteSync"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>{{ t('editor.syncToOtherServer') }}</span>
        </button>

        <!-- 6. 历史版本 -->
        <button
          @click="triggerNoteHistory"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ t('editor.historyVersions') }}</span>
        </button>

        <!-- 7. 导出.md文件 -->
        <button
          @click="triggerNoteExport"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>{{ t('editor.exportMd') }}</span>
        </button>

        <!-- 8. 打印 (Requirement 1) -->
        <button
          @click="triggerNotePrint"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>{{ t('sidebar.printNote') }}</span>
        </button>

        <!-- 9. 复制便签链接 (Requirement 1) -->
        <button
          @click="triggerNoteCopyLink"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>{{ t('sidebar.copyLink') }}</span>
        </button>

        <!-- 10. 信息 (Requirement 1) -->
        <button
          @click="triggerNoteInfo"
          class="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ t('sidebar.noteInfo') }}</span>
        </button>

        <div class="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>

        <!-- 11. 删除 -->
        <button
          @click="triggerNoteDelete"
          class="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center space-x-2 transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>{{ t('common.delete') }}</span>
        </button>
      </template>
    </div>

    <!-- Create / Rename Notebook Custom Modal -->
    <div
      v-if="notebookModal.isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      @click.self="closeNotebookModal"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div class="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center">
            <svg class="w-4 h-4 mr-1.5 text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {{ notebookModal.mode === 'create' ? t('sidebar.addNotebook') : t('sidebar.editNotebook') }}
          </h3>
          <button
            @click="closeNotebookModal"
            class="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="submitNotebookModal" class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t('sidebar.notebookName') }}</label>
            <input
              ref="titleInputRef"
              v-model="notebookModal.title"
              type="text"
              :placeholder="t('sidebar.notebookNamePlaceholder')"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
              required
            />
          </div>

          <div v-if="notebookModal.error" class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {{ notebookModal.error }}
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="closeNotebookModal"
              :disabled="notebookModal.loading"
              class="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="notebookModal.loading || !notebookModal.title.trim()"
              class="px-4 py-1.5 text-xs bg-syno-blue hover:bg-blue-600 text-white rounded-lg font-medium shadow-2xs transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg v-if="notebookModal.loading" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>{{ notebookModal.loading ? t('common.saving') : t('common.confirm') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Move Note Custom Modal (移动便签至其他笔记本) -->
    <div
      v-if="moveNoteModal.isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      @click.self="closeMoveNoteModal"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div class="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center">
            <svg class="w-4 h-4 mr-1.5 text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {{ t('sidebar.moveNoteTo') }}
          </h3>
          <button
            @click="closeMoveNoteModal"
            class="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="submitMoveNoteModal" class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{{ t('sidebar.currentNote') }}</label>
            <div class="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
              {{ moveNoteModal.targetNote?.title || t('editor.untitledNote') }}
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t('sidebar.selectTargetNotebook') }}</label>
            <select
              v-model="moveNoteModal.targetNotebookId"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue transition cursor-pointer"
              required
            >
              <option value="" disabled>{{ t('sidebar.pleaseSelectTarget') }}</option>
              <option
                v-for="nb in availableTargetNotebooks"
                :key="nb.object_id"
                :value="nb.object_id"
              >
                {{ nb.title || t('sidebar.notebooks') }} ({{ noteStore.getNotebookNoteCount(nb) }} {{ t('sidebar.noteCountSuffix') }})
              </option>
            </select>
          </div>

          <div v-if="moveNoteModal.error" class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {{ moveNoteModal.error }}
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="closeMoveNoteModal"
              :disabled="moveNoteModal.loading"
              class="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="moveNoteModal.loading || !moveNoteModal.targetNotebookId"
              class="px-4 py-1.5 text-xs bg-syno-blue hover:bg-blue-600 text-white rounded-lg font-medium shadow-2xs transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg v-if="moveNoteModal.loading" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>{{ moveNoteModal.loading ? t('sidebar.moving') : t('sidebar.confirmMove') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Notebook Confirmation Modal -->
    <div
      v-if="deleteModal.isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      @click.self="closeDeleteModal"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div class="p-5">
          <div class="flex items-start space-x-3">
            <div class="p-2 rounded-full bg-rose-100 text-rose-600 shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t('sidebar.deleteNotebookTitle') }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {{ t('sidebar.deleteNotebookConfirm', { title: deleteModal.targetNotebook?.title || '' }) }}
              </p>
              <p class="text-[11px] text-amber-600 mt-2 bg-amber-50 p-2 rounded-md border border-amber-200/60">
                {{ t('sidebar.deleteNotebookWarning') }}
              </p>
            </div>
          </div>

          <div v-if="deleteModal.error" class="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {{ deleteModal.error }}
          </div>

          <div class="flex items-center justify-end space-x-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="closeDeleteModal"
              :disabled="deleteModal.loading"
              class="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            >
              {{ t('common.cancel') }}
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
              <span>{{ deleteModal.loading ? t('editor.deleting') : t('common.delete') }}</span>
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
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div class="p-5">
          <div class="flex items-start space-x-3">
            <div class="p-2 rounded-full bg-rose-100 text-rose-600 shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t('sidebar.deleteNoteTitle') }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {{ t('sidebar.deleteNotePrompt', { title: deleteNoteModal.targetNote?.title || t('editor.untitledNote') }) }}
              </p>
            </div>
          </div>

          <div v-if="deleteNoteModal.error" class="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {{ deleteNoteModal.error }}
          </div>

          <div class="flex items-center justify-end space-x-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="closeDeleteNoteModal"
              :disabled="deleteNoteModal.loading"
              class="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            >
              {{ t('common.cancel') }}
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
              <span>{{ deleteNoteModal.loading ? t('editor.deleting') : t('sidebar.deleteNoteTitle') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Permanent Delete Note Custom Confirmation Modal -->
    <div
      v-if="permanentDeleteNoteModal.isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      @click.self="closePermanentDeleteModal"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div class="p-5">
          <div class="flex items-start space-x-3">
            <div class="p-2 rounded-full bg-rose-100 text-rose-600 shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t('sidebar.permDeleteNoteTitle') }}</h3>
              <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {{ t('sidebar.permDeleteNotePrompt', { title: permanentDeleteNoteModal.targetNote?.title || t('editor.untitledNote') }) }}
              </p>
              <p class="text-xs text-rose-500 mt-1 font-medium">
                {{ t('sidebar.permDeleteWarning') }}
              </p>
            </div>
          </div>

          <div v-if="permanentDeleteNoteModal.error" class="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {{ permanentDeleteNoteModal.error }}
          </div>

          <div class="flex items-center justify-end space-x-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="closePermanentDeleteModal"
              :disabled="permanentDeleteNoteModal.loading"
              class="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              @click="confirmPermanentDeleteNote"
              :disabled="permanentDeleteNoteModal.loading"
              class="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium shadow-2xs transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg v-if="permanentDeleteNoteModal.loading" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>{{ permanentDeleteNoteModal.loading ? t('editor.deleting') : t('sidebar.permDelete') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Note Information Modal (便签信息对话框) -->
    <NoteInfoModal
      :is-open="noteInfoModal.isOpen"
      :target-note="noteInfoModal.targetNote"
      @close="noteInfoModal.isOpen = false"
      @open-history="triggerHistoryFromInfo"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { t } from '@/i18n';
import { SynoNotebook, SynoNote } from '@/types/synology';
import { exportNotebookAsZip, exportSingleNoteAsMarkdown } from '@/utils/exportMarkdown';
import { showToast } from '@/utils/toast';
import { isNoteShared } from '@/utils/shareUtils';
import NoteInfoModal from '@/components/NoteInfoModal.vue';
import { printNote } from '@/utils/printNote';

const emit = defineEmits<{
  (e: 'open-import'): void;
  (e: 'open-share', noteId: string, noteTitle?: string): void;
  (e: 'open-history', noteId: string, noteTitle?: string): void;
  (e: 'open-sync'): void;
  (e: 'open-print', note: SynoNote, notebookTitle?: string): void;
}>();

const noteStore = useNoteStore();
const sessionStore = useSessionStore();
const layoutStore = useLayoutStore();

const titleInputRef = ref<HTMLInputElement | null>(null);

// Strict single-expanded accordion state ("展开时隐藏其他面板，收起时重新显示所有面板")
const expandedNotebookId = ref<string>('__all_notes__');

// Tag dropdown multi-select toggle state
const isTagDropdownOpen = ref<boolean>(false);

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
 * Toggle accordion panel (展开面板时独占并隐藏其他面板，再次点击收起时恢复显示其他所有面板)
 */
function toggleAccordion(notebookId: string) {
  isTagDropdownOpen.value = false;
  if (expandedNotebookId.value === notebookId) {
    // If user clicks the currently expanded panel, toggle it closed
    expandedNotebookId.value = '';
  } else {
    expandedNotebookId.value = notebookId;
    noteStore.searchQuery = '';
    noteStore.clearTags();
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
    if (currentNbId === '__recycle_bin__') {
      targetNotes = noteStore.recycledNotes;
    } else if (currentNbId === '__favorites__') {
      targetNotes = noteStore.favoriteNotes;
    } else if (currentNbId === '__shared_notes__') {
      targetNotes = targetNotes.filter(n => isNoteShared(n));
    } else {
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

const sharedNotesCount = computed(() => {
  return noteStore.notes.filter(n => isNoteShared(n)).length;
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
    let label = '—';
    let key = 'earlier';

    if (rawTime > 0) {
      const ms = rawTime > 10000000000 ? rawTime : rawTime * 1000;
      const d = new Date(ms);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      key = `${y}-${m.toString().padStart(2, '0')}`;
      label = `${y}-${m.toString().padStart(2, '0')}`;
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
    if (targetNotebookId && targetNotebookId !== '__all_notes__' && targetNotebookId !== '__shared_notes__') {
      await noteStore.selectNotebook(targetNotebookId);
    } else if (!noteStore.activeNotebookId || noteStore.activeNotebookId === '__all_notes__' || noteStore.activeNotebookId === '__shared_notes__') {
      const firstNb = noteStore.notebooks[0];
      if (firstNb) {
        await noteStore.selectNotebook(firstNb.object_id);
      }
    }
    await noteStore.createNote(t('sidebar.newNote'), `# ${t('sidebar.newNote')}\n\n`);
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
  try {
    exportSingleNoteAsMarkdown(noteToExport, nbTitle);
    showToast(t('editor.exportSuccess', { title: noteToExport.title || t('common.untitled') }), 'success');
  } catch (e: any) {
    console.error('Failed to export note', e);
    showToast(t('editor.exportFailed', { error: e?.message || e }), 'error');
  }
}

// ================= Modal & Menu States =================

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

// Delete Note Confirmation Modal State
const deleteNoteModal = reactive({
  isOpen: false,
  targetNote: null as SynoNote | null,
  loading: false,
  error: ''
});

// Permanent Delete Note Confirmation Modal State (彻底删除便签对话框)
const permanentDeleteNoteModal = reactive({
  isOpen: false,
  targetNote: null as SynoNote | null,
  loading: false,
  error: ''
});

// Move Note Modal State (新增“移动至其他笔记本”对话框)
const moveNoteModal = reactive({
  isOpen: false,
  targetNote: null as SynoNote | null,
  targetNotebookId: '',
  loading: false,
  error: ''
});

// Note Information Modal State (便签信息对话框)
const noteInfoModal = reactive({
  isOpen: false,
  targetNote: null as SynoNote | null
});

const availableTargetNotebooks = computed(() => {
  if (!moveNoteModal.targetNote) return noteStore.notebooks;
  const currentParentId = String(moveNoteModal.targetNote.parent_id || (moveNoteModal.targetNote as any).notebook_id || '');
  return noteStore.notebooks.filter(nb => String(nb.object_id) !== currentParentId);
});

// Right-Click Context Menu State for Notebooks
const contextMenu = reactive({
  isOpen: false,
  x: 0,
  y: 0,
  targetNotebook: null as SynoNotebook | null
});

// Right-Click Context Menu State for Notes (便签右键菜单)
const noteContextMenu = reactive({
  isOpen: false,
  x: 0,
  y: 0,
  targetNote: null as SynoNote | null
});

function openContextMenu(event: MouseEvent, nb: SynoNotebook) {
  closeNoteContextMenu();
  isTagDropdownOpen.value = false;
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

function openNoteContextMenu(event: MouseEvent, note: SynoNote) {
  closeContextMenu();
  isTagDropdownOpen.value = false;
  noteContextMenu.isOpen = true;
  noteContextMenu.x = Math.min(event.clientX, window.innerWidth - 190);
  noteContextMenu.y = Math.min(event.clientY, window.innerHeight - 380);
  noteContextMenu.targetNote = note;
}

function openNoteMenuFromButton(event: MouseEvent, note: SynoNote) {
  closeContextMenu();
  isTagDropdownOpen.value = false;

  if (noteContextMenu.isOpen && noteContextMenu.targetNote?.object_id === note.object_id) {
    closeNoteContextMenu();
    return;
  }

  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  noteContextMenu.isOpen = true;
  const menuWidth = 176;
  const menuHeight = 380;

  let x = rect.right - menuWidth;
  if (x < 10) x = rect.left;
  if (x + menuWidth > window.innerWidth - 10) {
    x = window.innerWidth - menuWidth - 10;
  }

  let y = rect.bottom + 4;
  if (y + menuHeight > window.innerHeight - 10) {
    y = Math.max(10, rect.top - menuHeight - 4);
  }

  noteContextMenu.x = x;
  noteContextMenu.y = y;
  noteContextMenu.targetNote = note;
}

function closeNoteContextMenu() {
  if (noteContextMenu.isOpen) {
    noteContextMenu.isOpen = false;
    noteContextMenu.targetNote = null;
  }
}

async function triggerNoteSync() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (note) {
    if (noteStore.activeNoteId !== note.object_id) {
      await noteStore.selectNote(note.object_id);
    }
    emit('open-sync');
  }
}

function triggerNoteShare() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (note) {
    emit('open-share', note.object_id, note.title);
  }
}

function triggerNoteHistory() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (note) {
    emit('open-history', note.object_id, note.title);
  }
}

function triggerNoteExport() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (note) {
    quickExportNote(note);
  }
}

function triggerNoteMove() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (note) {
    openMoveNoteModal(note);
  }
}

async function triggerNoteCopy() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (!note) return;
  try {
    const copied = await noteStore.copyNote(note.object_id);
    if (copied) {
      showToast(t('sidebar.copySuccess', { title: copied.title || t('common.untitled') }), 'success');
    }
  } catch (e: any) {
    showToast(t('sidebar.copyFailed', { error: e?.message || e }), 'error');
  }
}

async function triggerNoteToggleFavorite() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (!note) return;
  try {
    const wasFavorite = noteStore.isFavorite(note.object_id);
    await noteStore.toggleFavorite(note.object_id);
    showToast(wasFavorite ? t('sidebar.removeFromFavorites') : t('sidebar.addToFavorites'), 'success');
  } catch (e: any) {
    showToast(t('editor.favoriteFailed', { error: e?.message || e }), 'error');
  }
}

function triggerNotePrint() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (!note) return;
  const parentNb = noteStore.notebooks.find(nb => nb.object_id === note.parent_id);
  emit('open-print', note, parentNb?.title);
}

function triggerNoteCopyLink() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (!note) return;
  const link = `notestation://remote/self/${note.object_id}`;
  navigator.clipboard.writeText(link);
  showToast(t('sidebar.linkCopied'), 'success');
}

function triggerNoteInfo() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (!note) return;
  noteInfoModal.targetNote = note;
  noteInfoModal.isOpen = true;
}

function triggerHistoryFromInfo(noteId: string) {
  const note = noteStore.notes.find(n => n.object_id === noteId);
  emit('open-history', noteId, note?.title);
}

function triggerNoteDelete() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (note) {
    openDeleteNoteModal(note);
  }
}

async function triggerNoteRestore() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (!note) return;
  try {
    await noteStore.restoreNote(note.object_id);
    showToast(t('editor.restoreSuccess', { title: note.title || t('common.untitled') }), 'success');
  } catch (e: any) {
    showToast(t('editor.restoreFailed', { error: e?.message || e }), 'error');
  }
}

function triggerNotePermanentDelete() {
  const note = noteContextMenu.targetNote;
  closeNoteContextMenu();
  if (note) {
    openPermanentDeleteModal(note);
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
  closeNoteContextMenu();
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
  closeNoteContextMenu();
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
    notebookModal.error = t('sidebar.newNotebookPrompt');
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
  closeNoteContextMenu();
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
  closeNoteContextMenu();
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

function openPermanentDeleteModal(note: SynoNote) {
  closeContextMenu();
  closeNoteContextMenu();
  permanentDeleteNoteModal.isOpen = true;
  permanentDeleteNoteModal.targetNote = note;
  permanentDeleteNoteModal.loading = false;
  permanentDeleteNoteModal.error = '';
}

function closePermanentDeleteModal() {
  if (permanentDeleteNoteModal.loading) return;
  permanentDeleteNoteModal.isOpen = false;
  permanentDeleteNoteModal.targetNote = null;
  permanentDeleteNoteModal.error = '';
}

async function confirmPermanentDeleteNote() {
  if (!permanentDeleteNoteModal.targetNote) return;

  permanentDeleteNoteModal.loading = true;
  permanentDeleteNoteModal.error = '';

  try {
    await noteStore.permanentlyDeleteNote(permanentDeleteNoteModal.targetNote.object_id);
    permanentDeleteNoteModal.isOpen = false;
    permanentDeleteNoteModal.targetNote = null;
    showToast(t('sidebar.permDelete'), 'success');
  } catch (e: any) {
    permanentDeleteNoteModal.error = `彻底删除便签失败: ${e?.message || e}`;
  } finally {
    permanentDeleteNoteModal.loading = false;
  }
}

function openMoveNoteModal(note: SynoNote) {
  closeContextMenu();
  closeNoteContextMenu();
  moveNoteModal.isOpen = true;
  moveNoteModal.targetNote = note;
  moveNoteModal.error = '';
  moveNoteModal.loading = false;
  const currentParentId = String(note.parent_id || (note as any).notebook_id || '');
  const candidate = noteStore.notebooks.find(nb => String(nb.object_id) !== currentParentId);
  moveNoteModal.targetNotebookId = candidate ? candidate.object_id : (noteStore.notebooks[0]?.object_id || '');
}

function closeMoveNoteModal() {
  if (moveNoteModal.loading) return;
  moveNoteModal.isOpen = false;
  moveNoteModal.targetNote = null;
  moveNoteModal.targetNotebookId = '';
  moveNoteModal.error = '';
}

async function submitMoveNoteModal() {
  if (!moveNoteModal.targetNote || !moveNoteModal.targetNotebookId) {
    moveNoteModal.error = t('sidebar.pleaseSelectTarget');
    return;
  }

  moveNoteModal.loading = true;
  moveNoteModal.error = '';

  try {
    await noteStore.moveNote(moveNoteModal.targetNote.object_id, moveNoteModal.targetNotebookId);
    moveNoteModal.isOpen = false;
    moveNoteModal.targetNote = null;
    moveNoteModal.targetNotebookId = '';
  } catch (e: any) {
    moveNoteModal.error = `移动便签失败: ${e?.message || e}`;
  } finally {
    moveNoteModal.loading = false;
  }
}

async function handleRefreshAll() {
  try {
    await noteStore.syncWithServer();
    showToast(t('editor.syncWithServerSuccess'), 'success');
  } catch (err: any) {
    showToast(t('editor.syncWithServerFailed') + (err?.message ? `: ${err.message}` : ''), 'error');
  }
}

async function handleExportNotebook(nb: SynoNotebook) {
  const client = sessionStore.activeClient;
  if (!client) return;

  try {
    const res = await client.listAllNotes(nb.object_id);
    if (!res.notes || res.notes.length === 0) {
      showToast(t('sidebar.noNotesToExport', { title: nb.title || t('sidebar.notebooks') }), 'warning');
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

    await exportNotebookAsZip(nb.title || t('sidebar.notebooks'), fullNotes);
    showToast(t('sidebar.exportNotebookSuccess', { title: nb.title || t('sidebar.notebooks'), count: fullNotes.length }), 'success');
  } catch (e: any) {
    console.error(`导出笔记本失败: ${e?.message || e}`);
    showToast(t('sidebar.exportNotebookFailed', { error: e?.message || e }), 'error');
  }
}

function handleGlobalClick() {
  closeContextMenu();
  closeNoteContextMenu();
  isTagDropdownOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick);
});
</script>
