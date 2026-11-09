import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    'DATABASE_URL is not set. Point it at an empty scratch database; the migrations are applied to it.',
  );
  process.exit(1);
}

function psql(sql, label) {
  const result = spawnSync(
    'psql',
    [
      '--no-psqlrc',
      '--quiet',
      '--tuples-only',
      '--no-align',
      '-v',
      'ON_ERROR_STOP=1',
      databaseUrl,
    ],
    { input: sql, encoding: 'utf8' },
  );
  if (result.error) {
    console.error(`Could not run psql: ${result.error.message}`);
    process.exit(1);
  }
  const output = `${result.stdout}${result.stderr}`
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');
  return { ok: result.status === 0, output, label };
}

function read(...parts) {
  return readFileSync(join(root, 'supabase', ...parts), 'utf8');
}

const setup = [
  read('tests', 'support', 'supabase_stub.sql'),
  ...readdirSync(join(root, 'supabase', 'migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => read('migrations', name)),
].join('\n');

const applied = psql(setup, 'migrations');
if (!applied.ok) {
  console.error(`Migrations failed to apply:\n${applied.output}`);
  process.exit(1);
}
console.log('Migrations applied.');

const helpers = read('tests', 'support', 'helpers.sql');
const fixtures = read('tests', 'support', 'fixtures.sql');
const suites = readdirSync(join(root, 'supabase', 'tests'))
  .filter((name) => name.endsWith('.test.sql'))
  .sort();

let failed = false;
for (const suite of suites) {
  const script = [
    'begin;',
    helpers,
    fixtures,
    read('tests', suite),
    'select tests.finish();',
    'rollback;',
  ].join('\n');
  const outcome = psql(script, suite);
  const summary = outcome.output
    .split('\n')
    .filter((line) => /FAIL|checks passed|ERROR/.test(line));
  console.log(`${outcome.ok ? 'ok  ' : 'FAIL'} ${suite}`);
  for (const line of summary) console.log(`     ${line}`);
  if (!outcome.ok) failed = true;
}

process.exit(failed ? 1 : 0);
