/**
 * Note Station Plus - Local Logging Service
 * Records crucial application operations (CRUD on notes, notebooks, tags, attachments, sync, auth)
 * and error/exception traces with local persistence, privacy redaction, and export capabilities.
 */

export type LogLevel = 'info' | 'warn' | 'error';
export type LogCategory = 'note' | 'notebook' | 'tag' | 'attachment' | 'sync' | 'auth' | 'system';

export interface LogEntry {
  id: string;
  timestamp: number;
  time: string;
  level: LogLevel;
  category: LogCategory;
  action: string;
  message: string;
  details?: any;
  error?: string;
}

const STORAGE_KEY = 'note_station_plus_logs';
const MAX_LOGS = 1000;
const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'sid',
  '_sid',
  'otp_code',
  'otpCode',
  'token',
  'secret',
  'credential',
  'pin'
]);

function formatTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function sanitizeDetails(value: any, depth = 0): any {
  if (depth > 5) return '[Truncated]';
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
      stack: value.stack
    };
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeDetails(item, depth + 1));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleaned[key] = '******';
    } else {
      cleaned[key] = sanitizeDetails(val, depth + 1);
    }
  }
  return cleaned;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private listeners: Set<() => void> = new Set();
  private saveTimeout: any = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(-MAX_LOGS);
        }
      }
    } catch (e) {
      console.warn('Failed to load local logs from storage', e);
    }
  }

  private scheduleSave() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (this.saveTimeout) return;

    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
      } catch (e) {
        // If storage is full, keep only the latest 300 logs and retry
        try {
          this.logs = this.logs.slice(-300);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
        } catch {}
      }
    }, 500);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {}
    }
  }

  public log(
    level: LogLevel,
    category: LogCategory,
    action: string,
    message: string,
    details?: any,
    err?: any
  ): LogEntry {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      timestamp: Date.now(),
      time: formatTimestamp(),
      level,
      category,
      action,
      message,
      details: sanitizeDetails(details),
      error: err ? (err?.stack || err?.message || String(err)) : undefined
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    this.scheduleSave();
    this.notify();

    // Also mirror to browser console
    const consoleMsg = `[${entry.time}] [${level.toUpperCase()}] [${category}:${action}] ${message}`;
    if (level === 'error') {
      console.error(consoleMsg, details || '', err || '');
    } else if (level === 'warn') {
      console.warn(consoleMsg, details || '');
    } else {
      console.log(consoleMsg, details || '');
    }

    return entry;
  }

  public info(category: LogCategory, action: string, message: string, details?: any): LogEntry {
    return this.log('info', category, action, message, details);
  }

  public warn(category: LogCategory, action: string, message: string, details?: any): LogEntry {
    return this.log('warn', category, action, message, details);
  }

  public error(category: LogCategory, action: string, message: string, err?: any, details?: any): LogEntry {
    return this.log('error', category, action, message, details, err);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public exportLogsAsText(): string {
    if (this.logs.length === 0) {
      return '=== Note Station Plus 运行日志 (无记录) ===\n';
    }

    const header = [
      '==================================================',
      ` Note Station Plus 运行日志导出`,
      ` 导出时间: ${formatTimestamp()}`,
      ` 总记录数: ${this.logs.length}`,
      '==================================================\n'
    ].join('\n');

    const lines = this.logs.map(log => {
      let line = `[${log.time}] [${log.level.toUpperCase()}] [${log.category}:${log.action}] ${log.message}`;
      if (log.details && Object.keys(log.details).length > 0) {
        line += `\n  - Details: ${JSON.stringify(log.details)}`;
      }
      if (log.error) {
        line += `\n  - Error: ${log.error}`;
      }
      return line;
    });

    return header + lines.join('\n\n');
  }

  public downloadLogs(): void {
    const content = this.exportLogsAsText();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `note-station-plus-logs-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.log`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

export const logger = new LoggerService();
