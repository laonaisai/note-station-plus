import { describe, it, expect } from 'vitest';
import { buildPrintHtml } from '@/utils/printNote';
import type { SynoNote } from '@/types/synology';

describe('Print Utilities & PrintModal content generation', () => {
  it('buildPrintHtml formats note with title, metadata, notebook title and rendered Markdown content', () => {
    const note: SynoNote = {
      object_id: 'note_123',
      parent_id: 'nb_456',
      title: '工作周报与总结',
      brief: '',
      content: '',
      markdownContent: '## 本周产出\n\n- 完成核心功能重构\n- 修复历史遗留缺陷\n\n| 任务 | 状态 |\n| :--- | :--- |\n| 缺陷修复 | 已完成 |',
      ctime: 1700000000,
      mtime: 1700003600,
      ver: '1',
      tag: ['工作', '周报']
    };

    const html = buildPrintHtml(note, '工作笔记本', undefined, undefined, true);

    expect(html).toContain('工作周报与总结');
    expect(html).toContain('工作笔记本');
    expect(html).toContain('工作, 周报');
    expect(html).toContain('本周产出</h2>');
    expect(html).toContain('完成核心功能重构</li>');
    expect(html).toContain('<table');
  });

  it('buildPrintHtml supports live markdownOverride and attachment image resolution', () => {
    const note: SynoNote = {
      object_id: 'note_img',
      parent_id: 'nb_1',
      title: '架构设计图',
      brief: '',
      content: '',
      markdownContent: '',
      ctime: 1700000000,
      mtime: 1700003600,
      ver: '1',
      tag: [],
      attachment: [
        {
          id: 'file_001',
          file_id: 'file_001',
          name: 'architecture.png',
          size: 2048,
          type: 'image/png'
        }
      ]
    };

    const liveMarkdown = '# 最新架构图\n\n🖼️ [图片: architecture.png]';
    const getAttachmentUrl = (fileId: string, filename?: string) => `/download?id=${fileId}&name=${filename}`;

    const html = buildPrintHtml(note, '系统设计', liveMarkdown, getAttachmentUrl, true);

    expect(html).toContain('最新架构图</h1>');
    expect(html).toContain('src="/download?id=file_001&amp;name=architecture.png"');
    expect(html).not.toContain('🖼️ [图片:');
  });

  it('buildPrintHtml handles empty content with friendly message instead of blank void', () => {
    const emptyNote: SynoNote = {
      object_id: 'note_empty',
      parent_id: 'nb_1',
      title: '空白便签',
      brief: '',
      content: '',
      markdownContent: '',
      ctime: 1700000000,
      mtime: 1700003600,
      ver: '1',
      tag: []
    };

    const html = buildPrintHtml(emptyNote, '日常笔记', '', undefined, true);
    expect(html).toContain('空白便签');
    expect(html).toContain('此便签正文为空');
  });
});

