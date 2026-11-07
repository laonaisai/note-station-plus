import MarkdownIt from 'markdown-it';
import TurndownService from 'turndown';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

const turndown = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

const MD_COMMENT_PREFIX = '<!-- note-station-plus:markdown\n';
const MD_COMMENT_SUFFIX = '\n-->';

export interface HtmlToMarkdownOptions {
  objectId?: string;
  attachments?: Array<{
    id?: string;
    file_id?: string;
    name?: string;
    size?: number;
    type?: string;
    ref?: string;
  }>;
  getAttachmentUrl?: (fileId: string, filename?: string) => string;
}

export interface MarkdownToNoteHtmlOptions {
  objectId?: string;
  attachments?: Array<{
    id?: string;
    file_id?: string;
    name?: string;
    ref?: string;
    type?: string;
    size?: number;
  }>;
}

/**
 * Encodes string to UTF-8 Base64 (isomorphic for Node.js and browser)
 */
export function toBase64(str: string): string {
  if (!str) return '';
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e1) {
    try {
      return btoa(str);
    } catch (e2) {
      return '';
    }
  }
}

/**
 * Decodes UTF-8 Base64 to string safely.
 * Never throws an uncaught DOMException even on invalid/corrupted base64 input.
 */
export function fromBase64(b64: string): string {
  if (!b64 || typeof b64 !== 'string') return '';
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf-8');
    }
    const clean = b64.replace(/\s+/g, '');
    return decodeURIComponent(escape(atob(clean)));
  } catch (e1) {
    try {
      const clean = b64.replace(/\s+/g, '');
      return atob(clean);
    } catch (e2) {
      return '';
    }
  }
}

/**
 * Extracts a human-friendly filename from a base64-encoded Note Station image ref.
 * Note Station typically generates: utf8_to_b64(Date.now() + originalFilename).
 */
export function safeExtractImageName(ref: string): string {
  if (!ref || typeof ref !== 'string') return '图片';
  try {
    const decoded = fromBase64(ref.trim());
    if (decoded) {
      let name = decoded;
      try {
        name = decodeURIComponent(name);
      } catch {}
      // Strip leading timestamp digits (10 to 14 digits) and optional separators
      const stripped = name.replace(/^\d{10,14}[_-]?/, '');
      return stripped || name;
    }
  } catch {}
  return ref.length < 50 ? ref : '图片';
}

/**
 * Normalizes and refreshes any Synology NoteStation attachment download URLs in Markdown
 * using the currently active client's valid session and host address.
 */
export function refreshNoteStationImageUrls(markdown: string, options?: HtmlToMarkdownOptions): string {
  if (!markdown || !options?.getAttachmentUrl) return markdown;

  // Match Markdown images: ![alt](url)
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (fullMatch, alt, url) => {
    try {
      const isSynoUrl =
        url.includes('SYNO.NoteStation') ||
        url.includes('file_id=') ||
        url.includes('file_id%3D') ||
        (options.attachments && options.attachments.some(a => (a.file_id && url.includes(a.file_id)) || (a.id && url.includes(a.id))));

      if (!isSynoUrl) {
        return fullMatch;
      }

      // Extract file_id from URL
      let fileId = '';
      const cleanUrl = url.replace(/&amp;/g, '&');
      const decodedUrl = decodeURIComponent(cleanUrl);
      const match = decodedUrl.match(/(?:[?&]|%26)file_id(?:=|%3D)([^&"'>\s%]+)/i);
      if (match && match[1]) {
        fileId = match[1];
      }

      if (!fileId && options.attachments) {
        const att = options.attachments.find(a => {
          if (!a) return false;
          const aName = a.name || '';
          return (aName && (aName === alt || aName.startsWith(alt) || alt.startsWith(aName))) || (a.ref && url.includes(a.ref));
        });
        if (att) {
          fileId = att.file_id || att.id || '';
        }
      }

      if (fileId && options.getAttachmentUrl) {
        const matchedAtt = options.attachments?.find(a => {
          if (!a) return false;
          const aId = a.file_id || a.id || '';
          const aName = a.name || '';
          return (
            aId === fileId ||
            (alt && (aName === alt || aName.startsWith(alt) || alt.startsWith(aName)))
          );
        });
        const filename = matchedAtt?.name || alt || 'image.png';
        const freshUrl = options.getAttachmentUrl(fileId, filename);
        return `![${filename}](${freshUrl})`;
      }
    } catch (e) {
      console.warn('Failed to refresh image url in markdown:', e);
    }
    return fullMatch;
  });
}

/**
 * Converts a Markdown string into Note Station compliant HTML:
 * 1. Converts embedded Synology note attachment images back to official format:
 *    <img class="syno-notestation-image-object" src="webman/3rdparty/NoteStation/images/transparent.gif" ref="..." alt="..." />
 *    This ensures the Synology official web client, desktop app, and mobile DS note app can display images natively!
 * 2. Embeds the raw Markdown in a hidden HTML comment for lossless round-tripping.
 */
export function markdownToNoteHtml(markdown: string, options?: MarkdownToNoteHtmlOptions): string {
  if (!markdown) return '';

  try {
    let renderedHtml = md.render(markdown || '');

    // Convert NoteStation image tags to official Synology format
    renderedHtml = renderedHtml.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (fullTag, before, src, after) => {
      try {
        const cleanSrc = src.replace(/&amp;/g, '&');
        const isSynoAttachment =
          cleanSrc.includes('SYNO.NoteStation') ||
          cleanSrc.includes('file_id=') ||
          cleanSrc.includes('file_id%3D') ||
          Boolean(options?.attachments && options.attachments.some(a => (a.file_id && cleanSrc.includes(a.file_id)) || (a.id && cleanSrc.includes(a.id))));

        if (!isSynoAttachment) {
          // Normal external image, preserve as-is
          return fullTag;
        }

        // Extract file_id from src
        let fileId = '';
        try {
          const decodedSrc = decodeURIComponent(cleanSrc);
          const fileIdMatch = decodedSrc.match(/(?:[?&]|%26)file_id(?:=|%3D)([^&"'>\s%]+)/i);
          if (fileIdMatch && fileIdMatch[1]) {
            fileId = fileIdMatch[1];
          }
        } catch {
          const rawMatch = cleanSrc.match(/(?:[?&]|%26)file_id(?:=|%3D)([^&"'>\s%]+)/i);
          if (rawMatch && rawMatch[1]) {
            fileId = rawMatch[1];
          }
        }

        // Extract alt text if present
        const combinedAttrs = `${before} ${after}`;
        const altMatch = combinedAttrs.match(/alt=["']([^"']*)["']/i);
        const altText = altMatch ? altMatch[1] : '';

        // Match attachment from options to get official ref and name
        let matchedAtt: any = null;
        if (options?.attachments && options.attachments.length > 0) {
          matchedAtt = options.attachments.find(a => {
            if (!a) return false;
            const aId = a.file_id || a.id || '';
            const aName = a.name || '';
            return (
              (fileId && (aId === fileId)) ||
              (altText && (aName === altText || aName.startsWith(altText) || altText.startsWith(aName)))
            );
          });
        }

        const ref = matchedAtt?.ref || fileId || (altText ? toBase64(altText) : 'image');
        const safeName = matchedAtt?.name || altText || 'image.png';

        // Official Synology image object syntax recognized by all official clients
        return `<img class="syno-notestation-image-object" src="webman/3rdparty/NoteStation/images/transparent.gif" ref="${ref}" alt="${safeName}" />`;
      } catch (e) {
        console.error('Error transforming img to official Synology format:', e);
        return fullTag;
      }
    });

    const encodedRaw = toBase64(markdown || '');
    const comment = `${MD_COMMENT_PREFIX}${encodedRaw}${MD_COMMENT_SUFFIX}`;
    return `${renderedHtml}\n${comment}`;
  } catch (err) {
    console.error('Error in markdownToNoteHtml:', err);
    return `<p>${markdown}</p>`;
  }
}

/**
 * Converts Note Station HTML into Markdown:
 * 1. If lossless hidden comment exists, decodes and returns it directly (100% loss-free).
 * 2. Otherwise (legacy HTML note), uses Turndown to convert HTML to Markdown.
 * 3. Resolves official Synology embedded image objects into actual images.
 */
export function noteHtmlToMarkdown(html: string, options?: HtmlToMarkdownOptions): string {
  if (!html || typeof html !== 'string') return '';

  try {
    const commentRegex = /<!-- note-station-plus:markdown\n([\s\S]*?)\n-->/;
    const match = html.match(commentRegex);

    if (match && match[1]) {
      try {
        const decodedMarkdown = fromBase64(match[1].trim());
        if (decodedMarkdown) {
          // Check if decoded markdown contains legacy placeholders or needs url refresh
          if (options?.getAttachmentUrl && options.attachments && options.attachments.length > 0) {
            return healLegacyImagePlaceholders(decodedMarkdown, options);
          }
          return decodedMarkdown;
        }
      } catch (e) {
        console.warn('Failed to decode embedded markdown comment, falling back to turndown', e);
      }
    }

    // Fallback for legacy notes or notes edited in official client
    let cleanHtml = html.replace(commentRegex, '');

    // Pre-process official Synology Note Station embedded image objects
    // e.g. <img class="syno-notestation-image-object" src="webman/3rdparty/NoteStation/images/transparent.gif" ref="..." />
    cleanHtml = cleanHtml.replace(/<img[^>]*>/gi, (imgTag) => {
      try {
        // 1. If inline data-url src exists, preserve it as standard img tag
        const dataSrcMatch = imgTag.match(/src=["'](data:image\/[^"']+)["']/i);
        if (dataSrcMatch && dataSrcMatch[1]) {
          const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
          return `<img src="${dataSrcMatch[1]}" alt="${altMatch ? altMatch[1] : '图片'}" />`;
        }

        // 2. Official Synology image object: extract ref
        const isOfficialSynoImg = imgTag.includes('syno-notestation-image-object') || imgTag.includes('transparent.gif');
        const refMatch = imgTag.match(/ref=["']([^"']+)["']/i);
        const ref = refMatch ? refMatch[1] : '';
        const cleanName = safeExtractImageName(ref);

        if (isOfficialSynoImg || ref) {
          if (options?.getAttachmentUrl) {
            let matchedAtt: any;
            if (options.attachments && options.attachments.length > 0) {
              matchedAtt = options.attachments.find(a => {
                if (!a) return false;
                const aName = a.name || '';
                const aRef = a.ref || '';
                const aId = a.file_id || a.id || '';
                return (
                  (aRef && aRef === ref) ||
                  (aId && aId === ref) ||
                  (aName && cleanName && (aName === cleanName || cleanName.includes(aName) || aName.includes(cleanName)))
                );
              });
              if (!matchedAtt) {
                const imgAtts = options.attachments.filter(a => {
                  if (!a) return false;
                  const aType = a.type || '';
                  const aName = a.name || '';
                  return aType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(aName);
                });
                if (imgAtts.length === 1) {
                  matchedAtt = imgAtts[0];
                }
              }
            }

            const fileId = matchedAtt ? (matchedAtt.file_id || matchedAtt.id || ref) : ref;
            const filename = matchedAtt?.name || cleanName || 'image.png';
            if (fileId) {
              const url = options.getAttachmentUrl(fileId, filename);
              return `<img src="${url}" alt="${filename}" />`;
            }
          }

          // Fallback if no getAttachmentUrl
          return `<img src="webman/3rdparty/NoteStation/images/transparent.gif" alt="${cleanName}" data-ref="${ref}" />`;
        }

        // 3. If already a valid absolute HTTP/HTTPS URL, preserve it
        return imgTag;
      } catch (err) {
        console.error('Error processing img tag in noteHtmlToMarkdown:', err);
        return imgTag;
      }
    });

    let markdown = turndown.turndown(cleanHtml);

    if (options?.getAttachmentUrl && options.attachments && options.attachments.length > 0) {
      markdown = healLegacyImagePlaceholders(markdown, options);
    }

    return markdown;
  } catch (err) {
    console.error('Critical error in noteHtmlToMarkdown, returning fallback text:', err);
    return html.replace(/<[^>]+>/g, '');
  }
}

/**
 * Heals legacy "🖼️ [图片: ...]" placeholders and refreshes outdated Note Station image URLs
 */
export function healLegacyImagePlaceholders(markdown: string, options: HtmlToMarkdownOptions): string {
  if (!markdown) return '';
  if (!options?.getAttachmentUrl || !options.attachments || options.attachments.length === 0) {
    return markdown;
  }

  try {
    let result = markdown.replace(/(?:<span>)?(?:🖼️\s*)?\[图片:\s*([^\]]+)\](?:<\/span>)?/g, (match, rawName) => {
      if (!rawName || typeof rawName !== 'string') return match;
      const name = rawName.trim();
      const clean = safeExtractImageName(name);

      const matched = options.attachments?.find(a => {
        if (!a) return false;
        const aName = a.name || '';
        const aRef = a.ref || '';
        const aId = a.file_id || a.id || '';
        return (
          (aName && (aName === name || aName === clean)) ||
          (aRef && (aRef === name || aRef === clean)) ||
          (aId && (aId === name || aId === clean)) ||
          (aName && name && (name.includes(aName) || aName.includes(name))) ||
          (aName && clean && (clean.includes(aName) || aName.includes(clean)))
        );
      }) || options.attachments?.find(a => {
        if (!a) return false;
        const aName = a.name || '';
        const aType = a.type || '';
        return aType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(aName);
      });

      if (matched) {
        const fileId = matched.file_id || matched.id || '';
        const safeName = matched.name || clean || 'image.png';
        const url = options.getAttachmentUrl!(fileId, safeName);
        return `![${safeName}](${url})`;
      }
      return match;
    });

    // Also refresh existing Note Station image URLs using current active host/session
    result = refreshNoteStationImageUrls(result, options);
    return result;
  } catch (err) {
    console.error('Error healing image placeholders:', err);
    return markdown;
  }
}
