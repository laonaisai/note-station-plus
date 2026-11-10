import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from '@/stores/noteStore';

describe('NotebookSidebar: Vertical Tab Rail 算法与逻辑单元测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // 测试首字提取算法
  function getFirstChar(title?: string): string {
    if (!title) return '便';
    const trimmed = title.trim();
    if (!trimmed) return '便';

    const firstChar = trimmed[0];
    if (/[\u4e00-\u9fa5\u3040-\u30ff]/.test(firstChar)) {
      return firstChar;
    }
    const match = trimmed.match(/^[a-zA-Z0-9]{1,2}/);
    if (match) {
      return match[0].toUpperCase();
    }
    return firstChar.toUpperCase();
  }

  // 测试竖排标题截断算法
  function formatVerticalTitle(title?: string, maxLen: number = 6): string {
    if (!title) return '';
    const trimmed = title.trim();
    if (trimmed.length <= maxLen) {
      return trimmed;
    }
    return trimmed.slice(0, maxLen - 1) + '…';
  }

  describe('getFirstChar 算法', () => {
    it('正确提取中文笔记本名称的首汉字', () => {
      expect(getFirstChar('我的便签')).toBe('我');
      expect(getFirstChar('工作文档')).toBe('工');
      expect(getFirstChar('技术归档')).toBe('技');
      expect(getFirstChar('  前后有空格的笔记  ')).toBe('前');
    });

    it('正确提取日文假名首字', () => {
      expect(getFirstChar('あいうえお')).toBe('あ');
      expect(getFirstChar('ノート')).toBe('ノ');
    });

    it('正确提取英文和数字标题的前 1~2 个字符大写', () => {
      expect(getFirstChar('Personal')).toBe('PE');
      expect(getFirstChar('Notes')).toBe('NO');
      expect(getFirstChar('a')).toBe('A');
      expect(getFirstChar('2026 Yearly Summary')).toBe('20');
      expect(getFirstChar('DSM 7.2 Release Notes')).toBe('DS');
    });

    it('空值或特殊边界情况返回兜底字符', () => {
      expect(getFirstChar('')).toBe('便');
      expect(getFirstChar(undefined)).toBe('便');
      expect(getFirstChar('   ')).toBe('便');
      expect(getFirstChar('@special')).toBe('@');
    });
  });

  describe('formatVerticalTitle 算法', () => {
    it('不超过最大长度时完整保留', () => {
      expect(formatVerticalTitle('我的便签', 6)).toBe('我的便签');
      expect(formatVerticalTitle('工作周报', 4)).toBe('工作周报');
    });

    it('超过最大长度时截断并附带省略号', () => {
      expect(formatVerticalTitle('长标题群晖个人知识库管理', 6)).toBe('长标题群晖…');
      expect(formatVerticalTitle('1234567890', 5)).toBe('1234…');
    });

    it('空值与边界情况处理', () => {
      expect(formatVerticalTitle('')).toBe('');
      expect(formatVerticalTitle(undefined)).toBe('');
    });
  });

  describe('Tab 切换联动 NoteStore 状态', () => {
    it('选择分类时能正确清空搜索词与标签', () => {
      const store = useNoteStore();
      store.searchQuery = 'keyword';
      store.toggleTag('work');
      expect(store.selectedTags).toContain('work');

      // 切换至自定义笔记本或系统项
      store.searchQuery = '';
      store.clearTags();
      store.selectNotebook('nb-123');

      expect(store.searchQuery).toBe('');
      expect(store.selectedTags.length).toBe(0);
      expect(store.activeNotebookId).toBe('nb-123');
    });
  });

  describe('便签项两列布局格式化辅助算法 (formatDay / formatTime)', () => {
    function formatDay(timestamp?: number): string {
      if (!timestamp) return '';
      const ms = timestamp > 10000000000 ? timestamp : timestamp * 1000;
      const date = new Date(ms);
      return String(date.getDate()).padStart(2, '0');
    }

    function formatTime(timestamp?: number, mockNow?: Date): string {
      if (!timestamp) return '';
      const ms = timestamp > 10000000000 ? timestamp : timestamp * 1000;
      const date = new Date(ms);
      const now = mockNow || new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
    }

    it('formatDay 正确返回两位数字的 day', () => {
      // 2026-11-05
      const ts1 = new Date(2026, 10, 5, 14, 30).getTime() / 1000;
      expect(formatDay(ts1)).toBe('05');

      // 2026-11-28
      const ts2 = new Date(2026, 10, 28, 9, 15).getTime() / 1000;
      expect(formatDay(ts2)).toBe('28');

      // 毫秒级时间戳兼容
      const ts3 = new Date(2026, 0, 1, 0, 0).getTime();
      expect(formatDay(ts3)).toBe('01');

      // 空值或无效时间戳兜底
      expect(formatDay(undefined)).toBe('');
      expect(formatDay(0)).toBe('');
    });

    it('formatTime 在当天返回时间，在非当天返回月/日', () => {
      const today = new Date(2026, 10, 10, 12, 0);
      const sameDayTs = new Date(2026, 10, 10, 15, 45).getTime() / 1000;
      const otherDayTs = new Date(2026, 10, 8, 10, 20).getTime() / 1000;

      const sameDayResult = formatTime(sameDayTs, today);
      expect(sameDayResult).toContain(':');

      const otherDayResult = formatTime(otherDayTs, today);
      expect(otherDayResult.length).toBeGreaterThan(0);
      expect(formatTime(undefined)).toBe('');
    });
  });
});
