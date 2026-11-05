import { describe, it, expect } from 'vitest';
import {
  parseImportMarkdown,
  detectAndDecodeText,
  readMarkdownFile
} from '@/utils/importMarkdown';
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

  it('6. GB2312 / GBK 编码的二进制数据能被智能识别为 gb18030 且中文无乱码', () => {
    // '测试便签内容' 在 GB2312 编码下的字节序列:
    // '测': 0xB2, 0xE2
    // '试': 0xCA, 0xD4
    // '便': 0xB1, 0xE3
    // '签': 0xC7, 0xA9
    // '内': 0xC4, 0xDA
    // '容': 0xC8, 0xDD
    const gbkBytes = new Uint8Array([
      0xB2, 0xE2,
      0xCA, 0xD4,
      0xB1, 0xE3,
      0xC7, 0xA9,
      0xC4, 0xDA,
      0xC8, 0xDD
    ]);

    const decoded = detectAndDecodeText(gbkBytes);
    expect(decoded.encoding).toBe('gb18030');
    expect(decoded.text).toBe('测试便签内容');
    expect(decoded.text).not.toContain('\uFFFD');
  });

  it('7. 带 UTF-8 BOM 头的文件能被正确识别并剔除 BOM 字符', () => {
    const text = '# 带BOM测试\n\n正文内容';
    const utf8Bytes = new TextEncoder().encode(text);
    // Add BOM: 0xEF, 0xBB, 0xBF
    const bomBytes = new Uint8Array([0xEF, 0xBB, 0xBF, ...utf8Bytes]);

    const decoded = detectAndDecodeText(bomBytes);
    expect(decoded.hasBom).toBe(true);
    expect(decoded.encoding).toBe('utf-8');
    expect(decoded.text).toBe(text);
    expect(decoded.text.charCodeAt(0)).not.toBe(0xFEFF);
  });

  it('8. readMarkdownFile 支持完整 GB2312 真实便签文件解析', async () => {
    // 构造一个完整的 GB2312 Markdown 便签，包含 Frontmatter
    // '---' + '\n' + 'title: GB2312测试便签' + '\n' + '---' + '\n\n' + '# 正文标题\n\n中文正常'
    // 'GB2312测试便签':
    // G: 0x47, B: 0x42, 2: 0x32, 3: 0x33, 1: 0x31, 2: 0x32
    // 测: 0xB2 0xE2, 试: 0xCA 0xD4, 便: 0xB1 0xE3, 签: 0xC7 0xA9
    const rawGbkString = [
      0x2D, 0x2D, 0x2D, 0x0A, // ---\n
      0x74, 0x69, 0x74, 0x6C, 0x65, 0x3A, 0x20, // title: 
      0x47, 0x42, 0x32, 0x33, 0x31, 0x32, // GB2312
      0xB2, 0xE2, 0xCA, 0xD4, 0xB1, 0xE3, 0xC7, 0xA9, // 测试便签
      0x0A, 0x2D, 0x2D, 0x2D, 0x0A, 0x0A, // \n---\n\n
      0x23, 0x20, // # 
      0xD6, 0xD0, 0xCE, 0xC4, 0xD5, 0xFD, 0xCE, 0xC4 // 中文正文 (中:0xD6D0, 文:0xCEC4, 正:0xD5FD, 文:0xCEC4)
    ];

    const blob = new Blob([new Uint8Array(rawGbkString)], { type: 'text/markdown' });
    const file = new File([blob], 'gb2312-note.md', { type: 'text/markdown' });

    const result = await readMarkdownFile(file);
    expect(result.encoding).toBe('gb18030');
    expect(result.title).toBe('GB2312测试便签');
    expect(result.content).toContain('中文正文');
    expect(result.content).not.toContain('\uFFFD');
  });
});
