import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PinManager } from '@/services/pinManager';

// Mock localStorage for Node test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('PinManager 安全管理与加密验证测试', () => {
  beforeEach(() => {
    localStorageMock.clear();
    PinManager.lockSession();
  });

  it('未设置 PIN 时状态检查正确', async () => {
    expect(PinManager.isPinConfigured()).toBe(false);
    expect(PinManager.isSessionUnlocked()).toBe(true);

    const status = await PinManager.getStatus();
    expect(status.isConfigured).toBe(false);
    expect(status.isLocked).toBe(false);
    expect(status.failedAttempts).toBe(0);
    expect(status.remainingAttempts).toBe(5);
  });

  it('必须是 6 位数字才能成功设置 PIN', async () => {
    const resShort = await PinManager.setPin('123');
    expect(resShort.success).toBe(false);

    const resAlpha = await PinManager.setPin('12345a');
    expect(resAlpha.success).toBe(false);

    const resValid = await PinManager.setPin('123456');
    expect(resValid.success).toBe(true);
    expect(PinManager.isPinConfigured()).toBe(true);
    expect(PinManager.isSessionUnlocked()).toBe(true);
  });

  it('设置后，输入正确的 6 位 PIN 码验证成功', async () => {
    await PinManager.setPin('888666');
    PinManager.lockSession();
    expect(PinManager.isSessionUnlocked()).toBe(false);

    const res = await PinManager.verifyPin('888666');
    expect(res.success).toBe(true);
    expect(res.isLocked).toBe(false);
    expect(PinManager.isSessionUnlocked()).toBe(true);
  });

  it('输入错误 PIN 码会减少剩余次数', async () => {
    await PinManager.setPin('123456');

    // 第一次错误
    const res1 = await PinManager.verifyPin('111111');
    expect(res1.success).toBe(false);
    expect(res1.isLocked).toBe(false);
    expect(res1.remainingAttempts).toBe(4);

    // 第二次错误
    const res2 = await PinManager.verifyPin('222222');
    expect(res2.success).toBe(false);
    expect(res2.isLocked).toBe(false);
    expect(res2.remainingAttempts).toBe(3);
  });

  it('输错 5 次后触发半小时锁定，期间阻止输入', async () => {
    await PinManager.setPin('654321');

    for (let i = 1; i <= 4; i++) {
      const res = await PinManager.verifyPin('000000');
      expect(res.success).toBe(false);
      expect(res.isLocked).toBe(false);
      expect(res.remainingAttempts).toBe(5 - i);
    }

    // 第 5 次错误 -> 触发锁定
    const res5 = await PinManager.verifyPin('000000');
    expect(res5.success).toBe(false);
    expect(res5.isLocked).toBe(true);
    expect(res5.remainingSeconds).toBeGreaterThan(1700); // 接近 1800 秒 (30 分钟)
    expect(res5.remainingAttempts).toBe(0);

    // 锁定期间即使输入正确的 PIN 也会被拦截拒绝
    const resLocked = await PinManager.verifyPin('654321');
    expect(resLocked.success).toBe(false);
    expect(resLocked.isLocked).toBe(true);

    // 检查状态接口也反映锁定
    const status = await PinManager.getStatus();
    expect(status.isLocked).toBe(true);
    expect(status.remainingSeconds).toBeGreaterThan(1700);

    // 模拟半小时后：快进时间 31 分钟
    const originalNow = Date.now;
    try {
      const futureTime = originalNow() + 31 * 60 * 1000;
      Date.now = () => futureTime;

      // 锁定自动解除，可输入正确 PIN 解锁
      const afterExpireStatus = await PinManager.getStatus();
      expect(afterExpireStatus.isLocked).toBe(false);
      expect(afterExpireStatus.failedAttempts).toBe(0);

      const unlockRes = await PinManager.verifyPin('654321');
      expect(unlockRes.success).toBe(true);
      expect(PinManager.isSessionUnlocked()).toBe(true);
    } finally {
      Date.now = originalNow;
    }
  });

  it('支持修改 PIN 码', async () => {
    await PinManager.setPin('111222');

    // 原 PIN 错误无法修改
    const failChange = await PinManager.changePin('000000', '333444');
    expect(failChange.success).toBe(false);

    // 原 PIN 正确可修改
    const successChange = await PinManager.changePin('111222', '333444');
    expect(successChange.success).toBe(true);

    // 旧 PIN 失效，新 PIN 有效
    const verifyOld = await PinManager.verifyPin('111222');
    expect(verifyOld.success).toBe(false);

    const verifyNew = await PinManager.verifyPin('333444');
    expect(verifyNew.success).toBe(true);
  });

  it('支持停用/移除 PIN 码', async () => {
    await PinManager.setPin('999888');
    expect(PinManager.isPinConfigured()).toBe(true);

    // 原 PIN 错误不能移除
    const failRemove = await PinManager.removePin('123456');
    expect(failRemove.success).toBe(false);
    expect(PinManager.isPinConfigured()).toBe(true);

    // 原 PIN 正确成功移除
    const successRemove = await PinManager.removePin('999888');
    expect(successRemove.success).toBe(true);
    expect(PinManager.isPinConfigured()).toBe(false);
  });
});
