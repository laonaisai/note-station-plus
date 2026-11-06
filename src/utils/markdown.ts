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
    name: string;
    size?: number;
    type?: string;
    ref?: string;
  }>;
  getAttachmentUrl?: (fileId: string, filename?: string) => string;
}

/**
 * Encodes string to UTF-8 Base64 (isomorphic for Node.js and browser)
 */
export function toBase64(str: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return btoa(str);
  }
}

/**
 * Decodes UTF-8 Base64 to string (isomorphic for Node.js and browser)
 */
export function fromBase64(b64: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf-8');
    }
    return decodeURIComponent(escape(atob(b64)));
  } catch (e) {
    return atob(b64);
  }
}

/**
 * Extracts a human-friendly filename from a base64-encoded Note Station image ref.
 * Note Station typically generates: utf8_to_b64(Date.now() + originalFilename).
 */
export function safeExtractImageName(ref: string): string {
  if (!ref) return '图片';
  try {
    const decoded = fromBase64(ref);
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
  return '图片';
}

/**
 * Converts a Markdown string into Note Station compliant HTML,
 * embedding the raw Markdown in a hidden HTML comment for lossless round-tripping.
 */
export function markdownToNoteHtml(markdown: string): string {
  const renderedHtml = md.render(markdown || '');
  const encodedRaw = toBase64(markdown || '');
  const comment = `${MD_COMMENT_PREFIX}${encodedRaw}${MD_COMMENT_SUFFIX}`;
  return `${renderedHtml}\n${comment}`;
}

/**
 * Converts Note Station HTML into Markdown:
 * 1. If lossless hidden comment exists, decodes and returns it directly (100% loss-free).
 * 2. Otherwise (legacy HTML note), uses Turndown to convert HTML to Markdown.
 * 3. Resolves official Synology embedded image objects into actual images.
 */
export function noteHtmlToMarkdown(html: string, options?: HtmlToMarkdownOptions): string {
  if (!html) return '';

  const commentRegex = /<!-- note-station-plus:markdown\n([\s\S]*?)\n-->/;
  const match = html.match(commentRegex);

  if (match && match[1]) {
    try {
      const decodedMarkdown = fromBase64(match[1].trim());
      // Check if decoded markdown contains legacy "🖼️ [图片: ...]" and heal it if attachment options available
      if (options?.getAttachmentUrl && options.attachments && options.attachments.length > 0) {
        return healLegacyImagePlaceholders(decodedMarkdown, options);
      }
      return decodedMarkdown;
    } catch (e) {
      console.warn('Failed to decode embedded markdown comment, falling back to turndown', e);
    }
  }

  // Fallback for legacy notes or notes edited in official client
  // Strip out any broken comment artifacts if any
  let cleanHtml = html.replace(commentRegex, '');

  // Pre-process official Synology Note Station embedded image objects
  // e.g. <img class="syno-notestation-image-object" src="webman/3rdparty/NoteStation/images/transparent.gif" ref="..." />
  cleanHtml = cleanHtml.replace(/<img[^>]*>/gi, (imgTag) => {
    // 1. If inline data-url src exists, preserve it as standard img tag
    const dataSrcMatch = imgTag.match(/src=["'](data:image\/[^"']+)["']/i);
    if (dataSrcMatch && dataSrcMatch[1]) {
      const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
      return `<img src="${dataSrcMatch[1]}" alt="${altMatch ? altMatch[1] : '图片'}" />`;
    }

    // 2. If already a valid absolute HTTP/HTTPS URL, preserve it
    const httpSrcMatch = imgTag.match(/src=["'](https?:\/\/[^"']+)["']/i);
    if (httpSrcMatch && httpSrcMatch[1]) {
      return imgTag;
    }

    // 3. Official Synology image object: extract ref
    const refMatch = imgTag.match(/ref=["']([^"']+)["']/i);
    const ref = refMatch ? refMatch[1] : '';
    const cleanName = safeExtractImageName(ref);

    if (options?.getAttachmentUrl) {
      let matchedAtt: any;
      if (options.attachments && options.attachments.length > 0) {
        matchedAtt = options.attachments.find(a =>
          (a.ref && a.ref === ref) ||
          (a.file_id && a.file_id === ref) ||
          (a.id && a.id === ref) ||
          (cleanName && a.name && (a.name === cleanName || cleanName.includes(a.name) || a.name.includes(cleanName)))
        );
        if (!matchedAtt) {
          const imgAtts = options.attachments.filter(a =>
            a.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(a.name || '')
          );
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

    // Fallback: If no getAttachmentUrl available, keep valid img tag so it won't be replaced with broken text
    return `<img src="webman/3rdparty/NoteStation/images/transparent.gif" alt="${cleanName}" data-ref="${ref}" />`;
  });

  let markdown = turndown.turndown(cleanHtml);

  if (options?.getAttachmentUrl && options.attachments && options.attachments.length > 0) {
    markdown = healLegacyImagePlaceholders(markdown, options);
  }

  return markdown;
}

/**
 * Heals any legacy "🖼️ [图片: ...]" placeholders into proper Markdown image links
 */
export function healLegacyImagePlaceholders(markdown: string, options: HtmlToMarkdownOptions): string {
  if (!options.getAttachmentUrl || !options.attachments || options.attachments.length === 0) {
    return markdown;
  }
  return markdown.replace(/(?:<span>)?(?:🖼️\s*)?\[图片:\s*([^\]]+)\](?:<\/span>)?/g, (match, rawName) => {
    const name = rawName.trim();
    const clean = safeExtractImageName(name);
    const matched = options.attachments?.find(a =>
      a.name === name ||
      a.name === clean ||
      a.ref === name ||
      (a.file_id && a.file_id === name) ||
      (a.id && a.id === name) ||
      name.includes(a.name) ||
      a.name.includes(name) ||
      clean.includes(a.name) ||
      a.name.includes(clean)
    ) || options.attachments?.find(a =>
      a.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(a.name)
    );
    if (matched) {
      const fileId = matched.file_id || matched.id || '';
      const url = options.getAttachmentUrl!(fileId, matched.name);
      return `![${matched.name}](${url})`;
    }
    return match;
  });
}
