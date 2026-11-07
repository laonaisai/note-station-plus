<template>
  <div class="flex-1 h-full bg-white dark:bg-slate-950 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
    <!-- Note Empty State -->
    <div v-if="!noteStore.activeNote" class="flex-1 flex flex-col items-center justify-center text-slate-400 select-none">
      <!-- Distraction-free recovery bar if sidebar is collapsed while empty -->
      <div v-if="layoutStore.isSidebarCollapsed" class="mb-4 flex items-center space-x-2">
        <button
          @click="layoutStore.toggleSidebar"
          class="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg flex items-center transition cursor-pointer"
        >
          {{ t('editor.expandSidebar') }}
        </button>
      </div>

      <svg class="w-16 h-16 mb-3 text-slate-200 dark:text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-sm text-slate-400 dark:text-slate-500">{{ t('editor.emptySelectTip') }}</p>
    </div>

    <!-- Active Note Editor -->
    <div v-else class="flex-1 flex flex-col h-full overflow-hidden">
      <!-- Top Note Bar -->
      <div class="h-14 px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
        <!-- Left Side: Sidebar Toggle Icons & Note Title Input -->
        <div class="flex items-center flex-1 mr-4 min-w-0">
          <!-- Sidebar Toggle Buttons (Collapse / Expand controls) -->
          <div class="flex items-center space-x-1 mr-3 shrink-0">
            <button
              @click="layoutStore.toggleSidebar"
              :class="[
                'p-1.5 rounded-md transition text-xs flex items-center cursor-pointer',
                layoutStore.isSidebarCollapsed ? 'bg-blue-50 dark:bg-blue-950/40 text-syno-blue' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              ]"
              :title="layoutStore.isSidebarCollapsed ? t('editor.expandSidebar') : t('editor.collapseSidebar')"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </button>

            <button
              @click="layoutStore.toggleFocusMode"
              :class="[
                'p-1.5 rounded-md transition text-xs flex items-center cursor-pointer',
                layoutStore.isSidebarCollapsed ? 'bg-syno-blue text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              ]"
              :title="layoutStore.isSidebarCollapsed ? t('editor.focusModeExit') : t('editor.focusModeEnter')"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>

          <!-- Note Title Input -->
          <div class="flex items-center flex-1 mr-4 min-w-0">
            <!-- Favorite Star Button (收藏/取消收藏) -->
            <button
              v-if="noteStore.activeNote && !isRecycledNote"
              @click="toggleActiveFavorite"
              class="mr-1.5 p-1 rounded-md transition cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              :title="noteStore.isFavorite(noteStore.activeNote.object_id) ? t('editor.favoriteRemove') : t('editor.favoriteAdd')"
            >
              <svg
                class="w-4 h-4"
                :class="noteStore.isFavorite(noteStore.activeNote.object_id) ? 'text-amber-500 fill-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>

            <!-- Share Icon (当前便签已共享) -->
            <svg
              v-if="isNoteShared(noteStore.activeNote)"
              class="w-4 h-4 text-syno-blue mr-2 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              :title="t('editor.sharedBadge')"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <input
              v-model="editTitle"
              @input="onContentChanged"
              :readonly="isRecycledNote"
              type="text"
              :placeholder="t('editor.titlePlaceholder')"
              class="text-base font-bold text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 border-none outline-none flex-1 bg-transparent truncate"
            />
          </div>
        </div>

        <!-- Right Action Tools -->
        <div class="flex items-center space-x-2.5 text-xs select-none shrink-0">
          <!-- 回收站便签专用操作栏 (便签操作仅有“恢复”与“彻底删除”) -->
          <template v-if="isRecycledNote">
            <button
              @click="handleRestoreRecycledNote"
              class="px-2.5 py-1 bg-syno-blue hover:bg-blue-600 text-white rounded-md font-medium shadow-2xs transition flex items-center cursor-pointer"
              :title="t('editor.restore')"
            >
              <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              {{ t('editor.restore') }}
            </button>

            <button
              @click="handlePermanentDeleteRecycledNote"
              class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-medium shadow-2xs transition flex items-center cursor-pointer"
              :title="t('editor.permDelete')"
            >
              <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {{ t('editor.permDelete') }}
            </button>
          </template>

          <!-- 普通便签操作栏 -->
          <template v-else>
            <!-- Save status indicator -->
            <span class="text-slate-400 dark:text-slate-500 text-xs flex items-center">
              <span v-if="noteStore.isSaving" class="flex items-center text-amber-500 dark:text-amber-400">
                <svg class="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                {{ t('common.saving') }}
              </span>
              <span v-else-if="isModified" class="text-slate-400 dark:text-slate-500">
                {{ t('common.unsaved') }}
              </span>
              <span v-else class="text-emerald-500 dark:text-emerald-400 flex items-center">
                <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ t('common.saved') }}
              </span>
            </span>

            <!-- Manual Save Button -->
            <button
              @click="saveNote(true)"
              :disabled="noteStore.isSaving"
              class="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium transition flex items-center cursor-pointer disabled:opacity-50"
              :title="t('editor.saveNote') + ' (Ctrl+S)'"
            >
              <svg class="w-3.5 h-3.5 mr-1 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {{ t('common.save') }}
            </button>

            <!-- Sync with server button (同步当前NAS: 获取最新便签版本，保存新版到服务) -->
            <button
              @click="handleSyncWithServer"
              :disabled="isSyncingWithServer || noteStore.isLoading || noteStore.isSyncingWithServer"
              class="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium transition flex items-center cursor-pointer disabled:opacity-50"
              :title="t('editor.syncWithServer')"
            >
              <svg :class="['w-3.5 h-3.5 mr-1 text-slate-500 dark:text-slate-400', (isSyncingWithServer || noteStore.isSyncingWithServer) ? 'animate-spin text-syno-blue' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {{ t('editor.syncWithServer') }}
            </button>

            <!-- Sync to other servers button (同步到其他NAS) -->
            <button
              @click="handleOpenSync"
              class="px-2.5 py-1 bg-syno-blue hover:bg-blue-600 text-white rounded-md font-medium shadow-2xs transition flex items-center cursor-pointer"
              :title="t('editor.syncToOtherServer')"
            >
              <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {{ t('editor.syncToOtherServer') }}
            </button>

            <!-- More Actions Dropdown (Requirement 4: 整合导入、导出、分享、历史为下拉菜单，置于同步按钮后) -->
            <div class="relative inline-flex items-center">
              <button
                @click.stop="isMoreMenuOpen = !isMoreMenuOpen"
                :class="[
                  'px-2 py-1 rounded-md font-medium transition flex items-center border cursor-pointer text-xs',
                  isMoreMenuOpen ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700'
                ]"
                :title="t('editor.more')"
              >
                <svg class="w-3.5 h-3.5 mr-1 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
                <span>{{ t('editor.more') }}</span>
                <svg class="w-3 h-3 ml-1 text-slate-400 dark:text-slate-500 transition-transform duration-150" :class="isMoreMenuOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown Menu -->
              <div
                v-if="isMoreMenuOpen"
                @click.stop
                class="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg py-1.5 z-40 text-xs animate-in fade-in duration-150"
              >
                <!-- 导入 -->
                <button
                  @click="triggerImport"
                  class="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>{{ t('editor.importMd') }}</span>
                </button>

                <!-- 导出 -->
                <button
                  @click="triggerExport"
                  class="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{{ t('editor.exportMd') }}</span>
                </button>

                <div class="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>

                <!-- 分享 -->
                <button
                  @click="triggerShare"
                  class="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>{{ t('editor.shareManage') }}</span>
                </button>

                <!-- 历史 -->
                <button
                  @click="triggerHistory"
                  class="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{{ t('editor.historyVersions') }}</span>
                </button>

                <div class="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>

                <!-- 打印 -->
                <button
                  @click="triggerPrint"
                  class="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>{{ t('editor.printNote') }}</span>
                </button>

                <!-- 复制便签链接 -->
                <button
                  @click="triggerCopyLink"
                  class="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>{{ t('editor.copyLink') }}</span>
                </button>

                <!-- 便签信息 -->
                <button
                  @click="triggerInfo"
                  class="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-syno-blue dark:hover:text-sky-400 flex items-center space-x-2 transition cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{{ t('editor.noteInfo') }}</span>
                </button>
              </div>
            </div>
          </template>

          <!-- Mode Toggle: Split / Edit / Preview -->
          <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              @click="editorMode = 'split'"
              :class="['px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer', editorMode === 'split' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200']"
            >
              {{ t('editor.modeSplit') }}
            </button>
            <button
              @click="editorMode = 'edit'"
              :class="['px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer', editorMode === 'edit' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200']"
            >
              {{ t('editor.modeEdit') }}
            </button>
            <button
              @click="editorMode = 'preview'"
              :class="['px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer', editorMode === 'preview' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200']"
            >
              {{ t('editor.modePreview') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Tag Editing Strip (Requirement 2: 便签标签编辑) -->
      <div class="px-5 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center flex-wrap gap-1.5 shrink-0 select-none text-xs">
        <span class="flex items-center text-slate-400 dark:text-slate-500 text-[11px] mr-1">
          <svg class="w-3.5 h-3.5 mr-1 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          {{ t('editor.tags') }}
        </span>

        <!-- Existing Tag Pills -->
        <span
          v-for="tag in editTags"
          :key="tag"
          class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 group transition hover:border-slate-300 dark:hover:border-slate-600"
        >
          <span>{{ tag }}</span>
          <button
            v-if="!isRecycledNote"
            @click="removeTag(tag)"
            class="ml-1 text-slate-400 dark:text-slate-500 hover:text-rose-500 rounded transition cursor-pointer"
            :title="t('common.remove')"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>

        <!-- Add Tag Input / Action -->
        <div v-if="!isRecycledNote" class="relative inline-flex items-center">
          <button
            v-if="!isAddingTag"
            @click="startAddTag"
            class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] text-slate-500 dark:text-slate-400 hover:text-syno-blue dark:hover:text-sky-400 border border-dashed border-slate-300 dark:border-slate-700 hover:border-syno-blue bg-white dark:bg-slate-800 hover:bg-blue-50/40 dark:hover:bg-slate-700 transition cursor-pointer"
            :title="t('editor.addTag')"
          >
            <svg class="w-3 h-3 mr-0.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ t('editor.addTag') }}
          </button>

          <div v-else class="flex items-center space-x-1">
            <input
              ref="tagInputRef"
              v-model="newTagText"
              @keydown.enter.prevent="confirmAddTag"
              @keydown.esc="cancelAddTag"
              @blur="onTagInputBlur"
              :placeholder="t('editor.tagPlaceholder')"
              class="w-32 px-2 py-0.5 text-[11px] bg-white dark:bg-slate-800 border border-syno-blue rounded-md outline-none focus:ring-1 focus:ring-syno-blue text-slate-800 dark:text-slate-100"
            />
            <button
              @mousedown.prevent="confirmAddTag"
              class="px-1.5 py-0.5 bg-syno-blue hover:bg-blue-600 text-white rounded text-[10px] transition cursor-pointer"
            >
              {{ t('common.confirm') }}
            </button>
            <button
              @mousedown.prevent="cancelAddTag"
              class="px-1 py-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded text-[10px] transition cursor-pointer"
            >
              {{ t('common.cancel') }}
            </button>

            <!-- Autocomplete suggestions dropdown -->
            <div
              v-if="suggestedTags.length > 0"
              class="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg py-1 z-30 min-w-[120px] max-h-36 overflow-y-auto"
            >
              <div
                v-for="sTag in suggestedTags"
                :key="sTag"
                @mousedown.prevent="selectSuggestedTag(sTag)"
                class="px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-syno-blue dark:hover:text-sky-400 cursor-pointer truncate"
              >
                {{ sTag }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Attachments Strip (关联附件与文件) -->
      <div
        v-if="noteStore.activeNote?.attachment && noteStore.activeNote.attachment.length > 0"
        class="px-5 py-1.5 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 flex items-center flex-wrap gap-2 shrink-0 text-xs select-none"
      >
        <span class="flex items-center text-slate-400 dark:text-slate-500 text-[11px] mr-1 shrink-0 font-medium">
          <svg class="w-3.5 h-3.5 mr-1 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          {{ t('editor.attachments') }} ({{ noteStore.activeNote.attachment.length }}):
        </span>

        <div
          v-for="att in noteStore.activeNote.attachment"
          :key="att.file_id || att.id"
          class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs group hover:border-syno-blue dark:hover:border-sky-500 transition"
        >
          <span class="truncate max-w-[150px] font-medium mr-1">{{ att.name }}</span>
          <span class="text-slate-400 dark:text-slate-500 text-[10px] mr-1.5">({{ formatFileSize(att.size) }})</span>
          <a
            :href="getAttachmentDownloadUrl(att.file_id || att.id, att.name)"
            target="_blank"
            download
            class="text-syno-blue dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 font-medium text-[10px] hover:underline"
            :title="t('editor.download')"
          >
            {{ t('editor.download') }}
          </a>
          <button
            v-if="!isRecycledNote"
            type="button"
            @click="insertAttachmentToBody(att)"
            class="ml-1.5 text-slate-400 dark:text-slate-400 hover:text-syno-blue dark:hover:text-sky-400 font-medium text-[10px] hover:underline cursor-pointer"
            :title="t('editor.insert')"
          >
            {{ t('editor.insert') }}
          </button>
          <button
            v-if="!isRecycledNote"
            type="button"
            @click="handleDeleteAttachment(att)"
            class="ml-1.5 text-slate-300 dark:text-slate-500 hover:text-rose-500 font-medium text-[11px] transition cursor-pointer"
            :title="t('common.delete')"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Recycle Bin Warning Banner -->
      <div v-if="isRecycledNote" class="px-5 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{{ t('editor.recycledBanner') }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <button
            @click="handleRestoreRecycledNote"
            class="px-2.5 py-0.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-300 rounded font-medium transition cursor-pointer"
          >
            {{ t('editor.restore') }}
          </button>
          <button
            @click="handlePermanentDeleteRecycledNote"
            class="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium transition cursor-pointer"
          >
            {{ t('editor.permDelete') }}
          </button>
        </div>
      </div>

      <!-- Quick Markdown Toolbar (普通编辑模式下显示) -->
      <div v-if="!isRecycledNote" class="h-9 px-5 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-1 select-none overflow-x-auto shrink-0">
        <button @click="insertMarkdown('**', '**')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs" :title="t('editor.bold') + ' (Ctrl+B)'">B</button>
        <button @click="insertMarkdown('*', '*')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 italic text-xs" :title="t('editor.italic')">I</button>
        <button @click="insertMarkdown('# ')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold" :title="t('editor.h1')">H1</button>
        <button @click="insertMarkdown('## ')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold" :title="t('editor.h2')">H2</button>
        <span class="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-1"></span>
        <button @click="insertMarkdown('- ')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs" :title="t('editor.ul')">• {{ t('editor.ul') }}</button>
        <button @click="insertMarkdown('1. ')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs" :title="t('editor.ol')">1. {{ t('editor.ol') }}</button>
        <button @click="insertMarkdown('- [ ] ')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs" :title="t('editor.task')">☑ {{ t('editor.task') }}</button>
        <span class="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-1"></span>
        <button @click="insertMarkdown('```\n', '\n```')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono" :title="t('editor.code')">&lt;/&gt;</button>
        <button @click="insertMarkdown('| 列1 | 列2 |\n| :--- | :--- |\n| 内容1 | 内容2 |\n')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs" :title="t('editor.table')">{{ t('editor.table') }}</button>
        <button @click="insertMarkdown('> ')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs" :title="t('editor.quote')">&ldquo; {{ t('editor.quote') }}</button>
        <button @click="insertMarkdown('$$ \n', '\n $$')" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs" :title="t('editor.formula')">∑</button>
        <span class="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-1"></span>
        <button
          @click="triggerSelectImage"
          class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs flex items-center space-x-1 cursor-pointer"
          :title="t('editor.image')"
        >
          <svg class="w-3.5 h-3.5 text-syno-blue dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{{ t('editor.image') }}</span>
        </button>
        <button
          @click="triggerSelectAttachment"
          class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs flex items-center space-x-1 cursor-pointer"
          :title="t('editor.attachments')"
        >
          <svg class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span>{{ t('editor.attachments') }}</span>
        </button>

        <!-- Hidden File Inputs -->
        <input
          ref="imageInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onImageFileSelected"
        />
        <input
          ref="attachmentInputRef"
          type="file"
          class="hidden"
          @change="onAttachmentFileSelected"
        />

        <!-- Uploading Indicator in Toolbar -->
        <div v-if="noteStore.isUploadingAttachment" class="ml-auto flex items-center text-xs text-syno-blue dark:text-sky-400 font-medium space-x-1 animate-pulse">
          <svg class="animate-spin h-3.5 w-3.5 text-syno-blue dark:text-sky-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>{{ t('editor.uploadingProgress', { percent: noteStore.uploadProgress }) }}</span>
        </div>
      </div>

      <!-- Editor Content Area -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Markdown Input Area -->
        <div
          v-show="editorMode === 'split' || editorMode === 'edit'"
          :class="[
            'h-full flex flex-col',
            editorMode === 'split' ? 'w-1/2 border-r border-slate-200 dark:border-slate-800' : 'w-full'
          ]"
        >
          <textarea
            ref="textareaRef"
            v-model="editMarkdown"
            @input="onContentChanged"
            @keydown="handleKeydown"
            @paste="handlePaste"
            @dragover.prevent
            @drop.prevent="handleDrop"
            :readonly="isRecycledNote"
            :placeholder="t('editor.markdownPlaceholder', undefined) || '使用 Markdown 编写便签内容...'"
            class="w-full h-full p-6 text-sm font-mono text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 resize-none outline-none leading-relaxed"
          ></textarea>
        </div>

        <!-- Markdown Preview Area -->
        <div
          v-show="editorMode === 'split' || editorMode === 'preview'"
          :class="[
            'h-full overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/40 select-text relative group',
            editorMode === 'split' ? 'w-1/2' : 'w-full'
          ]"
        >
          <!-- Floating Quick Copy Button in Preview Area -->
          <div class="sticky top-0 float-right z-10 -mt-2 -mr-2 mb-2 ml-4">
            <button
              @click="handleCopyPreviewText"
              class="px-2.5 py-1 text-xs bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-syno-blue dark:hover:text-sky-400 rounded-md border border-slate-200/90 dark:border-slate-700 shadow-xs backdrop-blur-xs flex items-center space-x-1.5 transition cursor-pointer select-none opacity-70 hover:opacity-100"
              :title="isCopied ? t('editor.copySuccess') : t('editor.copyContent')"
            >
              <svg v-if="!isCopied" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <svg v-else class="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span :class="isCopied ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''">{{ isCopied ? t('editor.copied') : t('editor.copyContent') }}</span>
            </button>
          </div>

          <div
            class="markdown-preview select-text prose prose-sm max-w-none prose-slate dark:prose-invert prose-headings:font-bold prose-a:text-syno-blue cursor-text"
            v-html="renderedPreviewHtml"
          ></div>
        </div>
      </div>
    </div>

    <!-- Permanent Delete Confirmation Modal in Editor -->
    <div
      v-if="isPermanentDeleteModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      @click.self="isPermanentDeleteModalOpen = false"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div class="p-5">
          <div class="flex items-start space-x-3">
            <div class="p-2 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t('editor.permDeleteModalTitle') }}</h3>
              <p class="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {{ t('editor.permDeleteModalConfirm', { title: noteStore.activeNote?.title || t('editor.untitledNote') }) }}
              </p>
              <p class="text-xs text-rose-500 mt-1 font-medium">
                {{ t('editor.permDeleteModalWarning') }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isPermanentDeleteModalOpen = false"
              :disabled="isPermanentDeleting"
              class="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              @click="confirmPermanentDelete"
              :disabled="isPermanentDeleting"
              class="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium shadow-2xs transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg v-if="isPermanentDeleting" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>{{ isPermanentDeleting ? t('editor.deleting') : t('editor.confirmPermDelete') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Note Information Modal (便签信息对话框) -->
    <NoteInfoModal
      :is-open="isInfoModalOpen"
      :target-note="noteStore.activeNote"
      @close="isInfoModalOpen = false"
      @open-history="(noteId) => emit('open-history', noteId)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import MarkdownIt from 'markdown-it';
import { t } from '@/i18n';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { exportSingleNoteAsMarkdown } from '@/utils/exportMarkdown';
import { showToast } from '@/utils/toast';
import { isNoteShared } from '@/utils/shareUtils';
import { printNote } from '@/utils/printNote';
import { healLegacyImagePlaceholders } from '@/utils/markdown';
import NoteInfoModal from '@/components/NoteInfoModal.vue';

const emit = defineEmits<{
  (e: 'open-sync'): void;
  (e: 'open-import', noteId?: string | null): void;
  (e: 'open-share', noteId: string): void;
  (e: 'open-history', noteId: string): void;
  (e: 'open-print', note: any, notebookTitle?: string, markdownOverride?: string): void;
}>();

const noteStore = useNoteStore();
const sessionStore = useSessionStore();
const layoutStore = useLayoutStore();

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

const isMoreMenuOpen = ref(false);
const isInfoModalOpen = ref(false);
const editorMode = ref<'split' | 'edit' | 'preview'>('split');
const editTitle = ref('');
const editMarkdown = ref('');
const editTags = ref<string[]>([]);
const isModified = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);
const attachmentInputRef = ref<HTMLInputElement | null>(null);

// Tag editing state
const isAddingTag = ref(false);
const newTagText = ref('');
const tagInputRef = ref<HTMLInputElement | null>(null);

let saveTimer: any = null;

// Watch for active note changes
watch(
  () => noteStore.activeNote,
  (note) => {
    try {
      if (note) {
        editTitle.value = note.title || '';
        editMarkdown.value = note.markdownContent || '';
        editTags.value = Array.isArray(note.tag) ? [...note.tag] : [];
        isModified.value = false;
      } else {
        editTitle.value = '';
        editMarkdown.value = '';
        editTags.value = [];
        isModified.value = false;
      }
    } catch (err) {
      console.error('Error handling active note change in editor:', err);
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
  try {
    let content = editMarkdown.value || '';
    if (noteStore.activeNote?.attachment && noteStore.activeNote.attachment.length > 0) {
      const client = sessionStore.activeClient;
      if (client) {
        content = healLegacyImagePlaceholders(content, {
          attachments: noteStore.activeNote.attachment,
          getAttachmentUrl: (fileId, filename) => client.getAttachmentDownloadUrl(noteStore.activeNote!.object_id, fileId, filename)
        });
      }
    }
    return md.render(content);
  } catch (err) {
    console.error('Failed to render markdown preview:', err);
    return `<div class="p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono whitespace-pre-wrap">${editMarkdown.value || ''}</div>`;
  }
});

const isCopied = ref(false);

async function handleCopyPreviewText() {
  const selection = window.getSelection()?.toString().trim();
  const textToCopy = selection && selection.length > 0 ? selection : (editMarkdown.value || '');
  if (!textToCopy) {
    showToast(t('editor.contentEmpty'), 'info');
    return;
  }
  try {
    await navigator.clipboard.writeText(textToCopy);
    isCopied.value = true;
    showToast(selection && selection.length > 0 ? t('editor.copySelectedSuccess') : t('editor.copySuccess'), 'success');
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err) {
    showToast(t('editor.copyFailed'), 'error');
  }
}

const isRecycledNote = computed(() => {
  return noteStore.activeNotebookId === '__recycle_bin__' || Boolean(noteStore.activeNote?.recycle);
});

const isPermanentDeleteModalOpen = ref(false);
const isPermanentDeleting = ref(false);

async function handleRestoreRecycledNote() {
  const note = noteStore.activeNote;
  if (!note) return;
  try {
    await noteStore.restoreNote(note.object_id);
    showToast(t('editor.restoreSuccess', { title: note.title || t('common.untitled') }), 'success');
  } catch (e: any) {
    showToast(t('editor.restoreFailed', { error: e?.message || e }), 'error');
  }
}

function handlePermanentDeleteRecycledNote() {
  if (noteStore.activeNote) {
    isPermanentDeleteModalOpen.value = true;
  }
}

async function confirmPermanentDelete() {
  const note = noteStore.activeNote;
  if (!note) return;
  isPermanentDeleting.value = true;
  try {
    await noteStore.permanentlyDeleteNote(note.object_id);
    isPermanentDeleteModalOpen.value = false;
    showToast(t('editor.permDeleteSuccess'), 'success');
  } catch (e: any) {
    showToast(t('editor.permDeleteFailed', { error: e?.message || e }), 'error');
  } finally {
    isPermanentDeleting.value = false;
  }
}

function onContentChanged() {
  if (isRecycledNote.value) return;
  isModified.value = true;
  clearTimeout(saveTimer);
  // Auto-save debounced after 2.5 seconds of inactivity
  saveTimer = setTimeout(() => {
    if (isModified.value) {
      saveNote();
    }
  }, 2500);
}

let pendingManualToast = false;
let lastSaveToastTime = 0;

async function saveNote(isManual = false): Promise<boolean> {
  if (isRecycledNote.value) return false;
  if (noteStore.isUploadingAttachment) {
    if (isManual) {
      showToast(t('editor.uploadingWait'), 'info');
    }
    return false;
  }
  clearTimeout(saveTimer);
  if (!noteStore.activeNoteId) return false;

  if (isManual) {
    pendingManualToast = true;
  }

  const title = editTitle.value.trim() || t('common.untitled');
  try {
    const success = await noteStore.updateActiveNote(title, editMarkdown.value, editTags.value);
    if (success) {
      isModified.value = false;
      if (pendingManualToast) {
        pendingManualToast = false;
        const now = Date.now();
        if (now - lastSaveToastTime > 1500) {
          lastSaveToastTime = now;
          showToast(t('editor.saved'), 'success');
        }
      }
      return true;
    }
    return false;
  } catch (err: any) {
    pendingManualToast = false;
    showToast(t('editor.saveFailed', { error: err?.message || err }), 'error');
    return false;
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
    title: editTitle.value.trim() || noteStore.activeNote.title || t('common.untitled'),
    markdownContent: editMarkdown.value,
    tag: [...editTags.value]
  };
  try {
    exportSingleNoteAsMarkdown(currentNote, noteStore.activeNotebook?.title);
    showToast(t('editor.exportSuccess', { title: currentNote.title }), 'success');
  } catch (e: any) {
    showToast(t('editor.exportFailed', { error: e?.message || e }), 'error');
  }
}

const isSyncingWithServer = ref(false);

async function handleSyncWithServer() {
  if (isSyncingWithServer.value || noteStore.isSyncingWithServer) return;
  isSyncingWithServer.value = true;
  try {
    // 1. If currently modified, save local modifications to server first
    if (isModified.value) {
      const saved = await saveNote(false);
      if (!saved && isModified.value) {
        return;
      }
    }
    // 2. Sync latest data from server (notebooks, notes list, and active note details)
    await noteStore.syncWithServer();
    showToast(t('editor.syncWithServerSuccess'), 'success');
  } catch (err: any) {
    showToast(t('editor.syncWithServerFailed') + (err?.message ? `: ${err.message}` : ''), 'error');
  } finally {
    isSyncingWithServer.value = false;
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

async function toggleActiveFavorite() {
  if (!noteStore.activeNote) return;
  const noteId = noteStore.activeNote.object_id;
  try {
    const wasFav = noteStore.isFavorite(noteId);
    await noteStore.toggleFavorite(noteId);
    showToast(wasFav ? t('sidebar.removeFromFavorites') : t('sidebar.addToFavorites'), 'success');
  } catch (e: any) {
    showToast(t('editor.favoriteFailed', { error: e?.message || e }), 'error');
  }
}

function triggerPrint() {
  if (!noteStore.activeNote) return;
  isMoreMenuOpen.value = false;
  const parentNb = noteStore.notebooks.find(nb => nb.object_id === noteStore.activeNote?.parent_id);
  emit('open-print', noteStore.activeNote, parentNb?.title, editMarkdown.value);
}

function triggerCopyLink() {
  if (!noteStore.activeNote) return;
  isMoreMenuOpen.value = false;
  const link = `notestation://remote/self/${noteStore.activeNote.object_id}`;
  navigator.clipboard.writeText(link);
  showToast(t('sidebar.linkCopied'), 'success');
}

function triggerInfo() {
  if (!noteStore.activeNote) return;
  isMoreMenuOpen.value = false;
  isInfoModalOpen.value = true;
}

function triggerSelectImage() {
  if (isRecycledNote.value) return;
  imageInputRef.value?.click();
}

function triggerSelectAttachment() {
  if (isRecycledNote.value) return;
  attachmentInputRef.value?.click();
}

async function onImageFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;
  for (let i = 0; i < files.length; i++) {
    await uploadAndInsertFile(files[i]);
  }
  input.value = '';
}

async function onAttachmentFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;
  for (let i = 0; i < files.length; i++) {
    await uploadAndInsertFile(files[i]);
  }
  input.value = '';
}

async function handlePaste(e: ClipboardEvent) {
  if (isRecycledNote.value) return;
  const items = e.clipboardData?.items;
  if (!items || items.length === 0) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;

      const ext = file.type.split('/')[1] || 'png';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot_${timestamp}.${ext}`;
      const namedFile = new File([file], filename, { type: file.type });

      await uploadAndInsertFile(namedFile);
    }
  }
}

async function handleDrop(e: DragEvent) {
  if (isRecycledNote.value) return;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  e.preventDefault();
  for (let i = 0; i < files.length; i++) {
    await uploadAndInsertFile(files[i]);
  }
}

async function uploadAndInsertFile(file: File) {
  // Clear any pending auto-save timer while uploading
  clearTimeout(saveTimer);

  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name);
  const placeholder = isImage
    ? `\n![正在上传图片 ${file.name}...]()\n`
    : `\n[📎 正在上传附件 ${file.name}...]()\n`;

  insertMarkdown(placeholder);

  try {
    showToast(t('editor.uploadingFile', { name: file.name }), 'info');
    const result = await noteStore.uploadAttachmentToActiveNote(file, file.name, editMarkdown.value);

    const insertText = result.isImage
      ? `\n![${file.name}](${result.url})\n`
      : `\n[📎 ${file.name} (${formatFileSize(file.size)})](${result.url})\n`;

    const cleanPlaceholder = placeholder.trim();
    if (editMarkdown.value.includes(placeholder)) {
      editMarkdown.value = editMarkdown.value.replace(placeholder, insertText);
    } else if (cleanPlaceholder && editMarkdown.value.includes(cleanPlaceholder)) {
      editMarkdown.value = editMarkdown.value.replace(cleanPlaceholder, insertText.trim());
    } else {
      insertMarkdown(insertText);
    }

    if (textareaRef.value) {
      textareaRef.value.value = editMarkdown.value;
    }

    onContentChanged();
    showToast(t('editor.uploadInsertSuccess', { name: file.name }), 'success');
  } catch (err: any) {
    console.error('Failed to upload attachment', err);
    const cleanPlaceholder = placeholder.trim();
    if (editMarkdown.value.includes(placeholder)) {
      editMarkdown.value = editMarkdown.value.replace(placeholder, '');
    } else if (cleanPlaceholder && editMarkdown.value.includes(cleanPlaceholder)) {
      editMarkdown.value = editMarkdown.value.replace(cleanPlaceholder, '');
    }
    if (textareaRef.value) {
      textareaRef.value.value = editMarkdown.value;
    }
    showToast(t('editor.uploadFileFailed', { name: file.name, error: err?.message || err }), 'error');
  }
}

function insertAttachmentToBody(att: any) {
  const fileId = att?.file_id || att?.id;
  if (!fileId) return;
  const url = getAttachmentDownloadUrl(fileId, att?.name);
  const isImage = isImageAttachment(att);
  const insertText = isImage
    ? `\n![${att?.name || t('editor.image')}](${url})\n`
    : `\n[📎 ${att?.name || t('editor.attachments')} (${formatFileSize(att?.size)})](${url})\n`;

  insertMarkdown(insertText);
  showToast(t('editor.attachmentInserted', { name: att?.name || t('editor.attachments') }), 'info');
}

async function handleDeleteAttachment(att: any) {
  const fileId = att?.file_id || att?.id;
  if (!fileId) return;
  const confirmed = confirm(t('editor.deleteAttachmentConfirm', { name: att.name }));
  if (!confirmed) return;

  try {
    await noteStore.deleteAttachmentFromActiveNote(fileId);
    showToast(t('editor.attachmentDeleted', { name: att.name }), 'success');
  } catch (e: any) {
    showToast(t('editor.deleteAttachmentFailed', { error: e?.message || e }), 'error');
  }
}

function getAttachmentDownloadUrl(fileId: string, filename?: string): string {
  const client = sessionStore.activeClient;
  if (!client || !noteStore.activeNote) return '#';
  return client.getAttachmentDownloadUrl(noteStore.activeNote.object_id, fileId, filename);
}

function isImageAttachment(att: any): boolean {
  if (att?.type?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(att?.name || '');
}

function insertImageAttachment(att: any) {
  const fileId = att?.file_id || att?.id;
  if (!fileId) return;
  const url = getAttachmentDownloadUrl(fileId, att?.name);
  const markdownImg = `\n![${att?.name || t('editor.image')}](${url})\n`;
  insertMarkdown(markdownImg);
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
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
    saveNote(true);
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
