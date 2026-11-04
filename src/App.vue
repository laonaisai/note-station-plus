<template>
  <div class="h-screen w-screen flex flex-col bg-white overflow-hidden select-none font-sans">
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
      <NoteList />

      <!-- Right Column: Markdown Editor / Preview -->
      <MarkdownEditor @open-sync="isSyncModalOpen = true" />
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

const sessionStore = useSessionStore();
const noteStore = useNoteStore();

const isServerModalOpen = ref(false);
const editingProfile = ref<ServerProfile | null>(null);
const isSyncModalOpen = ref(false);

onMounted(async () => {
  await sessionStore.init();
  if (sessionStore.activeSessionState?.isLoggedIn) {
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
</script>
