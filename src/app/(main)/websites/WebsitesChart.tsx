'use client';
import { useMemo } from 'react';
import { Row } from '@umami/react-zen';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useTrendDateRange, useWebsitesPageviewsQuery } from '@/components/hooks';
import { PageviewsChart } from '@/components/metrics/PageviewsChart';
import { WebsitesTrendDateFilter } from './WebsitesTrendDateFilter';

export function WebsitesChart({ teamId }: { teamId?: string }) {
  const { dateRange } = useTrendDateRange();
  const { startDate, endDate, unit, value } = dateRange;
  const { data, isLoading, isFetching, error } = useWebsitesPageviewsQuery({ teamId });

  const chartData = useMemo(() => {
    return {
      pageviews: data?.pageviews || [],
      sessions: data?.sessions || [],
    };
  }, [data]);

  return (
    <LoadingPanel data={data} isFetching={isFetching} isLoading={isLoading} error={error}>
      <Row justifyContent="flex-end" marginBottom="4">
        <WebsitesTrendDateFilter />
      </Row>
      <PageviewsChart
        key={value}
        data={chartData}
        minDate={startDate}
        maxDate={endDate}
        unit={unit}
        height="320px"
      />
    </LoadingPanel>
  );
}
