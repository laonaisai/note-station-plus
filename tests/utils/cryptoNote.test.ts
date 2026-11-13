import { describe, it, expect } from 'vitest';
import {
  encryptNoteContent,
  decryptNoteContent,
  verifyNotePassword,
  SYNO_NOTE_ENCRYPT_MAGIC
} from '@/utils/cryptoNote';

describe('cryptoNote (群晖官方兼容的便签客户端加密/解密工具)', () => {
  it('1. 能够对正文进行 AES-256 加密，输出以 U2FsdGVkX1 (Salted__) 开头的 Base64 密文', () => {
    const rawHtml = '<div><h1>私密便签</h1><p>绝密内容 123456</p></div>';
    const pwd = 'MySecretPassword#2026';

    const cipher = encryptNoteContent(rawHtml, pwd);
    expect(cipher).toBeTypeOf('string');
    expect(cipher.startsWith('U2FsdGVkX1')).toBe(true);
  });

  it('2. 输入正确密码能够 100% 还原原始内容并验证 MAGIC 标记', () => {
    const rawHtml = '<div><p>支持中文、emoji 🎉、Markdown 代码块与表格</p></div>';
    const pwd = 'TestPassword888!';

    const cipher = encryptNoteContent(rawHtml, pwd);
    const res = decryptNoteContent(cipher, pwd);

    expect(res.success).toBe(true);
    expect(res.content).toBe(rawHtml);
    expect(verifyNotePassword(cipher, pwd)).toBe(true);
  });

  it('3. 错误密码无法解密，返回 success: false 且不抛出异常崩溃', () => {
    const rawHtml = '<p>机密数据</p>';
    const cipher = encryptNoteContent(rawHtml, 'correct_pass');

    const res = decryptNoteContent(cipher, 'wrong_pass');
    expect(res.success).toBe(false);
    expect(res.content).toBe('');
    expect(verifyNotePassword(cipher, 'wrong_pass')).toBe(false);
  });

  it('4. 空输入与异常参数安全防护', () => {
    expect(() => encryptNoteContent('test', '')).toThrow('加密密码不能为空');
    expect(decryptNoteContent('', 'pass')).toEqual({ success: false, content: '' });
    expect(decryptNoteContent('not-a-valid-cipher', 'pass')).toEqual({ success: false, content: '' });
  });
});
