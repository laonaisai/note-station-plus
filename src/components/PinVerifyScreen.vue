<template>
  <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-slate-100 select-none px-4">
    <!-- App Logo & Branding -->
    <div class="flex flex-col items-center mb-6">
      <img
        src="/logo.png"
        alt="Note Station Plus"
        class="w-16 h-16 shadow-2xl shadow-blue-950/60 mb-3 object-contain drop-shadow"
      />
      <h1 class="text-xl font-bold tracking-tight text-white">Note Station Plus</h1>
      <p class="text-xs text-slate-400 mt-1">
        {{ isLocked ? '应用已被安全锁定' : '请输入 6 位启动 PIN 码解锁' }}
      </p>
    </div>

    <!-- Lockout Countdown Banner (Shown when locked) -->
    <div
      v-if="isLocked"
      class="w-full max-w-sm mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 flex flex-col items-center text-center shadow-lg"
    >
      <div class="w-10 h-10 rounded-full bg-rose-900/60 text-rose-400 flex items-center justify-center mb-2">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div class="text-sm font-semibold text-rose-200">连续输错 5 次 PIN 码</div>
      <div class="text-xs text-rose-300/80 mt-1">系统已启动安全防爆破锁定 30 分钟</div>
      <div class="text-2xl font-mono font-bold text-rose-400 mt-3 tracking-wider">
        {{ formattedCountdown }}
      </div>
      <div class="text-[11px] text-slate-400 mt-2">
        倒计时结束后将自动恢复输入权限
      </div>
    </div>

    <!-- PIN Visual Indicator Dots -->
    <div
      v-else
      class="flex items-center space-x-3.5 mb-4 py-2"
      :class="{ 'animate-pin-shake': isShaking }"
    >
      <div
        v-for="idx in 6"
        :key="idx"
        :class="[
          'w-4 h-4 rounded-full transition-all duration-200 border-2 flex items-center justify-center',
          pinInput.length >= idx
            ? isError
              ? 'border-rose-500 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)] scale-110'
              : isSuccess
              ? 'border-emerald-500 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)] scale-110'
              : 'border-syno-blue bg-syno-blue shadow-[0_0_12px_rgba(0,134,214,0.6)] scale-110'
            : 'border-slate-700 bg-slate-800/80'
        ]"
      ></div>
    </div>

    <!-- Error / Helper text -->
    <div v-if="!isLocked" class="h-6 mb-6 flex items-center justify-center text-center">
      <span v-if="errorMessage" class="text-xs text-rose-400 font-medium">
        {{ errorMessage }}
      </span>
      <span v-else-if="isVerifying" class="text-xs text-slate-400 flex items-center">
        <svg class="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-syno-blue" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        正在验证...
      </span>
      <span v-else class="text-xs text-slate-500">
        支持直接键盘键入或点击数字键盘
      </span>
    </div>

    <!-- Virtual Numpad (3x4 Grid) -->
    <div
      class="grid grid-cols-3 gap-3 w-64 max-w-full"
      :class="{ 'opacity-30 pointer-events-none': isLocked || isVerifying }"
    >
      <button
        v-for="n in 9"
        :key="n"
        @click="appendDigit(n.toString())"
        class="h-14 rounded-2xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-slate-600/80 text-xl font-medium text-slate-100 flex items-center justify-center border border-slate-700/60 shadow-sm transition-all focus:outline-none"
      >
        {{ n }}
      </button>

      <!-- Clear Button -->
      <button
        @click="clearInput"
        class="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-700/60 active:bg-slate-600/60 text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center justify-center border border-slate-700/40 transition-all focus:outline-none"
      >
        清空
      </button>

      <!-- Zero Button -->
      <button
        @click="appendDigit('0')"
        class="h-14 rounded-2xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-slate-600/80 text-xl font-medium text-slate-100 flex items-center justify-center border border-slate-700/60 shadow-sm transition-all focus:outline-none"
      >
        0
      </button>

      <!-- Backspace Button -->
      <button
        @click="deleteDigit"
        class="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-700/60 active:bg-slate-600/60 text-slate-400 hover:text-slate-200 flex items-center justify-center border border-slate-700/40 transition-all focus:outline-none"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-7.172a2 2 0 01-1.414-.586L3 12z" />
        </svg>
      </button>
    </div>

    <!-- Bottom Actions: Reset App Escape Hatch -->
    <div class="mt-8">
      <button
        @click="handleForgotPin"
        class="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 transition-colors"
      >
        忘记 PIN 码？
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { PinManager } from '@/services/pinManager';

const emit = defineEmits(['unlocked']);

const pinInput = ref('');
const isVerifying = ref(false);
const isShaking = ref(false);
const isError = ref(false);
const isSuccess = ref(false);
const errorMessage = ref('');

const isLocked = ref(false);
const remainingSeconds = ref(0);
let countdownInterval: any = null;

const formattedCountdown = computed(() => {
  const m = Math.floor(remainingSeconds.value / 60);
  const s = remainingSeconds.value % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

async function checkStatus() {
  const status = await PinManager.getStatus();
  isLocked.value = status.isLocked;
  remainingSeconds.value = status.remainingSeconds;

  if (status.isLocked) {
    startCountdown();
  } else {
    stopCountdown();
  }
}

function startCountdown() {
  stopCountdown();
  countdownInterval = setInterval(async () => {
    if (remainingSeconds.value > 1) {
      remainingSeconds.value -= 1;
    } else {
      // Countdown finished! Check and unlock
      stopCountdown();
      await checkStatus();
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function appendDigit(digit: string) {
  if (isLocked.value || isVerifying.value || isSuccess.value) return;
  if (pinInput.value.length < 6) {
    pinInput.value += digit;
    errorMessage.value = '';
    isError.value = false;

    if (pinInput.value.length === 6) {
      triggerVerify();
    }
  }
}

function deleteDigit() {
  if (isLocked.value || isVerifying.value || isSuccess.value) return;
  if (pinInput.value.length > 0) {
    pinInput.value = pinInput.value.slice(0, -1);
    errorMessage.value = '';
    isError.value = false;
  }
}

function clearInput() {
  if (isLocked.value || isVerifying.value || isSuccess.value) return;
  pinInput.value = '';
  errorMessage.value = '';
  isError.value = false;
}

async function triggerVerify() {
  if (pinInput.value.length !== 6 || isVerifying.value) return;

  isVerifying.value = true;
  const currentPin = pinInput.value;

  try {
    const res = await PinManager.verifyPin(currentPin);
    if (res.success) {
      isSuccess.value = true;
      isError.value = false;
      setTimeout(() => {
        emit('unlocked');
      }, 180);
    } else {
      isError.value = true;
      isShaking.value = true;

      if (res.isLocked) {
        isLocked.value = true;
        remainingSeconds.value = res.remainingSeconds || 1800;
        startCountdown();
        pinInput.value = '';
      } else {
        errorMessage.value = res.error || `PIN 码错误，还剩 ${res.remainingAttempts} 次机会`;
        setTimeout(() => {
          isShaking.value = false;
          pinInput.value = '';
        }, 400);
      }
    }
  } catch (err: any) {
    errorMessage.value = err?.message || '验证失败，请重试';
    pinInput.value = '';
  } finally {
    isVerifying.value = false;
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (isLocked.value || isVerifying.value || isSuccess.value) return;

  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault();
    appendDigit(e.key);
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    deleteDigit();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    clearInput();
  } else if (e.key === 'Enter' && pinInput.value.length === 6) {
    e.preventDefault();
    triggerVerify();
  }
}

function handleForgotPin() {
  const confirmed = confirm(
    '【重置应用提示】\n\n忘记 PIN 码可通过重置应用解除。此操作将清空本地保存的所有服务器配置和缓存，重置后需重新连接 NAS 服务。\n\n您的群晖 NAS 服务端便签数据不受任何影响。\n\n确定要重置应用吗？'
  );
  if (confirmed) {
    localStorage.clear();
    window.location.reload();
  }
}

onMounted(async () => {
  await checkStatus();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  stopCountdown();
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

