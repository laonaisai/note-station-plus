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

  const activeProfile = computed(() => {
    return profiles.value.find(p => p.id === activeProfileId.value) || profiles.value[0];
  });

  const activeClient = computed(() => {
    if (!activeProfile.value) return null;
    return getOrCreateClient(activeProfile.value);
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

  async function loginServer(profileId: string): Promise<boolean> {
    const profile = profiles.value.find(p => p.id === profileId);
    if (!profile) return false;

    sessionStates.value[profileId] = {
      serverId: profileId,
      isLoggedIn: false,
      isConnecting: true,
      lastError: undefined
    };

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
      sessionStates.value[profileId] = {
        serverId: profileId,
        isLoggedIn: false,
        isConnecting: false,
        lastError: err?.message || '连接失败'
      };
      return false;
    }
  }

  async function setActiveProfile(profileId: string) {
    if (activeProfileId.value === profileId) return;
    activeProfileId.value = profileId;
    ConfigManager.setActiveProfileId(profileId);

    // Auto connect if not connected
    const state = sessionStates.value[profileId];
    if (!state || (!state.isLoggedIn && !state.isConnecting)) {
      await loginServer(profileId);
    }
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
    await loginServer(profile.id);
  }

  async function removeProfile(profileId: string) {
    ConfigManager.deleteProfile(profileId);
    clients.delete(profileId);
    delete sessionStates.value[profileId];
    profiles.value = ConfigManager.getProfiles();

    if (activeProfileId.value === profileId && profiles.value.length > 0) {
      await setActiveProfile(profiles.value[0].id);
    }
  }

  async function init() {
    profiles.value = ConfigManager.getProfiles();
    const storedActiveId = ConfigManager.getActiveProfileId();
    activeProfileId.value = storedActiveId && profiles.value.some(p => p.id === storedActiveId)
      ? storedActiveId
      : profiles.value[0]?.id || '';

    // Auto-login active profile
    if (activeProfileId.value) {
      await loginServer(activeProfileId.value);
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
    setActiveProfile,
    addProfile,
    updateProfile,
    removeProfile
  };
});
