import { describe, it, expect, beforeAll } from 'vitest';
import { SynologyApiClient } from '@/api/SynologyApiClient';
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

describe('测试笔记本 创建、重命名与删除', () => {
  let client: SynologyApiClient;

  beforeAll(async () => {
    client = new SynologyApiClient(server1Profile);
    await client.login();
  });

  it('能创建含有便签与标签的笔记本，并能重命名和删除该笔记本', async () => {
    const testTitle = `自动化笔记本_${Date.now()}`;
    const nb = await client.createNotebook(testTitle);
    expect(nb.object_id).toBeTruthy();

    // 在该笔记本中创建便签（含标签）
    const note = await client.createNote(nb.object_id, '笔记本内便签', '# 测试内容', ['标签A', '标签B']);
    expect(note.object_id).toBeTruthy();

    // 测试重命名
    const sid = (client as any).requireSid();
    const renameParams = new URLSearchParams({
      api: 'SYNO.NoteStation.Notebook',
      version: '1',
      method: 'set',
      _sid: sid,
      object_id: nb.object_id,
      title: `${testTitle}_重命名后`
    });

    const renameRes = await (client as any).http.post('/webapi/entry.cgi', renameParams.toString());
    expect(renameRes.data.success).toBe(true);

    // 验证列表中该笔记本标题已变更
    const list = await client.listNotebooks();
    const target = list.find(n => n.object_id === nb.object_id);
    expect(target?.title).toBe(`${testTitle}_重命名后`);

    // 删除该笔记本（哪怕内部有便签）
    const delRes = await client.deleteNotebook(nb.object_id);
    expect(delRes).toBe(true);

    // 验证列表中已无该笔记本
    const listAfter = await client.listNotebooks();
    expect(listAfter.find(n => n.object_id === nb.object_id)).toBeUndefined();
  });
});
