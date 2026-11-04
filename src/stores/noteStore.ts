import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { SynoNotebook, SynoNote } from '@/types/synology';
import { useSessionStore } from './sessionStore';

export const useNoteStore = defineStore('notes', () => {
  const sessionStore = useSessionStore();

  const notebooks = ref<SynoNotebook[]>([]);
  const activeNotebookId = ref<string | null>(null);

  const notes = ref<SynoNote[]>([]);
  const activeNoteId = ref<string | null>(null);
  const activeNote = ref<SynoNote | null>(null);

  const searchQuery = ref<string>('');
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const lastSaveTime = ref<number | null>(null);

  const filteredNotes = computed(() => {
    if (!searchQuery.value.trim()) return notes.value;
    const q = searchQuery.value.toLowerCase().trim();
    return notes.value.filter(n => n.title.toLowerCase().includes(q));
  });

  const activeNotebook = computed(() => {
    return notebooks.value.find(nb => nb.object_id === activeNotebookId.value) || null;
  });

  async function fetchNotebooks() {
    const client = sessionStore.activeClient;
    if (!client || !sessionStore.activeSessionState?.isLoggedIn) return;

    isLoading.value = true;
    try {
      let list = await client.listNotebooks();

      // If user has zero notebooks on this server, automatically create a default one
      if (list.length === 0) {
        const defaultNb = await client.createNotebook('我的笔记本');
        list = [defaultNb];
      }

      notebooks.value = list;

      // Select first notebook if none selected or current selection is invalid
      if (!activeNotebookId.value || !list.some(nb => nb.object_id === activeNotebookId.value)) {
        await selectNotebook(list[0].object_id);
      } else {
        await fetchNotes(activeNotebookId.value);
      }
    } catch (e) {
      console.error('Failed to fetch notebooks', e);
    } finally {
      isLoading.value = false;
    }
  }

  async function selectNotebook(notebookId: string) {
    activeNotebookId.value = notebookId;
    activeNoteId.value = null;
    activeNote.value = null;
    await fetchNotes(notebookId);
  }

  async function fetchNotes(notebookId: string) {
    const client = sessionStore.activeClient;
    if (!client || !notebookId || !sessionStore.activeSessionState?.isLoggedIn) return;

    isLoading.value = true;
    try {
      const res = await client.listNotes(notebookId);
      notes.value = res.notes;

      // Auto-select first note if available
      if (res.notes.length > 0) {
        if (!activeNoteId.value || !res.notes.some(n => n.object_id === activeNoteId.value)) {
          await selectNote(res.notes[0].object_id);
        }
      } else {
        activeNoteId.value = null;
        activeNote.value = null;
      }
    } catch (e) {
      console.error('Failed to fetch notes', e);
    } finally {
      isLoading.value = false;
    }
  }

  async function selectNote(noteId: string) {
    const client = sessionStore.activeClient;
    if (!client || !noteId || !sessionStore.activeSessionState?.isLoggedIn) return;

    activeNoteId.value = noteId;
    try {
      const fullNote = await client.getNote(noteId);
      activeNote.value = fullNote;
    } catch (e) {
      console.error('Failed to get note details', e);
    }
  }

  async function createNotebook(title: string): Promise<SynoNotebook | null> {
    const client = sessionStore.activeClient;
    if (!client) return null;

    try {
      const created = await client.createNotebook(title);
      await fetchNotebooks();
      await selectNotebook(created.object_id);
      return created;
    } catch (e) {
      console.error('Failed to create notebook', e);
      throw e;
    }
  }

  async function deleteNotebook(notebookId: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client) return false;

    try {
      await client.deleteNotebook(notebookId);
      await fetchNotebooks();
      return true;
    } catch (e) {
      console.error('Failed to delete notebook', e);
      throw e;
    }
  }

  async function createNote(title = '无标题便签', initialMarkdown = ''): Promise<SynoNote | null> {
    const client = sessionStore.activeClient;
    if (!client || !activeNotebookId.value) return null;

    try {
      const newNote = await client.createNote(activeNotebookId.value, title, initialMarkdown);
      await fetchNotes(activeNotebookId.value);
      await selectNote(newNote.object_id);
      return newNote;
    } catch (e) {
      console.error('Failed to create note', e);
      throw e;
    }
  }

  async function updateActiveNote(title: string, markdownContent: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !activeNote.value || !activeNoteId.value) return false;

    isSaving.value = true;
    try {
      await client.updateNote(activeNoteId.value, title, markdownContent);
      activeNote.value.title = title;
      activeNote.value.markdownContent = markdownContent;

      // Update in note list cache
      const item = notes.value.find(n => n.object_id === activeNoteId.value);
      if (item) {
        item.title = title;
        item.mtime = Math.floor(Date.now() / 1000);
      }

      lastSaveTime.value = Date.now();
      return true;
    } catch (e) {
      console.error('Failed to save note', e);
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteActiveNote(): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !activeNoteId.value || !activeNotebookId.value) return false;

    try {
      await client.deleteNote(activeNoteId.value);
      const nbId = activeNotebookId.value;
      activeNoteId.value = null;
      activeNote.value = null;
      await fetchNotes(nbId);
      return true;
    } catch (e) {
      console.error('Failed to delete note', e);
      throw e;
    }
  }

  function reset() {
    notebooks.value = [];
    activeNotebookId.value = null;
    notes.value = [];
    activeNoteId.value = null;
    activeNote.value = null;
  }

  return {
    notebooks,
    activeNotebookId,
    activeNotebook,
    notes,
    filteredNotes,
    activeNoteId,
    activeNote,
    searchQuery,
    isLoading,
    isSaving,
    lastSaveTime,
    fetchNotebooks,
    selectNotebook,
    fetchNotes,
    selectNote,
    createNotebook,
    deleteNotebook,
    createNote,
    updateActiveNote,
    deleteActiveNote,
    reset
  };
});
