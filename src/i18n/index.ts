import { ref, computed } from 'vue';
import { SupportedLocale, SUPPORTED_LOCALES, TranslationMessages } from './types';
import { zhCN } from './locales/zh-CN';
import { zhTW } from './locales/zh-TW';
import { enUS } from './locales/en-US';
import { jaJP } from './locales/ja-JP';

export * from './types';

const LOCALE_STORAGE_KEY = 'note_station_plus_locale';

const messagesMap: Record<SupportedLocale, TranslationMessages> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en-US': enUS,
  'ja-JP': jaJP
};

function getSavedLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null;
    if (saved && messagesMap[saved]) {
      return saved;
    }
  } catch {}

  // Detect system/browser language
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || '').toLowerCase();
    if (lang.startsWith('zh-tw') || lang.startsWith('zh-hk')) {
      return 'zh-TW';
    }
    if (lang.startsWith('zh')) {
      return 'zh-CN';
    }
    if (lang.startsWith('ja')) {
      return 'ja-JP';
    }
    if (lang.startsWith('en')) {
      return 'en-US';
    }
  }

  return 'zh-CN';
}

export const currentLocale = ref<SupportedLocale>(getSavedLocale());

export function setLocale(locale: SupportedLocale) {
  if (messagesMap[locale]) {
    currentLocale.value = locale;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
    if (typeof window !== 'undefined' && window.electronAPI?.setLocale) {
      window.electronAPI.setLocale(locale);
    }
  }
}

export function initLocale() {
  const loc = getSavedLocale();
  setLocale(loc);
}

/**
 * Translate a key (e.g. 'common.save' or 'editor.saveFailed') with optional variable interpolation
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const locale = currentLocale.value;
  const currentMsg = messagesMap[locale] || messagesMap['zh-CN'];
  const fallbackMsg = messagesMap['zh-CN'];

  const parts = key.split('.');
  let val: any = currentMsg;
  for (const part of parts) {
    if (val && typeof val === 'object' && part in val) {
      val = val[part];
    } else {
      val = undefined;
      break;
    }
  }

  // Fallback to zh-CN if not found in target locale
  if (val === undefined) {
    let fbVal: any = fallbackMsg;
    for (const part of parts) {
      if (fbVal && typeof fbVal === 'object' && part in fbVal) {
        fbVal = fbVal[part];
      } else {
        fbVal = undefined;
        break;
      }
    }
    val = fbVal ?? key;
  }

  if (typeof val !== 'string') {
    return key;
  }

  if (params) {
    return val.replace(/\{(\w+)\}/g, (_, k) => {
      return params[k] !== undefined ? String(params[k]) : `{${k}}`;
    });
  }

  return val;
}

export const activeLocaleOption = computed(() => {
  return SUPPORTED_LOCALES.find(l => l.code === currentLocale.value) || SUPPORTED_LOCALES[0];
});
