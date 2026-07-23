'use client';
import { useMemo } from 'react';
import { useTheme } from '@umami/react-zen';
import { getThemeColors } from '@/lib/colors';
import { generateTimeSeries, parseDateRange } from '@/lib/date';
import {
  useApi,
  useFilterParameters,
  useLocale,
  useNavigation,
  useTimezone,
} from '@/components/hooks';

const WIDTH = 140;
const HEIGHT = 36;
const PADDING_X = 2;
const PADDING_TOP = 5;
const PADDING_BOTTOM = 3;
const DEFAULT_RANGE = '7day';
const ALLOWED_RANGES = ['7day', '30day', '90day'];

type TrendSeries = { x: string; y: number }[];

function createPath(data: TrendSeries, maxValue: number) {
  return data
    .map((value, index) => {
      const x =
        data.length > 1
          ? PADDING_X + (index / (data.length - 1)) * (WIDTH - PADDING_X * 2)
          : WIDTH / 2;
      const y =
        HEIGHT -
        PADDING_BOTTOM -
        ((Number(value.y) || 0) / Math.max(maxValue, 1)) * (HEIGHT - PADDING_TOP - PADDING_BOTTOM);

      return `${x},${y}`;
    })
    .join(' ');
}

export function WebsiteTrend({ websiteId, maxValue }: { websiteId: string; maxValue: number }) {
  const { get, useQuery } = useApi();
  const {
    query: { trend = DEFAULT_RANGE },
  } = useNavigation();
  const { timezone, toUtc } = useTimezone();
  const queryParams = useFilterParameters();
  const { dateLocale } = useLocale();
  const { theme } = useTheme();
  const { colors } = useMemo(() => getThemeColors(theme), [theme]);
  const trendRange = ALLOWED_RANGES.includes(trend) ? trend : DEFAULT_RANGE;
  const range = useMemo(() => parseDateRange(trendRange), [trendRange]);
  const startAt = +toUtc(range.startDate);
  const endAt = +toUtc(range.endDate);

  const { data } = useQuery<{
    pageviews: TrendSeries;
    sessions: TrendSeries;
  }>({
    queryKey: [
      'website:trend',
      { websiteId, trendRange, timezone, startAt, endAt, ...queryParams },
    ],
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

  const sessions = generateTimeSeries(
    data?.sessions || [],
    range.startDate,
    range.endDate,
    'day',
    dateLocale,
  );

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={`${trendRange} trend`}
      role="img"
    >
      <line
        x1={PADDING_X}
        x2={WIDTH - PADDING_X}
        y1={HEIGHT - PADDING_BOTTOM}
        y2={HEIGHT - PADDING_BOTTOM}
        stroke={colors.chart.line}
        strokeWidth="1"
      />
      <polyline
        fill="none"
        stroke={colors.chart.visitors.borderColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={createPath(sessions, maxValue)}
      />
    </svg>
  );
}
