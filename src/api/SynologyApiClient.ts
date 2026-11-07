import axios, { AxiosInstance } from 'axios';
import {
  ServerProfile,
  SynoApiResponse,
  SynoAuthData,
  SynoNotebook,
  SynoNote,
  SynoAttachment,
  SynoTag,
  SynoShortcut,
  NoteVersion,
  SharePrivItem,
  SharedMember,
  NoteShareInfo
} from '@/types/synology';
import { markdownToNoteHtml, noteHtmlToMarkdown, toBase64 } from '@/utils/markdown';

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
  public lastUpdatedVer?: string;

  constructor(profile: ServerProfile) {
    this.profile = profile;
    const cleanBaseUrl = profile.serverUrl.replace(/\/+$/, '');

    // Detect browser environment (running in Web browser where CORS applies)
    const isBrowser = typeof window !== 'undefined' && !(window as any).electronAPI;

    this.http = axios.create({
      baseURL: isBrowser ? '/syno-proxy' : cleanBaseUrl,
      timeout: 45000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    });

    this.http.interceptors.request.use((config) => {
      if (isBrowser) {
        config.headers['X-Syno-Target'] = this.profile.serverUrl.replace(/\/+$/, '');
      }
      // Anti-cache headers and timestamp for all GET requests to prevent stale responses
      if (config.method?.toLowerCase() === 'get') {
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        config.headers['Pragma'] = 'no-cache';
        config.params = config.params || {};
        if (!config.params._t) {
          config.params._t = String(Date.now());
        }
      }
      return config;
    });

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
    this.sid = undefined;
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
        recycle: Boolean(n.recycle),
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

    // Filter notes if parentId was requested, and ALWAYS filter out recycled notes
    const activeNotes = allNotes.filter(n => !n.recycle);
    const filteredNotes = parentId && parentId.trim()
      ? activeNotes.filter(n => n.parent_id === parentId.trim() || (n as any).notebook_id === parentId.trim())
      : activeNotes;

    return {
      notes: filteredNotes,
      total: filteredNotes.length
    };
  }

  /**
   * List all deleted notes in the recycle bin with auto-pagination.
   */
  async listAllRecycleNotes(): Promise<{ notes: SynoNote[]; total: number }> {
    const sid = this.requireSid();
    let offset = 0;
    const pageSize = 500;
    let allNotes: SynoNote[] = [];
    const seenIds = new Set<string>();
    const maxPages = 100;
    let pageCount = 0;

    while (pageCount < maxPages) {
      pageCount++;
      const res = await this.http.get<SynoApiResponse<{ notes?: any[]; total: number; offset: number }>>('/webapi/entry.cgi', {
        params: {
          api: 'SYNO.NoteStation.Note',
          version: '1',
          method: 'list',
          _sid: sid,
          is_recycle: true,
          offset,
          limit: pageSize
        }
      });

      if (!res.data.success) {
        throw this.formatError(res.data);
      }

      const rawNotes: any[] = res.data.data?.notes || [];
      if (rawNotes.length === 0) break;

      let newNotesCount = 0;
      for (const n of rawNotes) {
        // Strictly filter: only keep notes that are actually marked as recycled
        if (!n.recycle) continue;
        const noteId = String(n.object_id || n.note_id || '');
        if (seenIds.has(noteId)) continue;
        seenIds.add(noteId);
        newNotesCount++;
        allNotes.push({
          ...n,
          recycle: true,
          object_id: noteId,
          parent_id: String(n.parent_id || n.notebook_id || ''),
          notebook_id: String(n.parent_id || n.notebook_id || ''),
          ctime: Number(n.ctime || n.created_time || 0),
          mtime: Number(n.mtime || n.updated_time || 0),
          tag: Array.isArray(n.tag) ? n.tag : [],
          markdownContent: n.content ? noteHtmlToMarkdown(n.content) : ''
        });
      }

      if (rawNotes.length < pageSize) break;
      offset += rawNotes.length;
    }

    const recycledOnly = allNotes.filter(n => Boolean(n.recycle));
    return {
      notes: recycledOnly,
      total: recycledOnly.length
    };
  }

  /**
   * Search notes by keyword using Synology Full-Text Search (SYNO.NoteStation.FTS).
   * Searches note title, content body, and tags across the account.
   */
  async searchNotes(keyword: string, offset = 0, limit = 200): Promise<SynoNote[]> {
    const trimmed = keyword.trim();
    if (!trimmed) return [];

    const sid = this.requireSid();
    const queryParams: Record<string, any> = {
      api: 'SYNO.NoteStation.FTS',
      version: '1',
      method: 'search',
      _sid: sid,
      keyword: trimmed,
      offset,
      limit
    };

    const res = await this.http.get<SynoApiResponse<{ matches?: any[]; offset: number }>>('/webapi/entry.cgi', {
      params: queryParams
    });

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    const matches: any[] = res.data.data?.matches || [];
    return matches.map(n => {
      const noteId = String(n.object_id || n.note_id || '');
      const nbId = String(n.parent_id || n.notebook_id || '');
      const ctime = Number(n.ctime || n.created_time || 0);
      const mtime = Number(n.mtime || n.updated_time || ctime);

      return {
        ...n,
        object_id: noteId,
        parent_id: nbId,
        notebook_id: nbId,
        ctime,
        mtime,
        tag: Array.isArray(n.tag) ? n.tag : []
      };
    });
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

    // Normalize attachments from dictionary or array into standard SynoAttachment[]
    const normalizedAttachments: SynoAttachment[] = [];
    if (Array.isArray(note.attachment)) {
      normalizedAttachments.push(...note.attachment);
    } else if (note.attachment && typeof note.attachment === 'object') {
      for (const [fileId, att] of Object.entries(note.attachment)) {
        normalizedAttachments.push({
          id: fileId,
          file_id: fileId,
          ...(att as any)
        });
      }
    }
    note.attachment = normalizedAttachments;

    note.markdownContent = note.content
      ? noteHtmlToMarkdown(note.content, {
          objectId: note.object_id,
          attachments: normalizedAttachments,
          getAttachmentUrl: (fileId, filename) => this.getAttachmentDownloadUrl(note.object_id, fileId, filename)
        })
      : '';
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
  async updateNote(
    objectId: string,
    title: string,
    markdownContent: string,
    tags?: string[],
    ver?: string,
    attachments?: SynoAttachment[]
  ): Promise<boolean> {
    const sid = this.requireSid();
    const htmlContent = markdownToNoteHtml(markdownContent, { objectId, attachments });

    // If a valid 40-char SHA1 hash is provided for ver, use version: 3 matching DSM official client
    const useV3 = Boolean(ver && ver.length === 40);
    const payload: Record<string, string> = {
      api: 'SYNO.NoteStation.Note',
      version: useV3 ? '3' : '1',
      method: 'set',
      _sid: sid,
      object_id: objectId,
      title: title.trim(),
      content: htmlContent
    };

    if (useV3 && ver) {
      payload['ver'] = ver;
      payload['commit_msg'] = JSON.stringify({ device: 'desktop' });
    }

    if (tags) {
      payload['tag'] = JSON.stringify(tags);
    }

    const data = new URLSearchParams(payload);
    let res = await this.http.post<SynoApiResponse<any>>('/webapi/entry.cgi', data.toString());

    // If version 3 fails (e.g. Code 100/103 version mismatch), fetch latest note version from server and retry once
    if (!res.data.success && useV3) {
      try {
        const latestServerNote = await this.getNote(objectId);
        if (latestServerNote.ver && latestServerNote.ver !== ver) {
          payload['ver'] = latestServerNote.ver;
          const retryData = new URLSearchParams(payload);
          res = await this.http.post<SynoApiResponse<any>>('/webapi/entry.cgi', retryData.toString());
        }
      } catch (retryErr) {
        // Ignore getNote error and proceed to v1 fallback
      }
    }

    // If version 3 still fails, fallback to version 1
    if (!res.data.success && useV3) {
      delete payload['ver'];
      delete payload['commit_msg'];
      payload['version'] = '1';
      const fallbackData = new URLSearchParams(payload);
      res = await this.http.post<SynoApiResponse<any>>('/webapi/entry.cgi', fallbackData.toString());
    }

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    const noteData = Array.isArray(res.data.data?.data)
      ? res.data.data.data[0]
      : Array.isArray(res.data.data)
        ? res.data.data[0]
        : res.data.data;

    this.lastUpdatedVer = noteData?.ver;

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
   * Restore a deleted note from recycle bin back to its notebook
   */
  async restoreNote(objectId: string): Promise<boolean> {
    const sid = this.requireSid();
    const data = new URLSearchParams({
      api: 'SYNO.NoteStation.Note',
      version: '1',
      method: 'restore',
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
   * Permanently delete a note from the recycle bin
   */
  async permanentlyDeleteNote(objectId: string): Promise<boolean> {
    return this.deleteNote(objectId);
  }

  /**
   * Move a note to another notebook
   */
  async moveNote(objectId: string, targetNotebookId: string): Promise<boolean> {
    const sid = this.requireSid();
    const data = new URLSearchParams({
      api: 'SYNO.NoteStation.Note',
      version: '1',
      method: 'set',
      _sid: sid,
      object_id: objectId,
      parent_id: targetNotebookId
    });

    const res = await this.http.post<SynoApiResponse>('/webapi/entry.cgi', data.toString());
    if (!res.data.success) {
      throw this.formatError(res.data);
    }
    return true;
  }

  /**
   * Copy (duplicate) a note on the server
   */
  async copyNote(objectId: string): Promise<SynoNote> {
    const sid = this.requireSid();
    const data = new URLSearchParams({
      api: 'SYNO.NoteStation.Note',
      version: '1',
      method: 'copy',
      _sid: sid,
      object_id: objectId
    });

    const res = await this.http.post<SynoApiResponse<any>>('/webapi/entry.cgi', data.toString());
    if (!res.data.success || !res.data.data) {
      throw this.formatError(res.data);
    }

    const n = res.data.data;
    const noteId = String(n.object_id || n.note_id || '');
    return {
      ...n,
      object_id: noteId,
      parent_id: String(n.parent_id || n.notebook_id || ''),
      notebook_id: String(n.parent_id || n.notebook_id || ''),
      ctime: Number(n.ctime || n.created_time || Date.now() / 1000),
      mtime: Number(n.mtime || n.updated_time || Date.now() / 1000),
      tag: Array.isArray(n.tag) ? n.tag : [],
      markdownContent: n.content ? noteHtmlToMarkdown(n.content) : ''
    };
  }

  /**
   * List all shortcuts / favorites
   */
  async listShortcuts(): Promise<{ shortcuts: SynoShortcut[]; total: number }> {
    const sid = this.requireSid();
    const res = await this.http.get<SynoApiResponse<{ shortcuts?: any[]; total: number; offset: number }>>('/webapi/entry.cgi', {
      params: {
        api: 'SYNO.NoteStation.Shortcut',
        version: '1',
        method: 'list',
        _sid: sid
      }
    });

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    const shortcuts: SynoShortcut[] = (res.data.data?.shortcuts || []).map((s: any) => ({
      id: String(s.id || s.object_id || ''),
      category: s.category || 'note',
      title: s.title || '',
      owner: s.owner
    }));

    return {
      shortcuts,
      total: res.data.data?.total ?? shortcuts.length
    };
  }

  /**
   * Add a note to shortcuts / favorites
   */
  async addShortcut(objectId: string): Promise<boolean> {
    const sid = this.requireSid();
    const data = new URLSearchParams({
      api: 'SYNO.NoteStation.Shortcut',
      version: '1',
      method: 'set',
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
   * Remove a note from shortcuts / favorites
   */
  async removeShortcut(objectId: string): Promise<boolean> {
    const sid = this.requireSid();
    const data = new URLSearchParams({
      api: 'SYNO.NoteStation.Shortcut',
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
   * Get direct download URL for a note attachment or image
   */
  getAttachmentDownloadUrl(objectId: string, fileId: string, filename?: string): string {
    const sid = this.sid || '';
    const cleanBaseUrl = this.profile.serverUrl.replace(/\/+$/, '');
    const isBrowser = typeof window !== 'undefined' && !(window as any).electronAPI;
    let path = `/webapi/entry.cgi?api=SYNO.NoteStation.Note&version=3&method=download&object_id=${encodeURIComponent(objectId)}&file_id=${encodeURIComponent(fileId)}&format=raw&_sid=${encodeURIComponent(sid)}`;
    if (filename) {
      path += `&filename=${encodeURIComponent(filename)}`;
    }
    if (isBrowser) {
      return `/syno-proxy?target=${encodeURIComponent(cleanBaseUrl + path)}`;
    }
    return `${cleanBaseUrl}${path}`;
  }

  /**
   * Upload an attachment or image to a note using SYNO.NoteStation.Note version 3 set multipart upload
   */
  async uploadAttachment(
    objectId: string,
    file: File | Blob,
    filename: string,
    onProgress?: (percent: number) => void
  ): Promise<{ attachment: SynoAttachment; newVer: string; allAttachments: SynoAttachment[] }> {
    const sid = this.requireSid();

    // 1. Fetch current note to get current ver
    const currentNote = await this.getNote(objectId);
    const ver = currentNote.ver || '1';

    // 2. Prepare FormData
    const formData = new FormData();
    formData.append(filename, file, filename);

    const ref = toBase64(`${Date.now()}${filename}`);
    const attachmentDesc = [
      {
        action: 'create',
        format: 'raw',
        name: filename,
        source: filename,
        ref,
        rotate: true
      }
    ];

    // Synology requires parameter values in FormData to be JSON-encoded
    formData.append('object_id', JSON.stringify(objectId));
    formData.append('ver', JSON.stringify(ver));
    formData.append('commit_msg', JSON.stringify({ device: 'desktop', listable: false }));
    formData.append('attachment', JSON.stringify(attachmentDesc));

    const res = await this.http.post<SynoApiResponse<any>>('/webapi/entry.cgi', formData, {
      params: {
        api: 'SYNO.NoteStation.Note',
        version: '3',
        method: 'set',
        _sid: sid
      },
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    const noteData = Array.isArray(res.data.data?.data)
      ? res.data.data.data[0]
      : Array.isArray(res.data.data)
        ? res.data.data[0]
        : res.data.data;

    const newVer = noteData?.ver || ver;
    const rawAttachments = noteData?.attachment;

    // Normalize attachments
    const allAttachments: SynoAttachment[] = [];
    let createdAttachment: SynoAttachment | null = null;

    if (rawAttachments && typeof rawAttachments === 'object') {
      if (Array.isArray(rawAttachments)) {
        allAttachments.push(...rawAttachments);
        createdAttachment = rawAttachments.find(a => a.name === filename || a.ref === ref) || rawAttachments[rawAttachments.length - 1];
      } else {
        for (const [fId, a] of Object.entries(rawAttachments)) {
          const item: SynoAttachment = {
            id: fId,
            file_id: fId,
            name: (a as any).name || filename,
            size: (a as any).size || 0,
            type: (a as any).type || (file.type || 'application/octet-stream'),
            ref: (a as any).ref || ref,
            md5: (a as any).md5
          };
          allAttachments.push(item);
          if (item.name === filename || item.ref === ref) {
            createdAttachment = item;
          }
        }
      }
    }

    if (!createdAttachment && allAttachments.length > 0) {
      createdAttachment = allAttachments[allAttachments.length - 1];
    }

    if (!createdAttachment) {
      createdAttachment = {
        id: filename,
        file_id: filename,
        name: filename,
        size: file.size || 0,
        type: file.type || 'application/octet-stream',
        ref
      };
      allAttachments.push(createdAttachment);
    }

    return {
      attachment: createdAttachment,
      newVer,
      allAttachments
    };
  }

  /**
   * Delete an attachment from a note
   */
  async deleteAttachment(objectId: string, fileId: string): Promise<{ success: boolean; newVer: string }> {
    const sid = this.requireSid();

    const currentNote = await this.getNote(objectId);
    const ver = currentNote.ver || '1';

    const formData = new FormData();
    formData.append('object_id', JSON.stringify(objectId));
    formData.append('ver', JSON.stringify(ver));
    formData.append('commit_msg', JSON.stringify({ device: 'desktop', listable: false }));
    formData.append('attachment', JSON.stringify([{ action: 'delete', file_id: fileId }]));

    const res = await this.http.post<SynoApiResponse<any>>('/webapi/entry.cgi', formData, {
      params: {
        api: 'SYNO.NoteStation.Note',
        version: '3',
        method: 'set',
        _sid: sid
      },
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    const noteData = Array.isArray(res.data.data?.data)
      ? res.data.data.data[0]
      : Array.isArray(res.data.data)
        ? res.data.data[0]
        : res.data.data;

    return {
      success: true,
      newVer: noteData?.ver || ver
    };
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

