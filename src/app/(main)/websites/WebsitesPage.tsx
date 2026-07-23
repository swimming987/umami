'use client';
import { WebsitesDataTable } from './WebsitesDataTable';
import { WebsitesDateFilter } from './WebsitesDateFilter';
import { WebsiteAddButton } from './WebsiteAddButton';
import { useMessages, useNavigation } from '@/components/hooks';
import { Column, Row } from '@umami/react-zen';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { PageBody } from '@/components/common/PageBody';

export function WebsitesPage() {
  const { teamId } = useNavigation();
  const { formatMessage, labels } = useMessages();

  return (
    <PageBody>
      <Column gap="6" margin="2">
        <PageHeader title={formatMessage(labels.websites)}>
          <Row alignItems="center" gap="4" wrap="wrap">
            <WebsitesDateFilter />
            <WebsiteAddButton teamId={teamId} />
          </Row>
        </PageHeader>
        <Panel>
          <WebsitesDataTable teamId={teamId} />
        </Panel>
      </Column>
    </PageBody>
  );
}
