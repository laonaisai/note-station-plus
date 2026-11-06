import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';
import { SynoNote } from '@/types/synology';

describe('NoteStore & NoteList: 笔记本过滤、分页与年月分组验证', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('点击切换笔记本时，filteredNotes 正确按 activeNotebookId 过滤对应便签', () => {
    const noteStore = useNoteStore();

    // 模拟从后端加载的属于不同笔记本的便签列表
    const mockNotes: SynoNote[] = [
      {
        object_id: 'note_1',
        parent_id: 'nb_work',
        title: '工作周报',
        brief: '工作周报内容',
        content: '<p>工作周报</p>',
        ctime: 1730790000,
        mtime: 1730790000,
        ver: '1',
        tag: ['工作']
      },
      {
        object_id: 'note_2',
        parent_id: 'nb_work',
        title: '产品技术方案',
        brief: '产品技术方案',
        content: '<p>方案</p>',
        ctime: 1730791000,
        mtime: 1730791000,
        ver: '1',
        tag: ['架构']
      },
      {
        object_id: 'note_3',
        parent_id: 'nb_personal',
        title: '家庭健身计划',
        brief: '健身计划',
        content: '<p>健身</p>',
        ctime: 1730792000,
        mtime: 1730792000,
        ver: '1',
        tag: ['生活']
      }
    ];

    noteStore.notes = mockNotes;

    // 1. 选中工作笔记本 (nb_work)
    noteStore.activeNotebookId = 'nb_work';
    expect(noteStore.filteredNotes.length).toBe(2);
    expect(noteStore.filteredNotes.map(n => n.object_id)).toEqual(['note_1', 'note_2']);

    // 2. 选中个人笔记本 (nb_personal)
    noteStore.activeNotebookId = 'nb_personal';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('note_3');

    // 3. 在当前笔记本下进行关键词搜索
    noteStore.activeNotebookId = 'nb_work';
    noteStore.searchQuery = '技术方案';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('note_2');
  });

  it('搜索框能够同时匹配便签标题以及正文内容 (markdownContent / brief / content)', () => {
    const noteStore = useNoteStore();

    const mockNotes: SynoNote[] = [
      {
        object_id: 'note_title_match',
        parent_id: 'nb1',
        title: 'Kubernetes 集群搭建',
        brief: '',
        content: '<p>普通正文</p>',
        markdownContent: '普通正文',
        ctime: 1730790000,
        mtime: 1730790000,
        ver: '1',
        tag: []
      },
      {
        object_id: 'note_content_match',
        parent_id: 'nb1',
        title: '日常会议备忘录',
        brief: '关于云原生架构与微服务的研讨',
        content: '<p>今天讨论了关于云原生架构与微服务的高可用部署策略。</p>',
        markdownContent: '今天讨论了关于云原生架构与微服务的高可用部署策略。',
        ctime: 1730791000,
        mtime: 1730791000,
        ver: '1',
        tag: []
      },
      {
        object_id: 'note_other',
        parent_id: 'nb1',
        title: '购物清单',
        brief: '周末买菜',
        content: '<p>苹果 牛奶 面包</p>',
        markdownContent: '苹果 牛奶 面包',
        ctime: 1730792000,
        mtime: 1730792000,
        ver: '1',
        tag: []
      }
    ];

    noteStore.notebooks = [{ object_id: 'nb1', title: '笔记本1', category: '', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '' }];
    noteStore.notes = mockNotes;
    noteStore.activeNotebookId = 'nb1';

    // 1. 搜索标题匹配
    noteStore.searchQuery = 'Kubernetes';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('note_title_match');

    // 2. 搜索正文内容匹配 (标题不含"高可用"，正文包含)
    noteStore.searchQuery = '高可用';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('note_content_match');

    // 3. 搜索 brief 匹配
    noteStore.searchQuery = '研讨';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('note_content_match');

    // 4. 清空搜索恢复全部
    noteStore.searchQuery = '';
    expect(noteStore.filteredNotes.length).toBe(3);
  });

  it('搜索框支持与群晖服务端 SYNO.NoteStation.FTS 全文检索联动匹配正文', async () => {
    const noteStore = useNoteStore();
    const sessionStore = useSessionStore();

    const mockNotes: SynoNote[] = [
      {
        object_id: 'note_remote_match',
        parent_id: 'nb1',
        title: '未在本地缓存正文的旧便签',
        brief: '',
        content: '', // 本地未拉取正文
        ctime: 1730790000,
        mtime: 1730790000,
        ver: '1',
        tag: []
      },
      {
        object_id: 'note_other',
        parent_id: 'nb1',
        title: '其他便签',
        brief: '',
        content: '',
        ctime: 1730791000,
        mtime: 1730791000,
        ver: '1',
        tag: []
      }
    ];

    noteStore.notebooks = [{ object_id: 'nb1', title: '笔记本1', category: '', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '' }];
    noteStore.notes = mockNotes;
    noteStore.activeNotebookId = 'nb1';

    // Mock activeClient & activeSessionState on sessionStore
    const mockClient = {
      searchNotes: vi.fn().mockResolvedValue([
        { object_id: 'note_remote_match', parent_id: 'nb1', title: '未在本地缓存正文的旧便签' }
      ])
    };
    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);
    vi.spyOn(sessionStore, 'activeSessionState', 'get').mockReturnValue({ serverId: 'test', isLoggedIn: true, isConnecting: false });

    // 触发搜索
    noteStore.searchQuery = '远端全文关键词';
    // 等待 debounce
    await new Promise(resolve => setTimeout(resolve, 350));

    expect(mockClient.searchNotes).toHaveBeenCalledWith('远端全文关键词');
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('note_remote_match');
  });

  it('便签按年月分组算法能正确将不同月份的便签有序分类', () => {
    // 构造跨越 2026年11月、2026年10月、2025年12月的便签
    // 2026-11-05 -> 1793875200 (ms: 1793875200000)
    // 2026-10-15 -> 1792060800
    // 2025-12-01 -> 1764547200
    const time2026_11 = new Date(2026, 10, 5).getTime() / 1000;
    const time2026_10 = new Date(2026, 9, 15).getTime() / 1000;
    const time2025_12 = new Date(2025, 11, 1).getTime() / 1000;

    const sampleNotes: SynoNote[] = [
      {
        object_id: 'n1',
        parent_id: 'nb1',
        title: '11月便签A',
        brief: '',
        content: '',
        ctime: time2026_11,
        mtime: time2026_11,
        ver: '1',
        tag: []
      },
      {
        object_id: 'n2',
        parent_id: 'nb1',
        title: '10月便签B',
        brief: '',
        content: '',
        ctime: time2026_10,
        mtime: time2026_10,
        ver: '1',
        tag: []
      },
      {
        object_id: 'n3',
        parent_id: 'nb1',
        title: '11月便签C (较晚更新)',
        brief: '',
        content: '',
        ctime: time2026_11 + 3600,
        mtime: time2026_11 + 3600,
        ver: '1',
        tag: []
      },
      {
        object_id: 'n4',
        parent_id: 'nb1',
        title: '2025年便签D',
        brief: '',
        content: '',
        ctime: time2025_12,
        mtime: time2025_12,
        ver: '1',
        tag: []
      }
    ];

    // 分组逻辑测试
    const sorted = [...sampleNotes].sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    const groupMap = new Map<string, { label: string; notes: SynoNote[] }>();

    for (const note of sorted) {
      const rawTime = note.mtime || note.ctime || 0;
      const ms = rawTime > 10000000000 ? rawTime : rawTime * 1000;
      const d = new Date(ms);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${m.toString().padStart(2, '0')}`;
      const label = `${y}年${m.toString().padStart(2, '0')}月`;

      if (!groupMap.has(key)) {
        groupMap.set(key, { label, notes: [] });
      }
      groupMap.get(key)!.notes.push(note);
    }

    const groups = Array.from(groupMap.entries()).map(([key, data]) => ({
      key,
      label: data.label,
      notes: data.notes
    }));

    // 应该分为 3 个月份组，且最新月份排在最前
    expect(groups.length).toBe(3);
    expect(groups[0].key).toBe('2026-11');
    expect(groups[0].notes.length).toBe(2);
    expect(groups[0].notes[0].object_id).toBe('n3'); // 较新的排在组内最前面

    expect(groups[1].key).toBe('2026-10');
    expect(groups[1].notes.length).toBe(1);

    expect(groups[2].key).toBe('2025-12');
    expect(groups[2].notes.length).toBe(1);
  });

  it('调用 noteStore.reset() 时，所有便签、笔记本及选定状态被彻底清空', () => {
    const noteStore = useNoteStore();

    noteStore.notebooks = [{ object_id: 'nb_1', title: '笔记本1', category: '', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '' }];
    noteStore.activeNotebookId = 'nb_1';
    noteStore.notes = [{ object_id: 'n_1', parent_id: 'nb_1', title: '便签1', brief: '', content: '', ctime: 0, mtime: 0, ver: '1', tag: [] }];
    noteStore.activeNoteId = 'n_1';
    noteStore.activeNote = noteStore.notes[0];
    noteStore.searchQuery = '搜索关键字';

    expect(noteStore.notebooks.length).toBe(1);
    expect(noteStore.notes.length).toBe(1);
    expect(noteStore.activeNoteId).toBe('n_1');

    // 执行重置
    noteStore.reset();

    expect(noteStore.notebooks.length).toBe(0);
    expect(noteStore.activeNotebookId).toBeNull();
    expect(noteStore.notes.length).toBe(0);
    expect(noteStore.activeNoteId).toBeNull();
    expect(noteStore.activeNote).toBeNull();
    expect(noteStore.searchQuery).toBe('');
    expect(noteStore.filteredNotes.length).toBe(0);
  });

  it('笔记本拥有400+篇便签时，filteredNotes 能完整过滤并显示全部400+篇便签', () => {
    const noteStore = useNoteStore();

    // 构造笔记本 A (420 篇便签) 和 笔记本 B (150 篇便签)
    const largeNotesList: SynoNote[] = [];

    // 笔记本 A: 420 篇
    for (let i = 0; i < 420; i++) {
      largeNotesList.push({
        object_id: `note_a_${i}`,
        parent_id: 'nb_large_a',
        notebook_id: 'nb_large_a',
        title: `笔记本A便签 ${i}`,
        brief: '',
        content: `<p>便签 ${i}</p>`,
        ctime: 1730790000 + i * 10,
        mtime: 1730790000 + i * 10,
        ver: '1',
        tag: i % 2 === 0 ? ['工作'] : ['日常']
      });
    }

    // 笔记本 B: 150 篇
    for (let i = 0; i < 150; i++) {
      largeNotesList.push({
        object_id: `note_b_${i}`,
        parent_id: 'nb_large_b',
        notebook_id: 'nb_large_b',
        title: `笔记本B便签 ${i}`,
        brief: '',
        content: `<p>便签B ${i}</p>`,
        ctime: 1730790000 + i * 10,
        mtime: 1730790000 + i * 10,
        ver: '1',
        tag: ['B组']
      });
    }

    noteStore.notebooks = [
      { object_id: 'nb_large_a', title: '大体量笔记本 A', category: 'notebook', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '' },
      { object_id: 'nb_large_b', title: '笔记本 B', category: 'notebook', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '' }
    ];

    noteStore.notes = largeNotesList;

    // 1. 切换到笔记本 A
    noteStore.activeNotebookId = 'nb_large_a';
    expect(noteStore.filteredNotes.length).toBe(420);
    expect(noteStore.filteredNotes[0].parent_id).toBe('nb_large_a');
    expect(noteStore.filteredNotes[419].parent_id).toBe('nb_large_a');

    // 2. 切换到笔记本 B
    noteStore.activeNotebookId = 'nb_large_b';
    expect(noteStore.filteredNotes.length).toBe(150);
    expect(noteStore.filteredNotes[0].parent_id).toBe('nb_large_b');

    // 3. 在 420 篇便签中过滤标签
    noteStore.activeNotebookId = 'nb_large_a';
    noteStore.searchQuery = '日常';
    expect(noteStore.filteredNotes.length).toBe(210);
  });

  it('支持通过 notebook.items 包含关系匹配便签 (兼容群晖不同数据格式)', () => {
    const noteStore = useNoteStore();

    // 某些便签可能 parent_id 格式不同，但 notebook.items 显式包含该便签 ID
    noteStore.notebooks = [
      {
        object_id: 'nb_with_items',
        title: '包含 items 的笔记本',
        category: 'notebook',
        ctime: 0,
        mtime: 0,
        ver: '1',
        preset: false,
        stack: '',
        items: ['note_special_1', 'note_special_2']
      }
    ];

    noteStore.notes = [
      {
        object_id: 'note_special_1',
        parent_id: '',
        title: '特殊便签 1',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: []
      },
      {
        object_id: 'note_special_2',
        parent_id: 'other_id',
        title: '特殊便签 2',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: []
      },
      {
        object_id: 'note_other',
        parent_id: 'other_id',
        title: '外部便签',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: []
      }
    ];

    noteStore.activeNotebookId = 'nb_with_items';
    expect(noteStore.filteredNotes.length).toBe(2);
    expect(noteStore.filteredNotes.map(n => n.object_id)).toEqual(['note_special_1', 'note_special_2']);

    // 选中“全部笔记”节点时，列出全部便签
    noteStore.activeNotebookId = '__all_notes__';
    expect(noteStore.filteredNotes.length).toBe(3);
    expect(noteStore.activeNotebook?.title).toBe('全部笔记');
  });

  it('需求1: getNotebookNoteCount 正确计算各笔记本的便签数量 (结合 items 与已加载便签)', () => {
    const noteStore = useNoteStore();

    const nb1 = {
      object_id: 'nb_1',
      title: '笔记本1',
      category: 'notebook',
      ctime: 0,
      mtime: 0,
      ver: '1',
      preset: false,
      stack: '',
      items: ['n1', 'n2', 'n3', 'n4', 'n5'] // 服务端报告有 5 项
    };

    const nb2 = {
      object_id: 'nb_2',
      title: '笔记本2',
      category: 'notebook',
      ctime: 0,
      mtime: 0,
      ver: '1',
      preset: false,
      stack: ''
    };

    noteStore.notebooks = [nb1, nb2];

    // 本地已加载 2 篇属于 nb1 的便签，1 篇属于 nb2 的便签
    noteStore.notes = [
      {
        object_id: 'n1',
        parent_id: 'nb_1',
        title: '便签1',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: []
      },
      {
        object_id: 'n2',
        parent_id: 'nb_1',
        title: '便签2',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: []
      },
      {
        object_id: 'n_other',
        parent_id: 'nb_2',
        title: '便签3',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: []
      }
    ];

    // nb1 的服务端 items 为 5，本地已加载 2，综合取真实计数值 5
    expect(noteStore.getNotebookNoteCount(nb1)).toBe(5);

    // nb2 无 items 数组，本地已加载 1 篇，返回 1
    expect(noteStore.getNotebookNoteCount(nb2)).toBe(1);

    // 全部笔记虚拟节点返回总便签数 3
    const allNb = {
      object_id: '__all_notes__',
      title: '全部笔记',
      category: 'all',
      ctime: 0,
      mtime: 0,
      ver: '',
      preset: true,
      stack: ''
    };
    expect(noteStore.getNotebookNoteCount(allNb)).toBe(3);
  });

  it('需求2: 标签筛选功能联动过滤当前笔记本下的便签并支持与搜索组合', () => {
    const noteStore = useNoteStore();

    noteStore.notebooks = [
      { object_id: 'nb_tech', title: '技术笔记', category: 'notebook', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '' },
      { object_id: 'nb_life', title: '生活日常', category: 'notebook', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '' }
    ];

    noteStore.notes = [
      {
        object_id: 't1',
        parent_id: 'nb_tech',
        title: 'Vue3 组合式 API 指南',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['前端', 'Vue']
      },
      {
        object_id: 't2',
        parent_id: 'nb_tech',
        title: 'TypeScript 高级类型实战',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['前端', 'TypeScript']
      },
      {
        object_id: 't3',
        parent_id: 'nb_tech',
        title: 'Go 语言高并发微服务',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['后端', 'Go']
      },
      {
        object_id: 'l1',
        parent_id: 'nb_life',
        title: '周末烘焙指南',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['美食', '生活']
      }
    ];

    noteStore.activeNotebookId = 'nb_tech';

    // 1. 验证 tagListWithCounts 统计技术笔记本中的标签频次
    const tagsInTech = noteStore.tagListWithCounts;
    const frontendTag = tagsInTech.find(t => t.name === '前端');
    expect(frontendTag).toBeDefined();
    expect(frontendTag?.count).toBe(2);

    const goTag = tagsInTech.find(t => t.name === 'Go');
    expect(goTag?.count).toBe(1);

    // 2. 选择“前端”标签筛选
    noteStore.selectTag('前端');
    expect(noteStore.selectedTag).toBe('前端');
    expect(noteStore.filteredNotes.length).toBe(2);
    expect(noteStore.filteredNotes.map(n => n.object_id)).toEqual(['t1', 't2']);

    // 3. 在“前端”标签筛选下，结合搜索框关键词组合筛选
    noteStore.searchQuery = 'TypeScript';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('t2');

    // 4. 清除搜索关键词，恢复为只有标签筛选
    noteStore.searchQuery = '';
    expect(noteStore.filteredNotes.length).toBe(2);

    // 5. 再次点击当前选中标签，取消标签筛选 (Toggle off)
    noteStore.selectTag('前端');
    expect(noteStore.selectedTag).toBeNull();
    expect(noteStore.filteredNotes.length).toBe(3); // 技术笔记下的所有 3 篇

    // 6. 切换为生活日常笔记本
    noteStore.activeNotebookId = 'nb_life';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].title).toBe('周末烘焙指南');

    // 7. 调用 reset() 彻底重置选中标签
    noteStore.selectTag('美食');
    expect(noteStore.selectedTag).toBe('美食');
    noteStore.reset();
    expect(noteStore.selectedTag).toBeNull();
  });

  it('需求1: 支持笔记本重命名与删除，重命名实时更新标题，删除自动清理便签与状态', async () => {
    const noteStore = useNoteStore();
    const sessionStore = useSessionStore();

    const mockNb = {
      object_id: 'nb_to_rename',
      title: '旧笔记本名',
      category: 'notebook',
      ctime: 0,
      mtime: 0,
      ver: '1',
      preset: false,
      stack: ''
    };
    noteStore.notebooks = [mockNb];
    noteStore.notes = [
      {
        object_id: 'n_in_nb',
        parent_id: 'nb_to_rename',
        title: '便签X',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: []
      },
      {
        object_id: 'n_keep',
        parent_id: 'nb_other',
        title: '便签Y',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: []
      }
    ];
    noteStore.activeNotebookId = 'nb_to_rename';

    // Mock client on sessionStore
    const mockClient = {
      renameNotebook: async (id: string, title: string) => ({ object_id: id, title }),
      deleteNotebook: async (id: string) => true,
      listNotebooks: async () => [],
      listAllNotes: async () => ({ notes: [], total: 0 }),
      listNotes: async () => ({ notes: [], total: 0 })
    };
    vi.spyOn(sessionStore, 'getClient').mockReturnValue(mockClient as any);

    // 1. 重命名
    await noteStore.renameNotebook('nb_to_rename', '新笔记本名');
    expect(noteStore.notebooks[0].title).toBe('新笔记本名');

    // 2. 删除笔记本
    await noteStore.deleteNotebook('nb_to_rename');
    // nb_to_rename 下的便签被清除，其他笔记本便签保留
    expect(noteStore.notes.find(n => n.parent_id === 'nb_to_rename')).toBeUndefined();
    expect(noteStore.notes.find(n => n.parent_id === 'nb_other')).toBeDefined();
    // activeNotebookId 被重置
    expect(noteStore.activeNotebookId).toBeNull();
  });
});

