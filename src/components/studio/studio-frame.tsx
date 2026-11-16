import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/lib/i18n/navigation';

interface StudioFrameProps {
  title: string;
  lead?: string | undefined;
  badge?: ReactNode;
  children: ReactNode;
}

export function StudioFrame({ title, lead, badge, children }: StudioFrameProps) {
  const t = useTranslations('studio');
  return (
    <main id="main" className="page">
      <section className="page-hero">
        <div className="container">
          <header className="page__header">
            <p className="studio-back">
              <Link href="/studio" className="studio-back__link">
                {t('back')}
              </Link>
            </p>
            <h1 dir="auto">{title}</h1>
            {badge}
            {lead ? <p className="page__lead">{lead}</p> : null}
          </header>
        </div>
      </section>
      <div className="container page__body">
        <div className="studio-stack">{children}</div>
      </div>
    </main>
  );
}
