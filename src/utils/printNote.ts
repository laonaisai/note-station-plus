import MarkdownIt from 'markdown-it';
import type { SynoNote } from '@/types/synology';
import { healLegacyImagePlaceholders } from '@/utils/markdown';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

/**
 * Builds clean, printable standalone HTML string for a note
 */
export function buildPrintHtml(
  note: SynoNote,
  notebookTitle?: string,
  markdownOverride?: string,
  getAttachmentUrl?: (fileId: string, filename?: string) => string,
  includeMetadata = true
): string {
  const title = note.title || '无标题便签';
  const ctimeStr = note.ctime ? new Date(note.ctime * 1000).toLocaleString() : '';
  const mtimeStr = note.mtime ? new Date(note.mtime * 1000).toLocaleString() : '';
  const tagsStr = (note.tag || []).join(', ');

  let rawMarkdown = markdownOverride ?? note.markdownContent ?? '';
  if (note.attachment && note.attachment.length > 0 && getAttachmentUrl) {
    rawMarkdown = healLegacyImagePlaceholders(rawMarkdown, {
      attachments: note.attachment,
      getAttachmentUrl
    });
  }

  const renderedContent = rawMarkdown
    ? md.render(rawMarkdown)
    : (note.content || '<p style="color: #94a3b8; font-style: italic;">（此便签正文为空）</p>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page {
      margin: 18mm 15mm;
      size: A4 portrait;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      color: #1e293b;
      line-height: 1.65;
      padding: 24px;
      margin: 0;
      background-color: #fff;
    }
    h1.note-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 10px 0;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      word-break: break-word;
    }
    .note-metadata {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      background-color: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #f1f5f9;
    }
    .note-metadata span {
      display: inline-flex;
      align-items: center;
    }
    .note-metadata b {
      color: #475569;
      margin-right: 4px;
    }
    .note-body {
      font-size: 14px;
      color: #334155;
      word-break: break-word;
    }
    .note-body img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 8px 0;
      display: block;
    }
    .note-body table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      font-size: 13px;
    }
    .note-body th, .note-body td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    .note-body th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: #1e293b;
    }
    .note-body tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .note-body pre, .note-body code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-color: #f1f5f9;
      border-radius: 4px;
    }
    .note-body code {
      padding: 2px 6px;
      font-size: 13px;
    }
    .note-body pre {
      padding: 12px 14px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      border: 1px solid #e2e8f0;
      margin: 14px 0;
    }
    .note-body blockquote {
      border-left: 4px solid #3b82f6;
      margin: 16px 0;
      padding: 4px 0 4px 14px;
      color: #475569;
      background-color: #f8fafc;
      border-radius: 0 4px 4px 0;
    }
    .note-body ul, .note-body ol {
      padding-left: 24px;
      margin: 12px 0;
    }
    .note-body li {
      margin-bottom: 4px;
    }
    .note-body hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <h1 class="note-title">${title}</h1>
  ${includeMetadata ? `
  <div class="note-metadata">
    ${notebookTitle ? `<span><b>笔记本:</b> ${notebookTitle}</span>` : ''}
    ${ctimeStr ? `<span><b>创建时间:</b> ${ctimeStr}</span>` : ''}
    ${mtimeStr ? `<span><b>修改时间:</b> ${mtimeStr}</span>` : ''}
    ${tagsStr ? `<span><b>标签:</b> ${tagsStr}</span>` : ''}
  </div>` : ''}
  <div class="note-body">
    ${renderedContent}
  </div>
</body>
</html>`;
}

/**
 * Executes printing of HTML content using an offscreen iframe with standard dimensions
 */
export function executeIframePrint(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Iframe print failed:', e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 350);
}

/**
 * Print note cleanly
 */
export function printNote(
  note: SynoNote,
  notebookTitle?: string,
  markdownOverride?: string,
  getAttachmentUrl?: (fileId: string, filename?: string) => string
): void {
  if (!note) return;
  const html = buildPrintHtml(note, notebookTitle, markdownOverride, getAttachmentUrl);
  executeIframePrint(html);
}
