import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import type { SynoNote } from '@/types/synology';

describe('便签加载状态 (isLoadingNote) 与防竞态测试', () => {
  let noteStore: ReturnType<typeof useNoteStore>;
  let sessionStore: ReturnType<typeof useSessionStore>;
  let mockGetNote: any;
  let mockClient: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    sessionStore = useSessionStore();
    noteStore = useNoteStore();

    mockGetNote = vi.fn();
    mockClient = {
      getNote: mockGetNote
    };

    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);
    vi.spyOn(sessionStore, 'activeSessionState', 'get').mockReturnValue({
      serverId: 'test_session',
      isLoggedIn: true,
      isConnecting: false
    } as any);
  });

  it('初始状态下 isLoadingNote 应为 false', () => {
    expect(noteStore.isLoadingNote).toBe(false);
  });

  it('加载便签过程中 isLoadingNote 应为 true，加载完成后为 false', async () => {
    let resolveGetNote: (val: any) => void = () => {};
    const pendingPromise = new Promise(resolve => {
      resolveGetNote = resolve;
    });
    mockGetNote.mockReturnValueOnce(pendingPromise);

    const note1: SynoNote = {
      object_id: 'note_1',
      parent_id: 'nb_1',
      title: '多图超长便签',
      markdownContent: '# Content with multiple images',
      brief: 'Content',
      content: '<p>Content</p>',
      tag: ['tag1'],
      ver: 'v1',
      ctime: 1000,
      mtime: 1000
    };

    const selectPromise = noteStore.selectNote('note_1');

    // 正在请求中，加载状态应为 true
    expect(noteStore.isLoadingNote).toBe(true);
    expect(noteStore.activeNoteId).toBe('note_1');

    // API 返回便签数据
    resolveGetNote(note1);
    await selectPromise;

    // 请求结束，加载状态恢复为 false
    expect(noteStore.isLoadingNote).toBe(false);
    expect(noteStore.activeNote).toEqual(note1);
  });

  it('已加载便签应使用内存缓存秒开，无需重复网络请求', async () => {
    const note1: SynoNote = {
      object_id: 'note_1',
      parent_id: 'nb_1',
      title: '已缓存便签',
      markdownContent: '缓存内容',
      brief: 'brief',
      content: '<p>content</p>',
      tag: [],
      ver: 'v1',
      ctime: 1000,
      mtime: 1000
    };

    mockGetNote.mockResolvedValueOnce(note1);

    // 首次加载，触发 API 请求
    await noteStore.selectNote('note_1');
    expect(mockGetNote).toHaveBeenCalledTimes(1);
    expect(noteStore.activeNote?.title).toBe('已缓存便签');

    // 切换到另一个便签
    const note2: SynoNote = {
      object_id: 'note_2',
      parent_id: 'nb_1',
      title: '第二篇便签',
      markdownContent: '第二篇内容',
      brief: 'brief',
      content: '<p>content</p>',
      tag: [],
      ver: 'v1',
      ctime: 1000,
      mtime: 1000
    };
    mockGetNote.mockResolvedValueOnce(note2);
    await noteStore.selectNote('note_2');
    expect(mockGetNote).toHaveBeenCalledTimes(2);

    // 再次点击 note_1，直接从缓存加载，不再发起 getNote 请求
    await noteStore.selectNote('note_1');
    expect(mockGetNote).toHaveBeenCalledTimes(2); // 保持为 2，未增加
    expect(noteStore.activeNote?.title).toBe('已缓存便签');
    expect(noteStore.isLoadingNote).toBe(false);
  });

  it('强制刷新 (force=true) 应绕过缓存并重新请求 API', async () => {
    const note1: SynoNote = {
      object_id: 'note_1',
      parent_id: 'nb_1',
      title: '便签版本1',
      markdownContent: '内容1',
      brief: 'brief',
      content: '<p>content</p>',
      tag: [],
      ver: 'v1',
      ctime: 1000,
      mtime: 1000
    };
    mockGetNote.mockResolvedValueOnce(note1);
    await noteStore.selectNote('note_1');
    expect(mockGetNote).toHaveBeenCalledTimes(1);

    const note1Updated: SynoNote = {
      ...note1,
      title: '便签版本2 (服务端更新)',
      ver: 'v2'
    };
    mockGetNote.mockResolvedValueOnce(note1Updated);

    // 强制刷新
    await noteStore.selectNote('note_1', true);
    expect(mockGetNote).toHaveBeenCalledTimes(2);
    expect(noteStore.activeNote?.title).toBe('便签版本2 (服务端更新)');
  });

  it('并发连续点击多篇便签时，应防范竞态条件，保证最终激活的是最后点击的便签', async () => {
    let resolveNoteA: (val: any) => void = () => {};
    let resolveNoteB: (val: any) => void = () => {};

    const promiseA = new Promise(resolve => {
      resolveNoteA = resolve;
    });
    const promiseB = new Promise(resolve => {
      resolveNoteB = resolve;
    });

    mockGetNote.mockImplementation((id: string) => {
      if (id === 'note_A') return promiseA;
      if (id === 'note_B') return promiseB;
      return Promise.reject(new Error('Unknown note'));
    });

    // 用户先点击了 Note A（慢请求，包含大量图片）
    const selectAPromise = noteStore.selectNote('note_A');
    expect(noteStore.isLoadingNote).toBe(true);
    expect(noteStore.activeNoteId).toBe('note_A');

    // 用户随后立即点击了 Note B（用户改变主意）
    const selectBPromise = noteStore.selectNote('note_B');
    expect(noteStore.activeNoteId).toBe('note_B');

    // Note B 率先返回
    const noteBData: SynoNote = {
      object_id: 'note_B',
      parent_id: 'nb_1',
      title: '便签 B',
      markdownContent: '便签 B 内容',
      brief: '',
      content: '',
      tag: [],
      ver: 'v1',
      ctime: 1000,
      mtime: 1000
    };
    resolveNoteB(noteBData);
    await selectBPromise;

    expect(noteStore.activeNoteId).toBe('note_B');
    expect(noteStore.activeNote?.title).toBe('便签 B');
    expect(noteStore.isLoadingNote).toBe(false);

    // Note A 慢请求最终返回，由于序列号已过期，不应覆盖 Note B
    const noteAData: SynoNote = {
      object_id: 'note_A',
      parent_id: 'nb_1',
      title: '便签 A (迟到的慢响应)',
      markdownContent: '慢内容',
      brief: '',
      content: '',
      tag: [],
      ver: 'v1',
      ctime: 1000,
      mtime: 1000
    };
    resolveNoteA(noteAData);
    await selectAPromise;

    // 验证：当前便签仍然是 Note B，未被 Note A 覆盖
    expect(noteStore.activeNoteId).toBe('note_B');
    expect(noteStore.activeNote?.title).toBe('便签 B');
    expect(noteStore.isLoadingNote).toBe(false);
  });
});
