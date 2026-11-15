import { isLocaleCode, type LocaleCode } from '@/lib/i18n/locales';

export const displayNameMaxLength = 80;

export const profileErrors = ['name', 'type', 'size', 'failed'] as const;
export type ProfileError = (typeof profileErrors)[number];

// What the form shows after an action. The id changes with every answer so the
// page can tell a new result from one it has already shown.
export type ProfileState =
  | { id: number; status: 'idle' }
  | { id: number; status: 'saved'; message: 'saved' | 'removed' }
  | { id: number; status: 'error'; error: ProfileError };

// The database counts characters, not UTF-16 units, so an emoji or a rare
// script character must count once here as well.
export function normaliseDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  const length = Array.from(name).length;
  return length >= 1 && length <= displayNameMaxLength ? name : null;
}

export type ProfileForm =
  | { locale: LocaleCode; intent: 'remove' }
  | { locale: LocaleCode; intent: 'save'; displayName: string | null; file: File | null };

export function parseProfileForm(form: FormData): ProfileForm | null {
  const locale = form.get('locale');
  if (typeof locale !== 'string' || !isLocaleCode(locale)) return null;

  const intent = form.get('intent');
  if (intent === 'remove') return { locale, intent };
  if (intent !== 'save') return null;

  const file = form.get('avatar');
  return {
    locale,
    intent,
    displayName: normaliseDisplayName(form.get('displayName')),
    // An empty file input still posts a zero-byte entry; treat it as "no file".
    file: file instanceof File && file.size > 0 ? file : null,
  };
}
