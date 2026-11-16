import { localeRegistry, locales } from '@/lib/i18n/locales';

interface LanguageSelectProps {
  id: string;
  label: string;
  defaultValue: string;
}

// Each language is named in itself, as in the language switcher, so it can be
// found without reading the interface language.
export function LanguageSelect({ id, label, defaultValue }: LanguageSelectProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name="language" defaultValue={defaultValue} required>
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeRegistry[code].nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
