import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ColumnConfig {
  key: string;
  visible: boolean;
  order: number;
}

interface TableSettings {
  [tableId: string]: ColumnConfig[];
}

interface TableSettingsState {
  tables: TableSettings;
  _hasHydrated: boolean;
  getColumns: (tableId: string, defaults: ColumnConfig[]) => ColumnConfig[];
  setColumns: (tableId: string, columns: ColumnConfig[]) => void;
  toggleColumn: (tableId: string, key: string) => void;
  reorderColumns: (tableId: string, fromIndex: number, toIndex: number) => void;
  resetColumns: (tableId: string) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useTableSettingsStore = create<TableSettingsState>()(
  persist(
    (set, get) => ({
      tables: {},
      _hasHydrated: false,

      getColumns: (tableId, defaults) => {
        const stored = get().tables[tableId];
        if (!stored) return defaults;

        const storedByKey = new Map(stored.map((col) => [col.key, col]));

        // Merge: keep stored settings, add any new defaults that don't exist yet
        const merged: ColumnConfig[] = [];
        let maxOrder = Math.max(...stored.map((c) => c.order), -1);

        for (const def of defaults) {
          const existing = storedByKey.get(def.key);
          if (existing) {
            merged.push(existing);
            storedByKey.delete(def.key);
          } else {
            merged.push({ ...def, order: ++maxOrder });
          }
        }

        return merged.sort((a, b) => a.order - b.order);
      },

      setColumns: (tableId, columns) =>
        set((state) => ({
          tables: { ...state.tables, [tableId]: columns },
        })),

      toggleColumn: (tableId, key) =>
        set((state) => {
          const columns = state.tables[tableId];
          if (!columns) return state;

          return {
            tables: {
              ...state.tables,
              [tableId]: columns.map((col) =>
                col.key === key ? { ...col, visible: !col.visible } : col,
              ),
            },
          };
        }),

      reorderColumns: (tableId, fromIndex, toIndex) =>
        set((state) => {
          const columns = state.tables[tableId];
          if (!columns) return state;

          const sorted = [...columns].sort((a, b) => a.order - b.order);
          const [moved] = sorted.splice(fromIndex, 1);
          sorted.splice(toIndex, 0, moved);

          return {
            tables: {
              ...state.tables,
              [tableId]: sorted.map((col, i) => ({ ...col, order: i })),
            },
          };
        }),

      resetColumns: (tableId) =>
        set((state) => {
          const { [tableId]: _, ...rest } = state.tables;
          return { tables: rest };
        }),

      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: "table-settings",
      partialize: (state) => ({ tables: state.tables }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function useTableSettingsHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubscribe = useTableSettingsStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    if (useTableSettingsStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  return hydrated;
}
