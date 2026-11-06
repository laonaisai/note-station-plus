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

  it('需求: 移动便签至其他笔记本 (moveNote) 更新本地便签归属并刷新笔记本状态', async () => {
    const noteStore = useNoteStore();
    const sessionStore = useSessionStore();

    noteStore.notebooks = [
      { object_id: 'nb_from', title: '源笔记本', category: '', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '' },
      { object_id: 'nb_to', title: '目标笔记本', category: '', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '' }
    ];

    const noteToMove: SynoNote = {
      object_id: 'note_mv_1',
      parent_id: 'nb_from',
      title: '待移动的便签',
      brief: '',
      content: '',
      ctime: 0,
      mtime: 0,
      ver: '1',
      tag: []
    };
    noteStore.notes = [noteToMove];
    noteStore.activeNoteId = 'note_mv_1';
    noteStore.activeNote = noteToMove;

    let moveCalled = false;
    const mockClient = {
      moveNote: async (oid: string, pid: string) => {
        expect(oid).toBe('note_mv_1');
        expect(pid).toBe('nb_to');
        moveCalled = true;
        return true;
      },
      listNotebooks: async () => [
        { object_id: 'nb_from', title: '源笔记本', category: '', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '', items: [] },
        { object_id: 'nb_to', title: '目标笔记本', category: '', ctime: 0, mtime: 0, ver: '1', preset: false, stack: '', items: ['note_mv_1'] }
      ]
    };
    vi.spyOn(sessionStore, 'getClient').mockReturnValue(mockClient as any);

    const success = await noteStore.moveNote('note_mv_1', 'nb_to');
    expect(success).toBe(true);
    expect(moveCalled).toBe(true);
    expect(noteStore.notes[0].parent_id).toBe('nb_to');
    expect(noteStore.activeNote?.parent_id).toBe('nb_to');
    expect(noteStore.notebooks.find(n => n.object_id === 'nb_to')?.items).toContain('note_mv_1');
  });

  it('需求: 多标签组合筛选 (selectedTags / toggleTag / clearTags)', () => {
    const noteStore = useNoteStore();

    noteStore.notes = [
      {
        object_id: 'n_work_arch',
        parent_id: 'nb1',
        title: '架构设计',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['工作', '架构']
      },
      {
        object_id: 'n_work_life',
        parent_id: 'nb1',
        title: '工作生活平衡',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['工作', '生活']
      },
      {
        object_id: 'n_arch_only',
        parent_id: 'nb1',
        title: '开源架构分析',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['架构']
      }
    ];

    // 1. 无标签选中时，显示全部3篇
    expect(noteStore.filteredNotes.length).toBe(3);

    // 2. 选中标签 '工作'
    noteStore.toggleTag('工作');
    expect(noteStore.selectedTags).toEqual(['工作']);
    expect(noteStore.filteredNotes.map(n => n.object_id)).toEqual(['n_work_arch', 'n_work_life']);

    // 3. 继续多选标签 '架构' (多标签交集筛选)
    noteStore.toggleTag('架构');
    expect(noteStore.selectedTags).toEqual(['工作', '架构']);
    expect(noteStore.filteredNotes.map(n => n.object_id)).toEqual(['n_work_arch']);

    // 4. 取消选择 '工作'
    noteStore.toggleTag('工作');
    expect(noteStore.selectedTags).toEqual(['架构']);
    expect(noteStore.filteredNotes.map(n => n.object_id)).toEqual(['n_work_arch', 'n_arch_only']);

    // 5. 清空所有选中标签
    noteStore.clearTags();
    expect(noteStore.selectedTags.length).toBe(0);
    expect(noteStore.filteredNotes.length).toBe(3);
  });

  it('需求: 共享便签折叠面板 (__shared_notes__) 过滤仅展示已共享的便签', () => {
    const noteStore = useNoteStore();

    noteStore.notes = [
      {
        object_id: 'n_shared_public',
        parent_id: 'nb1',
        title: '公开分享便签',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['公开'],
        acl: {
          enabled: true,
          public: { perm: 'ro' }
        }
      },
      {
        object_id: 'n_shared_user',
        parent_id: 'nb2',
        title: '协同分享便签',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['协同'],
        acl: {
          enabled: true,
          dsm_user: {
            '1024': { name: 'admin', perm: 'rw' }
          }
        }
      },
      {
        object_id: 'n_private',
        parent_id: 'nb1',
        title: '私人便签',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['私人'],
        acl: {
          enabled: false
        }
      }
    ];

    // 1. 切换至共享便签面板 (__shared_notes__)
    noteStore.activeNotebookId = '__shared_notes__';
    expect(noteStore.filteredNotes.length).toBe(2);
    expect(noteStore.filteredNotes.map(n => n.object_id)).toEqual(['n_shared_public', 'n_shared_user']);
    expect(noteStore.activeNotebook?.title).toBe('共享便签');

    // 2. 验证 getNotebookNoteCount 对 '__shared_notes__' 的计数
    expect(noteStore.getNotebookNoteCount({ object_id: '__shared_notes__', title: '共享便签' } as any)).toBe(2);

    // 3. 在共享便签面板内结合标签筛选
    noteStore.toggleTag('公开');
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('n_shared_public');

    // 4. 在共享便签面板内搜索关键词
    noteStore.clearTags();
    noteStore.searchQuery = '协同';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('n_shared_user');
  });

  it('点击切换至回收站折叠面板 (__recycle_bin__) 时，filteredNotes 正确展示回收站便签，并支持标签与搜索', async () => {
    const noteStore = useNoteStore();

    const mockRecycledNotes: SynoNote[] = [
      {
        object_id: 'recycled_1',
        parent_id: 'nb1',
        title: '已废弃的旧架构图',
        brief: '旧技术栈描述',
        content: '<p>旧架构</p>',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['废弃', '技术'],
        recycle: true
      },
      {
        object_id: 'recycled_2',
        parent_id: 'nb2',
        title: '过期的会议记录',
        brief: '2023年季度总结',
        content: '<p>会议记录</p>',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: ['会议'],
        recycle: true
      }
    ];

    noteStore.recycledNotes = mockRecycledNotes;

    // 1. 切换至回收站面板 (__recycle_bin__)
    noteStore.activeNotebookId = '__recycle_bin__';
    expect(noteStore.filteredNotes.length).toBe(2);
    expect(noteStore.filteredNotes.map(n => n.object_id)).toEqual(['recycled_1', 'recycled_2']);
    expect(noteStore.activeNotebook?.title).toBe('回收站');
    expect(noteStore.activeNotebook?.category).toBe('recycle');

    // 2. 验证 getNotebookNoteCount 对 '__recycle_bin__' 的计数
    expect(noteStore.getNotebookNoteCount({ object_id: '__recycle_bin__', title: '回收站' } as any)).toBe(2);

    // 3. 在回收站面板中结合标签筛选
    noteStore.toggleTag('会议');
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('recycled_2');

    // 4. 在回收站面板中搜索关键词
    noteStore.clearTags();
    noteStore.searchQuery = '旧架构图';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('recycled_1');
  });

  it('回收站便签操作：恢复与彻底删除正确调用客户端接口并更新状态', async () => {
    const noteStore = useNoteStore();
    const sessionStore = useSessionStore();

    const mockRecNotes = [
      {
        object_id: 'rec_note_1',
        parent_id: 'nb1',
        title: '测试回收便签1',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: [],
        recycle: true
      },
      {
        object_id: 'rec_note_2',
        parent_id: 'nb1',
        title: '测试回收便签2',
        brief: '',
        content: '',
        ctime: 0,
        mtime: 0,
        ver: '1',
        tag: [],
        recycle: true
      }
    ];

    // 模拟 sessionStore 中的 activeClient
    let currentRecNotes = [...mockRecNotes];
    const mockRestore = vi.fn().mockImplementation(async (id: string) => {
      currentRecNotes = currentRecNotes.filter(n => n.object_id !== id);
      return true;
    });
    const mockPermanentDelete = vi.fn().mockImplementation(async (id: string) => {
      currentRecNotes = currentRecNotes.filter(n => n.object_id !== id);
      return true;
    });
    const mockListAllNotes = vi.fn().mockResolvedValue({ notes: [], total: 0 });
    const mockListNotebooks = vi.fn().mockResolvedValue([]);
    const mockListAllRecycleNotes = vi.fn().mockImplementation(async () => ({
      notes: [...currentRecNotes],
      total: currentRecNotes.length
    }));

    const mockClient = {
      restoreNote: mockRestore,
      permanentlyDeleteNote: mockPermanentDelete,
      listAllNotes: mockListAllNotes,
      listNotebooks: mockListNotebooks,
      listAllRecycleNotes: mockListAllRecycleNotes
    };
    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);
    vi.spyOn(sessionStore, 'getClient').mockReturnValue(mockClient as any);
    vi.spyOn(sessionStore, 'activeSessionState', 'get').mockReturnValue({ serverId: 'test', isLoggedIn: true, isConnecting: false });

    noteStore.recycledNotes = [...mockRecNotes];
    noteStore.activeNotebookId = '__recycle_bin__';
    noteStore.activeNoteId = 'rec_note_1';

    // 1. 恢复便签 rec_note_1 (恢复后会自动聚焦当前面板中的下一个可用便签 rec_note_2)
    await noteStore.restoreNote('rec_note_1');
    expect(mockRestore).toHaveBeenCalledWith('rec_note_1');
    expect(noteStore.recycledNotes.some(n => n.object_id === 'rec_note_1')).toBe(false);
    expect(noteStore.recycledNotes.length).toBe(1);
    expect(noteStore.activeNoteId).toBe('rec_note_2');

    // 2. 彻底删除便签 rec_note_2 (删除后回收站为空，activeNoteId 清空为 null)
    await noteStore.permanentlyDeleteNote('rec_note_2');
    expect(mockPermanentDelete).toHaveBeenCalledWith('rec_note_2');
    expect(noteStore.recycledNotes.length).toBe(0);
    expect(noteStore.activeNoteId).toBeNull();
  });

  it('需求: 收藏夹折叠面板 (__favorites__) 过滤仅展示已收藏的便签与数量统计', async () => {
    const noteStore = useNoteStore();
    noteStore.reset();

    const sampleNotes: SynoNote[] = [
      {
        object_id: 'note_fav_1',
        parent_id: 'nb_1',
        title: '已收藏便签 1',
        brief: '内容 1',
        content: '<div>内容 1</div>',
        ctime: 1700000000,
        mtime: 1700000000,
        ver: 'v1',
        tag: ['工作']
      },
      {
        object_id: 'note_fav_2',
        parent_id: 'nb_2',
        title: '未收藏便签 2',
        brief: '内容 2',
        content: '<div>内容 2</div>',
        ctime: 1700001000,
        mtime: 1700001000,
        ver: 'v1',
        tag: ['学习']
      },
      {
        object_id: 'note_fav_3',
        parent_id: 'nb_1',
        title: '已收藏便签 3',
        brief: '内容 3',
        content: '<div>内容 3</div>',
        ctime: 1700002000,
        mtime: 1700002000,
        ver: 'v1',
        tag: ['工作', '生活']
      }
    ];

    noteStore.notes = sampleNotes;
    noteStore.shortcutIds = new Set(['note_fav_1', 'note_fav_3']);

    // 1. 验证收藏状态判断
    expect(noteStore.isFavorite('note_fav_1')).toBe(true);
    expect(noteStore.isFavorite('note_fav_2')).toBe(false);
    expect(noteStore.isFavorite('note_fav_3')).toBe(true);

    // 2. 验证 favoriteNotes 计算属性
    expect(noteStore.favoriteNotes.length).toBe(2);
    expect(noteStore.favoriteNotes.map(n => n.object_id)).toEqual(['note_fav_1', 'note_fav_3']);

    // 3. 验证 getNotebookNoteCount('__favorites__')
    const favCount = noteStore.getNotebookNoteCount({ object_id: '__favorites__', title: '收藏夹', category: '', ctime: 0, mtime: 0, ver: '', preset: true, stack: '' });
    expect(favCount).toBe(2);

    // 4. 切换到收藏夹面板
    noteStore.activeNotebookId = '__favorites__';
    expect(noteStore.filteredNotes.length).toBe(2);
    expect(noteStore.filteredNotes.map(n => n.object_id)).toEqual(['note_fav_1', 'note_fav_3']);

    // 5. 组合搜索测试
    noteStore.searchQuery = '便签 3';
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('note_fav_3');

    // 6. 组合标签测试
    noteStore.searchQuery = '';
    noteStore.toggleTag('生活');
    expect(noteStore.filteredNotes.length).toBe(1);
    expect(noteStore.filteredNotes[0].object_id).toBe('note_fav_3');
  });

  it('需求: 收藏与取消收藏便签 (toggleFavorite) 正确调用客户端接口并同步更新状态', async () => {
    const noteStore = useNoteStore();
    const sessionStore = useSessionStore();
    noteStore.reset();

    const mockAddShortcut = vi.fn().mockResolvedValue(true);
    const mockRemoveShortcut = vi.fn().mockResolvedValue(true);

    const mockClient = {
      addShortcut: mockAddShortcut,
      removeShortcut: mockRemoveShortcut
    };
    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);

    expect(noteStore.isFavorite('note_100')).toBe(false);

    // 1. 添加收藏
    await noteStore.toggleFavorite('note_100');
    expect(mockAddShortcut).toHaveBeenCalledWith('note_100');
    expect(noteStore.isFavorite('note_100')).toBe(true);

    // 2. 取消收藏
    await noteStore.toggleFavorite('note_100');
    expect(mockRemoveShortcut).toHaveBeenCalledWith('note_100');
    expect(noteStore.isFavorite('note_100')).toBe(false);
  });

  it('需求: 复制便签 (copyNote) 调用群晖原生接口并追加到本地列表并选定', async () => {
    const noteStore = useNoteStore();
    const sessionStore = useSessionStore();
    noteStore.reset();

    const originalNote: SynoNote = {
      object_id: 'orig_1',
      parent_id: 'nb_1',
      title: '原始便签',
      brief: '原始简述',
      content: '<div>原始正文</div>',
      ctime: 1700000000,
      mtime: 1700000000,
      ver: 'v1',
      tag: ['重要']
    };

    const copiedNote: SynoNote = {
      object_id: 'copy_1',
      parent_id: 'nb_1',
      title: '原始便签',
      brief: '原始简述',
      content: '<div>原始正文</div>',
      ctime: 1700000100,
      mtime: 1700000100,
      ver: 'v2',
      tag: ['重要']
    };

    const mockCopy = vi.fn().mockResolvedValue(copiedNote);
    const mockListNotebooks = vi.fn().mockResolvedValue([]);
    const mockClient = {
      copyNote: mockCopy,
      listNotebooks: mockListNotebooks
    };
    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(mockClient as any);

    noteStore.notes = [originalNote];
    const res = await noteStore.copyNote('orig_1');

    expect(mockCopy).toHaveBeenCalledWith('orig_1');
    expect(res).toEqual(copiedNote);
    expect(noteStore.notes.length).toBe(2);
    expect(noteStore.notes[0].object_id).toBe('copy_1');
    expect(noteStore.activeNoteId).toBe('copy_1');
  });
});

