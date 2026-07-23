'use client';
import { useMemo } from 'react';
import { useTheme } from '@umami/react-zen';
import { getThemeColors } from '@/lib/colors';
import { generateTimeSeries, parseDateRange } from '@/lib/date';
import { useApi, useFilterParameters, useLocale, useTimezone } from '@/components/hooks';

const WIDTH = 140;
const HEIGHT = 36;
const PADDING = 2;
const RANGE = parseDateRange('7day');

type TrendSeries = { x: string; y: number }[];

function createPath(data: TrendSeries) {
  const normalized = data.map(item => Number(item.y) || 0);
  const max = Math.max(...normalized, 1);
  const min = Math.min(...normalized, 0);
  const range = Math.max(max - min, 1);

  return normalized
    .map((value, index) => {
      const x =
        data.length > 1 ? PADDING + (index / (data.length - 1)) * (WIDTH - PADDING * 2) : WIDTH / 2;
      const y = HEIGHT - PADDING - ((value - min) / range) * (HEIGHT - PADDING * 2);

      return `${x},${y}`;
    })
    .join(' ');
}

export function WebsiteTrend({ websiteId }: { websiteId: string }) {
  const { get, useQuery } = useApi();
  const { timezone, toUtc } = useTimezone();
  const queryParams = useFilterParameters();
  const { dateLocale } = useLocale();
  const { theme } = useTheme();
  const { colors } = useMemo(() => getThemeColors(theme), [theme]);
  const startAt = +toUtc(RANGE.startDate);
  const endAt = +toUtc(RANGE.endDate);

  const { data } = useQuery<{
    pageviews: TrendSeries;
    sessions: TrendSeries;
  }>({
    queryKey: ['website:trend:7day', { websiteId, timezone, startAt, endAt, ...queryParams }],
    queryFn: () =>
      get(`/websites/${websiteId}/pageviews`, {
        startAt,
        endAt,
        unit: 'day',
        timezone,
        ...queryParams,
      }),
    enabled: !!websiteId,
  });

  const sessions = useMemo(
    () =>
      generateTimeSeries(data?.sessions || [], RANGE.startDate, RANGE.endDate, 'day', dateLocale),
    [data, dateLocale],
  );

  const pageviews = useMemo(
    () =>
      generateTimeSeries(data?.pageviews || [], RANGE.startDate, RANGE.endDate, 'day', dateLocale),
    [data, dateLocale],
  );

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label="7 day trend"
      role="img"
    >
      <polyline
        fill="none"
        stroke={colors.chart.views.borderColor}
        strokeWidth="1.5"
        points={createPath(pageviews)}
        opacity="0.7"
      />
      <polyline
        fill="none"
        stroke={colors.chart.visitors.borderColor}
        strokeWidth="2"
        points={createPath(sessions)}
      />
    </svg>
  );
}
