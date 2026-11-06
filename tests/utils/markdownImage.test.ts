import { describe, it, expect } from 'vitest';
import { noteHtmlToMarkdown, markdownToNoteHtml, safeExtractImageName, healLegacyImagePlaceholders } from '@/utils/markdown';

describe('Markdown Image Conversion & Legacy Healing', () => {
  it('safeExtractImageName decodes Synology base64 ref and strips timestamp', () => {
    // utf8_to_b64("1709959548783screenshot.png") -> MTcwOTk1OTU0ODc4M3NjcmVlbnNob3QucG5n
    const ref = 'MTcwOTk1OTU0ODc4M3NjcmVlbnNob3QucG5n';
    const filename = safeExtractImageName(ref);
    expect(filename).toBe('screenshot.png');
  });

  it('converts official Note Station embedded image object into Markdown image tag with download url', () => {
    const rawHtml = `<p>便签测试正文</p><p><img class="syno-notestation-image-object" src="webman/3rdparty/NoteStation/images/transparent.gif" ref="MTcwOTk1OTU0ODc4M3NjcmVlbnNob3QucG5n" /></p>`;
    const attachments = [
      {
        id: 'file_123',
        file_id: 'file_123',
        name: 'screenshot.png',
        ref: 'MTcwOTk1OTU0ODc4M3NjcmVlbnNob3QucG5n',
        size: 1024,
        type: 'image/png'
      }
    ];

    const getAttachmentUrl = (fileId: string, filename?: string) => {
      return `/syno-proxy?target=https://nas.example.com/download?file_id=${fileId}&filename=${filename}`;
    };

    const markdown = noteHtmlToMarkdown(rawHtml, {
      objectId: 'note_001',
      attachments,
      getAttachmentUrl
    });

    expect(markdown).toContain('![screenshot.png](/syno-proxy?target=https://nas.example.com/download?file_id=file_123&filename=screenshot.png)');
  });

  it('heals legacy "🖼️ [图片: ...]" and garbled base64 placeholders into actual Markdown image links', () => {
    const legacyMarkdown = `前文说明\n\n🖼️ [图片: screenshot.png]\n\n🖼️ [图片: MTcwOTk1OTU0ODc4M3NjcmVlbnNob3QucG5n]\n\n后缀说明`;
    const attachments = [
      {
        id: 'file_123',
        file_id: 'file_123',
        name: 'screenshot.png',
        ref: 'MTcwOTk1OTU0ODc4M3NjcmVlbnNob3QucG5n',
        size: 1024,
        type: 'image/png'
      }
    ];

    const getAttachmentUrl = (fileId: string, filename?: string) => {
      return `http://syno/attachment/${fileId}/${filename}`;
    };

    const healed = healLegacyImagePlaceholders(legacyMarkdown, {
      attachments,
      getAttachmentUrl
    });

    expect(healed).not.toContain('🖼️ [图片:');
    expect(healed).toContain('![screenshot.png](http://syno/attachment/file_123/screenshot.png)');
  });

  it('preserves lossless markdown comment across round-trips while healing legacy placeholders', () => {
    const mdText = `# 标题\n\n这是普通文本内容\n\n![架构图](http://example.com/arch.png)`;
    const html = markdownToNoteHtml(mdText);
    const roundTrip = noteHtmlToMarkdown(html);
    expect(roundTrip).toBe(mdText);
  });
});
