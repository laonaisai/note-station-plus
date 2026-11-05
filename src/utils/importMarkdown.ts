export interface ParsedMarkdownImport {
  title: string;
  content: string;
  tags: string[];
  notebookTitle?: string;
  rawContent: string;
}

/**
 * Parse Markdown string, extracting YAML frontmatter (title, tags, notebook) if present,
 * or extracting first H1 heading, or fallback to default filename.
 */
export function parseImportMarkdown(rawContent: string, defaultFilename?: string): ParsedMarkdownImport {
  const content = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let title = '';
  let notebookTitle: string | undefined = undefined;
  const tags: string[] = [];
  let body = content;

  // 1. Check for YAML Frontmatter (starts with --- and ends with ---)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (frontmatterMatch) {
    const yamlBlock = frontmatterMatch[1];
    body = frontmatterMatch[2].trimStart();

    const yamlLines = yamlBlock.split('\n');
    let inTagsList = false;

    for (const line of yamlLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match title: "..." or title: ...
      const titleMatch = trimmed.match(/^title:\s*(?:"(.*)"|'(.*)'|(.*))$/);
      if (titleMatch) {
        title = (titleMatch[1] || titleMatch[2] || titleMatch[3] || '').trim();
        inTagsList = false;
        continue;
      }

      // Match notebook: "..." or notebook: ...
      const nbMatch = trimmed.match(/^notebook:\s*(?:"(.*)"|'(.*)'|(.*))$/);
      if (nbMatch) {
        notebookTitle = (nbMatch[1] || nbMatch[2] || nbMatch[3] || '').trim();
        inTagsList = false;
        continue;
      }

      // Match tags: [tag1, tag2]
      const tagsArrayMatch = trimmed.match(/^tags:\s*\[(.*)\]$/);
      if (tagsArrayMatch) {
        inTagsList = false;
        const rawItems = tagsArrayMatch[1].split(',');
        for (const item of rawItems) {
          const t = item.replace(/['"]/g, '').trim();
          if (t && !tags.includes(t)) tags.push(t);
        }
        continue;
      }

      // Match start of tags list: "tags:"
      if (/^tags:\s*$/.test(trimmed)) {
        inTagsList = true;
        continue;
      }

      // Match tags list item: "- tag"
      if (inTagsList) {
        const itemMatch = trimmed.match(/^-\s*(?:"(.*)"|'(.*)'|(.*))$/);
        if (itemMatch) {
          const t = (itemMatch[1] || itemMatch[2] || itemMatch[3] || '').trim();
          if (t && !tags.includes(t)) tags.push(t);
          continue;
        } else {
          inTagsList = false;
        }
      }
    }
  }

  // 2. If no title in frontmatter, try to find the first H1 heading (# ...)
  if (!title) {
    const h1Match = body.match(/^#\s+([^\n]+)/m);
    if (h1Match && h1Match[1].trim()) {
      title = h1Match[1].trim();
    }
  }

  // 3. Fallback to defaultFilename (strip .md / .markdown extension)
  if (!title && defaultFilename) {
    title = defaultFilename.replace(/\.(md|markdown|txt)$/i, '').trim();
  }

  // 4. Ultimate fallback
  if (!title) {
    title = '导入便签';
  }

  return {
    title,
    content: body,
    tags,
    notebookTitle,
    rawContent
  };
}

/**
 * Read text content from a File object and parse as Markdown import
 */
export async function readMarkdownFile(file: File): Promise<ParsedMarkdownImport> {
  const text = await file.text();
  return parseImportMarkdown(text, file.name);
}
