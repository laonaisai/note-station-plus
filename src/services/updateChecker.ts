import { logger } from './logger';

export const GITHUB_REPO_URL = 'https://github.com/laonaisai/note-station-plus';
export const GITHUB_RELEASES_URL = 'https://github.com/laonaisai/note-station-plus/releases';
export const GITHUB_LATEST_API_URL = 'https://api.github.com/repos/laonaisai/note-station-plus/releases/latest';
export const GITHUB_ATOM_FEED_URL = 'https://github.com/laonaisai/note-station-plus/releases.atom';

export type PlatformType = 'windows' | 'linux' | 'mac' | 'other';
export type AssetKind = 'installer' | 'portable' | 'deb' | 'appimage' | 'archive' | 'other';

export interface ReleaseAsset {
  name: string;
  downloadUrl: string;
  size?: number;
  sizeFormatted?: string;
  platform: PlatformType;
  kind: AssetKind;
}

export interface ReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  htmlUrl: string;
  publishedAt?: string;
  body?: string;
  assets?: ReleaseAsset[];
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  latestTagName: string;
  releaseName: string;
  releaseUrl: string;
  publishedAt?: string;
  releaseNotes?: string;
  assets: ReleaseAsset[];
  matchedAsset: ReleaseAsset | null;
  platform: PlatformType;
}

/**
 * 规范化版本号字符串，去除首字母 v/V 及首尾空格
 */
export function cleanVersion(v?: string | null): string {
  if (!v) return '0.0.0';
  return String(v).trim().replace(/^v/i, '');
}

/**
 * 格式化字节大小为可读文本
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * 根据文件名自动分析归属平台与安装包类型
 */
export function classifyAsset(
  fileName: string,
  downloadUrl: string,
  size?: number,
  sizeFormatted?: string
): ReleaseAsset {
  const lower = fileName.toLowerCase();
  let platform: PlatformType = 'other';
  let kind: AssetKind = 'other';

  if (lower.endsWith('.exe')) {
    platform = 'windows';
    kind = lower.includes('setup') ? 'installer' : 'portable';
  } else if (lower.endsWith('.appimage')) {
    platform = 'linux';
    kind = 'appimage';
  } else if (lower.endsWith('.deb')) {
    platform = 'linux';
    kind = 'deb';
  } else if (lower.endsWith('.dmg') || lower.endsWith('.pkg')) {
    platform = 'mac';
    kind = 'installer';
  } else if (lower.endsWith('.zip') || lower.endsWith('.tar.gz')) {
    kind = 'archive';
  }

  return {
    name: fileName,
    downloadUrl,
    size,
    sizeFormatted: sizeFormatted || (size ? formatBytes(size) : undefined),
    platform,
    kind
  };
}

/**
 * 检测当前系统运行平台
 */
export function detectCurrentPlatform(): PlatformType {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.platform) {
    const p = String((window as any).electronAPI.platform).toLowerCase();
    if (p.includes('win')) return 'windows';
    if (p.includes('linux')) return 'linux';
    if (p.includes('darwin') || p.includes('mac')) return 'mac';
  }
  if (typeof navigator !== 'undefined') {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'mac';
    if (ua.includes('linux')) return 'linux';
  }
  return 'other';
}

/**
 * 匹配适合当前操作系统平台的安装产物
 */
export function matchAssetForPlatform(
  assets: ReleaseAsset[],
  targetPlatform: PlatformType = detectCurrentPlatform()
): ReleaseAsset | null {
  if (!assets || assets.length === 0) return null;

  if (targetPlatform === 'windows') {
    // 1. 安装包 (Setup.exe)
    const setup = assets.find((a) => a.platform === 'windows' && a.kind === 'installer');
    if (setup) return setup;
    // 2. 便携版或其它 .exe
    return assets.find((a) => a.platform === 'windows') || null;
  }

  if (targetPlatform === 'linux') {
    // 1. AppImage 便携包 (全 Linux 发行版通用)
    const appImage = assets.find((a) => a.platform === 'linux' && a.kind === 'appimage');
    if (appImage) return appImage;
    // 2. deb 安装包
    const deb = assets.find((a) => a.platform === 'linux' && a.kind === 'deb');
    if (deb) return deb;
    return assets.find((a) => a.platform === 'linux') || null;
  }

  if (targetPlatform === 'mac') {
    const dmg = assets.find((a) => a.platform === 'mac');
    if (dmg) return dmg;
  }

  return assets.find((a) => a.platform === targetPlatform) || assets[0] || null;
}

/**
 * 比较两个版本号 (支持时间戳格式 yyyyMMdd.HH.mm 及标准 Semver 0.1.0)
 * 返回值:
 *  1: v1 > v2 (v1 较新)
 * -1: v1 < v2 (v2 较新)
 *  0: v1 === v2 (版本相同)
 */
export function compareVersions(v1?: string | null, v2?: string | null): number {
  const s1 = cleanVersion(v1);
  const s2 = cleanVersion(v2);

  if (s1 === s2) return 0;

  const parts1 = s1.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  const parts2 = s2.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * 从 GitHub expanded_assets HTML 页面解析已上传的各平台安装包产物
 */
export async function fetchExpandedAssets(tagName: string, timeoutMs: number = 6000): Promise<ReleaseAsset[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(`${GITHUB_RELEASES_URL}/expanded_assets/${tagName}`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!resp.ok || typeof resp.text !== 'function') return [];

    const html = await resp.text();
    const linkMatches = [...html.matchAll(/href="(\/laonaisai\/note-station-plus\/releases\/download\/[^"]+)"/g)];
    const assets: ReleaseAsset[] = [];
    const seenUrls = new Set<string>();

    for (const match of linkMatches) {
      const relPath = match[1];
      const fullUrl = `https://github.com${relPath}`;
      if (seenUrls.has(fullUrl)) continue;
      seenUrls.add(fullUrl);

      const fileName = decodeURIComponent(relPath.split('/').pop() || '');
      if (!fileName) continue;

      const afterSlice = html.slice(match.index || 0, (match.index || 0) + 1200);
      const sizeMatch = afterSlice.match(/class="[^"]*color-fg-muted[^"]*"[^>]*>\s*([0-9.]+\s*(?:MB|KB|GB|B))\s*</i);
      const sizeFormatted = sizeMatch ? sizeMatch[1].trim() : undefined;

      assets.push(classifyAsset(fileName, fullUrl, undefined, sizeFormatted));
    }
    return assets;
  } catch (err) {
    logger.warn('system', 'fetchExpandedAssetsError', '获取 expanded_assets 列表失败', err);
    return [];
  }
}

/**
 * 当未获取到动态列表时，根据发版规范生成默认的 4 个全平台安装包地址
 */
export function generateDefaultAssets(tagName: string, version: string): ReleaseAsset[] {
  const v = cleanVersion(version);
  return [
    classifyAsset(
      `Note.Station.Plus.Setup.${v}.exe`,
      `https://github.com/laonaisai/note-station-plus/releases/download/${tagName}/Note.Station.Plus.Setup.${v}.exe`
    ),
    classifyAsset(
      `Note.Station.Plus.${v}.exe`,
      `https://github.com/laonaisai/note-station-plus/releases/download/${tagName}/Note.Station.Plus.${v}.exe`
    ),
    classifyAsset(
      `Note.Station.Plus-${v}.AppImage`,
      `https://github.com/laonaisai/note-station-plus/releases/download/${tagName}/Note.Station.Plus-${v}.AppImage`
    ),
    classifyAsset(
      `note-station-plus_${v}_amd64.deb`,
      `https://github.com/laonaisai/note-station-plus/releases/download/${tagName}/note-station-plus_${v}_amd64.deb`
    )
  ];
}

/**
 * 从 GitHub API 或 Atom Feed 中检测最新版本及对应平台的安装包
 * @param currentVersion 当前应用版本号
 * @param timeoutMs 超时时间 (毫秒)
 */
export async function checkForUpdates(
  currentVersion: string,
  timeoutMs: number = 8000
): Promise<UpdateCheckResult> {
  const normCurrent = cleanVersion(currentVersion);
  const currentPlatform = detectCurrentPlatform();

  logger.info('system', 'checkUpdateStart', '开始检查应用版本更新', {
    currentVersion: normCurrent,
    platform: currentPlatform
  });

  let releaseInfo: ReleaseInfo | null = null;
  let assets: ReleaseAsset[] = [];

  // 1. 首选 GitHub REST API 获取 latest release
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(GITHUB_LATEST_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    });
    clearTimeout(timer);

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.tag_name) {
        const tagName = String(data.tag_name);
        if (Array.isArray(data.assets) && data.assets.length > 0) {
          assets = data.assets.map((ast: any) =>
            classifyAsset(ast.name, ast.browser_download_url, ast.size)
          );
        }
        releaseInfo = {
          version: cleanVersion(tagName),
          tagName,
          name: data.name || tagName,
          htmlUrl: data.html_url || `${GITHUB_RELEASES_URL}/tag/${tagName}`,
          publishedAt: data.published_at,
          body: data.body,
          assets
        };
      }
    } else {
      logger.warn('system', 'githubApiFailed', 'GitHub Releases API 返回非 200 响应', {
        status: resp.status,
        statusText: resp.statusText
      });
    }
  } catch (err: any) {
    logger.warn('system', 'githubApiError', 'GitHub Releases API 请求失败，尝试降级至 Atom Feed', err);
  }

  // 2. 备用降级方案：从 releases.atom XML 中提取最新版本
  if (!releaseInfo) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const resp = await fetch(GITHUB_ATOM_FEED_URL, {
        signal: controller.signal,
        headers: {
          Accept: 'application/atom+xml, text/xml, */*'
        }
      });
      clearTimeout(timer);

      if (resp.ok) {
        const xml = await resp.text();
        const tagMatch = xml.match(/\/releases\/tag\/([^"'\s>]+)/);
        const titleMatch = xml.match(/<entry>[\s\S]*?<title>([^<]+)<\/title>/);

        if (tagMatch && tagMatch[1]) {
          const tagName = decodeURIComponent(tagMatch[1]);
          releaseInfo = {
            version: cleanVersion(tagName),
            tagName,
            name: titleMatch && titleMatch[1] ? titleMatch[1].trim() : tagName,
            htmlUrl: `${GITHUB_RELEASES_URL}/tag/${tagName}`
          };
        }
      }
    } catch (err: any) {
      logger.error('system', 'atomFeedError', '降级 Atom Feed 亦失败', err);
    }
  }

  if (!releaseInfo) {
    throw new Error('无法连接至 GitHub Releases 检查最新版本');
  }

  // 若 API 未提供 assets，则尝试从 expanded_assets HTML 中解析
  if (assets.length === 0) {
    assets = await fetchExpandedAssets(releaseInfo.tagName, timeoutMs);
  }

  // 若仍未获取到（如完全断网或特殊限制），生成规则兜底 assets
  if (assets.length === 0) {
    assets = generateDefaultAssets(releaseInfo.tagName, releaseInfo.version);
  }

  const matchedAsset = matchAssetForPlatform(assets, currentPlatform);
  const cmp = compareVersions(releaseInfo.version, normCurrent);
  const hasUpdate = cmp > 0;

  logger.info('system', 'checkUpdateFinish', '版本检查完成', {
    current: normCurrent,
    latest: releaseInfo.version,
    hasUpdate,
    matchedAsset: matchedAsset?.name
  });

  return {
    hasUpdate,
    currentVersion: normCurrent,
    latestVersion: releaseInfo.version,
    latestTagName: releaseInfo.tagName,
    releaseName: releaseInfo.name,
    releaseUrl: releaseInfo.htmlUrl,
    publishedAt: releaseInfo.publishedAt,
    releaseNotes: releaseInfo.body,
    assets,
    matchedAsset,
    platform: currentPlatform
  };
}
