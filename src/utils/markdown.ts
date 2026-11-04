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
 */
export function noteHtmlToMarkdown(html: string): string {
  if (!html) return '';

  const commentRegex = /<!-- note-station-plus:markdown\n([\s\S]*?)\n-->/;
  const match = html.match(commentRegex);

  if (match && match[1]) {
    try {
      return fromBase64(match[1].trim());
    } catch (e) {
      console.warn('Failed to decode embedded markdown comment, falling back to turndown', e);
    }
  }

  // Fallback for legacy notes or notes edited in official client
  // Strip out any broken comment artifacts if any
  const cleanHtml = html.replace(commentRegex, '');
  return turndown.turndown(cleanHtml);
}

