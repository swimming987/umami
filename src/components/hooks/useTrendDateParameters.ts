import { useTrendDateRange } from './useTrendDateRange';
import { useTimezone } from './useTimezone';

export function useTrendDateParameters() {
  const {
    dateRange: { startDate, endDate, unit },
  } = useTrendDateRange();
  const { timezone, toUtc } = useTimezone();

  return {
    startAt: +toUtc(startDate),
    endAt: +toUtc(endDate),
    startDate: toUtc(startDate).toISOString(),
    endDate: toUtc(endDate).toISOString(),
    unit,
    timezone,
  };
}
