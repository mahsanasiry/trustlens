// One-off helper: adds the scripts introduced by the translation tools and the
// end-to-end tests to the existing package.json without touching anything else.
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'package.json';
const pkg = JSON.parse(readFileSync(file, 'utf8'));
const has = (name) => Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);

for (const name of ['zod', 'vitest', 'prettier', 'next-intl']) {
  if (!has(name)) {
    console.error(
      `package.json has no "${name}", so it is not the complete file. Restore it from git first.`,
    );
    process.exit(1);
  }
}

const wanted = {
  'test:e2e': 'playwright test',
  'locales:report': 'node scripts/locale-tools.mjs report',
  'locales:export': 'node scripts/locale-tools.mjs export',
};

const added = [];
for (const [name, command] of Object.entries(wanted)) {
  if (pkg.scripts[name] === undefined) {
    pkg.scripts[name] = command;
    added.push(name);
  }
}
writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(
  added.length > 0 ? `Added scripts: ${added.join(', ')}` : 'Scripts already present.',
);

const readme = readFileSync('README.md', 'utf8');
const old = 'pnpm exec playwright install chromium   # once\n';
const next =
  'pnpm exec playwright install chromium   # once; if the download is blocked, see docs/e2e.md\n';
if (readme.includes(old)) {
  writeFileSync('README.md', readme.replace(old, next));
  console.log('Updated the README note.');
}
