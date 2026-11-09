export const appRoles = ['user', 'researcher', 'admin'] as const;
export type AppRole = (typeof appRoles)[number];

export const contentStates = [
  'draft',
  'pending_review',
  'changes_requested',
  'published',
  'rejected',
] as const;
export type ContentState = (typeof contentStates)[number];

export const claimStatuses = [
  'unreviewed',
  'under_review',
  'evidence_available',
  'conflicting_evidence',
  'insufficient_evidence',
  'archived',
] as const;
export type ClaimStatus = (typeof claimStatuses)[number];

export const claimCategories = [
  'science',
  'education',
  'environment',
  'technology',
  'social_issues',
  'public_policy',
] as const;
export type ClaimCategory = (typeof claimCategories)[number];

export const evidencePositions = ['supports', 'contradicts', 'context'] as const;
export type EvidencePosition = (typeof evidencePositions)[number];

export const sourceTypes = [
  'journal_article',
  'report',
  'dataset',
  'news_article',
  'government_document',
  'press_release',
  'book',
  'website',
  'preprint',
  'other',
] as const;
export type SourceType = (typeof sourceTypes)[number];

export const assessmentCriteria = [
  'author_transparency',
  'publisher_transparency',
  'citations_present',
  'publication_date',
  'data_collection_method',
  'independent_verifiability',
  'conflict_of_interest',
  'corrections_history',
] as const;
export type AssessmentCriterion = (typeof assessmentCriteria)[number];

export const criterionStatuses = [
  'verified',
  'partially_verified',
  'not_verified',
  'not_applicable',
] as const;
export type CriterionStatus = (typeof criterionStatuses)[number];

export const collectionVisibilities = ['private', 'public', 'unlisted'] as const;
export type CollectionVisibility = (typeof collectionVisibilities)[number];

export const contentEntities = ['claim', 'source', 'evidence', 'assessment'] as const;
export type ContentEntity = (typeof contentEntities)[number];

export const reviewTargets = [
  'claim',
  'source',
  'evidence',
  'assessment',
  'revision',
  'report',
] as const;
export type ReviewTarget = (typeof reviewTargets)[number];

export const reviewDecisions = ['approved', 'rejected', 'changes_requested'] as const;
export type ReviewDecision = (typeof reviewDecisions)[number];

export const reportKinds = [
  'broken_source',
  'incorrect_information',
  'suggest_source',
  'add_contradicting_evidence',
  'request_correction',
] as const;
export type ReportKind = (typeof reportKinds)[number];

export const reportStatuses = ['open', 'in_review', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const notificationTypes = [
  'report_status_changed',
  'review_decision',
  'new_evidence',
  'collection_shared',
  'correction_published',
] as const;
export type NotificationType = (typeof notificationTypes)[number];
