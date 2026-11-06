import { defineStore } from 'pinia';
import { ref } from 'vue';

export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'note_station_plus_theme';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<AppTheme>('light');

  function applyThemeToDom(targetTheme: AppTheme) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (targetTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }

  function initTheme() {
    let saved: AppTheme | null = null;
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
    } catch {}

    if (saved === 'dark' || saved === 'light') {
      theme.value = saved;
    } else {
      // Fallback to system preference or default light
      const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      theme.value = prefersDark ? 'dark' : 'light';
    }

    applyThemeToDom(theme.value);
  }

  function setTheme(newTheme: AppTheme) {
    theme.value = newTheme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
    applyThemeToDom(newTheme);
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  }

  return {
    theme,
    isDark: () => theme.value === 'dark',
    initTheme,
    setTheme,
    toggleTheme
  };
});
