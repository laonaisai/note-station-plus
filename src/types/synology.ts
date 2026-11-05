export interface ServerProfile {
  id: string;               // UUID
  alias: string;            // User-friendly name e.g. "家庭NAS", "办公室群晖"
  serverUrl: string;        // e.g. https://nas.example.com:5001 or http://192.168.1.100:5000
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
  acl?: NoteAcl;
  attachment?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
  }>;
}

export interface NoteAcl {
  enabled?: boolean;
  public?: {
    inherit?: boolean;
    perm: 'ro' | 'rw';
  };
  dsm_user?: Record<string, { inherit?: boolean; name: string; perm: 'ro' | 'rw' }>;
  dsm_group?: Record<string, { inherit?: boolean; name: string; perm: 'ro' | 'rw' }>;
}

export interface NoteVersion {
  id: number;
  version: string;
  mtime: number;
  author: string;
  last_version?: string[];
  commit_msg?: {
    listable?: boolean;
    first_version?: boolean;
    device?: string;
    [key: string]: any;
  };
}

export interface SharePrivItem {
  name: string;
  type: 'user' | 'group';
}

export interface SharedMember {
  name: string;
  type: 'user' | 'group';
  perm: 'ro' | 'rw';
}

export interface NoteShareInfo {
  objectId: string;
  publicUrl: string;
  isPublicEnabled: boolean;
  publicPerm: 'ro' | 'rw';
  members: SharedMember[];
  availableUsers: string[];
  availableGroups: string[];
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

