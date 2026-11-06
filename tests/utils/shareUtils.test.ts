import { describe, it, expect } from 'vitest';
import { isNoteShared } from '@/utils/shareUtils';
import { SynoNote } from '@/types/synology';

describe('便签共享状态判定 (shareUtils.isNoteShared)', () => {
  const baseNote: SynoNote = {
    object_id: 'note_123',
    parent_id: 'nb_1',
    title: '测试便签',
    brief: '',
    content: '<p>测试内容</p>',
    ctime: 1700000000,
    mtime: 1700000000,
    ver: '1',
    tag: []
  };

  it('1. 空便签或无 acl 时返回 false', () => {
    expect(isNoteShared(null)).toBe(false);
    expect(isNoteShared(undefined)).toBe(false);
    expect(isNoteShared(baseNote)).toBe(false);
    expect(isNoteShared({ ...baseNote, acl: {} })).toBe(false);
  });

  it('2. acl.enabled 为 false 时即使包含字段也返回 false', () => {
    const note: SynoNote = {
      ...baseNote,
      acl: {
        enabled: false,
        public: { perm: 'ro' }
      }
    };
    expect(isNoteShared(note)).toBe(false);
  });

  it('3. 开启公开链接访问 (ro 或 rw) 时返回 true', () => {
    const roNote: SynoNote = {
      ...baseNote,
      acl: {
        enabled: true,
        public: { perm: 'ro' }
      }
    };
    expect(isNoteShared(roNote)).toBe(true);

    const rwNote: SynoNote = {
      ...baseNote,
      acl: {
        enabled: true,
        public: { perm: 'rw' }
      }
    };
    expect(isNoteShared(rwNote)).toBe(true);
  });

  it('4. 分配了 DSM 用户时返回 true，空用户字典返回 false', () => {
    const userNote: SynoNote = {
      ...baseNote,
      acl: {
        enabled: true,
        dsm_user: {
          '1024': { name: 'admin', perm: 'ro' }
        }
      }
    };
    expect(isNoteShared(userNote)).toBe(true);

    const emptyUserNote: SynoNote = {
      ...baseNote,
      acl: {
        enabled: true,
        dsm_user: {}
      }
    };
    expect(isNoteShared(emptyUserNote)).toBe(false);
  });

  it('5. 分配了 DSM 群组时返回 true，空群组字典返回 false', () => {
    const groupNote: SynoNote = {
      ...baseNote,
      acl: {
        enabled: true,
        dsm_group: {
          '100': { name: 'administrators', perm: 'rw' }
        }
      }
    };
    expect(isNoteShared(groupNote)).toBe(true);

    const emptyGroupNote: SynoNote = {
      ...baseNote,
      acl: {
        enabled: true,
        dsm_group: {}
      }
    };
    expect(isNoteShared(emptyGroupNote)).toBe(false);
  });
});
