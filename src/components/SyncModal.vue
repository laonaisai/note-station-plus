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
        <button
          @click="closeModal"
          :disabled="syncStore.isSyncing"
          class="text-slate-400 hover:text-slate-600 p-1 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
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
          <!-- Tags list -->
          <div v-if="noteStore.activeNote?.tag && noteStore.activeNote.tag.length > 0" class="mt-2 flex items-center flex-wrap gap-1 border-t border-slate-200/60 pt-1.5">
            <span class="text-slate-400 text-[11px] mr-1">附带标签:</span>
            <span
              v-for="t in noteStore.activeNote.tag"
              :key="t"
              class="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200/80 text-syno-blue text-[11px] font-medium"
            >
              #{{ t }}
            </span>
          </div>
        </div>

        <!-- Target Server Selection -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">选择同步目标服务</label>
          <div v-if="targetProfiles.length === 0" class="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            暂无其他可用服务。请在顶部 Tab 栏点击「+ 添加服务」接入第二个 Note Station 服务后再试。
          </div>
          <div v-else class="space-y-2" :class="syncStore.isSyncing ? 'pointer-events-none opacity-60' : ''">
            <div
              v-for="profile in targetProfiles"
              :key="profile.id"
              @click="selectTarget(profile.id)"
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

        <!-- Feedback Result Card (when completed) -->
        <div
          v-if="syncResult"
          :class="[
            'p-3.5 rounded-lg border flex items-start space-x-3 transition-all animate-in fade-in duration-200',
            syncResult.success ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' : 'bg-rose-50/90 border-rose-200 text-rose-900'
          ]"
        >
          <div
            class="p-1 rounded-full shrink-0 mt-0.5"
            :class="syncResult.success ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'"
          >
            <svg v-if="syncResult.success" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div class="flex-1 text-xs">
            <div class="font-bold text-sm flex items-center justify-between">
              <span>{{ syncResult.success ? '同步已完成' : '同步失败' }}</span>
              <span class="text-[11px] font-normal text-slate-400">
                {{ formatLogTime(syncResult.timestamp) }}
              </span>
            </div>
            <div class="mt-1 leading-relaxed">
              <template v-if="syncResult.success">
                便签【<b>{{ syncResult.noteTitle }}</b>】已成功
                <span
                  class="font-semibold px-1.5 py-0.5 rounded text-[11px]"
                  :class="syncResult.action === 'updated' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
                >
                  {{ syncResult.action === 'updated' ? '覆盖更新' : '新建便签' }}
                </span>
                至目标服务【<b>{{ syncResult.targetAlias }}</b>】。
              </template>
              <template v-else>
                {{ syncResult.error }}
              </template>
            </div>
          </div>
        </div>

        <!-- Sync rule explanation -->
        <div v-else class="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
          <b>同步规则说明：</b>
          系统将自动在目标服务中检索同名便签。若存在同名便签，将使用当前便签内容执行覆盖更新；若不存在，将在目标服务中自动新建便签。
        </div>

        <!-- Sync Logs with Timestamps -->
        <div v-if="syncStore.syncLogs.length > 0" class="space-y-1">
          <div class="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>同步执行日志</span>
            <span class="font-mono text-[10px]">共 {{ syncStore.syncLogs.length }} 条记录</span>
          </div>
          <div
            ref="logsContainerRef"
            class="max-h-36 overflow-y-auto bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[11px] space-y-1.5 scroll-smooth"
          >
            <div
              v-for="(log, idx) in syncStore.syncLogs"
              :key="idx"
              class="flex items-start space-x-1.5 leading-relaxed"
              :class="{
                'text-emerald-400': log.type === 'success',
                'text-rose-400': log.type === 'error',
                'text-slate-300': log.type === 'info'
              }"
            >
              <span class="text-slate-500 shrink-0 font-mono select-none">[{{ formatLogTime(log.time) }}]</span>
              <span class="text-slate-400 select-none">&gt;</span>
              <span class="break-all">{{ log.message }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="closeModal"
            :disabled="syncStore.isSyncing"
            class="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {{ syncResult?.success ? '完成并关闭' : '取消' }}
          </button>

          <!-- Sync Trigger / Status Button -->
          <button
            type="button"
            @click="executeSync"
            :disabled="!selectedTargetId || syncStore.isSyncing"
            :class="[
              'px-4 py-1.5 text-xs rounded-lg shadow-sm font-medium transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-white',
              syncResult?.success && !syncStore.isSyncing
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-syno-blue hover:bg-blue-600'
            ]"
          >
            <!-- Syncing Spinner -->
            <svg v-if="syncStore.isSyncing" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>

            <!-- Success check icon -->
            <svg v-else-if="syncResult?.success" class="w-3.5 h-3.5 mr-1 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>

            <span v-if="syncStore.isSyncing">同步中...</span>
            <span v-else-if="syncResult?.success">再次同步</span>
            <span v-else>立即同步</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
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
const logsContainerRef = ref<HTMLDivElement | null>(null);

interface SyncResultFeedback {
  success: boolean;
  action?: 'created' | 'updated';
  targetAlias?: string;
  noteTitle?: string;
  error?: string;
  timestamp: number;
}

const syncResult = ref<SyncResultFeedback | null>(null);

function formatLogTime(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Target profiles excludes active profile
const targetProfiles = computed(() => {
  return sessionStore.profiles.filter(p => p.id !== sessionStore.activeProfileId);
});

function selectTarget(id: string) {
  if (syncStore.isSyncing) return;
  selectedTargetId.value = id;
  syncResult.value = null;
}

function closeModal() {
  if (syncStore.isSyncing) return;
  emit('close');
}

// Auto select first target profile when opening modal
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      syncResult.value = null;
      if (targetProfiles.value.length > 0 && !selectedTargetId.value) {
        selectedTargetId.value = targetProfiles.value[0].id;
      }
    }
  },
  { immediate: true }
);

// Auto-scroll logs container to bottom when new logs arrive
watch(
  () => syncStore.syncLogs.length,
  async () => {
    await nextTick();
    if (logsContainerRef.value) {
      logsContainerRef.value.scrollTop = logsContainerRef.value.scrollHeight;
    }
  }
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
  if (!noteStore.activeNote || !selectedTargetId.value || syncStore.isSyncing) return;

  const targetProfile = sessionStore.profiles.find(p => p.id === selectedTargetId.value);
  const targetAlias = targetProfile?.alias || '目标服务';
  const noteTitle = noteStore.activeNote.title || '无标题便签';

  syncResult.value = null;
  syncStore.clearLogs();
  syncStore.isSyncing = true;

  try {
    const result = await syncStore.syncNoteToTarget(noteStore.activeNote, selectedTargetId.value);
    if (result.action === 'created' || result.action === 'updated') {
      syncResult.value = {
        success: true,
        action: result.action,
        targetAlias,
        noteTitle,
        timestamp: Date.now()
      };
    } else {
      syncResult.value = {
        success: false,
        error: result.error || '同步未成功完成',
        timestamp: Date.now()
      };
    }
  } catch (e: any) {
    const errMsg = e?.message || String(e);
    syncResult.value = {
      success: false,
      error: errMsg,
      timestamp: Date.now()
    };
  } finally {
    syncStore.isSyncing = false;
    // Re-check match status after sync to update badge
    if (syncResult.value?.success) {
      matchedNoteInfo.value = { ...noteStore.activeNote };
    }
  }
}
</script>
