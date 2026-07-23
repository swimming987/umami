'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@umami/react-zen';
import { Chart } from '@/components/charts/Chart';
import { getThemeColors } from '@/lib/colors';
import { renderDateLabels, renderNumberLabels } from '@/lib/charts';
import { DATE_FORMATS, formatDate, generateTimeSeries, parseDateRange } from '@/lib/date';
import {
  useApi,
  useFilterParameters,
  useLocale,
  useMessages,
  useNavigation,
  useTimezone,
} from '@/components/hooks';

const WIDTH = 240;
const HEIGHT = 36;
const PADDING_X = 4;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 4;
const DEFAULT_RANGE = '7day';
const ALLOWED_RANGES = ['7day', '30day', '90day'];
const PREVIEW_WIDTH = 460;
const PREVIEW_HEIGHT = 260;
const PREVIEW_MARGIN = 12;

type TrendSeries = { x: string; y: number }[];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createPath(data: TrendSeries, maxValue: number) {
  return data
    .map((value, index) => {
      const x =
        data.length > 1
          ? PADDING_X + (index / (data.length - 1)) * (WIDTH - PADDING_X * 2)
          : WIDTH / 2;
      const drawableHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
      const y = clamp(
        HEIGHT - PADDING_BOTTOM - ((Number(value.y) || 0) / Math.max(maxValue, 1)) * drawableHeight,
        PADDING_TOP,
        HEIGHT - PADDING_BOTTOM,
      );

      return `${x},${y}`;
    })
    .join(' ');
}

function getPreviewPosition(rect: DOMRect) {
  const left = clamp(
    rect.left + rect.width / 2 - PREVIEW_WIDTH / 2,
    16,
    window.innerWidth - PREVIEW_WIDTH - 16,
  );
  const top =
    rect.bottom + PREVIEW_MARGIN + PREVIEW_HEIGHT <= window.innerHeight
      ? rect.bottom + PREVIEW_MARGIN
      : rect.top - PREVIEW_HEIGHT - PREVIEW_MARGIN;

  return {
    left,
    top: clamp(top, 16, window.innerHeight - PREVIEW_HEIGHT - 16),
  };
}

function getAxisMax(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 5;

  const withHeadroom = value * 1.15;
  const magnitude = 10 ** Math.floor(Math.log10(withHeadroom));
  const normalized = withHeadroom / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return nice * magnitude;
}

export function WebsiteTrend({ websiteId, maxValue }: { websiteId: string; maxValue: number }) {
  const { get, useQuery } = useApi();
  const { formatMessage, labels } = useMessages();
  const {
    query: { trend = DEFAULT_RANGE },
  } = useNavigation();
  const { timezone, toUtc } = useTimezone();
  const queryParams = useFilterParameters();
  const { locale, dateLocale } = useLocale();
  const { theme } = useTheme();
  const { colors } = useMemo(() => getThemeColors(theme), [theme]);
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ left: 0, top: 0 });
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
  const previewChartData = useMemo(() => {
    return {
      __id: `${websiteId}-${trendRange}`,
      datasets: [
        {
          type: 'line' as const,
          label: formatMessage(labels.visitors),
          data: sessions,
          borderWidth: 2,
          borderColor: colors.chart.visitors.borderColor,
          backgroundColor: colors.chart.visitors.borderColor,
          pointBackgroundColor: colors.chart.visitors.borderColor,
          pointBorderColor: colors.chart.visitors.borderColor,
          pointRadius: 2,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: false,
        },
      ],
    };
  }, [sessions, websiteId, trendRange, formatMessage, labels, colors]);
  const previewMaxValue = useMemo(() => {
    return getAxisMax(Math.max(...sessions.map(({ y }) => Number(y) || 0), 0));
  }, [sessions]);
  const previewChartOptions = useMemo(() => {
    return {
      scales: {
        x: {
          type: 'timeseries' as const,
          min: formatDate(range.startDate, DATE_FORMATS.day, locale),
          max: formatDate(range.endDate, DATE_FORMATS.day, locale),
          time: {
            unit: 'day',
          },
          grid: {
            display: false,
          },
          border: {
            color: colors.chart.line,
          },
          ticks: {
            color: colors.chart.text,
            autoSkip: true,
            maxRotation: 0,
            callback: renderDateLabels('day', locale),
          },
        },
        y: {
          min: 0,
          max: previewMaxValue,
          beginAtZero: true,
          grid: {
            color: colors.chart.line,
          },
          border: {
            color: colors.chart.line,
          },
          ticks: {
            color: colors.chart.text,
            callback: renderNumberLabels,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    };
  }, [range.startDate, range.endDate, locale, colors, previewMaxValue]);
  const rangeLabel =
    {
      '7day': '7d',
      '30day': '30d',
      '90day': '90d',
    }[trendRange] || '7d';

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openPreview = () => {
    clearCloseTimer();

    if (triggerRef.current) {
      setPreviewPosition(getPreviewPosition(triggerRef.current.getBoundingClientRect()));
      setIsPreviewOpen(true);
    }
  };

  const closePreview = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsPreviewOpen(false);
    }, 120);
  };

  useEffect(() => {
    if (!isPreviewOpen) return;

    const updatePosition = () => {
      if (triggerRef.current) {
        setPreviewPosition(getPreviewPosition(triggerRef.current.getBoundingClientRect()));
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isPreviewOpen]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={`${formatMessage(labels.visitors)} ${rangeLabel} trend`}
        onMouseEnter={openPreview}
        onMouseLeave={closePreview}
        onFocus={openPreview}
        onBlur={closePreview}
        style={{
          width: `${WIDTH}px`,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <svg
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          aria-hidden="true"
          role="img"
          style={{ display: 'block', overflow: 'visible' }}
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
      </div>
      {isPreviewOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onMouseEnter={clearCloseTimer}
            onMouseLeave={closePreview}
            style={{
              position: 'fixed',
              left: `${previewPosition.left}px`,
              top: `${previewPosition.top}px`,
              width: `${PREVIEW_WIDTH}px`,
              zIndex: 1000,
              background: colors.theme.fill,
              border: `1px solid ${colors.chart.line}`,
              borderRadius: '12px',
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.16)',
              padding: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <strong>{`${formatMessage(labels.visitors)} Trend (${rangeLabel})`}</strong>
              <span style={{ color: colors.chart.text }}>{formatMessage(labels.visitors)}</span>
            </div>
            <Chart
              type="line"
              chartData={previewChartData}
              chartOptions={previewChartOptions}
              height={`${PREVIEW_HEIGHT - 64}px`}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
