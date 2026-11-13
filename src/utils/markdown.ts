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

// Prevent Turndown from aggressively escaping markdown symbols (_, *, +, ~, `, #, etc.)
// which ruins variable names like user_id, math equations like 10 * 20, or combined symbols like _*
turndown.escape = function (string: string) {
  return string;
};

// --- GitHub Flavored Markdown (GFM) extensions for Turndown ---

function cleanTableCellContent(content: string): string {
  if (!content) return '';
  return content
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/\s*<br\s*\/?>\s*/gi, '<br>')
    .replace(/\s*\r?\n+\s*/g, '<br>')
    .replace(/(?:<br>\s*)+/g, '<br>')
    .replace(/^<br>|<br>$/g, '')
    .replace(/(?<!\\)\|/g, '\\|')
    .trim();
}

function getDirectTableRows(table: any): any[] {
  const rows: any[] = [];
  function collect(node: any) {
    if (!node || !node.childNodes) return;
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (child.nodeName === 'TR') {
        rows.push(child);
      } else if (child.nodeName !== 'TABLE') {
        collect(child);
      }
    }
  }
  collect(table);
  return rows;
}

function getRowCells(tr: any): any[] {
  const cells: any[] = [];
  if (!tr || !tr.childNodes) return cells;
  for (let i = 0; i < tr.childNodes.length; i++) {
    const child = tr.childNodes[i];
    if (child.nodeName === 'TH' || child.nodeName === 'TD') {
      cells.push(child);
    }
  }
  return cells;
}

function getRowEffectiveColCount(tr: any): number {
  const cells = getRowCells(tr);
  let count = 0;
  for (const c of cells) {
    const cs = parseInt(c.getAttribute?.('colspan') || '1', 10);
    count += cs > 1 ? cs : 1;
  }
  return count;
}

function findParentTable(node: any): any {
  let parent = node.parentNode;
  while (parent && parent.nodeName !== 'TABLE') {
    parent = parent.parentNode;
  }
  return parent;
}

// 1. Table Cells (th, td)
turndown.addRule('tableCell', {
  filter: ['th', 'td'],
  replacement: function (content, node: any) {
    const parent = node.parentNode;
    const cells = getRowCells(parent);
    const index = cells.indexOf(node);
    const cleaned = cleanTableCellContent(content);
    const colspan = parseInt(node.getAttribute?.('colspan') || '1', 10);
    let extraPipes = '';
    if (colspan > 1) {
      extraPipes = ' |'.repeat(colspan - 1);
    }
    return (index === 0 ? '| ' : '') + cleaned + ' |' + extraPipes + ' ';
  }
});

// 2. Table Rows (tr)
turndown.addRule('tableRow', {
  filter: 'tr',
  replacement: function (content, node: any) {
    const parentTable = findParentTable(node);
    const allRows = parentTable ? getDirectTableRows(parentTable) : [];
    const rowIndex = allRows.indexOf(node);
    const isHeader = (node.parentNode && node.parentNode.nodeName === 'THEAD') || rowIndex === 0;
    const effCount = getRowEffectiveColCount(node);

    let maxCols = effCount;
    if (parentTable) {
      for (const r of allRows) {
        const rc = getRowEffectiveColCount(r);
        if (rc > maxCols) maxCols = rc;
      }
    }

    let trimmedContent = content.trim();
    if (effCount < maxCols) {
      trimmedContent += ' |'.repeat(maxCols - effCount);
    }

    let borderRow = '';
    if (isHeader && maxCols > 0) {
      const borders: string[] = [];
      const cells = getRowCells(node);
      for (let i = 0; i < maxCols; i++) {
        const cell = cells[i];
        let align = '---';
        if (cell) {
          const alignAttr = (cell.getAttribute?.('align') || (cell.style && cell.style.textAlign) || '').toLowerCase();
          if (alignAttr === 'center') align = ':---:';
          else if (alignAttr === 'right') align = '---:';
          else if (alignAttr === 'left') align = ':---';
        }
        borders.push(align);
      }
      borderRow = '\n| ' + borders.join(' | ') + ' |';
    }

    return '\n' + trimmedContent + borderRow;
  }
});

// 3. Table Sections (thead, tbody, tfoot)
turndown.addRule('tableSection', {
  filter: ['thead', 'tbody', 'tfoot'],
  replacement: function (content) {
    return content;
  }
});

// 4. Tables
turndown.addRule('table', {
  filter: 'table',
  replacement: function (content) {
    const trimmed = content.trim();
    if (!trimmed) return '';
    return '\n\n' + trimmed + '\n\n';
  }
});

function wrapStrikethrough(content: string): string {
  if (!content) return '';
  const match = content.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return `~~${content}~~`;
  const leading = match[1];
  const inner = match[2];
  const trailing = match[3];
  if (!inner) return content;
  if (inner.startsWith('~~') && inner.endsWith('~~') && inner.length >= 4) {
    return `${leading}${inner}${trailing}`;
  }
  return `${leading}~~${inner}~~${trailing}`;
}

// 5. Strikethrough (del, s, strike, and elements with line-through style like official Synology TinyMCE)
turndown.addRule('strikethrough', {
  filter: function (node: any) {
    if (!node) return false;
    const tag = (node.nodeName || '').toLowerCase();
    if (['del', 's', 'strike'].includes(tag)) {
      return true;
    }
    const styleAttr = (node.getAttribute ? (node.getAttribute('style') || '') : '').toLowerCase();
    if (/text-decoration(?:-line)?\s*:\s*[^;"]*line-through/.test(styleAttr)) {
      return true;
    }
    if (node.style && node.style.textDecoration && /line-through/i.test(node.style.textDecoration)) {
      return true;
    }
    return false;
  },
  replacement: function (content) {
    return wrapStrikethrough(content);
  }
});

// 6. Task List Checkboxes
turndown.addRule('taskListItems', {
  filter: function (node: any) {
    return node.type === 'checkbox' && node.parentNode && node.parentNode.nodeName === 'LI';
  },
  replacement: function (content, node: any) {
    return (node.checked ? '[x]' : '[ ]') + ' ';
  }
});

const MD_COMMENT_PREFIX = '<!-- note-station-plus:markdown';
const MD_COMMENT_SUFFIX = '\n-->';

/**
 * Fast deterministic DJB2 hash for verifying HTML body integrity against external edits.
 */
export function hashHtmlBody(html: string): string {
  if (!html) return '';
  const normalized = html
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

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

    // Convert strikethrough (<s>...</s> or <del>...</del>) to official Synology Note Station TinyMCE format
    // <span style="text-decoration: line-through;">...</span> to ensure 100% fidelity across all official clients
    renderedHtml = renderedHtml
      .replace(/<s>([\s\S]*?)<\/s>/gi, '<span style="text-decoration: line-through;">$1</span>')
      .replace(/<del(?:\s+[^>]*)?>([\s\S]*?)<\/del>/gi, '<span style="text-decoration: line-through;">$1</span>')
      .replace(/<strike(?:\s+[^>]*)?>([\s\S]*?)<\/strike>/gi, '<span style="text-decoration: line-through;">$1</span>');

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
    const bodyHash = hashHtmlBody(renderedHtml);
    const comment = `${MD_COMMENT_PREFIX} hash="${bodyHash}"\n${encodedRaw}${MD_COMMENT_SUFFIX}`;
    return `${renderedHtml}\n${comment}`;
  } catch (err) {
    console.error('Error in markdownToNoteHtml:', err);
    return `<p>${markdown}</p>`;
  }
}

/**
 * Converts Note Station HTML into Markdown:
 * 1. If lossless hidden comment exists and passes hash/integrity check, returns it directly (100% loss-free).
 * 2. If the note was edited externally in official Synology clients, the hash mismatch triggers Turndown to parse latest HTML!
 * 3. Resolves official Synology embedded image objects into actual images.
 */
export function noteHtmlToMarkdown(html: string, options?: HtmlToMarkdownOptions): string {
  if (!html || typeof html !== 'string') return '';

  try {
    const commentRegex = /<!-- note-station-plus:markdown(?:\s+hash=["']([0-9a-fA-F]+)["'])?\s*\r?\n([\s\S]*?)\r?\n-->/;
    const match = html.match(commentRegex);
    const cleanHtmlWithoutComment = html.replace(commentRegex, '').trim();

    if (match) {
      const recordedHash = match[1];
      const encodedMarkdown = match[2];

      let isCommentValid = false;
      if (recordedHash) {
        // Hash exists: strictly verify if HTML body was modified in official Synology clients or elsewhere
        const currentHash = hashHtmlBody(cleanHtmlWithoutComment);
        if (currentHash === recordedHash) {
          isCommentValid = true;
        }
      } else {
        // Older comment without hash: compare content and image counts to detect external edits
        try {
          const legacyDecoded = fromBase64(encodedMarkdown.trim());
          if (legacyDecoded) {
            const cleanText = cleanHtmlWithoutComment.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            const renderedText = md.render(legacyDecoded).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            const cleanImgCount = (cleanHtmlWithoutComment.match(/<img\b/gi) || []).length;
            const decodedImgCount = (legacyDecoded.match(/!\[.*?\]\(.*?\)/g) || []).length;
            if (cleanText === renderedText && cleanImgCount === decodedImgCount) {
              isCommentValid = true;
            }
          }
        } catch {}
      }

      if (isCommentValid) {
        try {
          const decodedMarkdown = fromBase64(encodedMarkdown.trim());
          if (decodedMarkdown) {
            if (options?.getAttachmentUrl && options.attachments && options.attachments.length > 0) {
              return healLegacyImagePlaceholders(decodedMarkdown, options);
            }
            return decodedMarkdown;
          }
        } catch (e) {
          console.warn('Failed to decode embedded markdown comment, falling back to turndown', e);
        }
      } else {
        console.info('Note Station HTML was modified externally in official client, using Turndown to convert latest content.');
      }
    }

    // Fallback for legacy notes or notes edited in official client
    let cleanHtml = cleanHtmlWithoutComment;

    // Pre-process elements with line-through styling from official Synology TinyMCE
    // 1. Block-level elements with line-through (e.g. <p style="text-decoration: line-through;">text</p>)
    cleanHtml = cleanHtml.replace(/<(p|div|h[1-6]|li)([^>]*)style=["']([^"']*text-decoration(?:-line)?\s*:\s*[^"';]*line-through[^"']*)["']([^>]*)>([\s\S]*?)<\/\1>/gi,
      '<$1$2style="$3"$4><del>$5</del></$1>'
    );

    // Filter image attachments for matching
    const imgAtts = options?.attachments?.filter(a => {
      if (!a) return false;
      const aType = a.type || '';
      const aName = a.name || '';
      return aType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(aName);
    }) || [];
    let imgCounter = 0;

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

        // 2. Official Synology image object: extract ref, data-ref, or file_id
        const isOfficialSynoImg = imgTag.includes('syno-notestation-image-object') || imgTag.includes('transparent.gif');
        const refMatch = imgTag.match(/(?:ref|data-ref|file_id)=["']([^"']+)["']/i);
        let ref = refMatch ? refMatch[1] : '';

        // If no explicit ref attr, check if src contains file_id
        if (!ref) {
          const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
          if (srcMatch && srcMatch[1]) {
            const fileIdMatch = srcMatch[1].match(/(?:[?&]|%26)file_id(?:=|%3D)([^&"'>\s%]+)/i);
            if (fileIdMatch && fileIdMatch[1]) {
              ref = fileIdMatch[1];
            }
          }
        }

        const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
        const altText = altMatch ? altMatch[1] : '';
        const cleanName = safeExtractImageName(ref) || altText || '图片';

        if (isOfficialSynoImg || ref || (imgAtts.length > 0 && imgTag.includes('syno-notestation'))) {
          if (options?.getAttachmentUrl) {
            let matchedAtt: any = null;
            if (options.attachments && options.attachments.length > 0) {
              matchedAtt = options.attachments.find(a => {
                if (!a) return false;
                const aName = a.name || '';
                const aRef = a.ref || '';
                const aId = a.file_id || a.id || '';
                return (
                  (ref && aRef && aRef === ref) ||
                  (ref && aId && aId === ref) ||
                  (altText && aName && (aName === altText || aName.startsWith(altText) || altText.startsWith(aName))) ||
                  (cleanName && aName && (aName === cleanName || cleanName.includes(aName) || aName.includes(cleanName)))
                );
              });

              // Fallback to single image or N-th image in attachments
              if (!matchedAtt) {
                if (imgAtts.length === 1) {
                  matchedAtt = imgAtts[0];
                } else if (imgCounter < imgAtts.length) {
                  matchedAtt = imgAtts[imgCounter];
                }
              }
            }

            imgCounter++;
            const fileId = matchedAtt ? (matchedAtt.file_id || matchedAtt.id || ref) : ref;
            const filename = matchedAtt?.name || altText || cleanName || 'image.png';
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
