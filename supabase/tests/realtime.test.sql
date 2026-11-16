select tests.eq(
  (select count(*)::int from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'public'
     and tablename in ('review_items', 'claims', 'sources', 'evidence', 'source_assessments', 'notifications')),
  6, 'every table a page listens to is published');
select tests.eq(
  (select count(*)::int from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'public'
     and tablename in ('profiles', 'audit_logs', 'reports', 'reviews')),
  0, 'nothing else is published');
