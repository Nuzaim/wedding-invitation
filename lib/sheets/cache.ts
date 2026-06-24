import { getSqliteCacheTtlMs } from "@/lib/config";

export type SheetDataset = "weddings" | "guests" | "rsvps";

export type SheetRow = Record<string, string>;

export interface SheetCache {
  readCachedRows(dataset: SheetDataset): Array<{ rowNumber: number; row: SheetRow }>;
  getLastSyncedAt(dataset: SheetDataset): number;
  isCacheFresh(dataset: SheetDataset): boolean;
  replaceCachedRows(dataset: SheetDataset, rows: Array<{ rowNumber: number; row: SheetRow }>): void;
  upsertCachedRow(dataset: SheetDataset, rowNumber: number, row: SheetRow): void;
  markCacheStale(dataset: SheetDataset): void;
}

export const noopSheetCache: SheetCache = {
  readCachedRows: () => [],
  getLastSyncedAt: () => 0,
  isCacheFresh: () => false,
  replaceCachedRows: () => {},
  upsertCachedRow: () => {},
  markCacheStale: () => {},
};
