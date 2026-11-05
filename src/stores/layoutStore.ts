import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

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
    toggleSidebar,
    toggleNoteList,
    toggleFocusMode
  };
});
