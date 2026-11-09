import { logger } from './logger';

export const GITHUB_REPO_URL = 'https://github.com/laonaisai/note-station-plus';
export const GITHUB_RELEASES_URL = 'https://github.com/laonaisai/note-station-plus/releases';
export const GITHUB_LATEST_API_URL = 'https://api.github.com/repos/laonaisai/note-station-plus/releases/latest';
export const GITHUB_ATOM_FEED_URL = 'https://github.com/laonaisai/note-station-plus/releases.atom';

export interface ReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  htmlUrl: string;
  publishedAt?: string;
  body?: string;
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
}

/**
 * 规范化版本号字符串，去除首字母 v/V 及首尾空格
 */
export function cleanVersion(v?: string | null): string {
  if (!v) return '0.0.0';
  return String(v).trim().replace(/^v/i, '');
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
 * 从 GitHub API 或 Atom Feed 中检测最新版本
 * @param currentVersion 当前应用版本号
 * @param timeoutMs 超时时间 (毫秒)
 */
export async function checkForUpdates(
  currentVersion: string,
  timeoutMs: number = 8000
): Promise<UpdateCheckResult> {
  const normCurrent = cleanVersion(currentVersion);
  logger.info('system', 'checkUpdateStart', '开始检查应用版本更新', { currentVersion: normCurrent });

  let releaseInfo: ReleaseInfo | null = null;

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
        releaseInfo = {
          version: cleanVersion(tagName),
          tagName,
          name: data.name || tagName,
          htmlUrl: data.html_url || `${GITHUB_RELEASES_URL}/tag/${tagName}`,
          publishedAt: data.published_at,
          body: data.body
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

  const cmp = compareVersions(releaseInfo.version, normCurrent);
  const hasUpdate = cmp > 0;

  logger.info('system', 'checkUpdateFinish', '版本检查完成', {
    current: normCurrent,
    latest: releaseInfo.version,
    hasUpdate
  });

  return {
    hasUpdate,
    currentVersion: normCurrent,
    latestVersion: releaseInfo.version,
    latestTagName: releaseInfo.tagName,
    releaseName: releaseInfo.name,
    releaseUrl: releaseInfo.htmlUrl,
    publishedAt: releaseInfo.publishedAt,
    releaseNotes: releaseInfo.body
  };
}
