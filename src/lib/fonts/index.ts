import type { Script } from '@/lib/i18n/locales';

/**
 * Each script has its own module so the bundler only emits the font faces of
 * the active locale. A static map of dynamic imports keeps that guarantee
 * explicit and lets the compiler see every font declaration.
 */
const loaders: Record<Script, () => Promise<{ fontClassName: string }>> = {
  latin: () => import('./latin'),
  vietnamese: () => import('./vietnamese'),
  cyrillic: () => import('./cyrillic'),
  arabic: () => import('./arabic'),
  persian: () => import('./persian'),
  urdu: () => import('./urdu'),
  hebrew: () => import('./hebrew'),
  devanagari: () => import('./devanagari'),
  bengali: () => import('./bengali'),
  hans: () => import('./hans'),
  hant: () => import('./hant'),
  jpan: () => import('./jpan'),
  kore: () => import('./kore'),
};

export async function getFontClassName(script: Script): Promise<string> {
  const { fontClassName } = await loaders[script]();
  return fontClassName;
}
