import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLayoutStore } from '@/stores/layoutStore';

describe('Layout Store 侧边栏与专注模式状态管理测试', () => {
  const mockStorage: Record<string, string> = {};
  const mockAttributes: Record<string, string> = {};

  beforeEach(() => {
    setActivePinia(createPinia());
    for (const k in mockStorage) delete mockStorage[k];
    for (const k in mockAttributes) delete mockAttributes[k];

    globalThis.localStorage = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => { mockStorage[k] = String(v); },
      removeItem: (k: string) => { delete mockStorage[k]; },
      clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
      length: 0,
      key: () => null
    } as any;

    globalThis.document = {
      documentElement: {
        setAttribute: (k: string, v: string) => { mockAttributes[k] = v; },
        getAttribute: (k: string) => mockAttributes[k] ?? null,
      }
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

  describe('响应式 UI 密度与模式切换 (Compact / Medium 动态判定)', () => {
    it('4. 宽度小于 1440px 时默认判定为紧凑模式 (compact)', () => {
      const layout = useLayoutStore();
      layout.setUiDensityMode('auto');
      layout.windowWidth = 1280;

      expect(layout.isMediumDensity).toBe(false);
      expect(layout.uiDensity).toBe('compact');
      expect(document.documentElement.getAttribute('data-ui-density')).toBe('compact');
    });

    it('5. 宽度大于等于 1440px 时默认判定为中等模式 (medium)', () => {
      const layout = useLayoutStore();
      layout.setUiDensityMode('auto');
      layout.windowWidth = 1440;

      expect(layout.isMediumDensity).toBe(true);
      expect(layout.uiDensity).toBe('medium');
      expect(document.documentElement.getAttribute('data-ui-density')).toBe('medium');

      // 超宽屏 1920px
      layout.windowWidth = 1920;
      expect(layout.isMediumDensity).toBe(true);
      expect(layout.uiDensity).toBe('medium');
    });

    it('6. 手动设置密度模式优先于宽度计算', () => {
      const layout = useLayoutStore();

      // 在大屏(1920px)下强制指定紧凑模式
      layout.windowWidth = 1920;
      layout.setUiDensityMode('compact');
      expect(layout.isMediumDensity).toBe(false);
      expect(layout.uiDensity).toBe('compact');
      expect(document.documentElement.getAttribute('data-ui-density')).toBe('compact');

      // 在小屏(1024px)下强制指定中等模式
      layout.windowWidth = 1024;
      layout.setUiDensityMode('medium');
      expect(layout.isMediumDensity).toBe(true);
      expect(layout.uiDensity).toBe('medium');
      expect(document.documentElement.getAttribute('data-ui-density')).toBe('medium');
    });
  });
});
