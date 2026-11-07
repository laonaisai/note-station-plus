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

  it('converts Synology image URLs in Markdown to official native Synology image objects on save', () => {
    const mdText = `## 包含图片的便签\n\n![测试图片](http://172.28.10.180:5000/webapi/entry.cgi?api=SYNO.NoteStation.Note&version=3&method=download&object_id=note_123&file_id=file_999&format=raw&_sid=TEMP_SID_XYZ)\n\n后续正文`;
    const attachments = [
      {
        id: 'file_999',
        file_id: 'file_999',
        name: '测试图片.png',
        ref: 'MTcwOTk1OTU0ODc4M3NjcmVlbnNob3QucG5n'
      }
    ];

    const html = markdownToNoteHtml(mdText, {
      objectId: 'note_123',
      attachments
    });

    // Verify official Synology image object was created
    expect(html).toContain('class="syno-notestation-image-object"');
    expect(html).toContain('src="webman/3rdparty/NoteStation/images/transparent.gif"');
    expect(html).toContain('ref="MTcwOTk1OTU0ODc4M3NjcmVlbnNob3QucG5n"');
    // Ensure temporary local server IP and _sid are stripped from rendered HTML for official client compatibility
    expect(html.split('<!-- note-station-plus:markdown')[0]).not.toContain('172.28.10.180');
    expect(html.split('<!-- note-station-plus:markdown')[0]).not.toContain('TEMP_SID_XYZ');
  });

  it('handles malformed base64 and special character test content safely without throwing', () => {
    // Malformed base64 that would otherwise crash atob/decodeURIComponent
    const badRef = '%%%invalid-base64%%%';
    expect(() => safeExtractImageName(badRef)).not.toThrow();

    const brokenMarkdown = `测试正文\n\n🖼️ [图片: %%%bad_name%%%]\n\n🖼️ [图片: ]`;
    expect(() => healLegacyImagePlaceholders(brokenMarkdown, {
      attachments: [{ id: '1', file_id: '1', name: '' } as any],
      getAttachmentUrl: (id) => `http://syno/${id}`
    })).not.toThrow();
  });

  it('detects external modifications made by official Synology clients and parses latest content with Turndown', () => {
    // 1. Initial note saved in Note Station Plus
    const originalMd = '## 原始标题\n\n这是原始便签内容';
    const htmlFromPlus = markdownToNoteHtml(originalMd);
    expect(htmlFromPlus).toContain('hash=');

    // 2. Official Synology client edits note: modifies HTML text and inserts an image, while preserving comment
    const officialEditedHtml = `<p>这是官方客户端修改后的新正文</p><p><img class="syno-notestation-image-object" src="webman/3rdparty/NoteStation/images/transparent.gif" ref="MTcwOTk1OTU0ODc4M3NjcmVlbnNob3QucG5n" alt="new_shot.png" /></p>\n` +
      htmlFromPlus.substring(htmlFromPlus.indexOf('<!-- note-station-plus:markdown'));

    const attachments = [
      {
        id: 'file_777',
        file_id: 'file_777',
        name: 'new_shot.png',
        ref: 'MTcwOTk1OTU0ODc4M3NjcmVlbnNob3QucG5n',
        size: 2048,
        type: 'image/png'
      }
    ];

    const getAttachmentUrl = (fileId: string, filename?: string) => `https://nas/download?file_id=${fileId}&name=${filename}`;

    const parsedMd = noteHtmlToMarkdown(officialEditedHtml, {
      attachments,
      getAttachmentUrl
    });

    // Should NOT return the old markdown ("这是原始便签内容")
    expect(parsedMd).not.toContain('这是原始便签内容');
    // Should contain official client's edited text and newly inserted image
    expect(parsedMd).toContain('这是官方客户端修改后的新正文');
    expect(parsedMd).toContain('![new_shot.png](https://nas/download?file_id=file_777&name=new_shot.png)');
  });
});

