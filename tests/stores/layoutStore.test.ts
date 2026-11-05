import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLayoutStore } from '@/stores/layoutStore';

describe('Layout Store 侧边栏与专注模式状态管理测试', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    setActivePinia(createPinia());
    for (const k in mockStorage) delete mockStorage[k];

    globalThis.localStorage = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => { mockStorage[k] = String(v); },
      removeItem: (k: string) => { delete mockStorage[k]; },
      clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
      length: 0,
      key: () => null
    } as any;
  });

  it('1. 默认展开状态下能够独立折叠笔记目录', () => {
    const layout = useLayoutStore();
    expect(layout.isSidebarCollapsed).toBe(false);

    layout.toggleSidebar();
    expect(layout.isSidebarCollapsed).toBe(true);

    layout.toggleSidebar();
    expect(layout.isSidebarCollapsed).toBe(false);
  });

  it('2. 能够独立折叠便签列表', () => {
    const layout = useLayoutStore();
    expect(layout.isNoteListCollapsed).toBe(false);

    layout.toggleNoteList();
    expect(layout.isNoteListCollapsed).toBe(true);

    layout.toggleNoteList();
    expect(layout.isNoteListCollapsed).toBe(false);
  });

  it('3. 专注模式能够一键同时折叠/展开两栏侧边栏', () => {
    const layout = useLayoutStore();

    // 一键进入专注模式 (折叠两栏)
    layout.toggleFocusMode();
    expect(layout.isSidebarCollapsed).toBe(true);
    expect(layout.isNoteListCollapsed).toBe(true);

    // 再次点击退出专注模式 (展开两栏)
    layout.toggleFocusMode();
    expect(layout.isSidebarCollapsed).toBe(false);
    expect(layout.isNoteListCollapsed).toBe(false);
  });
});
