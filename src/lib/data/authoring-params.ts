import { z } from 'zod';
import {
  assessmentCriteria,
  criterionStatuses,
  evidencePositions,
  type AssessmentCriterion,
  type CriterionStatus,
  type EvidencePosition,
} from '@/lib/domain/enums';
import { isEntityId } from './params';
import { field, optionalText, text } from './studio-params';

export interface EvidenceInput {
  source_id: string;
  title: string;
  summary: string;
  position: EvidencePosition;
  limitations: string;
  researcher_note: string;
}

const evidenceSchema = z.object({
  source_id: z.string().refine(isEntityId),
  title: text(3, 300),
  summary: text(1, 5000),
  position: z.enum(evidencePositions),
  limitations: optionalText(3000),
  researcher_note: optionalText(3000),
});

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: 'invalid' };

export function parseEvidenceInput(form: FormData): Parsed<EvidenceInput> {
  const parsed = evidenceSchema.safeParse({
    source_id: field(form, 'source_id'),
    title: field(form, 'title'),
    summary: field(form, 'summary'),
    position: field(form, 'position'),
    limitations: field(form, 'limitations'),
    researcher_note: field(form, 'researcher_note'),
  });
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: 'invalid' };
}

export interface AssessmentInput {
  criterion: AssessmentCriterion;
  status: CriterionStatus;
  notes: string;
}

const assessmentSchema = z.object({
  criterion: z.enum(assessmentCriteria),
  status: z.enum(criterionStatuses),
  notes: optionalText(3000),
});

export function parseAssessmentInput(form: FormData): Parsed<AssessmentInput> {
  const parsed = assessmentSchema.safeParse({
    criterion: field(form, 'criterion'),
    status: field(form, 'status'),
    notes: field(form, 'notes'),
  });
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: 'invalid' };
}

export function readField(form: FormData, name: string): string | null {
  const value = form.get(name);
  return typeof value === 'string' && isEntityId(value) ? value : null;
}

export function isCriterion(value: string): value is AssessmentCriterion {
  return (assessmentCriteria as readonly string[]).includes(value);
}

export function parseSummary(form: FormData): Parsed<string> {
  const parsed = text(3, 500).safeParse(field(form, 'change_summary'));
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: 'invalid' };
}

/**
 * The fields of a proposal that differ from the published item. A revision names
 * only what it changes, so a field that is the same is left out.
 */
export function changedFields(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const changed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next)) {
    if (JSON.stringify(current[key]) !== JSON.stringify(value)) changed[key] = value;
  }
  return changed;
}
