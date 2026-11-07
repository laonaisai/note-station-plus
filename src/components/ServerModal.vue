<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center">
          <svg class="w-4 h-4 mr-2 text-syno-blue dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          {{ isEdit ? t('server.titleEdit') : t('server.titleAdd') }}
        </h3>
        <button @click="close" class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer" :title="t('common.close')">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSave" class="p-6 space-y-4">
        <!-- Alias -->
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t('server.alias') }}</label>
          <input
            ref="aliasInputRef"
            v-model="form.alias"
            type="text"
            tabindex="1"
            required
            :placeholder="t('server.aliasPlaceholder')"
            class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-syno-blue/20 focus:border-syno-blue outline-none transition text-slate-800 dark:text-slate-100"
          />
        </div>

        <!-- Server URL -->
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t('server.serverUrl') }}</label>
          <input
            v-model="form.serverUrl"
            type="url"
            tabindex="2"
            required
            :placeholder="t('server.serverUrlPlaceholder')"
            class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-syno-blue/20 focus:border-syno-blue outline-none transition text-slate-800 dark:text-slate-100"
          />
        </div>

        <!-- Account -->
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t('server.account') }}</label>
          <input
            v-model="form.account"
            type="text"
            tabindex="3"
            required
            :placeholder="t('server.accountPlaceholder')"
            class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-syno-blue/20 focus:border-syno-blue outline-none transition text-slate-800 dark:text-slate-100"
          />
        </div>

        <!-- Password -->
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t('server.password') }}</label>
          <input
            v-model="form.password"
            type="password"
            tabindex="4"
            required
            :placeholder="t('server.passwordPlaceholder')"
            class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-syno-blue/20 focus:border-syno-blue outline-none transition text-slate-800 dark:text-slate-100"
          />
        </div>

        <!-- Options -->
        <div class="flex items-center justify-between pt-1">
          <label class="flex items-center text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input v-model="form.allowInsecureSSL" type="checkbox" tabindex="5" class="rounded text-syno-blue mr-2 focus:ring-0 cursor-pointer" />
            {{ t('server.allowInsecureSSL') }}
          </label>
        </div>

        <!-- Test feedback -->
        <div v-if="testResult" :class="['text-xs p-2.5 rounded-lg flex items-center', testResult.success ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800']">
          <svg v-if="testResult.success" class="w-4 h-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else class="w-4 h-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ testResult.message }}</span>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            tabindex="6"
            @click="handleTestConnection"
            :disabled="isTesting"
            class="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition flex items-center cursor-pointer"
          >
            <svg v-if="isTesting" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            {{ isTesting ? t('server.testing') : t('server.testConnection') }}
          </button>

          <div class="flex space-x-2">
            <button
              type="button"
              tabindex="7"
              @click="close"
              class="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="submit"
              tabindex="8"
              class="px-4 py-1.5 text-xs text-white bg-syno-blue hover:bg-blue-600 rounded-lg shadow-sm font-medium transition cursor-pointer"
            >
              {{ t('server.saveServer') }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { t } from '@/i18n';
import { ServerProfile } from '@/types/synology';
import { SynologyApiClient } from '@/api/SynologyApiClient';

const props = defineProps<{
  isOpen: boolean;
  profile?: ServerProfile | null;
}>();

const emit = defineEmits(['close', 'save']);

const isEdit = ref(false);
const isTesting = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);
const aliasInputRef = ref<HTMLInputElement | null>(null);

const form = reactive<ServerProfile>({
  id: '',
  alias: '',
  serverUrl: '',
  account: '',
  password: '',
  allowInsecureSSL: true,
  autoLogin: true,
  createdAt: 0
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      nextTick(() => {
        aliasInputRef.value?.focus();
      });
    }
  }
);

watch(
  () => props.profile,
  (val) => {
    testResult.value = null;
    if (val) {
      isEdit.value = true;
      Object.assign(form, val);
    } else {
      isEdit.value = false;
      Object.assign(form, {
        id: 'server-' + Date.now(),
        alias: '',
        serverUrl: 'http://',
        account: '',
        password: '',
        allowInsecureSSL: true,
        autoLogin: true,
        createdAt: Date.now()
      });
    }
  },
  { immediate: true }
);

function close() {
  testResult.value = null;
  emit('close');
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    close();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

async function handleTestConnection() {
  if (!form.serverUrl || !form.account || !form.password) {
    testResult.value = { success: false, message: '请完整填写服务器地址、账号和密码' };
    return;
  }

  isTesting.value = true;
  testResult.value = null;

  try {
    const tempClient = new SynologyApiClient(form);
    await tempClient.login();
    testResult.value = { success: true, message: t('server.testSuccess') };
  } catch (e: any) {
    testResult.value = { success: false, message: e?.message || t('server.testFailed') };
  } finally {
    isTesting.value = false;
  }
}

function handleSave() {
  if (!form.alias.trim()) {
    form.alias = form.serverUrl.replace(/^https?:\/\//, '').split(':')[0];
  }
  emit('save', { ...form });
  close();
}
</script>

