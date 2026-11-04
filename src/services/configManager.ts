import { ServerProfile } from '@/types/synology';

const STORAGE_KEY_PROFILES = 'note_station_plus_profiles';
const STORAGE_KEY_ACTIVE_PROFILE = 'note_station_plus_active_id';

export const DEFAULT_PROFILES: ServerProfile[] = [
  {
    id: 'server-180',
    alias: '服务1 (180)',
    serverUrl: 'http://172.28.10.180:5000',
    account: 'notedev',
    password: 'Ghsy#ds.v24',
    allowInsecureSSL: true,
    autoLogin: true,
    createdAt: Date.now()
  },
  {
    id: 'server-182',
    alias: '服务2 (182)',
    serverUrl: 'http://172.28.10.182:5000',
    account: 'notedev',
    password: 'Ghsy#ds.v24',
    allowInsecureSSL: true,
    autoLogin: true,
    createdAt: Date.now()
  }
];

export class ConfigManager {
  /**
   * Load all saved server profiles
   */
  static getProfiles(): ServerProfile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (!raw) {
        this.saveProfiles(DEFAULT_PROFILES);
        return DEFAULT_PROFILES;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PROFILES;
    } catch {
      return DEFAULT_PROFILES;
    }
  }

  /**
   * Save server profiles list
   */
  static saveProfiles(profiles: ServerProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to save profiles to localStorage', e);
    }
  }

  /**
   * Add or update a server profile
   */
  static upsertProfile(profile: ServerProfile): void {
    const list = this.getProfiles();
    const index = list.findIndex(p => p.id === profile.id);
    if (index >= 0) {
      list[index] = profile;
    } else {
      list.push(profile);
    }
    this.saveProfiles(list);
  }

  /**
   * Remove a profile by id
   */
  static deleteProfile(id: string): void {
    const list = this.getProfiles().filter(p => p.id !== id);
    this.saveProfiles(list);
  }

  /**
   * Get active profile ID
   */
  static getActiveProfileId(): string {
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE);
    if (active) return active;
    const profiles = this.getProfiles();
    return profiles[0]?.id || 'server-180';
  }

  /**
   * Set active profile ID
   */
  static setActiveProfileId(id: string): void {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE, id);
  }
}
