<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
      <!-- Modal Header -->
      <div class="px-5 py-3.5 bg-slate-900 dark:bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center space-x-2 text-white">
          <svg class="w-4 h-4 text-syno-blue dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span class="font-semibold text-sm">{{ t('pin.settingsTitle') }}</span>
        </div>
        <button
          @click="$emit('close')"
          class="text-slate-400 hover:text-white transition-colors p-1 rounded cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 space-y-4">
        <!-- Error notification -->
        <div
          v-if="errorMessage"
          class="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-xs text-rose-600 dark:text-rose-300 flex items-center"
        >
          <svg class="w-4 h-4 mr-2 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Success notification -->
        <div
          v-if="successMessage"
          class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center"
        >
          <svg class="w-4 h-4 mr-2 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ successMessage }}</span>
        </div>

        <!-- CASE A: PIN NOT YET SET -->
        <div v-if="!isConfigured" class="space-y-4">
          <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg">
            <div class="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              <svg class="w-3.5 h-3.5 text-syno-blue dark:text-sky-400 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ t('pin.whyPinTitle') }}
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {{ t('pin.whyPinDesc') }}
            </p>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {{ t('pin.inputNewPin') }}
              </label>
              <input
                v-model="newPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                :placeholder="t('pin.pinInputPlaceholder')"
                class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue font-mono tracking-widest text-center placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {{ t('pin.confirmNewPin') }}
              </label>
              <input
                v-model="confirmPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                :placeholder="t('pin.confirmPinPlaceholder')"
                class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue font-mono tracking-widest text-center placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-2">
            <button
              @click="$emit('close')"
              class="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              @click="handleSaveNewPin"
              :disabled="isSubmitting"
              class="px-4 py-1.5 bg-syno-blue hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {{ isSubmitting ? t('common.saving') : t('pin.saveAndEnable') }}
            </button>
          </div>
        </div>

        <!-- CASE B: PIN ALREADY CONFIGURED -->
        <div v-else class="space-y-4">
          <!-- Active Status Card -->
          <div class="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 rounded-lg flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div class="text-xs font-semibold text-emerald-900 dark:text-emerald-200">{{ t('pin.pinActiveTitle') }}</div>
                <div class="text-[11px] text-emerald-700 dark:text-emerald-400">{{ t('pin.pinActiveDesc') }}</div>
              </div>
            </div>

            <!-- Quick Lock Button -->
            <button
              @click="handleLockNow"
              class="px-2.5 py-1 rounded bg-white dark:bg-emerald-900/50 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-medium flex items-center transition-colors shadow-sm cursor-pointer"
              :title="t('tabBar.lockNow')"
            >
              <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              {{ t('pin.lockNow') }}
            </button>
          </div>

          <!-- Actions: Modify or Disable -->
          <div class="flex border-b border-slate-200 dark:border-slate-800 text-xs">
            <button
              @click="activeTab = 'modify'"
              :class="[
                'py-2 px-3 border-b-2 font-medium transition-colors cursor-pointer',
                activeTab === 'modify'
                  ? 'border-syno-blue text-syno-blue dark:text-sky-400 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              ]"
            >
              {{ t('pin.modifyPin') }}
            </button>
            <button
              @click="activeTab = 'disable'"
              :class="[
                'py-2 px-3 border-b-2 font-medium transition-colors cursor-pointer',
                activeTab === 'disable'
                  ? 'border-rose-500 text-rose-600 dark:text-rose-400 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              ]"
            >
              {{ t('pin.disablePin') }}
            </button>
          </div>

          <!-- Tab 1: Modify PIN -->
          <div v-if="activeTab === 'modify'" class="space-y-3 pt-1">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {{ t('pin.currentPin') }}
              </label>
              <input
                v-model="currentPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                :placeholder="t('pin.enterCurrentPin')"
                class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue font-mono tracking-widest text-center placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {{ t('pin.newPin') }}
              </label>
              <input
                v-model="newPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                :placeholder="t('pin.pinInputPlaceholder')"
                class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue font-mono tracking-widest text-center placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {{ t('pin.confirmNewPinLabel') }}
              </label>
              <input
                v-model="confirmPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                :placeholder="t('pin.confirmPinPlaceholder')"
                class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue font-mono tracking-widest text-center placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div class="flex justify-end space-x-2 pt-2">
              <button
                @click="$emit('close')"
                class="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                @click="handleChangePin"
                :disabled="isSubmitting"
                class="px-4 py-1.5 bg-syno-blue hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {{ isSubmitting ? t('common.saving') : t('common.confirm') }}
              </button>
            </div>
          </div>

          <!-- Tab 2: Disable PIN -->
          <div v-else-if="activeTab === 'disable'" class="space-y-3 pt-1">
            <div class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {{ t('pin.disableWarning') }}
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {{ t('pin.enterCurrentPin') }}
              </label>
              <input
                v-model="currentPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                :placeholder="t('pin.pinInputPlaceholder')"
                class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-500 font-mono tracking-widest text-center placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div class="flex justify-end space-x-2 pt-2">
              <button
                @click="$emit('close')"
                class="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                @click="handleRemovePin"
                :disabled="isSubmitting"
                class="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {{ isSubmitting ? t('editor.deleting') : t('pin.disablePin') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { PinManager } from '@/services/pinManager';
import { t } from '@/i18n';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits(['close', 'pin-updated', 'lock-now']);

const isConfigured = ref(false);
const activeTab = ref<'modify' | 'disable'>('modify');

const currentPin = ref('');
const newPin = ref('');
const confirmPin = ref('');

const errorMessage = ref('');
const successMessage = ref('');
const isSubmitting = ref(false);

async function refreshConfiguredState() {
  isConfigured.value = PinManager.isPinConfigured();
  currentPin.value = '';
  newPin.value = '';
  confirmPin.value = '';
  errorMessage.value = '';
  successMessage.value = '';
  activeTab.value = 'modify';
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      refreshConfiguredState();
    }
  }
);

async function handleSaveNewPin() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!/^\d{6}$/.test(newPin.value)) {
    errorMessage.value = t('pin.inputNewPin');
    return;
  }
  if (newPin.value !== confirmPin.value) {
    errorMessage.value = t('pin.pinMismatch');
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await PinManager.setPin(newPin.value);
    if (res.success) {
      successMessage.value = t('pin.pinSuccess');
      emit('pin-updated');
      setTimeout(() => {
        emit('close');
      }, 700);
    } else {
      errorMessage.value = res.error || t('common.error');
    }
  } catch (err: any) {
    errorMessage.value = err?.message || t('common.error');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleChangePin() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!/^\d{6}$/.test(currentPin.value)) {
    errorMessage.value = t('pin.enterCurrentPin');
    return;
  }
  if (!/^\d{6}$/.test(newPin.value)) {
    errorMessage.value = t('pin.inputNewPin');
    return;
  }
  if (newPin.value !== confirmPin.value) {
    errorMessage.value = t('pin.pinMismatch');
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await PinManager.changePin(currentPin.value, newPin.value);
    if (res.success) {
      successMessage.value = t('pin.pinSuccess');
      emit('pin-updated');
      setTimeout(() => {
        emit('close');
      }, 700);
    } else {
      errorMessage.value = res.error || t('pin.pinError');
      if (res.isLocked) {
        emit('lock-now');
        emit('close');
      }
    }
  } catch (err: any) {
    errorMessage.value = err?.message || t('common.error');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleRemovePin() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!/^\d{6}$/.test(currentPin.value)) {
    errorMessage.value = t('pin.enterCurrentPin');
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await PinManager.removePin(currentPin.value);
    if (res.success) {
      successMessage.value = t('pin.pinRemoved');
      emit('pin-updated');
      setTimeout(() => {
        emit('close');
      }, 700);
    } else {
      errorMessage.value = res.error || t('pin.pinError');
      if (res.isLocked) {
        emit('lock-now');
        emit('close');
      }
    }
  } catch (err: any) {
    errorMessage.value = err?.message || t('common.error');
  } finally {
    isSubmitting.value = false;
  }
}

function handleLockNow() {
  emit('lock-now');
  emit('close');
}
</script>
