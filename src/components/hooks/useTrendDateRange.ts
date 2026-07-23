import { useNavigation } from '@/components/hooks/useNavigation';
import { useMemo } from 'react';
import { getOffsetDateRange, parseDateRange } from '@/lib/date';
import { useLocale } from '@/components/hooks/useLocale';

const DEFAULT_TREND_DATE_RANGE_VALUE = '7day';

export function useTrendDateRange(options: { ignoreOffset?: boolean } = {}) {
  const {
    query: { trendDate = DEFAULT_TREND_DATE_RANGE_VALUE, trendOffset = 0 },
  } = useNavigation();
  const { locale } = useLocale();

  const dateRange = useMemo(() => {
    const dateRangeObject = parseDateRange(trendDate || DEFAULT_TREND_DATE_RANGE_VALUE, locale);

    return !options.ignoreOffset && trendOffset
      ? getOffsetDateRange(dateRangeObject, +trendOffset)
      : dateRangeObject;
  }, [trendDate, trendOffset, options, locale]);

  return {
    trendDate,
    trendOffset,
    isAllTime: trendDate.endsWith(`:all`),
    isCustomRange: trendDate.startsWith('range:'),
    dateRange,
  };
}
