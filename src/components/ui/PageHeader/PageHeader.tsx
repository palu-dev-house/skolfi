"use client";

import { Group, Stack, Text, Title } from "@mantine/core";
import { usePageTitle } from "@/hooks/usePageTitle";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  usePageTitle(title);

  return (
    <Group justify="space-between" mb="lg">
      <Stack gap={4}>
        <Title order={2}>{title}</Title>
        {description && (
          <Text c="dimmed" size="sm">
            {description}
          </Text>
        )}
      </Stack>
      {actions}
    </Group>
  );
}
