import type {
  AppRole,
  CollectionVisibility,
  ContentEntity,
  ContentState,
} from '@/lib/domain/enums';

/**
 * The database enforces these rules with row level security and the workflow
 * functions. This module mirrors them so the server can fail early and the
 * interface can explain why an action is unavailable instead of hiding it.
 * When the two disagree, the database is right.
 */

export type Actor = { readonly id: string; readonly role: AppRole } | null;

export type DenialReason =
  | 'sign_in_required'
  | 'insufficient_role'
  | 'not_author'
  | 'invalid_state'
  | 'deleted'
  | 'not_visible'
  | 'own_submission'
  | 'claimed_by_other';

export type Decision =
  { readonly allowed: true } | { readonly allowed: false; readonly reason: DenialReason };

export type ContentResource = {
  readonly kind: ContentEntity;
  readonly authorId: string | null;
  readonly state: ContentState;
  readonly deleted: boolean;
};

export type CollectionResource = {
  readonly ownerId: string;
  readonly visibility: CollectionVisibility;
  readonly sharedWith: readonly string[];
};

export type ReviewItemResource = {
  readonly submittedBy: string | null;
  readonly claimedBy: string | null;
  readonly decided: boolean;
};

export type PolicyRequest =
  | { readonly action: 'content:read'; readonly resource: ContentResource }
  | { readonly action: 'content:create' }
  | { readonly action: 'content:edit_draft'; readonly resource: ContentResource }
  | { readonly action: 'content:submit'; readonly resource: ContentResource }
  | { readonly action: 'content:propose_revision'; readonly resource: ContentResource }
  | { readonly action: 'content:edit_published'; readonly resource: ContentResource }
  | { readonly action: 'content:soft_delete'; readonly resource: ContentResource }
  | { readonly action: 'claim:change_status'; readonly resource: ContentResource }
  | { readonly action: 'evidence:reorder'; readonly claim: ContentResource }
  | { readonly action: 'review:view_queue' }
  | { readonly action: 'review:claim'; readonly resource: ReviewItemResource }
  | { readonly action: 'review:approve'; readonly resource: ReviewItemResource }
  | { readonly action: 'review:reject'; readonly resource: ReviewItemResource }
  | { readonly action: 'report:create'; readonly target: ContentResource }
  | { readonly action: 'report:read'; readonly reporterId: string | null }
  | { readonly action: 'collection:read'; readonly resource: CollectionResource }
  | { readonly action: 'collection:edit'; readonly resource: CollectionResource }
  | { readonly action: 'bookmark:create'; readonly target: ContentResource }
  | { readonly action: 'workspace:access' }
  | { readonly action: 'users:manage' }
  | { readonly action: 'audit:read' }
  | { readonly action: 'analytics:read' };

export type Action = PolicyRequest['action'];

const allowed: Decision = { allowed: true };

function deny(reason: DenialReason): Decision {
  return { allowed: false, reason };
}

export function isStaff(actor: Actor): boolean {
  return actor !== null && (actor.role === 'researcher' || actor.role === 'admin');
}

export function isAdmin(actor: Actor): boolean {
  return actor !== null && actor.role === 'admin';
}

function isAuthor(actor: Actor, resource: { readonly authorId: string | null }): boolean {
  return actor !== null && resource.authorId !== null && resource.authorId === actor.id;
}

function isPubliclyVisible(resource: ContentResource): boolean {
  return resource.state === 'published' && !resource.deleted;
}

function canSee(actor: Actor, resource: ContentResource): boolean {
  return isPubliclyVisible(resource) || isAuthor(actor, resource) || isAdmin(actor);
}

function requireStaff(actor: Actor): Decision | null {
  if (actor === null) return deny('sign_in_required');
  if (!isStaff(actor)) return deny('insufficient_role');
  return null;
}

function requireAdmin(actor: Actor): Decision | null {
  if (actor === null) return deny('sign_in_required');
  if (!isAdmin(actor)) return deny('insufficient_role');
  return null;
}

function canWork(actor: Actor, item: ReviewItemResource): Decision | null {
  const missing = requireAdmin(actor);
  if (missing) return missing;
  if (item.decided) return deny('invalid_state');
  if (item.claimedBy !== null && actor !== null && item.claimedBy !== actor.id) {
    return deny('claimed_by_other');
  }
  return null;
}

const editableStates: readonly ContentState[] = ['draft', 'changes_requested'];

export function can(actor: Actor, request: PolicyRequest): Decision {
  switch (request.action) {
    case 'content:read':
      return canSee(actor, request.resource) ? allowed : deny('not_visible');

    case 'content:create':
      return requireStaff(actor) ?? allowed;

    case 'content:edit_draft': {
      const { resource } = request;
      const missing = requireStaff(actor);
      if (missing) return missing;
      if (isAdmin(actor)) return allowed;
      if (!isAuthor(actor, resource)) return deny('not_author');
      if (resource.deleted) return deny('deleted');
      return editableStates.includes(resource.state) ? allowed : deny('invalid_state');
    }

    case 'content:submit': {
      const { resource } = request;
      const missing = requireStaff(actor);
      if (missing) return missing;
      if (!isAdmin(actor) && !isAuthor(actor, resource)) return deny('not_author');
      if (resource.deleted) return deny('deleted');
      return editableStates.includes(resource.state) ? allowed : deny('invalid_state');
    }

    case 'content:propose_revision': {
      const { resource } = request;
      const missing = requireStaff(actor);
      if (missing) return missing;
      if (resource.deleted) return deny('deleted');
      return resource.state === 'published' ? allowed : deny('invalid_state');
    }

    case 'content:edit_published': {
      const missing = requireAdmin(actor);
      if (missing) return missing;
      return request.resource.state === 'published' ? allowed : deny('invalid_state');
    }

    case 'content:soft_delete': {
      const { resource } = request;
      const missing = requireStaff(actor);
      if (missing) return missing;
      if (isAdmin(actor)) return allowed;
      if (!isAuthor(actor, resource)) return deny('not_author');
      return editableStates.includes(resource.state) ? allowed : deny('invalid_state');
    }

    case 'claim:change_status': {
      const missing = requireAdmin(actor);
      if (missing) return missing;
      return request.resource.deleted ? deny('deleted') : allowed;
    }

    case 'evidence:reorder': {
      const missing = requireStaff(actor);
      if (missing) return missing;
      if (request.claim.deleted) return deny('deleted');
      return isAdmin(actor) || isAuthor(actor, request.claim)
        ? allowed
        : deny('not_author');
    }

    case 'review:view_queue':
      return requireAdmin(actor) ?? allowed;

    case 'review:claim':
    case 'review:reject':
      return canWork(actor, request.resource) ?? allowed;

    case 'review:approve': {
      const blocked = canWork(actor, request.resource);
      if (blocked) return blocked;
      const submitter = request.resource.submittedBy;
      return actor !== null && submitter === actor.id ? deny('own_submission') : allowed;
    }

    case 'report:create':
      if (actor === null) return deny('sign_in_required');
      return canSee(actor, request.target) ? allowed : deny('not_visible');

    case 'report:read':
      if (actor === null) return deny('sign_in_required');
      return isAdmin(actor) || request.reporterId === actor.id
        ? allowed
        : deny('not_visible');

    case 'collection:read': {
      const { resource } = request;
      if (resource.visibility === 'public') return allowed;
      if (actor === null) return deny('not_visible');
      return resource.ownerId === actor.id || resource.sharedWith.includes(actor.id)
        ? allowed
        : deny('not_visible');
    }

    case 'collection:edit':
      if (actor === null) return deny('sign_in_required');
      return request.resource.ownerId === actor.id ? allowed : deny('not_author');

    case 'bookmark:create':
      if (actor === null) return deny('sign_in_required');
      return canSee(actor, request.target) ? allowed : deny('not_visible');

    case 'workspace:access':
      return requireStaff(actor) ?? allowed;

    case 'users:manage':
    case 'audit:read':
    case 'analytics:read':
      return requireAdmin(actor) ?? allowed;
  }
}

export function isAllowed(actor: Actor, request: PolicyRequest): boolean {
  return can(actor, request).allowed;
}
