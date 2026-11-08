import { describe, expect, it } from 'vitest';
import {
  defaultLocale,
  getDirection,
  isLocaleCode,
  localeRegistry,
  locales,
} from '@/lib/i18n/locales';

describe('locale registry', () => {
  it('registers the 22 launch languages', () => {
    expect(locales).toHaveLength(22);
    expect(new Set(locales).size).toBe(22);
  });

  it('uses English as the default locale', () => {
    expect(defaultLocale).toBe('en');
    expect(locales).toContain(defaultLocale);
  });

  it('marks exactly Arabic, Urdu, Persian and Hebrew as right-to-left', () => {
    const rtl = locales.filter((code) => getDirection(code) === 'rtl').sort();
    expect(rtl).toEqual(['ar', 'fa', 'he', 'ur']);
  });

  it('gives every language a distinct native name', () => {
    const names = locales.map((code) => localeRegistry[code].nativeName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('recognises only registered codes', () => {
    expect(isLocaleCode('fa')).toBe(true);
    expect(isLocaleCode('pt-BR')).toBe(true);
    expect(isLocaleCode('xx')).toBe(false);
    expect(isLocaleCode('toString')).toBe(false);
  });
});
