import { listClaims } from '@/lib/data/claims';
import { parseClaimQuery } from '@/lib/api/query';
import { apiError, guarded, ok, preflight } from '@/lib/api/respond';
import { claimListDto } from '@/lib/api/serialize';
import { siteUrl } from '@/lib/site';

export function GET(request: Request) {
  return guarded(async () => {
    const query = parseClaimQuery(new URL(request.url).searchParams);
    if (!query.ok) return apiError(400, 'invalid_request', query.message);
    return ok(claimListDto(siteUrl, await listClaims(query.value)));
  });
}

export const OPTIONS = preflight;
