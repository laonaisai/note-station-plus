import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import type { SynoNotebook, SynoNote } from '@/types/synology';

// Mock localStorage for Node test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('按服务记忆活动笔记本及便签 (Server Active State Persistence)', () => {
  let noteStore: ReturnType<typeof useNoteStore>;
  let sessionStore: ReturnType<typeof useSessionStore>;
  let mockClient: any;

  const mockNotebooksServer1: SynoNotebook[] = [
    { object_id: 'nb_s1_1', title: '服务器1-工作笔记', category: 'normal', ctime: 1, mtime: 1, ver: '1', items: ['note_s1_1', 'note_s1_2'], preset: false, stack: '' },
    { object_id: 'nb_s1_2', title: '服务器1-个人随笔', category: 'normal', ctime: 1, mtime: 1, ver: '1', items: ['note_s1_3'], preset: false, stack: '' }
  ];

  const mockNotesServer1: SynoNote[] = [
    { object_id: 'note_s1_1', parent_id: 'nb_s1_1', title: '工作便签1', content: '<p>1</p>', brief: '1', ver: '1', tag: [], ctime: 1, mtime: 1 },
    { object_id: 'note_s1_2', parent_id: 'nb_s1_1', title: '工作便签2', content: '<p>2</p>', brief: '2', ver: '1', tag: [], ctime: 2, mtime: 2 },
    { object_id: 'note_s1_3', parent_id: 'nb_s1_2', title: '生活便签1', content: '<p>3</p>', brief: '3', ver: '1', tag: [], ctime: 3, mtime: 3 }
  ];

  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    sessionStore = useSessionStore();
    noteStore = useNoteStore();

    mockClient = {
      listNotebooks: vi.fn().mockResolvedValue(mockNotebooksServer1),
      listAllNotes: vi.fn().mockResolvedValue({ notes: mockNotesServer1, total: 3 }),
      listShortcuts: vi.fn().mockResolvedValue({ shortcuts: [] }),
      listAllRecycleNotes: vi.fn().mockResolvedValue({ notes: [] }),
      getNote: vi.fn().mockImplementation((id: string) => {
        const found = mockNotesServer1.find(n => n.object_id === id);
        return Promise.resolve(found || mockNotesServer1[0]);
      })
    };

    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);
    vi.spyOn(sessionStore, 'activeSessionState', 'get').mockReturnValue({
      serverId: 'server_profile_1',
      isLoggedIn: true,
      isConnecting: false
    } as any);
  });

  it('第一次进入时默认选择第1个笔记本和第1篇便签，并保存记忆', async () => {
    sessionStore.activeProfileId = 'server_profile_1';
    await noteStore.fetchNotebooks();

    expect(noteStore.activeNotebookId).toBe('nb_s1_1');
    expect(noteStore.activeNoteId).toBe('note_s1_1');

    const saved = JSON.parse(localStorage.getItem('note_station_server_last_active') || '{}');
    expect(saved['server_profile_1']).toEqual({
      notebookId: 'nb_s1_1',
      noteId: 'note_s1_1'
    });
  });

  it('切换笔记本和便签后更新记忆；切换服务再切回能自动恢复', async () => {
    sessionStore.activeProfileId = 'server_profile_1';
    await noteStore.fetchNotebooks();

    // 用户在 server 1 选中了个人随笔和生活便签 1
    await noteStore.selectNotebook('nb_s1_2');
    await noteStore.selectNote('note_s1_3');

    expect(noteStore.activeNotebookId).toBe('nb_s1_2');
    expect(noteStore.activeNoteId).toBe('note_s1_3');

    const saved = JSON.parse(localStorage.getItem('note_station_server_last_active') || '{}');
    expect(saved['server_profile_1']).toEqual({
      notebookId: 'nb_s1_2',
      noteId: 'note_s1_3'
    });

    // 模拟用户切换到 server 2 并重置 noteStore
    noteStore.reset();
    sessionStore.activeProfileId = 'server_profile_2';

    // 在 server 2 设置记忆
    saved['server_profile_2'] = { notebookId: 'nb_s2_other', noteId: 'note_s2_other' };
    localStorage.setItem('note_station_server_last_active', JSON.stringify(saved));

    // 用户切换回 server 1
    noteStore.reset();
    sessionStore.activeProfileId = 'server_profile_1';
    await noteStore.fetchNotebooks();

    // 验证：自动恢复为 server 1 上次打开的 nb_s1_2 和 note_s1_3
    expect(noteStore.activeNotebookId).toBe('nb_s1_2');
    expect(noteStore.activeNoteId).toBe('note_s1_3');
  });

  it('当记忆的便签已不存在时，优雅回退到该笔记本的第1篇便签', async () => {
    sessionStore.activeProfileId = 'server_profile_1';
    // 写入一个不存在的 noteId
    localStorage.setItem('note_station_server_last_active', JSON.stringify({
      server_profile_1: {
        notebookId: 'nb_s1_1',
        noteId: 'deleted_note_id'
      }
    }));

    await noteStore.fetchNotebooks();

    expect(noteStore.activeNotebookId).toBe('nb_s1_1');
    expect(noteStore.activeNoteId).toBe('note_s1_1');
  });

  it('支持记忆特殊标签分类（如收藏夹 __favorites__）', async () => {
    sessionStore.activeProfileId = 'server_profile_1';
    localStorage.setItem('note_station_server_last_active', JSON.stringify({
      server_profile_1: {
        notebookId: '__favorites__',
        noteId: 'note_s1_2'
      }
    }));

    mockClient.listShortcuts.mockResolvedValueOnce({
      shortcuts: [{ id: 'note_s1_2' }]
    });

    await noteStore.fetchNotebooks();

    expect(noteStore.activeNotebookId).toBe('__favorites__');
    expect(noteStore.activeNoteId).toBe('note_s1_2');
  });
});
