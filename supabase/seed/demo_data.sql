-- TrustLens demo data.
--
-- Fictional claims, sources and evidence for a demonstration instance. Every
-- organisation, person, figure and URL below is invented; the ".example"
-- domains are reserved and never resolve. Rows are flagged is_demo so the
-- script can remove and rebuild them: run it again at any time.
--
-- Prerequisite: the four demo accounts must exist (pnpm seed:accounts).
--
-- Most content is written straight into the tables as already-published rows.
-- Status changes, revisions, reviews, reports and notifications go through the
-- real workflow functions, impersonating the demo accounts, so the audit trail,
-- version history, review queue and notifications are produced by the same code
-- paths the application uses.

begin;

create or replace function pg_temp.sid(kind text, slug text) returns uuid
language sql immutable as $f$ select md5('trustlens-demo:' || kind || ':' || slug)::uuid $f$;

create temp table demo_users (key text primary key, id uuid not null) on commit drop;
insert into demo_users (key, id)
select k.key, u.id
from (values
  ('member', 'member@demo.trustlens.example'),
  ('researcher', 'researcher@demo.trustlens.example'),
  ('admin', 'admin@demo.trustlens.example'),
  ('editor', 'editor@demo.trustlens.example')
) as k (key, email)
join auth.users u on u.email = k.email;

do $f$
begin
  if (select count(*) from demo_users) <> 4 then
    raise exception 'The demo accounts are missing. Run "pnpm seed:accounts" first.';
  end if;
end
$f$;

create or replace function pg_temp.u(p_key text) returns uuid
language sql stable as $f$ select id from demo_users where key = p_key $f$;

-- Makes auth.uid() return the given demo account for the rest of the transaction.
create or replace function pg_temp.act_as(p_key text) returns void
language plpgsql as $f$
declare
  v_id text := pg_temp.u(p_key)::text;
begin
  perform set_config('request.jwt.claim.sub', v_id, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end
$f$;

create or replace function pg_temp.open_item(p_type text, p_target uuid) returns uuid
language sql stable as $f$
  select id from public.review_items
  where target_type = p_type::public.review_target and target_id = p_target and decided_at is null
$f$;

-- ---------------------------------------------------------------- cleanup
delete from public.audit_logs where actor_id in (select id from demo_users)
  or entity_id in (select id from public.claims where is_demo)
  or entity_id in (select id from public.sources where is_demo)
  or entity_id in (select id from public.evidence where is_demo)
  or entity_id in (select id from public.source_assessments where is_demo);
delete from public.entity_versions where entity_id in (select id from public.claims where is_demo)
  or entity_id in (select id from public.sources where is_demo)
  or entity_id in (select id from public.evidence where is_demo)
  or entity_id in (select id from public.source_assessments where is_demo);
delete from public.review_items where submitted_by in (select id from demo_users);
delete from public.content_revisions where author_id in (select id from demo_users);
delete from public.reports where user_id in (select id from demo_users);
delete from public.notifications where user_id in (select id from demo_users);
delete from public.collections where owner_id in (select id from demo_users);
delete from public.bookmarks where user_id in (select id from demo_users);
delete from public.follows where user_id in (select id from demo_users);
delete from public.saved_views where user_id in (select id from demo_users);
delete from public.claims where is_demo;
delete from public.sources where is_demo;
delete from public.audit_logs where actor_id is null and created_at = now();

-- ---------------------------------------------------------------- sources
insert into public.sources (id, title, publisher, url, authors, published_on, accessed_on, type, language, state, author_id, is_demo, created_at, updated_at, released_at) values
  (pg_temp.sid('source', 'meridian-sleep-cohort'), 'Sleep Duration and Memory Recall in 4,200 Adults', 'Meridian Health Observatory', 'https://meridian-health-observatory.example/meridian-sleep-cohort', array['L. Hartmann', 'P. Okoye']::text[], '2025-03-12', '2025-03-31', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2025-03-22 09:00:00+00', '2025-03-22 09:00:00+00', '2025-03-23 09:00:00+00'),
  (pg_temp.sid('source', 'halden-sleep-trial'), 'A Randomised Trial of Evening Light Filters and Sleep Onset', 'Halden Institute of Technology', 'https://halden-institute-of-technology.example/halden-sleep-trial', array['D. Varga', 'M. Ito']::text[], '2025-06-02', '2025-06-29', 'preprint', 'en', 'published', pg_temp.u('researcher'), true, '2025-06-10 09:00:00+00', '2025-06-10 09:00:00+00', '2025-06-11 09:00:00+00'),
  (pg_temp.sid('source', 'summit-peak-cold-fusion'), 'Replication Attempts of Table-Top Fusion Reports, 2019 to 2024', 'Summit Peak Physics Society', 'https://summit-peak-physics-society.example/summit-peak-cold-fusion', array['R. Delacroix']::text[], '2024-11-20', '2024-12-23', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2024-11-29 09:00:00+00', '2024-11-29 09:00:00+00', '2024-11-30 09:00:00+00'),
  (pg_temp.sid('source', 'corvid-fusion-pr'), 'Corvid Labs Announces Net-Energy Milestone', 'Corvid Labs', 'https://corvid-labs.example/corvid-fusion-pr', '{}'::text[], '2025-02-04', '2025-03-03', 'press_release', 'en', 'published', pg_temp.u('editor'), true, '2025-02-12 09:00:00+00', '2025-02-12 09:00:00+00', '2025-02-13 09:00:00+00'),
  (pg_temp.sid('source', 'orchard-vitd-review'), 'Vitamin D Supplementation and Winter Infections: A Systematic Review', 'Orchard Lane Research Collective', 'https://orchard-lane-research-collective.example/orchard-vitd-review', array['S. Brandt', 'A. Mwangi', 'T. Nakamura']::text[], '2024-09-18', '2024-10-27', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2024-09-28 09:00:00+00', '2024-09-28 09:00:00+00', '2024-09-29 09:00:00+00'),
  (pg_temp.sid('source', 'bellmont-flu-season'), 'Seasonal Respiratory Illness Surveillance, Winter 2024-25', 'Bellmont Public Health Service', 'https://bellmont-public-health-service.example/bellmont-flu-season', '{}'::text[], '2025-04-10', '2025-05-13', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-04-19 09:00:00+00', '2025-04-19 09:00:00+00', '2025-04-20 09:00:00+00'),
  (pg_temp.sid('source', 'quillfeather-coffee'), 'Coffee Intake and Heart Rhythm: A 12-Year Registry Study', 'Quillfeather Data Lab', 'https://quillfeather-data-lab.example/quillfeather-coffee', array['E. Lindqvist', 'H. Moreau']::text[], '2023-08-30', '2023-09-25', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2023-09-06 09:00:00+00', '2023-09-06 09:00:00+00', '2023-09-07 09:00:00+00'),
  (pg_temp.sid('source', 'ledger-coffee-headline'), 'Three Cups a Day Protects the Heart, Researchers Say', 'Brightwater Daily Ledger', 'https://brightwater-daily-ledger.example/ledger-coffee-headline', '{}'::text[], '2023-09-02', '2023-10-05', 'news_article', 'en', 'published', pg_temp.u('editor'), true, '2023-09-11 09:00:00+00', '2023-09-11 09:00:00+00', '2023-09-12 09:00:00+00'),
  (pg_temp.sid('source', 'northfield-microplastics'), 'Microplastic Particles in Municipal Tap Water: A Sampling Study', 'Northfield University Press', 'https://northfield-university-press.example/northfield-microplastics', array['J. Ferreira', 'C. Adeyemi']::text[], '2024-05-14', '2024-05-25', 'journal_article', 'en', 'published', pg_temp.u('editor'), true, '2024-05-21 09:00:00+00', '2024-05-21 09:00:00+00', '2024-05-22 09:00:00+00'),
  (pg_temp.sid('source', 'cedar-water-quality'), 'Annual Drinking Water Quality Report, Cedar Valley', 'Cedar Valley Water Board', 'https://cedar-valley-water-board.example/cedar-water-quality', '{}'::text[], '2025-03-01', '2025-04-05', 'government_document', 'en', 'published', pg_temp.u('researcher'), true, '2025-03-07 09:00:00+00', '2025-03-07 09:00:00+00', '2025-03-08 09:00:00+00'),
  (pg_temp.sid('source', 'tidewater-ocean-ph'), 'Coastal Ocean Acidity Trends, 1998 to 2024', 'Tidewater Climate Centre', 'https://tidewater-climate-centre.example/tidewater-ocean-ph', array['N. Abara', 'F. Lindgren']::text[], '2025-01-17', '2025-02-12', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-01-24 09:00:00+00', '2025-01-24 09:00:00+00', '2025-01-25 09:00:00+00'),
  (pg_temp.sid('source', 'summit-quantum-advantage'), 'Evidence for a Quantum Speed-Up on Sampling Tasks', 'Summit Peak Physics Society', 'https://summit-peak-physics-society.example/summit-quantum-advantage', array['V. Petrov', 'Y. Chen']::text[], '2025-07-09', '2025-08-15', 'preprint', 'en', 'published', pg_temp.u('researcher'), true, '2025-07-17 09:00:00+00', '2025-07-17 09:00:00+00', '2025-07-18 09:00:00+00'),
  (pg_temp.sid('source', 'halden-quantum-critique'), 'Classical Simulation of the Reported Sampling Advantage', 'Halden Institute of Technology', 'https://halden-institute-of-technology.example/halden-quantum-critique', array['A. Kowalski', 'B. Rahman']::text[], '2025-08-21', '2025-09-02', 'preprint', 'en', 'published', pg_temp.u('researcher'), true, '2025-08-29 09:00:00+00', '2025-08-29 09:00:00+00', '2025-08-30 09:00:00+00'),
  (pg_temp.sid('source', 'bellmont-vaccine-surveillance'), 'Booster Uptake and Hospitalisation Rates, Adults over 65', 'Bellmont Public Health Service', 'https://bellmont-public-health-service.example/bellmont-vaccine-surveillance', '{}'::text[], '2025-02-26', '2025-03-22', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-03-08 09:00:00+00', '2025-03-08 09:00:00+00', '2025-03-09 09:00:00+00'),
  (pg_temp.sid('source', 'meridian-handwash'), 'Hand Hygiene Campaigns and Absenteeism in Schools', 'Meridian Health Observatory', 'https://meridian-health-observatory.example/meridian-handwash', array['G. Santos', 'K. Weiss']::text[], '2022-10-11', '2022-10-25', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2022-10-21 09:00:00+00', '2022-10-21 09:00:00+00', '2022-10-22 09:00:00+00'),
  (pg_temp.sid('source', 'foxglove-asteroid'), 'Near-Earth Object Catalogue, Release 14', 'Foxglove Open Data Trust', 'https://foxglove-open-data-trust.example/foxglove-asteroid', '{}'::text[], '2025-05-05', '2025-06-07', 'dataset', 'en', 'published', pg_temp.u('editor'), true, '2025-05-14 09:00:00+00', '2025-05-14 09:00:00+00', '2025-05-15 09:00:00+00'),
  (pg_temp.sid('source', 'summit-moon-water'), 'Subsurface Ice Signatures near the Lunar South Pole', 'Summit Peak Physics Society', 'https://summit-peak-physics-society.example/summit-moon-water', array['I. Novak', 'O. Fagan']::text[], '2024-12-03', '2025-01-06', 'journal_article', 'en', 'published', pg_temp.u('editor'), true, '2024-12-13 09:00:00+00', '2024-12-13 09:00:00+00', '2024-12-14 09:00:00+00'),
  (pg_temp.sid('source', 'orchard-bilingual'), 'Bilingualism and Attention Control: Meta-analysis of 61 Studies', 'Orchard Lane Research Collective', 'https://orchard-lane-research-collective.example/orchard-bilingual', array['M. Costa', 'R. Das', 'U. Lund']::text[], '2023-04-19', '2023-05-12', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2023-04-28 09:00:00+00', '2023-04-28 09:00:00+00', '2023-04-29 09:00:00+00'),
  (pg_temp.sid('source', 'kestrel-solar-capacity'), 'Regional Solar Capacity Register, 2020 to 2025', 'Kestrel Energy Agency', 'https://kestrel-energy-agency.example/kestrel-solar-capacity', '{}'::text[], '2025-06-30', '2025-08-02', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-07-09 09:00:00+00', '2025-07-09 09:00:00+00', '2025-07-10 09:00:00+00'),
  (pg_temp.sid('source', 'harbor-energy-outlook'), 'Regional Energy Outlook 2025', 'Harbor Institute', 'https://harbor-institute.example/harbor-energy-outlook', array['A. Rowan', 'T. Eze']::text[], '2025-02-11', '2025-02-28', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-02-19 09:00:00+00', '2025-02-19 09:00:00+00', '2025-02-20 09:00:00+00'),
  (pg_temp.sid('source', 'marlow-solar-brochure'), 'Why Rooftop Solar Pays for Itself in Six Years', 'Marlow & Finch Analytics', 'https://marlow-finch-analytics.example/marlow-solar-brochure', '{}'::text[], '2024-09-08', '2024-10-11', 'press_release', 'en', 'published', pg_temp.u('researcher'), true, '2024-09-17 09:00:00+00', '2024-09-17 09:00:00+00', '2024-09-18 09:00:00+00'),
  (pg_temp.sid('source', 'aldermoor-ev-sales'), 'Vehicle Registrations by Fuel Type, Q1 2026', 'Aldermoor Transport Bureau', 'https://aldermoor-transport-bureau.example/aldermoor-ev-sales', '{}'::text[], '2026-04-12', '2026-04-29', 'dataset', 'en', 'published', pg_temp.u('editor'), true, '2026-04-20 09:00:00+00', '2026-04-20 09:00:00+00', '2026-04-21 09:00:00+00'),
  (pg_temp.sid('source', 'pinecrest-wildfire'), 'Fire Season Length in the Pinecrest Basin, 1990 to 2025', 'Pinecrest Environmental Trust', 'https://pinecrest-environmental-trust.example/pinecrest-wildfire', array['W. Okafor', 'H. Lund']::text[], '2025-10-05', '2025-10-28', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-10-14 09:00:00+00', '2025-10-14 09:00:00+00', '2025-10-15 09:00:00+00'),
  (pg_temp.sid('source', 'tidewater-forest-cover'), 'Satellite-Derived Forest Cover Change, Northern Basin', 'Tidewater Climate Centre', 'https://tidewater-climate-centre.example/tidewater-forest-cover', '{}'::text[], '2025-09-14', '2025-09-28', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-09-24 09:00:00+00', '2025-09-24 09:00:00+00', '2025-09-25 09:00:00+00'),
  (pg_temp.sid('source', 'ledger-recycling-myth'), 'Most Recycling Ends Up in Landfill, Residents Told', 'Brightwater Daily Ledger', 'https://brightwater-daily-ledger.example/ledger-recycling-myth', '{}'::text[], '2024-02-19', '2024-03-27', 'news_article', 'en', 'published', pg_temp.u('researcher'), true, '2024-02-27 09:00:00+00', '2024-02-27 09:00:00+00', '2024-02-28 09:00:00+00'),
  (pg_temp.sid('source', 'cedar-recycling-audit'), 'Material Recovery Facility Audit, Cedar Valley', 'Ravenscar Civil Audit Office', 'https://ravenscar-civil-audit-office.example/cedar-recycling-audit', '{}'::text[], '2024-07-22', '2024-08-21', 'government_document', 'en', 'published', pg_temp.u('researcher'), true, '2024-07-28 09:00:00+00', '2024-07-28 09:00:00+00', '2024-07-29 09:00:00+00'),
  (pg_temp.sid('source', 'harbor-wind-noise'), 'Onshore Wind Farms and Residential Noise Complaints', 'Harbor Institute', 'https://harbor-institute.example/harbor-wind-noise', array['P. Mbeki', 'S. Kaur']::text[], '2023-12-01', '2023-12-30', 'journal_article', 'en', 'published', pg_temp.u('editor'), true, '2023-12-11 09:00:00+00', '2023-12-11 09:00:00+00', '2023-12-12 09:00:00+00'),
  (pg_temp.sid('source', 'kestrel-grid-reliability'), 'Grid Reliability Statistics with High Renewable Share', 'Kestrel Energy Agency', 'https://kestrel-energy-agency.example/kestrel-grid-reliability', '{}'::text[], '2025-11-03', '2025-11-26', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-11-12 09:00:00+00', '2025-11-12 09:00:00+00', '2025-11-13 09:00:00+00'),
  (pg_temp.sid('source', 'pinecrest-bees'), 'Pollinator Counts across 140 Orchards', 'Pinecrest Environmental Trust', 'https://pinecrest-environmental-trust.example/pinecrest-bees', array['R. Valdez']::text[], '2025-07-18', '2025-08-14', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-07-26 09:00:00+00', '2025-07-26 09:00:00+00', '2025-07-27 09:00:00+00'),
  (pg_temp.sid('source', 'orchard-pesticide-bees'), 'Neonicotinoid Exposure and Colony Survival', 'Orchard Lane Research Collective', 'https://orchard-lane-research-collective.example/orchard-pesticide-bees', array['L. Zhang', 'B. Osei']::text[], '2024-03-27', '2024-04-26', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2024-04-02 09:00:00+00', '2024-04-02 09:00:00+00', '2024-04-03 09:00:00+00'),
  (pg_temp.sid('source', 'tidewater-sea-level'), 'Tide Gauge Record, Brightwater Harbour, 1960 to 2025', 'Tidewater Climate Centre', 'https://tidewater-climate-centre.example/tidewater-sea-level', '{}'::text[], '2025-12-02', '2025-12-20', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-12-11 09:00:00+00', '2025-12-11 09:00:00+00', '2025-12-12 09:00:00+00'),
  (pg_temp.sid('source', 'rowan-offsets'), 'Carbon Offset Credits: Delivered Reductions', 'Rowan & Pike Consulting', 'https://rowan-pike-consulting.example/rowan-offsets', array['C. Dubois']::text[], '2025-03-18', '2025-04-16', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-03-28 09:00:00+00', '2025-03-28 09:00:00+00', '2025-03-29 09:00:00+00'),
  (pg_temp.sid('source', 'greyfield-class-size'), 'Class Size and Reading Outcomes in Primary Schools', 'Greyfield Education Council', 'https://greyfield-education-council.example/greyfield-class-size', array['E. Parry', 'D. Njoroge']::text[], '2024-06-17', '2024-07-03', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2024-06-24 09:00:00+00', '2024-06-24 09:00:00+00', '2024-06-25 09:00:00+00'),
  (pg_temp.sid('source', 'linden-class-size-survey'), 'Teachers on Class Size: A Membership Survey', 'Linden Teachers'' Union', 'https://linden-teachers-union.example/linden-class-size-survey', '{}'::text[], '2024-02-05', '2024-03-08', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2024-02-13 09:00:00+00', '2024-02-13 09:00:00+00', '2024-02-14 09:00:00+00'),
  (pg_temp.sid('source', 'northfield-homework'), 'Homework Time and Test Scores across 9 Countries', 'Northfield University Press', 'https://northfield-university-press.example/northfield-homework', array['F. Ahmed', 'K. Lindberg']::text[], '2023-06-09', '2023-07-18', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2023-06-19 09:00:00+00', '2023-06-19 09:00:00+00', '2023-06-20 09:00:00+00'),
  (pg_temp.sid('source', 'westbrook-homework-poll'), 'Parent Poll: How Much Homework Is Too Much?', 'Westbrook Parents'' Network', 'https://westbrook-parents-network.example/westbrook-homework-poll', '{}'::text[], '2024-10-14', '2024-11-03', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2024-10-20 09:00:00+00', '2024-10-20 09:00:00+00', '2024-10-21 09:00:00+00'),
  (pg_temp.sid('source', 'greyfield-phones'), 'School Phone Bans: Early Outcomes in 31 Schools', 'Greyfield Education Council', 'https://greyfield-education-council.example/greyfield-phones', '{}'::text[], '2025-05-21', '2025-06-03', 'report', 'en', 'published', pg_temp.u('editor'), true, '2025-05-30 09:00:00+00', '2025-05-30 09:00:00+00', '2025-05-31 09:00:00+00'),
  (pg_temp.sid('source', 'halden-phone-study'), 'Phone Access and Classroom Attention', 'Halden Institute of Technology', 'https://halden-institute-of-technology.example/halden-phone-study', array['T. Reyes', 'Q. Liu']::text[], '2025-01-30', '2025-03-02', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2025-02-06 09:00:00+00', '2025-02-06 09:00:00+00', '2025-02-07 09:00:00+00'),
  (pg_temp.sid('source', 'ashgrove-reading-gap'), 'Library Membership and Reading Age at Eleven', 'Ashgrove Public Library Network', 'https://ashgrove-public-library-network.example/ashgrove-reading-gap', '{}'::text[], '2025-04-02', '2025-04-14', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-04-10 09:00:00+00', '2025-04-10 09:00:00+00', '2025-04-11 09:00:00+00'),
  (pg_temp.sid('source', 'northfield-tutoring'), 'High-Dosage Tutoring: A Randomised Evaluation', 'Northfield University Press', 'https://northfield-university-press.example/northfield-tutoring', array['N. Pillai', 'A. Brandt']::text[], '2024-11-12', '2024-12-12', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2024-11-18 09:00:00+00', '2024-11-18 09:00:00+00', '2024-11-19 09:00:00+00'),
  (pg_temp.sid('source', 'linden-teacher-pay'), 'Teacher Retention and Pay Bands, Five-Year Review', 'Linden Teachers'' Union', 'https://linden-teachers-union.example/linden-teacher-pay', '{}'::text[], '2025-09-01', '2025-09-26', 'report', 'en', 'published', pg_temp.u('editor'), true, '2025-09-07 09:00:00+00', '2025-09-07 09:00:00+00', '2025-09-08 09:00:00+00'),
  (pg_temp.sid('source', 'greyfield-attainment'), 'Attainment by Region, End of Primary', 'Greyfield Education Council', 'https://greyfield-education-council.example/greyfield-attainment', '{}'::text[], '2025-08-28', '2025-10-01', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-09-07 09:00:00+00', '2025-09-07 09:00:00+00', '2025-09-08 09:00:00+00'),
  (pg_temp.sid('source', 'orchard-learning-styles'), 'Matching Instruction to Learning Styles: A Review', 'Orchard Lane Research Collective', 'https://orchard-lane-research-collective.example/orchard-learning-styles', array['J. Whitfield', 'M. Ortega']::text[], '2022-05-24', '2022-06-09', 'journal_article', 'en', 'published', pg_temp.u('editor'), true, '2022-05-31 09:00:00+00', '2022-05-31 09:00:00+00', '2022-06-01 09:00:00+00'),
  (pg_temp.sid('source', 'foxglove-open-textbooks'), 'Open Textbook Adoption and Course Costs', 'Foxglove Open Data Trust', 'https://foxglove-open-data-trust.example/foxglove-open-textbooks', '{}'::text[], '2025-02-14', '2025-03-22', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-02-21 09:00:00+00', '2025-02-21 09:00:00+00', '2025-02-22 09:00:00+00'),
  (pg_temp.sid('source', 'nimbus-uptime'), 'Service Reliability Report, Full Year 2025', 'Nimbus Cloud Services', 'https://nimbus-cloud-services.example/nimbus-uptime', '{}'::text[], '2026-01-20', '2026-02-12', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2026-01-29 09:00:00+00', '2026-01-29 09:00:00+00', '2026-01-30 09:00:00+00'),
  (pg_temp.sid('source', 'foxglove-outage-log'), 'Public Incident Log: Cloud Region Outages', 'Foxglove Open Data Trust', 'https://foxglove-open-data-trust.example/foxglove-outage-log', '{}'::text[], '2026-01-31', '2026-02-20', 'dataset', 'en', 'published', pg_temp.u('editor'), true, '2026-02-06 09:00:00+00', '2026-02-06 09:00:00+00', '2026-02-07 09:00:00+00'),
  (pg_temp.sid('source', 'halden-battery-degradation'), 'Capacity Fade in Consumer Lithium Cells after 1,000 Cycles', 'Halden Institute of Technology', 'https://halden-institute-of-technology.example/halden-battery-degradation', array['K. Mori', 'D. Eriksen']::text[], '2024-08-08', '2024-08-19', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2024-08-15 09:00:00+00', '2024-08-15 09:00:00+00', '2024-08-16 09:00:00+00'),
  (pg_temp.sid('source', 'corvid-battery-claim'), 'The Ten-Year Phone Battery', 'Corvid Labs', 'https://corvid-labs.example/corvid-battery-claim', '{}'::text[], '2025-09-10', '2025-10-01', 'press_release', 'en', 'published', pg_temp.u('editor'), true, '2025-09-17 09:00:00+00', '2025-09-17 09:00:00+00', '2025-09-18 09:00:00+00'),
  (pg_temp.sid('source', 'quillfeather-passwords'), 'Password Manager Adoption and Account Takeovers', 'Quillfeather Data Lab', 'https://quillfeather-data-lab.example/quillfeather-passwords', array['Z. Hassan']::text[], '2025-04-22', '2025-05-26', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-05-02 09:00:00+00', '2025-05-02 09:00:00+00', '2025-05-03 09:00:00+00'),
  (pg_temp.sid('source', 'halden-5g-health'), 'Radio-Frequency Exposure near Mobile Masts: Measurement Survey', 'Halden Institute of Technology', 'https://halden-institute-of-technology.example/halden-5g-health', array['U. Berg', 'F. Sato']::text[], '2023-03-14', '2023-04-21', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2023-03-23 09:00:00+00', '2023-03-23 09:00:00+00', '2023-03-24 09:00:00+00'),
  (pg_temp.sid('source', 'bellmont-5g-review'), 'Mobile Network Frequencies and Health: Evidence Review', 'Bellmont Public Health Service', 'https://bellmont-public-health-service.example/bellmont-5g-review', '{}'::text[], '2023-07-01', '2023-07-20', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2023-07-11 09:00:00+00', '2023-07-11 09:00:00+00', '2023-07-12 09:00:00+00'),
  (pg_temp.sid('source', 'rowan-ai-jobs'), 'Automation Exposure by Occupation, Regional Labour Market', 'Rowan & Pike Consulting', 'https://rowan-pike-consulting.example/rowan-ai-jobs', array['M. Laurent']::text[], '2025-06-12', '2025-07-03', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-06-19 09:00:00+00', '2025-06-19 09:00:00+00', '2025-06-20 09:00:00+00'),
  (pg_temp.sid('source', 'lakeside-labour-stats'), 'Labour Force Survey, Occupation Tables', 'Lakeside Statistics Office', 'https://lakeside-statistics-office.example/lakeside-labour-stats', '{}'::text[], '2025-11-28', '2026-01-02', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-12-04 09:00:00+00', '2025-12-04 09:00:00+00', '2025-12-05 09:00:00+00'),
  (pg_temp.sid('source', 'quillfeather-deepfakes'), 'Detection Rates for Synthetic Video among Viewers', 'Quillfeather Data Lab', 'https://quillfeather-data-lab.example/quillfeather-deepfakes', array['S. Idowu', 'P. Larsen']::text[], '2025-02-18', '2025-03-27', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2025-02-26 09:00:00+00', '2025-02-26 09:00:00+00', '2025-02-27 09:00:00+00'),
  (pg_temp.sid('source', 'ledger-ai-detection'), 'Detectors Cannot Tell Real Video from Fake, Test Finds', 'Brightwater Daily Ledger', 'https://brightwater-daily-ledger.example/ledger-ai-detection', '{}'::text[], '2025-02-24', '2025-03-24', 'news_article', 'en', 'published', pg_temp.u('researcher'), true, '2025-03-05 09:00:00+00', '2025-03-05 09:00:00+00', '2025-03-06 09:00:00+00'),
  (pg_temp.sid('source', 'nimbus-ev-chargers'), 'Public Charger Availability Report', 'Nimbus Cloud Services', 'https://nimbus-cloud-services.example/nimbus-ev-chargers', '{}'::text[], '2025-12-15', '2025-12-29', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-12-25 09:00:00+00', '2025-12-25 09:00:00+00', '2025-12-26 09:00:00+00'),
  (pg_temp.sid('source', 'aldermoor-charger-map'), 'Public Charging Points by District', 'Aldermoor Transport Bureau', 'https://aldermoor-transport-bureau.example/aldermoor-charger-map', '{}'::text[], '2026-02-09', '2026-03-05', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2026-02-19 09:00:00+00', '2026-02-19 09:00:00+00', '2026-02-20 09:00:00+00'),
  (pg_temp.sid('source', 'summit-satellite-internet'), 'Latency Measurements for Low-Orbit Satellite Broadband', 'Summit Peak Physics Society', 'https://summit-peak-physics-society.example/summit-satellite-internet', array['L. Haddad']::text[], '2025-08-04', '2025-08-15', 'report', 'en', 'published', pg_temp.u('editor'), true, '2025-08-11 09:00:00+00', '2025-08-11 09:00:00+00', '2025-08-12 09:00:00+00'),
  (pg_temp.sid('source', 'lakeside-broadband-speeds'), 'Broadband Speeds by District, Median Download', 'Lakeside Statistics Office', 'https://lakeside-statistics-office.example/lakeside-broadband-speeds', '{}'::text[], '2025-10-30', '2025-11-09', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-11-05 09:00:00+00', '2025-11-05 09:00:00+00', '2025-11-06 09:00:00+00'),
  (pg_temp.sid('source', 'corvid-ocr-benchmark'), 'Document Recognition Accuracy: Independent Benchmark', 'Quillfeather Data Lab', 'https://quillfeather-data-lab.example/corvid-ocr-benchmark', array['A. Fischer']::text[], '2025-05-30', '2025-06-16', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-06-07 09:00:00+00', '2025-06-07 09:00:00+00', '2025-06-08 09:00:00+00'),
  (pg_temp.sid('source', 'orchard-open-source-security'), 'Open Source Dependency Vulnerabilities: A Review', 'Orchard Lane Research Collective', 'https://orchard-lane-research-collective.example/orchard-open-source-security', array['V. Nair', 'C. Moreno']::text[], '2024-06-26', '2024-07-23', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2024-07-04 09:00:00+00', '2024-07-04 09:00:00+00', '2024-07-05 09:00:00+00'),
  (pg_temp.sid('source', 'lakeside-youth-employment'), 'Youth Unemployment by District', 'Lakeside Statistics Office', 'https://lakeside-statistics-office.example/lakeside-youth-employment', '{}'::text[], '2025-12-10', '2025-12-23', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-12-19 09:00:00+00', '2025-12-19 09:00:00+00', '2025-12-20 09:00:00+00'),
  (pg_temp.sid('source', 'open-policy-youth'), 'Youth Employment Programmes: What Works', 'Open Policy Forum', 'https://open-policy-forum.example/open-policy-youth', array['B. Achterberg', 'N. Wanjiru']::text[], '2025-05-14', '2025-06-08', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-05-20 09:00:00+00', '2025-05-20 09:00:00+00', '2025-05-21 09:00:00+00'),
  (pg_temp.sid('source', 'westbrook-loneliness'), 'Reported Loneliness among Adults, Annual Survey', 'Westbrook Parents'' Network', 'https://westbrook-parents-network.example/westbrook-loneliness', '{}'::text[], '2025-03-03', '2025-04-07', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-03-09 09:00:00+00', '2025-03-09 09:00:00+00', '2025-03-10 09:00:00+00'),
  (pg_temp.sid('source', 'meridian-loneliness'), 'Social Contact and Wellbeing: A Longitudinal Study', 'Meridian Health Observatory', 'https://meridian-health-observatory.example/meridian-loneliness', array['D. Okonkwo', 'I. Petrakis']::text[], '2024-04-04', '2024-04-19', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2024-04-10 09:00:00+00', '2024-04-10 09:00:00+00', '2024-04-11 09:00:00+00'),
  (pg_temp.sid('source', 'lakeside-homelessness'), 'Point-in-Time Count of People Sleeping Rough', 'Lakeside Statistics Office', 'https://lakeside-statistics-office.example/lakeside-homelessness', '{}'::text[], '2026-01-25', '2026-02-11', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2026-02-02 09:00:00+00', '2026-02-02 09:00:00+00', '2026-02-03 09:00:00+00'),
  (pg_temp.sid('source', 'open-policy-housing'), 'Housing First Pilots: Outcomes after Three Years', 'Open Policy Forum', 'https://open-policy-forum.example/open-policy-housing', array['H. Svensson']::text[], '2025-09-19', '2025-10-24', 'report', 'en', 'published', pg_temp.u('editor'), true, '2025-09-25 09:00:00+00', '2025-09-25 09:00:00+00', '2025-09-26 09:00:00+00'),
  (pg_temp.sid('source', 'northfield-volunteering'), 'Volunteering Trends before and after 2020', 'Northfield University Press', 'https://northfield-university-press.example/northfield-volunteering', array['C. Moyo', 'L. Bauer']::text[], '2024-01-17', '2024-02-07', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2024-01-24 09:00:00+00', '2024-01-24 09:00:00+00', '2024-01-25 09:00:00+00'),
  (pg_temp.sid('source', 'ravenscar-charity-audit'), 'Audit of Charity Overhead Reporting', 'Ravenscar Civil Audit Office', 'https://ravenscar-civil-audit-office.example/ravenscar-charity-audit', '{}'::text[], '2024-10-08', '2024-10-27', 'government_document', 'en', 'published', pg_temp.u('editor'), true, '2024-10-18 09:00:00+00', '2024-10-18 09:00:00+00', '2024-10-19 09:00:00+00'),
  (pg_temp.sid('source', 'ledger-crime-headline'), 'Crime Soars in Eastgate, Say Residents', 'Brightwater Daily Ledger', 'https://brightwater-daily-ledger.example/ledger-crime-headline', '{}'::text[], '2025-07-02', '2025-07-24', 'news_article', 'en', 'published', pg_temp.u('researcher'), true, '2025-07-10 09:00:00+00', '2025-07-10 09:00:00+00', '2025-07-11 09:00:00+00'),
  (pg_temp.sid('source', 'lakeside-crime-stats'), 'Recorded Crime by Neighbourhood, 2019 to 2025', 'Lakeside Statistics Office', 'https://lakeside-statistics-office.example/lakeside-crime-stats', '{}'::text[], '2025-09-30', '2025-11-04', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-10-06 09:00:00+00', '2025-10-06 09:00:00+00', '2025-10-07 09:00:00+00'),
  (pg_temp.sid('source', 'westbrook-commute-survey'), 'Commuting Habits Survey', 'Westbrook Parents'' Network', 'https://westbrook-parents-network.example/westbrook-commute-survey', '{}'::text[], '2025-04-17', '2025-05-17', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-04-23 09:00:00+00', '2025-04-23 09:00:00+00', '2025-04-24 09:00:00+00'),
  (pg_temp.sid('source', 'meridian-remote-work'), 'Remote Work and Productivity: Panel Evidence', 'Meridian Health Observatory', 'https://meridian-health-observatory.example/meridian-remote-work', array['A. Nakagawa', 'R. Silva']::text[], '2024-09-05', '2024-09-19', 'journal_article', 'en', 'published', pg_temp.u('editor'), true, '2024-09-15 09:00:00+00', '2024-09-15 09:00:00+00', '2024-09-16 09:00:00+00'),
  (pg_temp.sid('source', 'rowan-remote-work'), 'The Cost of the Empty Office', 'Rowan & Pike Consulting', 'https://rowan-pike-consulting.example/rowan-remote-work', array['T. Bell']::text[], '2025-01-21', '2025-02-11', 'report', 'en', 'published', pg_temp.u('editor'), true, '2025-01-28 09:00:00+00', '2025-01-28 09:00:00+00', '2025-01-29 09:00:00+00'),
  (pg_temp.sid('source', 'summit-gender-pay'), 'Gender Pay Gap: Controlled Analysis of Payroll Data', 'Summit Peak Physics Society', 'https://summit-peak-physics-society.example/summit-gender-pay', array['P. Alvarez']::text[], '2025-03-08', '2025-03-18', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-03-14 09:00:00+00', '2025-03-14 09:00:00+00', '2025-03-15 09:00:00+00'),
  (pg_temp.sid('source', 'lakeside-pay-gap'), 'Median Hourly Pay by Sex and Sector', 'Lakeside Statistics Office', 'https://lakeside-statistics-office.example/lakeside-pay-gap', '{}'::text[], '2025-11-14', '2025-12-21', 'dataset', 'en', 'published', pg_temp.u('editor'), true, '2025-11-22 09:00:00+00', '2025-11-22 09:00:00+00', '2025-11-23 09:00:00+00'),
  (pg_temp.sid('source', 'ashgrove-library-use'), 'Library Visits and Borrowing, Five-Year Trend', 'Ashgrove Public Library Network', 'https://ashgrove-public-library-network.example/ashgrove-library-use', '{}'::text[], '2025-06-20', '2025-07-26', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-06-27 09:00:00+00', '2025-06-27 09:00:00+00', '2025-06-28 09:00:00+00'),
  (pg_temp.sid('source', 'northfield-screen-time-teens'), 'Screen Time and Adolescent Wellbeing: Large Cohort', 'Northfield University Press', 'https://northfield-university-press.example/northfield-screen-time-teens', array['E. Walsh', 'K. Takahashi']::text[], '2024-02-27', '2024-03-18', 'journal_article', 'en', 'published', pg_temp.u('editor'), true, '2024-03-04 09:00:00+00', '2024-03-04 09:00:00+00', '2024-03-05 09:00:00+00'),
  (pg_temp.sid('source', 'bta-journey-times'), 'Bus Lane Pilot: Journey-Time Study', 'Brightwater Transit Authority', 'https://brightwater-transit-authority.example/bta-journey-times', array['Transit Analytics Team']::text[], '2025-09-15', '2025-10-09', 'report', 'en', 'published', pg_temp.u('editor'), true, '2025-09-25 09:00:00+00', '2025-09-25 09:00:00+00', '2025-09-26 09:00:00+00'),
  (pg_temp.sid('source', 'eastgate-rider-survey'), 'Eastgate Rider Survey 2025', 'Eastgate Commuter Panel', 'https://eastgate-commuter-panel.example/eastgate-rider-survey', '{}'::text[], '2025-10-02', '2025-10-19', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-10-10 09:00:00+00', '2025-10-10 09:00:00+00', '2025-10-11 09:00:00+00'),
  (pg_temp.sid('source', 'bw-council-pilot'), 'Bus Lane Pilot Scheme: Final Report', 'Brightwater City Council', 'https://brightwater-city-council.example/bw-council-pilot', '{}'::text[], '2024-12-18', '2025-01-22', 'government_document', 'en', 'published', pg_temp.u('researcher'), true, '2024-12-24 09:00:00+00', '2024-12-24 09:00:00+00', '2024-12-25 09:00:00+00'),
  (pg_temp.sid('source', 'northfield-traffic-counts'), 'Independent Traffic Counts on Pilot Corridors', 'Northfield Traffic Lab', 'https://northfield-traffic-lab.example/northfield-traffic-counts', array['G. Ibrahim', 'M. Sorensen']::text[], '2025-11-06', '2025-11-20', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-11-16 09:00:00+00', '2025-11-16 09:00:00+00', '2025-11-17 09:00:00+00'),
  (pg_temp.sid('source', 'aldermoor-congestion'), 'Congestion Charge: Three-Year Evaluation', 'Aldermoor Transport Bureau', 'https://aldermoor-transport-bureau.example/aldermoor-congestion', array['J. Mutasa']::text[], '2025-02-10', '2025-03-02', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-02-16 09:00:00+00', '2025-02-16 09:00:00+00', '2025-02-17 09:00:00+00'),
  (pg_temp.sid('source', 'lakeside-air-quality'), 'Roadside Nitrogen Dioxide Readings, City Centre', 'Lakeside Statistics Office', 'https://lakeside-statistics-office.example/lakeside-air-quality', '{}'::text[], '2025-04-29', '2025-05-18', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-05-09 09:00:00+00', '2025-05-09 09:00:00+00', '2025-05-10 09:00:00+00'),
  (pg_temp.sid('source', 'northfield-sugar-tax'), 'Sugary Drinks Levy and Purchasing: Panel Evidence', 'Northfield University Press', 'https://northfield-university-press.example/northfield-sugar-tax', array['Y. Cohen', 'D. Obi']::text[], '2024-07-16', '2024-07-28', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2024-07-24 09:00:00+00', '2024-07-24 09:00:00+00', '2024-07-25 09:00:00+00'),
  (pg_temp.sid('source', 'marlow-sugar-industry'), 'Reformulation, Not Taxation: Industry Perspective', 'Marlow & Finch Analytics', 'https://marlow-finch-analytics.example/marlow-sugar-industry', array['S. Fenwick']::text[], '2024-08-21', '2024-09-10', 'report', 'en', 'published', pg_temp.u('editor'), true, '2024-08-27 09:00:00+00', '2024-08-27 09:00:00+00', '2024-08-28 09:00:00+00'),
  (pg_temp.sid('source', 'lakeside-min-wage'), 'Employment Effects of the Minimum Wage Increase', 'Lakeside Statistics Office', 'https://lakeside-statistics-office.example/lakeside-min-wage', '{}'::text[], '2025-02-27', '2025-04-07', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-03-09 09:00:00+00', '2025-03-09 09:00:00+00', '2025-03-10 09:00:00+00'),
  (pg_temp.sid('source', 'open-policy-min-wage'), 'Minimum Wage and Hours: Review of Regional Studies', 'Open Policy Forum', 'https://open-policy-forum.example/open-policy-min-wage', array['A. Teixeira']::text[], '2025-03-31', '2025-04-16', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-04-07 09:00:00+00', '2025-04-07 09:00:00+00', '2025-04-08 09:00:00+00'),
  (pg_temp.sid('source', 'open-policy-four-day'), 'Four-Day Week Trials: Early Findings', 'Open Policy Forum', 'https://open-policy-forum.example/open-policy-four-day', array['R. Banerjee']::text[], '2025-08-12', '2025-08-27', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2025-08-18 09:00:00+00', '2025-08-18 09:00:00+00', '2025-08-19 09:00:00+00'),
  (pg_temp.sid('source', 'rowan-four-day'), 'Four-Day Week: Employer Experience', 'Rowan & Pike Consulting', 'https://rowan-pike-consulting.example/rowan-four-day', '{}'::text[], '2025-09-02', '2025-09-20', 'report', 'en', 'published', pg_temp.u('editor'), true, '2025-09-11 09:00:00+00', '2025-09-11 09:00:00+00', '2025-09-12 09:00:00+00'),
  (pg_temp.sid('source', 'ravenscar-rent-cap'), 'Rent Stabilisation: Audit of Early Outcomes', 'Ravenscar Civil Audit Office', 'https://ravenscar-civil-audit-office.example/ravenscar-rent-cap', '{}'::text[], '2025-12-20', '2026-01-21', 'government_document', 'en', 'published', pg_temp.u('researcher'), true, '2025-12-28 09:00:00+00', '2025-12-28 09:00:00+00', '2025-12-29 09:00:00+00'),
  (pg_temp.sid('source', 'northfield-rent-study'), 'Rent Controls and Housing Supply', 'Northfield University Press', 'https://northfield-university-press.example/northfield-rent-study', array['P. Moreau', 'E. Ayodele']::text[], '2024-03-08', '2024-04-03', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2024-03-15 09:00:00+00', '2024-03-15 09:00:00+00', '2024-03-16 09:00:00+00'),
  (pg_temp.sid('source', 'aldermoor-free-transit'), 'Fare-Free Transit Trial: Ridership Counts', 'Aldermoor Transport Bureau', 'https://aldermoor-transport-bureau.example/aldermoor-free-transit', '{}'::text[], '2025-06-06', '2025-06-30', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2025-06-16 09:00:00+00', '2025-06-16 09:00:00+00', '2025-06-17 09:00:00+00'),
  (pg_temp.sid('source', 'aldermoor-speed-cameras'), 'Speed Camera Sites: Collisions Before and After', 'Aldermoor Transport Bureau', 'https://aldermoor-transport-bureau.example/aldermoor-speed-cameras', '{}'::text[], '2024-05-13', '2024-06-21', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2024-05-23 09:00:00+00', '2024-05-23 09:00:00+00', '2024-05-24 09:00:00+00'),
  (pg_temp.sid('source', 'foxglove-speed-regression'), 'Regression to the Mean in Road Safety Evaluations', 'Foxglove Open Data Trust', 'https://foxglove-open-data-trust.example/foxglove-speed-regression', array['H. Okonjo']::text[], '2023-10-12', '2023-11-14', 'journal_article', 'en', 'published', pg_temp.u('researcher'), true, '2023-10-21 09:00:00+00', '2023-10-21 09:00:00+00', '2023-10-22 09:00:00+00'),
  (pg_temp.sid('source', 'open-policy-ubi'), 'Basic Income Pilot: Design and Interim Results', 'Open Policy Forum', 'https://open-policy-forum.example/open-policy-ubi', array['D. Kovacs', 'L. Ferrer']::text[], '2026-02-18', '2026-03-03', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2026-02-27 09:00:00+00', '2026-02-27 09:00:00+00', '2026-02-28 09:00:00+00'),
  (pg_temp.sid('source', 'lakeside-bag-charge'), 'Single-Use Bag Charge: Retail Sales Data', 'Lakeside Statistics Office', 'https://lakeside-statistics-office.example/lakeside-bag-charge', '{}'::text[], '2023-11-20', '2023-12-18', 'dataset', 'en', 'published', pg_temp.u('researcher'), true, '2023-11-29 09:00:00+00', '2023-11-29 09:00:00+00', '2023-11-30 09:00:00+00'),
  (pg_temp.sid('source', 'pinecrest-bag-litter'), 'Shoreline Litter Surveys after the Bag Charge', 'Pinecrest Environmental Trust', 'https://pinecrest-environmental-trust.example/pinecrest-bag-litter', '{}'::text[], '2024-04-15', '2024-05-23', 'report', 'en', 'published', pg_temp.u('researcher'), true, '2024-04-24 09:00:00+00', '2024-04-24 09:00:00+00', '2024-04-25 09:00:00+00'),
  (pg_temp.sid('source', 'ledger-wifi'), 'City Wi-Fi Network Quietly Switched Off', 'Brightwater Daily Ledger', 'https://brightwater-daily-ledger.example/ledger-wifi', '{}'::text[], '2022-08-30', '2022-10-02', 'news_article', 'en', 'published', pg_temp.u('researcher'), true, '2022-09-08 09:00:00+00', '2022-09-08 09:00:00+00', '2022-09-09 09:00:00+00'),
  (pg_temp.sid('source', 'ravenscar-wifi-audit'), 'Public Wi-Fi Programme: Usage and Cost', 'Ravenscar Civil Audit Office', 'https://ravenscar-civil-audit-office.example/ravenscar-wifi-audit', '{}'::text[], '2022-11-17', '2022-12-01', 'government_document', 'en', 'published', pg_temp.u('editor'), true, '2022-11-27 09:00:00+00', '2022-11-27 09:00:00+00', '2022-11-28 09:00:00+00'),
  (pg_temp.sid('source', 'open-policy-tax-cut'), 'Do Tax Cuts Pay for Themselves? Revenue Evidence', 'Open Policy Forum', 'https://open-policy-forum.example/open-policy-tax-cut', array['M. Haas', 'T. Obuya']::text[], '2023-02-09', '2023-02-24', 'report', 'en', 'published', pg_temp.u('editor'), true, '2023-02-15 09:00:00+00', '2023-02-15 09:00:00+00', '2023-02-16 09:00:00+00'),
  (pg_temp.sid('source', 'es-transporte-estudiantes'), 'Evaluación del Pase de Transporte Gratuito para Estudiantes', 'Observatorio Educativo de Valdemar', 'https://observatorio-educativo-de-valdemar.example/es-transporte-estudiantes', array['C. Iglesias', 'R. Peña']::text[], '2025-07-23', '2025-08-24', 'report', 'es', 'published', pg_temp.u('researcher'), true, '2025-07-31 09:00:00+00', '2025-07-31 09:00:00+00', '2025-08-01 09:00:00+00'),
  (pg_temp.sid('source', 'es-asistencia-escolar'), 'Asistencia Escolar por Distrito, Curso 2024-25', 'Oficina de Estadística de Valdemar', 'https://oficina-de-estad-stica-de-valdemar.example/es-asistencia-escolar', '{}'::text[], '2025-09-12', '2025-10-07', 'dataset', 'es', 'published', pg_temp.u('editor'), true, '2025-09-18 09:00:00+00', '2025-09-18 09:00:00+00', '2025-09-19 09:00:00+00'),
  (pg_temp.sid('source', 'de-radwege-studie'), 'Radverkehr und Autoverkehr: Zählstellenauswertung Innenstadt', 'Institut für Stadtverkehr Elbtal', 'https://institut-f-r-stadtverkehr-elbtal.example/de-radwege-studie', array['K. Brandl', 'J. Sommer']::text[], '2025-05-07', '2025-06-13', 'report', 'de', 'published', pg_temp.u('researcher'), true, '2025-05-15 09:00:00+00', '2025-05-15 09:00:00+00', '2025-05-16 09:00:00+00'),
  (pg_temp.sid('source', 'de-handel-umsatz'), 'Einzelhandelsumsätze nach dem Umbau der Hauptstraße', 'Handelsverband Elbtal', 'https://handelsverband-elbtal.example/de-handel-umsatz', '{}'::text[], '2025-06-24', '2025-07-22', 'report', 'de', 'published', pg_temp.u('researcher'), true, '2025-07-03 09:00:00+00', '2025-07-03 09:00:00+00', '2025-07-04 09:00:00+00'),
  (pg_temp.sid('source', 'fa-work-week'), 'کاهش ساعت کار هفتگی و بهره‌وری: بررسی میدانی', 'مرکز پژوهش‌های کار و اقتصاد برایت‌واتر', 'https://archive-fa.example/fa-work-week', array['سارا نیکزاد', 'امیر رادمهر']::text[], '2025-04-14', '2025-05-06', 'report', 'fa', 'published', pg_temp.u('researcher'), true, '2025-04-22 09:00:00+00', '2025-04-22 09:00:00+00', '2025-04-23 09:00:00+00'),
  (pg_temp.sid('source', 'fa-work-survey'), 'پیمایش کارکنان درباره‌ی هفته‌ی کاری کوتاه‌تر', 'انجمن کارکنان دره‌ی سدر', 'https://archive-fa.example/fa-work-survey', '{}'::text[], '2025-06-03', '2025-07-06', 'report', 'fa', 'published', pg_temp.u('researcher'), true, '2025-06-12 09:00:00+00', '2025-06-12 09:00:00+00', '2025-06-13 09:00:00+00');

-- ----------------------------------------------------------------- claims
insert into public.claims (id, title, description, category, status, origin, first_appeared_on, keywords, language, state, author_id, is_demo, created_at, updated_at, released_at) values
  (pg_temp.sid('claim', 'sleep-memory'), 'Sleeping under seven hours a night weakens memory recall', 'A widely shared claim holds that adults who regularly sleep fewer than seven hours perform worse on delayed recall tasks than those who sleep seven to nine hours.', 'science', 'unreviewed', 'Health blog post summarising a conference talk', '2025-03-20', array['sleep', 'memory', 'cognition']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-04-01 09:00:00+00', '2025-04-01 09:00:00+00', '2025-04-02 09:00:00+00'),
  (pg_temp.sid('claim', 'light-filters'), 'Evening screen filters help people fall asleep faster', 'Marketing and lifestyle media say that warm-tinted screen filters reduce the time it takes to fall asleep.', 'technology', 'unreviewed', 'Product marketing pages', '2024-10-02', array['sleep', 'screens', 'blue light']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2024-10-16 09:00:00+00', '2024-10-16 09:00:00+00', '2024-10-17 09:00:00+00'),
  (pg_temp.sid('claim', 'table-top-fusion'), 'A company has demonstrated net-energy fusion on a lab bench', 'A press announcement describes a table-top device that releases more energy than it consumes. Independent groups have been asked to replicate the result.', 'science', 'unreviewed', 'Corvid Labs press release', '2025-02-04', array['fusion', 'energy', 'replication']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-02-14 09:00:00+00', '2025-02-14 09:00:00+00', '2025-02-15 09:00:00+00'),
  (pg_temp.sid('claim', 'vitamin-d-infections'), 'Vitamin D supplements reduce winter infections', 'Supplement makers and some clinicians say that taking vitamin D through the winter lowers the number of respiratory infections.', 'science', 'unreviewed', 'Supplement industry brochure', '2023-11-14', array['vitamin d', 'infection', 'supplements']::text[], 'en', 'published', pg_temp.u('editor'), true, '2023-11-24 09:00:00+00', '2023-11-24 09:00:00+00', '2023-11-25 09:00:00+00'),
  (pg_temp.sid('claim', 'coffee-heart'), 'Drinking three cups of coffee a day protects the heart', 'A headline claims that regular moderate coffee drinking protects against heart disease.', 'science', 'unreviewed', 'News headline', '2023-09-02', array['coffee', 'heart', 'diet']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2023-09-13 09:00:00+00', '2023-09-13 09:00:00+00', '2023-09-14 09:00:00+00'),
  (pg_temp.sid('claim', 'microplastics-tap'), 'Tap water in the region contains harmful levels of microplastics', 'Social media posts claim that municipal tap water contains microplastics at levels that harm health.', 'environment', 'unreviewed', 'Social media posts', '2024-05-20', array['microplastics', 'tap water', 'health']::text[], 'en', 'published', pg_temp.u('editor'), true, '2024-05-30 09:00:00+00', '2024-05-30 09:00:00+00', '2024-05-31 09:00:00+00'),
  (pg_temp.sid('claim', 'water-safe-cedar'), 'Cedar Valley tap water meets all safety standards', 'The local water board states that Cedar Valley drinking water met every regulated standard in the last reporting year.', 'environment', 'unreviewed', 'Water board annual report', '2025-03-01', array['water', 'safety', 'regulation']::text[], 'en', 'published', pg_temp.u('editor'), true, '2025-03-13 09:00:00+00', '2025-03-13 09:00:00+00', '2025-03-14 09:00:00+00'),
  (pg_temp.sid('claim', 'ocean-ph'), 'Coastal ocean water has become measurably more acidic since 1998', 'Climate scientists say average coastal surface pH has fallen over the last quarter century.', 'environment', 'unreviewed', 'Climate centre summary', '2025-01-17', array['ocean', 'acidification', 'ph']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-01-29 09:00:00+00', '2025-01-29 09:00:00+00', '2025-01-30 09:00:00+00'),
  (pg_temp.sid('claim', 'quantum-advantage'), 'A quantum computer has outperformed classical machines on a useful task', 'Researchers report a speed-up on a sampling task that they say classical computers cannot match in reasonable time.', 'technology', 'unreviewed', 'Preprint and press coverage', '2025-07-09', array['quantum', 'computing', 'sampling']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-07-19 09:00:00+00', '2025-07-19 09:00:00+00', '2025-07-20 09:00:00+00'),
  (pg_temp.sid('claim', 'booster-hospital'), 'Booster doses lowered hospitalisation among older adults last winter', 'Public health officials say people over 65 who took the autumn booster were less likely to be hospitalised.', 'science', 'unreviewed', 'Public health briefing', '2025-02-26', array['vaccination', 'boosters', 'hospital']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-03-09 09:00:00+00', '2025-03-09 09:00:00+00', '2025-03-10 09:00:00+00'),
  (pg_temp.sid('claim', 'handwash-absence'), 'Hand-washing campaigns cut school absences', 'School districts say that structured hand hygiene programmes reduce student absence.', 'education', 'unreviewed', 'District newsletter', '2022-10-11', array['schools', 'hygiene', 'absenteeism']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2022-10-23 09:00:00+00', '2022-10-23 09:00:00+00', '2022-10-24 09:00:00+00'),
  (pg_temp.sid('claim', 'lunar-ice'), 'There is accessible water ice near the lunar south pole', 'Space agencies say that water ice near the lunar south pole could support future missions.', 'science', 'unreviewed', 'Agency mission brief', '2024-12-03', array['moon', 'ice', 'exploration']::text[], 'en', 'published', pg_temp.u('editor'), true, '2024-12-16 09:00:00+00', '2024-12-16 09:00:00+00', '2024-12-17 09:00:00+00'),
  (pg_temp.sid('claim', 'asteroid-impact'), 'A large asteroid will hit Earth within the next century', 'Viral posts predict a civilisation-ending asteroid impact within a hundred years.', 'science', 'unreviewed', 'Viral video', '2025-05-05', array['asteroid', 'impact', 'risk']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-05-14 09:00:00+00', '2025-05-14 09:00:00+00', '2025-05-15 09:00:00+00'),
  (pg_temp.sid('claim', 'bilingual-attention'), 'Speaking two languages improves attention and executive control', 'Popular articles say bilingual people have stronger attention control than monolingual people.', 'education', 'unreviewed', 'Popular science magazine', '2023-04-19', array['bilingualism', 'cognition', 'attention']::text[], 'en', 'published', pg_temp.u('editor'), true, '2023-04-29 09:00:00+00', '2023-04-29 09:00:00+00', '2023-04-30 09:00:00+00'),
  (pg_temp.sid('claim', 'solar-doubled'), 'Solar capacity in the region has doubled since 2020', 'Local officials say installed solar capacity in the region is now twice what it was in 2020.', 'environment', 'unreviewed', 'Regional newsletter', '2025-06-30', array['solar', 'energy', 'capacity']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-07-09 09:00:00+00', '2025-07-09 09:00:00+00', '2025-07-10 09:00:00+00'),
  (pg_temp.sid('claim', 'solar-payback'), 'Rooftop solar pays for itself in six years', 'An installer says a typical household recovers the cost of rooftop solar within six years.', 'environment', 'unreviewed', 'Installer brochure', '2024-09-08', array['solar', 'cost', 'households']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2024-09-21 09:00:00+00', '2024-09-21 09:00:00+00', '2024-09-22 09:00:00+00'),
  (pg_temp.sid('claim', 'ev-share'), 'Electric vehicles are now a third of new car sales', 'A transport minister says about one in three new cars sold this spring was electric.', 'environment', 'unreviewed', 'Ministerial speech', '2026-04-12', array['electric vehicles', 'sales', 'transport']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2026-04-24 09:00:00+00', '2026-04-24 09:00:00+00', '2026-04-25 09:00:00+00'),
  (pg_temp.sid('claim', 'longer-fire-season'), 'Wildfire season in the basin is longer than it was thirty years ago', 'Environmental groups say the fire season in the Pinecrest Basin starts earlier and ends later than it used to.', 'environment', 'unreviewed', 'Environmental trust briefing', '2025-10-05', array['wildfire', 'climate', 'season']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-10-19 09:00:00+00', '2025-10-19 09:00:00+00', '2025-10-20 09:00:00+00'),
  (pg_temp.sid('claim', 'deforestation-slowing'), 'Deforestation in the northern basin has stopped', 'A regional agency says deforestation in the northern basin has halted.', 'environment', 'unreviewed', 'Agency press statement', '2025-09-14', array['forests', 'satellite', 'land use']::text[], 'en', 'published', pg_temp.u('editor'), true, '2025-09-27 09:00:00+00', '2025-09-27 09:00:00+00', '2025-09-28 09:00:00+00'),
  (pg_temp.sid('claim', 'recycling-landfill'), 'Most of what residents recycle ends up in landfill', 'A news report says most household recycling is quietly sent to landfill.', 'environment', 'unreviewed', 'Newspaper report', '2024-02-19', array['recycling', 'waste', 'landfill']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2024-03-01 09:00:00+00', '2024-03-01 09:00:00+00', '2024-03-02 09:00:00+00'),
  (pg_temp.sid('claim', 'wind-noise'), 'Wind farms cause widespread noise complaints from residents', 'Opponents of a proposed wind farm say neighbours of existing farms regularly complain about noise.', 'environment', 'unreviewed', 'Local campaign leaflet', '2023-12-01', array['wind', 'noise', 'communities']::text[], 'en', 'published', pg_temp.u('editor'), true, '2023-12-12 09:00:00+00', '2023-12-12 09:00:00+00', '2023-12-13 09:00:00+00'),
  (pg_temp.sid('claim', 'renewables-blackouts'), 'A high share of renewables makes blackouts more likely', 'Critics say grids with a large renewable share suffer more blackouts.', 'environment', 'unreviewed', 'Op-ed', '2025-11-03', array['grid', 'renewables', 'reliability']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-11-15 09:00:00+00', '2025-11-15 09:00:00+00', '2025-11-16 09:00:00+00'),
  (pg_temp.sid('claim', 'bee-decline'), 'Orchard bee populations are collapsing', 'Campaigners say bee numbers in the region have collapsed because of pesticide use.', 'environment', 'unreviewed', 'Campaign website', '2025-07-18', array['bees', 'pollinators', 'orchards']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-07-31 09:00:00+00', '2025-07-31 09:00:00+00', '2025-08-01 09:00:00+00'),
  (pg_temp.sid('claim', 'sea-level-harbour'), 'Sea level at Brightwater Harbour is rising faster than the global average', 'Harbour authorities say local sea level is rising faster than the global average.', 'environment', 'unreviewed', 'Harbour authority report', '2025-12-02', array['sea level', 'tides', 'coast']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-12-13 09:00:00+00', '2025-12-13 09:00:00+00', '2025-12-14 09:00:00+00'),
  (pg_temp.sid('claim', 'offsets-deliver'), 'Carbon offset credits deliver the reductions they promise', 'Sellers of offset credits say each credit corresponds to a verified tonne of avoided emissions.', 'environment', 'unreviewed', 'Offset marketplace', '2025-03-18', array['carbon', 'offsets', 'climate']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-03-31 09:00:00+00', '2025-03-31 09:00:00+00', '2025-04-01 09:00:00+00'),
  (pg_temp.sid('claim', 'small-classes'), 'Smaller primary classes improve reading outcomes', 'Education campaigners say reducing primary class sizes below 20 raises reading outcomes.', 'education', 'unreviewed', 'Campaign briefing', '2024-02-05', array['class size', 'reading', 'primary']::text[], 'en', 'published', pg_temp.u('editor'), true, '2024-02-18 09:00:00+00', '2024-02-18 09:00:00+00', '2024-02-19 09:00:00+00'),
  (pg_temp.sid('claim', 'homework-scores'), 'More homework leads to higher test scores', 'A commentator argues that students who do more homework always score higher.', 'education', 'unreviewed', 'Newspaper column', '2023-06-09', array['homework', 'scores', 'secondary']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2023-06-18 09:00:00+00', '2023-06-18 09:00:00+00', '2023-06-19 09:00:00+00'),
  (pg_temp.sid('claim', 'phone-bans'), 'School phone bans raise exam results', 'Some officials say banning phones in schools raises exam results.', 'education', 'unreviewed', 'Ministerial press conference', '2025-05-21', array['phones', 'schools', 'attention']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-05-30 09:00:00+00', '2025-05-30 09:00:00+00', '2025-05-31 09:00:00+00'),
  (pg_temp.sid('claim', 'library-reading-age'), 'Children with library cards read years ahead of their peers', 'A library network says children who hold a library card are about two years ahead in reading age.', 'education', 'unreviewed', 'Library network leaflet', '2025-04-02', array['libraries', 'reading', 'children']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-04-16 09:00:00+00', '2025-04-16 09:00:00+00', '2025-04-17 09:00:00+00'),
  (pg_temp.sid('claim', 'tutoring-works'), 'Intensive small-group tutoring closes learning gaps', 'Evidence summaries say regular small-group tutoring reduces attainment gaps.', 'education', 'unreviewed', 'Education research summary', '2024-11-12', array['tutoring', 'learning gaps', 'randomised']::text[], 'en', 'published', pg_temp.u('editor'), true, '2024-11-21 09:00:00+00', '2024-11-21 09:00:00+00', '2024-11-22 09:00:00+00'),
  (pg_temp.sid('claim', 'teacher-pay-retention'), 'Higher pay is the main reason teachers stay in the profession', 'A union says pay is the biggest factor in whether teachers remain in post.', 'education', 'unreviewed', 'Union statement', '2025-09-01', array['teachers', 'pay', 'retention']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-09-11 09:00:00+00', '2025-09-11 09:00:00+00', '2025-09-12 09:00:00+00'),
  (pg_temp.sid('claim', 'learning-styles'), 'Teaching to each pupil’s learning style improves results', 'A long-standing belief says that matching lessons to a visual, auditory or kinaesthetic style improves learning.', 'education', 'unreviewed', 'Teacher training materials', '2022-05-24', array['learning styles', 'pedagogy', 'teaching']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2022-06-03 09:00:00+00', '2022-06-03 09:00:00+00', '2022-06-04 09:00:00+00'),
  (pg_temp.sid('claim', 'open-textbooks'), 'Open textbooks cut course costs for students', 'Universities say adopting open textbooks lowers what students spend on course materials.', 'education', 'unreviewed', 'University announcement', '2025-02-14', array['textbooks', 'costs', 'higher education']::text[], 'en', 'published', pg_temp.u('editor'), true, '2025-02-23 09:00:00+00', '2025-02-23 09:00:00+00', '2025-02-24 09:00:00+00'),
  (pg_temp.sid('claim', 'gifted-programmes'), 'Gifted programmes are only accessible to wealthy pupils', 'A blog post argues that selective gifted programmes mainly serve well-off families.', 'education', 'unreviewed', 'Blog post', '2026-01-12', array['gifted', 'equity', 'schools']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2026-01-21 09:00:00+00', '2026-01-21 09:00:00+00', '2026-01-22 09:00:00+00'),
  (pg_temp.sid('claim', 'summer-learning-loss'), 'Students lose a month of learning over the summer holidays', 'A commonly repeated figure says pupils lose around a month of learning each summer.', 'education', 'unreviewed', 'Education news site', '2026-02-03', array['summer', 'learning loss', 'holidays']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2026-02-14 09:00:00+00', '2026-02-14 09:00:00+00', '2026-02-15 09:00:00+00'),
  (pg_temp.sid('claim', 'cloud-uptime'), 'The leading cloud provider delivered 99.99 percent uptime last year', 'A provider says its services were available 99.99 percent of the time in 2025.', 'technology', 'unreviewed', 'Provider reliability report', '2026-01-20', array['cloud', 'uptime', 'reliability']::text[], 'en', 'published', pg_temp.u('editor'), true, '2026-02-02 09:00:00+00', '2026-02-02 09:00:00+00', '2026-02-03 09:00:00+00'),
  (pg_temp.sid('claim', 'phone-battery-ten-years'), 'A new phone battery will last ten years', 'A company says its new phone battery will keep most of its capacity for ten years.', 'technology', 'unreviewed', 'Company announcement', '2025-09-10', array['battery', 'phones', 'longevity']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-09-21 09:00:00+00', '2025-09-21 09:00:00+00', '2025-09-22 09:00:00+00'),
  (pg_temp.sid('claim', 'password-managers'), 'Using a password manager sharply reduces account takeovers', 'Security advisers say that people who use password managers are much less likely to have accounts taken over.', 'technology', 'unreviewed', 'Security awareness campaign', '2025-04-22', array['security', 'passwords', 'accounts']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-05-02 09:00:00+00', '2025-05-02 09:00:00+00', '2025-05-03 09:00:00+00'),
  (pg_temp.sid('claim', '5g-health'), 'Mobile network masts harm the health of people living nearby', 'Local campaigners say living near mobile masts causes illness.', 'technology', 'unreviewed', 'Local campaign group', '2023-03-14', array['5g', 'health', 'radio frequency']::text[], 'en', 'published', pg_temp.u('editor'), true, '2023-03-25 09:00:00+00', '2023-03-25 09:00:00+00', '2023-03-26 09:00:00+00'),
  (pg_temp.sid('claim', 'ai-jobs'), 'Artificial intelligence will eliminate a quarter of local jobs within five years', 'A consultancy forecast says a quarter of jobs in the region are at risk from automation within five years.', 'technology', 'unreviewed', 'Consultancy forecast', '2025-06-12', array['automation', 'jobs', 'labour market']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-06-25 09:00:00+00', '2025-06-25 09:00:00+00', '2025-06-26 09:00:00+00'),
  (pg_temp.sid('claim', 'deepfake-detection'), 'People cannot tell AI-generated video from real video', 'A news report says viewers can no longer distinguish fake video from real footage.', 'technology', 'unreviewed', 'News report', '2025-02-24', array['deepfakes', 'video', 'perception']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-03-06 09:00:00+00', '2025-03-06 09:00:00+00', '2025-03-07 09:00:00+00'),
  (pg_temp.sid('claim', 'ev-chargers-enough'), 'There are enough public electric vehicle chargers for current demand', 'A provider says public charging capacity already meets demand.', 'technology', 'unreviewed', 'Provider report', '2025-12-15', array['chargers', 'electric vehicles', 'infrastructure']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-12-28 09:00:00+00', '2025-12-28 09:00:00+00', '2025-12-29 09:00:00+00'),
  (pg_temp.sid('claim', 'satellite-broadband'), 'Satellite broadband matches fibre for latency', 'An operator says its satellite broadband has latency comparable to fibre.', 'technology', 'unreviewed', 'Operator marketing', '2025-08-04', array['satellite', 'broadband', 'latency']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-08-16 09:00:00+00', '2025-08-16 09:00:00+00', '2025-08-17 09:00:00+00'),
  (pg_temp.sid('claim', 'ocr-accuracy'), 'Handwriting recognition now matches human accuracy', 'A vendor says its software reads handwriting as accurately as a person does.', 'technology', 'unreviewed', 'Vendor white paper', '2025-05-30', array['ocr', 'handwriting', 'benchmarks']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-06-09 09:00:00+00', '2025-06-09 09:00:00+00', '2025-06-10 09:00:00+00'),
  (pg_temp.sid('claim', 'open-source-secure'), 'Open source software is inherently more secure than proprietary software', 'A common argument holds that open source code is more secure because anyone can inspect it.', 'technology', 'unreviewed', 'Developer forum', '2024-06-26', array['open source', 'security', 'software']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2024-07-10 09:00:00+00', '2024-07-10 09:00:00+00', '2024-07-11 09:00:00+00'),
  (pg_temp.sid('claim', 'quantum-encryption'), 'Quantum computers can already break today’s encryption', 'Posts say existing quantum computers can already crack common encryption.', 'technology', 'unreviewed', 'Social media', '2026-03-01', array['quantum', 'encryption', 'security']::text[], 'en', 'published', pg_temp.u('editor'), true, '2026-03-12 09:00:00+00', '2026-03-12 09:00:00+00', '2026-03-13 09:00:00+00'),
  (pg_temp.sid('claim', 'smart-meters'), 'Smart meters overcharge households', 'A neighbourhood group says smart meters record more usage than is real.', 'technology', 'unreviewed', 'Neighbourhood forum', '2026-03-18', array['smart meters', 'billing', 'energy']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2026-03-28 09:00:00+00', '2026-03-28 09:00:00+00', '2026-03-29 09:00:00+00'),
  (pg_temp.sid('claim', 'youth-unemployment'), 'Youth unemployment has reached a record high', 'A news segment says youth unemployment has never been higher.', 'social_issues', 'unreviewed', 'Television news', '2025-12-10', array['youth', 'unemployment', 'labour']::text[], 'en', 'published', pg_temp.u('editor'), true, '2025-12-22 09:00:00+00', '2025-12-22 09:00:00+00', '2025-12-23 09:00:00+00'),
  (pg_temp.sid('claim', 'loneliness-epidemic'), 'Loneliness among adults is rising year after year', 'Commentators say adult loneliness has risen steadily for a decade.', 'social_issues', 'unreviewed', 'Magazine feature', '2025-03-03', array['loneliness', 'wellbeing', 'survey']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-03-16 09:00:00+00', '2025-03-16 09:00:00+00', '2025-03-17 09:00:00+00'),
  (pg_temp.sid('claim', 'housing-first'), 'Housing First programmes reduce rough sleeping', 'Advocates say giving people stable housing first reduces rough sleeping.', 'social_issues', 'unreviewed', 'Advocacy report', '2025-09-19', array['homelessness', 'housing', 'programmes']::text[], 'en', 'published', pg_temp.u('editor'), true, '2025-09-30 09:00:00+00', '2025-09-30 09:00:00+00', '2025-10-01 09:00:00+00'),
  (pg_temp.sid('claim', 'volunteering-decline'), 'Volunteering has collapsed since 2020', 'Charities say volunteering has fallen dramatically since the pandemic.', 'social_issues', 'unreviewed', 'Charity sector statement', '2024-01-17', array['volunteering', 'civil society', 'communities']::text[], 'en', 'published', pg_temp.u('editor'), true, '2024-01-26 09:00:00+00', '2024-01-26 09:00:00+00', '2024-01-27 09:00:00+00'),
  (pg_temp.sid('claim', 'charity-overhead'), 'Most charities spend over half of donations on overheads', 'A viral post says the majority of charities spend more than half of their income on overheads.', 'social_issues', 'unreviewed', 'Viral post', '2024-10-08', array['charities', 'donations', 'spending']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2024-10-17 09:00:00+00', '2024-10-17 09:00:00+00', '2024-10-18 09:00:00+00'),
  (pg_temp.sid('claim', 'crime-eastgate'), 'Crime in Eastgate has soared in the last year', 'A local newspaper says crime in Eastgate has soared.', 'social_issues', 'unreviewed', 'Local newspaper', '2025-07-02', array['crime', 'neighbourhoods', 'statistics']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-07-11 09:00:00+00', '2025-07-11 09:00:00+00', '2025-07-12 09:00:00+00'),
  (pg_temp.sid('claim', 'remote-work-productivity'), 'Remote work makes employees less productive', 'Employers say working from home lowers productivity.', 'social_issues', 'unreviewed', 'Employer survey', '2025-01-21', array['remote work', 'productivity', 'office']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-01-30 09:00:00+00', '2025-01-30 09:00:00+00', '2025-01-31 09:00:00+00'),
  (pg_temp.sid('claim', 'gender-pay-gap'), 'The gender pay gap disappears once jobs and hours are accounted for', 'A commentator says the gender pay gap vanishes after adjusting for occupation and hours.', 'social_issues', 'unreviewed', 'Radio commentary', '2025-03-08', array['pay gap', 'gender', 'wages']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-03-21 09:00:00+00', '2025-03-21 09:00:00+00', '2025-03-22 09:00:00+00'),
  (pg_temp.sid('claim', 'library-closures'), 'Public libraries are being abandoned by readers', 'A commentator says nobody uses public libraries any more.', 'social_issues', 'unreviewed', 'Opinion column', '2025-06-20', array['libraries', 'usage', 'communities']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-07-01 09:00:00+00', '2025-07-01 09:00:00+00', '2025-07-02 09:00:00+00'),
  (pg_temp.sid('claim', 'teen-screen-time'), 'Screen time is the main cause of teenage unhappiness', 'Campaigners say screen time is the main cause of declining teenage wellbeing.', 'social_issues', 'unreviewed', 'Campaign report', '2024-02-27', array['screen time', 'teenagers', 'wellbeing']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2024-03-08 09:00:00+00', '2024-03-08 09:00:00+00', '2024-03-09 09:00:00+00'),
  (pg_temp.sid('claim', 'petition-impact'), 'Online petitions rarely change policy', 'A post argues that signing online petitions has no effect on policy.', 'social_issues', 'unreviewed', 'Blog post', '2026-04-02', array['petitions', 'civic participation', 'policy']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2026-04-15 09:00:00+00', '2026-04-15 09:00:00+00', '2026-04-16 09:00:00+00'),
  (pg_temp.sid('claim', 'bus-lanes'), 'Brightwater’s new bus lanes cut the average commute by 12 percent', 'The city council says its bus lane pilot shortened the average commute by 12 percent. Independent counts suggest the picture is more mixed.', 'public_policy', 'unreviewed', 'Council press release', '2025-09-15', array['bus lanes', 'commute', 'transport']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-09-26 09:00:00+00', '2025-09-26 09:00:00+00', '2025-09-27 09:00:00+00'),
  (pg_temp.sid('claim', 'congestion-charge'), 'The congestion charge has reduced traffic and improved air quality', 'Transport officials say the city-centre congestion charge cut traffic and improved air quality.', 'public_policy', 'unreviewed', 'Transport bureau briefing', '2025-02-10', array['congestion charge', 'traffic', 'air quality']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-02-22 09:00:00+00', '2025-02-22 09:00:00+00', '2025-02-23 09:00:00+00'),
  (pg_temp.sid('claim', 'sugar-tax'), 'A sugary drinks levy reduces sugar consumption', 'Health campaigners say the sugary drinks levy cut how much sugar people consume.', 'public_policy', 'unreviewed', 'Health campaign statement', '2024-07-16', array['sugar', 'tax', 'health']::text[], 'en', 'published', pg_temp.u('editor'), true, '2024-07-26 09:00:00+00', '2024-07-26 09:00:00+00', '2024-07-27 09:00:00+00'),
  (pg_temp.sid('claim', 'minimum-wage-jobs'), 'Raising the minimum wage costs jobs', 'Business groups say the minimum wage increase reduced employment.', 'public_policy', 'unreviewed', 'Business lobby statement', '2025-02-27', array['minimum wage', 'employment', 'labour']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-03-11 09:00:00+00', '2025-03-11 09:00:00+00', '2025-03-12 09:00:00+00'),
  (pg_temp.sid('claim', 'four-day-week'), 'A four-day working week maintains productivity', 'Trial organisers say employers kept output steady with a four-day week.', 'public_policy', 'unreviewed', 'Trial organiser report', '2025-08-12', array['four-day week', 'productivity', 'work']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2025-08-26 09:00:00+00', '2025-08-26 09:00:00+00', '2025-08-27 09:00:00+00'),
  (pg_temp.sid('claim', 'rent-control'), 'Rent stabilisation lowers rents without reducing supply', 'Tenant groups say rent stabilisation lowers rents without hurting the supply of homes.', 'public_policy', 'unreviewed', 'Tenant union statement', '2025-12-20', array['rent', 'housing', 'regulation']::text[], 'en', 'published', pg_temp.u('editor'), true, '2026-01-03 09:00:00+00', '2026-01-03 09:00:00+00', '2026-01-04 09:00:00+00'),
  (pg_temp.sid('claim', 'free-transit'), 'Fare-free public transport doubles ridership', 'A councillor says making buses fare-free doubled ridership.', 'public_policy', 'unreviewed', 'Council meeting', '2025-06-06', array['transit', 'fares', 'ridership']::text[], 'en', 'published', pg_temp.u('editor'), true, '2025-06-18 09:00:00+00', '2025-06-18 09:00:00+00', '2025-06-19 09:00:00+00'),
  (pg_temp.sid('claim', 'speed-cameras'), 'Speed cameras reduce collisions where they are installed', 'Road safety officials say collisions fall at camera sites.', 'public_policy', 'unreviewed', 'Transport bureau report', '2024-05-13', array['speed cameras', 'road safety', 'collisions']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2024-05-23 09:00:00+00', '2024-05-23 09:00:00+00', '2024-05-24 09:00:00+00'),
  (pg_temp.sid('claim', 'basic-income'), 'A basic income pilot improves wellbeing without reducing work', 'Pilot organisers say recipients’ wellbeing rose while employment stayed stable.', 'public_policy', 'unreviewed', 'Pilot interim report', '2026-02-18', array['basic income', 'welfare', 'pilot']::text[], 'en', 'published', pg_temp.u('editor'), true, '2026-02-27 09:00:00+00', '2026-02-27 09:00:00+00', '2026-02-28 09:00:00+00'),
  (pg_temp.sid('claim', 'bag-charge'), 'The single-use bag charge reduced plastic litter', 'Environment officials say the bag charge cut plastic litter.', 'public_policy', 'unreviewed', 'Environment department release', '2023-11-20', array['plastic', 'bags', 'litter']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2023-12-03 09:00:00+00', '2023-12-03 09:00:00+00', '2023-12-04 09:00:00+00'),
  (pg_temp.sid('claim', 'free-wifi-network'), 'The city’s public Wi-Fi network was widely used', 'Defenders of the city’s decision to close its public Wi-Fi network disagreed about how widely it was used.', 'public_policy', 'unreviewed', 'Council debate', '2022-08-30', array['wifi', 'public services', 'digital']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2022-09-10 09:00:00+00', '2022-09-10 09:00:00+00', '2022-09-11 09:00:00+00'),
  (pg_temp.sid('claim', 'tax-cuts-revenue'), 'Tax cuts pay for themselves', 'A commonly repeated claim says cutting taxes raises enough growth to replace lost revenue.', 'public_policy', 'unreviewed', 'Political speeches', '2023-02-09', array['tax', 'revenue', 'economy']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2023-02-22 09:00:00+00', '2023-02-22 09:00:00+00', '2023-02-23 09:00:00+00'),
  (pg_temp.sid('claim', 'cash-ban'), 'The city is planning to ban cash payments', 'A rumour says the council plans to ban cash payments in public buildings.', 'public_policy', 'unreviewed', 'Messaging group', '2026-04-20', array['cash', 'payments', 'rumour']::text[], 'en', 'published', pg_temp.u('researcher'), true, '2026-04-30 09:00:00+00', '2026-04-30 09:00:00+00', '2026-05-01 09:00:00+00'),
  (pg_temp.sid('claim', 'transporte-estudiantes'), 'El pase de transporte gratuito para estudiantes aumenta la asistencia escolar', 'Las autoridades sostienen que el pase gratuito mejoró la asistencia, pero los datos disponibles son limitados.', 'education', 'unreviewed', 'Nota de prensa del ayuntamiento', '2025-07-23', array['transporte', 'asistencia', 'estudiantes']::text[], 'es', 'published', pg_temp.u('researcher'), true, '2025-08-04 09:00:00+00', '2025-08-04 09:00:00+00', '2025-08-05 09:00:00+00'),
  (pg_temp.sid('claim', 'radwege-innenstadt'), 'Mehr Radwege verringern den Autoverkehr in der Innenstadt', 'Die Stadtverwaltung sagt, dass der Ausbau der Radwege den Autoverkehr in der Innenstadt gesenkt hat.', 'environment', 'unreviewed', 'Pressemitteilung der Stadt', '2025-05-07', array['radwege', 'verkehr', 'innenstadt']::text[], 'de', 'published', pg_temp.u('researcher'), true, '2025-05-19 09:00:00+00', '2025-05-19 09:00:00+00', '2025-05-20 09:00:00+00'),
  (pg_temp.sid('claim', 'hafte-kari-kutah'), 'کوتاه‌کردن هفته‌ی کاری بهره‌وری را کاهش نمی‌دهد', 'برخی پژوهش‌ها می‌گویند کاهش ساعت کار هفتگی بهره‌وری را کم نمی‌کند، اما نظر کارکنان و پژوهشگران یکسان نیست.', 'public_policy', 'unreviewed', 'گزارش یک مرکز پژوهشی', '2025-04-14', array['هفته‌ی کاری', 'بهره‌وری', 'کار']::text[], 'fa', 'published', pg_temp.u('researcher'), true, '2025-04-25 09:00:00+00', '2025-04-25 09:00:00+00', '2025-04-26 09:00:00+00');

-- --------------------------------------------------------------- evidence
insert into public.evidence (id, claim_id, source_id, title, summary, position, limitations, researcher_note, sort_order, state, author_id, is_demo, created_at, updated_at, released_at) values
  (pg_temp.sid('evidence', 'sleep-memory-1'), pg_temp.sid('claim', 'sleep-memory'), pg_temp.sid('source', 'meridian-sleep-cohort'), 'Short sleepers recalled fewer words after a delay', 'Adults reporting under seven hours recalled about 11 percent fewer words after a 24-hour delay than the comparison group.', 'supports', 'Sleep duration was self-reported, and the cohort was recruited from a single region.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-04-06 09:00:00+00', '2025-04-06 09:00:00+00', '2025-04-07 09:00:00+00'),
  (pg_temp.sid('evidence', 'sleep-memory-2'), pg_temp.sid('claim', 'sleep-memory'), pg_temp.sid('source', 'halden-sleep-trial'), 'Light filters shortened sleep onset but did not test memory', 'The trial measured how quickly participants fell asleep, not recall, so it informs the mechanism rather than the claim itself.', 'context', 'Preprint; not yet peer reviewed.', '', 2, 'published', pg_temp.u('editor'), true, '2025-06-11 09:00:00+00', '2025-06-11 09:00:00+00', '2025-06-12 09:00:00+00'),
  (pg_temp.sid('evidence', 'light-filters-1'), pg_temp.sid('claim', 'light-filters'), pg_temp.sid('source', 'halden-sleep-trial'), 'Filtered evenings shortened sleep onset by a few minutes', 'Participants using filters fell asleep on average four minutes sooner than the control group.', 'supports', 'Small effect, short trial, preprint status.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-06-12 09:00:00+00', '2025-06-12 09:00:00+00', '2025-06-13 09:00:00+00'),
  (pg_temp.sid('evidence', 'table-top-fusion-1'), pg_temp.sid('claim', 'table-top-fusion'), pg_temp.sid('source', 'corvid-fusion-pr'), 'The company reports a net-energy milestone', 'The press release states a gain above one in a single run and cites internal measurements.', 'supports', 'No raw data were published and no outside party observed the run.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-02-18 09:00:00+00', '2025-02-18 09:00:00+00', '2025-02-19 09:00:00+00'),
  (pg_temp.sid('evidence', 'table-top-fusion-2'), pg_temp.sid('claim', 'table-top-fusion'), pg_temp.sid('source', 'summit-peak-cold-fusion'), 'Earlier table-top fusion reports did not replicate', 'A review of 23 earlier table-top claims found none reproduced under independent measurement.', 'contradicts', 'The review covers earlier devices, not this one.', 'Wording in the source is more cautious than the headline, so the summary follows the source.', 2, 'published', pg_temp.u('researcher'), true, '2025-02-18 09:00:00+00', '2025-02-18 09:00:00+00', '2025-02-19 09:00:00+00'),
  (pg_temp.sid('evidence', 'table-top-fusion-3'), pg_temp.sid('claim', 'table-top-fusion'), pg_temp.sid('source', 'summit-peak-cold-fusion'), 'What counts as net energy depends on where the boundary is drawn', 'The society recommends reporting gain over wall-plug energy, not only energy delivered to the fuel.', 'context', '', 'Wording in the source is more cautious than the headline, so the summary follows the source.', 3, 'published', pg_temp.u('editor'), true, '2025-02-16 09:00:00+00', '2025-02-16 09:00:00+00', '2025-02-17 09:00:00+00'),
  (pg_temp.sid('evidence', 'vitamin-d-infections-1'), pg_temp.sid('claim', 'vitamin-d-infections'), pg_temp.sid('source', 'orchard-vitd-review'), 'Small reduction among people with low baseline levels', 'The review found a modest drop in infections, concentrated in people who started with low vitamin D levels.', 'supports', 'Trials differed widely in dose and definition of infection.', '', 1, 'published', pg_temp.u('researcher'), true, '2024-09-30 09:00:00+00', '2024-09-30 09:00:00+00', '2024-10-01 09:00:00+00'),
  (pg_temp.sid('evidence', 'vitamin-d-infections-2'), pg_temp.sid('claim', 'vitamin-d-infections'), pg_temp.sid('source', 'bellmont-flu-season'), 'Regions with high supplement use saw no lower illness rates', 'Surveillance data showed similar respiratory illness rates across regions regardless of reported supplement use.', 'contradicts', 'Ecological data; individual supplement use was not measured.', '', 2, 'published', pg_temp.u('researcher'), true, '2025-04-21 09:00:00+00', '2025-04-21 09:00:00+00', '2025-04-22 09:00:00+00'),
  (pg_temp.sid('evidence', 'coffee-heart-1'), pg_temp.sid('claim', 'coffee-heart'), pg_temp.sid('source', 'quillfeather-coffee'), 'Moderate coffee drinkers had fewer rhythm disorders', 'Registry participants drinking two to three cups a day had a lower rate of recorded rhythm disorders over twelve years.', 'supports', 'Observational; cannot rule out that healthier people drink more coffee.', '', 1, 'published', pg_temp.u('researcher'), true, '2023-09-17 09:00:00+00', '2023-09-17 09:00:00+00', '2023-09-18 09:00:00+00'),
  (pg_temp.sid('evidence', 'coffee-heart-2'), pg_temp.sid('claim', 'coffee-heart'), pg_temp.sid('source', 'ledger-coffee-headline'), 'The headline went further than the study', 'The study reported an association with fewer rhythm disorders, not protection against heart disease in general.', 'context', '', '', 2, 'published', pg_temp.u('editor'), true, '2023-09-18 09:00:00+00', '2023-09-18 09:00:00+00', '2023-09-19 09:00:00+00'),
  (pg_temp.sid('evidence', 'coffee-heart-3'), pg_temp.sid('claim', 'coffee-heart'), pg_temp.sid('source', 'quillfeather-coffee'), 'No difference in overall cardiovascular events', 'Total cardiovascular events did not differ between coffee drinkers and non-drinkers once age and smoking were accounted for.', 'contradicts', 'Few events in the non-drinking group.', '', 3, 'published', pg_temp.u('researcher'), true, '2023-09-17 09:00:00+00', '2023-09-17 09:00:00+00', '2023-09-18 09:00:00+00'),
  (pg_temp.sid('evidence', 'microplastics-tap-1'), pg_temp.sid('claim', 'microplastics-tap'), pg_temp.sid('source', 'northfield-microplastics'), 'Particles were detected, but no health threshold exists', 'Particles were found in most samples, yet no accepted exposure threshold for harm has been established.', 'context', 'Small sample; method cannot detect the smallest particles.', '', 1, 'published', pg_temp.u('researcher'), true, '2024-06-02 09:00:00+00', '2024-06-02 09:00:00+00', '2024-06-03 09:00:00+00'),
  (pg_temp.sid('evidence', 'water-safe-cedar-1'), pg_temp.sid('claim', 'water-safe-cedar'), pg_temp.sid('source', 'cedar-water-quality'), 'All regulated parameters were within limits', 'The annual report lists every regulated parameter as within its limit across 1,140 samples.', 'supports', 'Self-reported by the operator; independent audit pending.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-03-16 09:00:00+00', '2025-03-16 09:00:00+00', '2025-03-17 09:00:00+00'),
  (pg_temp.sid('evidence', 'water-safe-cedar-2'), pg_temp.sid('claim', 'water-safe-cedar'), pg_temp.sid('source', 'northfield-microplastics'), 'Microplastics are not a regulated parameter', 'The compliance standards do not cover microplastics, so a pass does not speak to them.', 'context', '', 'The sample is described in an appendix that is not part of the public version.', 2, 'published', pg_temp.u('researcher'), true, '2025-03-16 09:00:00+00', '2025-03-16 09:00:00+00', '2025-03-17 09:00:00+00'),
  (pg_temp.sid('evidence', 'ocean-ph-1'), pg_temp.sid('claim', 'ocean-ph'), pg_temp.sid('source', 'tidewater-ocean-ph'), 'Average surface pH fell by 0.04 across the record', 'Twenty-six years of station readings show a steady decline of about 0.04 pH units.', 'supports', 'Stations are clustered near three harbours.', 'Compared with two other sources on the same question; direction of the finding is the same.', 1, 'published', pg_temp.u('researcher'), true, '2025-02-02 09:00:00+00', '2025-02-02 09:00:00+00', '2025-02-03 09:00:00+00'),
  (pg_temp.sid('evidence', 'ocean-ph-2'), pg_temp.sid('claim', 'ocean-ph'), pg_temp.sid('source', 'tidewater-ocean-ph'), 'Local variation is larger than the trend', 'Seasonal and river-flow swings exceed the long-term change, so single readings are not informative.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-01-31 09:00:00+00', '2025-01-31 09:00:00+00', '2025-02-01 09:00:00+00'),
  (pg_temp.sid('evidence', 'quantum-advantage-1'), pg_temp.sid('claim', 'quantum-advantage'), pg_temp.sid('source', 'summit-quantum-advantage'), 'Reported sampling task beyond direct classical simulation', 'The authors estimate that exact classical simulation would take thousands of years on current hardware.', 'supports', 'The task has no known practical use.', '', 1, 'published', pg_temp.u('editor'), true, '2025-07-22 09:00:00+00', '2025-07-22 09:00:00+00', '2025-07-23 09:00:00+00'),
  (pg_temp.sid('evidence', 'quantum-advantage-2'), pg_temp.sid('claim', 'quantum-advantage'), pg_temp.sid('source', 'halden-quantum-critique'), 'An approximate classical method reproduced the output statistics', 'A follow-up preprint reproduced the reported statistics on a classical cluster in under a day.', 'contradicts', 'Not yet peer reviewed; relies on approximations the original authors dispute.', '', 2, 'published', pg_temp.u('researcher'), true, '2025-08-30 09:00:00+00', '2025-08-30 09:00:00+00', '2025-08-31 09:00:00+00'),
  (pg_temp.sid('evidence', 'booster-hospital-1'), pg_temp.sid('claim', 'booster-hospital'), pg_temp.sid('source', 'bellmont-vaccine-surveillance'), 'Boosted adults were hospitalised less often', 'Hospitalisation rates were lower among boosted adults over 65 across all four winter months.', 'supports', 'Boosted people may differ in health habits and access to care.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-03-11 09:00:00+00', '2025-03-11 09:00:00+00', '2025-03-12 09:00:00+00'),
  (pg_temp.sid('evidence', 'booster-hospital-2'), pg_temp.sid('claim', 'booster-hospital'), pg_temp.sid('source', 'bellmont-flu-season'), 'Overall illness levels were lower than the previous winter', 'Lower circulation of the virus overall makes year-on-year comparisons harder to interpret.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-04-21 09:00:00+00', '2025-04-21 09:00:00+00', '2025-04-22 09:00:00+00'),
  (pg_temp.sid('evidence', 'handwash-absence-1'), pg_temp.sid('claim', 'handwash-absence'), pg_temp.sid('source', 'meridian-handwash'), 'Absences fell in schools with a daily routine', 'Schools with a supervised daily routine recorded about 12 percent fewer illness-related absences.', 'supports', 'Schools were not randomly assigned.', '', 1, 'published', pg_temp.u('researcher'), true, '2022-10-26 09:00:00+00', '2022-10-26 09:00:00+00', '2022-10-27 09:00:00+00'),
  (pg_temp.sid('evidence', 'lunar-ice-1'), pg_temp.sid('claim', 'lunar-ice'), pg_temp.sid('source', 'summit-moon-water'), 'Orbital signals are consistent with ice but not conclusive', 'Reflectance and neutron data are consistent with subsurface ice, yet no sample has confirmed it.', 'context', 'Remote sensing only; depth and purity unknown.', '', 1, 'published', pg_temp.u('researcher'), true, '2024-12-20 09:00:00+00', '2024-12-20 09:00:00+00', '2024-12-21 09:00:00+00'),
  (pg_temp.sid('evidence', 'asteroid-impact-1'), pg_temp.sid('claim', 'asteroid-impact'), pg_temp.sid('source', 'foxglove-asteroid'), 'No catalogued object has a significant impact probability', 'None of the 34,000 catalogued near-Earth objects has an impact probability above one in ten thousand this century.', 'contradicts', 'Catalogue is incomplete for smaller objects.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-05-19 09:00:00+00', '2025-05-19 09:00:00+00', '2025-05-20 09:00:00+00'),
  (pg_temp.sid('evidence', 'bilingual-attention-1'), pg_temp.sid('claim', 'bilingual-attention'), pg_temp.sid('source', 'orchard-bilingual'), 'Small advantage in some control tasks', 'Across 61 studies the pooled effect on conflict tasks was small but positive.', 'supports', 'Strong signs of publication bias in the original studies.', '', 1, 'published', pg_temp.u('researcher'), true, '2023-05-01 09:00:00+00', '2023-05-01 09:00:00+00', '2023-05-02 09:00:00+00'),
  (pg_temp.sid('evidence', 'bilingual-attention-2'), pg_temp.sid('claim', 'bilingual-attention'), pg_temp.sid('source', 'orchard-bilingual'), 'The advantage shrinks to near zero in well-controlled samples', 'After correcting for publication bias and matching on background, the pooled effect was close to zero.', 'contradicts', 'Fewer large, well-matched samples exist.', 'Wording in the source is more cautious than the headline, so the summary follows the source.', 2, 'published', pg_temp.u('researcher'), true, '2023-05-03 09:00:00+00', '2023-05-03 09:00:00+00', '2023-05-04 09:00:00+00'),
  (pg_temp.sid('evidence', 'solar-doubled-1'), pg_temp.sid('claim', 'solar-doubled'), pg_temp.sid('source', 'kestrel-solar-capacity'), 'Registered capacity rose from 410 to 835 megawatts', 'The register shows installed capacity growing from 410 megawatts in 2020 to 835 in 2025.', 'supports', 'Registration lags installation by several months.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-07-13 09:00:00+00', '2025-07-13 09:00:00+00', '2025-07-14 09:00:00+00'),
  (pg_temp.sid('evidence', 'solar-doubled-2'), pg_temp.sid('claim', 'solar-doubled'), pg_temp.sid('source', 'harbor-energy-outlook'), 'Most growth came from utility-scale projects', 'About two thirds of the increase came from five large installations rather than rooftop systems.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-07-13 09:00:00+00', '2025-07-13 09:00:00+00', '2025-07-14 09:00:00+00'),
  (pg_temp.sid('evidence', 'solar-payback-1'), pg_temp.sid('claim', 'solar-payback'), pg_temp.sid('source', 'marlow-solar-brochure'), 'Installer models a six-year payback', 'The brochure models a six-year payback for a south-facing roof with full self-consumption.', 'supports', 'Produced by a company that sells installations.', '', 1, 'published', pg_temp.u('researcher'), true, '2024-09-26 09:00:00+00', '2024-09-26 09:00:00+00', '2024-09-27 09:00:00+00'),
  (pg_temp.sid('evidence', 'solar-payback-2'), pg_temp.sid('claim', 'solar-payback'), pg_temp.sid('source', 'harbor-energy-outlook'), 'Median payback in the region is nearer ten years', 'Using regional tariffs and shading, the institute estimates a median payback of nine to eleven years.', 'contradicts', 'Assumes current tariffs stay constant.', '', 2, 'published', pg_temp.u('researcher'), true, '2025-02-22 09:00:00+00', '2025-02-22 09:00:00+00', '2025-02-23 09:00:00+00'),
  (pg_temp.sid('evidence', 'ev-share-1'), pg_temp.sid('claim', 'ev-share'), pg_temp.sid('source', 'aldermoor-ev-sales'), 'Fully electric models were 31 percent of Q1 registrations', 'Registrations of fully electric cars made up 31 percent of new registrations in the first quarter.', 'supports', 'Counts registrations, not sales to final owners.', '', 1, 'published', pg_temp.u('editor'), true, '2026-04-29 09:00:00+00', '2026-04-29 09:00:00+00', '2026-04-30 09:00:00+00'),
  (pg_temp.sid('evidence', 'longer-fire-season-1'), pg_temp.sid('claim', 'longer-fire-season'), pg_temp.sid('source', 'pinecrest-wildfire'), 'Season lengthened by about three weeks', 'Records show the season now runs roughly three weeks longer than in 1990.', 'supports', 'Definition of season start changed in 2008.', '', 1, 'published', pg_temp.u('editor'), true, '2025-10-21 09:00:00+00', '2025-10-21 09:00:00+00', '2025-10-22 09:00:00+00'),
  (pg_temp.sid('evidence', 'longer-fire-season-2'), pg_temp.sid('claim', 'longer-fire-season'), pg_temp.sid('source', 'tidewater-forest-cover'), 'Forest cover loss is concentrated in the east', 'Cover loss is concentrated in the eastern basin and does not map neatly onto fire frequency.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-10-22 09:00:00+00', '2025-10-22 09:00:00+00', '2025-10-23 09:00:00+00'),
  (pg_temp.sid('evidence', 'deforestation-slowing-1'), pg_temp.sid('claim', 'deforestation-slowing'), pg_temp.sid('source', 'tidewater-forest-cover'), 'Satellite data show continued, slower loss', 'Cover loss slowed by half but continued at around 0.6 percent a year.', 'contradicts', 'Resolution limits detection of selective logging.', '', 1, 'published', pg_temp.u('editor'), true, '2025-09-29 09:00:00+00', '2025-09-29 09:00:00+00', '2025-09-30 09:00:00+00'),
  (pg_temp.sid('evidence', 'deforestation-slowing-2'), pg_temp.sid('claim', 'deforestation-slowing'), pg_temp.sid('source', 'pinecrest-wildfire'), 'Some loss is due to fire, not clearing', 'Fire accounts for a share of the loss that agency statistics classify separately.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-10-14 09:00:00+00', '2025-10-14 09:00:00+00', '2025-10-15 09:00:00+00'),
  (pg_temp.sid('evidence', 'recycling-landfill-1'), pg_temp.sid('claim', 'recycling-landfill'), pg_temp.sid('source', 'ledger-recycling-myth'), 'Anonymous staff say most loads are rejected', 'The report quotes two unnamed facility workers saying most loads are rejected.', 'supports', 'Anonymous sources; no figures given.', '', 1, 'published', pg_temp.u('researcher'), true, '2024-03-06 09:00:00+00', '2024-03-06 09:00:00+00', '2024-03-07 09:00:00+00'),
  (pg_temp.sid('evidence', 'recycling-landfill-2'), pg_temp.sid('claim', 'recycling-landfill'), pg_temp.sid('source', 'cedar-recycling-audit'), 'Audit found 78 percent of material was recovered', 'The audit found 78 percent of collected material was sorted and sold, with 22 percent rejected.', 'contradicts', 'Audit covered a single year and facility.', '', 2, 'published', pg_temp.u('researcher'), true, '2024-08-03 09:00:00+00', '2024-08-03 09:00:00+00', '2024-08-04 09:00:00+00'),
  (pg_temp.sid('evidence', 'wind-noise-1'), pg_temp.sid('claim', 'wind-noise'), pg_temp.sid('source', 'harbor-wind-noise'), 'Complaint rates were low and clustered around a few sites', 'Complaints were rare overall and clustered around three sites with particular turbine models.', 'context', 'Complaints are an indirect measure of noise.', '', 1, 'published', pg_temp.u('researcher'), true, '2023-12-16 09:00:00+00', '2023-12-16 09:00:00+00', '2023-12-17 09:00:00+00'),
  (pg_temp.sid('evidence', 'renewables-blackouts-1'), pg_temp.sid('claim', 'renewables-blackouts'), pg_temp.sid('source', 'kestrel-grid-reliability'), 'No link between renewable share and outage minutes', 'Across 14 regional grids, outage minutes per customer showed no relationship with renewable share.', 'contradicts', 'Small number of grids.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-11-20 09:00:00+00', '2025-11-20 09:00:00+00', '2025-11-21 09:00:00+00'),
  (pg_temp.sid('evidence', 'renewables-blackouts-2'), pg_temp.sid('claim', 'renewables-blackouts'), pg_temp.sid('source', 'harbor-energy-outlook'), 'Evening peaks require more flexible backup', 'The institute notes that higher renewable shares raise the need for flexible capacity during evening peaks.', 'supports', 'Concerns risk, not observed outages.', 'Compared with two other sources on the same question; direction of the finding is the same.', 2, 'published', pg_temp.u('researcher'), true, '2025-11-17 09:00:00+00', '2025-11-17 09:00:00+00', '2025-11-18 09:00:00+00'),
  (pg_temp.sid('evidence', 'bee-decline-1'), pg_temp.sid('claim', 'bee-decline'), pg_temp.sid('source', 'pinecrest-bees'), 'Counts were stable across most orchards', 'Wild bee counts were stable or higher in 118 of 140 orchards compared with 2015.', 'contradicts', 'Counts cover visits, not colonies.', 'Checked the figure against the original table; it matches.', 1, 'published', pg_temp.u('researcher'), true, '2025-08-03 09:00:00+00', '2025-08-03 09:00:00+00', '2025-08-04 09:00:00+00'),
  (pg_temp.sid('evidence', 'bee-decline-2'), pg_temp.sid('claim', 'bee-decline'), pg_temp.sid('source', 'orchard-pesticide-bees'), 'Treated hives showed lower winter survival', 'Hives with measured exposure had lower winter survival in controlled conditions.', 'supports', 'Exposure levels were higher than typical field levels.', '', 2, 'published', pg_temp.u('editor'), true, '2025-08-02 09:00:00+00', '2025-08-02 09:00:00+00', '2025-08-03 09:00:00+00'),
  (pg_temp.sid('evidence', 'sea-level-harbour-1'), pg_temp.sid('claim', 'sea-level-harbour'), pg_temp.sid('source', 'tidewater-sea-level'), 'Local rise of 4.1 millimetres a year since 1990', 'The gauge shows 4.1 millimetres a year since 1990, above the global estimate of about 3.', 'supports', 'Part of the difference reflects local land subsidence.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-12-17 09:00:00+00', '2025-12-17 09:00:00+00', '2025-12-18 09:00:00+00'),
  (pg_temp.sid('evidence', 'offsets-deliver-1'), pg_temp.sid('claim', 'offsets-deliver'), pg_temp.sid('source', 'rowan-offsets'), 'Delivered reductions vary widely by project type', 'Reported delivery ranged from 20 to 95 percent of promised reductions depending on project type.', 'context', 'Consultancy sample of 40 projects.', 'The source is a summary of the underlying study. The study itself is linked in the source record.', 1, 'published', pg_temp.u('researcher'), true, '2025-04-04 09:00:00+00', '2025-04-04 09:00:00+00', '2025-04-05 09:00:00+00'),
  (pg_temp.sid('evidence', 'small-classes-1'), pg_temp.sid('claim', 'small-classes'), pg_temp.sid('source', 'greyfield-class-size'), 'Small gain in classes under 20 for the youngest pupils', 'Pupils in classes under 20 gained about two months of reading age by year three.', 'supports', 'Effect fades by year six.', 'Wording in the source is more cautious than the headline, so the summary follows the source.', 1, 'published', pg_temp.u('researcher'), true, '2024-06-28 09:00:00+00', '2024-06-28 09:00:00+00', '2024-06-29 09:00:00+00'),
  (pg_temp.sid('evidence', 'small-classes-2'), pg_temp.sid('claim', 'small-classes'), pg_temp.sid('source', 'linden-class-size-survey'), 'Teachers report benefits for behaviour more than reading', 'Most surveyed teachers named behaviour and workload, not reading scores, as the main benefit.', 'context', 'Self-selected union survey.', 'Checked the figure against the original table; it matches.', 2, 'published', pg_temp.u('researcher'), true, '2024-02-20 09:00:00+00', '2024-02-20 09:00:00+00', '2024-02-21 09:00:00+00'),
  (pg_temp.sid('evidence', 'small-classes-3'), pg_temp.sid('claim', 'small-classes'), pg_temp.sid('source', 'greyfield-class-size'), 'No difference once teacher experience was matched', 'Matching on teacher experience removed the difference in the older year groups.', 'contradicts', '', '', 3, 'published', pg_temp.u('researcher'), true, '2024-06-28 09:00:00+00', '2024-06-28 09:00:00+00', '2024-06-29 09:00:00+00'),
  (pg_temp.sid('evidence', 'homework-scores-1'), pg_temp.sid('claim', 'homework-scores'), pg_temp.sid('source', 'northfield-homework'), 'Positive link up to about 90 minutes a day', 'Scores rose with homework time up to around 90 minutes a day in lower-secondary students.', 'supports', 'Correlation; motivated students may do more homework.', '', 1, 'published', pg_temp.u('researcher'), true, '2023-06-23 09:00:00+00', '2023-06-23 09:00:00+00', '2023-06-24 09:00:00+00'),
  (pg_temp.sid('evidence', 'homework-scores-2'), pg_temp.sid('claim', 'homework-scores'), pg_temp.sid('source', 'northfield-homework'), 'No link or a negative link in primary years', 'No association appeared for primary pupils, and a weak negative one beyond two hours.', 'contradicts', '', '', 2, 'published', pg_temp.u('editor'), true, '2023-06-21 09:00:00+00', '2023-06-21 09:00:00+00', '2023-06-22 09:00:00+00'),
  (pg_temp.sid('evidence', 'homework-scores-3'), pg_temp.sid('claim', 'homework-scores'), pg_temp.sid('source', 'westbrook-homework-poll'), 'Parents report evening conflict as the main cost', 'Half of the parents polled said homework mainly caused evening conflict.', 'context', 'Opt-in online poll.', '', 3, 'published', pg_temp.u('researcher'), true, '2024-10-23 09:00:00+00', '2024-10-23 09:00:00+00', '2024-10-24 09:00:00+00'),
  (pg_temp.sid('evidence', 'phone-bans-1'), pg_temp.sid('claim', 'phone-bans'), pg_temp.sid('source', 'greyfield-phones'), 'Schools with bans saw small attendance and focus gains', 'Teachers in 31 banning schools reported better focus, and attendance rose slightly.', 'supports', 'No exam data yet; no comparison group.', 'The source is a summary of the underlying study. The study itself is linked in the source record.', 1, 'published', pg_temp.u('researcher'), true, '2025-06-01 09:00:00+00', '2025-06-01 09:00:00+00', '2025-06-02 09:00:00+00'),
  (pg_temp.sid('evidence', 'phone-bans-2'), pg_temp.sid('claim', 'phone-bans'), pg_temp.sid('source', 'halden-phone-study'), 'Access mattered less than notification frequency', 'Frequent notifications, not phone presence alone, predicted lapses in attention.', 'context', 'Laboratory setting.', '', 2, 'published', pg_temp.u('editor'), true, '2025-06-04 09:00:00+00', '2025-06-04 09:00:00+00', '2025-06-05 09:00:00+00'),
  (pg_temp.sid('evidence', 'library-reading-age-1'), pg_temp.sid('claim', 'library-reading-age'), pg_temp.sid('source', 'ashgrove-reading-gap'), 'Card holders scored higher, but families differ', 'Card holders scored about 14 months higher, but they also differed in family reading habits and income.', 'context', 'Cannot separate library effects from home background.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-04-19 09:00:00+00', '2025-04-19 09:00:00+00', '2025-04-20 09:00:00+00'),
  (pg_temp.sid('evidence', 'tutoring-works-1'), pg_temp.sid('claim', 'tutoring-works'), pg_temp.sid('source', 'northfield-tutoring'), 'Tutored pupils gained about four months of progress', 'In a randomised trial, tutored pupils made around four additional months of progress in maths.', 'supports', 'Delivered by trained tutors; costs may not scale.', '', 1, 'published', pg_temp.u('researcher'), true, '2024-11-26 09:00:00+00', '2024-11-26 09:00:00+00', '2024-11-27 09:00:00+00'),
  (pg_temp.sid('evidence', 'tutoring-works-2'), pg_temp.sid('claim', 'tutoring-works'), pg_temp.sid('source', 'greyfield-attainment'), 'Gaps remain largest in rural regions', 'Regional data show the largest gaps in rural areas where tutoring is least available.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-09-07 09:00:00+00', '2025-09-07 09:00:00+00', '2025-09-08 09:00:00+00'),
  (pg_temp.sid('evidence', 'teacher-pay-retention-1'), pg_temp.sid('claim', 'teacher-pay-retention'), pg_temp.sid('source', 'linden-teacher-pay'), 'Retention improved after pay band changes', 'Five-year retention rose seven points after the revised pay bands were introduced.', 'supports', 'Published by a party with an interest in the claim.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-09-15 09:00:00+00', '2025-09-15 09:00:00+00', '2025-09-16 09:00:00+00'),
  (pg_temp.sid('evidence', 'teacher-pay-retention-2'), pg_temp.sid('claim', 'teacher-pay-retention'), pg_temp.sid('source', 'greyfield-attainment'), 'Workload cited alongside pay in exit interviews', 'Exit interviews name workload and pay about equally.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-09-16 09:00:00+00', '2025-09-16 09:00:00+00', '2025-09-17 09:00:00+00'),
  (pg_temp.sid('evidence', 'learning-styles-1'), pg_temp.sid('claim', 'learning-styles'), pg_temp.sid('source', 'orchard-learning-styles'), 'Reviews found no benefit from style matching', 'Controlled studies did not find better results when instruction matched a pupil’s preferred style.', 'contradicts', 'Archived: superseded by a broader claim on personalised instruction.', '', 1, 'published', pg_temp.u('researcher'), true, '2022-06-07 09:00:00+00', '2022-06-07 09:00:00+00', '2022-06-08 09:00:00+00'),
  (pg_temp.sid('evidence', 'open-textbooks-1'), pg_temp.sid('claim', 'open-textbooks'), pg_temp.sid('source', 'foxglove-open-textbooks'), 'Average spend fell from 112 to 38 per course', 'Students in adopting courses reported spending about two thirds less on materials.', 'supports', 'Self-reported spend.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-02-27 09:00:00+00', '2025-02-27 09:00:00+00', '2025-02-28 09:00:00+00'),
  (pg_temp.sid('evidence', 'cloud-uptime-1'), pg_temp.sid('claim', 'cloud-uptime'), pg_temp.sid('source', 'nimbus-uptime'), 'Provider reports 99.99 percent measured availability', 'The report states availability of 99.991 percent measured across all regions.', 'supports', 'Self-reported and excludes planned maintenance.', '', 1, 'published', pg_temp.u('researcher'), true, '2026-02-07 09:00:00+00', '2026-02-07 09:00:00+00', '2026-02-08 09:00:00+00'),
  (pg_temp.sid('evidence', 'cloud-uptime-2'), pg_temp.sid('claim', 'cloud-uptime'), pg_temp.sid('source', 'foxglove-outage-log'), 'Public incident log shows three multi-hour regional outages', 'Three regional incidents of more than four hours each appear in the public log.', 'contradicts', 'Log covers reported incidents only.', '', 2, 'published', pg_temp.u('researcher'), true, '2026-02-09 09:00:00+00', '2026-02-09 09:00:00+00', '2026-02-10 09:00:00+00'),
  (pg_temp.sid('evidence', 'phone-battery-ten-years-1'), pg_temp.sid('claim', 'phone-battery-ten-years'), pg_temp.sid('source', 'corvid-battery-claim'), 'Company reports 80 percent capacity after simulated ten years', 'The company states that accelerated testing predicts 80 percent capacity after ten years.', 'supports', 'Accelerated testing, not real use; no independent data.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-09-25 09:00:00+00', '2025-09-25 09:00:00+00', '2025-09-26 09:00:00+00'),
  (pg_temp.sid('evidence', 'phone-battery-ten-years-2'), pg_temp.sid('claim', 'phone-battery-ten-years'), pg_temp.sid('source', 'halden-battery-degradation'), 'Consumer cells typically reach 80 percent within three to five years', 'Typical consumer cells in the study reached 80 percent capacity after 800 to 1,200 cycles.', 'context', 'Tested earlier cell designs.', '', 2, 'published', pg_temp.u('editor'), true, '2025-09-25 09:00:00+00', '2025-09-25 09:00:00+00', '2025-09-26 09:00:00+00'),
  (pg_temp.sid('evidence', 'password-managers-1'), pg_temp.sid('claim', 'password-managers'), pg_temp.sid('source', 'quillfeather-passwords'), 'Account takeover rate was less than half among users', 'Account takeover rates were about 55 percent lower among password manager users.', 'supports', 'Users may be more security-conscious in other ways.', 'Checked the figure against the original table; it matches.', 1, 'published', pg_temp.u('researcher'), true, '2025-05-04 09:00:00+00', '2025-05-04 09:00:00+00', '2025-05-05 09:00:00+00'),
  (pg_temp.sid('evidence', '5g-health-1'), pg_temp.sid('claim', '5g-health'), pg_temp.sid('source', 'halden-5g-health'), 'Measured exposure was far below guideline limits', 'Measured exposure near masts was under one percent of international guideline limits.', 'contradicts', 'Spot measurements, not continuous.', '', 1, 'published', pg_temp.u('researcher'), true, '2023-03-28 09:00:00+00', '2023-03-28 09:00:00+00', '2023-03-29 09:00:00+00'),
  (pg_temp.sid('evidence', '5g-health-2'), pg_temp.sid('claim', '5g-health'), pg_temp.sid('source', 'bellmont-5g-review'), 'No consistent evidence of harm in reviewed studies', 'The review found no consistent evidence of health effects at exposures below guideline limits.', 'contradicts', 'Long-term data on newer frequencies remain limited.', '', 2, 'published', pg_temp.u('researcher'), true, '2023-07-13 09:00:00+00', '2023-07-13 09:00:00+00', '2023-07-14 09:00:00+00'),
  (pg_temp.sid('evidence', 'ai-jobs-1'), pg_temp.sid('claim', 'ai-jobs'), pg_temp.sid('source', 'rowan-ai-jobs'), 'A quarter of occupations have high automation exposure', 'The report classes 26 percent of regional roles as highly exposed to automation.', 'supports', 'Exposure is not the same as job loss.', 'The sample is described in an appendix that is not part of the public version.', 1, 'published', pg_temp.u('researcher'), true, '2025-06-28 09:00:00+00', '2025-06-28 09:00:00+00', '2025-06-29 09:00:00+00'),
  (pg_temp.sid('evidence', 'ai-jobs-2'), pg_temp.sid('claim', 'ai-jobs'), pg_temp.sid('source', 'lakeside-labour-stats'), 'Occupations changed slowly in past automation waves', 'Occupation tables show shifts of about one point a year in previous decades.', 'context', 'Past change may not predict the next wave.', '', 2, 'published', pg_temp.u('researcher'), true, '2025-12-09 09:00:00+00', '2025-12-09 09:00:00+00', '2025-12-10 09:00:00+00'),
  (pg_temp.sid('evidence', 'deepfake-detection-1'), pg_temp.sid('claim', 'deepfake-detection'), pg_temp.sid('source', 'ledger-ai-detection'), 'Reporter’s test found viewers at chance level', 'A newsroom test of 60 viewers found accuracy close to chance on high-quality clips.', 'supports', 'Informal test with no controls.', 'Checked the figure against the original table; it matches.', 1, 'published', pg_temp.u('researcher'), true, '2025-03-11 09:00:00+00', '2025-03-11 09:00:00+00', '2025-03-12 09:00:00+00'),
  (pg_temp.sid('evidence', 'deepfake-detection-2'), pg_temp.sid('claim', 'deepfake-detection'), pg_temp.sid('source', 'quillfeather-deepfakes'), 'Viewers identified synthetic clips 71 percent of the time', 'In a controlled study, participants identified synthetic clips correctly 71 percent of the time.', 'contradicts', 'Clips used older generation tools.', 'Wording in the source is more cautious than the headline, so the summary follows the source.', 2, 'published', pg_temp.u('researcher'), true, '2025-03-11 09:00:00+00', '2025-03-11 09:00:00+00', '2025-03-12 09:00:00+00'),
  (pg_temp.sid('evidence', 'ev-chargers-enough-1'), pg_temp.sid('claim', 'ev-chargers-enough'), pg_temp.sid('source', 'nimbus-ev-chargers'), 'Provider reports average wait under four minutes', 'The report states an average wait of under four minutes at its sites.', 'supports', 'Covers the provider’s own sites only.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-12-30 09:00:00+00', '2025-12-30 09:00:00+00', '2025-12-31 09:00:00+00'),
  (pg_temp.sid('evidence', 'ev-chargers-enough-2'), pg_temp.sid('claim', 'ev-chargers-enough'), pg_temp.sid('source', 'aldermoor-charger-map'), 'Chargers are concentrated in three districts', 'Two thirds of public charging points sit in three of eleven districts.', 'context', '', 'Compared with two other sources on the same question; direction of the finding is the same.', 2, 'published', pg_temp.u('researcher'), true, '2026-02-19 09:00:00+00', '2026-02-19 09:00:00+00', '2026-02-20 09:00:00+00'),
  (pg_temp.sid('evidence', 'satellite-broadband-1'), pg_temp.sid('claim', 'satellite-broadband'), pg_temp.sid('source', 'summit-satellite-internet'), 'Median latency was 38 milliseconds versus 9 for fibre', 'Measured round-trip latency averaged 38 milliseconds, against about 9 on fibre connections.', 'contradicts', 'Measurements from a single ground station.', 'Compared with two other sources on the same question; direction of the finding is the same.', 1, 'published', pg_temp.u('researcher'), true, '2025-08-21 09:00:00+00', '2025-08-21 09:00:00+00', '2025-08-22 09:00:00+00'),
  (pg_temp.sid('evidence', 'satellite-broadband-2'), pg_temp.sid('claim', 'satellite-broadband'), pg_temp.sid('source', 'lakeside-broadband-speeds'), 'Satellite fills gaps where fibre does not reach', 'Rural districts lacking fibre show the highest satellite adoption.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-11-09 09:00:00+00', '2025-11-09 09:00:00+00', '2025-11-10 09:00:00+00'),
  (pg_temp.sid('evidence', 'ocr-accuracy-1'), pg_temp.sid('claim', 'ocr-accuracy'), pg_temp.sid('source', 'corvid-ocr-benchmark'), 'Matches humans on clean text, not on cursive or damaged pages', 'The benchmark found parity on neat print and a 15-point gap on cursive and damaged pages.', 'context', 'Benchmark set favours modern documents.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-06-13 09:00:00+00', '2025-06-13 09:00:00+00', '2025-06-14 09:00:00+00'),
  (pg_temp.sid('evidence', 'open-source-secure-1'), pg_temp.sid('claim', 'open-source-secure'), pg_temp.sid('source', 'orchard-open-source-security'), 'Security depends on maintenance, not licence', 'Vulnerability exposure tracked maintenance activity rather than licence type.', 'context', 'Archived: restated as a narrower claim on maintenance.', 'Read the methods section; the limitation below is the authors’ own.', 1, 'published', pg_temp.u('researcher'), true, '2024-07-12 09:00:00+00', '2024-07-12 09:00:00+00', '2024-07-13 09:00:00+00'),
  (pg_temp.sid('evidence', 'youth-unemployment-1'), pg_temp.sid('claim', 'youth-unemployment'), pg_temp.sid('source', 'lakeside-youth-employment'), 'Rate is below the peak of 2012 and the 2020 spike', 'The current rate of 11.2 percent is lower than the 2012 peak and below the 2020 spike.', 'contradicts', 'Definition of youth changed in 2018.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-12-24 09:00:00+00', '2025-12-24 09:00:00+00', '2025-12-25 09:00:00+00'),
  (pg_temp.sid('evidence', 'youth-unemployment-2'), pg_temp.sid('claim', 'youth-unemployment'), pg_temp.sid('source', 'open-policy-youth'), 'Programmes with employer links perform best', 'Placement-based programmes show larger effects than classroom-only training.', 'context', '', '', 2, 'published', pg_temp.u('editor'), true, '2025-12-26 09:00:00+00', '2025-12-26 09:00:00+00', '2025-12-27 09:00:00+00'),
  (pg_temp.sid('evidence', 'loneliness-epidemic-1'), pg_temp.sid('claim', 'loneliness-epidemic'), pg_temp.sid('source', 'westbrook-loneliness'), 'Share reporting frequent loneliness rose from 7 to 12 percent', 'The survey shows a rise from 7 percent in 2015 to 12 percent in 2025.', 'supports', 'Survey wording changed in 2019.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-03-19 09:00:00+00', '2025-03-19 09:00:00+00', '2025-03-20 09:00:00+00'),
  (pg_temp.sid('evidence', 'loneliness-epidemic-2'), pg_temp.sid('claim', 'loneliness-epidemic'), pg_temp.sid('source', 'meridian-loneliness'), 'Long-term panel shows no sustained rise', 'A panel following the same people found no sustained rise once ageing was accounted for.', 'contradicts', 'Panel members were older than the general population.', '', 2, 'published', pg_temp.u('researcher'), true, '2025-03-19 09:00:00+00', '2025-03-19 09:00:00+00', '2025-03-20 09:00:00+00'),
  (pg_temp.sid('evidence', 'housing-first-1'), pg_temp.sid('claim', 'housing-first'), pg_temp.sid('source', 'open-policy-housing'), 'Three-year housing retention of 84 percent', 'Most participants remained housed after three years, and rough sleeping among them dropped sharply.', 'supports', 'Selected participants; no control group.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-10-02 09:00:00+00', '2025-10-02 09:00:00+00', '2025-10-03 09:00:00+00'),
  (pg_temp.sid('evidence', 'housing-first-2'), pg_temp.sid('claim', 'housing-first'), pg_temp.sid('source', 'lakeside-homelessness'), 'Overall counts also depend on rent levels', 'City-wide counts moved with rents as much as with programme capacity.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2026-02-06 09:00:00+00', '2026-02-06 09:00:00+00', '2026-02-07 09:00:00+00'),
  (pg_temp.sid('evidence', 'volunteering-decline-1'), pg_temp.sid('claim', 'volunteering-decline'), pg_temp.sid('source', 'northfield-volunteering'), 'Regular formal volunteering fell by a fifth', 'Regular volunteering with organisations fell by about a fifth compared with 2019.', 'supports', 'Informal helping is not captured.', '', 1, 'published', pg_temp.u('researcher'), true, '2024-01-29 09:00:00+00', '2024-01-29 09:00:00+00', '2024-01-30 09:00:00+00'),
  (pg_temp.sid('evidence', 'volunteering-decline-2'), pg_temp.sid('claim', 'volunteering-decline'), pg_temp.sid('source', 'northfield-volunteering'), 'Informal helping increased', 'Informal helping, such as neighbours supporting each other, increased over the same period.', 'contradicts', '', '', 2, 'published', pg_temp.u('researcher'), true, '2024-01-28 09:00:00+00', '2024-01-28 09:00:00+00', '2024-01-29 09:00:00+00'),
  (pg_temp.sid('evidence', 'charity-overhead-1'), pg_temp.sid('claim', 'charity-overhead'), pg_temp.sid('source', 'ravenscar-charity-audit'), 'Median overhead share was 14 percent', 'Across 420 audited charities, the median overhead share was 14 percent and 6 percent spent more than half.', 'contradicts', 'Overhead definitions vary between charities.', '', 1, 'published', pg_temp.u('editor'), true, '2024-10-19 09:00:00+00', '2024-10-19 09:00:00+00', '2024-10-20 09:00:00+00'),
  (pg_temp.sid('evidence', 'crime-eastgate-1'), pg_temp.sid('claim', 'crime-eastgate'), pg_temp.sid('source', 'ledger-crime-headline'), 'Residents report feeling less safe', 'The article quotes residents describing more thefts and feeling less safe.', 'supports', 'Anecdotal; no figures.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-07-13 09:00:00+00', '2025-07-13 09:00:00+00', '2025-07-14 09:00:00+00'),
  (pg_temp.sid('evidence', 'crime-eastgate-2'), pg_temp.sid('claim', 'crime-eastgate'), pg_temp.sid('source', 'lakeside-crime-stats'), 'Recorded crime was flat year on year', 'Recorded crime in Eastgate changed by under two percent year on year.', 'contradicts', 'Not all crime is reported.', 'Read the methods section; the limitation below is the authors’ own.', 2, 'published', pg_temp.u('researcher'), true, '2025-10-11 09:00:00+00', '2025-10-11 09:00:00+00', '2025-10-12 09:00:00+00'),
  (pg_temp.sid('evidence', 'remote-work-productivity-1'), pg_temp.sid('claim', 'remote-work-productivity'), pg_temp.sid('source', 'meridian-remote-work'), 'Output was unchanged for hybrid arrangements', 'Panel data show unchanged output for hybrid workers and a small gain for fully remote roles.', 'contradicts', 'Mostly office-based knowledge work.', '', 1, 'published', pg_temp.u('editor'), true, '2025-02-02 09:00:00+00', '2025-02-02 09:00:00+00', '2025-02-03 09:00:00+00'),
  (pg_temp.sid('evidence', 'remote-work-productivity-2'), pg_temp.sid('claim', 'remote-work-productivity'), pg_temp.sid('source', 'rowan-remote-work'), 'Managers report weaker mentoring and collaboration', 'Managers reported weaker mentoring and slower onboarding for fully remote teams.', 'supports', 'Perceptions of managers, not measured output.', '', 2, 'published', pg_temp.u('researcher'), true, '2025-02-03 09:00:00+00', '2025-02-03 09:00:00+00', '2025-02-04 09:00:00+00'),
  (pg_temp.sid('evidence', 'gender-pay-gap-1'), pg_temp.sid('claim', 'gender-pay-gap'), pg_temp.sid('source', 'summit-gender-pay'), 'Adjusted gap shrank from 14 to 5 percent', 'Controlling for occupation and hours reduced the gap from 14 to about 5 percent.', 'supports', 'Does not explain why occupations differ.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-03-23 09:00:00+00', '2025-03-23 09:00:00+00', '2025-03-24 09:00:00+00'),
  (pg_temp.sid('evidence', 'gender-pay-gap-2'), pg_temp.sid('claim', 'gender-pay-gap'), pg_temp.sid('source', 'lakeside-pay-gap'), 'A gap persists within the same sector and grade', 'Within the same sector and grade, median hourly pay still differs by about 4 percent.', 'contradicts', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-11-25 09:00:00+00', '2025-11-25 09:00:00+00', '2025-11-26 09:00:00+00'),
  (pg_temp.sid('evidence', 'library-closures-1'), pg_temp.sid('claim', 'library-closures'), pg_temp.sid('source', 'ashgrove-library-use'), 'Visits recovered to 94 percent of 2019 levels', 'Visits recovered to 94 percent of pre-pandemic levels, and digital borrowing doubled.', 'contradicts', 'Counts include event attendance.', 'The sample is described in an appendix that is not part of the public version.', 1, 'published', pg_temp.u('researcher'), true, '2025-07-05 09:00:00+00', '2025-07-05 09:00:00+00', '2025-07-06 09:00:00+00'),
  (pg_temp.sid('evidence', 'teen-screen-time-1'), pg_temp.sid('claim', 'teen-screen-time'), pg_temp.sid('source', 'northfield-screen-time-teens'), 'Screen time explained under one percent of variation', 'Daily screen time explained under one percent of the variation in wellbeing scores.', 'contradicts', 'Cannot separate kinds of use.', '', 1, 'published', pg_temp.u('researcher'), true, '2024-03-12 09:00:00+00', '2024-03-12 09:00:00+00', '2024-03-13 09:00:00+00'),
  (pg_temp.sid('evidence', 'teen-screen-time-2'), pg_temp.sid('claim', 'teen-screen-time'), pg_temp.sid('source', 'meridian-loneliness'), 'Social contact predicted wellbeing more strongly', 'Quality of social contact was a stronger predictor than device use.', 'context', '', 'The source is a summary of the underlying study. The study itself is linked in the source record.', 2, 'published', pg_temp.u('researcher'), true, '2024-04-15 09:00:00+00', '2024-04-15 09:00:00+00', '2024-04-16 09:00:00+00'),
  (pg_temp.sid('evidence', 'bus-lanes-1'), pg_temp.sid('claim', 'bus-lanes'), pg_temp.sid('source', 'bta-journey-times'), 'Journey-time study found 12 percent shorter bus journeys', 'Bus journey times on the pilot corridors fell by an average of 12 percent.', 'supports', 'Covers bus passengers only, not all commuters.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-09-28 09:00:00+00', '2025-09-28 09:00:00+00', '2025-09-29 09:00:00+00'),
  (pg_temp.sid('evidence', 'bus-lanes-2'), pg_temp.sid('claim', 'bus-lanes'), pg_temp.sid('source', 'eastgate-rider-survey'), 'Riders say their commute is faster and more predictable', 'Most surveyed riders said their commute felt shorter and more reliable.', 'supports', 'Self-selected survey.', '', 2, 'published', pg_temp.u('editor'), true, '2025-10-13 09:00:00+00', '2025-10-13 09:00:00+00', '2025-10-14 09:00:00+00'),
  (pg_temp.sid('evidence', 'bus-lanes-3'), pg_temp.sid('claim', 'bus-lanes'), pg_temp.sid('source', 'bw-council-pilot'), 'Pilot ran during roadworks elsewhere', 'The pilot coincided with roadworks on parallel routes, which changed traffic patterns.', 'context', '', '', 3, 'published', pg_temp.u('researcher'), true, '2025-10-01 09:00:00+00', '2025-10-01 09:00:00+00', '2025-10-02 09:00:00+00'),
  (pg_temp.sid('evidence', 'bus-lanes-4'), pg_temp.sid('claim', 'bus-lanes'), pg_temp.sid('source', 'northfield-traffic-counts'), 'Car journey times rose on the same corridors', 'Independent counts show car journey times rose by about 6 percent on the pilot corridors.', 'contradicts', 'Counts taken over four weeks in autumn.', '', 4, 'published', pg_temp.u('editor'), true, '2025-11-18 09:00:00+00', '2025-11-18 09:00:00+00', '2025-11-19 09:00:00+00'),
  (pg_temp.sid('evidence', 'congestion-charge-1'), pg_temp.sid('claim', 'congestion-charge'), pg_temp.sid('source', 'aldermoor-congestion'), 'Vehicle entries fell by 17 percent', 'Vehicle entries to the charging zone fell by 17 percent over three years.', 'supports', 'Some traffic moved to the edge of the zone.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-02-26 09:00:00+00', '2025-02-26 09:00:00+00', '2025-02-27 09:00:00+00'),
  (pg_temp.sid('evidence', 'congestion-charge-2'), pg_temp.sid('claim', 'congestion-charge'), pg_temp.sid('source', 'lakeside-air-quality'), 'Roadside nitrogen dioxide fell by 11 percent', 'Roadside nitrogen dioxide readings in the zone fell by 11 percent.', 'supports', 'Weather and fleet renewal also contribute.', 'The sample is described in an appendix that is not part of the public version.', 2, 'published', pg_temp.u('researcher'), true, '2025-05-08 09:00:00+00', '2025-05-08 09:00:00+00', '2025-05-09 09:00:00+00'),
  (pg_temp.sid('evidence', 'sugar-tax-1'), pg_temp.sid('claim', 'sugar-tax'), pg_temp.sid('source', 'northfield-sugar-tax'), 'Purchases of taxed drinks fell by 10 percent', 'Household purchases of taxed drinks fell by about 10 percent.', 'supports', 'Households may have substituted other sugary products.', 'The sample is described in an appendix that is not part of the public version.', 1, 'published', pg_temp.u('researcher'), true, '2024-07-30 09:00:00+00', '2024-07-30 09:00:00+00', '2024-07-31 09:00:00+00'),
  (pg_temp.sid('evidence', 'sugar-tax-2'), pg_temp.sid('claim', 'sugar-tax'), pg_temp.sid('source', 'marlow-sugar-industry'), 'Reformulation, not the levy, explains most of the drop', 'Industry data attribute most of the fall in sugar content to reformulation that began earlier.', 'contradicts', 'Industry-funded analysis.', '', 2, 'published', pg_temp.u('researcher'), true, '2024-09-01 09:00:00+00', '2024-09-01 09:00:00+00', '2024-09-02 09:00:00+00'),
  (pg_temp.sid('evidence', 'minimum-wage-jobs-1'), pg_temp.sid('claim', 'minimum-wage-jobs'), pg_temp.sid('source', 'lakeside-min-wage'), 'No measurable change in employment', 'Employment in affected sectors did not change measurably after the increase.', 'contradicts', 'Short follow-up of 18 months.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-03-14 09:00:00+00', '2025-03-14 09:00:00+00', '2025-03-15 09:00:00+00'),
  (pg_temp.sid('evidence', 'minimum-wage-jobs-2'), pg_temp.sid('claim', 'minimum-wage-jobs'), pg_temp.sid('source', 'open-policy-min-wage'), 'Small reductions in hours in low-margin sectors', 'Some studies find small reductions in weekly hours in low-margin sectors.', 'supports', 'Effects vary widely by study.', '', 2, 'published', pg_temp.u('researcher'), true, '2025-04-10 09:00:00+00', '2025-04-10 09:00:00+00', '2025-04-11 09:00:00+00'),
  (pg_temp.sid('evidence', 'four-day-week-1'), pg_temp.sid('claim', 'four-day-week'), pg_temp.sid('source', 'open-policy-four-day'), 'Output unchanged for most participating firms', 'Most firms reported unchanged or higher output.', 'supports', 'Volunteer firms; short trial.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-08-31 09:00:00+00', '2025-08-31 09:00:00+00', '2025-09-01 09:00:00+00'),
  (pg_temp.sid('evidence', 'four-day-week-2'), pg_temp.sid('claim', 'four-day-week'), pg_temp.sid('source', 'rowan-four-day'), 'Employers cite scheduling and customer coverage challenges', 'Employers named customer coverage as the hardest challenge.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-09-14 09:00:00+00', '2025-09-14 09:00:00+00', '2025-09-15 09:00:00+00'),
  (pg_temp.sid('evidence', 'rent-control-1'), pg_temp.sid('claim', 'rent-control'), pg_temp.sid('source', 'ravenscar-rent-cap'), 'Rent growth slowed for covered homes', 'Covered homes saw slower rent growth than comparable uncovered homes.', 'supports', 'Short window.', '', 1, 'published', pg_temp.u('editor'), true, '2026-01-07 09:00:00+00', '2026-01-07 09:00:00+00', '2026-01-08 09:00:00+00'),
  (pg_temp.sid('evidence', 'rent-control-2'), pg_temp.sid('claim', 'rent-control'), pg_temp.sid('source', 'northfield-rent-study'), 'Longer studies find reduced rental supply', 'Studies of older schemes found falling rental supply as landlords sold or converted homes.', 'contradicts', 'Older schemes differ in design.', '', 2, 'published', pg_temp.u('researcher'), true, '2026-01-08 09:00:00+00', '2026-01-08 09:00:00+00', '2026-01-09 09:00:00+00'),
  (pg_temp.sid('evidence', 'free-transit-1'), pg_temp.sid('claim', 'free-transit'), pg_temp.sid('source', 'aldermoor-free-transit'), 'Ridership rose 38 percent during the trial', 'Counts showed a 38 percent rise during the trial, below the doubling claimed.', 'context', 'Trial lasted six months and covered two routes.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-06-20 09:00:00+00', '2025-06-20 09:00:00+00', '2025-06-21 09:00:00+00'),
  (pg_temp.sid('evidence', 'speed-cameras-1'), pg_temp.sid('claim', 'speed-cameras'), pg_temp.sid('source', 'aldermoor-speed-cameras'), 'Collisions fell by 23 percent at camera sites', 'Collisions fell by 23 percent in the three years after installation.', 'supports', 'Sites were chosen after clusters of collisions.', '', 1, 'published', pg_temp.u('researcher'), true, '2024-05-27 09:00:00+00', '2024-05-27 09:00:00+00', '2024-05-28 09:00:00+00'),
  (pg_temp.sid('evidence', 'speed-cameras-2'), pg_temp.sid('claim', 'speed-cameras'), pg_temp.sid('source', 'foxglove-speed-regression'), 'Much of the fall is regression to the mean', 'Adjusting for regression to the mean roughly halves the estimated effect.', 'contradicts', 'General method, not specific to these sites.', '', 2, 'published', pg_temp.u('editor'), true, '2024-05-26 09:00:00+00', '2024-05-26 09:00:00+00', '2024-05-27 09:00:00+00'),
  (pg_temp.sid('evidence', 'basic-income-1'), pg_temp.sid('claim', 'basic-income'), pg_temp.sid('source', 'open-policy-ubi'), 'Interim results show higher wellbeing and unchanged work', 'Interim results show higher wellbeing scores and no change in hours worked.', 'supports', 'Interim, small pilot, no final report yet.', '', 1, 'published', pg_temp.u('researcher'), true, '2026-03-03 09:00:00+00', '2026-03-03 09:00:00+00', '2026-03-04 09:00:00+00'),
  (pg_temp.sid('evidence', 'bag-charge-1'), pg_temp.sid('claim', 'bag-charge'), pg_temp.sid('source', 'lakeside-bag-charge'), 'Bags sold fell by 82 percent', 'Retail data show bag sales falling by 82 percent after the charge.', 'supports', 'Counts bags sold, not litter.', '', 1, 'published', pg_temp.u('researcher'), true, '2023-12-06 09:00:00+00', '2023-12-06 09:00:00+00', '2023-12-07 09:00:00+00'),
  (pg_temp.sid('evidence', 'bag-charge-2'), pg_temp.sid('claim', 'bag-charge'), pg_temp.sid('source', 'pinecrest-bag-litter'), 'Bags on surveyed shorelines halved', 'Shoreline surveys found the number of bags more than halved.', 'supports', 'Surveys cover 12 beaches.', '', 2, 'published', pg_temp.u('researcher'), true, '2024-04-27 09:00:00+00', '2024-04-27 09:00:00+00', '2024-04-28 09:00:00+00'),
  (pg_temp.sid('evidence', 'free-wifi-network-1'), pg_temp.sid('claim', 'free-wifi-network'), pg_temp.sid('source', 'ledger-wifi'), 'The network was switched off without announcement', 'The paper reports the network was switched off with little notice.', 'context', 'Archived: the programme has ended.', '', 1, 'published', pg_temp.u('editor'), true, '2022-09-15 09:00:00+00', '2022-09-15 09:00:00+00', '2022-09-16 09:00:00+00'),
  (pg_temp.sid('evidence', 'free-wifi-network-2'), pg_temp.sid('claim', 'free-wifi-network'), pg_temp.sid('source', 'ravenscar-wifi-audit'), 'Median daily use was under three sessions per access point', 'The audit found median use of under three sessions per access point per day.', 'contradicts', '', '', 2, 'published', pg_temp.u('researcher'), true, '2022-11-28 09:00:00+00', '2022-11-28 09:00:00+00', '2022-11-29 09:00:00+00'),
  (pg_temp.sid('evidence', 'tax-cuts-revenue-1'), pg_temp.sid('claim', 'tax-cuts-revenue'), pg_temp.sid('source', 'open-policy-tax-cut'), 'Revenue recovered only a fraction of the cost', 'Across reviewed cases, revenue recovered 10 to 35 percent of the cost of cuts.', 'contradicts', 'Archived: superseded by a claim on corporate tax specifically.', '', 1, 'published', pg_temp.u('researcher'), true, '2023-02-27 09:00:00+00', '2023-02-27 09:00:00+00', '2023-02-28 09:00:00+00'),
  (pg_temp.sid('evidence', 'transporte-estudiantes-1'), pg_temp.sid('claim', 'transporte-estudiantes'), pg_temp.sid('source', 'es-transporte-estudiantes'), 'Los usuarios del pase faltaron menos', 'Los estudiantes con pase faltaron un 6 % menos que el curso anterior.', 'supports', 'No hay grupo de comparación.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-08-09 09:00:00+00', '2025-08-09 09:00:00+00', '2025-08-10 09:00:00+00'),
  (pg_temp.sid('evidence', 'transporte-estudiantes-2'), pg_temp.sid('claim', 'transporte-estudiantes'), pg_temp.sid('source', 'es-asistencia-escolar'), 'La asistencia también subió en distritos sin el programa', 'La asistencia mejoró en distritos sin pase, de modo que parte del cambio no se debe al programa.', 'context', '', '', 2, 'published', pg_temp.u('researcher'), true, '2025-09-21 09:00:00+00', '2025-09-21 09:00:00+00', '2025-09-22 09:00:00+00'),
  (pg_temp.sid('evidence', 'radwege-innenstadt-1'), pg_temp.sid('claim', 'radwege-innenstadt'), pg_temp.sid('source', 'de-radwege-studie'), 'Zählstellen verzeichnen weniger Autos auf umgebauten Straßen', 'An den Zählstellen sank der Autoverkehr auf umgebauten Straßen um 9 %, der Radverkehr stieg um ein Drittel.', 'supports', 'Ein Teil des Verkehrs wich auf Nebenstraßen aus.', '', 1, 'published', pg_temp.u('researcher'), true, '2025-05-24 09:00:00+00', '2025-05-24 09:00:00+00', '2025-05-25 09:00:00+00'),
  (pg_temp.sid('evidence', 'radwege-innenstadt-2'), pg_temp.sid('claim', 'radwege-innenstadt'), pg_temp.sid('source', 'de-handel-umsatz'), 'Einzelhandelsumsätze blieben stabil', 'Die Umsätze der angrenzenden Geschäfte blieben nach dem Umbau stabil.', 'context', 'Befragung des Handelsverbands.', 'The source is a summary of the underlying study. The study itself is linked in the source record.', 2, 'published', pg_temp.u('researcher'), true, '2025-07-05 09:00:00+00', '2025-07-05 09:00:00+00', '2025-07-06 09:00:00+00'),
  (pg_temp.sid('evidence', 'hafte-kari-kutah-1'), pg_temp.sid('claim', 'hafte-kari-kutah'), pg_temp.sid('source', 'fa-work-week'), 'بهره‌وری در شرکت‌های آزمایشی ثابت ماند', 'بیشتر شرکت‌های شرکت‌کننده خروجی ثابت یا بالاتر را گزارش کردند.', 'supports', 'شرکت‌ها داوطلبانه شرکت کرده بودند.', '', 1, 'published', pg_temp.u('editor'), true, '2025-04-27 09:00:00+00', '2025-04-27 09:00:00+00', '2025-04-28 09:00:00+00'),
  (pg_temp.sid('evidence', 'hafte-kari-kutah-2'), pg_temp.sid('claim', 'hafte-kari-kutah'), pg_temp.sid('source', 'fa-work-survey'), 'بخشی از کارکنان از فشار کاری بیشتر در روزهای باقی‌مانده خبر دادند', 'حدود یک‌سوم کارکنان گفتند حجم کار در چهار روز بیشتر شده است.', 'contradicts', 'پیمایش نمونه‌ی کوچکی داشت.', '', 2, 'published', pg_temp.u('researcher'), true, '2025-06-15 09:00:00+00', '2025-06-15 09:00:00+00', '2025-06-16 09:00:00+00');

-- ------------------------------------------------------------ assessments
create temp table assess_base (type text, criterion text, status text) on commit drop;
insert into assess_base values
  ('journal_article', 'author_transparency', 'verified'),
  ('journal_article', 'publisher_transparency', 'verified'),
  ('journal_article', 'citations_present', 'verified'),
  ('journal_article', 'publication_date', 'verified'),
  ('journal_article', 'data_collection_method', 'verified'),
  ('journal_article', 'independent_verifiability', 'partially_verified'),
  ('journal_article', 'conflict_of_interest', 'partially_verified'),
  ('journal_article', 'corrections_history', 'partially_verified'),
  ('report', 'author_transparency', 'partially_verified'),
  ('report', 'publisher_transparency', 'verified'),
  ('report', 'citations_present', 'verified'),
  ('report', 'publication_date', 'verified'),
  ('report', 'data_collection_method', 'partially_verified'),
  ('report', 'independent_verifiability', 'partially_verified'),
  ('report', 'conflict_of_interest', 'partially_verified'),
  ('report', 'corrections_history', 'not_verified'),
  ('dataset', 'author_transparency', 'partially_verified'),
  ('dataset', 'publisher_transparency', 'verified'),
  ('dataset', 'citations_present', 'not_applicable'),
  ('dataset', 'publication_date', 'verified'),
  ('dataset', 'data_collection_method', 'verified'),
  ('dataset', 'independent_verifiability', 'verified'),
  ('dataset', 'conflict_of_interest', 'partially_verified'),
  ('dataset', 'corrections_history', 'not_verified'),
  ('news_article', 'author_transparency', 'verified'),
  ('news_article', 'publisher_transparency', 'verified'),
  ('news_article', 'citations_present', 'partially_verified'),
  ('news_article', 'publication_date', 'verified'),
  ('news_article', 'data_collection_method', 'not_applicable'),
  ('news_article', 'independent_verifiability', 'partially_verified'),
  ('news_article', 'conflict_of_interest', 'partially_verified'),
  ('news_article', 'corrections_history', 'verified'),
  ('government_document', 'author_transparency', 'not_applicable'),
  ('government_document', 'publisher_transparency', 'verified'),
  ('government_document', 'citations_present', 'partially_verified'),
  ('government_document', 'publication_date', 'verified'),
  ('government_document', 'data_collection_method', 'verified'),
  ('government_document', 'independent_verifiability', 'partially_verified'),
  ('government_document', 'conflict_of_interest', 'verified'),
  ('government_document', 'corrections_history', 'not_verified'),
  ('press_release', 'author_transparency', 'not_verified'),
  ('press_release', 'publisher_transparency', 'verified'),
  ('press_release', 'citations_present', 'not_verified'),
  ('press_release', 'publication_date', 'verified'),
  ('press_release', 'data_collection_method', 'not_verified'),
  ('press_release', 'independent_verifiability', 'not_verified'),
  ('press_release', 'conflict_of_interest', 'not_verified'),
  ('press_release', 'corrections_history', 'not_verified'),
  ('book', 'author_transparency', 'verified'),
  ('book', 'publisher_transparency', 'verified'),
  ('book', 'citations_present', 'verified'),
  ('book', 'publication_date', 'verified'),
  ('book', 'data_collection_method', 'partially_verified'),
  ('book', 'independent_verifiability', 'partially_verified'),
  ('book', 'conflict_of_interest', 'partially_verified'),
  ('book', 'corrections_history', 'not_verified'),
  ('website', 'author_transparency', 'not_verified'),
  ('website', 'publisher_transparency', 'partially_verified'),
  ('website', 'citations_present', 'partially_verified'),
  ('website', 'publication_date', 'partially_verified'),
  ('website', 'data_collection_method', 'not_verified'),
  ('website', 'independent_verifiability', 'not_verified'),
  ('website', 'conflict_of_interest', 'partially_verified'),
  ('website', 'corrections_history', 'not_verified'),
  ('preprint', 'author_transparency', 'verified'),
  ('preprint', 'publisher_transparency', 'verified'),
  ('preprint', 'citations_present', 'verified'),
  ('preprint', 'publication_date', 'verified'),
  ('preprint', 'data_collection_method', 'partially_verified'),
  ('preprint', 'independent_verifiability', 'partially_verified'),
  ('preprint', 'conflict_of_interest', 'partially_verified'),
  ('preprint', 'corrections_history', 'not_verified'),
  ('other', 'author_transparency', 'not_verified'),
  ('other', 'publisher_transparency', 'partially_verified'),
  ('other', 'citations_present', 'partially_verified'),
  ('other', 'publication_date', 'partially_verified'),
  ('other', 'data_collection_method', 'not_verified'),
  ('other', 'independent_verifiability', 'not_verified'),
  ('other', 'conflict_of_interest', 'partially_verified'),
  ('other', 'corrections_history', 'not_verified');

create temp table assess_notes (criterion text, status text, note text) on commit drop;
insert into assess_notes values
  ('author_transparency', 'verified', 'Named authors are listed with their affiliations.'),
  ('author_transparency', 'partially_verified', 'Authors are named, but affiliations or credentials are incomplete.'),
  ('author_transparency', 'not_verified', 'No individual author is named.'),
  ('author_transparency', 'not_applicable', 'Published under an institutional name, so individual authorship does not apply.'),
  ('publisher_transparency', 'verified', 'The publisher states who it is, who funds it and how to contact it.'),
  ('publisher_transparency', 'partially_verified', 'The publisher is identifiable, but funding is not stated.'),
  ('publisher_transparency', 'not_verified', 'The publisher could not be identified from the page.'),
  ('publisher_transparency', 'not_applicable', 'Not applicable to this kind of source.'),
  ('citations_present', 'verified', 'Claims are backed by references that can be followed.'),
  ('citations_present', 'partially_verified', 'Some claims are referenced; others are not.'),
  ('citations_present', 'not_verified', 'No references are given for the claims made.'),
  ('citations_present', 'not_applicable', 'The source is primary data, so references do not apply.'),
  ('publication_date', 'verified', 'A publication date is stated and consistent with the content.'),
  ('publication_date', 'partially_verified', 'A date is shown, but it is not clear whether it was updated later.'),
  ('publication_date', 'not_verified', 'No publication date could be found.'),
  ('publication_date', 'not_applicable', 'Not applicable to this kind of source.'),
  ('data_collection_method', 'verified', 'The method of collecting the data is described in enough detail to repeat it.'),
  ('data_collection_method', 'partially_verified', 'The method is summarised but key details are missing.'),
  ('data_collection_method', 'not_verified', 'The data collection method is not described.'),
  ('data_collection_method', 'not_applicable', 'The source does not report original data.'),
  ('independent_verifiability', 'verified', 'The underlying data are public, so others can check the figures.'),
  ('independent_verifiability', 'partially_verified', 'Some figures can be checked against other published sources.'),
  ('independent_verifiability', 'not_verified', 'The figures cannot be checked independently.'),
  ('independent_verifiability', 'not_applicable', 'Not applicable to this kind of source.'),
  ('conflict_of_interest', 'verified', 'No financial or other interest in the outcome is apparent, and none is declared.'),
  ('conflict_of_interest', 'partially_verified', 'The publisher has a stated interest in the topic, which it declares.'),
  ('conflict_of_interest', 'not_verified', 'The publisher benefits from the conclusion and does not declare this.'),
  ('conflict_of_interest', 'not_applicable', 'Not applicable to this kind of source.'),
  ('corrections_history', 'verified', 'A corrections policy exists and past corrections are listed.'),
  ('corrections_history', 'partially_verified', 'A corrections policy exists, but no history is shown.'),
  ('corrections_history', 'not_verified', 'No corrections policy was found.'),
  ('corrections_history', 'not_applicable', 'Not applicable to this kind of source.');

-- The first three criteria are always assessed; the rest are left out for some
-- sources, as a reviewer would for criteria that do not apply to the material.
insert into public.source_assessments (id, source_id, criterion, status, notes, state, author_id, is_demo, created_at, updated_at, released_at)
select
  md5('trustlens-demo:assessment:' || s.id::text || b.criterion)::uuid,
  s.id,
  b.criterion::public.assessment_criterion,
  r.status::public.criterion_status,
  n.note,
  'published',
  s.author_id,
  true,
  s.created_at + interval '3 days',
  s.created_at + interval '3 days',
  s.created_at + interval '4 days'
from public.sources s
join assess_base b on b.type = s.type::text
cross join lateral (
  select case
    when b.status = 'verified' and abs(hashtext(s.id::text || b.criterion)) % 7 = 0 then 'partially_verified'
    else b.status
  end as status
) r
join assess_notes n on n.criterion = b.criterion and n.status = r.status
where s.is_demo
  and (b.criterion in ('author_transparency', 'publisher_transparency', 'publication_date')
       or abs(hashtext(b.criterion || s.id::text)) % 6 <> 0);

-- -------------------------------------------------------------- relations
insert into public.claim_relations (claim_id, related_claim_id, created_by, created_at)
select a.id, b.id, pg_temp.u('researcher'), a.created_at + interval '20 days' from (values
  ('solar-doubled', 'solar-payback'),
  ('ev-share', 'ev-chargers-enough'),
  ('phone-bans', 'teen-screen-time'),
  ('small-classes', 'tutoring-works'),
  ('bus-lanes', 'congestion-charge'),
  ('bus-lanes', 'free-transit'),
  ('renewables-blackouts', 'solar-doubled'),
  ('sleep-memory', 'light-filters'),
  ('vitamin-d-infections', 'booster-hospital'),
  ('microplastics-tap', 'water-safe-cedar'),
  ('minimum-wage-jobs', 'four-day-week'),
  ('rent-control', 'housing-first'),
  ('remote-work-productivity', 'four-day-week'),
  ('loneliness-epidemic', 'teen-screen-time'),
  ('deepfake-detection', 'quantum-advantage'),
  ('longer-fire-season', 'deforestation-slowing'),
  ('recycling-landfill', 'bag-charge'),
  ('speed-cameras', 'congestion-charge')) as r (a, b)
join public.claims a on a.id = pg_temp.sid('claim', r.a)
join public.claims b on b.id = pg_temp.sid('claim', r.b);

-- ------------------------------------------------ collections and bookmarks
insert into public.collections (id, owner_id, title, description, visibility, created_at, updated_at) values
  (pg_temp.sid('collection', 'transport'), pg_temp.u('member'), 'Transport claims I am tracking', 'Claims about buses, charging and road safety, with the sources I keep coming back to.', 'private', now() - interval '40 days', now() - interval '12 days'),
  (pg_temp.sid('collection', 'climate'), pg_temp.u('member'), 'Climate and energy reading', 'A starting list for anyone new to the local energy and climate claims.', 'public', now() - interval '33 days', now() - interval '9 days'),
  (pg_temp.sid('collection', 'open-questions'), pg_temp.u('member'), 'Open questions', 'Claims where the evidence is still thin. Shared by link.', 'unlisted', now() - interval '21 days', now() - interval '21 days'),
  (pg_temp.sid('collection', 'second-source'), pg_temp.u('researcher'), 'Needs a second source', 'Claims with a single source so far. Good candidates for further research.', 'public', now() - interval '25 days', now() - interval '6 days'),
  (pg_temp.sid('collection', 'education-pack'), pg_temp.u('admin'), 'Education claims: review pack', 'Working list for the next review session.', 'private', now() - interval '15 days', now() - interval '15 days');

insert into public.collection_items (collection_id, claim_id, source_id, position) values
  (pg_temp.sid('collection', 'transport'), pg_temp.sid('claim', 'bus-lanes'), null, 1),
  (pg_temp.sid('collection', 'transport'), pg_temp.sid('claim', 'congestion-charge'), null, 2),
  (pg_temp.sid('collection', 'transport'), pg_temp.sid('claim', 'free-transit'), null, 3),
  (pg_temp.sid('collection', 'transport'), pg_temp.sid('claim', 'ev-chargers-enough'), null, 4),
  (pg_temp.sid('collection', 'transport'), pg_temp.sid('claim', 'speed-cameras'), null, 5),
  (pg_temp.sid('collection', 'transport'), null, pg_temp.sid('source', 'bta-journey-times'), 6),
  (pg_temp.sid('collection', 'climate'), pg_temp.sid('claim', 'solar-doubled'), null, 1),
  (pg_temp.sid('collection', 'climate'), pg_temp.sid('claim', 'solar-payback'), null, 2),
  (pg_temp.sid('collection', 'climate'), pg_temp.sid('claim', 'ocean-ph'), null, 3),
  (pg_temp.sid('collection', 'climate'), pg_temp.sid('claim', 'sea-level-harbour'), null, 4),
  (pg_temp.sid('collection', 'climate'), pg_temp.sid('claim', 'renewables-blackouts'), null, 5),
  (pg_temp.sid('collection', 'climate'), pg_temp.sid('claim', 'longer-fire-season'), null, 6),
  (pg_temp.sid('collection', 'climate'), null, pg_temp.sid('source', 'kestrel-solar-capacity'), 7),
  (pg_temp.sid('collection', 'climate'), null, pg_temp.sid('source', 'tidewater-sea-level'), 8),
  (pg_temp.sid('collection', 'open-questions'), pg_temp.sid('claim', 'quantum-advantage'), null, 1),
  (pg_temp.sid('collection', 'open-questions'), pg_temp.sid('claim', 'microplastics-tap'), null, 2),
  (pg_temp.sid('collection', 'open-questions'), pg_temp.sid('claim', 'lunar-ice'), null, 3),
  (pg_temp.sid('collection', 'open-questions'), pg_temp.sid('claim', 'offsets-deliver'), null, 4),
  (pg_temp.sid('collection', 'second-source'), pg_temp.sid('claim', 'library-reading-age'), null, 1),
  (pg_temp.sid('collection', 'second-source'), pg_temp.sid('claim', 'free-transit'), null, 2),
  (pg_temp.sid('collection', 'second-source'), pg_temp.sid('claim', 'lunar-ice'), null, 3),
  (pg_temp.sid('collection', 'second-source'), pg_temp.sid('claim', 'wind-noise'), null, 4),
  (pg_temp.sid('collection', 'second-source'), pg_temp.sid('claim', 'microplastics-tap'), null, 5),
  (pg_temp.sid('collection', 'education-pack'), pg_temp.sid('claim', 'small-classes'), null, 1),
  (pg_temp.sid('collection', 'education-pack'), pg_temp.sid('claim', 'homework-scores'), null, 2),
  (pg_temp.sid('collection', 'education-pack'), pg_temp.sid('claim', 'phone-bans'), null, 3),
  (pg_temp.sid('collection', 'education-pack'), pg_temp.sid('claim', 'teacher-pay-retention'), null, 4);

insert into public.bookmarks (user_id, claim_id, source_id, created_at) values
  (pg_temp.u('member'), pg_temp.sid('claim', 'bus-lanes'), null, now() - interval '31 days'),
  (pg_temp.u('member'), pg_temp.sid('claim', 'sleep-memory'), null, now() - interval '20 days'),
  (pg_temp.u('member'), pg_temp.sid('claim', 'coffee-heart'), null, now() - interval '25 days'),
  (pg_temp.u('member'), pg_temp.sid('claim', 'ocean-ph'), null, now() - interval '20 days'),
  (pg_temp.u('member'), pg_temp.sid('claim', 'housing-first'), null, now() - interval '13 days'),
  (pg_temp.u('member'), pg_temp.sid('claim', 'teen-screen-time'), null, now() - interval '24 days'),
  (pg_temp.u('member'), pg_temp.sid('claim', 'solar-doubled'), null, now() - interval '29 days'),
  (pg_temp.u('member'), null, pg_temp.sid('source', 'bta-journey-times'), now() - interval '17 days'),
  (pg_temp.u('member'), null, pg_temp.sid('source', 'tidewater-ocean-ph'), now() - interval '19 days'),
  (pg_temp.u('researcher'), pg_temp.sid('claim', 'quantum-advantage'), null, now() - interval '19 days'),
  (pg_temp.u('researcher'), pg_temp.sid('claim', 'rent-control'), null, now() - interval '21 days');

insert into public.follows (user_id, claim_id, category, created_at) values
  (pg_temp.u('member'), pg_temp.sid('claim', 'bus-lanes'), null, now() - interval '30 days'),
  (pg_temp.u('member'), pg_temp.sid('claim', 'quantum-advantage'), null, now() - interval '18 days'),
  (pg_temp.u('member'), null, 'environment', now() - interval '28 days'),
  (pg_temp.u('researcher'), null, 'education', now() - interval '35 days');

insert into public.saved_views (user_id, name, query, created_at) values
  (pg_temp.u('member'), 'Solar in the region', '{"q": "solar", "category": "environment"}', now() - interval '22 days'),
  (pg_temp.u('member'), 'Evidence disagrees', '{"status": "conflicting_evidence"}', now() - interval '14 days'),
  (pg_temp.u('researcher'), 'Thin evidence', '{"status": "insufficient_evidence"}', now() - interval '10 days');

-- Sharing a collection notifies the recipient through a trigger.
insert into public.collection_shares (collection_id, user_id) values
  (pg_temp.sid('collection', 'second-source'), pg_temp.u('member')),
  (pg_temp.sid('collection', 'education-pack'), pg_temp.u('editor'));

-- ------------------------------------------------ claim status history
select pg_temp.act_as('admin');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'sleep-memory'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'sleep-memory'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'light-filters'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'table-top-fusion'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'table-top-fusion'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'vitamin-d-infections'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'vitamin-d-infections'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'coffee-heart'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'coffee-heart'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'microplastics-tap'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'microplastics-tap'), 'insufficient_evidence', 'There are too few independent sources to describe what the evidence shows.');
select public.change_claim_status(pg_temp.sid('claim', 'water-safe-cedar'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'water-safe-cedar'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'ocean-ph'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'ocean-ph'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'quantum-advantage'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'quantum-advantage'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'booster-hospital'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'booster-hospital'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'handwash-absence'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'handwash-absence'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'lunar-ice'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'lunar-ice'), 'insufficient_evidence', 'There are too few independent sources to describe what the evidence shows.');
select public.change_claim_status(pg_temp.sid('claim', 'asteroid-impact'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'asteroid-impact'), 'insufficient_evidence', 'There are too few independent sources to describe what the evidence shows.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'bilingual-attention'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'bilingual-attention'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'solar-doubled'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'solar-doubled'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'solar-payback'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'solar-payback'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'ev-share'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'ev-share'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'longer-fire-season'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'longer-fire-season'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'deforestation-slowing'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'deforestation-slowing'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'recycling-landfill'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'recycling-landfill'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'wind-noise'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'wind-noise'), 'insufficient_evidence', 'There are too few independent sources to describe what the evidence shows.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'renewables-blackouts'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'renewables-blackouts'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'bee-decline'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'bee-decline'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'sea-level-harbour'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'sea-level-harbour'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'offsets-deliver'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'offsets-deliver'), 'insufficient_evidence', 'There are too few independent sources to describe what the evidence shows.');
select public.change_claim_status(pg_temp.sid('claim', 'small-classes'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'small-classes'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'homework-scores'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'homework-scores'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'phone-bans'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'library-reading-age'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'library-reading-age'), 'insufficient_evidence', 'There are too few independent sources to describe what the evidence shows.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'tutoring-works'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'tutoring-works'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'teacher-pay-retention'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'learning-styles'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'learning-styles'), 'archived', 'No longer tracked: superseded by a narrower claim or the underlying programme has ended.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'open-textbooks'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'open-textbooks'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'cloud-uptime'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'cloud-uptime'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'phone-battery-ten-years'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'phone-battery-ten-years'), 'insufficient_evidence', 'There are too few independent sources to describe what the evidence shows.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'password-managers'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'password-managers'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', '5g-health'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', '5g-health'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'ai-jobs'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'ai-jobs'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'deepfake-detection'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'deepfake-detection'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'ev-chargers-enough'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'satellite-broadband'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'satellite-broadband'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'ocr-accuracy'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'open-source-secure'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'open-source-secure'), 'archived', 'No longer tracked: superseded by a narrower claim or the underlying programme has ended.');
select public.change_claim_status(pg_temp.sid('claim', 'youth-unemployment'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'youth-unemployment'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'loneliness-epidemic'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'loneliness-epidemic'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'housing-first'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'housing-first'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'volunteering-decline'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'volunteering-decline'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'charity-overhead'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'charity-overhead'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'crime-eastgate'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'crime-eastgate'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'remote-work-productivity'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'remote-work-productivity'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'gender-pay-gap'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'gender-pay-gap'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'library-closures'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'teen-screen-time'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'teen-screen-time'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'bus-lanes'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'bus-lanes'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'congestion-charge'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'congestion-charge'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'sugar-tax'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'sugar-tax'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'minimum-wage-jobs'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'minimum-wage-jobs'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select public.change_claim_status(pg_temp.sid('claim', 'four-day-week'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'rent-control'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'free-transit'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'free-transit'), 'insufficient_evidence', 'There are too few independent sources to describe what the evidence shows.');
select public.change_claim_status(pg_temp.sid('claim', 'speed-cameras'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'speed-cameras'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'basic-income'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'bag-charge'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'bag-charge'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select public.change_claim_status(pg_temp.sid('claim', 'free-wifi-network'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'free-wifi-network'), 'archived', 'No longer tracked: superseded by a narrower claim or the underlying programme has ended.');
select public.change_claim_status(pg_temp.sid('claim', 'tax-cuts-revenue'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'tax-cuts-revenue'), 'archived', 'No longer tracked: superseded by a narrower claim or the underlying programme has ended.');
select pg_temp.act_as('editor');
select public.change_claim_status(pg_temp.sid('claim', 'transporte-estudiantes'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'transporte-estudiantes'), 'insufficient_evidence', 'There are too few independent sources to describe what the evidence shows.');
select public.change_claim_status(pg_temp.sid('claim', 'radwege-innenstadt'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'radwege-innenstadt'), 'evidence_available', 'Several independent sources were reviewed and their findings are consistent.');
select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'hafte-kari-kutah'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'hafte-kari-kutah'), 'conflicting_evidence', 'The reviewed sources disagree. Both positions are documented with their limitations.');

-- ------------------------------------------- revisions and version history
do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('claim', pg_temp.sid('claim', 'bus-lanes'), jsonb_build_object('description', 'The city council says its bus lane pilot shortened the average commute by 12 percent. The figure describes bus journeys on the pilot corridors; independent counts of car journeys on the same corridors point the other way.'), 'Clarified that the 12 percent figure covers bus journeys only.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('claim', pg_temp.sid('claim', 'bus-lanes'), jsonb_build_object('keywords', array['bus lanes', 'commute', 'transport', 'congestion']::text[]), 'Added a keyword so the claim appears in congestion searches.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('evidence', pg_temp.sid('evidence', 'bus-lanes-4'), jsonb_build_object('summary', 'Independent counts over four weeks show car journey times rose by about 6 percent on the pilot corridors, while bus journey times fell.'), 'Added the bus comparison to the summary for balance.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('claim', pg_temp.sid('claim', 'sleep-memory'), jsonb_build_object('description', 'A widely shared claim holds that adults who regularly sleep fewer than seven hours perform worse on delayed recall tasks than adults who sleep seven to nine hours. The strongest evidence so far is observational.'), 'Noted that the strongest evidence is observational.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('claim', pg_temp.sid('claim', 'solar-doubled'), jsonb_build_object('title', 'Installed solar capacity in the region has doubled since 2020'), 'Clarified the title: the figure measures installed capacity, not output.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('claim', pg_temp.sid('claim', 'coffee-heart'), jsonb_build_object('description', 'A headline claims that regular moderate coffee drinking protects against heart disease. The underlying study reported an association with fewer rhythm disorders, not with heart disease in general.'), 'Described what the underlying study actually measured.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('claim', pg_temp.sid('claim', 'ev-share'), jsonb_build_object('origin', 'Ministerial speech and accompanying press note'), 'Added the press note as part of the origin.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('source', pg_temp.sid('source', 'cedar-water-quality'), jsonb_build_object('published_on', '2025-03-03'), 'Corrected the publication date to match the report cover.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('claim', pg_temp.sid('claim', 'vitamin-d-infections'), jsonb_build_object('description', 'Supplement makers say vitamin D is ineffective against winter infections.'), 'Reworded the claim.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'rejected', 'The edit reverses what the claim says instead of correcting it. If this is a different claim, propose it as a new one.');
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('claim', pg_temp.sid('claim', 'longer-fire-season'), jsonb_build_object('description', 'Environmental groups say the fire season in the Pinecrest Basin starts earlier and ends later than it used to, and that this reflects a warmer climate.'), 'Added attribution to climate warming.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'changes_requested', 'Please cite the source for the warming link. The evidence listed only shows season length, and the 2008 change in the definition of the season start should be mentioned.');
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('assessment', md5('trustlens-demo:assessment:' || pg_temp.sid('source', 'tidewater-ocean-ph')::text || 'publication_date')::uuid, jsonb_build_object('status', 'verified', 'notes', 'The release date and the date of the last station update are both stated.'), 'The data page now states the last update date.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('claim', pg_temp.sid('claim', 'quantum-advantage'), jsonb_build_object('description', 'Researchers report a speed-up on a sampling task that they say classical computers cannot match in reasonable time. A follow-up preprint disputes this, and neither result has completed peer review.'), 'Added that both preprints are awaiting peer review.');
  v_item := pg_temp.open_item('revision', v_id);
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('claim', pg_temp.sid('claim', 'rent-control'), jsonb_build_object('keywords', array['rent', 'housing', 'regulation', 'tenants']::text[]), 'Added a keyword.');
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  v_id := public.propose_revision('assessment', md5('trustlens-demo:assessment:' || pg_temp.sid('source', 'pinecrest-wildfire')::text || 'publisher_transparency')::uuid, jsonb_build_object('status', 'partially_verified', 'notes', 'The trust is identifiable, but its funders are not listed on the report.'), 'Downgraded after checking the funding statement.');
end
$f$;

-- ---------------------------------------- submissions, approvals and queue
select pg_temp.act_as('researcher');
insert into public.sources (id, title, publisher, url, authors, published_on, type, state, author_id, is_demo) values (pg_temp.sid('source', 'lead-inventory'), 'Lead Service Line Inventory, Cedar Valley', 'Cedar Valley Water Board', 'https://cedar-valley-water-board.example/lead-inventory', '{}'::text[], '2026-04-30', 'government_document', 'draft', pg_temp.u('researcher'), true);
insert into public.claims (id, title, description, category, origin, first_appeared_on, keywords, state, author_id, is_demo) values (pg_temp.sid('claim', 'lead-pipes'), 'Most homes built before 1970 still have lead water pipes', 'Residents’ groups say most older homes in the valley are still connected to the mains by lead pipes.', 'environment', 'Residents’ association newsletter', '2026-05-12', array['lead', 'water', 'housing']::text[], 'draft', pg_temp.u('researcher'), true);
insert into public.evidence (id, claim_id, source_id, title, summary, position, limitations, state, author_id, is_demo) values (pg_temp.sid('evidence', 'lead-pipes-1'), pg_temp.sid('claim', 'lead-pipes'), pg_temp.sid('source', 'lead-inventory'), 'Inventory lists 41 percent of older connections as lead or unknown', 'The inventory classes 41 percent of connections to pre-1970 homes as lead, or unknown pending inspection.', 'context', 'About a quarter of records are still unverified.', 'draft', pg_temp.u('researcher'), true);
insert into public.sources (id, title, publisher, url, authors, published_on, type, state, author_id, is_demo) values (pg_temp.sid('source', 'school-meals-eval'), 'Universal Free School Meals: Two-Year Evaluation', 'Greyfield Education Council', 'https://greyfield-education-council.example/school-meals-eval', array['E. Parry']::text[], '2026-05-18', 'report', 'draft', pg_temp.u('researcher'), true);
insert into public.claims (id, title, description, category, origin, first_appeared_on, keywords, state, author_id, is_demo) values (pg_temp.sid('claim', 'school-meals'), 'Free school meals improve attainment', 'Campaigners say providing free meals to all pupils raises exam results.', 'education', 'Campaign website', '2026-05-26', array['school meals', 'attainment', 'children']::text[], 'draft', pg_temp.u('researcher'), true);
insert into public.evidence (id, claim_id, source_id, title, summary, position, limitations, state, author_id, is_demo) values (pg_temp.sid('evidence', 'school-meals-1'), pg_temp.sid('claim', 'school-meals'), pg_temp.sid('source', 'school-meals-eval'), 'Pupils receiving meals gained two months in maths', 'Pupils in participating schools gained about two months in maths compared with similar schools without the scheme.', 'supports', 'Two years of follow-up only; gains were smaller for reading.', 'draft', pg_temp.u('researcher'), true);
insert into public.sources (id, title, publisher, url, authors, published_on, type, state, author_id, is_demo) values (pg_temp.sid('source', 'bus-fleet-costs'), 'Fleet Operating Cost Comparison', 'Aldermoor Transport Bureau', 'https://aldermoor-transport-bureau.example/bus-fleet-costs', '{}'::text[], '2026-06-01', 'report', 'draft', pg_temp.u('researcher'), true);
insert into public.claims (id, title, description, category, origin, first_appeared_on, keywords, state, author_id, is_demo) values (pg_temp.sid('claim', 'electric-buses'), 'Electric buses cost less to run than diesel buses', 'The transit authority says electric buses are cheaper to operate than diesel buses.', 'public_policy', 'Transit authority board paper', '2026-06-09', array['buses', 'electric', 'costs']::text[], 'draft', pg_temp.u('researcher'), true);
insert into public.evidence (id, claim_id, source_id, title, summary, position, limitations, state, author_id, is_demo) values (pg_temp.sid('evidence', 'electric-buses-1'), pg_temp.sid('claim', 'electric-buses'), pg_temp.sid('source', 'bus-fleet-costs'), 'Per-kilometre running cost was 28 percent lower', 'Energy and maintenance together cost 28 percent less per kilometre than diesel, before counting vehicle purchase price.', 'supports', 'Excludes the purchase price and charging infrastructure.', 'draft', pg_temp.u('researcher'), true);
do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  perform public.submit_for_review('source', pg_temp.sid('source', 'lead-inventory'));
  perform public.submit_for_review('claim', pg_temp.sid('claim', 'lead-pipes'));
  v_item := pg_temp.open_item('source', pg_temp.sid('source', 'lead-inventory'));
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
  v_item := pg_temp.open_item('claim', pg_temp.sid('claim', 'lead-pipes'));
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
  perform pg_temp.act_as('researcher');
  perform public.submit_for_review('evidence', pg_temp.sid('evidence', 'lead-pipes-1'));
  v_item := pg_temp.open_item('evidence', pg_temp.sid('evidence', 'lead-pipes-1'));
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  perform public.submit_for_review('source', pg_temp.sid('source', 'school-meals-eval'));
  perform public.submit_for_review('claim', pg_temp.sid('claim', 'school-meals'));
  v_item := pg_temp.open_item('source', pg_temp.sid('source', 'school-meals-eval'));
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
  v_item := pg_temp.open_item('claim', pg_temp.sid('claim', 'school-meals'));
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
  perform pg_temp.act_as('researcher');
  perform public.submit_for_review('evidence', pg_temp.sid('evidence', 'school-meals-1'));
  v_item := pg_temp.open_item('evidence', pg_temp.sid('evidence', 'school-meals-1'));
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  perform public.submit_for_review('source', pg_temp.sid('source', 'bus-fleet-costs'));
  perform public.submit_for_review('claim', pg_temp.sid('claim', 'electric-buses'));
  v_item := pg_temp.open_item('source', pg_temp.sid('source', 'bus-fleet-costs'));
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
  v_item := pg_temp.open_item('claim', pg_temp.sid('claim', 'electric-buses'));
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
  perform pg_temp.act_as('researcher');
  perform public.submit_for_review('evidence', pg_temp.sid('evidence', 'electric-buses-1'));
  v_item := pg_temp.open_item('evidence', pg_temp.sid('evidence', 'electric-buses-1'));
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

select pg_temp.act_as('admin');
select public.change_claim_status(pg_temp.sid('claim', 'lead-pipes'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select public.change_claim_status(pg_temp.sid('claim', 'school-meals'), 'under_review', 'A researcher has been assigned and the first source review is under way.');
select pg_temp.act_as('researcher');
insert into public.claims (id, title, description, category, origin, first_appeared_on, keywords, state, author_id, is_demo) values (pg_temp.sid('claim', 'heat-pumps-cold'), 'Heat pumps do not work in cold winters', 'Installers and homeowners disagree about whether air-source heat pumps heat a home adequately when temperatures stay below freezing.', 'technology', 'Home improvement forum', '2026-09-14', array['heat pumps,cold,heating']::text[], 'draft', pg_temp.u('researcher'), true);
insert into public.claims (id, title, description, category, origin, first_appeared_on, keywords, state, author_id, is_demo) values (pg_temp.sid('claim', 'online-tutoring'), 'Online tutoring is as effective as in-person tutoring', 'Providers say tutoring delivered over video produces the same gains as tutoring in person.', 'education', 'Provider website', '2026-09-28', array['tutoring,online,learning']::text[], 'draft', pg_temp.u('researcher'), true);
insert into public.sources (id, title, publisher, url, authors, published_on, type, state, author_id, is_demo) values (pg_temp.sid('source', 'heat-pump-field'), 'Heat Pump Field Performance in a Cold-Climate Trial', 'Kestrel Energy Agency', 'https://kestrel-energy-agency.example/heat-pump-field', array['M. Aalto']::text[], '2026-08-20', 'report', 'draft', pg_temp.u('researcher'), true);
insert into public.sources (id, title, publisher, url, authors, published_on, type, state, author_id, is_demo) values (pg_temp.sid('source', 'online-tutoring-prepub'), 'Remote Tutoring Outcomes: A Pilot Evaluation', 'Northfield University Press', 'https://northfield-university-press.example/online-tutoring-prepub', array['N. Pillai', 'A. Brandt']::text[], '2026-09-05', 'preprint', 'draft', pg_temp.u('researcher'), true);
insert into public.evidence (id, claim_id, source_id, title, summary, position, limitations, state, author_id, is_demo) values (pg_temp.sid('evidence', 'congestion-charge-3'), pg_temp.sid('claim', 'congestion-charge'), pg_temp.sid('source', 'northfield-traffic-counts'), 'Counts suggest traffic displaced to the ring road', 'Independent counts show part of the reduction inside the zone reappeared on the ring road.', 'context', 'Counts were taken on weekdays only.', 'draft', pg_temp.u('researcher'), true);
insert into public.evidence (id, claim_id, source_id, title, summary, position, limitations, state, author_id, is_demo) values (pg_temp.sid('evidence', 'solar-payback-3'), pg_temp.sid('claim', 'solar-payback'), pg_temp.sid('source', 'kestrel-solar-capacity'), 'Registered installations are concentrated on larger roofs', 'The register shows that most rooftop systems sit on roofs above 60 square metres, which flatters payback figures.', 'context', '', 'draft', pg_temp.u('researcher'), true);
do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  perform public.submit_for_review('claim', pg_temp.sid('claim', 'heat-pumps-cold'));
  perform public.submit_for_review('claim', pg_temp.sid('claim', 'online-tutoring'));
  perform public.submit_for_review('source', pg_temp.sid('source', 'heat-pump-field'));
  perform public.submit_for_review('source', pg_temp.sid('source', 'online-tutoring-prepub'));
  perform public.submit_for_review('evidence', pg_temp.sid('evidence', 'congestion-charge-3'));
  perform public.submit_for_review('evidence', pg_temp.sid('evidence', 'solar-payback-3'));
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  v_item := pg_temp.open_item('source', pg_temp.sid('source', 'heat-pump-field'));
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
end
$f$;

select pg_temp.act_as('researcher');
insert into public.claims (id, title, description, category, origin, first_appeared_on, keywords, state, author_id, is_demo) values (pg_temp.sid('claim', 'moon-landing'), 'The Moon landings were staged', 'A recurring conspiracy claim that the crewed lunar landings were filmed on a set.', 'science', 'Video sharing site', '2026-07-02', array['moon,conspiracy,history']::text[], 'draft', pg_temp.u('researcher'), true);
insert into public.sources (id, title, publisher, url, authors, published_on, type, state, author_id, is_demo) values (pg_temp.sid('source', 'forum-water-thread'), 'Thread: Is our tap water safe?', 'Valley Chat Board', 'https://valley-chat-board.example/forum-water-thread', '{}'::text[], '2026-07-11', 'website', 'draft', pg_temp.u('researcher'), true);
insert into public.claims (id, title, description, category, origin, first_appeared_on, keywords, state, author_id, is_demo) values (pg_temp.sid('claim', 'detox-teas'), 'Detox teas flush toxins from the body', 'Marketing says certain herbal teas remove toxins from the body.', 'science', '', '2026-07-20', array['detox,tea,health']::text[], 'draft', pg_temp.u('researcher'), true);
insert into public.evidence (id, claim_id, source_id, title, summary, position, limitations, state, author_id, is_demo) values (pg_temp.sid('evidence', 'phone-bans-3'), pg_temp.sid('claim', 'phone-bans'), pg_temp.sid('source', 'greyfield-phones'), 'Teachers describe calmer classrooms', 'Teachers say that classrooms feel calmer and pupils pay more attention without phones.', 'supports', 'Quotes only.', 'draft', pg_temp.u('researcher'), true);
do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  perform pg_temp.act_as('researcher');
  perform public.submit_for_review('claim', pg_temp.sid('claim', 'moon-landing'));
  perform public.submit_for_review('source', pg_temp.sid('source', 'forum-water-thread'));
  perform public.submit_for_review('claim', pg_temp.sid('claim', 'detox-teas'));
  perform public.submit_for_review('evidence', pg_temp.sid('evidence', 'phone-bans-3'));
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  v_item := pg_temp.open_item('claim', pg_temp.sid('claim', 'moon-landing'));
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'rejected', 'This is a fringe claim with no published source to assess. Resubmit it with at least one source and a clear origin.');
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  v_item := pg_temp.open_item('source', pg_temp.sid('source', 'forum-water-thread'));
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'rejected', 'The thread has no attributable author and its statements cannot be verified.');
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  v_item := pg_temp.open_item('claim', pg_temp.sid('claim', 'detox-teas'));
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'changes_requested', 'Add where the claim comes from and at least one source before this can be reviewed.');
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  v_item := pg_temp.open_item('evidence', pg_temp.sid('evidence', 'phone-bans-3'));
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'changes_requested', 'The summary repeats the source’s own wording. Quote the measured figures instead of the impressions.');
end
$f$;

select pg_temp.act_as('researcher');
insert into public.claims (id, title, description, category, origin, first_appeared_on, keywords, state, author_id, is_demo) values (pg_temp.sid('claim', 'ai-tutors'), 'AI tutors are better than human tutors', 'Draft: a vendor claim that needs a source before it is submitted.', 'technology', 'Vendor keynote', '2026-10-15', array['tutoring,software']::text[], 'draft', pg_temp.u('researcher'), true);
insert into public.sources (id, title, publisher, url, authors, published_on, type, state, author_id, is_demo) values (pg_temp.sid('source', 'vendor-keynote'), 'Keynote Recording: Learning at Scale', 'Corvid Labs', 'https://corvid-labs.example/vendor-keynote', '{}'::text[], '2026-10-15', 'other', 'draft', pg_temp.u('researcher'), true);
-- ------------------------------------------------------------- reports
select pg_temp.act_as('member');
insert into public.reports (id, user_id, kind, target_type, target_id, reason, suggested_url) values (pg_temp.sid('report', 'ev-share'), pg_temp.u('member'), 'incorrect_information', 'claim', pg_temp.sid('claim', 'ev-share'), 'The 31 percent figure counts registrations, not sales to buyers. The page should say that more clearly.', null);
insert into public.reports (id, user_id, kind, target_type, target_id, reason, suggested_url) values (pg_temp.sid('report', 'cedar-water-quality'), pg_temp.u('member'), 'broken_source', 'source', pg_temp.sid('source', 'cedar-water-quality'), 'The link to the annual report returns a not-found page.', null);
insert into public.reports (id, user_id, kind, target_type, target_id, reason, suggested_url) values (pg_temp.sid('report', 'coffee-heart'), pg_temp.u('member'), 'suggest_source', 'claim', pg_temp.sid('claim', 'coffee-heart'), 'A meta-analysis of the same cohort may help, and I think it is worth adding.', 'https://quillfeather-data-lab.example/coffee-meta-analysis');
insert into public.reports (id, user_id, kind, target_type, target_id, reason, suggested_url) values (pg_temp.sid('report', 'microplastics-tap'), pg_temp.u('member'), 'request_correction', 'claim', pg_temp.sid('claim', 'microplastics-tap'), 'The summary should say no health threshold exists for microplastics in water.', null);
insert into public.reports (id, user_id, kind, target_type, target_id, reason, suggested_url) values (pg_temp.sid('report', 'phone-battery-ten-years'), pg_temp.u('member'), 'add_contradicting_evidence', 'claim', pg_temp.sid('claim', 'phone-battery-ten-years'), 'Independent teardown tests of the previous model showed faster fade than advertised.', 'https://halden-institute-of-technology.example/battery-teardown');
select pg_temp.act_as('researcher');
insert into public.reports (id, user_id, kind, target_type, target_id, reason) values (pg_temp.sid('report', 'researcher-evidence'), pg_temp.u('researcher'), 'incorrect_information', 'evidence', pg_temp.sid('evidence', 'rent-control-1'), 'The summary says rents slowed for all covered homes. The audit says covered homes with turnover only.');
do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  v_item := pg_temp.open_item('report', pg_temp.sid('report', 'ev-share'));
  perform pg_temp.act_as('admin');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  v_item := pg_temp.open_item('report', pg_temp.sid('report', 'microplastics-tap'));
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'rejected', 'The summary already states that no accepted threshold exists; see the evidence entry on detection.');
end
$f$;

do $f$
declare
  v_id uuid;
  v_item uuid;
begin
  v_item := pg_temp.open_item('report', pg_temp.sid('report', 'researcher-evidence'));
  perform pg_temp.act_as('editor');
  perform public.claim_review_item(v_item);
  perform public.decide_review(v_item, 'approved', null);
end
$f$;

-- ---------------------------------------------------------- timestamps
-- Everything above ran in a single transaction, so the workflow rows share one
-- timestamp. Spread them out so the history reads like real activity.
select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '', true);

with ordered as (
  select id, row_number() over (order by decided_at nulls last, id) as rn, count(*) over () as n
  from public.review_items where submitted_by in (select id from demo_users)
)
update public.review_items r set
  submitted_at = now() - ((o.n - o.rn + 2) * interval '17 hours'),
  claimed_at = case when r.claimed_by is not null then now() - ((o.n - o.rn + 2) * interval '17 hours') + interval '2 hours' end,
  decided_at = case when r.decided_at is not null then now() - ((o.n - o.rn + 2) * interval '17 hours') + interval '6 hours' end
from ordered o where r.id = o.id;

update public.reviews rv set created_at = ri.decided_at
from public.review_items ri where rv.review_item_id = ri.id;

-- Backdating is bookkeeping, not an edit, so it must not appear in the audit trail.
alter table public.content_revisions disable trigger write_audit;
alter table public.reports disable trigger write_audit;

update public.content_revisions cr set created_at = ri.submitted_at, decided_at = ri.decided_at
from public.review_items ri where ri.target_type = 'revision' and ri.target_id = cr.id;

update public.reports rp set created_at = ri.submitted_at - interval '3 hours', resolved_at = ri.decided_at
from public.review_items ri where ri.target_type = 'report' and ri.target_id = rp.id;

alter table public.content_revisions enable trigger write_audit;
alter table public.reports enable trigger write_audit;

with numbered as (
  select sc.id, c.created_at as claim_at,
         -- Every history starts from unreviewed, so the first step is the one leaving it.
         case when sc.from_status = 'unreviewed' then 1 else 2 end as k
  from public.claim_status_changes sc join public.claims c on c.id = sc.claim_id
  where c.is_demo
)
update public.claim_status_changes sc set
  created_at = least(n.claim_at + n.k * interval '11 days' + (abs(hashtext(sc.id::text)) % 20) * interval '1 hour', now() - interval '1 day')
from numbered n where sc.id = n.id;

update public.entity_versions v set created_at = least(
  (select first.created_at from public.entity_versions first
   where first.entity_type = v.entity_type and first.entity_id = v.entity_id and first.version = 1)
  + (v.version - 1) * interval '23 days', now() - interval '2 days')
where v.version > 1;

with ordered as (
  select id, row_number() over (order by id) as rn, count(*) over () as n
  from public.notifications where user_id in (select id from demo_users)
)
update public.notifications nt set created_at = now() - ((o.n - o.rn + 1) * interval '13 hours')
from ordered o where nt.id = o.id;
update public.notifications set read_at = created_at + interval '2 hours'
where user_id in (select id from demo_users) and abs(hashtext(id::text)) % 3 = 0;

with ordered as (
  select id, row_number() over (order by id) as rn, count(*) over () as n
  from public.audit_logs where created_at = now()
)
update public.audit_logs a set created_at = now() - ((o.n - o.rn) * (interval '150 days' / o.n))
from ordered o where a.id = o.id;

commit;

-- The SQL editor shows only the last result, so finish with a summary row.
select
  (select count(*) from public.claims where is_demo and state = 'published') as published_claims,
  (select count(*) from public.sources where is_demo and state = 'published') as published_sources,
  (select count(*) from public.evidence where is_demo and state = 'published') as published_evidence,
  (select count(*) from public.source_assessments where is_demo) as assessments,
  (select count(*) from public.review_items where decided_at is null) as open_review_items;
