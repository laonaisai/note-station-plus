import { describe, it, expect, vi } from 'vitest';
import { SynologyApiClient } from '@/api/SynologyApiClient';
import { ServerProfile } from '@/types/synology';

const mockProfile: ServerProfile = {
  id: 'test-pagination-profile',
  alias: '测试服务',
  serverUrl: 'http://localhost:5000',
  account: 'admin',
  allowInsecureSSL: true,
  createdAt: Date.now()
};

describe('SynologyApiClient 分页深度验证测试', () => {
  it('当服务端返回的 total 与每页条数相同时，listAllNotes 仍应持续拉取后续页，完整获取所有400+便签', async () => {
    const client = new SynologyApiClient(mockProfile);
    client.sid = 'mock-sid-12345';

    // 构造模拟数据：共 950 篇便签
    // 第一页：offset 0, limit 500 -> 返回 500 篇，data.total = 500
    // 第二页：offset 500, limit 500 -> 返回 450 篇，data.total = 450
    // (第二页返回条数 450 < 500，应判定为最后一页并自动终止)
    const page1Notes = Array.from({ length: 500 }, (_, i) => ({
      object_id: `note_${i}`,
      parent_id: i < 400 ? 'nb_large' : 'nb_other',
      notebook_id: i < 400 ? 'nb_large' : 'nb_other',
      title: `便签 ${i}`,
      ctime: 1730000000 + i,
      mtime: 1730000000 + i
    }));

    const page2Notes = Array.from({ length: 450 }, (_, i) => ({
      object_id: `note_${500 + i}`,
      parent_id: i < 100 ? 'nb_large' : 'nb_other',
      notebook_id: i < 100 ? 'nb_large' : 'nb_other',
      title: `便签 ${500 + i}`,
      ctime: 1730000000 + 500 + i,
      mtime: 1730000000 + 500 + i
    }));

    // Mock http.get
    vi.spyOn((client as any).http, 'get').mockImplementation(async (url: any, config: any) => {
      const params = config?.params || {};
      const offset = params.offset || 0;

      if (params.api === 'SYNO.NoteStation.Tag') {
        return {
          data: {
            success: true,
            data: { tags: [], total: 0 }
          }
        };
      }

      if (params.api === 'SYNO.NoteStation.Note' && params.method === 'list') {
        if (offset === 0) {
          return {
            data: {
              success: true,
              data: {
                notes: page1Notes,
                offset: 0,
                total: 500 // 群晖服务端特有的 behavior: total 等于本批次数量
              }
            }
          };
        } else if (offset === 500) {
          return {
            data: {
              success: true,
              data: {
                notes: page2Notes,
                offset: 500,
                total: 450
              }
            }
          };
        } else {
          return {
            data: {
              success: true,
              data: {
                notes: [],
                offset,
                total: 0
              }
            }
          };
        }
      }

      return { data: { success: true } };
    });

    // 1. 获取全局便签：应分页拉取两页，共 950 篇
    const allRes = await client.listAllNotes();
    expect(allRes.notes.length).toBe(950);
    expect(allRes.total).toBe(950);

    // 2. 获取特定笔记本 'nb_large'：在 950 篇中，属于 nb_large 的共有 400 + 100 = 500 篇
    const nbRes = await client.listAllNotes('nb_large');
    expect(nbRes.notes.length).toBe(500);
    expect(nbRes.total).toBe(500);
    expect(nbRes.notes.every(n => n.parent_id === 'nb_large')).toBe(true);
  });
});

