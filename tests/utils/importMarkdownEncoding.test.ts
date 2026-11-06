import { describe, it, expect } from 'vitest';
import { detectAndDecodeText, detectNonUtf8Encoding } from '@/utils/importMarkdown';
import iconv from 'iconv-lite';

describe('Markdown Import: Multi-encoding character set detection and decoding', () => {
  const tradChineseText = `# 繁體中文便箋測試
這是一篇繁體中文筆記，測試字元集自動識別與無亂碼解碼。
- 資料庫、電腦、網絡
- 與、或、非
- 繁體字檢驗：國際化、檔案、檢視
`;

  const japaneseSjisText = `# 日本語ノート (Shift_JIS)
これは日本語のノートです。文字コードの自動判定テストです。
- ひらがな: あいうえお かきくけこ
- カタカナ: アイウエオ カキクケコ
- 漢字: 日本語、機能、設定、保存
`;

  const japaneseEucText = `# 日本語ノート (EUC-JP)
EUC-JP文字コードのテストです。日本語の自動判定を行います。
- 日本語の文章です。
- 保存機能とプレビュー表示の検証。
`;

  const simpChineseText = `# 简体中文便签测试
这是一篇简体中文笔记，测试字符集自动识别。
- 数据库、计算机、网络
- 保存功能与历史记录
`;

  it('1. 应能准确识别并解码 Big5 (繁体中文) 编码的 Markdown 文件', () => {
    const big5Buffer = iconv.encode(tradChineseText, 'big5');
    const detected = detectNonUtf8Encoding(new Uint8Array(big5Buffer));
    expect(detected).toBe('big5');

    const result = detectAndDecodeText(big5Buffer);
    expect(result.encoding).toBe('big5');
    expect(result.text).toContain('繁體中文便箋測試');
    expect(result.text).toContain('資料庫、電腦、網絡');
  });

  it('2. 应能准确识别并解码 Shift_JIS (日语) 编码的 Markdown 文件', () => {
    const sjisBuffer = iconv.encode(japaneseSjisText, 'shift_jis');
    const detected = detectNonUtf8Encoding(new Uint8Array(sjisBuffer));
    expect(detected).toBe('shift_jis');

    const result = detectAndDecodeText(sjisBuffer);
    expect(result.encoding).toBe('shift_jis');
    expect(result.text).toContain('これは日本語のノートです');
    expect(result.text).toContain('日本語、機能、設定、保存');
  });

  it('3. 应能准确识别并解码 EUC-JP (日语) 编码的 Markdown 文件', () => {
    const eucBuffer = iconv.encode(japaneseEucText, 'euc-jp');
    const detected = detectNonUtf8Encoding(new Uint8Array(eucBuffer));
    expect(detected).toBe('euc-jp');

    const result = detectAndDecodeText(eucBuffer);
    expect(result.encoding).toBe('euc-jp');
    expect(result.text).toContain('EUC-JP文字コードのテストです');
  });

  it('4. 应能准确识别并解码 GBK / GB18030 (简体中文) 编码的 Markdown 文件', () => {
    const gbkBuffer = iconv.encode(simpChineseText, 'gbk');
    const detected = detectNonUtf8Encoding(new Uint8Array(gbkBuffer));
    expect(detected).toBe('gb18030');

    const result = detectAndDecodeText(gbkBuffer);
    expect(result.encoding).toBe('gb18030');
    expect(result.text).toContain('简体中文便签测试');
    expect(result.text).toContain('数据库、计算机、网络');
  });

  it('5. 标准 UTF-8 (含 BOM / 不含 BOM) 应最高优先级准确识别', () => {
    const utf8Buffer = Buffer.from(tradChineseText, 'utf8');
    const resNoBom = detectAndDecodeText(utf8Buffer);
    expect(resNoBom.encoding).toBe('utf-8');
    expect(resNoBom.hasBom).toBe(false);
    expect(resNoBom.text).toContain('繁體中文便箋測試');

    const utf8BomBuffer = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), utf8Buffer]);
    const resBom = detectAndDecodeText(utf8BomBuffer);
    expect(resBom.encoding).toBe('utf-8');
    expect(resBom.hasBom).toBe(true);
    expect(resBom.text).toContain('繁體中文便箋測試');
  });

  it('6. 支持用户显式强制指定字符编码强制解析', () => {
    const big5Buffer = iconv.encode(tradChineseText, 'big5');
    const forced = detectAndDecodeText(big5Buffer, 'big5');
    expect(forced.encoding).toBe('big5');
    expect(forced.text).toContain('繁體中文便箋測試');
  });
});
