import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as enums from '@/lib/domain/enums';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function readEnumsFromMigrations(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    for (const match of sql.matchAll(/create type public\.(\w+) as enum \(([^)]*)\)/g)) {
      const name = match[1];
      const body = match[2];
      if (name === undefined || body === undefined) continue;
      found.set(
        name,
        [...body.matchAll(/'([^']+)'/g)].map((value) => value[1] ?? ''),
      );
    }
  }
  return found;
}

const pairs: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['app_role', enums.appRoles],
  ['content_state', enums.contentStates],
  ['claim_status', enums.claimStatuses],
  ['claim_category', enums.claimCategories],
  ['evidence_position', enums.evidencePositions],
  ['source_type', enums.sourceTypes],
  ['assessment_criterion', enums.assessmentCriteria],
  ['criterion_status', enums.criterionStatuses],
  ['collection_visibility', enums.collectionVisibilities],
  ['content_entity', enums.contentEntities],
  ['review_target', enums.reviewTargets],
  ['review_decision', enums.reviewDecisions],
  ['report_kind', enums.reportKinds],
  ['report_status', enums.reportStatuses],
  ['notification_type', enums.notificationTypes],
];

describe('domain enums', () => {
  const fromSql = readEnumsFromMigrations();

  it('covers every enum the database defines', () => {
    expect([...fromSql.keys()].sort()).toEqual(pairs.map(([name]) => name).sort());
  });

  for (const [name, values] of pairs) {
    it(`matches the database values of ${name}`, () => {
      expect(fromSql.get(name)).toEqual([...values]);
    });
  }
});
