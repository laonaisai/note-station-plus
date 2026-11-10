import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import {
  injectLineNumbersPlugin,
  findFloorIndex,
  calculatePreviewScrollTop,
  calculateTextareaScrollTop,
  ScrollAnchor
} from '@/utils/syncScroll';

describe('syncScroll: Markdown 编辑与预览同步滚动核心算法测试', () => {
  describe('injectLineNumbersPlugin 插件验证', () => {
    it('正确为块级 Token 注入 data-source-line 行号属性', () => {
      const md = new MarkdownIt({ html: true });
      injectLineNumbersPlugin(md);

      const markdownText = `# 一级标题

正文段落第一行。

- 列表项 1
- 列表项 2

\`\`\`ts
const x = 1;
\`\`\`

| 表头 1 | 表头 2 |
| :--- | :--- |
| 内容 1 | 内容 2 |
`;

      const renderedHtml = md.render(markdownText);

      // 验证标题注入行号 0
      expect(renderedHtml).toContain('<h1 data-source-line="0">一级标题</h1>');
      // 验证段落注入行号 2
      expect(renderedHtml).toContain('<p data-source-line="2">正文段落第一行。</p>');
      // 验证无序列表注入行号
      expect(renderedHtml).toContain('<ul data-source-line="4">');
      // 验证代码块注入行号
      expect(renderedHtml).toContain('data-source-line="7"');
      // 验证表格注入行号
      expect(renderedHtml).toContain('<table data-source-line="11">');
    });
  });

  describe('findFloorIndex 二分查找区间算法', () => {
    it('对数值数组进行准确的区间左边界查找', () => {
      const arr = [0, 100, 250, 400, 600];

      expect(findFloorIndex(arr, 0)).toBe(0);
      expect(findFloorIndex(arr, 50)).toBe(0);
      expect(findFloorIndex(arr, 100)).toBe(1);
      expect(findFloorIndex(arr, 180)).toBe(1);
      expect(findFloorIndex(arr, 250)).toBe(2);
      expect(findFloorIndex(arr, 399)).toBe(2);
      expect(findFloorIndex(arr, 400)).toBe(3);
      expect(findFloorIndex(arr, 550)).toBe(3);
      expect(findFloorIndex(arr, 600)).toBe(3); // 超过上限返回倒数第二个区间起始
      expect(findFloorIndex(arr, 999)).toBe(3);
    });

    it('对 ScrollAnchor 对象数组按 line 或 top 字段二分查找', () => {
      const anchors: ScrollAnchor[] = [
        { line: 0, top: 0 },
        { line: 5, top: 120 },
        { line: 15, top: 400 },
        { line: 30, top: 900 }
      ];

      // 按 line 查找
      expect(findFloorIndex(anchors, 0, 'line')).toBe(0);
      expect(findFloorIndex(anchors, 3.5, 'line')).toBe(0);
      expect(findFloorIndex(anchors, 5, 'line')).toBe(1);
      expect(findFloorIndex(anchors, 12, 'line')).toBe(1);
      expect(findFloorIndex(anchors, 25, 'line')).toBe(2);

      // 按 top 查找
      expect(findFloorIndex(anchors, 0, 'top')).toBe(0);
      expect(findFloorIndex(anchors, 80, 'top')).toBe(0);
      expect(findFloorIndex(anchors, 120, 'top')).toBe(1);
      expect(findFloorIndex(anchors, 350, 'top')).toBe(1);
      expect(findFloorIndex(anchors, 600, 'top')).toBe(2);
    });
  });

  describe('calculatePreviewScrollTop 分段线性插值计算', () => {
    const mockTextarea = {
      scrollHeight: 1000,
      clientHeight: 400
    } as HTMLTextAreaElement;

    const mockPreview = {
      scrollHeight: 1500,
      clientHeight: 500
    } as HTMLElement;

    // 假设 4 行锚点
    const textareaOffsets = [0, 200, 400, 600, 1000];
    const previewAnchors: ScrollAnchor[] = [
      { line: 0, top: 0 },
      { line: 1, top: 250 },
      { line: 2, top: 600 },
      { line: 3, top: 900 },
      { line: 4, top: 1500 }
    ];

    it('边界情况测试：置顶与置底', () => {
      // 置顶 scrollTop <= 3 返回 0
      expect(calculatePreviewScrollTop(0, mockTextarea, mockPreview, textareaOffsets, previewAnchors)).toBe(0);
      expect(calculatePreviewScrollTop(2, mockTextarea, mockPreview, textareaOffsets, previewAnchors)).toBe(0);

      // 置底 (maxTextareaScroll = 600, maxPreviewScroll = 1000)
      expect(calculatePreviewScrollTop(598, mockTextarea, mockPreview, textareaOffsets, previewAnchors)).toBe(1000);
      expect(calculatePreviewScrollTop(600, mockTextarea, mockPreview, textareaOffsets, previewAnchors)).toBe(1000);
    });

    it('中间行分段平滑插值计算', () => {
      // 当编辑区 scrollTop = 100 时，正好位于第 0 行与第 1 行的中点 (lineFraction = 0.5)
      // 对应的 preview 应该位于 line 0 (top: 0) 和 line 1 (top: 250) 的中点 -> 125
      const previewTop = calculatePreviewScrollTop(100, mockTextarea, mockPreview, textareaOffsets, previewAnchors);
      expect(previewTop).toBeCloseTo(125, 0);

      // 当编辑区 scrollTop = 200 时，为第 1 行起点 (line = 1) -> preview top = 250
      const previewTopAtLine1 = calculatePreviewScrollTop(200, mockTextarea, mockPreview, textareaOffsets, previewAnchors);
      expect(previewTopAtLine1).toBeCloseTo(250, 0);
    });
  });

  describe('calculateTextareaScrollTop 反向分段线性插值计算', () => {
    const mockTextarea = {
      scrollHeight: 1000,
      clientHeight: 400
    } as HTMLTextAreaElement;

    const mockPreview = {
      scrollHeight: 1500,
      clientHeight: 500
    } as HTMLElement;

    const textareaOffsets = [0, 200, 400, 600, 1000];
    const previewAnchors: ScrollAnchor[] = [
      { line: 0, top: 0 },
      { line: 1, top: 250 },
      { line: 2, top: 600 },
      { line: 3, top: 900 },
      { line: 4, top: 1500 }
    ];

    it('反向边界情况测试：置顶与置底', () => {
      // 预览区置顶
      expect(calculateTextareaScrollTop(0, mockTextarea, mockPreview, textareaOffsets, previewAnchors)).toBe(0);
      expect(calculateTextareaScrollTop(3, mockTextarea, mockPreview, textareaOffsets, previewAnchors)).toBe(0);

      // 预览区置底 (maxPreviewScroll = 1000, maxTextareaScroll = 600)
      expect(calculateTextareaScrollTop(998, mockTextarea, mockPreview, textareaOffsets, previewAnchors)).toBe(600);
      expect(calculateTextareaScrollTop(1000, mockTextarea, mockPreview, textareaOffsets, previewAnchors)).toBe(600);
    });

    it('反向分段平滑插值', () => {
      // 预览区 top = 250 (即 line 1 起点) -> textarea 对应 top = 200
      const textareaTopAtLine1 = calculateTextareaScrollTop(250, mockTextarea, mockPreview, textareaOffsets, previewAnchors);
      expect(textareaTopAtLine1).toBeCloseTo(200, 0);

      // 预览区 top = 125 (即 line 0 与 line 1 中点) -> textarea 对应 top = 100
      const textareaTopAtHalf = calculateTextareaScrollTop(125, mockTextarea, mockPreview, textareaOffsets, previewAnchors);
      expect(textareaTopAtHalf).toBeCloseTo(100, 0);
    });
  });
});
