import { describe, it, expect } from 'vitest';
import { SynologyApiClient } from '@/api/SynologyApiClient';
import { ServerProfile, SynoNote } from '@/types/synology';

const server1Profile: ServerProfile = {
  id: 'test-sync-180',
  alias: '服务1 (180)',
  serverUrl: 'http://172.28.10.180:5000',
  account: 'notedev',
  password: 'Ghsy#ds.v24',
  allowInsecureSSL: true,
  createdAt: Date.now()
};

const server2Profile: ServerProfile = {
  id: 'test-sync-182',
  alias: '服务2 (182)',
  serverUrl: 'http://172.28.10.182:5000',
  account: 'notedev',
  password: 'Ghsy#ds.v24',
  allowInsecureSSL: true,
  createdAt: Date.now()
};

describe('跨服务便签同步 (REQ-3) 核心算法实机联调测试', () => {
  const client1 = new SynologyApiClient(server1Profile);
  const client2 = new SynologyApiClient(server2Profile);

  let nb1Id = '';
  let nb2Id = '';
  let sourceNoteId = '';
  let syncedNoteId = '';

  const syncTitle = `跨服务同步联调便签 - ${Date.now()}`;
  const initialContent = `# 原始便签 (服务1)\n\n来自 180 服务的测试数据。\n\n- 时间: ${new Date().toISOString()}`;
  const updatedContent = `# 已更新便签 (覆盖测试)\n\n这是更新后的第二版内容，测试覆盖更新算法。\n\n- 更新时间: ${Date.now()}`;

  it('1. 初始化两台服务器会话及笔记本', async () => {
    await client1.login();
    await client2.login();

    const nbList1 = await client1.listNotebooks();
    expect(nbList1.length).toBeGreaterThan(0);
    nb1Id = nbList1[0].object_id;

    const nbList2 = await client2.listNotebooks();
    expect(nbList2.length).toBeGreaterThan(0);
    nb2Id = nbList2[0].object_id;
  });

  it('2. 在服务1创建源便签', async () => {
    const note = await client1.createNote(nb1Id, syncTitle, initialContent);
    expect(note).toBeDefined();
    expect(note.object_id).toBeTruthy();
    sourceNoteId = note.object_id;
  });

  it('3. 跨服务同步第一阶段：目标服务2无同名便签 -> 自动触发新建', async () => {
    // 目标服务2检查同名便签
    const { notes } = await client2.listNotes(nb2Id);
    let matched = notes.find(n => n.title.trim() === syncTitle.trim());
    expect(matched).toBeUndefined(); // 预期未找到

    // 执行新建同步
    const createdInServer2 = await client2.createNote(nb2Id, syncTitle, initialContent);
    expect(createdInServer2.object_id).toBeTruthy();
    syncedNoteId = createdInServer2.object_id;

    // 验证服务2中的便签
    const fetched = await client2.getNote(syncedNoteId);
    expect(fetched.title).toBe(syncTitle);
    expect(fetched.markdownContent).toContain('来自 180 服务的测试数据');
  });

  it('4. 跨服务同步第二阶段：源便签内容变更 -> 目标服务2匹配到同名便签 -> 自动触发覆盖更新', async () => {
    // 1. 服务1先更新
    await client1.updateNote(sourceNoteId, syncTitle, updatedContent);

    // 2. 模拟同步调度器在服务2上按标题检索
    const { notes } = await client2.listNotes(nb2Id);
    const matched = notes.find(n => n.title.trim() === syncTitle.trim());
    expect(matched).toBeDefined();
    expect(matched?.object_id).toBe(syncedNoteId);

    // 3. 执行覆盖更新
    const ok = await client2.updateNote(matched!.object_id, syncTitle, updatedContent);
    expect(ok).toBe(true);

    // 4. 验证服务2的内容已更新
    const targetNote = await client2.getNote(matched!.object_id);
    expect(targetNote.title).toBe(syncTitle);
    expect(targetNote.markdownContent).toContain('已更新便签 (覆盖测试)');
  });

  it('5. 清理测试便签', async () => {
    if (sourceNoteId) {
      await client1.deleteNote(sourceNoteId);
    }
    if (syncedNoteId) {
      await client2.deleteNote(syncedNoteId);
    }
  });
});
