import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('NoteInfoModal & History Stack Behavior', () => {
  it('NoteInfoModal handleOpenHistory does not invoke close(), keeping it visible when HistoryModal opens', () => {
    const modalPath = path.resolve(__dirname, '../../src/components/NoteInfoModal.vue');
    const content = fs.readFileSync(modalPath, 'utf-8');

    // Find handleOpenHistory definition
    const match = content.match(/function handleOpenHistory\(\) \{([\s\S]*?)\}/);
    expect(match).toBeDefined();
    const fnBody = match![1];

    // Verifies it emits open-history
    expect(fnBody).toContain("emit('open-history'");
    // Verifies it does NOT call close()
    expect(fnBody).not.toMatch(/\bclose\s*\(\s*\)/);
  });

  it('HistoryModal uses z-[60] to cleanly layer above NoteInfoModal (z-50)', () => {
    const historyModalPath = path.resolve(__dirname, '../../src/components/HistoryModal.vue');
    const content = fs.readFileSync(historyModalPath, 'utf-8');

    expect(content).toContain('z-[60]');
  });
});
