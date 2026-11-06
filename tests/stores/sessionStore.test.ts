import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionStore } from '@/stores/sessionStore';
import { ConfigManager } from '@/services/configManager';
import { SynologyApiClient } from '@/api/SynologyApiClient';
import { ServerProfile } from '@/types/synology';

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

describe('SessionStore: Multi-server management, concurrency, and auto-retry', () => {
  const profile1: ServerProfile = {
    id: 'server-1',
    alias: '服务1 (家庭NAS)',
    serverUrl: 'http://172.28.10.180:5000',
    account: 'user1',
    password: 'password1',
    createdAt: 1000
  };

  const profile2: ServerProfile = {
    id: 'server-2',
    alias: '服务2 (公司群晖)',
    serverUrl: 'http://172.28.10.182:5000',
    account: 'user2',
    password: 'password2',
    createdAt: 2000
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. 并发调用 loginServer 时应自动防重，共享同一个正在执行的 Promise', async () => {
    const store = useSessionStore();
    store.profiles = [profile1, profile2];

    const client = store.getClient(profile1.id)!;
    let callCount = 0;
    vi.spyOn(client, 'login').mockImplementation(async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'sid_test_123';
    });

    // 同时触发两次甚至多次针对同一服务的登录
    const [res1, res2, res3] = await Promise.all([
      store.loginServer(profile1.id),
      store.loginServer(profile1.id),
      store.loginServer(profile1.id)
    ]);

    expect(res1).toBe(true);
    expect(res2).toBe(true);
    expect(res3).toBe(true);
    // 实际仅发起了一次网络请求
    expect(callCount).toBe(1);
    expect(store.sessionStates[profile1.id].isLoggedIn).toBe(true);
    expect(store.sessionStates[profile1.id].sid).toBe('sid_test_123');
  });

  it('2. ensureConnected: 已登录服务直接返回 true，未登录服务触发登录', async () => {
    const store = useSessionStore();
    store.profiles = [profile1, profile2];

    store.sessionStates[profile1.id] = {
      serverId: profile1.id,
      sid: 'sid_already_logged_in',
      isLoggedIn: true,
      isConnecting: false
    };

    const client1 = store.getClient(profile1.id)!;
    const loginSpy1 = vi.spyOn(client1, 'login');

    const ok1 = await store.ensureConnected(profile1.id);
    expect(ok1).toBe(true);
    expect(loginSpy1).not.toHaveBeenCalled();

    const client2 = store.getClient(profile2.id)!;
    const loginSpy2 = vi.spyOn(client2, 'login').mockResolvedValue('sid_p2');

    const ok2 = await store.ensureConnected(profile2.id);
    expect(ok2).toBe(true);
    expect(loginSpy2).toHaveBeenCalledTimes(1);
    expect(store.sessionStates[profile2.id].isLoggedIn).toBe(true);
  });

  it('3. loginServer 在网络瞬断或休眠唤醒失败时能自动重试', async () => {
    const store = useSessionStore();
    store.profiles = [profile1];

    const client = store.getClient(profile1.id)!;
    let attempts = 0;

    vi.spyOn(client, 'login').mockImplementation(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('connect ETIMEDOUT 172.28.10.180:5000');
      }
      return 'sid_retry_success';
    });

    const success = await store.loginServer(profile1.id);
    expect(success).toBe(true);
    expect(attempts).toBe(2);
    expect(store.sessionStates[profile1.id].isLoggedIn).toBe(true);
  });

  it('4. loginServer 遇到明确密码错误或鉴权失败时不进行无意义重试', async () => {
    const store = useSessionStore();
    store.profiles = [profile1];

    const client = store.getClient(profile1.id)!;
    let attempts = 0;

    vi.spyOn(client, 'login').mockImplementation(async () => {
      attempts++;
      throw new Error('用户名或密码错误');
    });

    const success = await store.loginServer(profile1.id);
    expect(success).toBe(false);
    expect(attempts).toBe(1); // 立即终止，保护群晖不被触发防暴力破解锁定
    expect(store.sessionStates[profile1.id].isLoggedIn).toBe(false);
    expect(store.sessionStates[profile1.id].lastError).toContain('用户名或密码错误');
  });

  it('5. store.init 能优先连接主服务并在后台静默预连接其他服务', async () => {
    ConfigManager.saveProfiles([profile1, profile2]);
    ConfigManager.setActiveProfileId(profile1.id);

    const store = useSessionStore();
    const loginCalls: string[] = [];
    vi.spyOn(SynologyApiClient.prototype, 'login').mockImplementation(async function (this: any) {
      loginCalls.push(this.profile.id);
      return `sid_${this.profile.id}`;
    });

    await store.init();

    expect(store.activeProfileId).toBe(profile1.id);
    expect(loginCalls).toContain(profile1.id);

    // 等待微任务/异步任务使后台预连接完成
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(loginCalls).toContain(profile2.id);
    expect(store.sessionStates[profile2.id].isLoggedIn).toBe(true);
  });

  it('6. setActiveProfile 点击当前已断开的服务应尝试重新连接', async () => {
    const store = useSessionStore();
    store.profiles = [profile1];
    store.activeProfileId = profile1.id;
    store.sessionStates[profile1.id] = {
      serverId: profile1.id,
      isLoggedIn: false,
      isConnecting: false,
      lastError: '网络中断'
    };

    const client = store.getClient(profile1.id)!;
    const loginSpy = vi.spyOn(client, 'login').mockResolvedValue('sid_reconnected');

    await store.setActiveProfile(profile1.id);

    expect(loginSpy).toHaveBeenCalledTimes(1);
    expect(store.sessionStates[profile1.id].isLoggedIn).toBe(true);
  });
});
