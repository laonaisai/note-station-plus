import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

export type UiDensityMode = 'auto' | 'compact' | 'medium';
export type UiDensity = 'compact' | 'medium';

export const useLayoutStore = defineStore('layout', () => {
  const getStorage = (key: string): boolean => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key) === 'true';
      }
    } catch {
      // ignore in environments without localStorage
    }
    return false;
  };

  const setStorage = (key: string, val: boolean) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, String(val));
      }
    } catch {
      // ignore
    }
  };

  const isSidebarCollapsed = ref<boolean>(getStorage('note_plus_sidebar_collapsed'));
  const isNoteListCollapsed = ref<boolean>(getStorage('note_plus_notelist_collapsed'));

  // Responsive UI Density State (>= 1440px: medium, < 1440px: compact)
  const windowWidth = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const uiDensityMode = ref<UiDensityMode>('auto');

  const isMediumDensity = computed<boolean>(() => {
    if (uiDensityMode.value === 'medium') return true;
    if (uiDensityMode.value === 'compact') return false;
    return windowWidth.value >= 1440;
  });

  const uiDensity = computed<UiDensity>(() => isMediumDensity.value ? 'medium' : 'compact');

  function applyDensityToDom(density: UiDensity) {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-ui-density', density);
  }

  watch(uiDensity, (val) => {
    applyDensityToDom(val);
  }, { immediate: true, flush: 'sync' });

  let resizeRaf: number | null = null;
  function handleResize() {
    if (typeof window === 'undefined') return;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      windowWidth.value = window.innerWidth;
    });
  }

  function initResponsive() {
    if (typeof window === 'undefined') return;
    windowWidth.value = window.innerWidth;
    applyDensityToDom(uiDensity.value);
    window.addEventListener('resize', handleResize, { passive: true });
  }

  function destroyResponsive() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('resize', handleResize);
    if (resizeRaf) {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = null;
    }
  }

  function setUiDensityMode(mode: UiDensityMode) {
    uiDensityMode.value = mode;
  }

  watch(isSidebarCollapsed, (val) => {
    setStorage('note_plus_sidebar_collapsed', val);
  });

  watch(isNoteListCollapsed, (val) => {
    setStorage('note_plus_notelist_collapsed', val);
  });

  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
  }

  function toggleNoteList() {
    isNoteListCollapsed.value = !isNoteListCollapsed.value;
  }

  function toggleFocusMode() {
    // If both are collapsed, expand both; otherwise collapse both
    if (isSidebarCollapsed.value && isNoteListCollapsed.value) {
      isSidebarCollapsed.value = false;
      isNoteListCollapsed.value = false;
    } else {
      isSidebarCollapsed.value = true;
      isNoteListCollapsed.value = true;
    }
  }

  return {
    isSidebarCollapsed,
    isNoteListCollapsed,
    windowWidth,
    uiDensityMode,
    isMediumDensity,
    uiDensity,
    initResponsive,
    destroyResponsive,
    setUiDensityMode,
    toggleSidebar,
    toggleNoteList,
    toggleFocusMode
  };
});
