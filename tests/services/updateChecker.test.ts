import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  cleanVersion,
  compareVersions,
  classifyAsset,
  matchAssetForPlatform,
  formatBytes,
  generateDefaultAssets,
  checkForUpdates,
  GITHUB_LATEST_API_URL,
  GITHUB_ATOM_FEED_URL
} from '@/services/updateChecker';

describe('updateChecker 版本检测服务', () => {
  describe('cleanVersion 格式清理', () => {
    it('去除 v/V 前缀和首尾空格', () => {
      expect(cleanVersion('v1.2.3')).toBe('1.2.3');
      expect(cleanVersion('V20261108.23.21')).toBe('20261108.23.21');
      expect(cleanVersion('  v0.1.0  ')).toBe('0.1.0');
      expect(cleanVersion('1.0.0')).toBe('1.0.0');
    });

    it('对空值、undefined 和 null 容错返回 0.0.0', () => {
      expect(cleanVersion('')).toBe('0.0.0');
      expect(cleanVersion(null)).toBe('0.0.0');
      expect(cleanVersion(undefined)).toBe('0.0.0');
    });
  });

  describe('formatBytes 字节大小转换', () => {
    it('正确转换不同量级的字节为可读文本', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1024 * 1024 * 81)).toBe('81.0 MB');
      expect(formatBytes(0)).toBe('');
    });
  });

  describe('classifyAsset 安装包分类与平台推断', () => {
    it('Windows Setup 安装程序与便携版', () => {
      const setup = classifyAsset('Note.Station.Plus.Setup.20261108.23.21.exe', 'http://example.com/setup.exe');
      expect(setup.platform).toBe('windows');
      expect(setup.kind).toBe('installer');

      const portable = classifyAsset('Note.Station.Plus.20261108.23.21.exe', 'http://example.com/portable.exe');
      expect(portable.platform).toBe('windows');
      expect(portable.kind).toBe('portable');
    });

    it('Linux AppImage 与 deb 安装包', () => {
      const appImage = classifyAsset('Note.Station.Plus-20261108.23.21.AppImage', 'http://example.com/app.AppImage');
      expect(appImage.platform).toBe('linux');
      expect(appImage.kind).toBe('appimage');

      const deb = classifyAsset('note-station-plus_20261108.23.21_amd64.deb', 'http://example.com/app.deb');
      expect(deb.platform).toBe('linux');
      expect(deb.kind).toBe('deb');
    });
  });

  describe('matchAssetForPlatform 平台精准匹配', () => {
    const assets = [
      classifyAsset('Note.Station.Plus.Setup.20261108.23.21.exe', 'http://example.com/setup.exe'),
      classifyAsset('Note.Station.Plus.20261108.23.21.exe', 'http://example.com/portable.exe'),
      classifyAsset('Note.Station.Plus-20261108.23.21.AppImage', 'http://example.com/app.AppImage'),
      classifyAsset('note-station-plus_20261108.23.21_amd64.deb', 'http://example.com/app.deb')
    ];

    it('Windows 平台优先匹配 Setup 安装包', () => {
      const matched = matchAssetForPlatform(assets, 'windows');
      expect(matched?.name).toBe('Note.Station.Plus.Setup.20261108.23.21.exe');
    });

    it('Linux 平台优先匹配通用 AppImage', () => {
      const matched = matchAssetForPlatform(assets, 'linux');
      expect(matched?.name).toBe('Note.Station.Plus-20261108.23.21.AppImage');
    });

    it('Linux 仅有 deb 时能够匹配 deb', () => {
      const debOnly = [classifyAsset('note-station-plus_amd64.deb', 'http://example.com/app.deb')];
      const matched = matchAssetForPlatform(debOnly, 'linux');
      expect(matched?.name).toBe('note-station-plus_amd64.deb');
    });
  });

  describe('compareVersions 版本号比较', () => {
    it('标准 Semver 版本比较', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
      expect(compareVersions('v1.2.0', '1.2.0')).toBe(0);
    });

    it('时间戳版本号比较 (yyyyMMdd.HH.mm)', () => {
      expect(compareVersions('20261108.10.00', '20261108.18.30')).toBe(-1);
      expect(compareVersions('20261109.09.00', '20261108.23.59')).toBe(1);
      expect(compareVersions('v20261108.23.21', '20261108.23.21')).toBe(0);
    });

    it('测试版本 0.1.0 与时间戳版本混合比较', () => {
      // 0.1.0 远小于时间戳版本（如 20261108.23.21），因此应判断为有新版本
      expect(compareVersions('0.1.0', '20261108.23.21')).toBe(-1);
      expect(compareVersions('20261108.23.21', '0.1.0')).toBe(1);
    });

    it('不同段长度版本号比较', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.1', '1.0')).toBe(1);
      expect(compareVersions('1.0', '1.0.1')).toBe(-1);
    });
  });

  describe('generateDefaultAssets 生成默认四端产物', () => {
    it('正确生成包含 Windows exe 与 Linux AppImage/deb 的安装包列表', () => {
      const assets = generateDefaultAssets('v20261108.23.21', '20261108.23.21');
      expect(assets.length).toBe(4);
      expect(assets.some((a) => a.kind === 'installer' && a.platform === 'windows')).toBe(true);
      expect(assets.some((a) => a.kind === 'appimage' && a.platform === 'linux')).toBe(true);
      expect(assets.some((a) => a.kind === 'deb' && a.platform === 'linux')).toBe(true);
    });
  });

  describe('checkForUpdates 远程版本检测', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('通过 GitHub REST API 成功检测到新版本及平台对应安装包', async () => {
      const mockRelease = {
        tag_name: 'v20261108.23.21',
        name: 'v20261108.23.21 - 全平台正式发布',
        html_url: 'https://github.com/laonaisai/note-station-plus/releases/tag/v20261108.23.21',
        published_at: '2026-11-08T15:21:00Z',
        body: '修复若干问题并优化体验',
        assets: [
          {
            name: 'Note.Station.Plus.Setup.20261108.23.21.exe',
            browser_download_url: 'https://github.com/laonaisai/note-station-plus/releases/download/v20261108.23.21/Note.Station.Plus.Setup.20261108.23.21.exe',
            size: 85000000
          },
          {
            name: 'Note.Station.Plus-20261108.23.21.AppImage',
            browser_download_url: 'https://github.com/laonaisai/note-station-plus/releases/download/v20261108.23.21/Note.Station.Plus-20261108.23.21.AppImage',
            size: 110000000
          }
        ]
      };

      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url === GITHUB_LATEST_API_URL) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockRelease)
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const res = await checkForUpdates('0.1.0');
      expect(res.hasUpdate).toBe(true);
      expect(res.latestVersion).toBe('20261108.23.21');
      expect(res.latestTagName).toBe('v20261108.23.21');
      expect(res.assets.length).toBe(2);
      expect(res.matchedAsset).not.toBeNull();
    });

    it('当前版本等于最新版本时 hasUpdate 为 false', async () => {
      const mockRelease = {
        tag_name: 'v20261108.23.21',
        name: 'v20261108.23.21',
        html_url: 'https://github.com/laonaisai/note-station-plus/releases/tag/v20261108.23.21',
        assets: []
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRelease),
        text: () => Promise.resolve('')
      } as Response);

      const res = await checkForUpdates('20261108.23.21');
      expect(res.hasUpdate).toBe(false);
      expect(res.latestVersion).toBe('20261108.23.21');
    });

    it('GitHub API 失败时能降级使用 Atom Feed 解析最新版本', async () => {
      const mockAtomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>tag:github.com,2008:Repository/123/v20261108.23.21</id>
    <title>v20261108.23.21</title>
    <link rel="alternate" type="text/html" href="https://github.com/laonaisai/note-station-plus/releases/tag/v20261108.23.21"/>
    <updated>2026-11-08T15:21:00Z</updated>
    <content type="html">Release content</content>
  </entry>
</feed>`;

      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url === GITHUB_LATEST_API_URL) {
          // GitHub API 模拟 403 频率受限
          return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Forbidden'
          } as Response);
        }
        if (url === GITHUB_ATOM_FEED_URL) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(mockAtomXml)
          } as Response);
        }
        // expanded_assets
        if (url.includes('expanded_assets')) {
          return Promise.resolve({
            ok: false,
            status: 404
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const res = await checkForUpdates('0.1.0');
      expect(res.hasUpdate).toBe(true);
      expect(res.latestVersion).toBe('20261108.23.21');
      expect(res.latestTagName).toBe('v20261108.23.21');
      expect(res.assets.length).toBeGreaterThan(0);
      expect(res.matchedAsset).toBeDefined();
    });

    it('网络请求全部失败时抛出错误', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error: failed to connect'));

      await expect(checkForUpdates('0.1.0')).rejects.toThrow();
    });
  });
});
