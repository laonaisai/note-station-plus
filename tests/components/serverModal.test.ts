import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('服务配置表单 (ServerModal) 与 Tab 焦点导航规范测试', () => {
  const serverModalPath = path.resolve(__dirname, '../../src/components/ServerModal.vue');
  const markdownEditorPath = path.resolve(__dirname, '../../src/components/MarkdownEditor.vue');

  it('1. ServerModal 输入框应配置连贯递增的 tabindex 顺序以支持 Tab 键顺序切换焦点', () => {
    const content = fs.readFileSync(serverModalPath, 'utf-8');

    // 检查表单输入项与操作按钮是否具有明确的 tabindex
    expect(content).toContain('v-model="form.alias"');
    expect(content).toContain('tabindex="1"');

    expect(content).toContain('v-model="form.serverUrl"');
    expect(content).toContain('tabindex="2"');

    expect(content).toContain('v-model="form.account"');
    expect(content).toContain('tabindex="3"');

    expect(content).toContain('v-model="form.password"');
    expect(content).toContain('tabindex="4"');

    expect(content).toContain('v-model="form.allowInsecureSSL"');
    expect(content).toContain('tabindex="5"');

    expect(content).toContain('tabindex="6"'); // 测试连接按钮
    expect(content).toContain('tabindex="7"'); // 取消按钮
    expect(content).toContain('tabindex="8"'); // 保存按钮
  });

  it('2. ServerModal 应包含打开弹窗后自动聚焦首个输入框的逻辑', () => {
    const content = fs.readFileSync(serverModalPath, 'utf-8');
    expect(content).toContain('aliasInputRef');
    expect(content).toContain('aliasInputRef.value?.focus()');
  });

  it('3. MarkdownEditor 不应在 window 上全局拦截 Tab 键导致所有弹窗表单 Tab 失效', () => {
    const content = fs.readFileSync(markdownEditorPath, 'utf-8');

    // 验证 Tab 键缩进仅绑定到 textarea 局部事件，严禁在全局 window 监听器中拦截 Tab 键
    expect(content).toContain('handleTextareaKeydown');
    expect(content).toContain('@keydown="handleTextareaKeydown"');

    // 确保 handleGlobalKeydown 仅处理 Ctrl+S，不包含 Tab 键拦截
    const globalKeydownMatch = content.match(/function handleGlobalKeydown\([\s\S]*?\n\}/);
    expect(globalKeydownMatch).not.toBeNull();
    const globalKeydownBody = globalKeydownMatch ? globalKeydownMatch[0] : '';
    expect(globalKeydownBody).not.toContain("e.key === 'Tab'");
  });
});
