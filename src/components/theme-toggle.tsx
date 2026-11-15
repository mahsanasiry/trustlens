'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { themeStorageKeys } from '@/lib/theme/init-script';

type ThemeMode = 'light' | 'dark';

const modes: readonly ThemeMode[] = ['light', 'dark'];
const listeners = new Set<() => void>();

function storedMode(): ThemeMode | null {
  try {
    const stored = window.localStorage.getItem(themeStorageKeys.theme);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

// Until the reader picks a theme, the page follows the operating system.
function currentMode(): ThemeMode {
  return (
    storedMode() ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

function applyMode(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
}

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);

  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (storedMode() === null) {
      applyMode(currentMode());
      notify();
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === themeStorageKeys.theme) {
      applyMode(currentMode());
      onChange();
    }
  };
  query.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(onChange);
    query.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
  };
}

function choose(mode: ThemeMode) {
  try {
    window.localStorage.setItem(themeStorageKeys.theme, mode);
  } catch {
    // Storage can be blocked. The choice still applies until the page closes.
  }
  applyMode(mode);
  notify();
}

const icons: Record<ThemeMode, string> = {
  light:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  dark: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
};

export function ThemeToggle() {
  const t = useTranslations('common.theme');
  const mode = useSyncExternalStore(subscribe, currentMode, () => 'light' as ThemeMode);

  return (
    <div role="group" aria-label={t('label')} className="theme-toggle">
      {modes.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={mode === option}
          onClick={() => choose(option)}
          className="theme-toggle__option"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d={icons[option]} />
          </svg>
          <span className="visually-hidden">{t(option)}</span>
        </button>
      ))}
    </div>
  );
}
