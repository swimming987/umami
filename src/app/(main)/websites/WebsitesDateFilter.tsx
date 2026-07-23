'use client';
import { useCallback, useMemo } from 'react';
import { Button, Icon, Row } from '@umami/react-zen';
import { isAfter } from 'date-fns';
import { ChevronRight } from '@/components/icons';
import { useDateRange, useNavigation } from '@/components/hooks';
import { getDateRangeValue } from '@/lib/date';
import { DateFilter } from '@/components/input/DateFilter';

export function WebsitesDateFilter() {
  const { dateRange, isAllTime, isCustomRange } = useDateRange();
  const {
    router,
    updateParams,
    query: { offset = 0 },
  } = useNavigation();
  const disableForward = isAllTime || isAfter(dateRange.endDate, new Date());

  const handleChange = (date: string) => {
    router.push(updateParams({ date, offset: undefined }));
  };

  const handleIncrement = useCallback(
    (increment: number) => {
      router.push(updateParams({ offset: +offset + increment }));
    },
    [offset],
  );

  const dateValue = useMemo(() => {
    return offset !== 0
      ? getDateRangeValue(dateRange.startDate, dateRange.endDate)
      : dateRange.value;
  }, [dateRange, offset]);

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
          renderDate={+offset !== 0}
        />
      </Row>
    </Row>
  );
}
