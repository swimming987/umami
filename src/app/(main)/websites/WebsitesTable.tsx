import { ReactNode } from 'react';
import { Icon, DataTable, DataColumn, DataTableProps } from '@umami/react-zen';
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
  ...props
}: WebsitesTableProps) {
  const { formatMessage, labels } = useMessages();
  const { renderUrl } = useNavigation();

  const formatRate = (value?: number) => `${Math.round(Number(value) || 0)}%`;
  const formatDuration = (value?: number) =>
    formatShortTime(Math.abs(~~(Number(value) || 0)), ['m', 's'], ' ');

  return (
    <DataTable {...props}>
      <DataColumn id="name" label={formatMessage(labels.name)}>
        {renderLink}
      </DataColumn>
      <DataColumn id="domain" label={formatMessage(labels.domain)} />
      {showStats && (
        <DataColumn id="visitors" label={formatMessage(labels.visitors)} align="end" width="120px">
          {(row: any) => formatLongNumber(row.visitors ?? 0)}
        </DataColumn>
      )}
      {showStats && (
        <DataColumn id="visits" label={formatMessage(labels.visits)} align="end" width="120px">
          {(row: any) => formatLongNumber(row.visits ?? 0)}
        </DataColumn>
      )}
      {showStats && (
        <DataColumn id="pageviews" label={formatMessage(labels.views)} align="end" width="120px">
          {(row: any) => formatLongNumber(row.pageviews ?? 0)}
        </DataColumn>
      )}
      {showStats && (
        <DataColumn
          id="bounceRate"
          label={formatMessage(labels.bounceRate)}
          align="end"
          width="140px"
        >
          {(row: any) => formatRate(row.bounceRate)}
        </DataColumn>
      )}
      {showStats && (
        <DataColumn
          id="visitDuration"
          label={formatMessage(labels.visitDuration)}
          align="end"
          width="150px"
        >
          {(row: any) => formatDuration(row.visitDuration)}
        </DataColumn>
      )}
      {showActions && (
        <DataColumn id="action" label=" " align="end">
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
