import { buildOpenApiDocument } from '@/lib/api/openapi';
import { ok, preflight } from '@/lib/api/respond';
import { siteUrl } from '@/lib/site';

export function GET() {
  return ok(buildOpenApiDocument(siteUrl));
}

export const OPTIONS = preflight;
