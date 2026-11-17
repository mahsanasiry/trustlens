import { listSources } from '@/lib/data/sources';
import { parseSourceQuery } from '@/lib/api/query';
import { apiError, guarded, ok, preflight } from '@/lib/api/respond';
import { sourceListDto } from '@/lib/api/serialize';
import { siteUrl } from '@/lib/site';

export function GET(request: Request) {
  return guarded(async () => {
    const query = parseSourceQuery(new URL(request.url).searchParams);
    if (!query.ok) return apiError(400, 'invalid_request', query.message);
    return ok(sourceListDto(siteUrl, await listSources(query.value)));
  });
}

export const OPTIONS = preflight;
