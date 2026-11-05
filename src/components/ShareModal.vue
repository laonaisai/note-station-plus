<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-50 text-syno-blue flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-800">便签分享管理</h3>
            <p class="text-[11px] text-slate-400 truncate max-w-sm">{{ noteTitle || '设置便签的公开分享链接与 DSM 用户协同权限' }}</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex-1 py-16 flex flex-col items-center justify-center text-slate-400">
        <svg class="animate-spin h-7 w-7 text-syno-blue mb-2.5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <p class="text-xs">正在获取分享权限信息...</p>
      </div>

      <!-- Modal Body -->
      <div v-else class="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs">
        <!-- Section 1: 公开分享链接 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-bold text-slate-700 text-xs">公开链接分享</span>
              <p class="text-[11px] text-slate-400">开启后可通过专属网址向他人分享此便签</p>
            </div>
            <!-- Toggle Switch -->
            <button
              type="button"
              @click="isPublicEnabled = !isPublicEnabled"
              :class="[
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                isPublicEnabled ? 'bg-syno-blue' : 'bg-slate-200'
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                  isPublicEnabled ? 'translate-x-4' : 'translate-x-0'
                ]"
              />
            </button>
          </div>

          <!-- Public Share Options (when enabled) -->
          <div v-if="isPublicEnabled" class="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-3">
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1">公开访问网址：</label>
              <div class="flex items-center space-x-2">
                <input
                  type="text"
                  readonly
                  :value="publicUrl"
                  class="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-700 text-xs font-mono select-all focus:outline-none"
                />
                <button
                  @click="copyShareLink"
                  class="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium transition flex items-center shrink-0"
                  title="复制链接"
                >
                  <svg v-if="!isCopied" class="w-3.5 h-3.5 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 mr-1 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ isCopied ? '已复制' : '复制' }}
                </button>
                <a
                  v-if="publicUrl"
                  :href="publicUrl"
                  target="_blank"
                  class="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium transition flex items-center shrink-0"
                  title="在浏览器中打开"
                >
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <div class="flex items-center space-x-4 pt-1">
              <span class="text-[11px] text-slate-500">访问权限：</span>
              <label class="inline-flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  value="ro"
                  v-model="publicPerm"
                  class="text-syno-blue focus:ring-0 focus:outline-none"
                />
                <span class="text-slate-700">只读 (View Only)</span>
              </label>
              <label class="inline-flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  value="rw"
                  v-model="publicPerm"
                  class="text-syno-blue focus:ring-0 focus:outline-none"
                />
                <span class="text-slate-700">可编辑 (Edit)</span>
              </label>
            </div>
          </div>
          <div v-else class="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 text-[11px]">
            公开链接分享已关闭，非群晖授权人员无法通过外链查看此便签。
          </div>
        </div>

        <hr class="border-slate-100" />

        <!-- Section 2: DSM 用户与群组协作 -->
        <div class="space-y-3">
          <div>
            <span class="font-bold text-slate-700 text-xs">DSM 用户与群组协作</span>
            <p class="text-[11px] text-slate-400">授权指定的群晖 DSM 用户或用户组协同查看或编辑此便签</p>
          </div>

          <!-- Add Member Control -->
          <div class="flex items-center space-x-2">
            <select
              v-model="selectedCandidate"
              class="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-700 text-xs focus:border-syno-blue focus:outline-none"
            >
              <option value="" disabled>选择 DSM 用户或用户组...</option>
              <optgroup v-if="filteredAvailableUsers.length > 0" label="DSM 用户">
                <option
                  v-for="user in filteredAvailableUsers"
                  :key="'user:' + user"
                  :value="'user:' + user"
                >
                  👤 {{ user }}
                </option>
              </optgroup>
              <optgroup v-if="filteredAvailableGroups.length > 0" label="DSM 用户组">
                <option
                  v-for="group in filteredAvailableGroups"
                  :key="'group:' + group"
                  :value="'group:' + group"
                >
                  👥 {{ group }}
                </option>
              </optgroup>
            </select>

            <select
              v-model="newMemberPerm"
              class="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-700 text-xs focus:border-syno-blue focus:outline-none"
            >
              <option value="ro">只读</option>
              <option value="rw">可读写</option>
            </select>

            <button
              @click="addMember"
              :disabled="!selectedCandidate"
              class="px-3 py-1.5 bg-syno-blue hover:bg-blue-600 disabled:opacity-50 text-white rounded font-medium transition flex items-center shrink-0"
            >
              <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              添加
            </button>
          </div>

          <!-- Members List -->
          <div class="border border-slate-100 rounded-lg divide-y divide-slate-100 overflow-hidden bg-white">
            <div
              v-for="(member, idx) in members"
              :key="member.type + ':' + member.name"
              class="px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div class="flex items-center space-x-2">
                <span class="text-sm">{{ member.type === 'group' ? '👥' : '👤' }}</span>
                <span class="font-medium text-slate-700">{{ member.name }}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                  {{ member.type === 'group' ? '用户组' : '用户' }}
                </span>
              </div>

              <div class="flex items-center space-x-2">
                <select
                  v-model="member.perm"
                  class="px-2 py-0.5 border border-slate-200 rounded text-xs text-slate-600 bg-white focus:outline-none"
                >
                  <option value="ro">只读</option>
                  <option value="rw">可读写</option>
                </select>

                <button
                  @click="removeMember(idx)"
                  class="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-100 transition"
                  title="移除权限"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Empty Members State -->
            <div v-if="members.length === 0" class="py-6 text-center text-slate-400 text-xs">
              暂未指定任何 DSM 用户或用户组协作权限
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        <span v-if="feedbackMsg" class="text-xs text-emerald-600 font-medium">
          {{ feedbackMsg }}
        </span>
        <span v-else class="text-[11px] text-slate-400">
          保存后设置将立即同步至群晖 Note Station 服务端
        </span>

        <div class="flex items-center space-x-2 ml-auto">
          <button
            @click="$emit('close')"
            :disabled="isSaving"
            class="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition"
          >
            取消
          </button>
          <button
            @click="handleSave"
            :disabled="isSaving || isLoading"
            class="px-4 py-1.5 bg-syno-blue hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition shadow-xs flex items-center"
          >
            <svg v-if="isSaving" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            {{ isSaving ? '保存中...' : '保存设置' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useNoteStore } from '@/stores/noteStore';
import { SharedMember } from '@/types/synology';

const props = defineProps<{
  isOpen: boolean;
  noteId: string | null;
  noteTitle?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const noteStore = useNoteStore();

const isLoading = ref(false);
const isSaving = ref(false);
const isCopied = ref(false);
const feedbackMsg = ref('');

const isPublicEnabled = ref(false);
const publicUrl = ref('');
const publicPerm = ref<'ro' | 'rw'>('ro');
const members = ref<SharedMember[]>([]);
const initialMembers = ref<SharedMember[]>([]);

const availableUsers = ref<string[]>([]);
const availableGroups = ref<string[]>([]);
const selectedCandidate = ref('');
const newMemberPerm = ref<'ro' | 'rw'>('ro');

const filteredAvailableUsers = computed(() => {
  const current = new Set(members.value.filter(m => m.type === 'user').map(m => m.name));
  return availableUsers.value.filter(u => !current.has(u));
});

const filteredAvailableGroups = computed(() => {
  const current = new Set(members.value.filter(m => m.type === 'group').map(m => m.name));
  return availableGroups.value.filter(g => !current.has(g));
});

watch(
  () => [props.isOpen, props.noteId],
  async ([open, id]) => {
    if (open && id) {
      await loadShareData(id as string);
    }
  },
  { immediate: true }
);

async function loadShareData(id: string) {
  isLoading.value = true;
  feedbackMsg.value = '';
  selectedCandidate.value = '';
  try {
    const info = await noteStore.getNoteShareInfo(id);
    if (info) {
      isPublicEnabled.value = info.isPublicEnabled;
      publicUrl.value = info.publicUrl;
      publicPerm.value = info.publicPerm;
      members.value = JSON.parse(JSON.stringify(info.members));
      initialMembers.value = JSON.parse(JSON.stringify(info.members));
      availableUsers.value = info.availableUsers;
      availableGroups.value = info.availableGroups;
    }
  } catch (err) {
    console.error('Failed to load share data', err);
  } finally {
    isLoading.value = false;
  }
}

function addMember() {
  if (!selectedCandidate.value) return;
  const [type, name] = selectedCandidate.value.split(':') as ['user' | 'group', string];
  members.value.push({
    name,
    type,
    perm: newMemberPerm.value
  });
  selectedCandidate.value = '';
  newMemberPerm.value = 'ro';
}

function removeMember(index: number) {
  members.value.splice(index, 1);
}

async function copyShareLink() {
  if (!publicUrl.value) return;
  try {
    await navigator.clipboard.writeText(publicUrl.value);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (e) {
    console.error('Clipboard copy failed', e);
  }
}

async function handleSave() {
  if (!props.noteId) return;
  isSaving.value = true;
  feedbackMsg.value = '';

  try {
    // Calculate added/updated vs removed members
    const initialMap = new Map<string, SharedMember>(
      initialMembers.value.map(m => [`${m.type}:${m.name}`, m])
    );
    const currentMap = new Map<string, SharedMember>(
      members.value.map(m => [`${m.type}:${m.name}`, m])
    );

    const addedOrUpdatedMembers: SharedMember[] = [];
    const removedMembers: SharedMember[] = [];

    // Find added or modified members
    for (const [key, cur] of currentMap.entries()) {
      const init = initialMap.get(key);
      if (!init || init.perm !== cur.perm) {
        addedOrUpdatedMembers.push(cur);
      }
    }

    // Find removed members
    for (const [key, init] of initialMap.entries()) {
      if (!currentMap.has(key)) {
        removedMembers.push(init);
      }
    }

    await noteStore.updateNoteShareSettings({
      objectId: props.noteId,
      isPublicEnabled: isPublicEnabled.value,
      publicPerm: publicPerm.value,
      addedOrUpdatedMembers,
      removedMembers
    });

    feedbackMsg.value = '分享设置已成功保存！';
    setTimeout(() => {
      emit('close');
    }, 800);
  } catch (err: any) {
    console.error('Save share settings failed', err);
    alert('保存分享设置失败: ' + (err.message || '未知错误'));
  } finally {
    isSaving.value = false;
  }
}
</script>

