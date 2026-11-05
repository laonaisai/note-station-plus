import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  SynoNotebook,
  SynoNote,
  NoteVersion,
  NoteShareInfo,
  SharedMember
} from '@/types/synology';
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
  const isCreating = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const lastSaveTime = ref<number | null>(null);

  const filteredNotes = computed(() => {
    let list = notes.value;

    // Filter by active notebook
    if (activeNotebookId.value) {
      list = list.filter(n =>
        n.parent_id === activeNotebookId.value ||
        (n as any).notebook_id === activeNotebookId.value
      );
    }

    if (!searchQuery.value.trim()) return list;
    const q = searchQuery.value.toLowerCase().trim();
    return list.filter(n =>
      n.title.toLowerCase().includes(q) ||
      (n.tag || []).some(t => t.toLowerCase().includes(q))
    );
  });

  const activeNotebook = computed(() => {
    return notebooks.value.find(nb => nb.object_id === activeNotebookId.value) || null;
  });

  const allTags = computed(() => {
    const tagSet = new Set<string>();
    notes.value.forEach(n => {
      (n.tag || []).forEach(t => {
        if (t && t.trim()) tagSet.add(t.trim());
      });
    });
    return Array.from(tagSet).sort();
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
      // Use listAllNotes with pagination loop so that all notes are completely loaded
      const res = await client.listAllNotes(notebookId);
      notes.value = res.notes;

      // Filter notes for the active notebook
      const currentNotebookNotes = notes.value.filter(n =>
        n.parent_id === notebookId || (n as any).notebook_id === notebookId
      );

      // Auto-select first note if available
      if (currentNotebookNotes.length > 0) {
        if (!activeNoteId.value || !currentNotebookNotes.some(n => n.object_id === activeNoteId.value)) {
          await selectNote(currentNotebookNotes[0].object_id);
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

      // Ensure tags in notes list are up to date
      const item = notes.value.find(n => n.object_id === noteId);
      if (item && fullNote.tag) {
        item.tag = [...fullNote.tag];
      }
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

  async function createNote(title = '无标题便签', initialMarkdown = '', tags: string[] = []): Promise<SynoNote | null> {
    const client = sessionStore.activeClient;
    if (!client || !activeNotebookId.value) return null;

    isCreating.value = true;
    try {
      const newNote = await client.createNote(activeNotebookId.value, title, initialMarkdown, tags);
      // Immediately set as active note and prepend to note list for instant responsiveness
      activeNoteId.value = newNote.object_id;
      activeNote.value = newNote;
      notes.value = [newNote, ...notes.value.filter(n => n.object_id !== newNote.object_id)];

      // Background refresh to synchronize all metadata
      fetchNotes(activeNotebookId.value).catch(console.error);

      return newNote;
    } catch (e) {
      console.error('Failed to create note', e);
      throw e;
    } finally {
      isCreating.value = false;
    }
  }

  async function importNote(options: {
    targetNotebookId: string;
    title: string;
    markdownContent: string;
    tags?: string[];
    updateObjectId?: string;
  }): Promise<SynoNote> {
    const client = sessionStore.activeClient;
    if (!client) throw new Error('未连接服务器');

    if (options.updateObjectId) {
      // Update existing note
      await client.updateNote(options.updateObjectId, options.title, options.markdownContent, options.tags);
      if (activeNoteId.value === options.updateObjectId && activeNote.value) {
        activeNote.value.title = options.title;
        activeNote.value.markdownContent = options.markdownContent;
        if (options.tags) activeNote.value.tag = options.tags;
      }
      const item = notes.value.find(n => n.object_id === options.updateObjectId);
      if (item) {
        item.title = options.title;
        item.mtime = Math.floor(Date.now() / 1000);
        if (options.tags) item.tag = options.tags;
      }
      await selectNote(options.updateObjectId);
      return activeNote.value || (await client.getNote(options.updateObjectId));
    } else {
      // Create new note
      isCreating.value = true;
      try {
        const newNote = await client.createNote(options.targetNotebookId, options.title, options.markdownContent, options.tags || []);
        activeNoteId.value = newNote.object_id;
        activeNote.value = newNote;
        notes.value = [newNote, ...notes.value.filter(n => n.object_id !== newNote.object_id)];
        fetchNotes(options.targetNotebookId).catch(console.error);
        return newNote;
      } finally {
        isCreating.value = false;
      }
    }
  }

  async function updateActiveNote(title: string, markdownContent: string, tags?: string[]): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !activeNote.value || !activeNoteId.value) return false;

    isSaving.value = true;
    try {
      await client.updateNote(activeNoteId.value, title, markdownContent, tags);
      activeNote.value.title = title;
      activeNote.value.markdownContent = markdownContent;
      if (tags !== undefined) {
        activeNote.value.tag = [...tags];
      }

      // Update in note list cache
      const item = notes.value.find(n => n.object_id === activeNoteId.value);
      if (item) {
        item.title = title;
        item.mtime = Math.floor(Date.now() / 1000);
        if (tags !== undefined) {
          item.tag = [...tags];
        }
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

  async function deleteNote(noteId: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId || !activeNotebookId.value) return false;

    try {
      await client.deleteNote(noteId);
      if (activeNoteId.value === noteId) {
        activeNoteId.value = null;
        activeNote.value = null;
      }
      await fetchNotes(activeNotebookId.value);
      return true;
    } catch (e) {
      console.error('Failed to delete note', e);
      throw e;
    }
  }

  async function listNoteVersions(noteId: string): Promise<NoteVersion[]> {
    const client = sessionStore.activeClient;
    if (!client) return [];
    return client.listNoteVersions(noteId);
  }

  async function getNoteVersionContent(noteId: string, ver: string): Promise<SynoNote | null> {
    const client = sessionStore.activeClient;
    if (!client) return null;
    return client.getNote(noteId, ver);
  }

  async function restoreNoteVersion(noteId: string, ver: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client) return false;

    const ok = await client.restoreNoteVersion(noteId, ver);
    if (ok) {
      // Re-fetch current note content
      await selectNote(noteId);
      if (activeNotebookId.value) {
        await fetchNotes(activeNotebookId.value);
      }
    }
    return ok;
  }

  async function getNoteShareInfo(noteId: string): Promise<NoteShareInfo | null> {
    const client = sessionStore.activeClient;
    if (!client) return null;
    return client.getNoteShareInfo(noteId);
  }

  async function updateNoteShareSettings(params: {
    objectId: string;
    isPublicEnabled: boolean;
    publicPerm: 'ro' | 'rw';
    addedOrUpdatedMembers: SharedMember[];
    removedMembers: SharedMember[];
  }): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client) return false;
    const ok = await client.updateNoteShareSettings(params);
    if (ok && activeNoteId.value === params.objectId) {
      // Refresh active note's acl
      const updated = await client.getNote(params.objectId);
      if (activeNote.value) {
        activeNote.value.acl = updated.acl;
      }
    }
    return ok;
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
    allTags,
    notes,
    filteredNotes,
    activeNoteId,
    activeNote,
    searchQuery,
    isLoading,
    isCreating,
    isSaving,
    lastSaveTime,
    fetchNotebooks,
    selectNotebook,
    fetchNotes,
    selectNote,
    createNotebook,
    deleteNotebook,
    createNote,
    importNote,
    updateActiveNote,
    deleteActiveNote,
    deleteNote,
    listNoteVersions,
    getNoteVersionContent,
    restoreNoteVersion,
    getNoteShareInfo,
    updateNoteShareSettings,
    reset
  };
});

