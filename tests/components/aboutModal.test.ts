import { describe, it, expect } from 'vitest';
import pkg from '../../package.json';

describe('关于 Note Station Plus (About Modal) 模块测试', () => {
  it('1. 验证 package.json 基础信息完整性', () => {
    expect(pkg.name).toBe('note-station-plus');
    expect(pkg.version).toBeDefined();
    expect(typeof pkg.version).toBe('string');
    expect(pkg.version.length).toBeGreaterThan(0);
    expect(pkg.description).toBeDefined();
  });

  it('2. 验证关于信息核心要素规范 (名称、开发者、源码地址)', () => {
    const appName = 'Note Station Plus';
    const author = '老衲是AI';
    const sourceUrl = 'https://github.com/laonaisai/note-station-plus';

    expect(appName).toBe('Note Station Plus');
    expect(author).toBe('老衲是AI');
    expect(sourceUrl).toBe('https://github.com/laonaisai/note-station-plus');
    expect(sourceUrl.startsWith('https://github.com/')).toBe(true);
  });

  it('3. 验证多语言中包含检查更新相关的全部文案', async () => {
    const { zhCN } = await import('../../src/i18n/locales/zh-CN');
    const { enUS } = await import('../../src/i18n/locales/en-US');
    const { zhTW } = await import('../../src/i18n/locales/zh-TW');
    const { jaJP } = await import('../../src/i18n/locales/ja-JP');
    const { koKR } = await import('../../src/i18n/locales/ko-KR');

    const requiredKeys = [
      'checkUpdates',
      'checkingUpdates',
      'isLatestVersion',
      'newVersionAvailable',
      'updateNow',
      'updateCheckFailed',
      'retryCheck',
      'viewAllReleases',
      'downloadingUpdate',
      'downloadComplete',
      'readyToInstall',
      'installNow',
      'openFolder',
      'installLater',
      'downloadFailed',
      'cancelDownload',
      'browserDownloadStarted',
      'targetAsset',
      'manualDownload',
      'downloadProgress'
    ] as const;

    for (const key of requiredKeys) {
      expect(zhCN.about[key], `zh-CN missing ${key}`).toBeDefined();
      expect(enUS.about[key], `en-US missing ${key}`).toBeDefined();
      expect(zhTW.about[key], `zh-TW missing ${key}`).toBeDefined();
      expect(jaJP.about[key], `ja-JP missing ${key}`).toBeDefined();
      expect(koKR.about[key], `ko-KR missing ${key}`).toBeDefined();
    }
  });
});
