import { ReactNode } from 'react';
import { Icon, DataTable, DataColumn, DataTableProps } from '@umami/react-zen';
import { WebsiteTrend } from './WebsiteTrend';
import { LinkButton } from '@/components/common/LinkButton';
import { useMessages, useNavigation } from '@/components/hooks';
import { SquarePen } from '@/components/icons';
import { formatLongNumber, formatShortTime } from '@/lib/format';

export interface WebsitesTableProps extends DataTableProps {
  showActions?: boolean;
  allowEdit?: boolean;
  allowView?: boolean;
  showStats?: boolean;
  renderLink?: (row: any) => ReactNode;
}

export function WebsitesTable({
  showActions,
  showStats,
  renderLink,
  data,
  ...props
}: WebsitesTableProps) {
  const { formatMessage, labels } = useMessages();
  const {
    renderUrl,
    query: { trend = '7day' },
  } = useNavigation();
  const trendLabel =
    {
      '7day': `${formatMessage(labels.visitors)} Trend (7d)`,
      '30day': `${formatMessage(labels.visitors)} Trend (30d)`,
      '90day': `${formatMessage(labels.visitors)} Trend (90d)`,
    }[trend] || `${formatMessage(labels.visitors)} Trend (7d)`;
  const trendScaleMax = Math.max(
    ...((data as any[]) || []).map(row => Number(row?.visitors) || 0),
    1,
  );

  const formatRate = (value?: number) => `${Math.round(Number(value) || 0)}%`;
  const formatDuration = (value?: number) =>
    formatShortTime(Math.abs(~~(Number(value) || 0)), ['m', 's'], ' ');

  return (
    <DataTable {...props} data={data}>
      <DataColumn id="name" label={formatMessage(labels.name)} width="190px">
        {renderLink}
      </DataColumn>
      {showStats && (
        <DataColumn id="trend" label={trendLabel} width="270px">
          {(row: any) => <WebsiteTrend websiteId={row.id} maxValue={trendScaleMax} />}
        </DataColumn>
      )}
      {showStats && (
        <DataColumn id="visitors" label={formatMessage(labels.visitors)} align="end" width="82px">
          {(row: any) => formatLongNumber(row.visitors ?? 0)}
        </DataColumn>
      )}
      {showStats && (
        <DataColumn id="pageviews" label={formatMessage(labels.views)} align="end" width="82px">
          {(row: any) => formatLongNumber(row.pageviews ?? 0)}
        </DataColumn>
      )}
      {showStats && (
        <DataColumn id="visits" label={formatMessage(labels.visits)} align="end" width="82px">
          {(row: any) => formatLongNumber(row.visits ?? 0)}
        </DataColumn>
      )}
      {showStats && (
        <DataColumn
          id="bounceRate"
          label={formatMessage(labels.bounceRate)}
          align="end"
          width="112px"
        >
          {(row: any) => formatRate(row.bounceRate)}
        </DataColumn>
      )}
      {showStats && (
        <DataColumn
          id="visitDuration"
          label={formatMessage(labels.visitDuration)}
          align="end"
          width="122px"
        >
          {(row: any) => formatDuration(row.visitDuration)}
        </DataColumn>
      )}
      {showActions && (
        <DataColumn id="action" label=" " align="end" width="36px">
          {(row: any) => {
            const websiteId = row.id;

            return (
              <LinkButton href={renderUrl(`/websites/${websiteId}/settings`)} variant="quiet">
                <Icon>
                  <SquarePen />
                </Icon>
              </LinkButton>
            );
          }}
        </DataColumn>
      )}
    </DataTable>
  );
}
