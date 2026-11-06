import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toasts, showToast, removeToast, clearToasts } from '@/utils/toast';

describe('Toast 通知系统测试', () => {
  beforeEach(() => {
    clearToasts();
    vi.useRealTimers();
  });

  it('1. showToast 能成功添加通知项并返回唯一 id', () => {
    const id = showToast('便签导出成功', 'success', 0);
    expect(toasts.value.length).toBe(1);
    expect(toasts.value[0].id).toBe(id);
    expect(toasts.value[0].message).toBe('便签导出成功');
    expect(toasts.value[0].type).toBe('success');
  });

  it('2. removeToast 能精准移除指定 id 的通知', () => {
    const id1 = showToast('消息1', 'info', 0);
    const id2 = showToast('消息2', 'error', 0);
    expect(toasts.value.length).toBe(2);

    removeToast(id1);
    expect(toasts.value.length).toBe(1);
    expect(toasts.value[0].id).toBe(id2);
  });

  it('3. 设置 duration 时能在定时到达后自动销毁通知', () => {
    vi.useFakeTimers();

    showToast('自动消失的提示', 'success', 2000);
    expect(toasts.value.length).toBe(1);

    vi.advanceTimersByTime(1999);
    expect(toasts.value.length).toBe(1);

    vi.advanceTimersByTime(2);
    expect(toasts.value.length).toBe(0);

    vi.useRealTimers();
  });
});
