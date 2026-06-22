import { google } from "googleapis";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { sampleGuests, sampleRsvps, sampleWedding } from "@/lib/sample-data";
import type {
  DashboardSummary,
  GuestInvite,
  InvitePageData,
  RsvpRecord,
  RsvpSubmission,
  WeddingConfig
} from "@/lib/types";
import { parseBoolean, parseNumber } from "@/lib/utils";

type SheetRow = Record<string, string>;
type SheetDataset = "weddings" | "guests" | "rsvps";

type StoredSheetRow = {
  dataset: SheetDataset;
  rowNumber: number;
  rowJson: string;
};

type SyncMetadata = {
  dataset: SheetDataset;
  syncedAt: number;
};

type ParsedRange = {
  sheetName?: string;
  startColumn?: string;
  endColumn?: string;
  startRow: number;
  endRow?: number;
};

const DEFAULT_SHEETS_PAGE_SIZE = 500;
const DEFAULT_SQLITE_CACHE_TTL_SECONDS = 60;

const normalizeSlug = (value: string | undefined) => (value ?? "").trim().toLowerCase();
const normalizeStatus = (value: string | undefined) => (value ?? "").trim().toLowerCase();

const toTimestamp = (value: string | undefined) => {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const dedupeRsvps = (records: RsvpRecord[]) => {
  const latestByGuest = new Map<string, RsvpRecord>();

  for (const record of records) {
    const existing = latestByGuest.get(record.guestSlug);

    if (!existing) {
      latestByGuest.set(record.guestSlug, record);
      continue;
    }

    const existingTimestamp = toTimestamp(existing.submittedAt);
    const recordTimestamp = toTimestamp(record.submittedAt);

    if (recordTimestamp >= existingTimestamp) {
      latestByGuest.set(record.guestSlug, record);
    }
  }

  return Array.from(latestByGuest.values());
};

const RANGES = {
  weddings: process.env.GOOGLE_SHEETS_WEDDINGS_RANGE ?? "Weddings!A:Z",
  guests: process.env.GOOGLE_SHEETS_GUESTS_RANGE ?? "Guests!A:Z",
  rsvps: process.env.GOOGLE_SHEETS_RSVPS_RANGE ?? "RSVPs!A:E"
};

const getConfiguredPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getSheetsPageSize = () =>
  getConfiguredPositiveNumber(process.env.GOOGLE_SHEETS_PAGE_SIZE, DEFAULT_SHEETS_PAGE_SIZE);

const getSqliteCacheTtlMs = () =>
  getConfiguredPositiveNumber(
    process.env.GOOGLE_SHEETS_SQLITE_CACHE_TTL_SECONDS,
    DEFAULT_SQLITE_CACHE_TTL_SECONDS
  ) * 1000;

const getSqlitePath = () =>
  process.env.WEDDING_SQLITE_PATH ?? join("/tmp", "wedding-invitation.sqlite");

const parseCellReference = (value: string) => {
  const match = value.trim().match(/^([A-Z]+)?(\d+)?$/i);

  return {
    column: match?.[1]?.toUpperCase(),
    row: match?.[2] ? Number.parseInt(match[2], 10) : undefined
  };
};

const parseRange = (range: string): ParsedRange | null => {
  const bangIndex = range.lastIndexOf("!");
  const sheetName = bangIndex === -1 ? undefined : range.slice(0, bangIndex);
  const cellRange = bangIndex === -1 ? range : range.slice(bangIndex + 1);
  const [startCell, endCell] = cellRange.split(":");

  if (!startCell) {
    return null;
  }

  const start = parseCellReference(startCell);
  const end = endCell ? parseCellReference(endCell) : start;

  return {
    sheetName,
    startColumn: start.column,
    endColumn: end.column ?? start.column,
    startRow: start.row ?? 1,
    endRow: end.row
  };
};

const buildPagedRange = (range: string, startRow: number, endRow: number) => {
  const parsed = parseRange(range);

  if (!parsed?.startColumn || !parsed.endColumn) {
    return range;
  }

  const sheetPrefix = parsed.sheetName ? `${parsed.sheetName}!` : "";
  return `${sheetPrefix}${parsed.startColumn}${startRow}:${parsed.endColumn}${endRow}`;
};

let sqlite: DatabaseSync | null = null;

function getSqliteDb() {
  if (sqlite) {
    return sqlite;
  }

  const dbPath = getSqlitePath();
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

function readCachedRows(dataset: SheetDataset): Array<{ rowNumber: number; row: SheetRow }> {
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

function getLastSyncedAt(dataset: SheetDataset) {
  const db = getSqliteDb();
  const record = db
    .prepare("SELECT dataset, synced_at AS syncedAt FROM sheet_sync_metadata WHERE dataset = ?")
    .get(dataset) as SyncMetadata | undefined;

  return record?.syncedAt ?? 0;
}

function isCacheFresh(dataset: SheetDataset) {
  return Date.now() - getLastSyncedAt(dataset) < getSqliteCacheTtlMs();
}

function replaceCachedRows(
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

function upsertCachedRow(dataset: SheetDataset, rowNumber: number, row: SheetRow) {
  const db = getSqliteDb();
  db.prepare(
    "INSERT INTO sheet_rows (dataset, row_number, row_json) VALUES (?, ?, ?) " +
      "ON CONFLICT(dataset, row_number) DO UPDATE SET row_json = excluded.row_json"
  ).run(dataset, rowNumber, JSON.stringify(row));
}

function markCacheStale(dataset: SheetDataset) {
  const db = getSqliteDb();
  db.prepare(
    "INSERT INTO sheet_sync_metadata (dataset, synced_at) VALUES (?, 0) " +
      "ON CONFLICT(dataset) DO UPDATE SET synced_at = 0"
  ).run(dataset);
}

function hasGoogleSheetsConfig() {
  return Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID || !clientEmail || !privateKey) {
    throw new Error("Missing Google Sheets credentials.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

async function getRowsFromSheets(
  range: string,
  fallbackHeaders?: string[]
): Promise<Array<{ rowNumber: number; row: SheetRow }>> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  const parsedRange = parseRange(range);
  const pageSize = getSheetsPageSize();
  const rows: Array<{ rowNumber: number; row: SheetRow }> = [];
  let headers: string[] | null = null;
  let hasHeader = false;
  let pageStartRow = parsedRange?.startRow ?? 1;

  while (true) {
    const pageEndRow = Math.min(
      pageStartRow + pageSize - 1,
      parsedRange?.endRow ?? Number.MAX_SAFE_INTEGER
    );
    const pageRange = parsedRange
      ? buildPagedRange(range, pageStartRow, pageEndRow)
      : range;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: pageRange
    });
    const values = (response.data.values ?? []).map((row) =>
      row.map((value) => String(value ?? ""))
    );

    if (values.length === 0) {
      break;
    }

    let pageRows = values;
    let firstDataRowNumber = pageStartRow;

    if (!headers) {
      const [headerRow, ...remainingRows] = values;
      const candidateHeaders = headerRow.map((value) => value.trim());
      hasHeader =
        candidateHeaders.some(Boolean) &&
        (!fallbackHeaders || fallbackHeaders.every((header) => candidateHeaders.includes(header)));
      headers = hasHeader ? candidateHeaders : fallbackHeaders ?? candidateHeaders;
      pageRows = hasHeader ? remainingRows : values;
      firstDataRowNumber = hasHeader ? pageStartRow + 1 : pageStartRow;
    }

    for (const [index, row] of pageRows.entries()) {
      const mappedRow: SheetRow = {};

      headers.forEach((header, headerIndex) => {
        mappedRow[header] = row[headerIndex] ?? "";
      });

      rows.push({
        rowNumber: firstDataRowNumber + index,
        row: mappedRow
      });
    }

    if (
      values.length < pageSize ||
      !parsedRange ||
      pageEndRow >= (parsedRange.endRow ?? Number.MAX_SAFE_INTEGER)
    ) {
      break;
    }

    pageStartRow = pageEndRow + 1;
  }

  return rows;
}

async function getRows(
  dataset: SheetDataset,
  range: string,
  fallbackHeaders?: string[]
): Promise<Array<{ rowNumber: number; row: SheetRow }>> {
  if (!hasGoogleSheetsConfig()) {
    return [];
  }

  const cachedRows = readCachedRows(dataset);

  if (isCacheFresh(dataset)) {
    return cachedRows;
  }

  try {
    const rows = await getRowsFromSheets(range, fallbackHeaders);
    replaceCachedRows(dataset, rows);
    return rows;
  } catch (error) {
    if (cachedRows.length > 0) {
      return cachedRows;
    }

    throw error;
  }
}

function mapWedding(row: SheetRow): WeddingConfig {
  return {
    inviteTitle: row.inviteTitle || "Exclusive Invitation For",
    inviteSubtitle: row.inviteSubtitle || "Together with their families",
    guestHonorLine: row.guestHonorLine || "Request the honor of your presence",
    groomName: row.groomName,
    groomFamily: row.groomFamily,
    brideName: row.brideName,
    brideFamily: row.brideFamily,
    eventLabel: row.eventLabel || "Wedding Reception",
    eventDateIso: row.eventDateIso,
    eventTimeLabel: row.eventTimeLabel,
    eventAltCalendarLabel: row.eventAltCalendarLabel,
    venueName: row.venueName,
    venueAddress: row.venueAddress,
    accentColor: row.accentColor || "#7f9b7e",
    accentSoftColor: row.accentSoftColor || "#dff4e2",
    textColor: row.textColor || "#243228",
    backgroundGlow: row.backgroundGlow || "rgba(127, 155, 126, 0.18)",
    enforceMaxHeadcount: parseBoolean(row.enforceMaxHeadcount, true),
    active: parseBoolean(row.active, true)
  };
}

function mapGuest(row: SheetRow): GuestInvite {
  return {
    guestSlug: normalizeSlug(row.guestSlug),
    guestName: (row.guestName ?? "").trim(),
    maxHeadcount: parseNumber(row.maxHeadcount, 1),
    groupLabel: row.groupLabel || undefined,
    active: parseBoolean(row.active, true)
  };
}

function mapRsvp(row: SheetRow, rowNumber?: number): RsvpRecord {
  const status = normalizeStatus(row.status);
  return {
    guestSlug: normalizeSlug(row.guestSlug),
    guestName: (row.guestName ?? "").trim(),
    status: status === "declined" ? "declined" : "attending",
    headcount: parseNumber(row.headcount, 0),
    submittedAt: row.submittedAt,
    rowNumber
  };
}

async function loadWeddings() {
  if (!hasGoogleSheetsConfig()) {
    return [sampleWedding];
  }

  const rows = await getRows("weddings", RANGES.weddings);
  return rows.map(({ row }) => mapWedding(row));
}

async function loadGuests() {
  if (!hasGoogleSheetsConfig()) {
    return sampleGuests;
  }

  const rows = await getRows("guests", RANGES.guests);
  return rows.map(({ row }) => mapGuest(row));
}

async function loadRsvps() {
  if (!hasGoogleSheetsConfig()) {
    return sampleRsvps;
  }

  const rows = await getRows("rsvps", RANGES.rsvps, [
    "guestSlug",
    "guestName",
    "status",
    "headcount",
    "submittedAt"
  ]);
  return rows.map(({ row, rowNumber }) => mapRsvp(row, rowNumber));
}

export async function getInvitePageData(guestSlug: string): Promise<InvitePageData | null> {
  const normalizedSlug = normalizeSlug(guestSlug);
  // TODO: optimize by loading only the relevant guest and RSVP instead of the full lists.
  // use `MATCH` for lookups.
  const [weddings, guests, rsvps] = await Promise.all([
    loadWeddings(),
    loadGuests(),
    loadRsvps()
  ]);

  const wedding = weddings.find((item) => item.active);
  const guest = guests.find((item) => item.guestSlug === normalizedSlug && item.active);

  if (!wedding || !guest) {
    return null;
  }

  const existingRsvp =
    dedupeRsvps(rsvps).find((item) => item.guestSlug === normalizedSlug) ?? null;

  return { wedding, guest, existingRsvp };
}

export async function getWeddingDashboard(): Promise<DashboardSummary | null> {
  const [weddings, guests, rsvps] = await Promise.all([
    loadWeddings(),
    loadGuests(),
    loadRsvps()
  ]);

  const wedding = weddings.find((item) => item.active);

  if (!wedding) {
    return null;
  }

  const weddingGuests = guests.filter((guest) => guest.active);
  const weddingRsvps = dedupeRsvps(rsvps);
  const rsvpByGuest = new Map(weddingRsvps.map((rsvp) => [rsvp.guestSlug, rsvp]));
  const rsvpsForGuests = weddingGuests
    .map((guest) => rsvpByGuest.get(guest.guestSlug))
    .filter((rsvp): rsvp is RsvpRecord => Boolean(rsvp));
  const attending = rsvpsForGuests.filter((rsvp) => rsvp.status === "attending");
  const declined = rsvpsForGuests.filter((rsvp) => rsvp.status === "declined");
  const pendingCount = weddingGuests.filter((guest) => !rsvpByGuest.has(guest.guestSlug)).length;

  return {
    wedding,
    guests: weddingGuests,
    rsvps: weddingRsvps,
    pendingCount,
    attendingPartyCount: attending.length,
    attendingHeadcount: attending.reduce((sum, item) => sum + item.headcount, 0),
    declinedCount: declined.length
  };
}

export async function saveRsvp(submission: RsvpSubmission) {
  if (!hasGoogleSheetsConfig()) {
    return { ...submission };
  }

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  const existingRows = await getRows("rsvps", RANGES.rsvps, [
    "guestSlug",
    "guestName",
    "status",
    "headcount",
    "submittedAt"
  ]);
  const normalizedSlug = normalizeSlug(submission.guestSlug);
  const matchingRow = existingRows.find(
    ({ row }) => normalizeSlug(row.guestSlug) === normalizedSlug
  );

  const recordValues = [
    normalizedSlug,
    submission.guestName.trim(),
    normalizeStatus(submission.status),
    String(submission.headcount),
    submission.submittedAt
  ];
  const recordRow: SheetRow = {
    guestSlug: recordValues[0],
    guestName: recordValues[1],
    status: recordValues[2],
    headcount: recordValues[3],
    submittedAt: recordValues[4]
  };

  if (matchingRow) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `RSVPs!A${matchingRow.rowNumber}:E${matchingRow.rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [recordValues]
      }
    });
    upsertCachedRow("rsvps", matchingRow.rowNumber, recordRow);
  } else {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "RSVPs!A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [recordValues]
      }
    });
    const updatedRange = response.data.updates?.updatedRange;
    const rowNumber = updatedRange?.match(/![A-Z]+(\d+):/i)?.[1];

    if (rowNumber) {
      upsertCachedRow("rsvps", Number.parseInt(rowNumber, 10), recordRow);
    } else {
      markCacheStale("rsvps");
    }
  }

  return submission;
}
