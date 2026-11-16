'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

interface LiveRefreshProps {
  /** Names the channel, so two listeners on one page do not share one. */
  name: string;
  tables: readonly string[];
  /** A Realtime filter such as `author_id=eq.<id>`, applied to every table. */
  filter?: string;
}

// Refreshes the server-rendered page when rows it shows change. Row level security
// decides which changes this reader hears about, and a burst of changes is folded
// into one refresh. Without a connection the page simply stays as it is.
export function LiveRefresh({ name, tables, filter }: LiveRefreshProps) {
  const router = useRouter();
  const tableKey = tables.join(',');

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => router.refresh(), 500);
    };

    let channel = supabase.channel(`live:${name}`);
    for (const table of tableKey.split(',')) {
      const options: { event: '*'; schema: string; table: string; filter?: string } = {
        event: '*',
        schema: 'public',
        table,
      };
      if (filter) options.filter = filter;
      channel = channel.on('postgres_changes', options, refresh);
    }
    channel.subscribe();

    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [name, tableKey, filter, router]);

  return null;
}
