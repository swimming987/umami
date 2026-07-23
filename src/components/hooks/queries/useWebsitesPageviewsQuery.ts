import { useApi } from '../useApi';
import { useFilterParameters } from '../useFilterParameters';
import { useTrendDateParameters } from '../useTrendDateParameters';
import { ReactQueryOptions } from '@/lib/types';

export interface WebsitesPageviewsData {
  pageviews: { x: string; y: number }[];
  sessions: { x: string; y: number }[];
}

export function useWebsitesPageviewsQuery(
  { teamId }: { teamId?: string },
  options?: ReactQueryOptions<WebsitesPageviewsData>,
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useTrendDateParameters();
  const queryParams = useFilterParameters();

  return useQuery<WebsitesPageviewsData>({
    queryKey: [
      'websites:pageviews:all',
      { teamId, startAt, endAt, unit, timezone, ...queryParams },
    ],
    queryFn: () =>
      get(teamId ? `/teams/${teamId}/websites/pageviews` : '/me/websites/pageviews', {
        startAt,
        endAt,
        unit,
        timezone,
        ...queryParams,
      }),
    ...options,
  });
}
