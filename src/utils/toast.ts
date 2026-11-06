import { ref } from 'vue';

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'error' | 'warning';
  message: string;
  duration?: number;
}

export const toasts = ref<ToastItem[]>([]);

export function showToast(
  message: string,
  type: 'success' | 'info' | 'error' | 'warning' = 'success',
  duration = 3000
): string {
  const id = Math.random().toString(36).substring(2, 9);
  toasts.value.push({ id, type, message, duration });

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

export function removeToast(id: string): void {
  const idx = toasts.value.findIndex(t => t.id === id);
  if (idx !== -1) {
    toasts.value.splice(idx, 1);
  }
}

export function clearToasts(): void {
  toasts.value = [];
}
