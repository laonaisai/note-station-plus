import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
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
  const serverMatchedNoteIds = ref<Set<string>>(new Set());
  const isSearchingServer = ref<boolean>(false);
  let searchDebounceTimer: any = null;

  async function performServerSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      serverMatchedNoteIds.value = new Set();
      isSearchingServer.value = false;
      return;
    }

    const client = sessionStore.activeClient;
    if (!client || !sessionStore.activeSessionState?.isLoggedIn) return;

    isSearchingServer.value = true;
    try {
      const matches = await client.searchNotes(trimmed);
      if (searchQuery.value.trim() === trimmed) {
        serverMatchedNoteIds.value = new Set(matches.map(m => m.object_id));

        // If any matched notes were not yet present in notes.value, dynamically append them
        const existingIds = new Set(notes.value.map(n => n.object_id));
        const newNotes = matches.filter(m => !existingIds.has(m.object_id));
        if (newNotes.length > 0) {
          notes.value = [...notes.value, ...newNotes];
        }
      }
    } catch (e) {
      console.warn('Server FTS search failed, falling back to local search', e);
    } finally {
      if (searchQuery.value.trim() === trimmed) {
        isSearchingServer.value = false;
      }
    }
  }

  // Watch searchQuery and debounce server full-text search
  watch(searchQuery, (newQuery) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    const trimmed = newQuery.trim();
    if (!trimmed) {
      serverMatchedNoteIds.value = new Set();
      isSearchingServer.value = false;
      return;
    }

    searchDebounceTimer = setTimeout(() => {
      performServerSearch(trimmed);
    }, 250);
  });
  const selectedTag = ref<string | null>(null);
  const isLoading = ref<boolean>(false);
  const isCreating = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const lastSaveTime = ref<number | null>(null);

  function getNotebookNoteCount(nb: SynoNotebook): number {
    const targetId = String(nb.object_id || nb.notebook_id || '');
    if (targetId === '__all_notes__') {
      return notes.value.length;
    }
    const itemSet = new Set(nb.items?.map(i => String(i)) || []);

    if (notes.value.length > 0) {
      const count = notes.value.filter(n => {
        const pId = String(n.parent_id || '');
        const nbId = String((n as any).notebook_id || '');
        const oId = String(n.object_id || '');
        return pId === targetId || nbId === targetId || itemSet.has(oId);
      }).length;
      return Math.max(count, nb.items?.length || 0);
    }
    return nb.items?.length || 0;
  }

  const filteredNotes = computed(() => {
    let list = notes.value;

    // Filter by active notebook (if '__all_notes__' is selected, display all notes)
    if (activeNotebookId.value && activeNotebookId.value !== '__all_notes__') {
      const targetId = String(activeNotebookId.value);
      const targetNb = notebooks.value.find(nb => String(nb.object_id) === targetId || String(nb.notebook_id || '') === targetId);
      const targetNbItems = new Set(targetNb?.items?.map(i => String(i)) || []);

      list = list.filter(n => {
        const noteParentId = String(n.parent_id || '');
        const noteNbId = String((n as any).notebook_id || '');
        const noteId = String(n.object_id || '');

        return (
          noteParentId === targetId ||
          noteNbId === targetId ||
          targetNbItems.has(noteId)
        );
      });
    }

    // Filter by selected tag
    if (selectedTag.value) {
      const tagFilter = selectedTag.value.toLowerCase().trim();
      list = list.filter(n =>
        (n.tag || []).some(t => t.toLowerCase().trim() === tagFilter)
      );
    }

    if (!searchQuery.value.trim()) return list;
    const q = searchQuery.value.toLowerCase().trim();
    const serverIds = serverMatchedNoteIds.value;

    return list.filter(n => {
      // 1. Matched by server-side Full-Text Search (SYNO.NoteStation.FTS)
      if (serverIds.has(n.object_id)) {
        return true;
      }

      // 2. Note title match
      if (n.title.toLowerCase().includes(q)) {
        return true;
      }

      // 3. Note tags match
      if ((n.tag || []).some(t => t.toLowerCase().includes(q))) {
        return true;
      }

      // 4. Note brief / summary match
      if (n.brief && n.brief.toLowerCase().includes(q)) {
        return true;
      }

      // 5. Note cached markdown or html content match
      if (n.markdownContent && n.markdownContent.toLowerCase().includes(q)) {
        return true;
      }
      if (n.content && n.content.toLowerCase().includes(q)) {
        return true;
      }

      return false;
    });
  });

  const activeNotebook = computed(() => {
    if (activeNotebookId.value === '__all_notes__') {
      return {
        object_id: '__all_notes__',
        title: '全部笔记',
        category: 'all',
        ctime: 0,
        mtime: 0,
        ver: '',
        preset: true,
        stack: ''
      };
    }
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

  const tagListWithCounts = computed<{ name: string; count: number }[]>(() => {
    const tagCountMap = new Map<string, number>();

    // Calculate tag counts for notes in current notebook (or all notes if no notebook selected)
    const targetNotes = (activeNotebookId.value && activeNotebookId.value !== '__all_notes__')
      ? notes.value.filter(n => {
          const targetId = String(activeNotebookId.value);
          const targetNb = notebooks.value.find(nb => String(nb.object_id) === targetId || String(nb.notebook_id || '') === targetId);
          const targetNbItems = new Set(targetNb?.items?.map(i => String(i)) || []);
          return String(n.parent_id || '') === targetId || String((n as any).notebook_id || '') === targetId || targetNbItems.has(String(n.object_id));
        })
      : notes.value;

    for (const note of targetNotes) {
      for (const t of note.tag || []) {
        const cleanTag = t?.trim();
        if (cleanTag) {
          tagCountMap.set(cleanTag, (tagCountMap.get(cleanTag) || 0) + 1);
        }
      }
    }

    // Also include any other tags from the whole account so users can see all available tags
    for (const note of notes.value) {
      for (const t of note.tag || []) {
        const cleanTag = t?.trim();
        if (cleanTag && !tagCountMap.has(cleanTag)) {
          tagCountMap.set(cleanTag, 0);
        }
      }
    }

    return Array.from(tagCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  function selectTag(tag: string | null) {
    if (selectedTag.value === tag) {
      selectedTag.value = null; // Toggle off if clicked again
    } else {
      selectedTag.value = tag;
    }
  }

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

    if (notes.value.length === 0) {
      await fetchNotes(notebookId);
    } else {
      // Notes already cached in memory: instantly auto-select first note in this notebook
      const currentNotebookNotes = filteredNotes.value;
      if (currentNotebookNotes.length > 0) {
        await selectNote(currentNotebookNotes[0].object_id);
      }
    }
  }

  async function fetchNotes(targetNotebookId?: string | null, forceRefresh = true) {
    const client = sessionStore.activeClient;
    if (!client || !sessionStore.activeSessionState?.isLoggedIn) return;

    if (targetNotebookId) {
      activeNotebookId.value = targetNotebookId;
    }

    if (notes.value.length > 0 && !forceRefresh) {
      const currentNotebookNotes = filteredNotes.value;
      if (currentNotebookNotes.length > 0 && (!activeNoteId.value || !currentNotebookNotes.some(n => n.object_id === activeNoteId.value))) {
        await selectNote(currentNotebookNotes[0].object_id);
      }
      return;
    }

    isLoading.value = true;
    try {
      // Use listAllNotes with pagination loop so that all notes across the account are completely loaded
      const res = await client.listAllNotes();
      notes.value = res.notes;

      // Filter notes for the active notebook
      const currentNotebookNotes = filteredNotes.value;

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

  async function renameNotebook(notebookId: string, newTitle: string): Promise<boolean> {
    const client = sessionStore.getClient() || sessionStore.activeClient;
    const trimmed = newTitle.trim();
    if (!client || !trimmed) return false;

    try {
      await client.renameNotebook(notebookId, trimmed);
      // Immediately update local title in state for snappy UI
      const target = notebooks.value.find(nb => nb.object_id === notebookId || (nb as any).notebook_id === notebookId);
      if (target) {
        target.title = trimmed;
      }
      return true;
    } catch (e) {
      console.error('Failed to rename notebook', e);
      throw e;
    }
  }

  async function deleteNotebook(notebookId: string): Promise<boolean> {
    const client = sessionStore.getClient() || sessionStore.activeClient;
    if (!client) return false;

    try {
      await client.deleteNotebook(notebookId);

      // Clean up notes in memory that belonged to this notebook
      notes.value = notes.value.filter(n => {
        const pId = String(n.parent_id || '');
        const nbId = String((n as any).notebook_id || '');
        return pId !== notebookId && nbId !== notebookId;
      });

      // If active notebook was deleted, reset selection
      if (activeNotebookId.value === notebookId) {
        activeNotebookId.value = null;
        activeNoteId.value = null;
        activeNote.value = null;
      }

      await fetchNotebooks();
      await fetchNotes(undefined, true);
      return true;
    } catch (e) {
      console.error('Failed to delete notebook', e);
      throw e;
    }
  }

  async function createNote(title = '无标题便签', initialMarkdown = '', tags: string[] = []): Promise<SynoNote | null> {
    const client = sessionStore.activeClient;
    const targetNbId = (activeNotebookId.value && activeNotebookId.value !== '__all_notes__')
      ? activeNotebookId.value
      : notebooks.value[0]?.object_id;

    if (!client || !targetNbId) return null;

    isCreating.value = true;
    try {
      const newNote = await client.createNote(targetNbId, title, initialMarkdown, tags);
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
    searchQuery.value = '';
    serverMatchedNoteIds.value = new Set();
    isSearchingServer.value = false;
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
    selectedTag.value = null;
    isLoading.value = false;
    isCreating.value = false;
    isSaving.value = false;
    lastSaveTime.value = null;
  }

  return {
    notebooks,
    activeNotebookId,
    activeNotebook,
    allTags,
    tagListWithCounts,
    selectedTag,
    selectTag,
    getNotebookNoteCount,
    notes,
    filteredNotes,
    activeNoteId,
    activeNote,
    searchQuery,
    isSearchingServer,
    isLoading,
    isCreating,
    isSaving,
    lastSaveTime,
    fetchNotebooks,
    selectNotebook,
    fetchNotes,
    selectNote,
    createNotebook,
    renameNotebook,
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

