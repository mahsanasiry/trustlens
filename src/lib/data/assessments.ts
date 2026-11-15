import { z } from 'zod';
import {
  assessmentCriteria,
  criterionStatuses,
  type AssessmentCriterion,
  type CriterionStatus,
} from '@/lib/domain/enums';

export const assessmentSchema = z.object({
  criterion: z.enum(assessmentCriteria),
  status: z.enum(criterionStatuses),
  notes: z.string(),
});

export type Assessment = z.infer<typeof assessmentSchema>;

export function assessmentByCriterion(
  assessments: readonly Assessment[],
): Map<AssessmentCriterion, Assessment> {
  return new Map(assessments.map((assessment) => [assessment.criterion, assessment]));
}

export function countStatuses(
  assessments: readonly Assessment[],
): Record<CriterionStatus, number> {
  const counts = Object.fromEntries(
    criterionStatuses.map((status) => [status, 0]),
  ) as Record<CriterionStatus, number>;
  for (const assessment of assessments) counts[assessment.status] += 1;
  return counts;
}
