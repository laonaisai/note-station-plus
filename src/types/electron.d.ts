export interface ElectronAPI {
  platform: string;
  version: string;
  safeStorage?: {
    isAvailable: () => Promise<boolean>;
    encryptString: (plainText: string) => Promise<string | null>;
    decryptString: (encryptedBase64: string) => Promise<string | null>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

