import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isSafeExternalUrl, normalizeExternalUrl, openInExternalBrowser } from '@/utils/openUrl';
import {
  isLinkModalOpen,
  pendingLinkUrl,
  openExternalLinkPrompt,
  closeExternalLinkPrompt,
  onExternalLinkPrompt
} from '@/utils/externalLinkModal';

describe('External Link Handler & Modal Utilities', () => {
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    closeExternalLinkPrompt();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  describe('normalizeExternalUrl 协议安全校验与链接规范化', () => {
    it('应正确放行并保留标准的外部协议 (http, https, mailto)', () => {
      expect(normalizeExternalUrl('https://github.com')).toBe('https://github.com');
      expect(normalizeExternalUrl('http://example.com/test?query=1')).toBe('http://example.com/test?query=1');
      expect(normalizeExternalUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
      expect(normalizeExternalUrl('  https://synology.com  ')).toBe('https://synology.com');
    });

    it('应将纯域名与协议相对地址自动规范化为 https 外部链接', () => {
      expect(normalizeExternalUrl('www.baidu.com')).toBe('https://www.baidu.com');
      expect(normalizeExternalUrl('//github.com/laonaisai')).toBe('https://github.com/laonaisai');
      expect(normalizeExternalUrl('api.synology.com/query')).toBe('https://api.synology.com/query');
    });

    it('应严格拦截不安全或非外部跳转的协议 (javascript, data, vbscript, 锚点, 相对路径)', () => {
      expect(normalizeExternalUrl('')).toBeNull();
      expect(normalizeExternalUrl(null)).toBeNull();
      expect(normalizeExternalUrl('javascript:alert(1)')).toBeNull();
      expect(normalizeExternalUrl('data:text/html,<h1>bad</h1>')).toBeNull();
      expect(normalizeExternalUrl('vbscript:msgbox(1)')).toBeNull();
      expect(normalizeExternalUrl('#heading-1')).toBeNull();
      expect(normalizeExternalUrl('/local/path/index.html')).toBeNull();
    });

    it('isSafeExternalUrl 应与 normalizeExternalUrl 判定一致', () => {
      expect(isSafeExternalUrl('https://google.com')).toBe(true);
      expect(isSafeExternalUrl('www.google.com')).toBe(true);
      expect(isSafeExternalUrl('javascript:void(0)')).toBe(false);
    });
  });

  describe('externalLinkModal 对话框状态管理与事件广播', () => {
    it('openExternalLinkPrompt 应打开弹窗并保存待确认的 URL', () => {
      expect(isLinkModalOpen.value).toBe(false);
      expect(pendingLinkUrl.value).toBe('');

      openExternalLinkPrompt('https://github.com/laonaisai');

      expect(isLinkModalOpen.value).toBe(true);
      expect(pendingLinkUrl.value).toBe('https://github.com/laonaisai');
    });

    it('openExternalLinkPrompt 应能成功通知通过 onExternalLinkPrompt 注册的监听器', () => {
      const listenerSpy = vi.fn();
      const unsubscribe = onExternalLinkPrompt(listenerSpy);

      openExternalLinkPrompt('www.synology.com');

      expect(listenerSpy).toHaveBeenCalledWith('https://www.synology.com');

      unsubscribe();
      openExternalLinkPrompt('https://other.com');
      expect(listenerSpy).toHaveBeenCalledTimes(1);
    });

    it('closeExternalLinkPrompt 应关闭弹窗并清空待确认 URL', () => {
      openExternalLinkPrompt('https://example.com');
      expect(isLinkModalOpen.value).toBe(true);

      closeExternalLinkPrompt();
      expect(isLinkModalOpen.value).toBe(false);
      expect(pendingLinkUrl.value).toBe('');
    });

    it('传入空字符串或无效 URL 时不应打开弹窗', () => {
      openExternalLinkPrompt('');
      expect(isLinkModalOpen.value).toBe(false);

      openExternalLinkPrompt('   ');
      expect(isLinkModalOpen.value).toBe(false);
    });
  });

  describe('openInExternalBrowser 外部浏览器拉起', () => {
    it('若存在 window.electronAPI.openExternal 应优先调用', async () => {
      const openExternalMock = vi.fn().mockResolvedValue({ success: true });
      (globalThis as any).window = {
        electronAPI: {
          openExternal: openExternalMock
        }
      };

      const result = await openInExternalBrowser('https://www.synology.com');
      expect(result).toBe(true);
      expect(openExternalMock).toHaveBeenCalledWith('https://www.synology.com');
    });

    it('在普通浏览器模式下应 fallback 至 window.open', async () => {
      const openMock = vi.fn().mockReturnValue({});
      (globalThis as any).window = {
        open: openMock
      };

      const result = await openInExternalBrowser('https://example.org');
      expect(result).toBe(true);
      expect(openMock).toHaveBeenCalledWith('https://example.org', '_blank', 'noopener,noreferrer');
    });

    it('非法协议链接应被直接拦截，不执行任何跳转', async () => {
      const openMock = vi.fn();
      (globalThis as any).window = {
        open: openMock
      };

      const result = await openInExternalBrowser('javascript:void(0)');
      expect(result).toBe(false);
      expect(openMock).not.toHaveBeenCalled();
    });
  });

  describe('便签内容链接点击拦截行为验证', () => {
    function simulatePreviewLinkClick(href: string, isDownload = false) {
      let isDefaultPrevented = false;
      let isPropagationStopped = false;

      const mockAnchor = {
        getAttribute: (attr: string) => (attr === 'href' ? href : null),
        hasAttribute: (attr: string) => (attr === 'download' ? isDownload : false),
        closest: (sel: string) => (sel === 'a' ? mockAnchor : null)
      };

      const mockEvent = {
        target: mockAnchor,
        preventDefault: () => { isDefaultPrevented = true; },
        stopPropagation: () => { isPropagationStopped = true; }
      };

      // 模拟 MarkdownPreview 的 handlePreviewClick 逻辑
      const anchor = mockEvent.target.closest('a');
      if (anchor) {
        const linkHref = anchor.getAttribute('href');
        if (linkHref && !linkHref.startsWith('#') && !anchor.hasAttribute('download')) {
          const externalUrl = normalizeExternalUrl(linkHref);
          if (externalUrl) {
            mockEvent.preventDefault();
            mockEvent.stopPropagation();
            openExternalLinkPrompt(externalUrl);
          }
        }
      }

      return { isDefaultPrevented, isPropagationStopped };
    }

    it('点击便签中的 HTTP/HTTPS 外部链接时应阻止默认行为并弹出确认对话框', () => {
      const { isDefaultPrevented, isPropagationStopped } = simulatePreviewLinkClick('https://www.google.com');
      expect(isDefaultPrevented).toBe(true);
      expect(isPropagationStopped).toBe(true);
      expect(isLinkModalOpen.value).toBe(true);
      expect(pendingLinkUrl.value).toBe('https://www.google.com');
    });

    it('点击便签中的纯域名 (www.xxx.com) 链接时也应正确识别并弹出确认对话框', () => {
      const { isDefaultPrevented, isPropagationStopped } = simulatePreviewLinkClick('www.synology.cn');
      expect(isDefaultPrevented).toBe(true);
      expect(isPropagationStopped).toBe(true);
      expect(isLinkModalOpen.value).toBe(true);
      expect(pendingLinkUrl.value).toBe('https://www.synology.cn');
    });

    it('点击附件下载链接时不应弹出外部链接对话框', () => {
      const { isDefaultPrevented } = simulatePreviewLinkClick('https://nas.local/download/file.zip', true);
      expect(isDefaultPrevented).toBe(false);
      expect(isLinkModalOpen.value).toBe(false);
    });

    it('点击页内锚点 (#) 时不应弹出外部链接对话框', () => {
      const { isDefaultPrevented } = simulatePreviewLinkClick('#chapter-1');
      expect(isDefaultPrevented).toBe(false);
      expect(isLinkModalOpen.value).toBe(false);
    });
  });
});
