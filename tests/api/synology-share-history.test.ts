import { describe, it, expect } from 'vitest';
import { SynologyApiClient } from '@/api/SynologyApiClient';
import { ServerProfile } from '@/types/synology';

const testProfile: ServerProfile = {
  id: 'test-180',
  alias: '测试服务1 (180)',
  serverUrl: 'http://172.28.10.180:5000',
  account: 'notedev',
  password: 'Ghsy#ds.v24',
  allowInsecureSSL: true,
  createdAt: Date.now()
};

describe('便签历史版本与分享管理 (API 联调实机测试)', () => {
  const client = new SynologyApiClient(testProfile);
  let parentNotebookId = '';
  let testNoteId = '';

  it('1. 成功登录并获取笔记本', async () => {
    const sid = await client.login();
    expect(sid).toBeTruthy();
    const notebooks = await client.listNotebooks();
    expect(notebooks.length).toBeGreaterThan(0);
    parentNotebookId = notebooks[0].object_id;
  });

  it('2. 历史版本管理：创建与多版本生成、版本列表、内容回溯与版本还原', async () => {
    // 创建初始便签
    const title = `版本测试便签 - ${Date.now()}`;
    const v1Content = `# 第一版内容\n\n- 初始创建于 ${new Date().toISOString()}`;
    const note = await client.createNote(parentNotebookId, title, v1Content);
    testNoteId = note.object_id;
    expect(testNoteId).toBeTruthy();

    // 更新生成第二版
    const v2Content = `# 第二版更新\n\n- 第二次修改内容`;
    await client.updateNote(testNoteId, title + ' (v2)', v2Content);

    // 更新生成第三版
    const v3Content = `# 第三版最新\n\n- 当前最新内容`;
    await client.updateNote(testNoteId, title + ' (v3)', v3Content);

    // 1) 验证 listNoteVersions 获取版本列表
    const versions = await client.listNoteVersions(testNoteId);
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBeGreaterThanOrEqual(2);

    // 2) 验证 getNote with ver 获取历史版本特定内容
    const oldestVer = versions[versions.length - 1].version;
    const historicNote = await client.getNote(testNoteId, oldestVer);
    expect(historicNote.markdownContent).toContain('第一版内容');

    // 3) 验证 restoreNoteVersion 还原至历史版本
    const restored = await client.restoreNoteVersion(testNoteId, oldestVer);
    expect(restored).toBe(true);

    // 重新获取当前最新便签，确认内容已还原为第一版内容
    const activeNote = await client.getNote(testNoteId);
    expect(activeNote.markdownContent).toContain('第一版内容');
  });

  it('3. 分享管理：公开链接生成、开启/关闭公开访问、DSM 用户权限管理', async () => {
    expect(testNoteId).toBeTruthy();

    // 1) 验证获取公开分享链接及 share info
    const shareInfo = await client.getNoteShareInfo(testNoteId);
    expect(shareInfo).toBeDefined();
    expect(shareInfo.objectId).toBe(testNoteId);
    expect(typeof shareInfo.publicUrl).toBe('string');
    expect(Array.isArray(shareInfo.availableUsers)).toBe(true);

    // 2) 开启公开只读链接分享，并为 admin 用户增加只读权限
    const updateRes = await client.updateNoteShareSettings({
      objectId: testNoteId,
      isPublicEnabled: true,
      publicPerm: 'ro',
      addedOrUpdatedMembers: [
        { name: 'admin', type: 'user', perm: 'ro' }
      ],
      removedMembers: []
    });
    expect(updateRes).toBe(true);

    // 验证更新后的 shareInfo
    const afterUpdateInfo = await client.getNoteShareInfo(testNoteId);
    expect(afterUpdateInfo.isPublicEnabled).toBe(true);
    expect(afterUpdateInfo.publicPerm).toBe('ro');
    const adminMember = afterUpdateInfo.members.find(m => m.name === 'admin');
    expect(adminMember).toBeDefined();
    expect(adminMember?.perm).toBe('ro');

    // 3) 关闭公开链接，并移除 admin 用户权限
    const cleanRes = await client.updateNoteShareSettings({
      objectId: testNoteId,
      isPublicEnabled: false,
      publicPerm: 'ro',
      addedOrUpdatedMembers: [],
      removedMembers: [
        { name: 'admin', type: 'user', perm: 'ro' }
      ]
    });
    expect(cleanRes).toBe(true);

    const finalInfo = await client.getNoteShareInfo(testNoteId);
    expect(finalInfo.isPublicEnabled).toBe(false);
    expect(finalInfo.members.some(m => m.name === 'admin')).toBe(false);
  });

  it('4. 清理测试资源', async () => {
    if (testNoteId) {
      const ok = await client.deleteNote(testNoteId);
      expect(ok).toBe(true);
    }
  });
});

