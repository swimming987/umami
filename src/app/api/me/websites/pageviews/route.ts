import { z } from 'zod';
import { dateRangeParams, searchParams } from '@/lib/schema';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json } from '@/lib/response';
import { getUserWebsitesTrend } from '@/queries/prisma';

export async function GET(request: Request) {
  const schema = z.object({
    ...dateRangeParams,
    ...searchParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const filters = await getQueryFilters(query);

  return json(await getUserWebsitesTrend(auth.user.id, filters));
}
