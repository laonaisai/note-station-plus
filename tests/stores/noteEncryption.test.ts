import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { SynoNote } from '@/types/synology';

describe('Note Encryption (便签加密、解锁、改密与解密全链路测试)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('1. encryptedNotes 计算属性与分类统计能够正确过滤加密便签', () => {
    const noteStore = useNoteStore();

    const sampleNotes: SynoNote[] = [
      {
        object_id: 'note_1',
        parent_id: 'nb_1',
        title: '普通便签 1',
        brief: '普通便签内容',
        content: '<p>普通便签内容</p>',
        ctime: 1700000000,
        mtime: 1700000000,
        ver: '1',
        tag: []
      },
      {
        object_id: 'note_2_encrypted',
        parent_id: 'nb_1',
        title: '机密便签 2',
        brief: '机密内容',
        content: '',
        encrypt: true,
        ctime: 1700000100,
        mtime: 1700000100,
        ver: '1',
        tag: []
      },
      {
        object_id: 'note_3_encrypted_recycled',
        parent_id: 'nb_1',
        title: '回收站里的加密便签',
        brief: '机密',
        content: '',
        encrypt: true,
        recycle: true,
        ctime: 1700000200,
        mtime: 1700000200,
        ver: '1',
        tag: []
      }
    ];

    noteStore.notes = sampleNotes;

    // encryptedNotes 应该只包含未回收的 note_2_encrypted
    expect(noteStore.encryptedNotes.length).toBe(1);
    expect(noteStore.encryptedNotes[0].object_id).toBe('note_2_encrypted');

    // 统计数量检查
    expect(noteStore.getNotebookNoteCount({ object_id: '__encrypted_notes__' } as any)).toBe(1);
    expect(noteStore.getNotebookNoteCount({ object_id: '__all_notes__' } as any)).toBe(2);

    // 选中 __encrypted_notes__ 时的过滤列表
    noteStore.activeNotebookId = '__encrypted_notes__';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('note_2_encrypted');
  });

  it('2. 选定未解锁的加密便签时立即进入锁定状态，正文为空且不发未授权请求', async () => {
    const sessionStore = useSessionStore();
    const noteStore = useNoteStore();

    sessionStore.sessionStates['srv_1'] = {
      serverId: 'srv_1',
      isLoggedIn: true,
      isConnecting: false
    };
    sessionStore.activeProfileId = 'srv_1';

    const mockGetNote = vi.fn();
    const mockClient = {
      getNote: mockGetNote
    };
    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);

    noteStore.notes = [
      {
        object_id: 'enc_note_1',
        parent_id: 'nb_1',
        title: '受保护日记',
        brief: '日记摘要',
        content: '',
        encrypt: true,
        ctime: 1700000000,
        mtime: 1700000000,
        ver: '1',
        tag: []
      }
    ];

    await noteStore.selectNote('enc_note_1');

    expect(noteStore.activeNoteId).toBe('enc_note_1');
    expect(noteStore.activeNote).not.toBeNull();
    expect(noteStore.activeNote?.title).toBe('受保护日记');
    expect(noteStore.activeNote?.content).toBe('');
    expect(noteStore.activeNote?.markdownContent).toBe('');
    expect(noteStore.isNoteUnlocked('enc_note_1')).toBe(false);

    // 未输入密码前不应触发远程 getNote
    expect(mockGetNote).not.toHaveBeenCalled();
  });

  it('3. 输入密码调用 unlockNote 解锁成功后缓存密码并在内存中加载解密内容', async () => {
    const sessionStore = useSessionStore();
    const noteStore = useNoteStore();

    sessionStore.sessionStates['srv_1'] = {
      serverId: 'srv_1',
      isLoggedIn: true,
      isConnecting: false
    };
    sessionStore.activeProfileId = 'srv_1';

    const decryptedNote: SynoNote = {
      object_id: 'enc_note_1',
      parent_id: 'nb_1',
      title: '受保护日记',
      brief: '日记摘要',
      content: '<p>解密后的私密Markdown正文</p>',
      markdownContent: '解密后的私密Markdown正文',
      encrypt: true,
      ctime: 1700000000,
      mtime: 1700000000,
      ver: '1',
      tag: ['机密']
    };

    const mockGetNote = vi.fn().mockImplementation((id: string, ver?: string, pwd?: string) => {
      if (pwd === 'correct_pwd_123') {
        return Promise.resolve(decryptedNote);
      }
      return Promise.reject(new Error('群晖错误 1016: 密码错误'));
    });

    const mockClient = {
      getNote: mockGetNote
    };
    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);

    noteStore.notes = [
      {
        object_id: 'enc_note_1',
        parent_id: 'nb_1',
        title: '受保护日记',
        brief: '日记摘要',
        content: '',
        encrypt: true,
        ctime: 1700000000,
        mtime: 1700000000,
        ver: '1',
        tag: []
      }
    ];

    await noteStore.selectNote('enc_note_1');
    expect(noteStore.isNoteUnlocked('enc_note_1')).toBe(false);

    // 错误密码解锁失败
    await expect(noteStore.unlockNote('enc_note_1', 'wrong_pwd')).rejects.toThrow('密码错误');
    expect(noteStore.isNoteUnlocked('enc_note_1')).toBe(false);

    // 正确密码解锁成功
    const ok = await noteStore.unlockNote('enc_note_1', 'correct_pwd_123');
    expect(ok).toBe(true);
    expect(noteStore.isNoteUnlocked('enc_note_1')).toBe(true);
    expect(noteStore.activeNote?.markdownContent).toBe('解密后的私密Markdown正文');

    // 再次调用 selectNote 时利用内存密码自动获取
    mockGetNote.mockClear();
    await noteStore.selectNote('enc_note_1', true);
    expect(mockGetNote).toHaveBeenCalledWith('enc_note_1', undefined, 'correct_pwd_123');

    // 调用 lockNote 重新锁定
    noteStore.lockNote('enc_note_1');
    expect(noteStore.isNoteUnlocked('enc_note_1')).toBe(false);
    expect(noteStore.activeNote?.markdownContent).toBe('');
  });

  it('4. encryptCurrentNote, changeCurrentNotePassword, removeCurrentNoteEncryption 调用官方API并同步状态', async () => {
    const sessionStore = useSessionStore();
    const noteStore = useNoteStore();

    sessionStore.sessionStates['srv_1'] = {
      serverId: 'srv_1',
      isLoggedIn: true,
      isConnecting: false
    };
    sessionStore.activeProfileId = 'srv_1';

    const mockEncryptNote = vi.fn().mockResolvedValue(true);
    const mockChangePassword = vi.fn().mockResolvedValue(true);
    const mockRemoveEncryption = vi.fn().mockResolvedValue(true);

    const mockClient = {
      encryptNote: mockEncryptNote,
      changeNotePassword: mockChangePassword,
      removeNoteEncryption: mockRemoveEncryption
    };
    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);

    const plainNote: SynoNote = {
      object_id: 'plain_note_1',
      parent_id: 'nb_1',
      title: '普通便签',
      brief: '摘要',
      content: '<p>正文</p>',
      markdownContent: '正文',
      encrypt: false,
      ctime: 1700000000,
      mtime: 1700000000,
      ver: '1',
      tag: []
    };
    noteStore.notes = [{ ...plainNote }];
    noteStore.activeNote = { ...plainNote };
    noteStore.activeNoteId = 'plain_note_1';

    // 1. 加密便签
    await noteStore.encryptCurrentNote('plain_note_1', 'my_secret_999');
    expect(mockEncryptNote).toHaveBeenCalledWith('plain_note_1', 'my_secret_999');
    expect(noteStore.activeNote?.encrypt).toBe(true);
    expect(noteStore.notes[0].encrypt).toBe(true);
    expect(noteStore.isNoteUnlocked('plain_note_1')).toBe(true);

    // 2. 修改密码
    await noteStore.changeCurrentNotePassword('plain_note_1', 'my_secret_999', 'new_secret_888');
    expect(mockChangePassword).toHaveBeenCalledWith('plain_note_1', 'my_secret_999', 'new_secret_888');
    expect(noteStore.unlockedPasswords.get('plain_note_1')).toBe('new_secret_888');

    // 3. 解除加密
    await noteStore.removeCurrentNoteEncryption('plain_note_1', 'new_secret_888');
    expect(mockRemoveEncryption).toHaveBeenCalledWith('plain_note_1', 'new_secret_888');
    expect(noteStore.activeNote?.encrypt).toBe(false);
    expect(noteStore.notes[0].encrypt).toBe(false);
    expect(noteStore.isNoteUnlocked('plain_note_1')).toBe(false);
  });

  it('5. 保存已解锁的加密便签时自动带上已保存密码', async () => {
    const sessionStore = useSessionStore();
    const noteStore = useNoteStore();

    sessionStore.sessionStates['srv_1'] = {
      serverId: 'srv_1',
      isLoggedIn: true,
      isConnecting: false
    };
    sessionStore.activeProfileId = 'srv_1';

    const mockUpdateNote = vi.fn().mockResolvedValue(true);
    const mockClient = {
      updateNote: mockUpdateNote
    };
    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);

    const encNote: SynoNote = {
      object_id: 'enc_save_note',
      parent_id: 'nb_1',
      title: '私密便签',
      brief: '摘要',
      content: '<p>正文</p>',
      markdownContent: '正文',
      encrypt: true,
      ctime: 1700000000,
      mtime: 1700000000,
      ver: 'v1',
      tag: []
    };

    noteStore.notes = [{ ...encNote }];
    noteStore.activeNote = { ...encNote };
    noteStore.activeNoteId = 'enc_save_note';
    noteStore.unlockedPasswords.set('enc_save_note', 'saved_pass_456');

    await noteStore.updateActiveNote('私密便签更新', '新私密内容');

    expect(mockUpdateNote).toHaveBeenCalledWith(
      'enc_save_note',
      '私密便签更新',
      '新私密内容',
      undefined,
      'v1',
      undefined,
      'saved_pass_456'
    );
  });
});
