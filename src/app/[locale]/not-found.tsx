import { useTranslations } from 'next-intl';

export default function NotFoundPage() {
  const t = useTranslations('common');

  return (
    <main id="main" className="auth">
      <div className="container auth__inner">
        <h1>{t('notFoundTitle')}</h1>
        <p className="auth__lead">{t('notFoundBody')}</p>
      </div>
    </main>
  );
}
