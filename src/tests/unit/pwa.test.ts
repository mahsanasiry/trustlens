import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';
import { getDirection, locales } from '@/lib/i18n/locales';

const publicDir = join(process.cwd(), 'public');
const read = (file: string) => readFileSync(join(publicDir, file), 'utf8');

interface OfflineMessage {
  dir: string;
  title: string;
  text: string;
  retry: string;
}

function offlineMessages(): Record<string, OfflineMessage> {
  const match =
    /<script type="application\/json" id="messages">([\s\S]*?)<\/script>/.exec(
      read('offline.html'),
    );
  expect(match).not.toBeNull();
  return JSON.parse(match?.[1] ?? '{}') as Record<string, OfflineMessage>;
}

describe('web app manifest', () => {
  const data = manifest();

  it('opens the site as a standalone app from its root', () => {
    expect(data.start_url).toBe('/');
    expect(data.scope).toBe('/');
    expect(data.display).toBe('standalone');
  });

  it('ships every icon it lists', () => {
    for (const icon of data.icons ?? []) {
      expect(existsSync(join(publicDir, icon.src))).toBe(true);
    }
  });

  it('offers a maskable icon and a 512 pixel icon for installation', () => {
    const icons = data.icons ?? [];
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    expect(icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any')).toBe(
      true,
    );
  });
});

describe('offline page', () => {
  const messages = offlineMessages();

  it('has a message for every supported language and no others', () => {
    expect(Object.keys(messages).sort()).toEqual([...locales].sort());
  });

  it('sets the text direction the language needs', () => {
    for (const locale of locales) {
      expect(messages[locale]?.dir).toBe(getDirection(locale));
    }
  });

  it('has no empty text', () => {
    for (const locale of locales) {
      const message = messages[locale];
      expect(message?.title.trim()).not.toBe('');
      expect(message?.text.trim()).not.toBe('');
      expect(message?.retry.trim()).not.toBe('');
    }
  });
});

describe('service worker', () => {
  const worker = read('sw.js');

  it('leaves everything except GET requests to the network', () => {
    expect(worker).toContain("request.method !== 'GET'");
  });

  it('only handles requests to its own origin', () => {
    expect(worker).toContain('url.origin !== self.location.origin');
  });

  it('caches build files only, never pages or API responses', () => {
    expect(worker).toContain("startsWith('/_next/static/')");
    expect(worker).not.toContain('/api/');
  });

  it('falls back to the offline page it precaches', () => {
    expect(worker).toContain("const OFFLINE_URL = '/offline.html'");
    expect(worker).toContain('cache.addAll([OFFLINE_URL');
  });
});
