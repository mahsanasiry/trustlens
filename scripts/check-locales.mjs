import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';

const root = fileURLToPath(new URL('..', import.meta.url));
const messagesDir = join(root, 'messages');
const sourceLocale = 'en';

function readRegisteredLocales() {
  const source = readFileSync(join(root, 'src/lib/i18n/locales.ts'), 'utf8');
  const body = source.slice(source.indexOf('localeRegistry = {'));
  const end = body.indexOf('} as const satisfies');
  const registry = body.slice(0, end);
  return [...registry.matchAll(/(?:'([A-Za-z-]+)'|([A-Za-z]+)):\s*\{\s*nativeName/g)].map(
    (match) => match[1] ?? match[2],
  );
}

function readNamespaces() {
  const source = readFileSync(join(root, 'src/lib/i18n/namespaces.ts'), 'utf8');
  const match = source.match(/messageNamespaces = \[([^\]]*)\]/);
  if (!match) throw new Error('Could not read messageNamespaces from namespaces.ts');
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function flatten(value, prefix = '') {
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      Object.assign(result, flatten(child, path));
    } else {
      result[path] = child;
    }
  }
  return result;
}

function requiredPluralCategories(locale) {
  const rules = new Intl.PluralRules(locale);
  const categories = new Set(['other']);
  for (let value = 0; value <= 1000; value += 1) categories.add(rules.select(value));
  return categories;
}

function inspect(elements, locale, state) {
  for (const element of elements) {
    switch (element.type) {
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
        state.args.add(element.value);
        break;
      case TYPE.select:
        state.args.add(element.value);
        for (const option of Object.values(element.options)) {
          inspect(option.value, locale, state);
        }
        break;
      case TYPE.plural: {
        state.args.add(element.value);
        const provided = Object.keys(element.options);
        if (!provided.includes('other')) state.problems.push('plural without "other"');
        if (element.pluralType !== 'ordinal') {
          for (const category of requiredPluralCategories(locale)) {
            if (!provided.includes(category)) {
              state.problems.push(`plural for "${element.value}" lacks "${category}"`);
            }
          }
        }
        for (const option of Object.values(element.options)) {
          inspect(option.value, locale, state);
        }
        break;
      }
      case TYPE.tag:
        inspect(element.children, locale, state);
        break;
      default:
        break;
    }
  }
}

function analyse(message, locale) {
  const state = { args: new Set(), problems: [] };
  try {
    inspect(parse(message), locale, state);
  } catch (error) {
    state.problems.push(
      `invalid ICU syntax: ${error instanceof Error ? error.message : error}`,
    );
  }
  return state;
}

function readLocale(locale, namespaces, errors) {
  const dir = join(messagesDir, locale);
  if (!existsSync(dir)) {
    errors.push(`${locale}: messages directory is missing`);
    return {};
  }
  const present = readdirSync(dir).filter((name) => name.endsWith('.json'));
  const expected = namespaces.map((namespace) => `${namespace}.json`);
  for (const name of expected) {
    if (!present.includes(name)) errors.push(`${locale}: ${name} is missing`);
  }
  for (const name of present) {
    if (!expected.includes(name))
      errors.push(`${locale}: ${name} is not a registered namespace`);
  }

  const flat = {};
  for (const namespace of namespaces) {
    const file = join(dir, `${namespace}.json`);
    if (!existsSync(file)) continue;
    try {
      Object.assign(
        flat,
        flatten({ [namespace]: JSON.parse(readFileSync(file, 'utf8')) }),
      );
    } catch (error) {
      errors.push(`${locale}/${namespace}.json: invalid JSON (${error.message})`);
    }
  }
  return flat;
}

const errors = [];
const registered = readRegisteredLocales();
const namespaces = readNamespaces();

if (!registered.includes(sourceLocale))
  errors.push(`registry has no "${sourceLocale}" locale`);

const onDisk = readdirSync(messagesDir).filter((name) =>
  statSync(join(messagesDir, name)).isDirectory(),
);
for (const name of onDisk) {
  if (!registered.includes(name))
    errors.push(`messages/${name} is not in the locale registry`);
}

const source = readLocale(sourceLocale, namespaces, errors);
const sourceArgs = Object.fromEntries(
  Object.entries(source).map(([key, message]) => [
    key,
    analyse(String(message), sourceLocale).args,
  ]),
);

for (const locale of registered) {
  const messages =
    locale === sourceLocale ? source : readLocale(locale, namespaces, errors);
  const keys = new Set(Object.keys(messages));

  for (const key of Object.keys(source)) {
    if (!keys.has(key)) errors.push(`${locale}: missing key "${key}"`);
  }
  for (const key of keys) {
    if (!(key in source)) errors.push(`${locale}: extra key "${key}"`);
  }

  for (const [key, message] of Object.entries(messages)) {
    if (typeof message !== 'string' || message.trim() === '') {
      errors.push(`${locale}: "${key}" must be a non-empty string`);
      continue;
    }
    const { args, problems } = analyse(message, locale);
    for (const problem of problems) errors.push(`${locale}: "${key}" ${problem}`);

    const expectedArgs = sourceArgs[key];
    if (expectedArgs) {
      const missing = [...expectedArgs].filter((name) => !args.has(name));
      const extra = [...args].filter((name) => !expectedArgs.has(name));
      if (missing.length > 0)
        errors.push(`${locale}: "${key}" lacks placeholder ${missing.join(', ')}`);
      if (extra.length > 0)
        errors.push(`${locale}: "${key}" has unknown placeholder ${extra.join(', ')}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`\nLocale check failed with ${errors.length} problem(s).`);
  process.exit(1);
}

console.log(
  `Locale check passed: ${registered.length} locales, ${namespaces.length} namespaces, ${Object.keys(source).length} keys each.`,
);
