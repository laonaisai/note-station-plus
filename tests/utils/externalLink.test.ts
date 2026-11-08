import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isSafeExternalUrl, openInExternalBrowser } from '@/utils/openUrl';
import { isLinkModalOpen, pendingLinkUrl, openExternalLinkPrompt, closeExternalLinkPrompt } from '@/utils/externalLinkModal';

describe('External Link Handler & Modal Utilities', () => {
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    closeExternalLinkPrompt();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  describe('isSafeExternalUrl 协议安全校验', () => {
    it('应正确放行安全的外部协议 (http, https, mailto)', () => {
      expect(isSafeExternalUrl('https://github.com')).toBe(true);
      expect(isSafeExternalUrl('http://example.com/test?query=1')).toBe(true);
      expect(isSafeExternalUrl('mailto:test@example.com')).toBe(true);
      expect(isSafeExternalUrl('  https://synology.com  ')).toBe(true);
    });

    it('应严格拦截不安全或非外部跳转的协议 (javascript, data, file, 锚点, 相对路径)', () => {
      expect(isSafeExternalUrl('')).toBe(false);
      expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeExternalUrl('data:text/html,<h1>bad</h1>')).toBe(false);
      expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false);
      expect(isSafeExternalUrl('#heading-1')).toBe(false);
      expect(isSafeExternalUrl('/relative/path')).toBe(false);
    });
  });

  describe('externalLinkModal 对话框状态管理', () => {
    it('openExternalLinkPrompt 应打开弹窗并保存待确认的 URL', () => {
      expect(isLinkModalOpen.value).toBe(false);
      expect(pendingLinkUrl.value).toBe('');

      openExternalLinkPrompt('https://github.com/laonaisai');

      expect(isLinkModalOpen.value).toBe(true);
      expect(pendingLinkUrl.value).toBe('https://github.com/laonaisai');
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
          if (linkHref.startsWith('http://') || linkHref.startsWith('https://') || linkHref.startsWith('mailto:')) {
            mockEvent.preventDefault();
            mockEvent.stopPropagation();
            openExternalLinkPrompt(linkHref);
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
