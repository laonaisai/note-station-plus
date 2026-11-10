import { describe, it, expect } from 'vitest';
import { noteHtmlToMarkdown, markdownToNoteHtml } from '@/utils/markdown';

describe('Rich Text Table to Markdown Conversion', () => {
  it('converts Synology Note Station default table (tbody only, without thead/th) to GFM table', () => {
    const html = `
      <table border="1" cellpadding="2" cellspacing="0" style="width: 100%;">
        <tbody>
          <tr>
            <td>列1</td>
            <td>列2</td>
            <td>列3</td>
          </tr>
          <tr>
            <td>数据1</td>
            <td>数据2</td>
            <td>数据3</td>
          </tr>
        </tbody>
      </table>
    `;

    const md = noteHtmlToMarkdown(html);
    expect(md).toContain('| 列1 | 列2 | 列3 |');
    expect(md).toContain('| --- | --- | --- |');
    expect(md).toContain('| 数据1 | 数据2 | 数据3 |');
  });

  it('converts table with thead, th, and column alignments correctly', () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="center">Status</th>
            <th align="right">Score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td align="left">Alice</td>
            <td align="center">Pass</td>
            <td align="right">95</td>
          </tr>
        </tbody>
      </table>
    `;

    const md = noteHtmlToMarkdown(html);
    expect(md).toContain('| Name | Status | Score |');
    expect(md).toContain('| :--- | :---: | ---: |');
    expect(md).toContain('| Alice | Pass | 95 |');
  });

  it('converts style="text-align: center" into markdown alignment delimiters', () => {
    const html = `
      <table>
        <tbody>
          <tr>
            <td style="text-align: center;">Centering</td>
            <td style="text-align: right;">Right</td>
          </tr>
          <tr>
            <td>Value A</td>
            <td>Value B</td>
          </tr>
        </tbody>
      </table>
    `;

    const md = noteHtmlToMarkdown(html);
    expect(md).toContain('| Centering | Right |');
    expect(md).toContain('| :---: | ---: |');
    expect(md).toContain('| Value A | Value B |');
  });

  it('handles multiline paragraphs and br inside cells without breaking table structure', () => {
    const html = `
      <table>
        <tbody>
          <tr>
            <td>Item</td>
            <td>Details</td>
          </tr>
          <tr>
            <td>Package</td>
            <td><p>Line 1</p><p>Line 2</p></td>
          </tr>
          <tr>
            <td>Single</td>
            <td>Direct<br>Break</td>
          </tr>
        </tbody>
      </table>
    `;

    const md = noteHtmlToMarkdown(html);
    const lines = md.split('\n').filter(l => l.trim().startsWith('|'));
    // Should have 4 table lines: Header, Delimiter, Row 1, Row 2
    expect(lines.length).toBe(4);
    expect(lines[2]).toContain('Line 1<br>Line 2');
    expect(lines[3]).toContain('Direct<br>Break');
  });

  it('escapes unescaped pipe characters inside table cells so columns do not split', () => {
    const html = `
      <table>
        <tbody>
          <tr>
            <td>Command</td>
            <td>Example</td>
          </tr>
          <tr>
            <td>grep</td>
            <td>cat log.txt | grep error</td>
          </tr>
        </tbody>
      </table>
    `;

    const md = noteHtmlToMarkdown(html);
    expect(md).toContain('cat log.txt \\| grep error');
  });

  it('preserves rich formatting inside table cells (bold, italic, code, link)', () => {
    const html = `
      <table>
        <tbody>
          <tr>
            <td><strong>Feature</strong></td>
            <td><em>Status</em></td>
            <td>Link</td>
          </tr>
          <tr>
            <td><code>TableConvert</code></td>
            <td>Active</td>
            <td><a href="https://example.com">Docs</a></td>
          </tr>
        </tbody>
      </table>
    `;

    const md = noteHtmlToMarkdown(html);
    expect(md).toContain('**Feature**');
    expect(md).toMatch(/(\*|_)Status(\*|_)/);
    expect(md).toContain('`TableConvert`');
    expect(md).toContain('[Docs](https://example.com)');
  });

  it('handles irregular column counts and colspans gracefully', () => {
    const html = `
      <table>
        <tbody>
          <tr>
            <th>Header 1</th>
            <th>Header 2</th>
            <th>Header 3</th>
          </tr>
          <tr>
            <td colspan="2">Spanned</td>
            <td>Normal</td>
          </tr>
        </tbody>
      </table>
    `;

    const md = noteHtmlToMarkdown(html);
    expect(md).toContain('| Header 1 | Header 2 | Header 3 |');
    expect(md).toContain('| --- | --- | --- |');
    expect(md).toContain('| Spanned | | Normal |');
  });

  it('handles clean non-breaking spaces and empty cells', () => {
    const html = `
      <table>
        <tbody>
          <tr>
            <td>Col 1</td>
            <td>Col 2</td>
          </tr>
          <tr>
            <td>&nbsp;</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `;

    const md = noteHtmlToMarkdown(html);
    expect(md).toContain('| Col 1 | Col 2 |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('|  |  |');
  });

  it('surrounds tables with blank lines so they do not merge with adjacent paragraphs', () => {
    const html = `
      <p>Introduction paragraph.</p>
      <table>
        <tbody>
          <tr><td>A</td><td>B</td></tr>
          <tr><td>1</td><td>2</td></tr>
        </tbody>
      </table>
      <p>Conclusion paragraph.</p>
    `;

    const md = noteHtmlToMarkdown(html);
    expect(md).toMatch(/Introduction paragraph\.\s+\| A \| B \|\s+\| --- \| --- \|\s+\| 1 \| 2 \|\s+Conclusion paragraph\./);
  });

  it('supports full roundtrip: HTML -> Markdown -> Note HTML (preserves table tags for Synology server)', () => {
    const originalHtml = `
      <table>
        <tbody>
          <tr><td>Key</td><td>Value</td></tr>
          <tr><td>Server</td><td>DiskStation</td></tr>
        </tbody>
      </table>
    `;

    const md = noteHtmlToMarkdown(originalHtml);
    const convertedNoteHtml = markdownToNoteHtml(md);

    expect(convertedNoteHtml).toContain('<table');
    expect(convertedNoteHtml).toContain('<thead>');
    expect(convertedNoteHtml).toContain('<th>Key</th>');
    expect(convertedNoteHtml).toContain('<td>DiskStation</td>');
    expect(convertedNoteHtml).toContain('<!-- note-station-plus:markdown');
  });
});
