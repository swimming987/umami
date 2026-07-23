'use client';
import { Row, Select, ListItem, Text } from '@umami/react-zen';
import { useNavigation } from '@/components/hooks';

const OPTIONS = [
  { id: '7day', label: '7d' },
  { id: '30day', label: '30d' },
  { id: '90day', label: '90d' },
];

export function WebsiteTrendFilter() {
  const {
    router,
    updateParams,
    query: { trend = '7day' },
  } = useNavigation();

  const value = OPTIONS.some(option => option.id === trend) ? trend : '7day';

  const handleChange = (nextValue: string) => {
    router.push(updateParams({ trend: nextValue }));
  };

  return (
    <Row alignItems="center" gap="2">
      <Text size="sm" color="muted">
        Trend
      </Text>
      <Row minWidth="92px">
        <Select value={value} onChange={handleChange} aria-label="Trend range">
          {OPTIONS.map(option => (
            <ListItem key={option.id} id={option.id}>
              {option.label}
            </ListItem>
          ))}
        </Select>
      </Row>
    </Row>
  );
}
