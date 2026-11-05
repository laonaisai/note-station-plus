import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  sanitizeFilename,
  buildExportMarkdownContent
} from '@/utils/exportMarkdown';
import { SynoNote } from '@/types/synology';

describe('便签导出为 Markdown 功能测试', () => {
  it('1. 文件名安全清洗函数 (sanitizeFilename) 能正确剔除跨平台非法字符', () => {
    expect(sanitizeFilename('正常标题')).toBe('正常标题');
    expect(sanitizeFilename('文件:包含/斜杠\\与*星号?')).toBe('文件_包含_斜杠_与_星号_');
    expect(sanitizeFilename('标题"包含<尖括号>与|竖线')).toBe('标题_包含_尖括号_与_竖线');
    expect(sanitizeFilename('')).toBe('无标题便签');
    expect(sanitizeFilename('   ')).toBe('无标题便签');
  });

  it('2. 便签导出 Markdown 内容组装 (含 Frontmatter)', () => {
    const mockNote: SynoNote = {
      object_id: 'note_123',
      parent_id: 'nb_1',
      title: '测试导出便签',
      brief: '',
      content: '',
      markdownContent: '# 一级标题\n\n正文内容，包含列表：\n- 条目1\n- 条目2',
      ctime: 1700000000,
      mtime: 1700003600,
      ver: 'v1',
      tag: ['工作', 'Synology']
    };

    // 1. 含 Frontmatter
    const mdWithFrontmatter = buildExportMarkdownContent(mockNote, '我的笔记本', true);
    expect(mdWithFrontmatter).toContain('---');
    expect(mdWithFrontmatter).toContain('title: "测试导出便签"');
    expect(mdWithFrontmatter).toContain('notebook: "我的笔记本"');
    expect(mdWithFrontmatter).toContain('  - 工作');
    expect(mdWithFrontmatter).toContain('  - Synology');
    expect(mdWithFrontmatter).toContain('# 一级标题');

    // 2. 纯 Markdown
    const pureMd = buildExportMarkdownContent(mockNote, '我的笔记本', false);
    expect(pureMd).not.toContain('---');
    expect(pureMd).toBe('# 一级标题\n\n正文内容，包含列表：\n- 条目1\n- 条目2');
  });

  it('3. JSZip 多便签打包导出支持同名便签自动去重编号', async () => {
    const notes: SynoNote[] = [
      {
        object_id: 'n1',
        parent_id: 'nb_1',
        title: '同名便签',
        brief: '',
        content: '',
        markdownContent: '# 便签 1 内容',
        ctime: 1700000000,
        mtime: 1700000000,
        ver: '1',
        tag: []
      },
      {
        object_id: 'n2',
        parent_id: 'nb_1',
        title: '同名便签',
        brief: '',
        content: '',
        markdownContent: '# 便签 2 内容',
        ctime: 1700001000,
        mtime: 1700001000,
        ver: '2',
        tag: []
      },
      {
        object_id: 'n3',
        parent_id: 'nb_1',
        title: '不同名便签',
        brief: '',
        content: '',
        markdownContent: '# 便签 3 内容',
        ctime: 1700002000,
        mtime: 1700002000,
        ver: '3',
        tag: []
      }
    ];

    const zip = new JSZip();
    const usedNames = new Set<string>();

    for (const note of notes) {
      let baseName = sanitizeFilename(note.title);
      let finalName = `${baseName}.md`;
      let counter = 1;

      while (usedNames.has(finalName)) {
        finalName = `${baseName} (${counter++}).md`;
      }
      usedNames.add(finalName);

      const content = buildExportMarkdownContent(note, '工作笔记本', true);
      zip.file(finalName, content);
    }

    const zipBlob = await zip.generateAsync({ type: 'nodebuffer' });
    expect(zipBlob).toBeDefined();

    // 解析生成的 zip 验证文件列表
    const unzipped = await JSZip.loadAsync(zipBlob);
    const files = Object.keys(unzipped.files);

    expect(files).toContain('同名便签.md');
    expect(files).toContain('同名便签 (1).md');
    expect(files).toContain('不同名便签.md');

    const content1 = await unzipped.file('同名便签.md')?.async('text');
    expect(content1).toContain('# 便签 1 内容');

    const content2 = await unzipped.file('同名便签 (1).md')?.async('text');
    expect(content2).toContain('# 便签 2 内容');
  });
});

