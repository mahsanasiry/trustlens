-- The service role is used only by trusted server-side scripts, such as the
-- demo account seeder. It bypasses row level security, but it still needs
-- table privileges, which newer Supabase projects no longer grant by default.
grant usage on schema public, private to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
