import { type EvidencePosition } from '@/lib/domain/enums';

interface SampleEvidence {
  readonly id: string;
  readonly position: EvidencePosition;
  readonly source: string;
  readonly detail: string;
}

// Fictional content for the home page. Like every claim on the platform, the
// statement and its sources stay in their original language when the
// interface is translated.
export const sampleClaim = {
  statement: 'Brightwater’s new bus lanes cut the average commute by 12 percent.',
  evidence: [
    {
      id: 'transit-study',
      position: 'supports',
      source: 'Brightwater Transit Authority',
      detail: 'Journey-time study, 2025',
    },
    {
      id: 'rider-survey',
      position: 'supports',
      source: 'Eastgate Commuter Panel',
      detail: 'Rider survey, 2025',
    },
    {
      id: 'pilot-report',
      position: 'context',
      source: 'Brightwater City Council',
      detail: 'Pilot scheme report, 2024',
    },
    {
      id: 'traffic-counts',
      position: 'contradicts',
      source: 'Northfield Traffic Lab',
      detail: 'Independent traffic counts, 2025',
    },
  ],
} as const satisfies {
  readonly statement: string;
  readonly evidence: readonly SampleEvidence[];
};

export function countByPosition(evidence: readonly SampleEvidence[]) {
  const counts: Record<EvidencePosition, number> = {
    supports: 0,
    context: 0,
    contradicts: 0,
  };
  for (const item of evidence) counts[item.position] += 1;
  return counts;
}
