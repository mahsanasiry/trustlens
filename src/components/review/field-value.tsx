import { useFormatter, useTranslations } from 'next-intl';
import type { FieldValue } from '@/lib/data/review-view';

interface FieldValueViewProps {
  value: FieldValue | null;
}

export function FieldValueView({ value }: FieldValueViewProps) {
  const t = useTranslations();
  const tReview = useTranslations('review');
  const format = useFormatter();

  if (!value) return <span className="review-none">{tReview('none')}</span>;

  switch (value.kind) {
    case 'term':
      return <>{t(value.key)}</>;
    case 'date':
      return (
        <>
          {format.dateTime(new Date(`${value.iso}T00:00:00Z`), {
            dateStyle: 'medium',
            timeZone: 'UTC',
          })}
        </>
      );
    case 'list':
      return (
        <ul className="review-list" dir="auto">
          {value.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'link':
      return (
        <a href={value.href} rel="noopener noreferrer nofollow" target="_blank" dir="ltr">
          {value.href}
        </a>
      );
    case 'text':
      return <span dir="auto">{value.text}</span>;
  }
}
