export interface ParsedMarkdownImport {
  title: string;
  content: string;
  tags: string[];
  notebookTitle?: string;
  rawContent: string;
}

export type SupportedEncoding =
  | 'utf-8'
  | 'big5'
  | 'shift_jis'
  | 'euc-jp'
  | 'gb18030'
  | 'utf-16le'
  | 'utf-16be';

export interface DecodeResult {
  text: string;
  encoding: SupportedEncoding;
  hasBom: boolean;
}

// Common Japanese Hiragana particles in Shift_JIS: の, は, に, を, た, で, す, る, て, い, こ, れ, か
const SJIS_COMMON_HIRAGANA = new Set([
  0x82cc, // の
  0x82cd, // は
  0x82c9, // に
  0x82f0, // を
  0x82bd, // た
  0x82c5, // で
  0x82b7, // す
  0x82e9, // る
  0x82c4, // て
  0x82a2, // い
  0x82b1, // こ
  0x82ea, // れ
  0x82a9  // か
]);

// Common Japanese Hiragana particles in EUC-JP
const EUC_COMMON_HIRAGANA = new Set([
  0xa4ce, // の
  0xa4cf, // は
  0xa4cb, // に
  0xa4f2, // を
  0xa4bf, // た
  0xa4c7, // で
  0xa4b9, // す
  0xa4eb, // る
  0xa4c4, // て
  0xa4a2, // い
  0xa4b1, // こ
  0xa4ea, // れ
  0xa4a9  // か
]);

/**
 * Heuristically detect whether a non-UTF8 buffer is Big5, Shift_JIS, EUC-JP, or GB18030
 */
export function detectNonUtf8Encoding(bytes: Uint8Array): SupportedEncoding {
  let sjisScore = 0;
  let eucScore = 0;
  let big5Score = 0;
  let gbkScore = 0;
  let big5Invalids = 0;

  for (let i = 0; i < bytes.length - 1; i++) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const word = (b1 << 8) | b2;

    if (SJIS_COMMON_HIRAGANA.has(word)) {
      sjisScore += 10;
    }
    if (EUC_COMMON_HIRAGANA.has(word)) {
      eucScore += 10;
    }

    // Katakana in Shift_JIS: 0x8340 - 0x8396
    if (b1 === 0x83 && b2 >= 0x40 && b2 <= 0x96) {
      sjisScore += 5;
    }

    // Katakana in EUC-JP: 0xA5A1 - 0xA5F6
    if (b1 === 0xA5 && b2 >= 0xA1 && b2 <= 0xF6) {
      eucScore += 5;
    }

    // Check Big5: lead byte 0xA1-0xF9, trail byte 0x40-0x7E or 0xA1-0xFE
    // Note: trail byte 0x80-0xA0 is completely ILLEGAL in Big5!
    if (b1 >= 0xA1 && b1 <= 0xF9) {
      if ((b2 >= 0x40 && b2 <= 0x7E) || (b2 >= 0xA1 && b2 <= 0xFE)) {
        if (b1 >= 0xA4 && b1 <= 0xC6) {
          big5Score += 2; // Common traditional Chinese character block
        } else {
          big5Score += 1;
        }
      } else if (b2 >= 0x80 && b2 <= 0xA0) {
        big5Invalids++;
      }
    }

    // GBK level 1 simplified: 0xB0A1 - 0xD7FE
    if (b1 >= 0xB0 && b1 <= 0xD7 && b2 >= 0xA1 && b2 <= 0xFE) {
      gbkScore += 2;
    } else if (b1 >= 0xD8 && b1 <= 0xF7 && b2 >= 0xA1 && b2 <= 0xFE) {
      gbkScore += 1;
    }
  }

  if (sjisScore >= 10 && sjisScore > eucScore) {
    return 'shift_jis';
  }
  if (eucScore >= 10 && eucScore > sjisScore) {
    return 'euc-jp';
  }
  if (big5Invalids > 0) {
    return 'gb18030';
  }
  if (big5Score > gbkScore) {
    return 'big5';
  }
  return 'gb18030';
}

/**
 * Automatically detect encoding (UTF-8, Big5, Shift_JIS, EUC-JP, GB2312/GBK/GB18030, UTF-16) and decode byte buffer.
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
    // 3. Fallback to smart heuristic detection (Big5, Shift_JIS, EUC-JP, GB18030)
    const detectedEncoding = detectNonUtf8Encoding(bytes);
    try {
      const decoder = new TextDecoder(detectedEncoding);
      const text = decoder.decode(bytes);
      return {
        text,
        encoding: detectedEncoding,
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
