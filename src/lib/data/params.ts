import { z } from 'zod';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ids are matched by shape only. Strict RFC variant checks would reject ids
// that Postgres generated from a hash, which the demo data uses.
export function isEntityId(value: string): boolean {
  return uuidPattern.test(value);
}

export type RawParams = Record<string, string | string[] | undefined>;

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// A filter the page does not recognise is dropped rather than rejected, so a
// stale or hand-edited link still shows the list.
export const optionalEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value !== '' ? value : undefined),
    z.enum(values).optional().catch(undefined),
  );

export const pageNumber = z.preprocess(
  (value) => (typeof value === 'string' ? Number(value) : value),
  z.number().int().min(1).max(10_000).catch(1),
);
