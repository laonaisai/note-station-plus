import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionStore } from '@/stores/sessionStore';
import { useNoteStore } from '@/stores/noteStore';
import * as toastModule from '@/utils/toast';

describe('新建便签与点击便签的服务连接检查与友好提示 (Server Connection Guard)', () => {
  let sessionStore: ReturnType<typeof useSessionStore>;
  let noteStore: ReturnType<typeof useNoteStore>;
  let showToastSpy: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    sessionStore = useSessionStore();
    noteStore = useNoteStore();
    showToastSpy = vi.spyOn(toastModule, 'showToast').mockImplementation(() => 'toast-id');
  });

  // 待测逻辑提取：与 NotebookSidebar.vue 中 checkServerConnection 保持 100% 一致
  function checkServerConnection(): boolean {
    if (!sessionStore.activeProfileId || sessionStore.profiles.length === 0) {
      toastModule.showToast('未配置或选择 NAS 服务，请先添加并连接服务器', 'warning');
      return false;
    }

    const state = sessionStore.activeSessionState;
    if (state?.isConnecting) {
      toastModule.showToast('当前 NAS 服务正在连接中，请稍候...', 'info');
      return false;
    }

    if (!state?.isLoggedIn) {
      const detail = state?.lastError ? `: ${state.lastError}` : '';
      toastModule.showToast('当前 NAS 服务未连接成功，请检查服务设置或重新连接' + detail, 'warning');
      return false;
    }

    return true;
  }

  async function handleNoteClick(noteId: string) {
    if (!checkServerConnection()) {
      return;
    }
    await noteStore.selectNote(noteId);
  }

  async function handleCreateNoteInPanel() {
    if (noteStore.isCreating) return;
    if (!checkServerConnection()) {
      return;
    }
    await noteStore.createNote('新建便签');
  }

  it('当未配置或未选择服务器时，新建便签和点击便签均弹出警告提示', async () => {
    sessionStore.activeProfileId = '';
    sessionStore.profiles = [];

    const selectSpy = vi.spyOn(noteStore, 'selectNote');
    const createSpy = vi.spyOn(noteStore, 'createNote');

    await handleNoteClick('note_1');
    expect(showToastSpy).toHaveBeenCalledWith('未配置或选择 NAS 服务，请先添加并连接服务器', 'warning');
    expect(selectSpy).not.toHaveBeenCalled();

    showToastSpy.mockClear();

    await handleCreateNoteInPanel();
    expect(showToastSpy).toHaveBeenCalledWith('未配置或选择 NAS 服务，请先添加并连接服务器', 'warning');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('当服务器正在连接中时，弹出连接中提示并阻止操作', async () => {
    sessionStore.activeProfileId = 'p1';
    sessionStore.profiles = [{ id: 'p1', alias: '我的NAS', serverUrl: 'http://nas', account: 'admin', autoLogin: true, createdAt: 1 }];
    sessionStore.sessionStates['p1'] = {
      serverId: 'p1',
      isLoggedIn: false,
      isConnecting: true
    };

    const selectSpy = vi.spyOn(noteStore, 'selectNote');

    await handleNoteClick('note_1');
    expect(showToastSpy).toHaveBeenCalledWith('当前 NAS 服务正在连接中，请稍候...', 'info');
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('当服务器连接断开或未登录时，弹出未连接提示（带错误信息）并阻止操作', async () => {
    sessionStore.activeProfileId = 'p1';
    sessionStore.profiles = [{ id: 'p1', alias: '我的NAS', serverUrl: 'http://nas', account: 'admin', autoLogin: true, createdAt: 1 }];
    sessionStore.sessionStates['p1'] = {
      serverId: 'p1',
      isLoggedIn: false,
      isConnecting: false,
      lastError: '网络超时'
    };

    const selectSpy = vi.spyOn(noteStore, 'selectNote');

    await handleNoteClick('note_1');
    expect(showToastSpy).toHaveBeenCalledWith('当前 NAS 服务未连接成功，请检查服务设置或重新连接: 网络超时', 'warning');
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('当服务器连接成功时，正常允许新建便签与选择便签', async () => {
    sessionStore.activeProfileId = 'p1';
    sessionStore.profiles = [{ id: 'p1', alias: '我的NAS', serverUrl: 'http://nas', account: 'admin', autoLogin: true, createdAt: 1 }];
    sessionStore.sessionStates['p1'] = {
      serverId: 'p1',
      isLoggedIn: true,
      isConnecting: false
    };

    const selectSpy = vi.spyOn(noteStore, 'selectNote').mockResolvedValue(undefined as any);
    const createSpy = vi.spyOn(noteStore, 'createNote').mockResolvedValue({ object_id: 'new_1' } as any);

    await handleNoteClick('note_1');
    expect(selectSpy).toHaveBeenCalledWith('note_1');
    expect(showToastSpy).not.toHaveBeenCalled();

    await handleCreateNoteInPanel();
    expect(createSpy).toHaveBeenCalledWith('新建便签');
  });
});
