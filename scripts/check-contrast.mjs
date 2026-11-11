import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cssPath = fileURLToPath(new URL('../src/app/globals.css', import.meta.url));
const css = readFileSync(cssPath, 'utf8');

const accents = ['default', 'teal', 'plum', 'amber'];
const themes = ['light', 'dark'];

/** [foreground, background, minimum ratio, description] */
const pairs = [
  ['text', 'bg', 4.5, 'body text on page'],
  ['text', 'surface', 4.5, 'body text on surface'],
  ['text-muted', 'bg', 4.5, 'muted text on page'],
  ['text-muted', 'surface', 4.5, 'muted text on surface'],
  ['text-muted', 'surface-sunken', 4.5, 'muted text on sunken surface'],
  ['accent', 'bg', 4.5, 'accent text on page'],
  ['accent', 'surface', 4.5, 'accent text on surface'],
  ['accent-strong', 'surface', 4.5, 'strong accent text on surface'],
  ['on-accent', 'accent', 4.5, 'text on accent fill'],
  ['accent', 'accent-soft', 4.5, 'accent text on soft accent fill'],
  ['pos-supports', 'pos-supports-soft', 4.5, 'supporting evidence label'],
  ['pos-contradicts', 'pos-contradicts-soft', 4.5, 'contradicting evidence label'],
  ['pos-context', 'pos-context-soft', 4.5, 'context evidence label'],
  ['panel-text', 'panel-bg', 4.5, 'text on the dark panel'],
  ['panel-muted', 'panel-bg', 4.5, 'muted text on the dark panel'],
  ['panel-supports', 'panel-bg', 4.5, 'supporting evidence on the dark panel'],
  ['panel-context', 'panel-bg', 4.5, 'context evidence on the dark panel'],
  ['panel-contradicts', 'panel-bg', 4.5, 'contradicting evidence on the dark panel'],
  ['border-strong', 'bg', 3, 'control boundary on page'],
  ['border-strong', 'surface', 3, 'control boundary on surface'],
  ['focus-ring', 'bg', 3, 'focus indicator on page'],
  ['focus-ring', 'surface', 3, 'focus indicator on surface'],
];

function parseBlocks(source) {
  const blocks = [];
  const pattern = /(^|\n)(:root[^{]*)\{([^}]*)\}/g;
  for (const match of source.matchAll(pattern)) {
    const selector = match[2].trim();
    const attrs = [...selector.matchAll(/\[data-([a-z]+)='([a-z]+)'\]/g)].map((m) => [
      m[1],
      m[2],
    ]);
    const vars = {};
    for (const decl of match[3].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
      vars[decl[1]] = decl[2];
    }
    if (Object.keys(vars).length > 0)
      blocks.push({ attrs: Object.fromEntries(attrs), vars });
  }
  return blocks;
}

function resolve(blocks, theme, accent) {
  const matches = (block, expectedTheme, expectedAccent) => {
    const { theme: blockTheme, accent: blockAccent, ...rest } = block.attrs;
    if (Object.keys(rest).length > 0) return false;
    return blockTheme === expectedTheme && blockAccent === expectedAccent;
  };
  const order = [
    [undefined, undefined],
    [undefined, accent === 'default' ? undefined : accent],
    ...(theme === 'dark'
      ? [
          ['dark', undefined],
          ['dark', accent === 'default' ? undefined : accent],
        ]
      : []),
  ];
  const resolved = {};
  for (const [blockTheme, blockAccent] of order) {
    for (const block of blocks) {
      if (matches(block, blockTheme, blockAccent)) Object.assign(resolved, block.vars);
    }
  }
  return resolved;
}

function channel(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const blocks = parseBlocks(css);
const failures = [];
let checked = 0;

for (const theme of themes) {
  for (const accent of accents) {
    const tokens = resolve(blocks, theme, accent);
    for (const [foreground, background, minimum, description] of pairs) {
      const fg = tokens[foreground];
      const bg = tokens[background];
      if (!fg || !bg) {
        failures.push(
          `${theme}/${accent}: token missing for ${foreground} or ${background}`,
        );
        continue;
      }
      checked += 1;
      const value = ratio(fg, bg);
      if (value < minimum) {
        failures.push(
          `${theme}/${accent}: ${description} is ${value.toFixed(2)}:1, needs ${minimum}:1 (${foreground} ${fg} on ${background} ${bg})`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  console.error(`\n${failures.length} contrast failure(s) in ${checked} checks.`);
  process.exit(1);
}

console.log(
  `Contrast check passed: ${checked} token pairs across ${themes.length} themes and ${accents.length} accents.`,
);
