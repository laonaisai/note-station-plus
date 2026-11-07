import { describe, it, expect, beforeAll } from 'vitest';
import { SynologyApiClient, SYNO_ERROR_MESSAGES } from '@/api/SynologyApiClient';
import { markdownToNoteHtml, noteHtmlToMarkdown } from '@/utils/markdown';
import { ServerProfile } from '@/types/synology';

const server1Profile: ServerProfile = {
  id: 'test-180',
  alias: '测试服务1 (180)',
  serverUrl: 'http://172.28.10.180:5000',
  account: 'notedev',
  password: 'Ghsy#ds.v24',
  allowInsecureSSL: true,
  createdAt: Date.now()
};

const server2Profile: ServerProfile = {
  id: 'test-182',
  alias: '测试服务2 (182)',
  serverUrl: 'http://172.28.10.182:5000',
  account: 'notedev',
  password: 'Ghsy#ds.v24',
  allowInsecureSSL: true,
  createdAt: Date.now()
};

describe('1. Markdown 双向转换与无损保留测试', () => {
  it('应能正确将复杂 Markdown 转换为带隐式注释的 Note Station HTML 并 100% 无损还原', () => {
    const rawMarkdown = `# 深度学习笔记

这是一段正文，包含 **粗体** 和 *斜体*，以及 [链接](https://synology.com)。

## 代码示例
\`\`\`typescript
interface Note {
  title: string;
  content: string;
}
\`\`\`

## 表格
| 节点 | 状态 | 延迟 |
| :--- | :--- | :--- |
| Server 1 | 在线 | 2ms |
| Server 2 | 在线 | 3ms |

- [x] 完成 API 封装
- [ ] 完成前端界面
`;

    // 1. 转为 Note Station HTML
    const html = markdownToNoteHtml(rawMarkdown);
    expect(html).toContain('<h1>深度学习笔记</h1>');
    expect(html).toContain('<!-- note-station-plus:markdown');

    // 2. 无损反解还原
    const restoredMarkdown = noteHtmlToMarkdown(html);
    expect(restoredMarkdown).toBe(rawMarkdown);
  });

  it('对于群晖官方原生的纯 HTML 便签，应能通过 Turndown 兜底转换为 Markdown', () => {
    const legacyHtml = '<div><h2>官方原生便签标题</h2><p>这是群晖官方客户端创建的文本。<br>第二行。</p><ul><li>条目 A</li><li>条目 B</li></ul></div>';
    const md = noteHtmlToMarkdown(legacyHtml);
    expect(md).toContain('## 官方原生便签标题');
    expect(md).toContain('条目 A');
  });
});

describe('2. 服务1 (172.28.10.180) 真实环境 API 联调测试', () => {
  const client = new SynologyApiClient(server1Profile);
  let parentNotebookId = '';
  let createdNoteId = '';

  it('成功登录并获取有效 Session ID (_sid)', async () => {
    const sid = await client.login();
    expect(sid).toBeDefined();
    expect(typeof sid).toBe('string');
    expect(sid.length).toBeGreaterThan(10);
    expect(client.sid).toBe(sid);
  });

  it('能成功列出笔记本列表', async () => {
    const notebooks = await client.listNotebooks();
    expect(Array.isArray(notebooks)).toBe(true);
    expect(notebooks.length).toBeGreaterThan(0);
    parentNotebookId = notebooks[0].object_id;
    expect(parentNotebookId).toBeDefined();
  });

  it('能在笔记本中创建 Markdown 便签 (含标签测试)', async () => {
    const testTitle = `Vitest 便签 180 - ${Date.now()}`;
    const testMarkdown = `# 自动化测试\n\n来自 Vitest 自动化单元测试的便签内容。\n\n- 时间戳: ${Date.now()}`;
    const testTags = ['自动化', 'Vitest'];

    const note = await client.createNote(parentNotebookId, testTitle, testMarkdown, testTags);
    expect(note).toBeDefined();
    expect(note.object_id).toBeDefined();
    expect(note.title).toBe(testTitle);
    createdNoteId = note.object_id;

    // 验证 listNotes 能够将便签标签正确关联输出
    const listRes = await client.listNotes(parentNotebookId);
    const found = listRes.notes.find(n => n.object_id === createdNoteId);
    expect(found).toBeDefined();
    expect(found?.tag).toEqual(expect.arrayContaining(['自动化', 'Vitest']));
  });

  it('能获取刚刚创建的便签并验证无损还原的 Markdown 内容', async () => {
    expect(createdNoteId).toBeTruthy();
    const note = await client.getNote(createdNoteId);
    expect(note.object_id).toBe(createdNoteId);
    expect(note.markdownContent).toContain('# 自动化测试');
  });

  it('能成功更新该便签的内容与标题', async () => {
    expect(createdNoteId).toBeTruthy();
    const updatedTitle = `Vitest 便签 180 (已更新) - ${Date.now()}`;
    const updatedMarkdown = `## 已完成更新\n\n- 更新状态: OK`;

    const ok = await client.updateNote(createdNoteId, updatedTitle, updatedMarkdown);
    expect(ok).toBe(true);

    const note = await client.getNote(createdNoteId);
    expect(note.title).toBe(updatedTitle);
    expect(note.markdownContent).toContain('## 已完成更新');
  });

  it('能通过 SYNO.NoteStation.FTS 全文检索接口成功搜索到便签正文关键词', async () => {
    expect(createdNoteId).toBeTruthy();
    let matched = false;
    for (let i = 0; i < 8; i++) {
      const searchResults = await client.searchNotes('已完成更新');
      if (Array.isArray(searchResults) && searchResults.some(n => n.object_id === createdNoteId)) {
        matched = true;
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    expect(matched).toBe(true);
  }, 15000);

  it('能成功删除该测试便签', async () => {
    expect(createdNoteId).toBeTruthy();
    const ok = await client.deleteNote(createdNoteId);
    expect(ok).toBe(true);
  });
});

describe('3. 服务2 (172.28.10.182) 真实环境 API 联调测试', () => {
  const client2 = new SynologyApiClient(server2Profile);
  let parentNotebookId = '';
  let createdNoteId = '';

  it('成功登录服务2并获取有效 Session ID (_sid)', async () => {
    const sid = await client2.login();
    expect(sid).toBeDefined();
    expect(client2.sid).toBe(sid);
  });

  it('能成功获取服务2的笔记本列表', async () => {
    const notebooks = await client2.listNotebooks();
    expect(Array.isArray(notebooks)).toBe(true);
    expect(notebooks.length).toBeGreaterThan(0);
    parentNotebookId = notebooks[0].object_id;
  });

  it('能在服务2中创建、读取并删除测试便签', async () => {
    const title = `服务2测试便签 - ${Date.now()}`;
    const md = `# 服务2便签\n测试数据隔离与会话独立性`;

    // 1. 创建
    const note = await client2.createNote(parentNotebookId, title, md);
    createdNoteId = note.object_id;
    expect(createdNoteId).toBeTruthy();

    // 2. 读取验证
    const fetched = await client2.getNote(createdNoteId);
    expect(fetched.title).toBe(title);
    expect(fetched.markdownContent).toContain('# 服务2便签');

    // 3. 删除
    const ok = await client2.deleteNote(createdNoteId);
    expect(ok).toBe(true);
  });
});

describe('4. 异常处理与鉴权失败防护测试', () => {
  it('输入错误密码应明确抛出认证失败错误', async () => {
    const badClient = new SynologyApiClient({
      ...server1Profile,
      password: 'WrongPassword123!'
    });

    await expect(badClient.login()).rejects.toThrow('用户名或密码错误');
  });
});

