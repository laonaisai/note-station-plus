<template>
  <!-- Fullscreen Startup PIN Lock Guard -->
  <PinVerifyScreen
    v-if="isPinSet && !isUnlocked"
    @unlocked="handlePinUnlocked"
  />

  <div
    v-else
    class="h-screen w-screen flex flex-col bg-white overflow-hidden select-none font-sans"
    @dragover.prevent
    @drop.prevent="handleWindowDrop"
  >
    <!-- Top Multi-Server Tabs Bar -->
    <TabBar
      :is-pin-set="isPinSet"
      @add-server="openAddServerModal"
      @edit-server="openEditServerModal"
      @open-pin-settings="isPinSettingsModalOpen = true"
      @lock-screen="handleLockScreen"
      @open-about="isAboutModalOpen = true"
    />

    <!-- Main 2-Column Content Layout (Unified Sidebar + Markdown Editor) -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Column: Unified Notebook & Note Accordion Sidebar -->
      <NotebookSidebar
        @open-import="openImportModal(null)"
        @open-share="openShareModal"
        @open-history="openHistoryModal"
        @open-sync="isSyncModalOpen = true"
      />

      <!-- Right Column: Markdown Editor / Preview -->
      <MarkdownEditor
        @open-sync="isSyncModalOpen = true"
        @open-import="openImportModal"
        @open-share="openShareModal"
        @open-history="openHistoryModal"
      />
    </div>

    <!-- Modals -->
    <PinSettingsModal
      :is-open="isPinSettingsModalOpen"
      @close="isPinSettingsModalOpen = false"
      @pin-updated="handlePinUpdated"
      @lock-now="handleLockScreen"
    />

    <ServerModal
      :is-open="isServerModalOpen"
      :profile="editingProfile"
      @close="isServerModalOpen = false"
      @save="handleSaveServer"
    />

    <SyncModal
      :is-open="isSyncModalOpen"
      @close="isSyncModalOpen = false"
    />

    <ImportModal
      :is-open="isImportModalOpen"
      :initial-file="droppedFile"
      :target-object-id="importTargetObjectId"
      @close="isImportModalOpen = false"
    />

    <ShareModal
      :is-open="isShareModalOpen"
      :note-id="selectedShareNoteId"
      :note-title="selectedShareNoteTitle"
      @close="isShareModalOpen = false"
    />

    <HistoryModal
      :is-open="isHistoryModalOpen"
      :note-id="selectedHistoryNoteId"
      :note-title="selectedHistoryNoteTitle"
      @close="isHistoryModalOpen = false"
      @restored="handleNoteRestored"
    />

    <AboutModal
      :is-open="isAboutModalOpen"
      @close="isAboutModalOpen = false"
    />

    <!-- Global Toast Notifications -->
    <div class="fixed top-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      <transition-group
        enter-active-class="transform ease-out duration-200 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto max-w-sm px-3.5 py-2.5 rounded-lg shadow-xl text-xs flex items-center space-x-2.5 border bg-white text-slate-800"
          :class="{
            'border-emerald-200 border-l-[3px] border-l-emerald-500': toast.type === 'success',
            'border-rose-200 border-l-[3px] border-l-rose-500': toast.type === 'error',
            'border-amber-200 border-l-[3px] border-l-amber-500': toast.type === 'warning',
            'border-blue-200 border-l-[3px] border-l-syno-blue': toast.type === 'info'
          }"
        >
          <!-- Success Icon -->
          <svg v-if="toast.type === 'success'" class="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <!-- Error Icon -->
          <svg v-else-if="toast.type === 'error'" class="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <!-- Warning Icon -->
          <svg v-else-if="toast.type === 'warning'" class="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <!-- Info Icon -->
          <svg v-else class="w-4 h-4 text-syno-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>

          <span class="font-medium text-slate-700 leading-snug flex-1">{{ toast.message }}</span>

          <button
            @click="removeToast(toast.id)"
            class="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition cursor-pointer shrink-0 ml-1"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useSessionStore } from '@/stores/sessionStore';
import { useNoteStore } from '@/stores/noteStore';
import { ServerProfile } from '@/types/synology';
import { PinManager } from '@/services/pinManager';
import { toasts, removeToast } from '@/utils/toast';

import TabBar from '@/components/TabBar.vue';
import NotebookSidebar from '@/components/NotebookSidebar.vue';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import ServerModal from '@/components/ServerModal.vue';
import SyncModal from '@/components/SyncModal.vue';
import ImportModal from '@/components/ImportModal.vue';
import ShareModal from '@/components/ShareModal.vue';
import HistoryModal from '@/components/HistoryModal.vue';
import PinVerifyScreen from '@/components/PinVerifyScreen.vue';
import PinSettingsModal from '@/components/PinSettingsModal.vue';
import AboutModal from '@/components/AboutModal.vue';

const sessionStore = useSessionStore();
const noteStore = useNoteStore();

// PIN Protection states
const isPinSet = ref(PinManager.isPinConfigured());
const isUnlocked = ref(!isPinSet.value);
const isPinSettingsModalOpen = ref(false);
let hasInitializedSession = false;

const isServerModalOpen = ref(false);
const editingProfile = ref<ServerProfile | null>(null);
const isSyncModalOpen = ref(false);

const isImportModalOpen = ref(false);
const importTargetObjectId = ref<string | null>(null);
const droppedFile = ref<File | null>(null);

const isShareModalOpen = ref(false);
const selectedShareNoteId = ref<string | null>(null);
const selectedShareNoteTitle = ref<string>('');

const isHistoryModalOpen = ref(false);
const selectedHistoryNoteId = ref<string | null>(null);
const selectedHistoryNoteTitle = ref<string>('');

const isAboutModalOpen = ref(false);

function openShareModal(noteId: string, noteTitle?: string) {
  selectedShareNoteId.value = noteId;
  selectedShareNoteTitle.value = noteTitle || noteStore.notes.find(n => n.object_id === noteId)?.title || noteStore.activeNote?.title || '';
  isShareModalOpen.value = true;
}

function openHistoryModal(noteId: string, noteTitle?: string) {
  selectedHistoryNoteId.value = noteId;
  selectedHistoryNoteTitle.value = noteTitle || noteStore.notes.find(n => n.object_id === noteId)?.title || noteStore.activeNote?.title || '';
  isHistoryModalOpen.value = true;
}

function handleNoteRestored(noteId: string) {
  console.log('Note restored to previous version:', noteId);
}

async function initSession() {
  if (hasInitializedSession) return;
  hasInitializedSession = true;

  await sessionStore.init();
  if (sessionStore.profiles.length === 0) {
    // 首次启动且未配置任何服务时，自动弹出添加服务向导
    isServerModalOpen.value = true;
  } else if (sessionStore.activeSessionState?.isLoggedIn) {
    await noteStore.fetchNotebooks();
  }
}

async function handlePinUnlocked() {
  isUnlocked.value = true;
  await initSession();
}

function handleLockScreen() {
  PinManager.lockSession();
  isUnlocked.value = false;
  isPinSettingsModalOpen.value = false;
}

function handlePinUpdated() {
  isPinSet.value = PinManager.isPinConfigured();
  if (!isPinSet.value) {
    isUnlocked.value = true;
  }
}

onMounted(async () => {
  // Confirmation before closing when running in plain browser mode
  window.addEventListener('beforeunload', (e) => {
    if (!window.electronAPI) {
      e.preventDefault();
      e.returnValue = '确定要离开或关闭 Note Station Plus 吗？';
    }
  });

  if (isPinSet.value) {
    // If PIN is enabled, wait until user enters PIN
    isUnlocked.value = false;
  } else {
    isUnlocked.value = true;
    await initSession();
  }
});

// Watch for active tab / server switch
watch(
  () => sessionStore.activeProfileId,
  async (newId, oldId) => {
    if (newId !== oldId) {
      noteStore.reset();
      if (newId) {
        // Ensure connected
        const state = sessionStore.sessionStates[newId];
        if (state?.isLoggedIn) {
          await noteStore.fetchNotebooks();
        } else {
          const ok = await sessionStore.loginServer(newId);
          if (ok) {
            await noteStore.fetchNotebooks();
          }
        }
      } else if (sessionStore.profiles.length === 0) {
        // All profiles cleared: reset form & pop up Add Server modal
        editingProfile.value = null;
        isServerModalOpen.value = true;
      }
    }
  }
);

// Watch for total profiles count (specifically when all servers are deleted)
watch(
  () => sessionStore.profiles.length,
  (newCount) => {
    if (newCount === 0) {
      noteStore.reset();
      editingProfile.value = null;
      isServerModalOpen.value = true;
    }
  }
);

function openAddServerModal() {
  editingProfile.value = null;
  isServerModalOpen.value = true;
}

function openEditServerModal(profile: ServerProfile) {
  editingProfile.value = profile;
  isServerModalOpen.value = true;
}

async function handleSaveServer(profile: ServerProfile) {
  if (editingProfile.value) {
    await sessionStore.updateProfile(profile);
  } else {
    await sessionStore.addProfile(profile);
  }
  await noteStore.fetchNotebooks();
}

function openImportModal(targetObjectId?: string | null) {
  importTargetObjectId.value = targetObjectId || null;
  droppedFile.value = null;
  isImportModalOpen.value = true;
}

function handleWindowDrop(e: DragEvent) {
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.name.match(/\.(md|markdown|txt)$/i)) {
      droppedFile.value = file;
      importTargetObjectId.value = noteStore.activeNoteId;
      isImportModalOpen.value = true;
    }
  }
}
</script>
