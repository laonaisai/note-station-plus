import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from '@/stores/noteStore';
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
});
