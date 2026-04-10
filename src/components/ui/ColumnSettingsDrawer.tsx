"use client";

import {
  ActionIcon,
  Button,
  Drawer,
  Group,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowDown,
  IconArrowUp,
  IconColumns,
  IconRefresh,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ColumnConfig } from "@/store/table-settings-store";
import { useTableSettingsStore } from "@/store/table-settings-store";

interface ColumnDef {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

interface ColumnSettingsDrawerProps {
  tableId: string;
  columnDefs: ColumnDef[];
}

function toDefaults(defs: ColumnDef[]): ColumnConfig[] {
  return defs.map((d, i) => ({
    key: d.key,
    visible: d.defaultVisible !== false,
    order: i,
  }));
}

export function useColumnSettings(
  tableId: string,
  columnDefs: ColumnDef[],
) {
  const { getColumns } = useTableSettingsStore();
  const defaults = toDefaults(columnDefs);
  const columns = getColumns(tableId, defaults);

  const visibleKeys = new Set(
    columns.filter((c) => c.visible).map((c) => c.key),
  );

  const orderedKeys = columns
    .filter((c) => c.visible)
    .map((c) => c.key);

  return { visibleKeys, orderedKeys };
}

export default function ColumnSettingsDrawer({
  tableId,
  columnDefs,
}: ColumnSettingsDrawerProps) {
  const t = useTranslations("common");
  const [opened, { open, close }] = useDisclosure(false);
  const { getColumns, toggleColumn, reorderColumns, resetColumns, setColumns } =
    useTableSettingsStore();

  const defaults = toDefaults(columnDefs);
  const columns = getColumns(tableId, defaults);

  // Ensure columns are saved on first interaction
  const ensureStored = () => {
    const stored = useTableSettingsStore.getState().tables[tableId];
    if (!stored) {
      setColumns(tableId, columns);
    }
  };

  const handleToggle = (key: string) => {
    ensureStored();
    toggleColumn(tableId, key);
  };

  const handleMove = (fromIndex: number, toIndex: number) => {
    ensureStored();
    reorderColumns(tableId, fromIndex, toIndex);
  };

  const labelMap = new Map(columnDefs.map((d) => [d.key, d.label]));

  return (
    <>
      <ActionIcon variant="default" size="lg" onClick={open}>
        <IconColumns size={18} />
      </ActionIcon>

      <Drawer
        opened={opened}
        onClose={close}
        title={t("columnSettings")}
        position="right"
        size="sm"
      >
        <Stack gap="xs">
          {columns.map((col, index) => (
            <Group key={col.key} justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                <Stack gap={0}>
                  <ActionIcon
                    variant="subtle"
                    size="xs"
                    disabled={index === 0}
                    onClick={() => handleMove(index, index - 1)}
                  >
                    <IconArrowUp size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    size="xs"
                    disabled={index === columns.length - 1}
                    onClick={() => handleMove(index, index + 1)}
                  >
                    <IconArrowDown size={14} />
                  </ActionIcon>
                </Stack>
                <Text size="sm" truncate>
                  {labelMap.get(col.key) || col.key}
                </Text>
              </Group>
              <Switch
                checked={col.visible}
                onChange={() => handleToggle(col.key)}
                size="sm"
              />
            </Group>
          ))}

          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={() => {
              resetColumns(tableId);
            }}
            mt="md"
            fullWidth
          >
            {t("resetToDefault")}
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}
