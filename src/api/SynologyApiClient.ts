import axios, { AxiosInstance } from 'axios';
import {
  ServerProfile,
  SynoApiResponse,
  SynoAuthData,
  SynoNotebook,
  SynoNote,
  SynoTag
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

    this.http = axios.create({
      baseURL: cleanBaseUrl,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
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
    const res = await this.http.get<SynoApiResponse<{ notebooks?: SynoNotebook[]; total: number }>>('/webapi/entry.cgi', {
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

    return res.data.data?.notebooks || [];
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
   * List notes inside a specific notebook
   */
  async listNotes(parentId: string, offset = 0, limit = 100): Promise<{ notes: SynoNote[]; total: number }> {
    const sid = this.requireSid();
    const res = await this.http.get<SynoApiResponse<{ notes?: SynoNote[]; total: number }>>('/webapi/entry.cgi', {
      params: {
        api: 'SYNO.NoteStation.Note',
        version: '1',
        method: 'list',
        _sid: sid,
        parent_id: parentId,
        offset,
        limit
      }
    });

    if (!res.data.success) {
      throw this.formatError(res.data);
    }

    const notes = (res.data.data?.notes || []).map(n => ({
      ...n,
      markdownContent: n.content ? noteHtmlToMarkdown(n.content) : ''
    }));

    return {
      notes,
      total: res.data.data?.total || notes.length
    };
  }

  /**
   * Retrieve full details of a specific note, including Markdown translation
   */
  async getNote(objectId: string): Promise<SynoNote> {
    const sid = this.requireSid();
    const res = await this.http.get<SynoApiResponse<SynoNote>>('/webapi/entry.cgi', {
      params: {
        api: 'SYNO.NoteStation.Note',
        version: '1',
        method: 'get',
        _sid: sid,
        object_id: objectId
      }
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
}
