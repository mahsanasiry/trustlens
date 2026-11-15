import type { ClaimCategory, SourceType } from './enums';

/**
 * Colour only groups source types visually; the type is always written out
 * next to the icon, so nothing depends on telling the hues apart.
 */
export const sourceTypeTone: Record<SourceType, ClaimCategory> = {
  journal_article: 'science',
  preprint: 'science',
  report: 'public_policy',
  government_document: 'public_policy',
  dataset: 'technology',
  news_article: 'social_issues',
  press_release: 'social_issues',
  book: 'education',
  website: 'environment',
  other: 'technology',
};
