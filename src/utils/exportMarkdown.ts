import JSZip from 'jszip';
import { SynoNote } from '@/types/synology';

/**
 * Sanitize filename to ensure compatibility across Windows, Linux and macOS
 */
export function sanitizeFilename(name: string): string {
  if (!name) return '无标题便签';
  return name.replace(/[\\/:*?"<>|\r\n]/g, '_').trim() || '无标题便签';
}

/**
 * Format timestamp to readable local string
 */
function formatDateTime(timestamp?: number): string {
  if (!timestamp) return new Date().toISOString();
  return new Date(timestamp * 1000).toLocaleString('zh-CN', { hour12: false });
}

/**
 * Build Markdown content with optional YAML Frontmatter metadata
 */
export function buildExportMarkdownContent(
  note: SynoNote,
  notebookTitle?: string,
  withFrontmatter = true
): string {
  const content = note.markdownContent || '';

  if (!withFrontmatter) {
    return content;
  }

  const tagsList = (note.tag || []).map(t => `  - ${t}`).join('\n');
  const frontmatter = [
    '---',
    `title: "${(note.title || '无标题便签').replace(/"/g, '\\"')}"`,
    `created: "${formatDateTime(note.ctime)}"`,
    `updated: "${formatDateTime(note.mtime || note.ctime)}"`,
    notebookTitle ? `notebook: "${notebookTitle.replace(/"/g, '\\"')}"` : '',
    note.tag && note.tag.length > 0 ? `tags:\n${tagsList}` : 'tags: []',
    '---\n\n'
  ].filter(Boolean).join('\n');

  return frontmatter + content;
}

/**
 * Triggers a browser/Electron file download via Blob URL
 */
export function triggerFileDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export a single note as a .md file
 */
export function exportSingleNoteAsMarkdown(
  note: SynoNote,
  notebookTitle?: string,
  withFrontmatter = true
): void {
  const mdContent = buildExportMarkdownContent(note, notebookTitle, withFrontmatter);
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const filename = `${sanitizeFilename(note.title || '无标题便签')}.md`;
  triggerFileDownload(filename, blob);
}

/**
 * Export multiple notes or an entire notebook as a .zip package containing .md files
 */
export async function exportNotebookAsZip(
  notebookTitle: string,
  notes: SynoNote[],
  withFrontmatter = true
): Promise<void> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const note of notes) {
    let baseName = sanitizeFilename(note.title || '便签');
    let finalName = `${baseName}.md`;
    let counter = 1;

    // Avoid duplicate filenames in zip
    while (usedNames.has(finalName)) {
      finalName = `${baseName} (${counter++}).md`;
    }
    usedNames.add(finalName);

    const mdContent = buildExportMarkdownContent(note, notebookTitle, withFrontmatter);
    zip.file(finalName, mdContent);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFilename = `${sanitizeFilename(notebookTitle || '笔记本')}_Markdown导出.zip`;
  triggerFileDownload(zipFilename, zipBlob);
}
