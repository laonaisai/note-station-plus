import MarkdownIt from 'markdown-it';
import type { SynoNote } from '@/types/synology';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

/**
 * Print note cleanly using a temporary hidden iframe without disturbing the UI
 */
export function printNote(note: SynoNote, notebookTitle?: string): void {
  if (!note) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const title = note.title || '无标题便签';
  const ctimeStr = note.ctime ? new Date(note.ctime * 1000).toLocaleString() : '';
  const mtimeStr = note.mtime ? new Date(note.mtime * 1000).toLocaleString() : '';
  const tagsStr = (note.tag || []).join(', ');
  const renderedContent = note.markdownContent ? md.render(note.markdownContent) : (note.content || '');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @page {
          margin: 20mm 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1e293b;
          line-height: 1.6;
          padding: 24px;
          margin: 0;
        }
        h1.note-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #0f172a;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 12px;
        }
        .note-metadata {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .note-body {
          font-size: 14px;
          color: #334155;
        }
        .note-body img {
          max-width: 100%;
          height: auto;
        }
        .note-body table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }
        .note-body th, .note-body td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          text-align: left;
        }
        .note-body th {
          background-color: #f8fafc;
        }
        .note-body pre, .note-body code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          background-color: #f1f5f9;
          border-radius: 4px;
        }
        .note-body code {
          padding: 2px 5px;
          font-size: 13px;
        }
        .note-body pre {
          padding: 12px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .note-body blockquote {
          border-left: 4px solid #94a3b8;
          margin: 16px 0;
          padding-left: 16px;
          color: #475569;
        }
      </style>
    </head>
    <body>
      <h1 class="note-title">${title}</h1>
      <div class="note-metadata">
        ${notebookTitle ? `<span><b>笔记本:</b> ${notebookTitle}</span>` : ''}
        ${ctimeStr ? `<span><b>创建时间:</b> ${ctimeStr}</span>` : ''}
        ${mtimeStr ? `<span><b>修改时间:</b> ${mtimeStr}</span>` : ''}
        ${tagsStr ? `<span><b>标签:</b> ${tagsStr}</span>` : ''}
      </div>
      <div class="note-body">
        ${renderedContent}
      </div>
    </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print failed:', e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  }, 250);
}
