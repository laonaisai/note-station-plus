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
import { logger } from '@/services/logger';

export const useNoteStore = defineStore('notes', () => {
  const sessionStore = useSessionStore();

  const notebooks = ref<SynoNotebook[]>([]);
  const activeNotebookId = ref<string | null>(null);

  const notes = ref<SynoNote[]>([]);
  const recycledNotes = ref<SynoNote[]>([]);
  const shortcutIds = ref<Set<string>>(new Set());
  const activeNoteId = ref<string | null>(null);
  const activeNote = ref<SynoNote | null>(null);
  const isLoadingNote = ref<boolean>(false);
  let currentSelectNoteSeq = 0;
  const noteContentCache = new Map<string, SynoNote>();

  const favoriteNotes = computed(() => {
    return notes.value.filter(n => shortcutIds.value.has(n.object_id));
  });

  const encryptedNotes = computed(() => {
    return notes.value.filter(n => !n.recycle && Boolean(n.encrypt));
  });

  const unlockedPasswords = ref<Map<string, string>>(new Map());

  function isNoteUnlocked(noteId: string): boolean {
    return unlockedPasswords.value.has(noteId);
  }

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
  const isSyncingWithServer = ref<boolean>(false);
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
    if (targetId === '__encrypted_notes__') {
      return notes.value.filter(n => !n.recycle && Boolean(n.encrypt)).length;
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
      } else if (activeNotebookId.value === '__encrypted_notes__') {
        list = encryptedNotes.value;
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
    if (activeNotebookId.value === '__encrypted_notes__') {
      return {
        object_id: '__encrypted_notes__',
        title: '加密便签',
        category: 'encrypted',
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

    if (notebookId === '__encrypted_notes__') {
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

      // Auto-select first note if available, or force refresh currently active note
      if (currentNotebookNotes.length > 0) {
        if (!activeNoteId.value || !currentNotebookNotes.some(n => n.object_id === activeNoteId.value)) {
          await selectNote(currentNotebookNotes[0].object_id);
        } else if (forceRefresh && activeNoteId.value) {
          await selectNote(activeNoteId.value, true);
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

  async function selectNote(noteId: string, force = false) {
    const client = sessionStore.activeClient;
    if (!client || !noteId || !sessionStore.activeSessionState?.isLoggedIn) return;

    const seq = ++currentSelectNoteSeq;
    activeNoteId.value = noteId;

    // Check if target note is encrypted
    const targetItem = notes.value.find(n => n.object_id === noteId) || recycledNotes.value.find(n => n.object_id === noteId);
    const isEncrypted = Boolean(targetItem?.encrypt);

    // If encrypted and not yet unlocked in memory, immediately show locked screen without throwing network errors
    if (isEncrypted && !unlockedPasswords.value.has(noteId)) {
      isLoadingNote.value = false;
      activeNote.value = {
        object_id: noteId,
        parent_id: targetItem?.parent_id || '',
        notebook_id: (targetItem as any)?.notebook_id || targetItem?.parent_id || '',
        title: targetItem?.title || '',
        brief: targetItem?.brief || '',
        content: '',
        markdownContent: '',
        ctime: targetItem?.ctime || 0,
        mtime: targetItem?.mtime || 0,
        ver: targetItem?.ver || '',
        tag: targetItem?.tag ? [...targetItem.tag] : [],
        encrypt: true,
        recycle: targetItem?.recycle,
        owner: targetItem?.owner,
        acl: targetItem?.acl
      };
      return;
    }

    // Use memory cache for instant response if available and not forced
    if (!force && noteContentCache.has(noteId)) {
      const cached = noteContentCache.get(noteId)!;
      activeNote.value = { ...cached };
      isLoadingNote.value = false;
      return;
    }

    isLoadingNote.value = true;
    try {
      const storedPassword = unlockedPasswords.value.get(noteId);
      const fullNote = storedPassword
        ? await client.getNote(noteId, undefined, storedPassword)
        : await client.getNote(noteId);
      // Guard against race conditions if user clicked another note while loading
      if (seq !== currentSelectNoteSeq || activeNoteId.value !== noteId) {
        return;
      }
      noteContentCache.set(noteId, { ...fullNote });
      activeNote.value = fullNote;

      // Ensure tags in notes list are up to date
      const item = notes.value.find(n => n.object_id === noteId) || recycledNotes.value.find(n => n.object_id === noteId);
      if (item && fullNote.tag) {
        item.tag = [...fullNote.tag];
      }
    } catch (e) {
      if (seq !== currentSelectNoteSeq || activeNoteId.value !== noteId) {
        return;
      }
      console.error('Failed to get note details', e);
      // Fallback: If getNote fails on recycled note, check recycledNotes cache or content cache
      const cached = recycledNotes.value.find(n => n.object_id === noteId) || noteContentCache.get(noteId);
      if (cached) {
        activeNote.value = { ...cached };
      }
    } finally {
      if (seq === currentSelectNoteSeq) {
        isLoadingNote.value = false;
      }
    }
  }

  /**
   * Synchronizes data with the Synology Note Station server:
   * 1. Fetches latest notebooks from server.
   * 2. Forces re-fetching all notes in the active notebook.
   * 3. Pulls latest active note details from the server to guarantee fresh content.
   */
  async function syncWithServer(): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !sessionStore.activeSessionState?.isLoggedIn) {
      throw new Error('未连接服务器');
    }

    isSyncingWithServer.value = true;
    try {
      await fetchNotebooks();
      await fetchNotes(activeNotebookId.value, true);
      if (activeNoteId.value) {
        await selectNote(activeNoteId.value, true);
      }
      logger.info('sync', 'current_nas', '与当前NAS同步数据成功');
      return true;
    } catch (e) {
      logger.error('sync', 'current_nas', '与当前NAS同步数据失败', e);
      throw e;
    } finally {
      isSyncingWithServer.value = false;
    }
  }

  async function createNotebook(title: string): Promise<SynoNotebook | null> {
    const client = sessionStore.activeClient;
    if (!client) return null;

    try {
      const created = await client.createNotebook(title);
      await fetchNotebooks();
      await selectNotebook(created.object_id);
      logger.info('notebook', 'create', `创建笔记本成功: ${title}`, { notebookId: created.object_id });
      return created;
    } catch (e) {
      logger.error('notebook', 'create', `创建笔记本失败: ${title}`, e);
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
      logger.info('notebook', 'rename', `重命名笔记本成功: ${trimmed}`, { notebookId });
      return true;
    } catch (e) {
      logger.error('notebook', 'rename', `重命名笔记本失败: ${trimmed}`, e, { notebookId });
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
      logger.warn('notebook', 'delete', `删除笔记本`, { notebookId });
      return true;
    } catch (e) {
      logger.error('notebook', 'delete', `删除笔记本失败`, e, { notebookId });
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
      noteContentCache.set(newNote.object_id, { ...newNote });
      notes.value = [newNote, ...notes.value.filter(n => n.object_id !== newNote.object_id)];
      logger.info('note', 'create', `创建新便签: ${newNote.title}`, { noteId: newNote.object_id, notebookId: targetNbId });

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
      const notePassword = unlockedPasswords.value.get(options.updateObjectId);
      await client.updateNote(options.updateObjectId, options.title, options.markdownContent, options.tags, undefined, undefined, notePassword);
      if (activeNoteId.value === options.updateObjectId && activeNote.value) {
        activeNote.value.title = options.title;
        activeNote.value.markdownContent = options.markdownContent;
        if (options.tags) activeNote.value.tag = options.tags;
        noteContentCache.set(options.updateObjectId, { ...activeNote.value });
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
        noteContentCache.set(newNote.object_id, { ...newNote });
        notes.value = [newNote, ...notes.value.filter(n => n.object_id !== newNote.object_id)];
        fetchNotes(options.targetNotebookId).catch(console.error);
        logger.info('note', 'create', `创建新便签: ${newNote.title}`, {
          noteId: newNote.object_id,
          notebookId: options.targetNotebookId
        });
        return newNote;
      } finally {
        isCreating.value = false;
      }
    }
  }

  interface PendingSaveRequest {
    noteId: string;
    title: string;
    markdownContent: string;
    tags?: string[];
    resolvers: Array<(val: boolean) => void>;
    rejecters: Array<(err: any) => void>;
  }

  let activeSavePromise: Promise<boolean> | null = null;
  let pendingSaveRequest: PendingSaveRequest | null = null;

  async function executeSingleSave(
    noteId: string,
    title: string,
    markdownContent: string,
    tags?: string[]
  ): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !activeNote.value || activeNote.value.object_id !== noteId) return false;

    isSaving.value = true;
    try {
      const notePassword = unlockedPasswords.value.get(noteId);
      if (notePassword) {
        await client.updateNote(
          noteId,
          title,
          markdownContent,
          tags,
          activeNote.value.ver,
          activeNote.value.attachment,
          notePassword
        );
      } else {
        await client.updateNote(
          noteId,
          title,
          markdownContent,
          tags,
          activeNote.value.ver,
          activeNote.value.attachment
        );
      }
      activeNote.value.title = title;
      activeNote.value.markdownContent = markdownContent;
      if (client.lastUpdatedVer) {
        activeNote.value.ver = client.lastUpdatedVer;
      }
      if (tags !== undefined) {
        activeNote.value.tag = [...tags];
      }
      noteContentCache.set(activeNote.value.object_id, { ...activeNote.value });

      // Update in note list cache
      const item = notes.value.find(n => n.object_id === noteId);
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
      logger.info('note', 'update', `便签保存成功: ${title}`, {
        noteId,
        ver: client.lastUpdatedVer
      });
      return true;
    } catch (e: any) {
      logger.error('note', 'update', `便签保存失败: ${title}`, e, { noteId });
      throw e;
    }
  }

  async function runSaveLoop(
    targetNoteId: string,
    title: string,
    markdownContent: string,
    tags?: string[]
  ): Promise<boolean> {
    try {
      return await executeSingleSave(targetNoteId, title, markdownContent, tags);
    } finally {
      if (pendingSaveRequest) {
        const next = pendingSaveRequest;
        pendingSaveRequest = null;
        if (activeNoteId.value === next.noteId && activeNote.value) {
          runSaveLoop(next.noteId, next.title, next.markdownContent, next.tags)
            .then(res => {
              next.resolvers.forEach(r => r(res));
            })
            .catch(err => {
              next.rejecters.forEach(rj => rj(err));
            });
        } else {
          next.resolvers.forEach(r => r(true));
          isSaving.value = false;
          activeSavePromise = null;
        }
      } else {
        isSaving.value = false;
        activeSavePromise = null;
      }
    }
  }

  async function updateActiveNote(title: string, markdownContent: string, tags?: string[]): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !activeNote.value || !activeNoteId.value) return false;

    if (isUploadingAttachment.value) {
      throw new Error('正在上传附件中，请稍候保存');
    }

    const currentNoteId = activeNoteId.value;

    // Concurrency queue: if an update is already executing over the wire, queue this save
    if (activeSavePromise) {
      return new Promise<boolean>((resolve, reject) => {
        if (pendingSaveRequest && pendingSaveRequest.noteId === currentNoteId) {
          pendingSaveRequest.title = title;
          pendingSaveRequest.markdownContent = markdownContent;
          if (tags !== undefined) pendingSaveRequest.tags = tags;
          pendingSaveRequest.resolvers.push(resolve);
          pendingSaveRequest.rejecters.push(reject);
        } else {
          pendingSaveRequest = {
            noteId: currentNoteId,
            title,
            markdownContent,
            tags,
            resolvers: [resolve],
            rejecters: [reject]
          };
        }
      });
    }

    activeSavePromise = runSaveLoop(currentNoteId, title, markdownContent, tags);
    return activeSavePromise;
  }

  async function deleteActiveNote(): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !activeNoteId.value || !activeNotebookId.value) return false;

    try {
      await client.deleteNote(activeNoteId.value);
      const targetId = activeNoteId.value;
      const nbId = activeNotebookId.value;
      activeNoteId.value = null;
      activeNote.value = null;
      noteContentCache.delete(targetId);
      await fetchNotes(nbId);
      fetchRecycledNotes().catch(console.error);
      logger.info('note', 'delete', '删除当前便签至回收站', { noteId: targetId });
      return true;
    } catch (e) {
      logger.error('note', 'delete', '删除当前便签失败', e, { noteId: activeNoteId.value });
      throw e;
    }
  }

  async function deleteNote(noteId: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId || !activeNotebookId.value) return false;

    try {
      await client.deleteNote(noteId);
      noteContentCache.delete(noteId);
      if (activeNoteId.value === noteId) {
        activeNoteId.value = null;
        activeNote.value = null;
      }
      await fetchNotes(activeNotebookId.value);
      fetchRecycledNotes().catch(console.error);
      logger.info('note', 'delete', '删除便签至回收站', { noteId });
      return true;
    } catch (e) {
      logger.error('note', 'delete', '删除便签失败', e, { noteId });
      throw e;
    }
  }

  async function restoreNote(noteId: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId) return false;

    try {
      await client.restoreNote(noteId);
      noteContentCache.delete(noteId);
      recycledNotes.value = recycledNotes.value.filter(n => n.object_id !== noteId);
      if (activeNoteId.value === noteId) {
        activeNoteId.value = null;
        activeNote.value = null;
      }
      // Re-fetch notes and notebooks to reflect restored note in its notebook
      await fetchNotes(undefined, true);
      await fetchNotebooks();
      logger.info('note', 'restore', '从回收站还原便签成功', { noteId });
      return true;
    } catch (e) {
      logger.error('note', 'restore', '还原便签失败', e, { noteId });
      throw e;
    }
  }

  async function permanentlyDeleteNote(noteId: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId) return false;

    try {
      await client.permanentlyDeleteNote(noteId);
      noteContentCache.delete(noteId);
      recycledNotes.value = recycledNotes.value.filter(n => n.object_id !== noteId);
      if (activeNoteId.value === noteId) {
        activeNoteId.value = null;
        activeNote.value = null;
      }
      logger.warn('note', 'perm_delete', '彻底删除便签', { noteId });
      return true;
    } catch (e) {
      logger.error('note', 'perm_delete', '彻底删除便签失败', e, { noteId });
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

      logger.info('note', 'move', '移动便签至新笔记本成功', { noteId, targetNotebookId });
      return true;
    } catch (e) {
      logger.error('note', 'move', '移动便签失败', e, { noteId, targetNotebookId });
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
      noteContentCache.set(newNote.object_id, { ...newNote });

      // Update notebooks in background
      fetchNotebooks().catch(console.error);
      logger.info('note', 'copy', `复制便签成功: ${newNote.title}`, { sourceNoteId: noteId, newNoteId: newNote.object_id });
      return newNote;
    } catch (e) {
      logger.error('note', 'copy', '复制便签失败', e, { noteId });
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

  /**
   * Unlock an encrypted note with password.
   * On success, caches decrypted note in memory and stores session password in unlockedPasswords map.
   */
  async function unlockNote(noteId: string, password: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId) throw new Error('未连接服务器');

    isLoadingNote.value = true;
    try {
      const fullNote = await client.getNote(noteId, undefined, password);
      unlockedPasswords.value.set(noteId, password);
      noteContentCache.set(noteId, { ...fullNote });
      if (activeNoteId.value === noteId) {
        activeNote.value = fullNote;
      }
      return true;
    } finally {
      isLoadingNote.value = false;
    }
  }

  /**
   * Lock an unlocked encrypted note, clearing memory cache and password.
   */
  function lockNote(noteId: string) {
    unlockedPasswords.value.delete(noteId);
    noteContentCache.delete(noteId);
    if (activeNoteId.value === noteId && activeNote.value) {
      activeNote.value = {
        ...activeNote.value,
        content: '',
        markdownContent: ''
      };
    }
  }

  /**
   * Encrypt a note with a new password using official API.
   */
  async function encryptCurrentNote(noteId: string, password: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId) throw new Error('未连接服务器');

    await client.encryptNote(noteId, password);
    unlockedPasswords.value.set(noteId, password);

    // Update state in memory
    const updateTarget = (item?: SynoNote) => {
      if (item) {
        item.encrypt = true;
      }
    };
    updateTarget(notes.value.find(n => n.object_id === noteId));
    if (activeNote.value && activeNote.value.object_id === noteId) {
      activeNote.value.encrypt = true;
      noteContentCache.set(noteId, { ...activeNote.value });
    }
    return true;
  }

  /**
   * Change password of an encrypted note.
   */
  async function changeCurrentNotePassword(noteId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId) throw new Error('未连接服务器');

    await client.changeNotePassword(noteId, oldPassword, newPassword);
    unlockedPasswords.value.set(noteId, newPassword);
    return true;
  }

  /**
   * Remove encryption from a note using official API.
   */
  async function removeCurrentNoteEncryption(noteId: string, password: string): Promise<boolean> {
    const client = sessionStore.activeClient;
    if (!client || !noteId) throw new Error('未连接服务器');

    await client.removeNoteEncryption(noteId, password);
    unlockedPasswords.value.delete(noteId);

    const updateTarget = (item?: SynoNote) => {
      if (item) {
        item.encrypt = false;
      }
    };
    updateTarget(notes.value.find(n => n.object_id === noteId));
    if (activeNote.value && activeNote.value.object_id === noteId) {
      activeNote.value.encrypt = false;
      noteContentCache.set(noteId, { ...activeNote.value });
    }
    return true;
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
        noteContentCache.set(targetNoteId, { ...activeNote.value });
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

      logger.info('attachment', 'upload', `上传附件成功: ${filename}`, {
        noteId: targetNoteId,
        fileId,
        filename,
        isImage
      });

      return {
        attachment: result.attachment,
        url: downloadUrl,
        isImage
      };
    } catch (e: any) {
      logger.error('attachment', 'upload', `上传附件失败: ${filename}`, e, { noteId: targetNoteId, filename });
      throw e;
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
          noteContentCache.set(targetNoteId, { ...activeNote.value });
        }
        const listItem = notes.value.find(n => n.object_id === targetNoteId);
        if (listItem) {
          listItem.attachment = (listItem.attachment || []).filter(a => (a.file_id || a.id) !== fileId);
          listItem.ver = res.newVer;
        }
        logger.info('attachment', 'delete', '删除附件成功', { noteId: targetNoteId, fileId });
        return true;
      }
      return false;
    } catch (e: any) {
      logger.error('attachment', 'delete', '删除附件失败', e, { noteId: targetNoteId, fileId });
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
    isLoadingNote.value = false;
    currentSelectNoteSeq = 0;
    noteContentCache.clear();
    unlockedPasswords.value.clear();
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
    encryptedNotes,
    unlockedPasswords,
    isNoteUnlocked,
    filteredNotes,
    activeNoteId,
    activeNote,
    isLoadingNote,
    searchQuery,
    isSearchingServer,
    isLoading,
    isSyncingWithServer,
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
    syncWithServer,
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
    unlockNote,
    lockNote,
    encryptCurrentNote,
    changeCurrentNotePassword,
    removeCurrentNoteEncryption,
    reset
  };
});

