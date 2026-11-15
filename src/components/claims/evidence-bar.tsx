import { useFormatter, useTranslations } from 'next-intl';
import { evidencePositions, type EvidencePosition } from '@/lib/domain/enums';

interface EvidenceBarProps {
  counts: Record<EvidencePosition, number>;
}

export function EvidenceBar({ counts }: EvidenceBarProps) {
  const t = useTranslations('evidence');
  const format = useFormatter();
  const total = evidencePositions.reduce((sum, position) => sum + counts[position], 0);

  return (
    <div className="evidence-bar">
      {total > 0 ? (
        <div className="spectrum spectrum--light" aria-hidden="true">
          {evidencePositions
            .filter((position) => counts[position] > 0)
            .map((position) => (
              <span
                key={position}
                className={`pos-${position}`}
                style={{ flexGrow: counts[position] }}
              />
            ))}
        </div>
      ) : null}
      <ul className="evidence-bar__legend">
        {evidencePositions.map((position) => (
          <li key={position} className={`pos-${position}`}>
            <span className={`marker marker--${position}`} aria-hidden="true" />
            <span>{t(`positions.${position}`)}</span>
            <strong>{format.number(counts[position])}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
