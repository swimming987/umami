import { useApi } from '../useApi';
import { useDateParameters } from '../useDateParameters';
import { usePagedQuery } from '../usePagedQuery';
import { useModified } from '../useModified';
import { ReactQueryOptions } from '@/lib/types';

export function useUserWebsitesQuery(
  { userId, teamId }: { userId?: string; teamId?: string },
  params?: Record<string, any>,
  options?: ReactQueryOptions,
) {
  const { get } = useApi();
  const { modified } = useModified(`websites`);
  const { startAt, endAt, unit, timezone } = useDateParameters();

  return usePagedQuery({
    queryKey: ['websites', { userId, teamId, modified, startAt, endAt, unit, timezone, ...params }],
    queryFn: pageParams => {
      return get(
        teamId
          ? `/teams/${teamId}/websites`
          : userId
            ? `/users/${userId}/websites`
            : '/me/websites',
        {
          startAt,
          endAt,
          unit,
          timezone,
          ...pageParams,
          ...params,
        },
      );
    },
    ...options,
  });
}
