import { getClaim } from '@/lib/data/claims';
import { guarded, notFound, ok, preflight } from '@/lib/api/respond';
import { claimDetailDto } from '@/lib/api/serialize';
import { siteUrl } from '@/lib/site';

interface Context {
  params: Promise<{ id: string }>;
}

export function GET(_request: Request, { params }: Context) {
  return guarded(async () => {
    const { id } = await params;
    const view = await getClaim(id);
    return view ? ok({ data: claimDetailDto(siteUrl, view) }) : notFound('Claim');
  });
}

export const OPTIONS = preflight;
