import Link from 'next/link';
import { WebsitesTable } from './WebsitesTable';
import { WebsiteTrendFilter } from './WebsiteTrendFilter';
import { DataGrid } from '@/components/common/DataGrid';
import { useLoginQuery, useNavigation, useUserWebsitesQuery } from '@/components/hooks';

export function WebsitesDataTable({
  userId,
  teamId,
  allowEdit = true,
  allowView = true,
  showActions = true,
}: {
  userId?: string;
  teamId?: string;
  allowEdit?: boolean;
  allowView?: boolean;
  showActions?: boolean;
}) {
  const { user } = useLoginQuery();
  const queryResult = useUserWebsitesQuery(
    { userId: userId || user?.id, teamId },
    {
      includeStats: '1',
      orderBy: 'visitors',
      sortDescending: 'true',
    },
  );
  const { renderUrl } = useNavigation();

  const renderLink = (row: any) => (
    <Link href={renderUrl(`/websites/${row.id}`, false)}>{row.name}</Link>
  );

  return (
    <DataGrid
      query={queryResult}
      allowSearch
      allowPaging
      renderActions={() => <WebsiteTrendFilter />}
    >
      {({ data }) => (
        <WebsitesTable
          data={data}
          showActions={showActions}
          allowEdit={allowEdit}
          allowView={allowView}
          showStats
          renderLink={renderLink}
        />
      )}
    </DataGrid>
  );
}
