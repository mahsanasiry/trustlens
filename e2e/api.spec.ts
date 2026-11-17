import { expect, test } from '@playwright/test';

interface ListBody {
  data: { id: string }[];
  meta: { page: number; pageSize: number; total: number; pageCount: number };
}

test.describe('public API', () => {
  test('lists claims with paging details and open CORS', async ({ request }) => {
    const response = await request.get('/api/v1/claims');
    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['cache-control']).toContain('s-maxage=60');

    const body = (await response.json()) as ListBody;
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta).toMatchObject({ page: 1, pageSize: 12 });
    expect(body.meta.total).toBeGreaterThanOrEqual(body.data.length);
  });

  test('returns one claim with its evidence', async ({ request }) => {
    const list = (await (await request.get('/api/v1/claims')).json()) as ListBody;
    const id = list.data[0]?.id;
    expect(id).toBeTruthy();

    const response = await request.get(`/api/v1/claims/${id}`);
    expect(response.status()).toBe(200);
    const { data } = (await response.json()) as {
      data: {
        id: string;
        evidence: unknown[];
        statusHistory: unknown[];
        pageUrl: string;
      };
    };
    expect(data.id).toBe(id);
    expect(Array.isArray(data.evidence)).toBe(true);
    expect(Array.isArray(data.statusHistory)).toBe(true);
    expect(data.pageUrl).toContain(`/claims/${id}`);
  });

  test('returns one source with the claims that cite it', async ({ request }) => {
    const list = (await (await request.get('/api/v1/sources')).json()) as ListBody;
    const id = list.data[0]?.id;
    expect(id).toBeTruthy();

    const response = await request.get(`/api/v1/sources/${id}`);
    expect(response.status()).toBe(200);
    const { data } = (await response.json()) as { data: { citedBy: unknown[] } };
    expect(Array.isArray(data.citedBy)).toBe(true);
  });

  test('rejects a filter value it does not know', async ({ request }) => {
    const response = await request.get('/api/v1/claims?category=sports');
    expect(response.status()).toBe(400);
    expect(response.headers()['cache-control']).toBe('no-store');
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('invalid_request');
    expect(body.error.message).toContain('category');
  });

  test('answers 404 for an id that does not exist', async ({ request }) => {
    const response = await request.get(
      '/api/v1/claims/00000000-0000-4000-8000-000000000000',
    );
    expect(response.status()).toBe(404);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('not_found');
  });

  test('answers a browser preflight request', async ({ request }) => {
    const response = await request.fetch('/api/v1/claims', { method: 'OPTIONS' });
    expect(response.status()).toBe(204);
    expect(response.headers()['access-control-allow-methods']).toContain('GET');
  });

  test('serves its own OpenAPI description', async ({ request }) => {
    const response = await request.get('/api/v1/openapi.json');
    expect(response.status()).toBe(200);
    const document = (await response.json()) as { openapi: string; paths: object };
    expect(document.openapi).toBe('3.1.0');
    expect(Object.keys(document.paths)).toHaveLength(4);
  });
});

test.describe('installable app files', () => {
  test('the manifest names the app', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);
    const manifest = (await response.json()) as { name: string; display: string };
    expect(manifest.name).toBe('TrustLens');
    expect(manifest.display).toBe('standalone');
  });

  test('the offline page and the worker are served, the worker uncached', async ({
    request,
  }) => {
    expect((await request.get('/offline.html')).status()).toBe(200);
    const worker = await request.get('/sw.js');
    expect(worker.status()).toBe(200);
    expect(worker.headers()['cache-control']).toContain('no-cache');
  });
});
