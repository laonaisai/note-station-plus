import { describe, it, expect } from 'vitest';
import { parseImportMarkdown } from '@/utils/importMarkdown';
import { buildExportMarkdownContent } from '@/utils/exportMarkdown';
import { SynoNote } from '@/types/synology';

describe('Markdown 导入解析器 (importMarkdown) 单元测试', () => {
  it('1. 能正确解析标准 YAML Frontmatter (包含标题、笔记本与标签列表)', () => {
    const raw = `---
title: "我的技术便签"
notebook: "技术笔记"
tags:
  - Vue3
  - Synology
  - TypeScript
---

# 这是技术笔记正文

正文内容...
`;

    const parsed = parseImportMarkdown(raw, 'test-file.md');
    expect(parsed.title).toBe('我的技术便签');
    expect(parsed.notebookTitle).toBe('技术笔记');
    expect(parsed.tags).toEqual(['Vue3', 'Synology', 'TypeScript']);
    expect(parsed.content.trim()).toBe('# 这是技术笔记正文\n\n正文内容...');
  });

  it('2. 能正确解析内联数组格式的标签 tags: [A, B]', () => {
    const raw = `---
title: 内联标签便签
tags: [前端, 桌面端, Electron]
---

正文第一段。
`;

    const parsed = parseImportMarkdown(raw);
    expect(parsed.title).toBe('内联标签便签');
    expect(parsed.tags).toEqual(['前端', '桌面端', 'Electron']);
    expect(parsed.content.trim()).toBe('正文第一段。');
  });

  it('3. 无 Frontmatter 时优先提取首行 H1 标题 (# Title)', () => {
    const raw = `

# 快速备忘录

- [x] 购买牛奶
- [ ] 备份 NAS 数据
`;

    const parsed = parseImportMarkdown(raw, 'backup-list.md');
    expect(parsed.title).toBe('快速备忘录');
    expect(parsed.tags).toEqual([]);
    expect(parsed.content).toContain('- [x] 购买牛奶');
  });

  it('4. 无 Frontmatter 且无 H1 标题时自动回退为文件名（去除 .md 后缀）', () => {
    const raw = `这是没有标题的纯文本 Markdown 内容。
第二行段落。`;

    const parsed = parseImportMarkdown(raw, '会议纪要 2026-11-05.md');
    expect(parsed.title).toBe('会议纪要 2026-11-05');
  });

  it('5. 导出 (exportSingleNote) 与 导入 (parseImportMarkdown) 完美闭环互通', () => {
    const originalNote: SynoNote = {
      object_id: 'n_roundtrip',
      parent_id: 'nb_1',
      title: '闭环测试便签',
      brief: '',
      content: '',
      markdownContent: '## 章节标题\n\n测试导出后再重新导入的完整性与标题保留。',
      ctime: 1700000000,
      mtime: 1700003600,
      ver: '1',
      tag: ['自动化', '测试']
    };

    // 1. 导出为包含 Frontmatter 的字符串
    const exportedMd = buildExportMarkdownContent(originalNote, '归档笔记本', true);

    // 2. 导入解析
    const imported = parseImportMarkdown(exportedMd, 'fallback.md');

    expect(imported.title).toBe(originalNote.title);
    expect(imported.notebookTitle).toBe('归档笔记本');
    expect(imported.tags).toEqual(['自动化', '测试']);
    expect(imported.content.trim()).toBe(originalNote.markdownContent!.trim());
  });
});
