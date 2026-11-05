<template>
  <div
    class="h-screen w-screen flex flex-col bg-white overflow-hidden select-none font-sans"
    @dragover.prevent
    @drop.prevent="handleWindowDrop"
  >
    <!-- Top Multi-Server Tabs Bar -->
    <TabBar
      @add-server="openAddServerModal"
      @edit-server="openEditServerModal"
    />

    <!-- Main 3-Column Content Layout -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Column: Notebooks Sidebar -->
      <NotebookSidebar />

      <!-- Middle Column: Notes List -->
      <NoteList
        @open-import="openImportModal(null)"
        @open-share="openShareModal"
        @open-history="openHistoryModal"
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useSessionStore } from '@/stores/sessionStore';
import { useNoteStore } from '@/stores/noteStore';
import { ServerProfile } from '@/types/synology';

import TabBar from '@/components/TabBar.vue';
import NotebookSidebar from '@/components/NotebookSidebar.vue';
import NoteList from '@/components/NoteList.vue';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import ServerModal from '@/components/ServerModal.vue';
import SyncModal from '@/components/SyncModal.vue';
import ImportModal from '@/components/ImportModal.vue';
import ShareModal from '@/components/ShareModal.vue';
import HistoryModal from '@/components/HistoryModal.vue';

const sessionStore = useSessionStore();
const noteStore = useNoteStore();

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

onMounted(async () => {
  await sessionStore.init();
  if (sessionStore.profiles.length === 0) {
    // 首次启动且未配置任何服务时，自动弹出添加服务向导
    isServerModalOpen.value = true;
  } else if (sessionStore.activeSessionState?.isLoggedIn) {
    await noteStore.fetchNotebooks();
  }
});

// Watch for active tab / server switch
watch(
  () => sessionStore.activeProfileId,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      noteStore.reset();
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
