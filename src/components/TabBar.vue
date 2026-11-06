<template>
  <div class="h-11 bg-slate-900 border-b border-slate-800 flex items-center px-2 select-none justify-between">
    <!-- Left: App Icon & Server Tabs -->
    <div class="flex items-center space-x-1.5 overflow-x-auto h-full scrollbar-none py-1">
      <div class="flex items-center px-1.5 text-slate-100 font-semibold text-xs tracking-wide mr-1 shrink-0">
        <img src="/logo.png" alt="NoteStation+" class="w-5 h-5 rounded-md mr-1.5 object-contain shadow-sm" />
        {{ t('tabBar.appName') }}
      </div>

      <!-- Server Tabs -->
      <div
        v-for="profile in sessionStore.profiles"
        :key="profile.id"
        @click="handleTabClick(profile.id)"
        :class="[
          'group relative flex items-center h-8 px-3 text-xs rounded-md cursor-pointer transition-all shrink-0',
          sessionStore.activeProfileId === profile.id
            ? 'bg-slate-800 text-white font-medium shadow-sm border border-slate-700/80'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
        ]"
      >
        <!-- Status dot -->
        <span
          :class="[
            'w-2 h-2 rounded-full mr-2 shrink-0 transition-colors',
            getStatusColor(profile.id)
          ]"
        ></span>

        <span class="max-w-[120px] truncate">{{ profile.alias || profile.serverUrl }}</span>

        <!-- Edit Profile -->
        <button
          @click.stop="$emit('edit-server', profile)"
          class="ml-2 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
          :title="t('tabBar.editServer')"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        <!-- Close/Remove Tab -->
        <button
          @click.stop="confirmRemoveProfile(profile)"
          class="ml-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
          :title="t('tabBar.removeServer')"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Empty state prompt -->
      <div v-if="sessionStore.profiles.length === 0" class="text-xs text-slate-400 px-2 py-1 flex items-center">
        <span>{{ t('tabBar.emptyPrompt') }}</span>
      </div>

      <!-- Add Server Button -->
      <button
        @click="$emit('add-server')"
        :class="[
          'h-8 px-2.5 rounded-md text-xs flex items-center shrink-0 transition-colors cursor-pointer',
          sessionStore.profiles.length === 0
            ? 'bg-syno-blue text-white hover:bg-blue-600 font-medium shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        ]"
        :title="t('tabBar.addServer')"
      >
        <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {{ t('tabBar.addServer') }}
      </button>
    </div>

    <!-- Right: Server Status Info & Actions -->
    <div class="flex items-center space-x-1.5 text-xs text-slate-400 shrink-0">
      <span v-if="currentStatusText" class="hidden md:inline px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300">
        {{ currentStatusText }}
      </span>

      <!-- Reconnect button -->
      <button
        @click="reconnectActive"
        class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        :title="t('tabBar.reconnectTitle')"
      >
        <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': isConnecting }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      <!-- PIN Security Settings button -->
      <button
        @click="$emit('open-pin-settings')"
        class="p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
        :class="isPinSet ? 'text-syno-blue hover:text-blue-400' : 'text-slate-500 hover:text-slate-300'"
        :title="isPinSet ? t('tabBar.pinTitleEnabled') : t('tabBar.pinTitleDisabled')"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </button>

      <!-- Lock Screen Button (visible when PIN is set) -->
      <button
        v-if="isPinSet"
        @click="$emit('lock-screen')"
        class="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
        :title="t('tabBar.lockNow')"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
        </svg>
      </button>

      <!-- Clear data / Reset button -->
      <button
        @click="confirmResetApp"
        class="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
        :title="t('tabBar.clearDataTitle')"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <span class="w-[1px] h-3.5 bg-slate-800 mx-0.5"></span>

      <!-- Theme Switcher Button (浅色 / 深色) -->
      <button
        @click="themeStore.toggleTheme"
        class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
        :title="themeStore.theme === 'dark' ? t('tabBar.themeLight') : t('tabBar.themeDark')"
      >
        <!-- Sun icon when in dark mode (click for light) -->
        <svg v-if="themeStore.theme === 'dark'" class="w-3.5 h-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <!-- Moon icon when in light mode (click for dark) -->
        <svg v-else class="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <!-- Language Selector Dropdown -->
      <div class="relative">
        <button
          @click="isLangMenuOpen = !isLangMenuOpen"
          class="flex items-center space-x-1 p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          :title="t('tabBar.language')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <span class="text-[11px] font-medium hidden sm:inline">{{ currentLangShortName }}</span>
        </button>

        <!-- Dropdown Menu -->
        <div
          v-if="isLangMenuOpen"
          v-click-outside="() => isLangMenuOpen = false"
          class="absolute right-0 top-full mt-1.5 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs flex flex-col"
        >
          <button
            v-for="item in SUPPORTED_LOCALES"
            :key="item.code"
            @click="selectLanguage(item.code)"
            class="flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer"
            :class="currentLocale === item.code ? 'bg-syno-blue text-white font-medium' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'"
          >
            <span>{{ item.name }}</span>
            <svg v-if="currentLocale === item.code" class="w-3 h-3 ml-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>

      <span class="w-[1px] h-3.5 bg-slate-800 mx-0.5"></span>

      <!-- About Button (关于) -->
      <button
        @click="$emit('open-about')"
        class="flex items-center space-x-1 px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        :title="t('tabBar.aboutTitle')"
      >
        <svg class="w-3.5 h-3.5 text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-xs font-medium">{{ t('tabBar.aboutBtn') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSessionStore } from '@/stores/sessionStore';
import { useNoteStore } from '@/stores/noteStore';
import { useThemeStore } from '@/stores/themeStore';
import { t, currentLocale, setLocale, SUPPORTED_LOCALES, SupportedLocale } from '@/i18n';
import { ServerProfile } from '@/types/synology';

const props = withDefaults(
  defineProps<{
    isPinSet?: boolean;
  }>(),
  {
    isPinSet: false
  }
);

const emit = defineEmits(['add-server', 'edit-server', 'open-pin-settings', 'lock-screen', 'open-about']);
const sessionStore = useSessionStore();
const noteStore = useNoteStore();
const themeStore = useThemeStore();

const isLangMenuOpen = ref(false);

const currentLangShortName = computed(() => {
  const map: Record<SupportedLocale, string> = {
    'zh-CN': '简',
    'zh-TW': '繁',
    'en-US': 'EN',
    'ja-JP': '日'
  };
  return map[currentLocale.value] || '简';
});

function selectLanguage(code: SupportedLocale) {
  setLocale(code);
  isLangMenuOpen.value = false;
}

// Simple directive for clicking outside the language menu
const vClickOutside = {
  mounted(el: any, binding: any) {
    el._clickOutside = (event: Event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value();
      }
    };
    document.addEventListener('click', el._clickOutside, true);
  },
  unmounted(el: any) {
    if (el._clickOutside) {
      document.removeEventListener('click', el._clickOutside, true);
    }
  }
};

function getStatusColor(profileId: string): string {
  const state = sessionStore.sessionStates[profileId];
  if (!state) return 'bg-slate-500';
  if (state.isConnecting) return 'bg-amber-400 animate-pulse';
  if (state.isLoggedIn) return 'bg-emerald-500';
  return 'bg-rose-500';
}

const isConnecting = computed(() => {
  return sessionStore.activeSessionState?.isConnecting || false;
});

async function handleTabClick(profileId: string) {
  if (sessionStore.activeProfileId === profileId) {
    const state = sessionStore.sessionStates[profileId];
    if (!state?.isLoggedIn && !state?.isConnecting) {
      const ok = await sessionStore.loginServer(profileId);
      if (ok) {
        await noteStore.fetchNotebooks();
      }
    }
    return;
  }
  await sessionStore.setActiveProfile(profileId);
}

const currentStatusText = computed(() => {
  const profile = sessionStore.activeProfile;
  const state = sessionStore.activeSessionState;
  if (!profile) return '';
  if (state?.isConnecting) return t('tabBar.connecting');
  if (state?.isLoggedIn) return `${profile.account}@${profile.alias || 'Note Station'}`;
  if (state?.lastError) return `${t('tabBar.connError')}: ${state.lastError}`;
  return t('tabBar.notLoggedIn');
});

async function reconnectActive() {
  if (sessionStore.activeProfileId) {
    const ok = await sessionStore.loginServer(sessionStore.activeProfileId);
    if (ok) {
      await noteStore.fetchNotebooks();
    }
  }
}

async function confirmRemoveProfile(profile: ServerProfile) {
  if (confirm(t('tabBar.removeServerConfirm', { alias: profile.alias || profile.serverUrl }))) {
    await sessionStore.removeProfile(profile.id);
    if (sessionStore.profiles.length === 0) {
      noteStore.reset();
      emit('add-server');
    }
  }
}

function confirmResetApp() {
  if (confirm(t('tabBar.clearDataConfirm'))) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }
}
</script>


