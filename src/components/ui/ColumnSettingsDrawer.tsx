"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  IconColumns,
  IconGripVertical,
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

export function useColumnSettings(tableId: string, columnDefs: ColumnDef[]) {
  const { getColumns } = useTableSettingsStore();
  const defaults = toDefaults(columnDefs);
  const columns = getColumns(tableId, defaults);

  const visibleKeys = new Set(
    columns.filter((c) => c.visible).map((c) => c.key),
  );

  const orderedKeys = columns.filter((c) => c.visible).map((c) => c.key);

  return { visibleKeys, orderedKeys };
}

interface SortableItemProps {
  col: ColumnConfig;
  label: string;
  onToggle: (key: string) => void;
}

function SortableItem({ col, label, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    borderRadius: "var(--mantine-radius-sm)",
  };

  return (
    <Group
      ref={setNodeRef}
      style={style}
      justify="space-between"
      wrap="nowrap"
      py={6}
      px={4}
      bg={isDragging ? "gray.0" : undefined}
      bd={isDragging ? "1px solid var(--mantine-color-gray-3)" : undefined}
    >
      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          style={{ cursor: "grab", touchAction: "none" }}
          {...attributes}
          {...listeners}
        >
          <IconGripVertical size={16} />
        </ActionIcon>
        <Text size="sm" truncate>
          {label}
        </Text>
      </Group>
      <Switch
        checked={col.visible}
        onChange={() => onToggle(col.key)}
        size="sm"
      />
    </Group>
  );
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    ensureStored();
    const oldIndex = columns.findIndex((c) => c.key === active.id);
    const newIndex = columns.findIndex((c) => c.key === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderColumns(tableId, oldIndex, newIndex);
    }
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
        <Stack gap={4}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columns.map((c) => c.key)}
              strategy={verticalListSortingStrategy}
            >
              {columns.map((col) => (
                <SortableItem
                  key={col.key}
                  col={col}
                  label={labelMap.get(col.key) || col.key}
                  onToggle={handleToggle}
                />
              ))}
            </SortableContext>
          </DndContext>

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
