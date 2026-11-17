import {
  assessmentCriteria,
  claimCategories,
  claimStatuses,
  criterionStatuses,
  evidencePositions,
  sourceTypes,
} from '@/lib/domain/enums';
import { claimsPageSize } from '@/lib/data/claim-params';
import { sourcesPageSize } from '@/lib/data/source-params';

type Schema = Record<string, unknown>;

const text: Schema = { type: 'string' };
const nullableDate: Schema = { type: ['string', 'null'], format: 'date' };
const dateTime: Schema = { type: 'string', format: 'date-time' };
const uri: Schema = { type: 'string', format: 'uri' };
const nullableUri: Schema = { type: ['string', 'null'], format: 'uri' };
const id: Schema = { type: 'string', format: 'uuid' };

const enumOf = (values: readonly string[]): Schema => ({ type: 'string', enum: values });
const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const array = (items: Schema): Schema => ({ type: 'array', items });

// Every listed property is required. The API always sends the full shape, with
// null for a missing value, so clients never have to test for absent keys.
function object(properties: Record<string, Schema>): Schema {
  return {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}

const page: Schema = {
  name: 'page',
  in: 'query',
  required: false,
  description: 'Page number, starting at 1.',
  schema: { type: 'integer', minimum: 1, maximum: 10_000, default: 1 },
};

const idParameter: Schema = {
  name: 'id',
  in: 'path',
  required: true,
  schema: id,
};

function jsonContent(schema: Schema): Schema {
  return { 'application/json': { schema } };
}

const errorResponse = (description: string): Schema => ({
  description,
  content: jsonContent(ref('Error')),
});

const failures = {
  '400': errorResponse('A query parameter has an unsupported value.'),
  '500': errorResponse('The request could not be completed.'),
};

const notFoundOnly = {
  '404': errorResponse('No published item has this id.'),
  '500': errorResponse('The request could not be completed.'),
};

function schemas(): Record<string, Schema> {
  const evidenceCounts = object(
    Object.fromEntries(
      evidencePositions.map((position) => [position, { type: 'integer' }]),
    ),
  );

  const claimBrief = {
    id,
    title: text,
    category: ref('ClaimCategory'),
    status: ref('ClaimStatus'),
    language: text,
    pageUrl: uri,
  };

  const sourceSummary = {
    id,
    title: text,
    publisher: text,
    type: ref('SourceType'),
    language: text,
    publishedOn: nullableDate,
    assessments: array(ref('Assessment')),
    pageUrl: uri,
  };

  return {
    ClaimCategory: enumOf(claimCategories),
    ClaimStatus: {
      ...enumOf(claimStatuses),
      description:
        'Where the evidence stands. These describe the state of the evidence, never whether a claim is true or false.',
    },
    EvidencePosition: enumOf(evidencePositions),
    SourceType: enumOf(sourceTypes),
    AssessmentCriterion: enumOf(assessmentCriteria),
    CriterionStatus: enumOf(criterionStatuses),
    EvidenceCounts: evidenceCounts,
    PageMeta: object({
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
      total: { type: 'integer' },
      pageCount: { type: 'integer' },
    }),
    Error: object({
      error: object({
        code: enumOf(['invalid_request', 'not_found', 'internal_error']),
        message: text,
      }),
    }),
    Assessment: object({
      criterion: ref('AssessmentCriterion'),
      status: ref('CriterionStatus'),
      notes: text,
    }),
    ClaimSummary: object({
      id,
      title: text,
      category: ref('ClaimCategory'),
      status: ref('ClaimStatus'),
      language: text,
      releasedAt: dateTime,
      evidenceCounts: ref('EvidenceCounts'),
      pageUrl: uri,
    }),
    ClaimBrief: object(claimBrief),
    EvidenceSource: object({
      id,
      title: text,
      publisher: text,
      url: nullableUri,
      publishedOn: nullableDate,
      type: ref('SourceType'),
      language: text,
    }),
    Evidence: object({
      id,
      title: text,
      summary: text,
      position: ref('EvidencePosition'),
      limitations: text,
      researcherNote: text,
      source: { oneOf: [ref('EvidenceSource'), { type: 'null' }] },
    }),
    StatusChange: object({
      id,
      from: ref('ClaimStatus'),
      to: ref('ClaimStatus'),
      reason: text,
      changedAt: dateTime,
    }),
    ClaimDetail: object({
      id,
      title: text,
      description: text,
      category: ref('ClaimCategory'),
      status: ref('ClaimStatus'),
      origin: text,
      originUrl: nullableUri,
      firstAppearedOn: nullableDate,
      language: text,
      version: { type: 'integer' },
      updatedAt: dateTime,
      evidenceCounts: ref('EvidenceCounts'),
      evidence: array(ref('Evidence')),
      statusHistory: array(ref('StatusChange')),
      related: array(ref('ClaimBrief')),
      pageUrl: uri,
    }),
    SourceSummary: object(sourceSummary),
    Citation: object({
      evidenceId: id,
      position: ref('EvidencePosition'),
      claim: ref('ClaimBrief'),
    }),
    SourceDetail: object({
      ...sourceSummary,
      url: nullableUri,
      authors: array(text),
      accessedOn: nullableDate,
      citedBy: array(ref('Citation')),
    }),
  };
}

function listResponse(item: string, description: string): Schema {
  return {
    description,
    content: jsonContent(object({ data: array(ref(item)), meta: ref('PageMeta') })),
  };
}

function itemResponse(item: string, description: string): Schema {
  return { description, content: jsonContent(object({ data: ref(item) })) };
}

export function buildOpenApiDocument(origin: URL): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'TrustLens API',
      version: '1.0.0',
      description:
        'Read-only access to published claims, evidence and sources. The API never labels a claim true or false; it reports where the evidence stands and how each source was assessed.',
    },
    servers: [{ url: new URL('/api/v1', origin).href }],
    tags: [
      { name: 'Claims', description: 'Published claims with their evidence.' },
      { name: 'Sources', description: 'Published sources and their assessments.' },
    ],
    paths: {
      '/claims': {
        get: {
          tags: ['Claims'],
          operationId: 'listClaims',
          summary: 'List published claims',
          description: `Newest first, ${claimsPageSize} per page.`,
          parameters: [
            {
              name: 'category',
              in: 'query',
              required: false,
              schema: ref('ClaimCategory'),
            },
            { name: 'status', in: 'query', required: false, schema: ref('ClaimStatus') },
            page,
          ],
          responses: {
            '200': listResponse('ClaimSummary', 'One page of claims.'),
            ...failures,
          },
        },
      },
      '/claims/{id}': {
        get: {
          tags: ['Claims'],
          operationId: 'getClaim',
          summary: 'Get one claim with its evidence and status history',
          parameters: [idParameter],
          responses: {
            '200': itemResponse('ClaimDetail', 'The claim.'),
            ...notFoundOnly,
          },
        },
      },
      '/sources': {
        get: {
          tags: ['Sources'],
          operationId: 'listSources',
          summary: 'List published sources',
          description: `Newest first, ${sourcesPageSize} per page.`,
          parameters: [
            { name: 'type', in: 'query', required: false, schema: ref('SourceType') },
            page,
          ],
          responses: {
            '200': listResponse('SourceSummary', 'One page of sources.'),
            ...failures,
          },
        },
      },
      '/sources/{id}': {
        get: {
          tags: ['Sources'],
          operationId: 'getSource',
          summary: 'Get one source with its assessments and the claims citing it',
          parameters: [idParameter],
          responses: {
            '200': itemResponse('SourceDetail', 'The source.'),
            ...notFoundOnly,
          },
        },
      },
    },
    components: { schemas: schemas() },
  };
}
