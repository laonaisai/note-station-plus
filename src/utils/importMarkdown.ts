export interface ParsedMarkdownImport {
  title: string;
  content: string;
  tags: string[];
  notebookTitle?: string;
  rawContent: string;
}

export interface DecodeResult {
  text: string;
  encoding: 'utf-8' | 'gb18030' | 'utf-16le' | 'utf-16be';
  hasBom: boolean;
}

/**
 * Automatically detect encoding (UTF-8, GB2312/GBK/GB18030, UTF-16) and decode byte buffer.
 * If forceEncoding is provided, uses that encoding instead.
 */
export function detectAndDecodeText(
  buffer: ArrayBuffer | Uint8Array,
  forceEncoding?: string
): DecodeResult {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // 1. Check Byte Order Marks (BOM)
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    const raw = bytes.slice(3);
    const enc = (forceEncoding || 'utf-8') as 'utf-8';
    return {
      text: new TextDecoder(enc).decode(raw),
      encoding: 'utf-8',
      hasBom: true
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    const raw = bytes.slice(2);
    const enc = (forceEncoding || 'utf-16le') as 'utf-16le';
    return {
      text: new TextDecoder(enc).decode(raw),
      encoding: 'utf-16le',
      hasBom: true
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    const raw = bytes.slice(2);
    const enc = (forceEncoding || 'utf-16be') as 'utf-16be';
    return {
      text: new TextDecoder(enc).decode(raw),
      encoding: 'utf-16be',
      hasBom: true
    };
  }

  // If user explicitly forced an encoding, decode directly
  if (forceEncoding) {
    try {
      const decoder = new TextDecoder(forceEncoding);
      return {
        text: decoder.decode(bytes),
        encoding: forceEncoding as any,
        hasBom: false
      };
    } catch {
      // Fallback if unsupported encoding
    }
  }

  // 2. Strict UTF-8 validation
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    const text = utf8Decoder.decode(bytes);
    return {
      text,
      encoding: 'utf-8',
      hasBom: false
    };
  } catch {
    // 3. Fallback to GB18030 (which encompasses GB2312 and GBK)
    try {
      const gbkDecoder = new TextDecoder('gb18030');
      const text = gbkDecoder.decode(bytes);
      return {
        text,
        encoding: 'gb18030',
        hasBom: false
      };
    } catch {
      // Ultimate fallback to standard UTF-8 (with replacement characters if any)
      return {
        text: new TextDecoder('utf-8').decode(bytes),
        encoding: 'utf-8',
        hasBom: false
      };
    }
  }
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
 * Read text content from a File object and parse as Markdown import with smart encoding detection.
 */
export async function readMarkdownFile(
  file: File,
  forceEncoding?: string
): Promise<ParsedMarkdownImport & { encoding: string; hasBom: boolean }> {
  const arrayBuffer = await file.arrayBuffer();
  const { text, encoding, hasBom } = detectAndDecodeText(arrayBuffer, forceEncoding);
  const parsed = parseImportMarkdown(text, file.name);
  return {
    ...parsed,
    encoding,
    hasBom
  };
}
