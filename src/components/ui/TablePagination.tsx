"use client";

import { ActionIcon, Group, NumberInput, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

interface TablePaginationProps {
  total: number;
  value: number;
  onChange: (page: number) => void;
}

export default function TablePagination({
  total,
  value,
  onChange,
}: TablePaginationProps) {
  const t = useTranslations("common");

  if (total <= 1) return null;

  return (
    <Group justify="center" gap="sm">
      <ActionIcon
        variant="default"
        size="lg"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        aria-label={t("previous")}
      >
        <IconChevronLeft size={18} />
      </ActionIcon>

      <Group gap="xs" align="center">
        <NumberInput
          value={value}
          onChange={(val) => {
            const num = Number(val);
            if (num >= 1 && num <= total) onChange(num);
          }}
          min={1}
          max={total}
          size="xs"
          w={60}
          hideControls
          styles={{ input: { textAlign: "center" } }}
        />
        <Text size="sm" c="dimmed">
          / {total}
        </Text>
      </Group>

      <ActionIcon
        variant="default"
        size="lg"
        disabled={value >= total}
        onClick={() => onChange(value + 1)}
        aria-label={t("next")}
      >
        <IconChevronRight size={18} />
      </ActionIcon>
    </Group>
  );
}
