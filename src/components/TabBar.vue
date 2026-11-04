<template>
  <div class="h-11 bg-slate-900 border-b border-slate-800 flex items-center px-2 select-none justify-between">
    <!-- Left: App Icon & Server Tabs -->
    <div class="flex items-center space-x-1.5 overflow-x-auto h-full scrollbar-none py-1">
      <div class="flex items-center px-2 text-syno-blue font-semibold text-xs tracking-wide mr-1 shrink-0">
        <span class="bg-syno-blue text-white rounded p-1 mr-1.5 flex items-center justify-center">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </span>
        NoteStation+
      </div>

      <!-- Server Tabs -->
      <div
        v-for="profile in sessionStore.profiles"
        :key="profile.id"
        @click="sessionStore.setActiveProfile(profile.id)"
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
          class="ml-2 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
          title="编辑服务器配置"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        <!-- Close/Remove Tab if > 1 profiles -->
        <button
          v-if="sessionStore.profiles.length > 1"
          @click.stop="confirmRemoveProfile(profile)"
          class="ml-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
          title="移除此服务器"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Add Server Button -->
      <button
        @click="$emit('add-server')"
        class="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-md text-xs flex items-center shrink-0 transition-colors"
        title="添加 Note Station 服务"
      >
        <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        添加服务
      </button>
    </div>

    <!-- Right: Server Status Info & Actions -->
    <div class="flex items-center space-x-2 text-xs text-slate-400 shrink-0">
      <span v-if="currentStatusText" class="hidden md:inline px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300">
        {{ currentStatusText }}
      </span>

      <!-- Reconnect button -->
      <button
        @click="reconnectActive"
        class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="重新连接当前服务器"
      >
        <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': isConnecting }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSessionStore } from '@/stores/sessionStore';
import { useNoteStore } from '@/stores/noteStore';
import { ServerProfile } from '@/types/synology';

const emit = defineEmits(['add-server', 'edit-server']);
const sessionStore = useSessionStore();
const noteStore = useNoteStore();

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

const currentStatusText = computed(() => {
  const profile = sessionStore.activeProfile;
  const state = sessionStore.activeSessionState;
  if (!profile) return '';
  if (state?.isConnecting) return '正在连接...';
  if (state?.isLoggedIn) return `${profile.account}@${profile.alias || 'Note Station'}`;
  if (state?.lastError) return `连接异常: ${state.lastError}`;
  return '未登录';
});

async function reconnectActive() {
  if (sessionStore.activeProfileId) {
    const ok = await sessionStore.loginServer(sessionStore.activeProfileId);
    if (ok) {
      await noteStore.fetchNotebooks();
    }
  }
}

function confirmRemoveProfile(profile: ServerProfile) {
  if (confirm(`确定要移除服务【${profile.alias}】吗？这不会影响 NAS 上的数据。`)) {
    sessionStore.removeProfile(profile.id);
  }
}
</script>

