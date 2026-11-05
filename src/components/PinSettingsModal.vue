<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
      <!-- Modal Header -->
      <div class="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center space-x-2 text-white">
          <svg class="w-4 h-4 text-syno-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span class="font-semibold text-sm">启动 PIN 码设置</span>
        </div>
        <button
          @click="$emit('close')"
          class="text-slate-400 hover:text-white transition-colors p-1 rounded"
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
          class="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600 flex items-center"
        >
          <svg class="w-4 h-4 mr-2 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Success notification -->
        <div
          v-if="successMessage"
          class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center"
        >
          <svg class="w-4 h-4 mr-2 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ successMessage }}</span>
        </div>

        <!-- CASE A: PIN NOT YET SET -->
        <div v-if="!isConfigured" class="space-y-4">
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div class="flex items-center text-xs font-semibold text-slate-700 mb-1">
              <svg class="w-3.5 h-3.5 text-syno-blue mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              为什么设置启动 PIN？
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              设置后，每次打开应用均需输入此 6 位纯数字 PIN 码。连续输错 5 次将锁定 30 分钟。PIN 码使用本机系统级加密保护，安全可靠。
            </p>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">
                输入 6 位数字 PIN 码
              </label>
              <input
                v-model="newPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                placeholder="6 位纯数字"
                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue font-mono tracking-widest text-center"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">
                再次确认 PIN 码
              </label>
              <input
                v-model="confirmPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                placeholder="再次输入 6 位数字"
                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue font-mono tracking-widest text-center"
              />
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-2">
            <button
              @click="$emit('close')"
              class="px-3.5 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              @click="handleSaveNewPin"
              :disabled="isSubmitting"
              class="px-4 py-1.5 bg-syno-blue hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {{ isSubmitting ? '保存中...' : '保存并启用' }}
            </button>
          </div>
        </div>

        <!-- CASE B: PIN ALREADY CONFIGURED -->
        <div v-else class="space-y-4">
          <!-- Active Status Card -->
          <div class="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-lg flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div class="text-xs font-semibold text-emerald-900">启动 PIN 保护已生效</div>
                <div class="text-[11px] text-emerald-700">进入应用时已受 6 位 PIN 码保护</div>
              </div>
            </div>

            <!-- Quick Lock Button -->
            <button
              @click="handleLockNow"
              class="px-2.5 py-1 rounded bg-white hover:bg-emerald-100/60 text-emerald-800 border border-emerald-300 text-xs font-medium flex items-center transition-colors shadow-sm"
              title="立即测试锁定应用"
            >
              <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              立即锁定
            </button>
          </div>

          <!-- Actions: Modify or Disable -->
          <div class="flex border-b border-slate-200 text-xs">
            <button
              @click="activeTab = 'modify'"
              :class="[
                'py-2 px-3 border-b-2 font-medium transition-colors',
                activeTab === 'modify'
                  ? 'border-syno-blue text-syno-blue font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              ]"
            >
              修改 PIN 码
            </button>
            <button
              @click="activeTab = 'disable'"
              :class="[
                'py-2 px-3 border-b-2 font-medium transition-colors',
                activeTab === 'disable'
                  ? 'border-rose-500 text-rose-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              ]"
            >
              停用 PIN 保护
            </button>
          </div>

          <!-- Tab 1: Modify PIN -->
          <div v-if="activeTab === 'modify'" class="space-y-3 pt-1">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">
                当前 PIN 码
              </label>
              <input
                v-model="currentPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                placeholder="输入原 6 位 PIN"
                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue font-mono tracking-widest text-center"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">
                新 PIN 码
              </label>
              <input
                v-model="newPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                placeholder="6 位新纯数字"
                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue font-mono tracking-widest text-center"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">
                确认新 PIN 码
              </label>
              <input
                v-model="confirmPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                placeholder="再次输入 6 位新纯数字"
                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-syno-blue/30 focus:border-syno-blue font-mono tracking-widest text-center"
              />
            </div>

            <div class="flex justify-end space-x-2 pt-2">
              <button
                @click="$emit('close')"
                class="px-3.5 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                @click="handleChangePin"
                :disabled="isSubmitting"
                class="px-4 py-1.5 bg-syno-blue hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {{ isSubmitting ? '修改中...' : '确认修改' }}
              </button>
            </div>
          </div>

          <!-- Tab 2: Disable PIN -->
          <div v-else-if="activeTab === 'disable'" class="space-y-3 pt-1">
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
              停用启动保护后，任何打开此应用的人无需输入 PIN 码即可直接查看便签内容。
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">
                输入当前 PIN 码进行验证
              </label>
              <input
                v-model="currentPin"
                type="password"
                inputmode="numeric"
                maxlength="6"
                placeholder="输入当前 6 位 PIN 码"
                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-500 font-mono tracking-widest text-center"
              />
            </div>

            <div class="flex justify-end space-x-2 pt-2">
              <button
                @click="$emit('close')"
                class="px-3.5 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                @click="handleRemovePin"
                :disabled="isSubmitting"
                class="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {{ isSubmitting ? '正在停用...' : '停用 PIN 保护' }}
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
    errorMessage.value = '请输入 6 位纯数字 PIN 码';
    return;
  }
  if (newPin.value !== confirmPin.value) {
    errorMessage.value = '两次输入的 PIN 码不一致';
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await PinManager.setPin(newPin.value);
    if (res.success) {
      successMessage.value = '启动 PIN 码已成功设置！';
      emit('pin-updated');
      setTimeout(() => {
        emit('close');
      }, 700);
    } else {
      errorMessage.value = res.error || '保存 PIN 码失败';
    }
  } catch (err: any) {
    errorMessage.value = err?.message || '设置 PIN 码异常';
  } finally {
    isSubmitting.value = false;
  }
}

async function handleChangePin() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!/^\d{6}$/.test(currentPin.value)) {
    errorMessage.value = '请输入 6 位当前 PIN 码';
    return;
  }
  if (!/^\d{6}$/.test(newPin.value)) {
    errorMessage.value = '新 PIN 码必须为 6 位纯数字';
    return;
  }
  if (newPin.value !== confirmPin.value) {
    errorMessage.value = '两次输入的新 PIN 码不一致';
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await PinManager.changePin(currentPin.value, newPin.value);
    if (res.success) {
      successMessage.value = 'PIN 码修改成功！';
      emit('pin-updated');
      setTimeout(() => {
        emit('close');
      }, 700);
    } else {
      errorMessage.value = res.error || '修改失败，请重试';
      if (res.isLocked) {
        emit('lock-now');
        emit('close');
      }
    }
  } catch (err: any) {
    errorMessage.value = err?.message || '修改 PIN 码异常';
  } finally {
    isSubmitting.value = false;
  }
}

async function handleRemovePin() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!/^\d{6}$/.test(currentPin.value)) {
    errorMessage.value = '请输入 6 位当前 PIN 码';
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await PinManager.removePin(currentPin.value);
    if (res.success) {
      successMessage.value = '已成功停用启动 PIN 保护！';
      emit('pin-updated');
      setTimeout(() => {
        emit('close');
      }, 700);
    } else {
      errorMessage.value = res.error || '停用失败，请检查 PIN 码';
      if (res.isLocked) {
        emit('lock-now');
        emit('close');
      }
    }
  } catch (err: any) {
    errorMessage.value = err?.message || '停用 PIN 码异常';
  } finally {
    isSubmitting.value = false;
  }
}

function handleLockNow() {
  emit('lock-now');
  emit('close');
}
</script>

