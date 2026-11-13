<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    @click.self="close"
    @keydown.esc="close"
  >
    <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">
              {{ modalTitle }}
            </h3>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[280px]">
              {{ targetNote?.title || t('editor.untitledNote') }}
            </p>
          </div>
        </div>

        <button
          @click="close"
          class="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          :title="t('common.close')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body Form -->
      <form @submit.prevent="handleSubmit" class="p-5 space-y-4 text-xs">
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center justify-between text-xs"
        >
          <span>{{ errorMessage }}</span>
          <button type="button" @click="errorMessage = ''" class="text-rose-500 hover:text-rose-700 ml-2">×</button>
        </div>

        <!-- Warning tip for remove mode -->
        <div
          v-if="mode === 'remove'"
          class="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-start space-x-2 leading-relaxed"
        >
          <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{{ t('editor.removeEncryptionWarning') }}</span>
        </div>

        <!-- Old Password (For change_password and remove) -->
        <div v-if="mode === 'change_password' || mode === 'remove'" class="space-y-1.5">
          <label class="block font-medium text-slate-700 dark:text-slate-300">
            {{ t('editor.oldPassword') }}
          </label>
          <div class="relative">
            <input
              ref="oldPasswordInputRef"
              v-model="oldPassword"
              :type="showOldPassword ? 'text' : 'password'"
              :placeholder="t('editor.enterPassword')"
              class="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              required
            />
            <button
              type="button"
              @click="showOldPassword = !showOldPassword"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <svg v-if="showOldPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- New Password (For encrypt and change_password) -->
        <div v-if="mode === 'encrypt' || mode === 'change_password'" class="space-y-1.5">
          <label class="block font-medium text-slate-700 dark:text-slate-300">
            {{ t('editor.newPassword') }}
          </label>
          <div class="relative">
            <input
              ref="newPasswordInputRef"
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              :placeholder="t('editor.enterPassword')"
              class="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              required
            />
            <button
              type="button"
              @click="showNewPassword = !showNewPassword"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <svg v-if="showNewPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Confirm Password (For encrypt and change_password) -->
        <div v-if="mode === 'encrypt' || mode === 'change_password'" class="space-y-1.5">
          <label class="block font-medium text-slate-700 dark:text-slate-300">
            {{ t('editor.confirmPassword') }}
          </label>
          <div class="relative">
            <input
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              :placeholder="t('editor.confirmPassword')"
              class="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              required
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <svg v-if="showConfirmPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            @click="close"
            :disabled="isSubmitting"
            class="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
          >
            {{ t('common.cancel') }}
          </button>

          <button
            type="submit"
            :disabled="isSubmitting"
            :class="[
              'px-4 py-2 text-xs rounded-lg font-medium shadow-2xs transition flex items-center cursor-pointer disabled:opacity-50',
              mode === 'remove'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            ]"
          >
            <svg v-if="isSubmitting" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>{{ submitButtonText }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useNoteStore } from '@/stores/noteStore';
import { t } from '@/i18n';
import { SynoNote } from '@/types/synology';
import { showToast } from '@/utils/toast';

const props = defineProps<{
  isOpen: boolean;
  targetNote: SynoNote | null;
  mode: 'encrypt' | 'change_password' | 'remove';
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void;
}>();

const noteStore = useNoteStore();

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const isSubmitting = ref(false);
const errorMessage = ref('');

const oldPasswordInputRef = ref<HTMLInputElement | null>(null);
const newPasswordInputRef = ref<HTMLInputElement | null>(null);

const modalTitle = computed(() => {
  if (props.mode === 'encrypt') return t('editor.encryptModalTitle');
  if (props.mode === 'change_password') return t('editor.changePasswordModalTitle');
  return t('editor.removeEncryptionModalTitle');
});

const submitButtonText = computed(() => {
  if (props.mode === 'encrypt') return t('editor.encryptNote');
  if (props.mode === 'change_password') return t('editor.changePassword');
  return t('editor.removeEncryption');
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      oldPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      showOldPassword.value = false;
      showNewPassword.value = false;
      showConfirmPassword.value = false;
      errorMessage.value = '';
      isSubmitting.value = false;

      // If we already have the session password for this note in memory, pre-fill oldPassword
      if (props.targetNote && (props.mode === 'change_password' || props.mode === 'remove')) {
        const cachedPwd = noteStore.unlockedPasswords.get(props.targetNote.object_id);
        if (cachedPwd) {
          oldPassword.value = cachedPwd;
        }
      }

      nextTick(() => {
        if (props.mode === 'encrypt') {
          newPasswordInputRef.value?.focus();
        } else if (oldPassword.value) {
          newPasswordInputRef.value?.focus();
        } else {
          oldPasswordInputRef.value?.focus();
        }
      });
    }
  }
);

function close() {
  if (!isSubmitting.value) {
    emit('close');
  }
}

async function handleSubmit() {
  if (!props.targetNote) return;
  errorMessage.value = '';

  const noteId = props.targetNote.object_id;

  if (props.mode === 'encrypt') {
    if (!newPassword.value) {
      errorMessage.value = t('editor.passwordRequired');
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      errorMessage.value = t('editor.passwordsDoNotMatch');
      return;
    }

    isSubmitting.value = true;
    try {
      await noteStore.encryptCurrentNote(noteId, newPassword.value);
      showToast(t('editor.encryptSuccess'), 'success');
      emit('success');
      emit('close');
    } catch (e: any) {
      errorMessage.value = e?.message || t('editor.encryptFailed', { err: String(e) });
    } finally {
      isSubmitting.value = false;
    }
  } else if (props.mode === 'change_password') {
    if (!oldPassword.value) {
      errorMessage.value = t('editor.passwordRequired');
      return;
    }
    if (!newPassword.value) {
      errorMessage.value = t('editor.passwordRequired');
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      errorMessage.value = t('editor.passwordsDoNotMatch');
      return;
    }

    isSubmitting.value = true;
    try {
      await noteStore.changeCurrentNotePassword(noteId, oldPassword.value, newPassword.value);
      showToast(t('editor.changePasswordSuccess'), 'success');
      emit('success');
      emit('close');
    } catch (e: any) {
      errorMessage.value = e?.message || t('editor.changePasswordFailed', { err: String(e) });
    } finally {
      isSubmitting.value = false;
    }
  } else if (props.mode === 'remove') {
    if (!oldPassword.value) {
      errorMessage.value = t('editor.passwordRequired');
      return;
    }

    isSubmitting.value = true;
    try {
      await noteStore.removeCurrentNoteEncryption(noteId, oldPassword.value);
      showToast(t('editor.decryptSuccess'), 'success');
      emit('success');
      emit('close');
    } catch (e: any) {
      errorMessage.value = e?.message || t('editor.decryptFailed', { err: String(e) });
    } finally {
      isSubmitting.value = false;
    }
  }
}
</script>
