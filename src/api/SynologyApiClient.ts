import axios, { AxiosInstance } from 'axios';
import {
  ServerProfile,
  SynoApiResponse,
  SynoAuthData,
  SynoNotebook,
  SynoNote,
  SynoTag,
  NoteVersion,
  SharePrivItem,
  SharedMember,
  NoteShareInfo
} from '@/types/synology';
import { markdownToNoteHtml, noteHtmlToMarkdown } from '@/utils/markdown';

export const SYNO_ERROR_MESSAGES: Record<number, string> = {
  100: '未知错误',
  101: '无效的 API 参数',
  102: '指定 API 不存在',
  103: '指定方法不存在或权限不足',
  104: '版本不支持',
  105: '登录凭证已失效，请重新登录',
  106: '会话超时中断',
  114: '缺少必要参数或参数校验失败',
  119: '服务未启动或缺少权限',
  400: '用户名或密码错误',
  401: '当前账号已被锁定或停用',
  402: '当前用户无权限访问此服务',
  403: '服务已开启双重验证 (2FA/OTP)',
  404: '双重验证码校验失败'
};

export class SynologyApiClient {
  private http: AxiosInstance;
  public profile: ServerProfile;
  public sid?: string;

  constructor(profile: ServerProfile) {
    this.profile = profile;
    const cleanBaseUrl = profile.serverUrl.replace(/\/+$/, '');

    // Detect browser environment (running in Web browser where CORS applies)
    const isBrowser = typeof window !== 'undefined' && !(window as any).electronAPI;

    this.http = axios.create({
      baseURL: isBrowser ? '/syno-proxy' : cleanBaseUrl,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    });

    if (isBrowser) {
      this.http.interceptors.request.use((config) => {
        config.headers['X-Syno-Target'] = this.profile.serverUrl.replace(/\/+$/, '');
        return config;
      });
    }

    // Handle self-signed certificates in Node / Electron environment
    if (typeof process !== 'undefined' && process.env) {
      if (profile.allowInsecureSSL) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }
    }
  }

  /**
   * Helper method to map Synology API error codes to human-readable strings
   */
  private formatError(res: SynoApiResponse): Error {
    const code = res.error?.code || 100;
    const msg = SYNO_ERROR_MESSAGES[code] || `群晖服务返回错误 (代码: ${code})`;
    return new Error(msg);
  }

  /**
   * Login to DSM Note Station
   */
  async login(account?: string, password?: string, otpCode?: string): Promise<string> {
    const user = account || this.profile.account;
    const pass = password || this.profile.password || '';

    const params: Record<string, string> = {
      api: 'SYNO.API.Auth',
      version: '3',
      method: 'login',
      account: user,
      passwd: pass,
      session: 'NoteStation',
      format: 'sid'
    };

    if (otpCode) {
      params['otp_code'] = otpCode;
    }

    const res = await this.http.get<SynoApiResponse<SynoAuthData>>('/webapi/auth.cgi', {
      params
    });

    if (!res.data.success || !res.data.data?.sid) {
      throw this.formatError(res.data);
    }

    this.sid = res.data.data.sid;
    return this.sid;
  }

  /**
   * Logout from current DSM session
   */
  async logout(): Promise<void> {
    if (!this.sid) return;

    try {
      await this.http.get('/webapi/auth.cgi', {
        params: {
          api: 'SYNO.API.Auth',
          version: '1',
          method: 'logout',
          session: 'NoteStation',
          _sid: this.sid
        }
      });
    } finally {
      this.sid = undefined;
    }
  }

  /**
   * Ensure user is authenticated
   */
  private requireSid(): string {
    if (!this.sid) {
      throw new Error('当前未登录，请先进行身份验证');
    }
    return this.sid;
  }

  /**
   * List all notebooks
   */
  async listNotebooks(): Promise<SynoNotebook[]> {
    const sid = this.requireSid();
    const res = await this.http.get<SynoApiResponse<{ notebooks?: any[]; total: number }>>('/webapi/entry.cgi', {
      params: {
        api: 'SYNO.NoteStation.Notebook',
        version: '1',
        method: 'list',
        _sid: sid
      }
    });

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    const rawNotebooks: any[] = res.data.data?.notebooks || [];
    return rawNotebooks.map(nb => {
      const id = String(nb.object_id || nb.notebook_id || '');
      const title = nb.title || nb.name || (nb.preset ? '我的便签' : '默认笔记本');
      const ctime = Number(nb.ctime || nb.created_time || 0);
      const mtime = Number(nb.mtime || nb.updated_time || ctime);
      const items = Array.isArray(nb.items) ? nb.items.map((i: any) => String(i)) : [];

      return {
        ...nb,
        object_id: id,
        notebook_id: id,
        title,
        ctime,
        mtime,
        category: nb.category || 'notebook',
        ver: nb.ver || nb.version || '',
        preset: Boolean(nb.preset),
        stack: nb.stack || '',
        items
      };
    });
  }

  /**
   * Create a new notebook
   */
  async createNotebook(title: string): Promise<SynoNotebook> {
    const sid = this.requireSid();
    const data = new URLSearchParams({
      api: 'SYNO.NoteStation.Notebook',
      version: '1',
      method: 'create',
      _sid: sid,
      title: title.trim()
    });

    const res = await this.http.post<SynoApiResponse<any>>('/webapi/entry.cgi', data.toString());
    if (!res.data.success || !res.data.data) {
      throw this.formatError(res.data);
    }

    return {
      object_id: res.data.data.object_id,
      title: title.trim(),
      category: 'notebook',
      ctime: res.data.data.ctime || Math.floor(Date.now() / 1000),
      mtime: res.data.data.ctime || Math.floor(Date.now() / 1000),
      ver: res.data.data.version || '',
      preset: false,
      stack: ''
    };
  }

  /**
   * Rename an existing notebook
   */
  async renameNotebook(objectId: string, newTitle: string): Promise<SynoNotebook> {
    const sid = this.requireSid();
    const data = new URLSearchParams({
      api: 'SYNO.NoteStation.Notebook',
      version: '1',
      method: 'set',
      _sid: sid,
      object_id: objectId,
      title: newTitle.trim()
    });

    const res = await this.http.post<SynoApiResponse<any>>('/webapi/entry.cgi', data.toString());
    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    return {
      object_id: objectId,
      title: newTitle.trim(),
      category: 'notebook',
      ctime: res.data.data?.ctime || Math.floor(Date.now() / 1000),
      mtime: res.data.data?.mtime || Math.floor(Date.now() / 1000),
      ver: res.data.data?.version || '',
      preset: false,
      stack: ''
    };
  }

  /**
   * Delete a notebook by object_id
   */
  async deleteNotebook(objectId: string): Promise<boolean> {
    const sid = this.requireSid();
    const data = new URLSearchParams({
      api: 'SYNO.NoteStation.Notebook',
      version: '1',
      method: 'delete',
      _sid: sid,
      object_id: objectId
    });

    const res = await this.http.post<SynoApiResponse>('/webapi/entry.cgi', data.toString());
    if (!res.data.success) {
      throw this.formatError(res.data);
    }
    return true;
  }

  /**
   * List notes inside a specific notebook (single page)
   */
  async listNotes(
    parentId?: string,
    offset = 0,
    limit = 500,
    precomputedTagMap?: Map<string, string[]>
  ): Promise<{ notes: SynoNote[]; total: number }> {
    const sid = this.requireSid();

    const queryParams: Record<string, any> = {
      api: 'SYNO.NoteStation.Note',
      version: '1',
      method: 'list',
      _sid: sid,
      offset,
      limit
    };

    if (parentId && parentId.trim()) {
      queryParams.notebook_id = parentId.trim();
    }

    let noteTagMap: Map<string, string[]>;
    let res: any;

    if (precomputedTagMap) {
      noteTagMap = precomputedTagMap;
      res = await this.http.get<SynoApiResponse<{ notes?: any[]; total: number; offset: number }>>('/webapi/entry.cgi', {
        params: queryParams
      });
    } else {
      const [apiRes, tagList] = await Promise.all([
        this.http.get<SynoApiResponse<{ notes?: any[]; total: number; offset: number }>>('/webapi/entry.cgi', {
          params: queryParams
        }),
        this.listTags().catch(() => [])
      ]);
      res = apiRes;

      noteTagMap = new Map<string, string[]>();
      for (const tagObj of tagList) {
        const tagName = tagObj.title || tagObj.name || '';
        if (!tagName) continue;
        for (const noteId of tagObj.items || []) {
          if (!noteTagMap.has(noteId)) {
            noteTagMap.set(noteId, []);
          }
          noteTagMap.get(noteId)!.push(tagName);
        }
      }
    }

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    const rawNotes: any[] = res.data.data?.notes || [];
    const notes: SynoNote[] = rawNotes.map(n => {
      const noteId = String(n.object_id || n.note_id || '');
      const nbId = String(n.parent_id || n.notebook_id || parentId || '');
      const ctime = Number(n.ctime || n.created_time || 0);
      const mtime = Number(n.mtime || n.updated_time || ctime);
      const tags = noteTagMap.get(noteId) || n.tag || n.tags || [];

      return {
        ...n,
        object_id: noteId,
        parent_id: nbId,
        notebook_id: nbId,
        ctime,
        mtime,
        tag: Array.isArray(tags) ? tags : [],
        markdownContent: n.content ? noteHtmlToMarkdown(n.content) : ''
      };
    });

    return {
      notes,
      total: res.data.data?.total ?? notes.length
    };
  }

  /**
   * List all notes inside a notebook (or all notes) with auto-pagination.
   * Continues until server returns 0 notes or fewer notes than pageSize.
   */
  async listAllNotes(parentId?: string): Promise<{ notes: SynoNote[]; total: number }> {
    let offset = 0;
    const pageSize = 500;
    let allNotes: SynoNote[] = [];
    const seenIds = new Set<string>();
    const maxPages = 100; // safety ceiling: up to 50,000 notes
    let pageCount = 0;

    // Fetch tags once up-front to avoid redundant requests across pages
    const tagList = await this.listTags().catch(() => []);
    const noteTagMap = new Map<string, string[]>();
    for (const tagObj of tagList) {
      const tagName = tagObj.title || tagObj.name || '';
      if (!tagName) continue;
      for (const noteId of tagObj.items || []) {
        if (!noteTagMap.has(noteId)) {
          noteTagMap.set(noteId, []);
        }
        noteTagMap.get(noteId)!.push(tagName);
      }
    }

    while (pageCount < maxPages) {
      pageCount++;
      const res = await this.listNotes(parentId, offset, pageSize, noteTagMap);
      if (!res.notes || res.notes.length === 0) {
        break;
      }

      let newCount = 0;
      for (const note of res.notes) {
        if (!seenIds.has(note.object_id)) {
          seenIds.add(note.object_id);
          allNotes.push(note);
          newCount++;
        }
      }

      // If server returned fewer notes than pageSize, we have reached the end of the note list
      if (res.notes.length < pageSize) {
        break;
      }

      // If no new notes were found in this batch, prevent infinite loop and exit
      if (newCount === 0) {
        break;
      }

      offset += res.notes.length;
    }

    // Filter notes if parentId was requested
    const filteredNotes = parentId && parentId.trim()
      ? allNotes.filter(n => n.parent_id === parentId.trim() || (n as any).notebook_id === parentId.trim())
      : allNotes;

    return {
      notes: filteredNotes,
      total: filteredNotes.length
    };
  }

  /**
   * Retrieve full details of a specific note, including Markdown translation.
   * If `ver` is specified, retrieves the note content at that specific historical version.
   */
  async getNote(objectId: string, ver?: string): Promise<SynoNote> {
    const sid = this.requireSid();
    const params: Record<string, string> = {
      api: 'SYNO.NoteStation.Note',
      version: ver ? '3' : '1',
      method: 'get',
      _sid: sid,
      object_id: objectId
    };
    if (ver) {
      params['ver'] = ver;
    }
    const res = await this.http.get<SynoApiResponse<SynoNote>>('/webapi/entry.cgi', {
      params
    });

    if (!res.data.success || !res.data.data) {
      throw this.formatError(res.data);
    }

    const note = res.data.data;
    note.markdownContent = note.content ? noteHtmlToMarkdown(note.content) : '';
    return note;
  }

  /**
   * Create a note with Markdown content
   */
  async createNote(parentId: string, title: string, markdownContent: string, tags: string[] = []): Promise<SynoNote> {
    const sid = this.requireSid();
    const htmlContent = markdownToNoteHtml(markdownContent);

    const payload: Record<string, string> = {
      api: 'SYNO.NoteStation.Note',
      version: '1',
      method: 'create',
      _sid: sid,
      parent_id: parentId,
      title: title.trim(),
      content: htmlContent
    };

    if (tags && tags.length > 0) {
      payload['tag'] = JSON.stringify(tags);
    }

    const data = new URLSearchParams(payload);
    const res = await this.http.post<SynoApiResponse<SynoNote>>('/webapi/entry.cgi', data.toString());

    if (!res.data.success || !res.data.data) {
      throw this.formatError(res.data);
    }

    const note = res.data.data;
    note.markdownContent = markdownContent;

    // Synology Note Station requires method: 'set' to persist tags onto a note
    if (tags && tags.length > 0) {
      await this.updateNote(note.object_id, title, markdownContent, tags);
      note.tag = [...tags];
    } else {
      note.tag = [];
    }

    return note;
  }

  /**
   * Update an existing note's title and/or Markdown content
   */
  async updateNote(objectId: string, title: string, markdownContent: string, tags?: string[]): Promise<boolean> {
    const sid = this.requireSid();
    const htmlContent = markdownToNoteHtml(markdownContent);

    const payload: Record<string, string> = {
      api: 'SYNO.NoteStation.Note',
      version: '1',
      method: 'set',
      _sid: sid,
      object_id: objectId,
      title: title.trim(),
      content: htmlContent
    };

    if (tags) {
      payload['tag'] = JSON.stringify(tags);
    }

    const data = new URLSearchParams(payload);
    const res = await this.http.post<SynoApiResponse>('/webapi/entry.cgi', data.toString());

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    return true;
  }

  /**
   * Delete a note (move to trash)
   */
  async deleteNote(objectId: string): Promise<boolean> {
    const sid = this.requireSid();
    const data = new URLSearchParams({
      api: 'SYNO.NoteStation.Note',
      version: '1',
      method: 'delete',
      _sid: sid,
      object_id: objectId
    });

    const res = await this.http.post<SynoApiResponse>('/webapi/entry.cgi', data.toString());
    if (!res.data.success) {
      throw this.formatError(res.data);
    }
    return true;
  }

  /**
   * List all tags
   */
  async listTags(): Promise<SynoTag[]> {
    const sid = this.requireSid();
    const res = await this.http.get<SynoApiResponse<{ tags?: SynoTag[]; total: number }>>('/webapi/entry.cgi', {
      params: {
        api: 'SYNO.NoteStation.Tag',
        version: '1',
        method: 'list',
        _sid: sid
      }
    });

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    return res.data.data?.tags || [];
  }

  /**
   * List all historical versions for a note
   */
  async listNoteVersions(objectId: string): Promise<NoteVersion[]> {
    const sid = this.requireSid();
    const res = await this.http.get<SynoApiResponse<{ versions?: NoteVersion[]; total?: number }>>('/webapi/entry.cgi', {
      params: {
        api: 'SYNO.NoteStation.Note.Version',
        version: '2',
        method: 'list',
        _sid: sid,
        object_id: objectId
      }
    });

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    return res.data.data?.versions || [];
  }

  /**
   * Restore a note to a specific historical version
   */
  async restoreNoteVersion(objectId: string, ver: string): Promise<boolean> {
    const sid = this.requireSid();
    const res = await this.http.get<SynoApiResponse<any>>('/webapi/entry.cgi', {
      params: {
        api: 'SYNO.NoteStation.Note.Version',
        version: '2',
        method: 'restore',
        _sid: sid,
        object_id: objectId,
        ver
      }
    });

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    return true;
  }

  /**
   * Get the public share link URL for a note
   */
  async getPublicShareLink(objectId: string): Promise<string> {
    const sid = this.requireSid();
    try {
      const res = await this.http.get<SynoApiResponse<{ url?: string; mode?: string }>>('/webapi/entry.cgi', {
        params: {
          api: 'SYNO.NoteStation.Shard.Link',
          version: '1',
          method: 'get',
          _sid: sid,
          object_id: objectId,
          mode: 'public'
        }
      });
      if (res.data.success && res.data.data?.url) {
        return res.data.data.url;
      }
    } catch (e) {
      console.warn('Failed to fetch shard link', e);
    }
    return '';
  }

  /**
   * List DSM users and groups that can be shared with
   */
  async listSharePriv(): Promise<SharePrivItem[]> {
    const sid = this.requireSid();
    const res = await this.http.get<SynoApiResponse<{ list?: SharePrivItem[]; total?: number }>>('/webapi/entry.cgi', {
      params: {
        api: 'SYNO.NoteStation.Share.Priv',
        version: '2',
        method: 'list',
        _sid: sid
      }
    });

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    return res.data.data?.list || [];
  }

  /**
   * Get comprehensive share information for a note
   */
  async getNoteShareInfo(objectId: string): Promise<NoteShareInfo> {
    // Concurrently fetch note details (for acl), share link, and share privileges
    const [note, publicUrl, privList] = await Promise.all([
      this.getNote(objectId),
      this.getPublicShareLink(objectId),
      this.listSharePriv().catch(() => [] as SharePrivItem[])
    ]);

    const acl = note.acl || {};
    const isPublicEnabled = !!(acl.public && (acl.public.perm === 'ro' || acl.public.perm === 'rw'));
    const publicPerm = acl.public?.perm || 'ro';

    const members: SharedMember[] = [];
    if (acl.dsm_user) {
      for (const uid of Object.keys(acl.dsm_user)) {
        const u = acl.dsm_user[uid];
        members.push({
          name: u.name,
          type: 'user',
          perm: u.perm || 'ro'
        });
      }
    }
    if (acl.dsm_group) {
      for (const gid of Object.keys(acl.dsm_group)) {
        const g = acl.dsm_group[gid];
        members.push({
          name: g.name,
          type: 'group',
          perm: g.perm || 'ro'
        });
      }
    }

    const availableUsers = privList.filter(p => p.type === 'user').map(p => p.name);
    const availableGroups = privList.filter(p => p.type === 'group').map(p => p.name);

    return {
      objectId,
      publicUrl,
      isPublicEnabled,
      publicPerm,
      members,
      availableUsers,
      availableGroups
    };
  }

  /**
   * Update share settings for a note (public link and DSM user/group permissions)
   */
  async updateNoteShareSettings(params: {
    objectId: string;
    isPublicEnabled: boolean;
    publicPerm: 'ro' | 'rw';
    addedOrUpdatedMembers: SharedMember[];
    removedMembers: SharedMember[];
  }): Promise<boolean> {
    const sid = this.requireSid();

    // 1. Handle public share permission
    if (params.isPublicEnabled) {
      const res = await this.http.get<SynoApiResponse<any>>('/webapi/entry.cgi', {
        params: {
          api: 'SYNO.NoteStation.Permission.Public',
          version: '1',
          method: 'set',
          _sid: sid,
          object_id: params.objectId,
          perm: params.publicPerm
        }
      });
      if (!res.data.success) {
        throw this.formatError(res.data);
      }
    } else {
      const res = await this.http.get<SynoApiResponse<any>>('/webapi/entry.cgi', {
        params: {
          api: 'SYNO.NoteStation.Permission.Public',
          version: '1',
          method: 'delete',
          _sid: sid,
          object_id: params.objectId
        }
      });
      // Deleting public perm might succeed or return not found which is safe
    }

    // 2. Handle added or updated members
    for (const member of params.addedOrUpdatedMembers) {
      const api = member.type === 'group'
        ? 'SYNO.NoteStation.Permission.Group'
        : 'SYNO.NoteStation.Permission.User';
      const key = member.type === 'group' ? 'groupname' : 'username';

      const res = await this.http.get<SynoApiResponse<any>>('/webapi/entry.cgi', {
        params: {
          api,
          version: '1',
          method: 'set',
          _sid: sid,
          object_id: params.objectId,
          [key]: member.name,
          perm: member.perm
        }
      });
      if (!res.data.success) {
        throw this.formatError(res.data);
      }
    }

    // 3. Handle removed members
    for (const member of params.removedMembers) {
      const api = member.type === 'group'
        ? 'SYNO.NoteStation.Permission.Group'
        : 'SYNO.NoteStation.Permission.User';
      const key = member.type === 'group' ? 'groupname' : 'username';

      await this.http.get('/webapi/entry.cgi', {
        params: {
          api,
          version: '1',
          method: 'delete',
          _sid: sid,
          object_id: params.objectId,
          [key]: member.name
        }
      });
    }

    return true;
  }
}

