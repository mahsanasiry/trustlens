import { getTranslations } from 'next-intl/server';
import { BrandMark } from './brand-mark';

export async function SiteFooter() {
  const t = await getTranslations('home');

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p>{t('demoNotice')}</p>
        <span className="brand">
          <BrandMark />
          TrustLens
        </span>
      </div>
    </footer>
  );
}
