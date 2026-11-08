export type TextDirection = 'ltr' | 'rtl';

export type Script =
  | 'latin'
  | 'vietnamese'
  | 'cyrillic'
  | 'arabic'
  | 'persian'
  | 'urdu'
  | 'hebrew'
  | 'devanagari'
  | 'bengali'
  | 'hans'
  | 'hant'
  | 'jpan'
  | 'kore';

export interface LocaleDefinition {
  readonly nativeName: string;
  readonly englishName: string;
  readonly dir: TextDirection;
  readonly script: Script;
}

/**
 * The single registry of supported languages. Adding a language means adding
 * an entry here and a messages/<code>/ directory; nothing else is required.
 */
export const localeRegistry = {
  en: { nativeName: 'English', englishName: 'English', dir: 'ltr', script: 'latin' },
  'zh-CN': {
    nativeName: '简体中文',
    englishName: 'Chinese (Simplified)',
    dir: 'ltr',
    script: 'hans',
  },
  'zh-TW': {
    nativeName: '繁體中文',
    englishName: 'Chinese (Traditional)',
    dir: 'ltr',
    script: 'hant',
  },
  hi: { nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', script: 'devanagari' },
  es: { nativeName: 'Español', englishName: 'Spanish', dir: 'ltr', script: 'latin' },
  fr: { nativeName: 'Français', englishName: 'French', dir: 'ltr', script: 'latin' },
  ar: { nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', script: 'arabic' },
  bn: { nativeName: 'বাংলা', englishName: 'Bengali', dir: 'ltr', script: 'bengali' },
  'pt-BR': {
    nativeName: 'Português (Brasil)',
    englishName: 'Portuguese (Brazil)',
    dir: 'ltr',
    script: 'latin',
  },
  ru: { nativeName: 'Русский', englishName: 'Russian', dir: 'ltr', script: 'cyrillic' },
  ur: { nativeName: 'اردو', englishName: 'Urdu', dir: 'rtl', script: 'urdu' },
  id: {
    nativeName: 'Bahasa Indonesia',
    englishName: 'Indonesian',
    dir: 'ltr',
    script: 'latin',
  },
  de: { nativeName: 'Deutsch', englishName: 'German', dir: 'ltr', script: 'latin' },
  ja: { nativeName: '日本語', englishName: 'Japanese', dir: 'ltr', script: 'jpan' },
  tr: { nativeName: 'Türkçe', englishName: 'Turkish', dir: 'ltr', script: 'latin' },
  ko: { nativeName: '한국어', englishName: 'Korean', dir: 'ltr', script: 'kore' },
  vi: {
    nativeName: 'Tiếng Việt',
    englishName: 'Vietnamese',
    dir: 'ltr',
    script: 'vietnamese',
  },
  it: { nativeName: 'Italiano', englishName: 'Italian', dir: 'ltr', script: 'latin' },
  fa: { nativeName: 'فارسی', englishName: 'Persian', dir: 'rtl', script: 'persian' },
  he: { nativeName: 'עברית', englishName: 'Hebrew', dir: 'rtl', script: 'hebrew' },
  pl: { nativeName: 'Polski', englishName: 'Polish', dir: 'ltr', script: 'latin' },
  nl: { nativeName: 'Nederlands', englishName: 'Dutch', dir: 'ltr', script: 'latin' },
} as const satisfies Record<string, LocaleDefinition>;

export type LocaleCode = keyof typeof localeRegistry;

export const defaultLocale: LocaleCode = 'en';

export const locales = Object.keys(localeRegistry) as LocaleCode[];

export function isLocaleCode(value: string): value is LocaleCode {
  return Object.hasOwn(localeRegistry, value);
}

export function getDirection(locale: LocaleCode): TextDirection {
  return localeRegistry[locale].dir;
}
