'use client';

import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const isOnline = () => navigator.onLine;
// The server cannot know; assuming a connection avoids a flash of the banner.
const assumeOnline = () => true;

export function OfflineBanner() {
  const t = useTranslations('common');
  const online = useSyncExternalStore(subscribe, isOnline, assumeOnline);

  if (online) return null;
  return (
    <div role="status" className="offline-banner">
      {t('offline')}
    </div>
  );
}
