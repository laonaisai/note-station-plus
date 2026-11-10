import type MarkdownIt from 'markdown-it';

export interface ScrollAnchor {
  line: number;
  top: number;
}

/**
 * 为 markdown-it 块级 Token 注入 data-source-line 行号属性插件
 */
export function injectLineNumbersPlugin(md: MarkdownIt): void {
  md.core.ruler.push('inject_line_numbers', (state) => {
    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i];
      if (token.map && (token.nesting === 1 || token.nesting === 0)) {
        token.attrSet('data-source-line', String(token.map[0]));
      }
    }
  });
}

/**
 * 计算 Textarea 源码中每一行对应的视觉像素偏移量 (考虑 CJK 字符宽度与折行)
 */
export function computeTextareaLineOffsets(
  markdown: string,
  textarea: HTMLTextAreaElement
): number[] {
  if (!markdown) return [0, 0];

  const lines = markdown.split('\n');
  const computedStyle = window.getComputedStyle(textarea);
  const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
  const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
  const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
  const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
  const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
  const contentWidth = Math.max(10, textarea.clientWidth - paddingLeft - paddingRight);

  // 估算等宽字体单个半角字符像素宽度 (14px font-mono 约 8.4px)
  const fontSize = parseFloat(computedStyle.fontSize) || 14;
  const approxCharWidth = fontSize * 0.6;
  const charsPerLine = Math.max(10, Math.floor(contentWidth / approxCharWidth));

  const offsets: number[] = new Array(lines.length + 1);
  offsets[0] = paddingTop;
  let currentTop = paddingTop;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) {
      currentTop += lineHeight;
    } else {
      let visualLen = 0;
      for (let c = 0; c < line.length; c++) {
        const code = line.charCodeAt(c);
        // CJK 字符与全角标点按 2 个半角字符宽度计算
        if (
          (code >= 0x4e00 && code <= 0x9fff) ||
          (code >= 0x3000 && code <= 0x303f) ||
          (code >= 0xff00 && code <= 0xffef)
        ) {
          visualLen += 2;
        } else {
          visualLen += 1;
        }
      }
      const visualRows = Math.max(1, Math.ceil(visualLen / charsPerLine));
      currentTop += visualRows * lineHeight;
    }
    offsets[i + 1] = currentTop;
  }

  // 利用 DOM 实际测量出来的 textarea.scrollHeight 进行自适应校准
  const actualHeight = textarea.scrollHeight;
  const targetContentHeight = actualHeight - paddingTop - paddingBottom;
  const estimatedContentHeight = currentTop - paddingTop;

  if (estimatedContentHeight > 0 && targetContentHeight > 0) {
    const scale = targetContentHeight / estimatedContentHeight;
    for (let i = 1; i < offsets.length; i++) {
      offsets[i] = paddingTop + (offsets[i] - paddingTop) * scale;
    }
  }

  return offsets;
}

/**
 * 提取预览区域中所有带有 data-source-line 属性的块元素视觉顶部位置
 */
export function getPreviewAnchors(
  previewContainer: HTMLElement,
  totalLines: number
): ScrollAnchor[] {
  const elements = previewContainer.querySelectorAll<HTMLElement>('[data-source-line]');
  const containerRect = previewContainer.getBoundingClientRect();
  const containerScrollTop = previewContainer.scrollTop;

  const rawAnchors: ScrollAnchor[] = [];

  elements.forEach((el) => {
    const lineAttr = el.getAttribute('data-source-line');
    if (lineAttr !== null) {
      const line = parseInt(lineAttr, 10);
      if (!isNaN(line)) {
        const elRect = el.getBoundingClientRect();
        const top = elRect.top - containerRect.top + containerScrollTop;
        rawAnchors.push({ line, top });
      }
    }
  });

  // 按行号升序排列并去重（同一起始行只保留最靠前出现的块）
  rawAnchors.sort((a, b) => a.line - b.line);

  const anchors: ScrollAnchor[] = [];
  const seenLines = new Set<number>();

  // 保证起点第 0 行锚点
  anchors.push({ line: 0, top: 0 });
  seenLines.add(0);

  for (const a of rawAnchors) {
    if (!seenLines.has(a.line)) {
      seenLines.add(a.line);
      anchors.push(a);
    }
  }

  // 保证终点最大行锚点
  if (!seenLines.has(totalLines)) {
    anchors.push({ line: totalLines, top: previewContainer.scrollHeight });
  } else {
    const last = anchors[anchors.length - 1];
    if (last && last.top < previewContainer.scrollHeight) {
      anchors.push({ line: totalLines + 1, top: previewContainer.scrollHeight });
    }
  }

  return anchors;
}

/**
 * 二分查找数组中满足 arr[i] <= value < arr[i + 1] 的起始索引
 */
export function findFloorIndex(
  arr: number[] | ScrollAnchor[],
  value: number,
  key?: 'top' | 'line'
): number {
  if (arr.length <= 1) return 0;

  const getValue = (idx: number): number => {
    const item = arr[idx];
    if (typeof item === 'number') return item;
    if (key && item) return (item as any)[key];
    return 0;
  };

  if (value <= getValue(0)) return 0;
  if (value >= getValue(arr.length - 1)) return arr.length - 2;

  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midVal = getValue(mid);
    const nextVal = getValue(mid + 1);

    if (value >= midVal && value < nextVal) {
      return mid;
    } else if (value < midVal) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return Math.max(0, Math.min(low, arr.length - 2));
}

/**
 * 根据编辑区当前 scrollTop 计算预览区目标 scrollTop (分段线性插值)
 */
export function calculatePreviewScrollTop(
  textareaScrollTop: number,
  textarea: HTMLTextAreaElement,
  previewContainer: HTMLElement,
  textareaOffsets: number[],
  previewAnchors: ScrollAnchor[]
): number {
  const maxTextareaScroll = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
  const maxPreviewScroll = Math.max(0, previewContainer.scrollHeight - previewContainer.clientHeight);

  if (maxTextareaScroll <= 0 || maxPreviewScroll <= 0) return 0;
  if (textareaScrollTop <= 3) return 0;
  if (textareaScrollTop >= maxTextareaScroll - 3) return maxPreviewScroll;

  if (textareaOffsets.length < 2 || previewAnchors.length < 2) {
    return (textareaScrollTop / maxTextareaScroll) * maxPreviewScroll;
  }

  // 1. 查找当前 scrollTop 处于第几行源码区间
  const lineIdx = findFloorIndex(textareaOffsets, textareaScrollTop);
  const tStart = textareaOffsets[lineIdx];
  const tEnd = textareaOffsets[lineIdx + 1] ?? (tStart + 24);
  const lineFraction = lineIdx + (tEnd > tStart ? (textareaScrollTop - tStart) / (tEnd - tStart) : 0);

  // 2. 查找对应的预览区锚点区间
  const anchorIdx = findFloorIndex(previewAnchors, lineFraction, 'line');
  const aStart = previewAnchors[anchorIdx];
  const aEnd = previewAnchors[anchorIdx + 1] ?? aStart;

  if (!aEnd || aEnd.line === aStart.line) {
    return Math.min(maxPreviewScroll, Math.max(0, aStart.top));
  }

  const anchorFraction = (lineFraction - aStart.line) / (aEnd.line - aStart.line);
  const targetTop = aStart.top + anchorFraction * (aEnd.top - aStart.top);

  return Math.min(maxPreviewScroll, Math.max(0, targetTop));
}

/**
 * 根据预览区当前 scrollTop 计算编辑区目标 scrollTop (反向分段线性插值)
 */
export function calculateTextareaScrollTop(
  previewScrollTop: number,
  textarea: HTMLTextAreaElement,
  previewContainer: HTMLElement,
  textareaOffsets: number[],
  previewAnchors: ScrollAnchor[]
): number {
  const maxTextareaScroll = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
  const maxPreviewScroll = Math.max(0, previewContainer.scrollHeight - previewContainer.clientHeight);

  if (maxTextareaScroll <= 0 || maxPreviewScroll <= 0) return 0;
  if (previewScrollTop <= 3) return 0;
  if (previewScrollTop >= maxPreviewScroll - 3) return maxTextareaScroll;

  if (textareaOffsets.length < 2 || previewAnchors.length < 2) {
    return (previewScrollTop / maxPreviewScroll) * maxTextareaScroll;
  }

  // 1. 查找当前 previewScrollTop 处于哪两个锚点之间
  const anchorIdx = findFloorIndex(previewAnchors, previewScrollTop, 'top');
  const aStart = previewAnchors[anchorIdx];
  const aEnd = previewAnchors[anchorIdx + 1] ?? aStart;

  let sourceLine = aStart.line;
  if (aEnd && aEnd.top > aStart.top) {
    const progress = (previewScrollTop - aStart.top) / (aEnd.top - aStart.top);
    sourceLine = aStart.line + progress * (aEnd.line - aStart.line);
  }

  // 2. 将 sourceLine 映射回 textareaOffsets
  const lineIdx = Math.min(Math.floor(sourceLine), textareaOffsets.length - 2);
  const lineFraction = sourceLine - lineIdx;
  const tStart = textareaOffsets[lineIdx];
  const tEnd = textareaOffsets[lineIdx + 1] ?? (tStart + 24);

  const targetTop = tStart + lineFraction * (tEnd - tStart);
  return Math.min(maxTextareaScroll, Math.max(0, targetTop));
}
