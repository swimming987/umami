import { Prisma } from '@/generated/prisma/client';
import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import redis from '@/lib/redis';
import prisma from '@/lib/prisma';
import { QueryFilters } from '@/lib/types';
import { ROLES } from '@/lib/constants';

export interface WebsiteStatsRow {
  id: string;
  name: string;
  domain: string | null;
  visitors: number;
  visits: number;
  pageviews: number;
  bounceRate: number;
  visitDuration: number;
}

export async function findWebsite(criteria: Prisma.WebsiteFindUniqueArgs) {
  return prisma.client.website.findUnique(criteria);
}

export async function getWebsite(websiteId: string) {
  return findWebsite({
    where: {
      id: websiteId,
    },
  });
}

export async function getSharedWebsite(shareId: string) {
  return findWebsite({
    where: {
      shareId,
      deletedAt: null,
    },
  });
}

export async function getWebsites(criteria: Prisma.WebsiteFindManyArgs, filters: QueryFilters) {
  const { search } = filters;
  const { getSearchParameters, pagedQuery } = prisma;

  const where: Prisma.WebsiteWhereInput = {
    ...criteria.where,
    ...getSearchParameters(search, [
      {
        name: 'contains',
      },
      { domain: 'contains' },
    ]),
    deletedAt: null,
  };

  return pagedQuery('website', { ...criteria, where }, filters);
}

export async function getAllUserWebsitesIncludingTeamOwner(userId: string, filters?: QueryFilters) {
  return getWebsites(
    {
      where: {
        OR: [
          { userId },
          {
            team: {
              deletedAt: null,
              members: {
                some: {
                  role: ROLES.teamOwner,
                  userId,
                },
              },
            },
          },
        ],
      },
    },
    {
      orderBy: 'name',
      ...filters,
    },
  );
}

function getWebsiteSearchWhere(search?: string): Prisma.WebsiteWhereInput | undefined {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { domain: { contains: search, mode: 'insensitive' } },
    ],
  };
}

function normalizeWebsiteStatsRow(row: Record<string, any>): WebsiteStatsRow {
  const visitors = Number(row.visitors ?? 0);
  const visits = Number(row.visits ?? 0);
  const pageviews = Number(row.pageviews ?? 0);
  const bounceRate = Number(row.bouncerate ?? row.bounceRate ?? 0);
  const visitDuration = Number(row.visitduration ?? row.visitDuration ?? 0);

  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    visitors,
    visits,
    pageviews,
    bounceRate: Number.isFinite(bounceRate) ? bounceRate : 0,
    visitDuration: Number.isFinite(visitDuration) ? visitDuration : 0,
  };
}

async function getWebsiteStatsPage(
  websiteWhere: Prisma.WebsiteWhereInput,
  filters: QueryFilters = {},
): Promise<any> {
  return runQuery({
    [PRISMA]: () => getRelationalWebsiteStatsPage(websiteWhere, filters),
    [CLICKHOUSE]: () => getClickhouseWebsiteStatsPage(websiteWhere, filters),
  });
}

async function getRelationalWebsiteStatsPage(
  websiteWhere: Prisma.WebsiteWhereInput,
  filters: QueryFilters,
) {
  const { page = 1, pageSize } = filters;
  const size = +pageSize || 20;
  const offset = +size * (+page - 1);
  const count = await prisma.client.website.count({ where: websiteWhere });
  const search = filters.search?.trim();
  const queryParams: Record<string, any> = {
    startDate: filters.startDate,
    endDate: filters.endDate,
    limit: size,
    offset,
  };

  let searchQuery = '';

  if (search) {
    queryParams.search = `%${search}%`;
    searchQuery = `and (website.name ilike {{search}} or website.domain ilike {{search}})`;
  }

  const data = await prisma.rawQuery(
    `
    with filtered_websites as (
      select
        website.website_id as "id",
        website.name,
        website.domain
      from website
      where website.deleted_at is null
        ${websiteWhere.userId ? `and website.user_id = {{userId::uuid}}` : ''}
        ${websiteWhere.teamId ? `and website.team_id = {{teamId::uuid}}` : ''}
        ${searchQuery}
    ),
    visit_stats as (
      select
        website_event.website_id,
        website_event.session_id,
        website_event.visit_id,
        count(*) as "views",
        min(website_event.created_at) as "min_time",
        max(website_event.created_at) as "max_time"
      from website_event
      join filtered_websites on filtered_websites.id = website_event.website_id
      where website_event.created_at between {{startDate}} and {{endDate}}
        and website_event.event_type != 2
      group by 1, 2, 3
    ),
    website_stats as (
      select
        visit_stats.website_id,
        count(distinct visit_stats.session_id) as "visitors",
        count(distinct visit_stats.visit_id) as "visits",
        sum(visit_stats.views) as "pageviews",
        sum(case when visit_stats.views = 1 then 1 else 0 end) as "bounces",
        sum(extract(epoch from (visit_stats.max_time - visit_stats.min_time))) as "totaltime"
      from visit_stats
      group by 1
    )
    select
      filtered_websites.id,
      filtered_websites.name,
      filtered_websites.domain,
      coalesce(website_stats.visitors, 0) as "visitors",
      coalesce(website_stats.visits, 0) as "visits",
      coalesce(website_stats.pageviews, 0) as "pageviews",
      case
        when coalesce(website_stats.visits, 0) > 0
          then round((least(website_stats.visits, website_stats.bounces)::numeric / website_stats.visits::numeric) * 100, 2)
        else 0
      end as "bounceRate",
      case
        when coalesce(website_stats.visits, 0) > 0
          then round(website_stats.totaltime::numeric / website_stats.visits::numeric, 2)
        else 0
      end as "visitDuration"
    from filtered_websites
    left join website_stats on website_stats.website_id = filtered_websites.id
    order by "visitors" desc, filtered_websites.name asc
    limit {{limit}} offset {{offset}}
    `,
    {
      ...queryParams,
      userId: websiteWhere.userId,
      teamId: websiteWhere.teamId,
    },
  );

  return {
    data: data.map(normalizeWebsiteStatsRow),
    count,
    page: +page,
    pageSize: size,
    orderBy: 'visitors',
    sortDescending: true,
    search: filters.search,
  };
}

async function getClickhouseWebsiteStatsPage(
  websiteWhere: Prisma.WebsiteWhereInput,
  filters: QueryFilters,
) {
  const { page = 1, pageSize } = filters;
  const size = +pageSize || 20;
  const offset = +size * (+page - 1);
  const websites = await prisma.client.website.findMany({
    where: websiteWhere,
    select: {
      id: true,
      name: true,
      domain: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  if (!websites.length) {
    return {
      data: [],
      count: 0,
      page: +page,
      pageSize: size,
      orderBy: 'visitors',
      sortDescending: true,
      search: filters.search,
    };
  }

  const ids = websites.map(website => website.id);
  const idList = ids.map(id => `'${id}'`).join(', ');
  const stats = await clickhouse.rawQuery<any[]>(
    `
    select
      website_id as "id",
      uniq(session_id) as "visitors",
      uniq(visit_id) as "visits",
      count() as "pageviews",
      sumIf(1, views = 1) as "bounces",
      sum(max_time - min_time) as "totaltime"
    from (
      select
        website_id,
        session_id,
        visit_id,
        count(*) as views,
        min(created_at) as min_time,
        max(created_at) as max_time
      from website_event
      where website_id in (${idList})
        and created_at between {startDate:DateTime64} and {endDate:DateTime64}
        and event_type != 2
      group by website_id, session_id, visit_id
    ) t
    group by website_id
    `,
    {
      startDate: filters.startDate,
      endDate: filters.endDate,
    },
  );

  const statsMap = new Map(
    stats.map(row => {
      const visits = Number(row.visits ?? 0);
      const bounces = Number(row.bounces ?? 0);
      const totaltime = Number(row.totaltime ?? 0);

      return [
        row.id,
        {
          visitors: Number(row.visitors ?? 0),
          visits,
          pageviews: Number(row.pageviews ?? 0),
          bounceRate: visits > 0 ? (Math.min(visits, bounces) / visits) * 100 : 0,
          visitDuration: visits > 0 ? totaltime / visits : 0,
        },
      ];
    }),
  );

  const data = websites
    .map(website =>
      normalizeWebsiteStatsRow({
        ...website,
        ...(statsMap.get(website.id) ?? {}),
      }),
    )
    .sort((a, b) => {
      if (b.visitors !== a.visitors) {
        return b.visitors - a.visitors;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(offset, offset + size);

  return {
    data,
    count: websites.length,
    page: +page,
    pageSize: size,
    orderBy: 'visitors',
    sortDescending: true,
    search: filters.search,
  };
}

export async function getUserWebsites(userId: string, filters?: QueryFilters) {
  return getWebsites(
    {
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            username: true,
            id: true,
          },
        },
      },
    },
    {
      orderBy: 'name',
      ...filters,
    },
  );
}

export async function getUserWebsitesWithStats(userId: string, filters?: QueryFilters) {
  return getWebsiteStatsPage(
    {
      userId,
      deletedAt: null,
      ...getWebsiteSearchWhere(filters?.search),
    },
    filters,
  );
}

export async function getTeamWebsites(teamId: string, filters?: QueryFilters) {
  return getWebsites(
    {
      where: {
        teamId,
      },
      include: {
        createUser: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
    filters,
  );
}

export async function getTeamWebsitesWithStats(teamId: string, filters?: QueryFilters) {
  return getWebsiteStatsPage(
    {
      teamId,
      deletedAt: null,
      ...getWebsiteSearchWhere(filters?.search),
    },
    filters,
  );
}

export async function createWebsite(
  data: Prisma.WebsiteCreateInput | Prisma.WebsiteUncheckedCreateInput,
) {
  return prisma.client.website.create({
    data,
  });
}

export async function updateWebsite(
  websiteId: string,
  data: Prisma.WebsiteUpdateInput | Prisma.WebsiteUncheckedUpdateInput,
) {
  return prisma.client.website.update({
    where: {
      id: websiteId,
    },
    data,
  });
}

export async function resetWebsite(websiteId: string) {
  const { client, transaction } = prisma;
  const cloudMode = !!process.env.CLOUD_MODE;

  return transaction([
    client.eventData.deleteMany({
      where: { websiteId },
    }),
    client.sessionData.deleteMany({
      where: { websiteId },
    }),
    client.websiteEvent.deleteMany({
      where: { websiteId },
    }),
    client.session.deleteMany({
      where: { websiteId },
    }),
    client.website.update({
      where: { id: websiteId },
      data: {
        resetAt: new Date(),
      },
    }),
  ]).then(async data => {
    if (cloudMode) {
      await redis.client.set(
        `website:${websiteId}`,
        data.find(website => website.id),
      );
    }

    return data;
  });
}

export async function deleteWebsite(websiteId: string) {
  const { client, transaction } = prisma;
  const cloudMode = !!process.env.CLOUD_MODE;

  return transaction([
    client.eventData.deleteMany({
      where: { websiteId },
    }),
    client.sessionData.deleteMany({
      where: { websiteId },
    }),
    client.websiteEvent.deleteMany({
      where: { websiteId },
    }),
    client.session.deleteMany({
      where: { websiteId },
    }),
    client.report.deleteMany({
      where: {
        websiteId,
      },
    }),
    cloudMode
      ? client.website.update({
          data: {
            deletedAt: new Date(),
          },
          where: { id: websiteId },
        })
      : client.website.delete({
          where: { id: websiteId },
        }),
  ]).then(async data => {
    if (cloudMode) {
      await redis.client.del(`website:${websiteId}`);
    }

    return data;
  });
}

export async function getWebsiteCount(userId: string) {
  return prisma.client.website.count({
    where: {
      userId,
      deletedAt: null,
    },
  });
}
