// The API is public and read-only, so any origin may call it from a browser.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
} as const;

// Published content changes rarely. A short shared cache keeps a burst of
// requests off the database, and stale responses are served while it refreshes.
const cacheable = 'public, s-maxage=60, stale-while-revalidate=300';

export type ApiErrorCode = 'invalid_request' | 'not_found' | 'internal_error';

export function ok(body: unknown): Response {
  return Response.json(body, {
    headers: { ...corsHeaders, 'Cache-Control': cacheable },
  });
}

export function apiError(
  status: 400 | 404 | 500,
  code: ApiErrorCode,
  message: string,
): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } },
  );
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export const notFound = (what: string) =>
  apiError(404, 'not_found', `${what} not found.`);

// Database messages stay in the server log; the caller gets a fixed message.
export async function guarded(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    console.error(
      'API request failed:',
      error instanceof Error ? `${error.name}: ${error.message}` : JSON.stringify(error),
    );
    return apiError(500, 'internal_error', 'The request could not be completed.');
  }
}
