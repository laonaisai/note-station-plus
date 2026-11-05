import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSyncStore } from '@/stores/syncStore';
import { useSessionStore } from '@/stores/sessionStore';
import { SynoNote } from '@/types/synology';

describe('syncStore: 跨服务便签同步 (含标签同步) 单元测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('同步便签时，无论目标服务是新建还是更新，都将源便签的标签完整同步过去', async () => {
    const sessionStore = useSessionStore();
    const syncStore = useSyncStore();

    // 配置目标服务 profile
    sessionStore.profiles = [
      {
        id: 'target-server-1',
        alias: '目标NAS服务',
        serverUrl: 'http://192.168.1.100:5000',
        account: 'user1',
        password: 'pwd',
        createdAt: Date.now()
      }
    ];
    sessionStore.sessionStates['target-server-1'] = {
      serverId: 'target-server-1',
      isLoggedIn: true,
      isConnecting: false,
      sid: 'mock-sid'
    };

    let createdNotePayload: any = null;
    let updatedNotePayload: any = null;

    const mockTargetClient = {
      sid: 'mock-sid',
      listNotebooks: vi.fn().mockResolvedValue([
        { object_id: 'nb_target_default', title: '我的笔记本' }
      ]),
      listNotes: vi.fn().mockImplementation(async () => {
        // 第一轮返回空列表（触发新建）
        return { notes: [], total: 0 };
      }),
      createNote: vi.fn().mockImplementation(async (nbId, title, content, tags) => {
        createdNotePayload = { nbId, title, content, tags };
        return {
          object_id: 'created_note_1',
          title,
          markdownContent: content,
          tag: tags
        };
      }),
      updateNote: vi.fn().mockImplementation(async (noteId, title, content, tags) => {
        updatedNotePayload = { noteId, title, content, tags };
        return true;
      })
    };

    vi.spyOn(sessionStore, 'getClient').mockReturnValue(mockTargetClient as any);

    // 1. 测试第一阶段：目标无同名便签 -> 触发新建，验证 tags 参数传入
    const sourceNoteWithTags: SynoNote = {
      object_id: 'src_note_1',
      parent_id: 'nb_src',
      title: '高并发系统架构演进',
      brief: '架构摘要',
      content: '<p>正文内容</p>',
      markdownContent: '# 高并发系统架构演进\n\n- 缓存架构\n- 消息队列',
      ctime: 1730000000,
      mtime: 1730000000,
      ver: '1',
      tag: ['架构', '后端', '分布式']
    };

    const res1 = await syncStore.syncNoteToTarget(sourceNoteWithTags, 'target-server-1');
    expect(res1.action).toBe('created');
    expect(mockTargetClient.createNote).toHaveBeenCalledTimes(1);
    expect(createdNotePayload.tags).toEqual(['架构', '后端', '分布式']);

    // 2. 测试第二阶段：目标服务存在同名便签 -> 触发更新，验证 tags 参数传入
    mockTargetClient.listNotes.mockResolvedValueOnce({
      notes: [
        {
          object_id: 'matched_note_1',
          parent_id: 'nb_target_default',
          title: '高并发系统架构演进',
          brief: '',
          content: '',
          ctime: 0,
          mtime: 0,
          ver: '1',
          tag: ['旧标签']
        }
      ],
      total: 1
    });

    const res2 = await syncStore.syncNoteToTarget(sourceNoteWithTags, 'target-server-1');
    expect(res2.action).toBe('updated');
    expect(mockTargetClient.updateNote).toHaveBeenCalledTimes(1);
    expect(updatedNotePayload.tags).toEqual(['架构', '后端', '分布式']);
    expect(updatedNotePayload.noteId).toBe('matched_note_1');
  });
});
