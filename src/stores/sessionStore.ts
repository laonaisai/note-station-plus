import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ServerProfile, SessionState } from '@/types/synology';
import { ConfigManager } from '@/services/configManager';
import { SynologyApiClient } from '@/api/SynologyApiClient';

export const useSessionStore = defineStore('session', () => {
  const profiles = ref<ServerProfile[]>([]);
  const activeProfileId = ref<string>('');
  const clients = new Map<string, SynologyApiClient>();
  const sessionStates = ref<Record<string, SessionState>>({});

  // Concurrency guard to deduplicate concurrent login requests for the same profile
  const pendingLogins = new Map<string, Promise<boolean>>();

  const activeProfile = computed(() => {
    return profiles.value.find(p => p.id === activeProfileId.value) || profiles.value[0];
  });

  const activeClient = computed(() => {
    return getClient();
  });

  const activeSessionState = computed(() => {
    if (!activeProfileId.value) return null;
    return sessionStates.value[activeProfileId.value] || {
      serverId: activeProfileId.value,
      isLoggedIn: false,
      isConnecting: false
    };
  });

  function getOrCreateClient(profile: ServerProfile): SynologyApiClient {
    let client = clients.get(profile.id);
    if (!client) {
      client = new SynologyApiClient(profile);
      clients.set(profile.id, client);
    }
    return client;
  }

  function getClient(serverId?: string): SynologyApiClient | null {
    const targetId = serverId || activeProfileId.value;
    const profile = profiles.value.find(p => p.id === targetId);
    if (!profile) return null;
    return getOrCreateClient(profile);
  }

  /**
   * Determine if an error is an authentication credential error
   * Credential errors (wrong password, disabled account, 2FA required) should never be retried
   */
  function isCredentialError(err: any): boolean {
    const msg = String(err?.message || '');
    return (
      msg.includes('密码') ||
      msg.includes('账户') ||
      msg.includes('双重验证') ||
      msg.includes('权限') ||
      msg.includes('400') ||
      msg.includes('401') ||
      msg.includes('402') ||
      msg.includes('403') ||
      msg.includes('404')
    );
  }

  /**
   * Login to a specific server profile with concurrency deduplication and transient failure retries
   */
  async function loginServer(profileId: string): Promise<boolean> {
    const existing = pendingLogins.get(profileId);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      const profile = profiles.value.find(p => p.id === profileId);
      if (!profile) return false;

      sessionStates.value[profileId] = {
        serverId: profileId,
        isLoggedIn: false,
        isConnecting: true,
        lastError: undefined
      };

      const maxRetries = 2;
      let attempt = 0;
      let lastErr: any = null;

      while (attempt <= maxRetries) {
        try {
          const client = getOrCreateClient(profile);
          const sid = await client.login();
          sessionStates.value[profileId] = {
            serverId: profileId,
            sid,
            isLoggedIn: true,
            isConnecting: false
          };
          return true;
        } catch (err: any) {
          lastErr = err;
          attempt++;
          if (isCredentialError(err) || attempt > maxRetries) {
            break;
          }
          // Exponential backoff for NAS cold wake-up or transient network glitch
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }

      sessionStates.value[profileId] = {
        serverId: profileId,
        isLoggedIn: false,
        isConnecting: false,
        lastError: lastErr?.message || '连接失败'
      };
      return false;
    })().finally(() => {
      pendingLogins.delete(profileId);
    });

    pendingLogins.set(profileId, promise);
    return promise;
  }

  /**
   * Ensure server is connected; if already logged in, returns true immediately without re-login
   */
  async function ensureConnected(profileId: string): Promise<boolean> {
    const state = sessionStates.value[profileId];
    if (state?.isLoggedIn) {
      return true;
    }
    return loginServer(profileId);
  }

  async function setActiveProfile(profileId: string) {
    if (activeProfileId.value === profileId) {
      // If clicking currently active profile tab and it's disconnected or errored, attempt reconnect
      const state = sessionStates.value[profileId];
      if (!state?.isLoggedIn && !state?.isConnecting) {
        await loginServer(profileId);
      }
      return;
    }
    activeProfileId.value = profileId;
    ConfigManager.setActiveProfileId(profileId);
  }

  async function addProfile(profile: ServerProfile) {
    ConfigManager.upsertProfile(profile);
    profiles.value = ConfigManager.getProfiles();
    await setActiveProfile(profile.id);
  }

  async function updateProfile(profile: ServerProfile) {
    ConfigManager.upsertProfile(profile);
    profiles.value = ConfigManager.getProfiles();
    clients.delete(profile.id); // Reset client instance
    delete sessionStates.value[profile.id];
    await loginServer(profile.id);
  }

  async function removeProfile(profileId: string) {
    ConfigManager.deleteProfile(profileId);
    clients.delete(profileId);
    delete sessionStates.value[profileId];
    profiles.value = ConfigManager.getProfiles();

    if (profiles.value.length === 0) {
      activeProfileId.value = '';
      ConfigManager.setActiveProfileId('');
    } else if (activeProfileId.value === profileId) {
      await setActiveProfile(profiles.value[0].id);
    }
  }

  async function init() {
    profiles.value = ConfigManager.getProfiles();
    const storedActiveId = ConfigManager.getActiveProfileId();
    activeProfileId.value = storedActiveId && profiles.value.some(p => p.id === storedActiveId)
      ? storedActiveId
      : profiles.value[0]?.id || '';

    // 1. Immediately login active profile (blocking for main startup UI)
    if (activeProfileId.value) {
      await loginServer(activeProfileId.value);
    }

    // 2. Pre-connect all other configured profiles in the background asynchronously
    const otherProfiles = profiles.value.filter(p => p.id !== activeProfileId.value);
    for (const p of otherProfiles) {
      loginServer(p.id).catch((err) => {
        console.warn(`[sessionStore] Background pre-connect failed for ${p.alias || p.serverUrl}:`, err);
      });
    }
  }

  return {
    profiles,
    activeProfileId,
    activeProfile,
    activeClient,
    activeSessionState,
    sessionStates,
    init,
    getClient,
    loginServer,
    ensureConnected,
    setActiveProfile,
    addProfile,
    updateProfile,
    removeProfile
  };
});
