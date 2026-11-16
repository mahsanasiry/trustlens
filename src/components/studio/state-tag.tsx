import { useTranslations } from 'next-intl';
import type { ContentState } from '@/lib/domain/enums';

// The wording carries the meaning; the colour and border only reinforce it.
export function StateTag({ state }: { state: ContentState }) {
  const t = useTranslations('studio.state');
  return <span className={`state-tag state-tag--${state}`}>{t(state)}</span>;
}
