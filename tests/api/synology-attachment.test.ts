import { describe, it, expect, afterAll, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { SynologyApiClient } from '@/api/SynologyApiClient';
import { ServerProfile } from '@/types/synology';
import { useNoteStore } from '@/stores/noteStore';
import { useSessionStore } from '@/stores/sessionStore';

const testProfile: ServerProfile = {
  id: 'test-180',
  alias: '测试服务1 (180)',
  serverUrl: 'http://172.28.10.180:5000',
  account: 'notedev',
  password: 'Ghsy#ds.v24',
  allowInsecureSSL: true,
  createdAt: Date.now()
};

describe('便签附件上传、关联与删除 (API 联调实机测试)', () => {
  const client = new SynologyApiClient(testProfile);
  let parentNotebookId = '';
  let testNoteId = '';
  let uploadedFileId = '';

  it('1. 登录并准备目标笔记本', async () => {
    const sid = await client.login();
    expect(sid).toBeTruthy();
    const notebooks = await client.listNotebooks();
    expect(notebooks.length).toBeGreaterThan(0);
    parentNotebookId = notebooks[0].object_id;
  });

  it('2. 创建测试便签并上传附件 (图片文件)', async () => {
    const title = `附件测试便签 - ${Date.now()}`;
    const initialNote = await client.createNote(parentNotebookId, title, '# 初始正文');
    testNoteId = initialNote.object_id;
    expect(testNoteId).toBeTruthy();

    // 构造模拟二进制图片 Blob
    const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(dummyPngBase64, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });

    let progressCalled = false;
    const uploadResult = await client.uploadAttachment(
      testNoteId,
      blob,
      'test_attach.png',
      (percent) => {
        if (percent > 0) progressCalled = true;
      }
    );

    expect(uploadResult).toBeDefined();
    expect(uploadResult.attachment).toBeDefined();
    expect(uploadResult.attachment.name).toBe('test_attach.png');
    uploadedFileId = uploadResult.attachment.file_id || uploadResult.attachment.id;
    expect(uploadedFileId).toBeTruthy();

    // 验证下载 URL 生成
    const downloadUrl = client.getAttachmentDownloadUrl(testNoteId, uploadedFileId, 'test_attach.png');
    expect(downloadUrl).toContain('SYNO.NoteStation.Note');
    expect(downloadUrl).toContain('method=download');
    expect(downloadUrl).toContain(uploadedFileId);

    // 重新获取便签，验证服务端附件数据一致性
    const fullNote = await client.getNote(testNoteId);
    expect(fullNote.attachment).toBeDefined();
    expect(fullNote.attachment!.length).toBeGreaterThanOrEqual(1);
    const found = fullNote.attachment!.find(a => (a.file_id || a.id) === uploadedFileId);
    expect(found).toBeDefined();
    expect(found!.name).toBe('test_attach.png');
  });

  it('3. 从便签中彻底删除已上传附件', async () => {
    expect(testNoteId).toBeTruthy();
    expect(uploadedFileId).toBeTruthy();

    const deleteResult = await client.deleteAttachment(testNoteId, uploadedFileId);
    expect(deleteResult.success).toBe(true);

    // 重新获取便签，验证附件已不存在
    const fullNoteAfter = await client.getNote(testNoteId);
    const stillExists = (fullNoteAfter.attachment || []).some(a => (a.file_id || a.id) === uploadedFileId);
    expect(stillExists).toBe(false);
  });

  it('4. 通过 NoteStore 完整模拟便签上传附件与插入正文保存', async () => {
    setActivePinia(createPinia());
    const sessionStore = useSessionStore();
    const noteStore = useNoteStore();

    if (!client.sid) {
      await client.login();
    }
    if (!parentNotebookId) {
      const nbs = await client.listNotebooks();
      parentNotebookId = nbs[0].object_id;
    }

    vi.spyOn(sessionStore, 'activeClient', 'get').mockReturnValue(client);
    vi.spyOn(sessionStore, 'activeSessionState', 'get').mockReturnValue({
      serverId: testProfile.id,
      isLoggedIn: true,
      isConnecting: false
    });

    // 1. 创建测试便签
    const created = await client.createNote(parentNotebookId, 'Store测试便签', '初始内容');
    noteStore.activeNotebookId = parentNotebookId;
    noteStore.notes = [created];
    noteStore.activeNoteId = created.object_id;
    noteStore.activeNote = created;

    const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(dummyPngBase64, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });

    // 2. 模拟上传附件
    const uploadRes = await noteStore.uploadAttachmentToActiveNote(blob, 'store_test.png', '初始内容');
    expect(uploadRes).toBeDefined();
    expect(uploadRes.url).toBeTruthy();
    expect(noteStore.activeNote?.attachment?.length).toBeGreaterThanOrEqual(1);

    // 3. 构造插入内容（含图片与附件链接）
    const newMarkdown = `初始内容\n\n![store_test.png](${uploadRes.url})\n\n[📎 附件 (100 B)](${uploadRes.url})\n`;

    // 4. 模拟保存便签
    const saveSuccess = await noteStore.updateActiveNote('Store测试便签 - 已更新', newMarkdown);
    expect(saveSuccess).toBe(true);

    // 5. 校验服务端正文与附件
    const reloaded = await client.getNote(created.object_id);
    expect(reloaded.title).toBe('Store测试便签 - 已更新');
    expect(reloaded.markdownContent).toContain('store_test.png');
    expect(reloaded.attachment?.length).toBeGreaterThanOrEqual(1);

    // 清理
    await client.deleteNote(created.object_id).catch(() => {});
  });

  afterAll(async () => {
    if (testNoteId) {
      try {
        await client.deleteNote(testNoteId);
      } catch {}
    }
  });
});
