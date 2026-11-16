'use server';

import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getSession, type Session } from '@/lib/auth/session';
import {
  parseAssessmentInput,
  parseEvidenceInput,
  readField,
} from '@/lib/data/authoring-params';
import {
  echoValues,
  parseClaimInput,
  parseSourceInput,
  readEntityId,
  readLocale,
  type DuplicateMatch,
  type StudioError,
  type StudioState,
} from '@/lib/data/studio-params';
import { contentEntities } from '@/lib/domain/enums';
import { redirect } from '@/lib/i18n/navigation';
import type { LocaleCode } from '@/lib/i18n/locales';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Every action is a form action: the page is rendered by the server, and the
// database has the last word through row level security and the workflow
// functions. These checks exist to give a readable answer first.

interface Context {
  locale: LocaleCode;
  session: Session;
}

const failure = (error: StudioError, form: FormData): StudioState => ({
  id: Date.now(),
  status: 'error',
  error,
  values: echoValues(form),
});

const saved = (message: 'saved' | 'submitted'): StudioState => {
  // Lists and headers that show this item are rendered by the server.
  revalidatePath('/', 'layout');
  return { id: Date.now(), status: 'saved', message };
};

async function open(form: FormData): Promise<Context | StudioState> {
  const locale = readLocale(form);
  if (!locale) notFound();

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  if (session.actor.role === 'user') return failure('forbidden', form);
  return { locale, session };
}

function isContext(value: Context | StudioState): value is Context {
  return 'locale' in value;
}

function errorFor(code: string | undefined): StudioError {
  if (code === '42501') return 'forbidden';
  if (code === '22023') return 'locked';
  return 'failed';
}

const idRow = z.object({ id: z.string() });
const idRows = z.array(idRow);

export async function createClaim(
  _previous: StudioState,
  form: FormData,
): Promise<StudioState> {
  const context = await open(form);
  if (!isContext(context)) return context;

  const input = parseClaimInput(form);
  if (!input.ok) return failure(input.error, form);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('claims')
    .insert({ ...input.value, author_id: context.session.actor.id })
    .select('id')
    .single();
  if (error) return failure(errorFor(error.code), form);

  revalidatePath('/', 'layout');
  return redirect({
    href: `/studio/claims/${idRow.parse(data).id}`,
    locale: context.locale,
  });
}

export async function updateClaim(
  _previous: StudioState,
  form: FormData,
): Promise<StudioState> {
  const context = await open(form);
  if (!isContext(context)) return context;

  const id = readEntityId(form);
  if (!id) notFound();
  const input = parseClaimInput(form);
  if (!input.ok) return failure(input.error, form);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('claims')
    .update(input.value)
    .eq('id', id)
    .eq('author_id', context.session.actor.id)
    .select('id');
  if (error) return failure(errorFor(error.code), form);
  // The policy only lets an author change drafts and items sent back to them,
  // so a row that was sent for review in the meantime matches nothing.
  if (idRows.parse(data).length === 0) return failure('locked', form);

  return saved('saved');
}

const duplicateRows = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    publisher: z.string(),
    reason: z.enum(['same_url', 'similar_title']),
  }),
);

async function findDuplicates(input: {
  url: string;
  title: string;
  publisher: string;
}): Promise<DuplicateMatch[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('find_duplicate_sources', {
    p_url: input.url,
    p_title: input.title,
    p_publisher: input.publisher,
  });
  // A failed check must not stop someone from saving their work.
  return error ? [] : duplicateRows.parse(data);
}

export async function createSource(
  _previous: StudioState,
  form: FormData,
): Promise<StudioState> {
  const context = await open(form);
  if (!isContext(context)) return context;

  const input = parseSourceInput(form);
  if (!input.ok) return failure(input.error, form);

  if (form.get('confirm_duplicate') !== 'yes') {
    const matches = await findDuplicates(input.value);
    if (matches.length > 0) {
      return { id: Date.now(), status: 'duplicate', matches, values: echoValues(form) };
    }
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sources')
    .insert({ ...input.value, author_id: context.session.actor.id })
    .select('id')
    .single();
  if (error) return failure(errorFor(error.code), form);

  revalidatePath('/', 'layout');
  return redirect({
    href: `/studio/sources/${idRow.parse(data).id}`,
    locale: context.locale,
  });
}

export async function updateSource(
  _previous: StudioState,
  form: FormData,
): Promise<StudioState> {
  const context = await open(form);
  if (!isContext(context)) return context;

  const id = readEntityId(form);
  if (!id) notFound();
  const input = parseSourceInput(form);
  if (!input.ok) return failure(input.error, form);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sources')
    .update(input.value)
    .eq('id', id)
    .eq('author_id', context.session.actor.id)
    .select('id');
  if (error) return failure(errorFor(error.code), form);
  if (idRows.parse(data).length === 0) return failure('locked', form);

  return saved('saved');
}

export async function submitForReview(
  _previous: StudioState,
  form: FormData,
): Promise<StudioState> {
  const context = await open(form);
  if (!isContext(context)) return context;

  const kind = form.get('kind');
  const id = readEntityId(form);
  if (
    typeof kind !== 'string' ||
    !(contentEntities as readonly string[]).includes(kind) ||
    !id
  ) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc('submit_for_review', {
    p_entity_type: kind,
    p_entity_id: id,
  });
  if (error) return failure(errorFor(error.code), form);

  return saved('submitted');
}

export async function createEvidence(
  _previous: StudioState,
  form: FormData,
): Promise<StudioState> {
  const context = await open(form);
  if (!isContext(context)) return context;

  const claimId = readField(form, 'claim_id');
  if (!claimId) notFound();
  const input = parseEvidenceInput(form);
  if (!input.ok) return failure(input.error, form);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('evidence')
    .insert({ ...input.value, claim_id: claimId, author_id: context.session.actor.id })
    .select('id')
    .single();
  if (error) return failure(errorFor(error.code), form);

  revalidatePath('/', 'layout');
  return redirect({
    href: `/studio/evidence/${idRow.parse(data).id}`,
    locale: context.locale,
  });
}

export async function updateEvidence(
  _previous: StudioState,
  form: FormData,
): Promise<StudioState> {
  const context = await open(form);
  if (!isContext(context)) return context;

  const id = readEntityId(form);
  if (!id) notFound();
  const input = parseEvidenceInput(form);
  if (!input.ok) return failure(input.error, form);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('evidence')
    .update(input.value)
    .eq('id', id)
    .eq('author_id', context.session.actor.id)
    .select('id');
  if (error) return failure(errorFor(error.code), form);
  if (idRows.parse(data).length === 0) return failure('locked', form);

  return saved('saved');
}

// One check per criterion and source, so the same form creates it the first
// time and updates it afterwards.
export async function saveAssessment(
  _previous: StudioState,
  form: FormData,
): Promise<StudioState> {
  const context = await open(form);
  if (!isContext(context)) return context;

  const sourceId = readField(form, 'source_id');
  if (!sourceId) notFound();
  const input = parseAssessmentInput(form);
  if (!input.ok) return failure(input.error, form);

  const supabase = await createServerSupabaseClient();
  const id = readEntityId(form);

  if (id) {
    const { data, error } = await supabase
      .from('source_assessments')
      .update({ status: input.value.status, notes: input.value.notes })
      .eq('id', id)
      .eq('author_id', context.session.actor.id)
      .select('id');
    if (error) return failure(errorFor(error.code), form);
    if (idRows.parse(data).length === 0) return failure('locked', form);
    return saved('saved');
  }

  const { error } = await supabase
    .from('source_assessments')
    .insert({ ...input.value, source_id: sourceId, author_id: context.session.actor.id });
  if (error) return failure(errorFor(error.code), form);

  revalidatePath('/', 'layout');
  return redirect({
    href: `/studio/sources/${sourceId}/checks/${input.value.criterion}`,
    locale: context.locale,
  });
}
