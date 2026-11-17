import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from '@/lib/api/openapi';
import { claimCategories, claimStatuses, sourceTypes } from '@/lib/domain/enums';

interface Operation {
  operationId: string;
  parameters?: { name: string; in: string }[];
  responses: Record<string, unknown>;
}

const document = buildOpenApiDocument(new URL('https://trustlens.example')) as {
  openapi: string;
  servers: { url: string }[];
  paths: Record<string, { get: Operation }>;
  components: { schemas: Record<string, { enum?: string[]; required?: string[] }> };
};

function collectRefs(value: unknown, found: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, found);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string') found.add(child);
      else collectRefs(child, found);
    }
  }
}

describe('OpenAPI document', () => {
  it('is version 3.1 and points at the versioned API', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(document.servers[0]?.url).toBe('https://trustlens.example/api/v1');
  });

  it('describes the four read endpoints', () => {
    expect(Object.keys(document.paths).sort()).toEqual([
      '/claims',
      '/claims/{id}',
      '/sources',
      '/sources/{id}',
    ]);
  });

  it('gives every operation a unique id and error responses', () => {
    const operations = Object.values(document.paths).map((path) => path.get);
    const ids = operations.map((operation) => operation.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const operation of operations) {
      expect(operation.responses).toHaveProperty('200');
      expect(operation.responses).toHaveProperty('500');
    }
  });

  it('resolves every reference to a defined schema', () => {
    const refs = new Set<string>();
    collectRefs(document.paths, refs);
    collectRefs(document.components, refs);
    expect(refs.size).toBeGreaterThan(0);
    for (const reference of refs) {
      const name = reference.replace('#/components/schemas/', '');
      expect(document.components.schemas).toHaveProperty(name);
    }
  });

  it('takes its allowed values from the domain, so it cannot drift', () => {
    const { schemas } = document.components;
    expect(schemas.ClaimCategory?.enum).toEqual([...claimCategories]);
    expect(schemas.ClaimStatus?.enum).toEqual([...claimStatuses]);
    expect(schemas.SourceType?.enum).toEqual([...sourceTypes]);
  });

  it('declares every property of an object as required', () => {
    const detail = document.components.schemas.SourceDetail as {
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(detail.required.sort()).toEqual(Object.keys(detail.properties).sort());
    expect(detail.required).toContain('citedBy');
    expect(detail.required).toContain('assessments');
  });

  it('offers no status that reads as a verdict', () => {
    const statuses = document.components.schemas.ClaimStatus?.enum ?? [];
    expect(statuses).not.toContain('true');
    expect(statuses).not.toContain('false');
  });
});
