import { z } from 'zod';
import { unauthorized, json } from '@/lib/response';
import { dateRangeParams, pagingParams, searchParams } from '@/lib/schema';
import { getQueryFilters, parseRequest } from '@/lib/request';
import {
  getAllUserWebsitesIncludingTeamOwner,
  getUserWebsites,
  getUserWebsitesWithStats,
} from '@/queries/prisma/website';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const schema = z.object({
    ...pagingParams,
    ...searchParams,
    ...dateRangeParams,
    includeTeams: z.string().optional(),
    includeStats: z.string().optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { userId } = await params;

  if (!auth.user.isAdmin && auth.user.id !== userId) {
    return unauthorized();
  }

  const filters = await getQueryFilters(query);

  if (query.includeTeams) {
    return json(await getAllUserWebsitesIncludingTeamOwner(userId, filters));
  }

  if (query.includeStats) {
    return json(await getUserWebsitesWithStats(userId, filters));
  }

  return json(await getUserWebsites(userId, filters));
}
