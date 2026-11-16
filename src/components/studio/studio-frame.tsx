import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/lib/i18n/navigation';

interface StudioFrameProps {
  title: string;
  lead?: string | undefined;
  badge?: ReactNode;
  /** Where the back link goes; defaults to the Studio start page. */
  back?: { href: string; label: string } | undefined;
  children: ReactNode;
}

export function StudioFrame({ title, lead, badge, back, children }: StudioFrameProps) {
  const t = useTranslations('studio');
  return (
    <main id="main" className="page">
      <section className="page-hero">
        <div className="container">
          <header className="page__header">
            <p className="studio-back">
              <Link href={back?.href ?? '/studio'} className="studio-back__link">
                {back?.label ?? t('back')}
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
