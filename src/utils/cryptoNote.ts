import CryptoJS from 'crypto-js';

export const SYNO_NOTE_ENCRYPT_MAGIC = 'NoTeStAtIoNMaGic';

/**
 * Encrypt plain HTML content for Synology Note Station using AES-256 (CryptoJS)
 * Compatible with official Synology Note Station web and mobile clients.
 */
export function encryptNoteContent(plainHtml: string, password: string): string {
  if (!password) {
    throw new Error('加密密码不能为空');
  }
  return CryptoJS.AES.encrypt(SYNO_NOTE_ENCRYPT_MAGIC + (plainHtml || ''), password).toString();
}

/**
 * Decrypt Synology Note Station encrypted HTML content
 */
export function decryptNoteContent(cipherText: string, password: string): { success: boolean; content: string } {
  if (!cipherText || !password) {
    return { success: false, content: '' };
  }
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted && decrypted.startsWith(SYNO_NOTE_ENCRYPT_MAGIC)) {
      return {
        success: true,
        content: decrypted.slice(SYNO_NOTE_ENCRYPT_MAGIC.length)
      };
    }
    return { success: false, content: '' };
  } catch {
    return { success: false, content: '' };
  }
}

/**
 * Verify whether a password successfully decrypts the given ciphertext
 */
export function verifyNotePassword(cipherText: string, password: string): boolean {
  return decryptNoteContent(cipherText, password).success;
}
