import { getFormatter, getTranslations } from 'next-intl/server';
import { evidencePositions } from '@/lib/domain/enums';
import { countByPosition, sampleClaim } from '@/lib/demo/sample-claim';

export async function ClaimPanel() {
  const [t, tEvidence, format] = await Promise.all([
    getTranslations('home'),
    getTranslations('evidence'),
    getFormatter(),
  ]);
  const counts = countByPosition(sampleClaim.evidence);

  return (
    <div className="claim-panel">
      <span className="claim-panel__badge">{t('demoBadge')}</span>
      <p className="claim-panel__claim" lang="en" dir="ltr">
        {sampleClaim.statement}
      </p>

      <div className="spectrum" aria-hidden="true">
        {evidencePositions
          .filter((position) => counts[position] > 0)
          .map((position) => (
            <span
              key={position}
              className={`tone-${position}`}
              style={{ flexGrow: counts[position] }}
            />
          ))}
      </div>
      <ul className="spectrum-legend">
        {evidencePositions.map((position) => (
          <li key={position} className={`tone-${position}`}>
            <span className={`marker marker--${position}`} aria-hidden="true" />
            <span>{tEvidence(`positions.${position}`)}</span>
            <strong>{format.number(counts[position])}</strong>
          </li>
        ))}
      </ul>

      <ul className="evidence-list">
        {sampleClaim.evidence.map((item) => (
          <li key={item.id} className={`tone-${item.position}`}>
            <span className={`marker marker--${item.position}`} aria-hidden="true" />
            <div>
              <p className="evidence-list__label">
                {tEvidence(`positions.${item.position}`)}
              </p>
              <p className="evidence-list__source" lang="en">
                {item.source}
              </p>
              <p className="evidence-list__detail" lang="en">
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="claim-panel__count">
        {t('evidenceCount', { count: sampleClaim.evidence.length })}
      </p>
    </div>
  );
}
