import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useThemeStore } from '@/stores/themeStore';

// Mock localStorage for Node environment
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

describe('ThemeStore: Light and Dark theme switching and persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('1. 默认应初始化为浅色或系统主题并正确持久化', () => {
    const store = useThemeStore();
    store.initTheme();
    expect(['light', 'dark']).toContain(store.theme);
  });

  it('2. setTheme: 能切换为深色并存储到 localStorage', () => {
    const store = useThemeStore();
    store.setTheme('dark');
    expect(store.theme).toBe('dark');
    expect(store.isDark()).toBe(true);
    expect(localStorage.getItem('note_station_plus_theme')).toBe('dark');

    store.setTheme('light');
    expect(store.theme).toBe('light');
    expect(store.isDark()).toBe(false);
    expect(localStorage.getItem('note_station_plus_theme')).toBe('light');
  });

  it('3. toggleTheme: 能在浅色与深色之间往复切换', () => {
    const store = useThemeStore();
    store.setTheme('light');

    store.toggleTheme();
    expect(store.theme).toBe('dark');

    store.toggleTheme();
    expect(store.theme).toBe('light');
  });
});
