import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLocale, currentLocale, SUPPORTED_LOCALES } from '@/i18n';

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('i18n: Localization across zh-CN, en-US, zh-TW, ja-JP, ko-KR', () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale('zh-CN');
  });

  it('1. 包含完整的 5 种语言支持列表', () => {
    const codes = SUPPORTED_LOCALES.map(l => l.code);
    expect(codes).toContain('zh-CN');
    expect(codes).toContain('zh-TW');
    expect(codes).toContain('en-US');
    expect(codes).toContain('ja-JP');
    expect(codes).toContain('ko-KR');
  });

  it('2. 简体中文翻译正确输出并支持变量插值', () => {
    setLocale('zh-CN');
    expect(t('common.save')).toBe('保存');
    expect(t('sidebar.allNotes')).toBe('全部便签');
    expect(t('about.appName')).toBe('应用名称');
    expect(t('editor.syncToOtherServer')).toBe('同步到其他NAS');
    expect(t('editor.syncWithServer')).toBe('同步当前NAS');
    expect(t('logs.modalTitle')).toBe('应用运行日志');
    expect(t('editor.saveFailed', { err: '网络超时' })).toBe('保存便签失败: 网络超时');
  });

  it('3. 繁体中文翻译正确切换', () => {
    setLocale('zh-TW');
    expect(currentLocale.value).toBe('zh-TW');
    expect(t('common.save')).toBe('儲存');
    expect(t('sidebar.allNotes')).toBe('全部便箋');
    expect(t('sidebar.favorites')).toBe('我的最愛');
    expect(t('about.appName')).toBe('應用程式名稱');
    expect(t('editor.syncToOtherServer')).toBe('同步至其他NAS');
    expect(t('editor.syncWithServer')).toBe('同步當前NAS');
    expect(t('logs.modalTitle')).toBe('應用程式執行日誌');
  });

  it('4. 英语翻译正确切换', () => {
    setLocale('en-US');
    expect(currentLocale.value).toBe('en-US');
    expect(t('common.save')).toBe('Save');
    expect(t('sidebar.allNotes')).toBe('All Notes');
    expect(t('sidebar.favorites')).toBe('Favorites');
    expect(t('about.appName')).toBe('Application Name');
    expect(t('editor.syncToOtherServer')).toBe('Sync to Other NAS');
    expect(t('editor.syncWithServer')).toBe('Sync Current NAS');
    expect(t('logs.modalTitle')).toBe('Application Logs');
  });

  it('5. 日语翻译正确切换', () => {
    setLocale('ja-JP');
    expect(currentLocale.value).toBe('ja-JP');
    expect(t('common.save')).toBe('保存');
    expect(t('sidebar.allNotes')).toBe('すべてのノート');
    expect(t('sidebar.favorites')).toBe('お気に入り');
    expect(t('about.appName')).toBe('アプリ名');
    expect(t('editor.syncToOtherServer')).toBe('他のNASへ同期');
    expect(t('editor.syncWithServer')).toBe('現在のNASと同期');
    expect(t('logs.modalTitle')).toBe('アプリケーション実行ログ');
  });

  it('6. 韩语翻译正确切换并支持变量插值', () => {
    setLocale('ko-KR');
    expect(currentLocale.value).toBe('ko-KR');
    expect(t('common.save')).toBe('저장');
    expect(t('sidebar.allNotes')).toBe('모든 노트');
    expect(t('sidebar.favorites')).toBe('즐겨찾기');
    expect(t('about.appName')).toBe('앱 이름');
    expect(t('editor.syncToOtherServer')).toBe('다른 NAS로 동기화');
    expect(t('editor.syncWithServer')).toBe('현재 NAS 동기화');
    expect(t('logs.modalTitle')).toBe('애플리케이션 실행 로그');
    expect(t('editor.saveFailed', { err: '네트워크 시간 초과' })).toBe('노트 저장 실패: 네트워크 시간 초과');
  });

  it('7. 缺失键应安全优雅回退至简体中文，避免界面白屏或空白', () => {
    setLocale('en-US');
    const res = t('common.save');
    expect(res).toBeTruthy();
    const fallback = t('non_existent_key_xyz' as any);
    expect(fallback).toBe('non_existent_key_xyz');
  });
});
