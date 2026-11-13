import { describe, it, expect } from 'vitest';
import { noteHtmlToMarkdown, markdownToNoteHtml } from '@/utils/markdown';

describe('Strikethrough conversion & Synology Note Station compatibility', () => {
  it('converts official Synology TinyMCE span with line-through to markdown strikethrough', () => {
    const html = '<p><span style="text-decoration: line-through;">已废弃的需求</span></p>';
    const md = noteHtmlToMarkdown(html);
    expect(md.trim()).toBe('~~已废弃的需求~~');
  });

  it('converts multi-style span with line-through to markdown strikethrough', () => {
    const html = '<p><span style="color: #ff0000; font-size: 14px; text-decoration: line-through;">红色已废弃文字</span></p>';
    const md = noteHtmlToMarkdown(html);
    expect(md.trim()).toBe('~~红色已废弃文字~~');
  });

  it('converts del, s, strike HTML elements to markdown strikethrough', () => {
    expect(noteHtmlToMarkdown('<p><del>删除内容1</del></p>').trim()).toBe('~~删除内容1~~');
    expect(noteHtmlToMarkdown('<p><s>删除内容2</s></p>').trim()).toBe('~~删除内容2~~');
    expect(noteHtmlToMarkdown('<p><strike>删除内容3</strike></p>').trim()).toBe('~~删除内容3~~');
  });

  it('converts block element with line-through style to markdown strikethrough', () => {
    const html = '<p style="text-decoration: line-through;">整段被划掉的内容</p>';
    const md = noteHtmlToMarkdown(html);
    expect(md.trim()).toBe('~~整段被划掉的内容~~');
  });

  it('prevents quadruple tildes on nested strikethrough elements', () => {
    const html = '<p><span style="text-decoration: line-through;"><del>嵌套删除内容</del></span></p>';
    const md = noteHtmlToMarkdown(html);
    expect(md.trim()).toBe('~~嵌套删除内容~~');
  });

  it('generates official Synology TinyMCE compliant HTML from markdown strikethrough', () => {
    const md = '这是一段 ~~待删除文本~~ 示例';
    const html = markdownToNoteHtml(md);
    expect(html).toContain('<span style="text-decoration: line-through;">待删除文本</span>');
  });

  it('maintains strikethrough across round-tripping with external modification (hash mismatch fallback)', () => {
    const originalMd = '这是一段 ~~被划掉的文字~~ 正常文字';
    // 1. NSP generates Note Station HTML
    const noteHtml = markdownToNoteHtml(originalMd);
    expect(noteHtml).toContain('<span style="text-decoration: line-through;">被划掉的文字</span>');

    // 2. Simulate external edit in Synology official client (hash mismatch or comment removed)
    const externallyModifiedHtml = noteHtml.replace(/<!-- note-station-plus:markdown[\s\S]*?-->/, '') +
      '<p><span style="text-decoration: line-through;">官方添加的删除线</span></p>';

    // 3. NSP imports the externally edited note
    const convertedMd = noteHtmlToMarkdown(externallyModifiedHtml);
    expect(convertedMd).toContain('~~被划掉的文字~~');
    expect(convertedMd).toContain('~~官方添加的删除线~~');
  });
});
