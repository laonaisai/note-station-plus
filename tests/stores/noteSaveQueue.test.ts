import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { SynoNote } from '@/types/synology';

describe('NoteStore: Save Serialization Queue & Concurrency Mutex', () => {
  let noteStore: ReturnType<typeof useNoteStore>;
  let sessionStore: ReturnType<typeof useSessionStore>;
  let mockClient: any;
  let mockUpdateNote: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    sessionStore = useSessionStore();
    noteStore = useNoteStore();

    mockUpdateNote = vi.fn();
    mockClient = {
      updateNote: mockUpdateNote,
      lastUpdatedVer: 'ver_initial'
    };

    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);

    const initialNote: SynoNote = {
      object_id: 'test_note_123',
      parent_id: 'notebook_1',
      title: '初始标题',
      markdownContent: '初始内容',
      brief: '初始内容',
      content: '<p>初始内容</p>',
      tag: [],
      ver: 'ver_v1',
      ctime: 1000,
      mtime: 1000
    };

    noteStore.notes = [initialNote];
    noteStore.activeNoteId = initialNote.object_id;
    noteStore.activeNote = initialNote;
  });

  it('单次保存应正常调用 updateNote 并更新便签状态与版本号', async () => {
    mockClient.lastUpdatedVer = 'ver_v2';
    mockUpdateNote.mockResolvedValueOnce(true);

    const success = await noteStore.updateActiveNote('新标题', '新内容');
    expect(success).toBe(true);
    expect(mockUpdateNote).toHaveBeenCalledTimes(1);
    expect(mockUpdateNote).toHaveBeenCalledWith(
      'test_note_123',
      '新标题',
      '新内容',
      undefined,
      'ver_v1',
      undefined
    );
    expect(noteStore.activeNote?.title).toBe('新标题');
    expect(noteStore.activeNote?.ver).toBe('ver_v2');
  });

  it('并发发起两次保存时，第二次请求应排队等待前一次完成后以最新版本号执行，避免并发版本冲突', async () => {
    let resolveFirstCall: (val: any) => void = () => {};
    const firstCallPromise = new Promise((resolve) => {
      resolveFirstCall = resolve;
    });

    mockUpdateNote
      .mockImplementationOnce(async () => {
        await firstCallPromise;
        mockClient.lastUpdatedVer = 'ver_v2';
        return true;
      })
      .mockImplementationOnce(async () => {
        mockClient.lastUpdatedVer = 'ver_v3';
        return true;
      });

    // Call 1 starts and hangs on firstCallPromise
    const p1 = noteStore.updateActiveNote('标题1', '内容1');
    expect(noteStore.isSaving).toBe(true);
    expect(mockUpdateNote).toHaveBeenCalledTimes(1);

    // Call 2 starts while Call 1 is in-flight
    const p2 = noteStore.updateActiveNote('标题2 (最新)', '内容2 (最新)');

    // Crucial check: mockUpdateNote should STILL be called only 1 time (not 2 concurrently!)
    expect(mockUpdateNote).toHaveBeenCalledTimes(1);

    // Now resolve Call 1
    resolveFirstCall(true);
    const res1 = await p1;
    expect(res1).toBe(true);

    // Call 2 should now finish automatically
    const res2 = await p2;
    expect(res2).toBe(true);

    // Crucial check: mockUpdateNote was called twice sequentially!
    expect(mockUpdateNote).toHaveBeenCalledTimes(2);

    // Second call must have received 'ver_v2' (the result of call 1), NOT the stale 'ver_v1'!
    expect(mockUpdateNote).toHaveBeenNthCalledWith(
      2,
      'test_note_123',
      '标题2 (最新)',
      '内容2 (最新)',
      undefined,
      'ver_v2',
      undefined
    );

    expect(noteStore.activeNote?.title).toBe('标题2 (最新)');
    expect(noteStore.activeNote?.ver).toBe('ver_v3');
    expect(noteStore.isSaving).toBe(false);
  });

  it('在一次长保存期间发生多次快速修改 (如用户连续键入)，应自动合并为最后一次保存', async () => {
    let resolveInFlight: (val: any) => void = () => {};
    const inFlightPromise = new Promise((resolve) => {
      resolveInFlight = resolve;
    });

    mockUpdateNote
      .mockImplementationOnce(async () => {
        await inFlightPromise;
        mockClient.lastUpdatedVer = 'ver_v2';
        return true;
      })
      .mockImplementationOnce(async () => {
        mockClient.lastUpdatedVer = 'ver_v4';
        return true;
      });

    // In-flight save 1
    const p1 = noteStore.updateActiveNote('标题1', '内容1');

    // While in-flight, rapid saves 2, 3, 4 are fired
    const p2 = noteStore.updateActiveNote('标题2', '内容2');
    const p3 = noteStore.updateActiveNote('标题3', '内容3');
    const p4 = noteStore.updateActiveNote('最终标题', '最终内容');

    expect(mockUpdateNote).toHaveBeenCalledTimes(1);

    // Let in-flight save finish
    resolveInFlight(true);
    await p1;

    // All queued promises should resolve
    const [r2, r3, r4] = await Promise.all([p2, p3, p4]);
    expect(r2).toBe(true);
    expect(r3).toBe(true);
    expect(r4).toBe(true);

    // Total HTTP requests should be exactly 2 (first in-flight + coalesced trailing save)
    expect(mockUpdateNote).toHaveBeenCalledTimes(2);

    // The second call must contain the final state
    expect(mockUpdateNote).toHaveBeenNthCalledWith(
      2,
      'test_note_123',
      '最终标题',
      '最终内容',
      undefined,
      'ver_v2',
      undefined
    );

    expect(noteStore.activeNote?.title).toBe('最终标题');
    expect(noteStore.activeNote?.ver).toBe('ver_v4');
    expect(noteStore.isSaving).toBe(false);
  });
});
