import { z } from 'zod';
import { unauthorized, json } from '@/lib/response';
import { canViewTeam } from '@/permissions';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { dateRangeParams, searchParams } from '@/lib/schema';
import { getTeamWebsitesTrend } from '@/queries/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const schema = z.object({
    ...dateRangeParams,
    ...searchParams,
  });
  const { teamId } = await params;
  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!(await canViewTeam(auth, teamId))) {
    return unauthorized();
  }

  const filters = await getQueryFilters(query);

  return json(await getTeamWebsitesTrend(teamId, filters));
}
