import { bookmarkKinds, type BookmarkKind } from './bookmark-params';
import { firstValue, isEntityId, type RawParams } from './params';

// After something is removed, the page it returns to carries what was removed in
// the address, so it can offer to put it back. Nothing is kept on the server.
const param = 'removed';

export interface Removed {
  kind: BookmarkKind;
  id: string;
}

export function parseRemoved(raw: RawParams): Removed | null {
  const value = firstValue(raw[param]);
  if (!value) return null;

  const [kind, id, ...rest] = value.split('.');
  if (rest.length > 0 || !kind || !id || !isEntityId(id)) return null;
  const known = bookmarkKinds.find((candidate) => candidate === kind);
  return known ? { kind: known, id } : null;
}

export function withRemoved(path: string, removed: Removed): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${param}=${removed.kind}.${removed.id}`;
}

/** What a deleted collection row held: a claim or a source. */
export function removedItem(row: unknown): Removed | null {
  if (typeof row !== 'object' || row === null) return null;
  const { claim_id: claimId, source_id: sourceId } = row as Record<string, unknown>;
  if (typeof claimId === 'string' && isEntityId(claimId))
    return { kind: 'claim', id: claimId };
  if (typeof sourceId === 'string' && isEntityId(sourceId))
    return { kind: 'source', id: sourceId };
  return null;
}
