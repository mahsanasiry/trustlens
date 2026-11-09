import { describe, expect, it } from 'vitest';
import {
  can,
  isAdmin,
  isAllowed,
  isStaff,
  type Actor,
  type CollectionResource,
  type ContentResource,
  type ReviewItemResource,
} from '@/lib/permissions';

const visitor: Actor = null;
const user: Actor = { id: 'user-1', role: 'user' };
const researcher: Actor = { id: 'researcher-1', role: 'researcher' };
const otherResearcher: Actor = { id: 'researcher-2', role: 'researcher' };
const admin: Actor = { id: 'admin-1', role: 'admin' };
const otherAdmin: Actor = { id: 'admin-2', role: 'admin' };

function content(overrides: Partial<ContentResource> = {}): ContentResource {
  return {
    kind: 'claim',
    authorId: researcher?.id ?? null,
    state: 'published',
    deleted: false,
    ...overrides,
  };
}

function reviewItem(overrides: Partial<ReviewItemResource> = {}): ReviewItemResource {
  return { submittedBy: 'researcher-1', claimedBy: null, decided: false, ...overrides };
}

function collection(overrides: Partial<CollectionResource> = {}): CollectionResource {
  return { ownerId: 'user-1', visibility: 'private', sharedWith: [], ...overrides };
}

describe('role helpers', () => {
  it('treats researchers and admins as staff', () => {
    expect(isStaff(visitor)).toBe(false);
    expect(isStaff(user)).toBe(false);
    expect(isStaff(researcher)).toBe(true);
    expect(isStaff(admin)).toBe(true);
  });

  it('recognises only admins as admins', () => {
    expect(isAdmin(researcher)).toBe(false);
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(visitor)).toBe(false);
  });
});

describe('reading content', () => {
  it('shows published content to everyone, including visitors', () => {
    expect(isAllowed(visitor, { action: 'content:read', resource: content() })).toBe(
      true,
    );
  });

  it('hides unpublished and deleted content from other people', () => {
    for (const resource of [
      content({ state: 'draft' }),
      content({ state: 'pending_review' }),
      content({ state: 'rejected' }),
      content({ deleted: true }),
    ]) {
      expect(can(visitor, { action: 'content:read', resource })).toEqual({
        allowed: false,
        reason: 'not_visible',
      });
      expect(isAllowed(user, { action: 'content:read', resource })).toBe(false);
      expect(isAllowed(otherResearcher, { action: 'content:read', resource })).toBe(
        false,
      );
    }
  });

  it('lets authors and admins see their unpublished content', () => {
    const draft = content({ state: 'draft' });
    expect(isAllowed(researcher, { action: 'content:read', resource: draft })).toBe(true);
    expect(isAllowed(admin, { action: 'content:read', resource: draft })).toBe(true);
  });
});

describe('creating and editing content', () => {
  it('lets only researchers and admins create content', () => {
    expect(can(visitor, { action: 'content:create' })).toEqual({
      allowed: false,
      reason: 'sign_in_required',
    });
    expect(can(user, { action: 'content:create' })).toEqual({
      allowed: false,
      reason: 'insufficient_role',
    });
    expect(isAllowed(researcher, { action: 'content:create' })).toBe(true);
    expect(isAllowed(admin, { action: 'content:create' })).toBe(true);
  });

  it('lets an author edit drafts and items with requested changes', () => {
    for (const state of ['draft', 'changes_requested'] as const) {
      expect(
        isAllowed(researcher, {
          action: 'content:edit_draft',
          resource: content({ state }),
        }),
      ).toBe(true);
    }
  });

  it('blocks edits once the item is under review, published or rejected', () => {
    for (const state of ['pending_review', 'published', 'rejected'] as const) {
      expect(
        can(researcher, { action: 'content:edit_draft', resource: content({ state }) }),
      ).toEqual({ allowed: false, reason: 'invalid_state' });
    }
  });

  it("blocks researchers from editing someone else's draft", () => {
    expect(
      can(otherResearcher, {
        action: 'content:edit_draft',
        resource: content({ state: 'draft' }),
      }),
    ).toEqual({ allowed: false, reason: 'not_author' });
  });

  it('lets admins edit any draft', () => {
    expect(
      isAllowed(admin, {
        action: 'content:edit_draft',
        resource: content({ state: 'draft' }),
      }),
    ).toBe(true);
  });

  it('reserves direct edits of published content for admins', () => {
    const published = content();
    expect(
      isAllowed(admin, { action: 'content:edit_published', resource: published }),
    ).toBe(true);
    expect(
      can(researcher, { action: 'content:edit_published', resource: published }),
    ).toEqual({
      allowed: false,
      reason: 'insufficient_role',
    });
    expect(
      can(admin, {
        action: 'content:edit_published',
        resource: content({ state: 'draft' }),
      }),
    ).toEqual({ allowed: false, reason: 'invalid_state' });
  });
});

describe('submitting for review', () => {
  it('allows the author to submit a draft', () => {
    expect(
      isAllowed(researcher, {
        action: 'content:submit',
        resource: content({ state: 'draft' }),
      }),
    ).toBe(true);
  });

  it('refuses other researchers, deleted items and items already in review', () => {
    expect(
      can(otherResearcher, {
        action: 'content:submit',
        resource: content({ state: 'draft' }),
      }),
    ).toEqual({ allowed: false, reason: 'not_author' });
    expect(
      can(researcher, {
        action: 'content:submit',
        resource: content({ state: 'draft', deleted: true }),
      }),
    ).toEqual({ allowed: false, reason: 'deleted' });
    expect(
      can(researcher, {
        action: 'content:submit',
        resource: content({ state: 'pending_review' }),
      }),
    ).toEqual({ allowed: false, reason: 'invalid_state' });
  });
});

describe('proposing revisions', () => {
  it('lets any researcher propose a change to published content', () => {
    expect(
      isAllowed(otherResearcher, {
        action: 'content:propose_revision',
        resource: content(),
      }),
    ).toBe(true);
  });

  it('refuses plain users, visitors, drafts and deleted content', () => {
    expect(
      can(user, { action: 'content:propose_revision', resource: content() }),
    ).toEqual({
      allowed: false,
      reason: 'insufficient_role',
    });
    expect(
      can(visitor, { action: 'content:propose_revision', resource: content() }),
    ).toEqual({
      allowed: false,
      reason: 'sign_in_required',
    });
    expect(
      can(researcher, {
        action: 'content:propose_revision',
        resource: content({ state: 'draft' }),
      }),
    ).toEqual({ allowed: false, reason: 'invalid_state' });
    expect(
      can(researcher, {
        action: 'content:propose_revision',
        resource: content({ deleted: true }),
      }),
    ).toEqual({ allowed: false, reason: 'deleted' });
  });
});

describe('deleting content', () => {
  it('lets an author delete only unpublished work', () => {
    expect(
      isAllowed(researcher, {
        action: 'content:soft_delete',
        resource: content({ state: 'draft' }),
      }),
    ).toBe(true);
    expect(
      can(researcher, { action: 'content:soft_delete', resource: content() }),
    ).toEqual({ allowed: false, reason: 'invalid_state' });
  });

  it('lets admins delete anything', () => {
    expect(isAllowed(admin, { action: 'content:soft_delete', resource: content() })).toBe(
      true,
    );
  });
});

describe('claim status and evidence order', () => {
  it('limits status changes to admins', () => {
    expect(isAllowed(admin, { action: 'claim:change_status', resource: content() })).toBe(
      true,
    );
    expect(
      can(researcher, { action: 'claim:change_status', resource: content() }),
    ).toEqual({
      allowed: false,
      reason: 'insufficient_role',
    });
    expect(
      can(admin, { action: 'claim:change_status', resource: content({ deleted: true }) }),
    ).toEqual({
      allowed: false,
      reason: 'deleted',
    });
  });

  it('lets the claim author and admins reorder evidence', () => {
    expect(isAllowed(researcher, { action: 'evidence:reorder', claim: content() })).toBe(
      true,
    );
    expect(isAllowed(admin, { action: 'evidence:reorder', claim: content() })).toBe(true);
    expect(
      can(otherResearcher, { action: 'evidence:reorder', claim: content() }),
    ).toEqual({
      allowed: false,
      reason: 'not_author',
    });
    expect(can(user, { action: 'evidence:reorder', claim: content() })).toEqual({
      allowed: false,
      reason: 'insufficient_role',
    });
  });
});

describe('the review queue', () => {
  it('is open to admins only', () => {
    expect(isAllowed(admin, { action: 'review:view_queue' })).toBe(true);
    expect(isAllowed(researcher, { action: 'review:view_queue' })).toBe(false);
    expect(isAllowed(visitor, { action: 'review:view_queue' })).toBe(false);
  });

  it('lets an admin claim a free item and refuses an item held by someone else', () => {
    expect(isAllowed(admin, { action: 'review:claim', resource: reviewItem() })).toBe(
      true,
    );
    expect(
      can(otherAdmin, {
        action: 'review:claim',
        resource: reviewItem({ claimedBy: 'admin-1' }),
      }),
    ).toEqual({ allowed: false, reason: 'claimed_by_other' });
    expect(
      isAllowed(admin, {
        action: 'review:claim',
        resource: reviewItem({ claimedBy: 'admin-1' }),
      }),
    ).toBe(true);
  });

  it('refuses decided items', () => {
    expect(
      can(admin, { action: 'review:reject', resource: reviewItem({ decided: true }) }),
    ).toEqual({ allowed: false, reason: 'invalid_state' });
  });

  it('does not let an admin approve their own submission', () => {
    const own = reviewItem({ submittedBy: 'admin-1' });
    expect(can(admin, { action: 'review:approve', resource: own })).toEqual({
      allowed: false,
      reason: 'own_submission',
    });
    expect(isAllowed(otherAdmin, { action: 'review:approve', resource: own })).toBe(true);
    expect(isAllowed(admin, { action: 'review:reject', resource: own })).toBe(true);
  });
});

describe('reports, bookmarks and collections', () => {
  it('lets any signed-in person report or bookmark visible content', () => {
    expect(isAllowed(user, { action: 'report:create', target: content() })).toBe(true);
    expect(isAllowed(user, { action: 'bookmark:create', target: content() })).toBe(true);
    expect(can(visitor, { action: 'report:create', target: content() })).toEqual({
      allowed: false,
      reason: 'sign_in_required',
    });
  });

  it('refuses reports and bookmarks on content the person cannot see', () => {
    const hidden = content({ state: 'draft' });
    expect(can(user, { action: 'report:create', target: hidden })).toEqual({
      allowed: false,
      reason: 'not_visible',
    });
    expect(isAllowed(user, { action: 'bookmark:create', target: hidden })).toBe(false);
  });

  it('shows a report only to its author and to admins', () => {
    expect(isAllowed(user, { action: 'report:read', reporterId: 'user-1' })).toBe(true);
    expect(isAllowed(admin, { action: 'report:read', reporterId: 'user-1' })).toBe(true);
    expect(isAllowed(researcher, { action: 'report:read', reporterId: 'user-1' })).toBe(
      false,
    );
  });

  it('opens public collections to everyone and private ones to owners and invitees', () => {
    expect(
      isAllowed(visitor, {
        action: 'collection:read',
        resource: collection({ visibility: 'public' }),
      }),
    ).toBe(true);
    expect(isAllowed(user, { action: 'collection:read', resource: collection() })).toBe(
      true,
    );
    expect(
      isAllowed(researcher, { action: 'collection:read', resource: collection() }),
    ).toBe(false);
    expect(
      isAllowed(researcher, {
        action: 'collection:read',
        resource: collection({ sharedWith: ['researcher-1'] }),
      }),
    ).toBe(true);
    expect(isAllowed(admin, { action: 'collection:read', resource: collection() })).toBe(
      false,
    );
    expect(
      isAllowed(visitor, {
        action: 'collection:read',
        resource: collection({ visibility: 'unlisted' }),
      }),
    ).toBe(false);
  });

  it('lets only the owner edit a collection', () => {
    expect(isAllowed(user, { action: 'collection:edit', resource: collection() })).toBe(
      true,
    );
    expect(
      can(researcher, {
        action: 'collection:edit',
        resource: collection({ sharedWith: ['researcher-1'] }),
      }),
    ).toEqual({ allowed: false, reason: 'not_author' });
    expect(can(visitor, { action: 'collection:edit', resource: collection() })).toEqual({
      allowed: false,
      reason: 'sign_in_required',
    });
  });
});

describe('workspace and administration', () => {
  it('opens the workspace to staff only', () => {
    expect(isAllowed(user, { action: 'workspace:access' })).toBe(false);
    expect(isAllowed(researcher, { action: 'workspace:access' })).toBe(true);
    expect(isAllowed(admin, { action: 'workspace:access' })).toBe(true);
  });

  it('keeps user management, the audit log and analytics for admins', () => {
    for (const action of ['users:manage', 'audit:read', 'analytics:read'] as const) {
      expect(isAllowed(admin, { action })).toBe(true);
      expect(isAllowed(researcher, { action })).toBe(false);
      expect(can(visitor, { action })).toEqual({
        allowed: false,
        reason: 'sign_in_required',
      });
    }
  });
});
