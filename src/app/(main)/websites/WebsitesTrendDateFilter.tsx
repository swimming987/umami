'use client';
import { useCallback, useMemo } from 'react';
import { Button, Icon, Row } from '@umami/react-zen';
import { isAfter } from 'date-fns';
import { ChevronRight } from '@/components/icons';
import { useNavigation, useTrendDateRange } from '@/components/hooks';
import { getDateRangeValue } from '@/lib/date';
import { DateFilter } from '@/components/input/DateFilter';

export function WebsitesTrendDateFilter() {
  const { dateRange, isAllTime, isCustomRange } = useTrendDateRange();
  const {
    router,
    updateParams,
    query: { trendOffset = 0 },
  } = useNavigation();
  const disableForward = isAllTime || isAfter(dateRange.endDate, new Date());

  const handleChange = (trendDate: string) => {
    router.push(updateParams({ trendDate, trendOffset: undefined }));
  };

  const handleIncrement = useCallback(
    (increment: number) => {
      router.push(updateParams({ trendOffset: +trendOffset + increment }));
    },
    [trendOffset],
  );

  const dateValue = useMemo(() => {
    return trendOffset !== 0
      ? getDateRangeValue(dateRange.startDate, dateRange.endDate)
      : dateRange.value;
  }, [dateRange, trendOffset]);

  return (
    <Row gap>
      {!isAllTime && !isCustomRange && (
        <Row gap="1">
          <Button onPress={() => handleIncrement(-1)} variant="outline">
            <Icon rotate={180}>
              <ChevronRight />
            </Icon>
          </Button>
          <Button onPress={() => handleIncrement(1)} variant="outline" isDisabled={disableForward}>
            <Icon>
              <ChevronRight />
            </Icon>
          </Button>
        </Row>
      )}
      <Row minWidth="200px">
        <DateFilter
          value={dateValue}
          onChange={handleChange}
          showAllTime={true}
          renderDate={+trendOffset !== 0}
        />
      </Row>
    </Row>
  );
}
