import { describe, it, expect } from 'vitest';
import { markdownToNoteHtml, noteHtmlToMarkdown } from '@/utils/markdown';

describe('Markdown Escape & Roundtrip Tests (Fix Over-escaping of _ and *)', () => {
  it('does not over-escape _ and * in markdownToNoteHtml and noteHtmlToMarkdown roundtrip', () => {
    const rawMarkdown = `# 测试标题

这是一段测试文本：
- 变量名: user_id, user_name, access_token_secret
- 乘法与算式: 10 * 20 = 200, 3 * 5 = 15
- 特殊符号组合: _*强调*_
- 粗体: **粗体文本**
- 斜体: *斜体文本*
- 代码: \`const foo_bar = 1 * 2;\`
- 复合标识符: \`tbl_user_order_detail\`
`;

    const html = markdownToNoteHtml(rawMarkdown);
    const roundtrip = noteHtmlToMarkdown(html);

    expect(roundtrip).toBe(rawMarkdown);
    expect(roundtrip).not.toContain('user\\_id');
    expect(roundtrip).not.toContain('10 \\* 20');
    expect(roundtrip).not.toContain('\\_\\*');
  });

  it('converts raw HTML from DSM web without comments without escaping _ and *', () => {
    // Simulating external note created in Synology Note Station official web / mobile app
    const externalHtml = `
      <h1>便签标题</h1>
      <p>这是从群晖官方客户端创建的便签：</p>
      <p>变量名: user_id, user_name, access_token_secret</p>
      <p>算式: 10 * 20 = 200</p>
      <p>组合符号: _*强调*_</p>
      <p>代码标识: <code>item_id_v2</code></p>
      <p>加粗: <strong>很棒的内容</strong></p>
      <p>斜体: <em>斜体文字</em></p>
    `;

    const converted = noteHtmlToMarkdown(externalHtml);

    // Should NOT contain over-escaped backslashes
    expect(converted).not.toContain('user\\_id');
    expect(converted).not.toContain('10 \\* 20');
    expect(converted).not.toContain('\\_\\*');
    expect(converted).toContain('user_id');
    expect(converted).toContain('10 * 20');
    expect(converted).toContain('很棒的内容');
    expect(converted).toContain('斜体文字');
  });

  it('correctly parses comments with CRLF (\\r\\n) line endings', () => {
    const rawMarkdown = '便签内容包含 user_id 和 10 * 20 以及 _*组合*_';
    const htmlWithLf = markdownToNoteHtml(rawMarkdown);
    // Convert to Windows / network CRLF line endings
    const htmlWithCrlf = htmlWithLf.replace(/\n/g, '\r\n');

    const result = noteHtmlToMarkdown(htmlWithCrlf);
    expect(result).toBe(rawMarkdown);
    expect(result).not.toContain('\\_');
    expect(result).not.toContain('\\*');
  });

  it('handles multiple rounds of save and load without backslash duplication', () => {
    let md = '初始内容: user_id, 10 * 20, _*';

    for (let i = 0; i < 5; i++) {
      const html = markdownToNoteHtml(md);
      md = noteHtmlToMarkdown(html);
    }

    expect(md).toBe('初始内容: user_id, 10 * 20, _*');
    expect(md).not.toContain('\\_');
    expect(md).not.toContain('\\*');
  });
});
