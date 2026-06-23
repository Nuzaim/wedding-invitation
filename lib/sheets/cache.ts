import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { env, getSqliteCacheTtlMs } from "@/lib/config";

export type SheetDataset = "weddings" | "guests" | "rsvps";

export type SheetRow = Record<string, string>;

export type StoredSheetRow = {
  dataset: SheetDataset;
  rowNumber: number;
  rowJson: string;
};

type SyncMetadata = {
  dataset: SheetDataset;
  syncedAt: number;
};

let sqlite: DatabaseSync | null = null;

export function getSqliteDb() {
  if (sqlite) {
    return sqlite;
  }

  const dbPath = env.WEDDING_SQLITE_PATH;
  mkdirSync(dirname(dbPath), { recursive: true });

  sqlite = new DatabaseSync(dbPath);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sheet_rows (
      dataset TEXT NOT NULL,
      row_number INTEGER NOT NULL,
      row_json TEXT NOT NULL,
      PRIMARY KEY (dataset, row_number)
    );

    CREATE TABLE IF NOT EXISTS sheet_sync_metadata (
      dataset TEXT PRIMARY KEY,
      synced_at INTEGER NOT NULL
    );
  `);

  return sqlite;
}

export function readCachedRows(dataset: SheetDataset): Array<{ rowNumber: number; row: SheetRow }> {
  const db = getSqliteDb();
  const records = db
    .prepare(
      "SELECT dataset, row_number AS rowNumber, row_json AS rowJson FROM sheet_rows WHERE dataset = ? ORDER BY row_number"
    )
    .all(dataset) as StoredSheetRow[];

  return records.map((record) => ({
    rowNumber: record.rowNumber,
    row: JSON.parse(record.rowJson) as SheetRow
  }));
}

export function getLastSyncedAt(dataset: SheetDataset) {
  const db = getSqliteDb();
  const record = db
    .prepare("SELECT dataset, synced_at AS syncedAt FROM sheet_sync_metadata WHERE dataset = ?")
    .get(dataset) as SyncMetadata | undefined;

  return record?.syncedAt ?? 0;
}

export function isCacheFresh(dataset: SheetDataset) {
  return Date.now() - getLastSyncedAt(dataset) < getSqliteCacheTtlMs();
}

export function replaceCachedRows(
  dataset: SheetDataset,
  rows: Array<{ rowNumber: number; row: SheetRow }>
) {
  const db = getSqliteDb();
  const deleteRows = db.prepare("DELETE FROM sheet_rows WHERE dataset = ?");
  const insertRow = db.prepare(
    "INSERT INTO sheet_rows (dataset, row_number, row_json) VALUES (?, ?, ?)"
  );
  const updateMetadata = db.prepare(
    "INSERT INTO sheet_sync_metadata (dataset, synced_at) VALUES (?, ?) " +
      "ON CONFLICT(dataset) DO UPDATE SET synced_at = excluded.synced_at"
  );

  db.exec("BEGIN IMMEDIATE");
  try {
    deleteRows.run(dataset);

    for (const { rowNumber, row } of rows) {
      insertRow.run(dataset, rowNumber, JSON.stringify(row));
    }

    updateMetadata.run(dataset, Date.now());
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function upsertCachedRow(dataset: SheetDataset, rowNumber: number, row: SheetRow) {
  const db = getSqliteDb();
  db.prepare(
    "INSERT INTO sheet_rows (dataset, row_number, row_json) VALUES (?, ?, ?) " +
      "ON CONFLICT(dataset, row_number) DO UPDATE SET row_json = excluded.row_json"
  ).run(dataset, rowNumber, JSON.stringify(row));
}

export function markCacheStale(dataset: SheetDataset) {
  const db = getSqliteDb();
  db.prepare(
    "INSERT INTO sheet_sync_metadata (dataset, synced_at) VALUES (?, 0) " +
      "ON CONFLICT(dataset) DO UPDATE SET synced_at = 0"
  ).run(dataset);
}
