<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-800 flex items-center">
          <svg class="w-4 h-4 mr-2 text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          跨服务便签同步
        </h3>
        <button @click="$emit('close')" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <!-- Source Note Info -->
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
          <div class="text-slate-400 font-medium mb-1">源便签信息</div>
          <div class="font-bold text-slate-800 text-sm truncate">{{ noteStore.activeNote?.title || '无标题便签' }}</div>
          <div class="text-slate-500 mt-1 flex items-center space-x-2">
            <span>来源服务: <b class="text-slate-700">{{ sessionStore.activeProfile?.alias }}</b></span>
            <span>•</span>
            <span>字数: {{ (noteStore.activeNote?.markdownContent || '').length }} 字符</span>
          </div>
        </div>

        <!-- Target Server Selection -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">选择同步目标服务</label>
          <div v-if="targetProfiles.length === 0" class="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            暂无其他可用服务。请在顶部 Tab 栏点击「+ 添加服务」接入第二个 Note Station 服务后再试。
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="profile in targetProfiles"
              :key="profile.id"
              @click="selectedTargetId = profile.id"
              :class="[
                'p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between',
                selectedTargetId === profile.id
                  ? 'border-syno-blue bg-blue-50/50 ring-1 ring-syno-blue/40'
                  : 'border-slate-200 hover:bg-slate-50'
              ]"
            >
              <div>
                <div class="font-semibold text-slate-800">{{ profile.alias }}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ profile.account }} @ {{ profile.serverUrl }}</div>
              </div>

              <!-- Matching Status Probe -->
              <div>
                <span
                  v-if="checkingMatch"
                  class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded animate-pulse"
                >
                  探测中...
                </span>
                <span
                  v-else-if="matchedNoteInfo && selectedTargetId === profile.id"
                  class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium flex items-center"
                >
                  已匹配同名便签 (将覆盖更新)
                </span>
                <span
                  v-else-if="selectedTargetId === profile.id"
                  class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium flex items-center"
                >
                  未发现同名便签 (将新建)
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sync rule explanation -->
        <div class="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
          <b>同步规则说明：</b>
          系统将自动在目标服务中检索同名便签。若存在，将使用当前 Markdown 内容更新目标便签；若不存在，将在目标服务的笔记本中新建此便签。
        </div>

        <!-- Sync Logs -->
        <div v-if="syncStore.syncLogs.length > 0" class="max-h-32 overflow-y-auto bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[11px] space-y-1">
          <div
            v-for="(log, idx) in syncStore.syncLogs.slice(0, 5)"
            :key="idx"
            :class="{
              'text-emerald-400': log.type === 'success',
              'text-rose-400': log.type === 'error',
              'text-slate-300': log.type === 'info'
            }"
          >
            &gt; {{ log.message }}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="$emit('close')"
            class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
          >
            关闭
          </button>
          <button
            type="button"
            @click="executeSync"
            :disabled="!selectedTargetId || syncStore.isSyncing"
            class="px-4 py-1.5 text-xs text-white bg-syno-blue hover:bg-blue-600 rounded-lg shadow-sm font-medium transition flex items-center disabled:opacity-50"
          >
            <svg v-if="syncStore.isSyncing" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            立即同步
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSessionStore } from '@/stores/sessionStore';
import { useNoteStore } from '@/stores/noteStore';
import { useSyncStore } from '@/stores/syncStore';
import { SynoNote } from '@/types/synology';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits(['close']);

const sessionStore = useSessionStore();
const noteStore = useNoteStore();
const syncStore = useSyncStore();

const selectedTargetId = ref<string>('');
const checkingMatch = ref<boolean>(false);
const matchedNoteInfo = ref<SynoNote | null>(null);

// Target profiles excludes active profile
const targetProfiles = computed(() => {
  return sessionStore.profiles.filter(p => p.id !== sessionStore.activeProfileId);
});

// Auto select first target profile
watch(
  () => props.isOpen,
  (open) => {
    if (open && targetProfiles.value.length > 0 && !selectedTargetId.value) {
      selectedTargetId.value = targetProfiles.value[0].id;
    }
  },
  { immediate: true }
);

// Check if note exists on selected target
watch(
  [() => selectedTargetId.value, () => props.isOpen],
  async ([targetId, open]) => {
    if (!open || !targetId || !noteStore.activeNote) {
      matchedNoteInfo.value = null;
      return;
    }

    checkingMatch.value = true;
    matchedNoteInfo.value = null;

    try {
      const client = sessionStore.getClient(targetId);
      if (client) {
        // Ensure logged in
        if (!client.sid) {
          await client.login();
        }
        const notebooks = await client.listNotebooks();
        if (notebooks.length > 0) {
          const { notes } = await client.listNotes(notebooks[0].object_id);
          const match = notes.find(n => n.title.trim() === noteStore.activeNote?.title.trim());
          if (match) {
            matchedNoteInfo.value = match;
          }
        }
      }
    } catch (e) {
      console.warn('Match probe failed', e);
    } finally {
      checkingMatch.value = false;
    }
  }
);

async function executeSync() {
  if (!noteStore.activeNote || !selectedTargetId.value) return;

  syncStore.isSyncing = true;
  try {
    const result = await syncStore.syncNoteToTarget(noteStore.activeNote, selectedTargetId.value);
    if (result.action === 'created') {
      alert(`同步成功！已在目标服务中新建便签【${noteStore.activeNote.title}】`);
    } else if (result.action === 'updated') {
      alert(`同步成功！已在目标服务中覆盖更新同名便签【${noteStore.activeNote.title}】`);
    }
  } catch (e: any) {
    alert(`同步出现异常: ${e?.message || e}`);
  } finally {
    syncStore.isSyncing = false;
  }
}
</script>

