import { evidencePositions, type EvidencePosition } from '@/lib/domain/enums';

export function countPositions(
  items: readonly { position: EvidencePosition }[],
): Record<EvidencePosition, number> {
  const counts = Object.fromEntries(
    evidencePositions.map((position) => [position, 0]),
  ) as Record<EvidencePosition, number>;
  for (const item of items) counts[item.position] += 1;
  return counts;
}
