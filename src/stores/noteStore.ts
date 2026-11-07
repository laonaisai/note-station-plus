import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import {
  SynoNotebook,
  SynoNote,
  SynoAttachment,
  NoteVersion,
  NoteShareInfo,
  SharedMember
} from '@/types/synology';
import { useSessionStore } from './sessionStore';
import { isNoteShared } from '@/utils/shareUtils';

export const useNoteStore = defineStore('notes', () => {
  const sessionStore = useSessionStore();

  const notebooks = ref<SynoNotebook[]>([]);
  const activeNotebookId = ref<string | null>(null);

  const notes = ref<SynoNote[]>([]);
  const recycledNotes = ref<SynoNote[]>([]);
  const shortcutIds = ref<Set<string>>(new Set());
  const activeNoteId = ref<string | null>(null);
  const activeNote = ref<SynoNote | null>(null);

  const favoriteNotes = computed(() => {
    return notes.value.filter(n => shortcutIds.value.has(n.object_id));
  });

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
  const selectedTags = ref<string[]>([]);
  const selectedTag = computed<string | null>({
    get: () => (selectedTags.value.length > 0 ? selectedTags.value[0] : null),
    set: (tag: string | null) => {
      selectedTags.value = tag ? [tag] : [];
    }
  });
  const isLoading = ref<boolean>(false);
  const isCreating = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const lastSaveTime = ref<number | null>(null);

  function getNotebookNoteCount(nb: SynoNotebook): number {
    const targetId = String(nb.object_id || nb.notebook_id || '');
    if (targetId === '__all_notes__') {
      return notes.value.filter(n => !n.recycle).length;
    }
    if (targetId === '__shared_notes__') {
      return notes.value.filter(n => !n.recycle && isNoteShared(n)).length;
    }
    if (targetId === '__favorites__') {
      return notes.value.filter(n => !n.recycle && shortcutIds.value.has(n.object_id)).length;
    }
    if (targetId === '__recycle_bin__') {
      return recycledNotes.value.filter(n => Boolean(n.recycle)).length;
    }
    const itemSet = new Set(nb.items?.map(i => String(i)) || []);

    if (notes.value.length > 0) {
      const count = notes.value.filter(n => {
        if (n.recycle) return false;
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

    // Filter by active notebook (if '__all_notes__' is selected, display all notes; if '__shared_notes__', display only shared notes; if '__favorites__', display favorite notes; if '__recycle_bin__', display recycled notes)
    if (activeNotebookId.value && activeNotebookId.value !== '__all_notes__') {
      if (activeNotebookId.value === '__recycle_bin__') {
        list = recycledNotes.value.filter(n => Boolean(n.recycle));
      } else if (activeNotebookId.value === '__favorites__') {
        list = favoriteNotes.value.filter(n => !n.recycle);
      } else if (activeNotebookId.value === '__shared_notes__') {
        list = list.filter(n => !n.recycle && isNoteShared(n));
      } else {
        const targetId = String(activeNotebookId.value);
        const targetNb = notebooks.value.find(nb => String(nb.object_id) === targetId || String(nb.notebook_id || '') === targetId);
        const targetNbItems = new Set(targetNb?.items?.map(i => String(i)) || []);

        list = list.filter(n => {
          if (n.recycle) return false;
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
    } else {
      list = list.filter(n => !n.recycle);
    }

    // Filter by selected tags (multi-select intersection)
    if (selectedTags.value.length > 0) {
      const lowerTags = selectedTags.value.map(t => t.toLowerCase().trim());
      list = list.filter(n => {
        const noteTags = (n.tag || []).map(t => t.toLowerCase().trim());
        return lowerTags.every(lt => noteTags.includes(lt));
      });
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
    if (activeNotebookId.value === '__shared_notes__') {
      return {
        object_id: '__shared_notes__',
        title: '共享便签',
        category: 'shared',
        ctime: 0,
        mtime: 0,
        ver: '',
        preset: true,
        stack: ''
      };
    }
    if (activeNotebookId.value === '__favorites__') {
      return {
        object_id: '__favorites__',
        title: '收藏夹',
        category: 'shortcut',
        ctime: 0,
        mtime: 0,
        ver: '',
        preset: true,
        stack: ''
      };
    }
    if (activeNotebookId.value === '__recycle_bin__') {
      return {
        object_id: '__recycle_bin__',
        title: '回收站',
        category: 'recycle',
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
    const sourceNotes = activeNotebookId.value === '__recycle_bin__' ? recycledNotes.value : notes.value;
    sourceNotes.forEach(n => {
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
      ? (activeNotebookId.value === '__recycle_bin__'
          ? recycledNotes.value
          : activeNotebookId.value === '__favorites__'
            ? favoriteNotes.value
            : activeNotebookId.value === '__shared_notes__'
              ? notes.value.filter(n => isNoteShared(n))
              : notes.value.filter(n => {
                const targetId = String(activeNotebookId.value);
                const targetNb = notebooks.value.find(nb => String(nb.object_id) === targetId || String(nb.notebook_id || '') === targetId);
                const targetNbItems = new Set(targetNb?.items?.map(i => String(i)) || []);
                return String(n.parent_id || '') === targetId || String((n as any).notebook_id || '') === targetId || targetNbItems.has(String(n.object_id));
              }))
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
    if (!tag) {
      selectedTags.value = [];
    } else {
      toggleTag(tag);
    }
  }

  function toggleTag(tag: string) {
    const clean = tag.trim();
    if (!clean) return;
    const idx = selectedTags.value.indexOf(clean);
    if (idx >= 0) {
      selectedTags.value.splice(idx, 1);
    } else {
      selectedTags.value.push(clean);
    }
  }

  function clearTags() {
    selectedTags.value = [];
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

  async function fetchShortcuts() {
    const client = sessionStore.activeClient;
    if (!client || !sessionStore.activeSessionState?.isLoggedIn) return;

    try {
      const res = await client.listShortcuts();
      shortcutIds.value = new Set(res.shortcuts.map(s => s.id));
    } catch (e) {
      console.error('Failed to fetch shortcuts', e);
    }
  }

  async function fetchRecycledNotes() {
    const client = sessionStore.activeClient;
    if (!client || !sessionStore.activeSessionState?.isLoggedIn) return;

    try {
      const res = await client.listAllRecycleNotes();
      recycledNotes.value = res.notes.filter(n => Boolean(n.recycle));
    } catch (e) {
      console.error('Failed to fetch recycled notes', e);
    }
  }

  async function selectNotebook(notebookId: string) {
    activeNotebookId.value = notebookId;
    activeNoteId.value = null;
    activeNote.value = null;

    if (notebookId === '__favorites__') {
      await fetchShortcuts();
      const currentNotes = filteredNotes.value;
      if (currentNotes.length > 0) {
        await selectNote(currentNotes[0].object_id);
      }
      return;
    }

    if (notebookId === '__recycle_bin__') {
      await fetchRecycledNotes();
      const currentNotes = filteredNotes.value;
      if (currentNotes.length > 0) {
        await selectNote(currentNotes[0].object_id);
      }
      return;
    }

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

      // Also refresh recycle notes and shortcuts in background to keep count badge updated
      fetchRecycledNotes().catch(console.error);
      fetchShortcuts().catch(console.error);

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
      const item = notes.value.find(n => n.object_id === noteId) || recycledNotes.value.find(n => n.object_id === noteId);
      if (item && fullNote.tag) {
        item.tag = [...fullNote.tag];
      }
    } catch (e) {
      console.error('Failed to get note details', e);
      // Fallback: If getNote fails on recycled note, check recycledNotes cache
      const cached = recycledNotes.value.find(n => n.object_id === noteId);
      if (cached) {
        activeNote.value = { ...cached };
      }
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

    if (isUploadingAttachment.value) {
      throw new Error('正在上传附件中，请稍候保存');
    }

    isSaving.value = true;
    try {
      await client.updateNote(
        activeNoteId.value,
        title,
        markdownContent,
        tags,
        activeNote.value.ver,
        activeNote.value.attachment
      );
      activeNote.value.title = title;
      activeNote.value.markdownContent = markdownContent;
      if (client.lastUpdatedVer) {
        activeNote.value.ver = client.lastUpdatedVer;
      }
      if (tags !== undefined) {
        activeNote.value.tag = [...tags];
      }

      // Update in note list cache
      const item = notes.value.find(n => n.object_id === activeNoteId.value);
      if (item) {
        item.title = title;
        item.mtime = Math.floor(Date.now() / 1000);
        if (client.lastUpdatedVer) {
          item.ver = client.lastUpdatedVer;
        }
        if (tags !== undefined) {
          item.tag = [...tags];
        }
      }

      lastSaveTime.value = Date.now();
      return true;
    } catch (e) {
      console.error('Failed to save note', e);
      throw e;
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
      fetchRecycledNotes().catch(console.error);
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
      fetchRecycledNotes().catch(console.error);
      return true;
    } catch (e) {
      console.error('Failed to delete note', e);
      throw e;
    }
  }

  async function restoreNote(noteId: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId) return false;

    try {
      await client.restoreNote(noteId);
      recycledNotes.value = recycledNotes.value.filter(n => n.object_id !== noteId);
      if (activeNoteId.value === noteId) {
        activeNoteId.value = null;
        activeNote.value = null;
      }
      // Re-fetch notes and notebooks to reflect restored note in its notebook
      await fetchNotes(undefined, true);
      await fetchNotebooks();
      return true;
    } catch (e) {
      console.error('Failed to restore note', e);
      throw e;
    }
  }

  async function permanentlyDeleteNote(noteId: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId) return false;

    try {
      await client.permanentlyDeleteNote(noteId);
      recycledNotes.value = recycledNotes.value.filter(n => n.object_id !== noteId);
      if (activeNoteId.value === noteId) {
        activeNoteId.value = null;
        activeNote.value = null;
      }
      return true;
    } catch (e) {
      console.error('Failed to permanently delete note', e);
      throw e;
    }
  }

  async function moveNote(noteId: string, targetNotebookId: string): Promise<boolean> {
    const client = sessionStore.getClient() || sessionStore.activeClient;
    if (!client || !noteId || !targetNotebookId) return false;

    try {
      await client.moveNote(noteId, targetNotebookId);

      // Update local note object
      const targetNote = notes.value.find(n => n.object_id === noteId);
      if (targetNote) {
        targetNote.parent_id = targetNotebookId;
        (targetNote as any).notebook_id = targetNotebookId;
      }
      if (activeNote.value && activeNote.value.object_id === noteId) {
        activeNote.value.parent_id = targetNotebookId;
        (activeNote.value as any).notebook_id = targetNotebookId;
      }

      // Refresh notebooks to update items array & count badges
      try {
        const nbs = await client.listNotebooks();
        if (nbs && nbs.length > 0) {
          notebooks.value = nbs;
        }
      } catch (e) {
        console.warn('Failed to refresh notebooks after moveNote', e);
      }

      return true;
    } catch (e) {
      console.error('Failed to move note', e);
      throw e;
    }
  }

  async function copyNote(noteId: string): Promise<SynoNote | null> {
    const client = sessionStore.activeClient;
    if (!client || !noteId) return null;

    try {
      const newNote = await client.copyNote(noteId);
      // Prepend to current notes
      notes.value = [newNote, ...notes.value];
      activeNoteId.value = newNote.object_id;
      activeNote.value = newNote;

      // Update notebooks in background
      fetchNotebooks().catch(console.error);
      return newNote;
    } catch (e) {
      console.error('Failed to copy note', e);
      throw e;
    }
  }

  function isFavorite(noteId: string): boolean {
    return shortcutIds.value.has(noteId);
  }

  async function toggleFavorite(noteId: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId) return false;

    try {
      if (shortcutIds.value.has(noteId)) {
        await client.removeShortcut(noteId);
        const next = new Set(shortcutIds.value);
        next.delete(noteId);
        shortcutIds.value = next;
      } else {
        await client.addShortcut(noteId);
        const next = new Set(shortcutIds.value);
        next.add(noteId);
        shortcutIds.value = next;
      }
      return true;
    } catch (e) {
      console.error('Failed to toggle favorite', e);
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
    if (ok) {
      try {
        // Refresh note acl in local notes list and activeNote
        const updated = await client.getNote(params.objectId);
        const targetNote = notes.value.find(n => n.object_id === params.objectId);
        if (targetNote && updated) {
          targetNote.acl = updated.acl;
        }
        if (activeNote.value && activeNote.value.object_id === params.objectId) {
          activeNote.value.acl = updated.acl;
        }
      } catch (e) {
        console.warn('Failed to refresh updated note acl', e);
      }
    }
    return ok;
  }

  const isUploadingAttachment = ref(false);
  const uploadProgress = ref(0);

  async function uploadAttachmentToActiveNote(
    file: File | Blob,
    filename: string,
    currentEditorMarkdown?: string
  ): Promise<{ attachment: SynoAttachment; url: string; isImage: boolean }> {
    const client = sessionStore.activeClient;
    if (!client) throw new Error('未连接群晖服务器');

    // 1. If currently no activeNote or it's a new unsaved note, ensure it exists on server
    if (!activeNote.value || !activeNoteId.value) {
      const parentId = activeNotebookId.value && !activeNotebookId.value.startsWith('__')
        ? activeNotebookId.value
        : notebooks.value[0]?.object_id;
      if (!parentId) throw new Error('未选择有效笔记本');

      const title = '新建便签 ' + new Date().toLocaleDateString();
      const created = await client.createNote(parentId, title, currentEditorMarkdown || '');
      notes.value.unshift(created);
      activeNoteId.value = created.object_id;
      activeNote.value = created;
    }

    const targetNoteId = activeNote.value.object_id;
    isUploadingAttachment.value = true;
    uploadProgress.value = 0;

    try {
      const result = await client.uploadAttachment(
        targetNoteId,
        file,
        filename,
        (percent) => {
          uploadProgress.value = percent;
        }
      );

      // Update active note attachments & version
      if (activeNote.value && activeNote.value.object_id === targetNoteId) {
        activeNote.value.attachment = result.allAttachments;
        activeNote.value.ver = result.newVer;
      }

      // Also update in notes list
      const listItem = notes.value.find(n => n.object_id === targetNoteId);
      if (listItem) {
        listItem.attachment = result.allAttachments;
        listItem.ver = result.newVer;
      }

      const fileId = result.attachment.file_id || result.attachment.id;
      const downloadUrl = client.getAttachmentDownloadUrl(targetNoteId, fileId, result.attachment.name);
      const isImage = result.attachment.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(result.attachment.name);

      return {
        attachment: result.attachment,
        url: downloadUrl,
        isImage
      };
    } finally {
      isUploadingAttachment.value = false;
      uploadProgress.value = 0;
    }
  }

  async function deleteAttachmentFromActiveNote(fileId: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !activeNote.value) return false;

    const targetNoteId = activeNote.value.object_id;
    try {
      const res = await client.deleteAttachment(targetNoteId, fileId);
      if (res.success) {
        if (activeNote.value && activeNote.value.object_id === targetNoteId) {
          activeNote.value.attachment = (activeNote.value.attachment || []).filter(a => (a.file_id || a.id) !== fileId);
          activeNote.value.ver = res.newVer;
        }
        const listItem = notes.value.find(n => n.object_id === targetNoteId);
        if (listItem) {
          listItem.attachment = (listItem.attachment || []).filter(a => (a.file_id || a.id) !== fileId);
          listItem.ver = res.newVer;
        }
        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Failed to delete attachment', e);
      throw e;
    }
  }

  function reset() {
    notebooks.value = [];
    activeNotebookId.value = null;
    notes.value = [];
    recycledNotes.value = [];
    shortcutIds.value = new Set();
    activeNoteId.value = null;
    activeNote.value = null;
    searchQuery.value = '';
    serverMatchedNoteIds.value = new Set();
    isSearchingServer.value = false;
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
    selectedTags.value = [];
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
    selectedTags,
    selectTag,
    toggleTag,
    clearTags,
    getNotebookNoteCount,
    notes,
    recycledNotes,
    shortcutIds,
    favoriteNotes,
    filteredNotes,
    activeNoteId,
    activeNote,
    searchQuery,
    isSearchingServer,
    isLoading,
    isCreating,
    isSaving,
    lastSaveTime,
    isUploadingAttachment,
    uploadProgress,
    uploadAttachmentToActiveNote,
    deleteAttachmentFromActiveNote,
    fetchNotebooks,
    selectNotebook,
    fetchNotes,
    fetchRecycledNotes,
    fetchShortcuts,
    isFavorite,
    toggleFavorite,
    selectNote,
    createNotebook,
    renameNotebook,
    deleteNotebook,
    createNote,
    copyNote,
    importNote,
    updateActiveNote,
    deleteActiveNote,
    deleteNote,
    restoreNote,
    permanentlyDeleteNote,
    moveNote,
    listNoteVersions,
    getNoteVersionContent,
    restoreNoteVersion,
    getNoteShareInfo,
    updateNoteShareSettings,
    reset
  };
});

