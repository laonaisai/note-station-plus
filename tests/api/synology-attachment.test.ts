import { describe, it, expect, afterAll } from 'vitest';
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

  afterAll(async () => {
    if (testNoteId) {
      try {
        await client.deleteNote(testNoteId);
      } catch {}
    }
  });
});
