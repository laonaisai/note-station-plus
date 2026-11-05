export interface PinStatus {
  isConfigured: boolean;
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  remainingAttempts: number;
}

export interface VerifyResult {
  success: boolean;
  isLocked: boolean;
  remainingSeconds?: number;
  remainingAttempts?: number;
  error?: string;
}

interface PinVaultData {
  version: 1;
  salt: string; // 16 bytes hex
  pinHash: string; // PBKDF2-HMAC-SHA256 (100,000 rounds) hex
  failedAttempts: number;
  lockedUntil: number; // epoch ms (0 if not locked)
  createdAt: number;
  updatedAt: number;
}

interface VaultEnvelope {
  format: 'electron-dpapi' | 'webcrypto-aes-gcm';
  data: string;
  iv?: string;
}

const STORAGE_KEY_PIN_VAULT = 'note_station_plus_pin_vault';
const STORAGE_KEY_PIN_FLAG = 'note_station_plus_has_pin';
const STORAGE_KEY_DEV_KEY = 'note_station_plus_device_salt';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

let sessionUnlocked = false;

// Convert buffer to hex string
function buf2hex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to Uint8Array
function hex2buf(hex: string): Uint8Array<ArrayBuffer> {
  const cleanHex = hex.trim();
  const buffer = new ArrayBuffer(cleanHex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Timing-safe string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// PBKDF2-HMAC-SHA256 derivation (100,000 iterations)
async function hashPin(pin: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = hex2buf(saltHex);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256 // 32 bytes
  );
  return buf2hex(derivedBits);
}

// Web Crypto AES-256-GCM fallback encryption key
async function getDeviceAesKey(): Promise<CryptoKey> {
  let devSalt = localStorage.getItem(STORAGE_KEY_DEV_KEY);
  if (!devSalt || devSalt.length !== 64) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    devSalt = buf2hex(raw);
    localStorage.setItem(STORAGE_KEY_DEV_KEY, devSalt);
  }
  return await crypto.subtle.importKey(
    'raw',
    hex2buf(devSalt).buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

// Web Crypto AES-256-GCM encryption
async function encryptWithWebCrypto(plainText: string): Promise<{ iv: string; data: string }> {
  const key = await getDeviceAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );
  return {
    iv: buf2hex(iv),
    data: buf2hex(cipherBuffer)
  };
}

// Web Crypto AES-256-GCM decryption
async function decryptWithWebCrypto(ivHex: string, dataHex: string): Promise<string> {
  const key = await getDeviceAesKey();
  const iv = hex2buf(ivHex);
  const data = hex2buf(dataHex);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    data.buffer as ArrayBuffer
  );
  const dec = new TextDecoder();
  return dec.decode(plainBuffer);
}

// Encrypt and persist vault to storage
async function saveVault(vault: PinVaultData): Promise<void> {
  const jsonStr = JSON.stringify(vault);

  // Try Electron safeStorage (Windows DPAPI)
  if (typeof window !== 'undefined' && window.electronAPI?.safeStorage?.encryptString) {
    try {
      const isAvailable = await window.electronAPI.safeStorage.isAvailable();
      if (isAvailable) {
        const cipherBase64 = await window.electronAPI.safeStorage.encryptString(jsonStr);
        if (cipherBase64) {
          const envelope: VaultEnvelope = {
            format: 'electron-dpapi',
            data: cipherBase64
          };
          localStorage.setItem(STORAGE_KEY_PIN_VAULT, JSON.stringify(envelope));
          localStorage.setItem(STORAGE_KEY_PIN_FLAG, '1');
          return;
        }
      }
    } catch (e) {
      console.warn('[pinManager] safeStorage encrypt failed, falling back to Web Crypto AES-GCM', e);
    }
  }

  // Fallback: Web Crypto AES-256-GCM
  const { iv, data } = await encryptWithWebCrypto(jsonStr);
  const envelope: VaultEnvelope = {
    format: 'webcrypto-aes-gcm',
    iv,
    data
  };
  localStorage.setItem(STORAGE_KEY_PIN_VAULT, JSON.stringify(envelope));
  localStorage.setItem(STORAGE_KEY_PIN_FLAG, '1');
}

// Read and decrypt vault from storage
async function loadVault(): Promise<PinVaultData | null> {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_PIN_VAULT);
  if (!raw) return null;

  try {
    const envelope: VaultEnvelope = JSON.parse(raw);
    let jsonStr: string | null = null;

    if (envelope.format === 'electron-dpapi') {
      if (typeof window !== 'undefined' && window.electronAPI?.safeStorage?.decryptString) {
        jsonStr = await window.electronAPI.safeStorage.decryptString(envelope.data);
      }
    } else if (envelope.format === 'webcrypto-aes-gcm' && envelope.iv) {
      jsonStr = await decryptWithWebCrypto(envelope.iv, envelope.data);
    }

    if (!jsonStr) {
      console.warn('[pinManager] Failed to decrypt vault payload');
      return null;
    }

    return JSON.parse(jsonStr) as PinVaultData;
  } catch (err) {
    console.error('[pinManager] Error loading vault:', err);
    return null;
  }
}

export class PinManager {
  /**
   * Fast synchronous check whether PIN protection is set
   */
  static isPinConfigured(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return !!localStorage.getItem(STORAGE_KEY_PIN_VAULT);
  }

  /**
   * Check whether the current session has unlocked the PIN
   */
  static isSessionUnlocked(): boolean {
    if (!this.isPinConfigured()) return true;
    return sessionUnlocked;
  }

  /**
   * Lock current session manually
   */
  static lockSession(): void {
    sessionUnlocked = false;
  }

  /**
   * Mark session as unlocked
   */
  static unlockSession(): void {
    sessionUnlocked = true;
  }

  /**
   * Query current PIN status (configured, locked, countdown seconds, attempts)
   */
  static async getStatus(): Promise<PinStatus> {
    const vault = await loadVault();
    if (!vault) {
      return {
        isConfigured: false,
        isLocked: false,
        remainingSeconds: 0,
        failedAttempts: 0,
        remainingAttempts: MAX_FAILED_ATTEMPTS
      };
    }

    const now = Date.now();
    let isLocked = false;
    let remainingSeconds = 0;

    if (vault.lockedUntil && now < vault.lockedUntil) {
      isLocked = true;
      remainingSeconds = Math.max(1, Math.ceil((vault.lockedUntil - now) / 1000));
    } else if (vault.lockedUntil && now >= vault.lockedUntil) {
      // Lockout duration expired, reset counter
      vault.failedAttempts = 0;
      vault.lockedUntil = 0;
      vault.updatedAt = now;
      await saveVault(vault);
    }

    return {
      isConfigured: true,
      isLocked,
      remainingSeconds,
      failedAttempts: vault.failedAttempts,
      remainingAttempts: isLocked ? 0 : Math.max(0, MAX_FAILED_ATTEMPTS - vault.failedAttempts)
    };
  }

  /**
   * Verify entered PIN (6 digits)
   */
  static async verifyPin(pin: string): Promise<VerifyResult> {
    const vault = await loadVault();
    if (!vault) {
      sessionUnlocked = true;
      return { success: true, isLocked: false };
    }

    const now = Date.now();

    // 1. Check if currently locked
    if (vault.lockedUntil && now < vault.lockedUntil) {
      const remainingSeconds = Math.max(1, Math.ceil((vault.lockedUntil - now) / 1000));
      return {
        success: false,
        isLocked: true,
        remainingSeconds,
        remainingAttempts: 0,
        error: `PIN 码已输错 5 次，系统锁定中`
      };
    }

    // Lock expired, reset
    if (vault.lockedUntil && now >= vault.lockedUntil) {
      vault.failedAttempts = 0;
      vault.lockedUntil = 0;
    }

    // 2. Validate input format
    if (!/^\d{6}$/.test(pin)) {
      return {
        success: false,
        isLocked: false,
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - vault.failedAttempts),
        error: '请输入 6 位数字 PIN 码'
      };
    }

    // 3. Verify cryptographic hash
    const computedHash = await hashPin(pin, vault.salt);
    const matches = timingSafeEqual(computedHash, vault.pinHash);

    if (matches) {
      // Verification succeeded: reset attempts and unlock
      vault.failedAttempts = 0;
      vault.lockedUntil = 0;
      vault.updatedAt = now;
      await saveVault(vault);
      sessionUnlocked = true;
      return {
        success: true,
        isLocked: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS
      };
    } else {
      // Verification failed: increment failure counter
      vault.failedAttempts += 1;
      vault.updatedAt = now;

      if (vault.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock for 30 minutes
        vault.lockedUntil = now + LOCKOUT_DURATION_MS;
        await saveVault(vault);
        return {
          success: false,
          isLocked: true,
          remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
          remainingAttempts: 0,
          error: '已连续输错 5 次，系统已锁定 30 分钟'
        };
      } else {
        const remaining = MAX_FAILED_ATTEMPTS - vault.failedAttempts;
        await saveVault(vault);
        return {
          success: false,
          isLocked: false,
          remainingAttempts: remaining,
          error: `PIN 码错误，还剩 ${remaining} 次机会`
        };
      }
    }
  }

  /**
   * Set a new 6-digit PIN
   */
  static async setPin(newPin: string): Promise<{ success: boolean; error?: string }> {
    if (!/^\d{6}$/.test(newPin)) {
      return { success: false, error: 'PIN 码必须为 6 位纯数字' };
    }

    // Generate random 16-byte salt
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = buf2hex(saltBytes);
    const pinHash = await hashPin(newPin, saltHex);

    const vault: PinVaultData = {
      version: 1,
      salt: saltHex,
      pinHash,
      failedAttempts: 0,
      lockedUntil: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await saveVault(vault);
    sessionUnlocked = true;
    return { success: true };
  }

  /**
   * Change PIN (requires verifying old PIN first)
   */
  static async changePin(
    currentPin: string,
    newPin: string
  ): Promise<VerifyResult> {
    const verifyRes = await this.verifyPin(currentPin);
    if (!verifyRes.success) {
      return verifyRes;
    }

    if (!/^\d{6}$/.test(newPin)) {
      return {
        success: false,
        isLocked: false,
        error: '新 PIN 码必须为 6 位纯数字'
      };
    }

    const setRes = await this.setPin(newPin);
    if (!setRes.success) {
      return {
        success: false,
        isLocked: false,
        error: setRes.error || '更新 PIN 码失败'
      };
    }

    return { success: true, isLocked: false };
  }

  /**
   * Remove/Disable PIN (requires verifying current PIN first)
   */
  static async removePin(currentPin: string): Promise<VerifyResult> {
    const verifyRes = await this.verifyPin(currentPin);
    if (!verifyRes.success) {
      return verifyRes;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_PIN_VAULT);
      localStorage.removeItem(STORAGE_KEY_PIN_FLAG);
    }
    sessionUnlocked = true;
    return { success: true, isLocked: false };
  }
}
