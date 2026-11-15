'use server';

import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import {
  parseAddForm,
  parseCreateForm,
  parseDeleteForm,
  parseItemForm,
  parseUpdateForm,
} from '@/lib/data/collection-params';
import { redirect } from '@/lib/i18n/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const createdSchema = z.object({ id: z.string() });
const updatedSchema = z.array(createdSchema);

const insufficientPrivilege = '42501';
const noDataFound = 'P0002';

// Every action is a form action, so collections work without scripts. A form
// the page did not produce (a missing field, an unknown id) gets a 404.

export async function createCollection(formData: FormData): Promise<void> {
  const input = parseCreateForm(formData);
  if (!input) notFound();

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale: input.locale });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('collections')
    .insert({
      owner_id: session.actor.id,
      title: input.title,
      description: input.description,
      visibility: input.visibility,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Could not create the collection: ${error.message}`);

  const { id } = createdSchema.parse(data);
  return redirect({ href: `/collections/${id}`, locale: input.locale });
}

export async function updateCollection(formData: FormData): Promise<void> {
  const input = parseUpdateForm(formData);
  if (!input) notFound();

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale: input.locale });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('collections')
    .update({
      title: input.title,
      description: input.description,
      visibility: input.visibility,
    })
    .eq('id', input.id)
    .eq('owner_id', session.actor.id)
    .select('id');
  if (error) throw new Error(`Could not update the collection: ${error.message}`);
  if (updatedSchema.parse(data).length === 0) notFound();

  return redirect({ href: `/collections/${input.id}`, locale: input.locale });
}

export async function deleteCollection(formData: FormData): Promise<void> {
  const input = parseDeleteForm(formData);
  if (!input) notFound();

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale: input.locale });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', input.id)
    .eq('owner_id', session.actor.id);
  if (error) throw new Error(`Could not delete the collection: ${error.message}`);

  return redirect({ href: '/collections', locale: input.locale });
}

export async function addToCollection(formData: FormData): Promise<void> {
  const input = parseAddForm(formData);
  if (!input) notFound();

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale: input.locale });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc('add_collection_item', {
    p_collection_id: input.collection_id,
    p_kind: input.kind,
    p_item_id: input.id,
  });
  if (error) {
    // Not the owner, or the item is not one the reader may see.
    if (error.code === insufficientPrivilege) notFound();
    throw new Error(`Could not add to the collection: ${error.message}`);
  }

  const separator = input.next.includes('?') ? '&' : '?';
  return redirect({ href: `${input.next}${separator}added=1`, locale: input.locale });
}

export async function changeCollectionItem(formData: FormData): Promise<void> {
  const input = parseItemForm(formData);
  if (!input) notFound();

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale: input.locale });

  const supabase = await createServerSupabaseClient();
  if (input.intent === 'remove') {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', input.item_id)
      .eq('collection_id', input.collection_id);
    if (error) throw new Error(`Could not remove the item: ${error.message}`);
  } else {
    const { error } = await supabase.rpc('move_collection_item', {
      p_collection_id: input.collection_id,
      p_item_id: input.item_id,
      p_direction: input.intent === 'up' ? -1 : 1,
    });
    // The item may have been removed in another tab; there is nothing to move.
    if (error && error.code !== noDataFound) {
      if (error.code === insufficientPrivilege) notFound();
      throw new Error(`Could not move the item: ${error.message}`);
    }
  }

  const page = Number(input.page);
  const query = Number.isInteger(page) && page > 1 ? `?page=${page}` : '';
  return redirect({
    href: `/collections/${input.collection_id}${query}`,
    locale: input.locale,
  });
}
