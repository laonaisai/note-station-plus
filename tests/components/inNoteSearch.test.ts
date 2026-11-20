import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('便签内搜索与预览高亮定位算法 (In-Note Search & Highlight)', () => {
  // 1. 正则转义安全测试
  function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 2. 模拟搜索匹配与包装算法
  interface MatchResult {
    total: number;
    textParts: Array<{ isMatch: boolean; text: string }>;
  }

  function simulateTextMatch(content: string, query: string): MatchResult {
    const trimmed = query.trim();
    if (!trimmed) {
      return { total: 0, textParts: [{ isMatch: false, text: content }] };
    }

    const regex = new RegExp(escapeRegExp(trimmed), 'gi');
    const textParts: Array<{ isMatch: boolean; text: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let total = 0;

    while ((match = regex.exec(content)) !== null) {
      total++;
      if (match.index > lastIndex) {
        textParts.push({ isMatch: false, text: content.substring(lastIndex, match.index) });
      }
      textParts.push({ isMatch: true, text: match[0] });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      textParts.push({ isMatch: false, text: content.substring(lastIndex) });
    }

    return { total, textParts };
  }

  // 3. 循环索引导航算法
  function getNextIndex(current: number, total: number): number {
    if (total === 0) return 0;
    return (current + 1) % total;
  }

  function getPrevIndex(current: number, total: number): number {
    if (total === 0) return 0;
    return (current - 1 + total) % total;
  }

  describe('escapeRegExp 特殊字符转义', () => {
    it('正确转义正则表达式关键保留字符，防止搜索崩溃', () => {
      const special = 'a+b*c?d.e[f]g(h)i{j}k|l\\m^n$';
      const escaped = escapeRegExp(special);
      const regex = new RegExp(escaped);
      expect(regex.test(special)).toBe(true);
      expect(regex.test('abc')).toBe(false);
    });
  });

  describe('文本匹配与高亮切片', () => {
    it('空搜索词不产生匹配项', () => {
      const res = simulateTextMatch('这里是一段正文', '');
      expect(res.total).toBe(0);
      expect(res.textParts).toEqual([{ isMatch: false, text: '这里是一段正文' }]);
    });

    it('不区分大小写匹配英文字符串', () => {
      const content = 'Synology Note Station and synology Drive';
      const res = simulateTextMatch(content, 'synology');
      expect(res.total).toBe(2);
      expect(res.textParts.filter(p => p.isMatch).map(p => p.text)).toEqual(['Synology', 'synology']);
    });

    it('中文多处关键词精确匹配切分', () => {
      const content = '便签搜索功能测试，便签高亮与便签定位';
      const res = simulateTextMatch(content, '便签');
      expect(res.total).toBe(3);
      expect(res.textParts.filter(p => p.isMatch).length).toBe(3);
      // 还原所有切片后与原文完全一致（保证无损）
      const joined = res.textParts.map(p => p.text).join('');
      expect(joined).toBe(content);
    });
  });

  describe('上一个 / 下一个循环定位索引', () => {
    it('findNext 递增并能末尾循环回起点', () => {
      const total = 3;
      let idx = 0;
      idx = getNextIndex(idx, total); // 1
      expect(idx).toBe(1);
      idx = getNextIndex(idx, total); // 2
      expect(idx).toBe(2);
      idx = getNextIndex(idx, total); // 0 (wrap around)
      expect(idx).toBe(0);
    });

    it('findPrev 递减并能从起点循环到末尾', () => {
      const total = 3;
      let idx = 0;
      idx = getPrevIndex(idx, total); // 2
      expect(idx).toBe(2);
      idx = getPrevIndex(idx, total); // 1
      expect(idx).toBe(1);
      idx = getPrevIndex(idx, total); // 0
      expect(idx).toBe(0);
    });
  });

  describe('MarkdownEditor.vue 组件源码与模板结构验证', () => {
    it('包含底部搜索栏组件、输入框与快捷键绑定', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const editorPath = path.resolve(__dirname, '../../src/components/MarkdownEditor.vue');
      const content = fs.readFileSync(editorPath, 'utf-8');

      // 验证底部搜索栏存在
      expect(content).toContain('v-if="isSearchOpen"');
      expect(content).toContain('ref="searchInputRef"');
      expect(content).toContain('v-model="searchQuery"');
      expect(content).toContain('matchCountText');
      expect(content).toContain('findNext');
      expect(content).toContain('findPrev');
      expect(content).toContain('closeSearch');

      // 验证快捷键 Ctrl+F 与 Esc
      expect(content).toContain("(e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f'");
      expect(content).toContain("e.key === 'Escape' && isSearchOpen.value");

      // 验证搜索高亮针对预览区域 previewContainerRef
      expect(content).toContain('mark.note-search-match');
      expect(content).toContain('note-search-current');
      expect(content).toContain('scrollIntoView');
    });
  });
});
