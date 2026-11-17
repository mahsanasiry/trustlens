import { getSource } from '@/lib/data/sources';
import { guarded, notFound, ok, preflight } from '@/lib/api/respond';
import { sourceDetailDto } from '@/lib/api/serialize';
import { siteUrl } from '@/lib/site';

interface Context {
  params: Promise<{ id: string }>;
}

export function GET(_request: Request, { params }: Context) {
  return guarded(async () => {
    const { id } = await params;
    const source = await getSource(id);
    return source ? ok({ data: sourceDetailDto(siteUrl, source) }) : notFound('Source');
  });
}

export const OPTIONS = preflight;
