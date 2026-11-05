export interface ServerProfile {
  id: string;               // UUID
  alias: string;            // User-friendly name e.g. "服务1 (180)", "家庭NAS"
  serverUrl: string;        // e.g. http://172.28.10.180:5000
  account: string;          // Username
  password?: string;        // Stored password
  allowInsecureSSL?: boolean; // Accept self-signed certificates
  autoLogin?: boolean;
  createdAt: number;
}

export interface SessionState {
  serverId: string;
  sid?: string;
  isLoggedIn: boolean;
  isConnecting: boolean;
  lastError?: string;
}

export interface SynoApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    errors?: any;
  };
}

export interface SynoAuthData {
  sid: string;
  did?: string;
  synotoken?: string;
}

export interface SynoNotebook {
  object_id: string;
  title: string;
  category: string;
  ctime: number;
  mtime: number;
  ver: string;
  preset: boolean;
  stack: string;
  owner?: {
    display_name: string;
    uid: number;
  };
}

export interface SynoNote {
  object_id: string;
  parent_id: string; // notebook object_id
  title: string;
  brief: string;
  content: string; // HTML string
  markdownContent?: string; // Parsed or extracted raw markdown
  ctime: number;
  mtime: number;
  ver: string;
  tag: string[];
  recycle?: boolean;
  encrypt?: boolean;
  attachment?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
  }>;
}

export interface SynoTag {
  tag_id?: string;
  name?: string;
  title?: string;
  items?: string[];
  note_count?: number;
}

export interface SyncTargetResult {
  targetServerId: string;
  targetNotebookId: string;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  targetNoteId?: string;
  error?: string;
}

