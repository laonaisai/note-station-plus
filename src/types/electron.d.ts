export interface ElectronAPI {
  platform: string;
  version: string;
  getAppVersion?: () => Promise<string>;
  setLocale?: (locale: string) => void;
  safeStorage?: {
    isAvailable: () => Promise<boolean>;
    encryptString: (plainText: string) => Promise<string | null>;
    decryptString: (encryptedBase64: string) => Promise<string | null>;
  };
  print?: {
    toPdf: (params: { html: string; title: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
    direct: (params: { html: string }) => Promise<{ success: boolean; error?: string }>;
  };
}

declare global {
  const __APP_VERSION__: string;
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

