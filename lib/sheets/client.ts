import { google } from "googleapis";
import { env, hasGoogleSheetsConfig } from "@/lib/config";
import { noopSheetCache } from "./cache";
import { sqliteSheetCache } from "./cache-sqlite";
import type { SheetCache, SheetDataset, SheetRow } from "./cache";

type ParsedRange = {
  sheetName?: string;
  startColumn?: string;
  endColumn?: string;
  startRow: number;
  endRow?: number;
};

type RowWithNumber = {
  rowNumber: number;
  row: SheetRow;
};

export { hasGoogleSheetsConfig };

class SheetsClientImpl {
  private static instance: SheetsClientImpl | null = null;
  private client: ReturnType<typeof google.sheets>;
  private cache: SheetCache;

  private constructor(cache?: SheetCache | null) {
    const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!env.GOOGLE_SHEETS_SPREADSHEET_ID || !clientEmail || !privateKey) {
      throw new Error("Missing Google Sheets credentials.");
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    this.client = google.sheets({ version: "v4", auth });
    this.cache = cache ?? noopSheetCache;
  }

  static getInstance(cache?: SheetCache | null): SheetsClientImpl {
    if (!SheetsClientImpl.instance) {
      SheetsClientImpl.instance = new SheetsClientImpl(cache);
    }
    return SheetsClientImpl.instance;
  }

  private parseCellReference(value: string) {
    const match = value.trim().match(/^([A-Z]+)?(\d+)?$/i);

    return {
      column: match?.[1]?.toUpperCase(),
      row: match?.[2] ? Number.parseInt(match[2], 10) : undefined
    };
  }

  private parseRange(range: string): ParsedRange | null {
    const bangIndex = range.lastIndexOf("!");
    const sheetName = bangIndex === -1 ? undefined : range.slice(0, bangIndex);
    const cellRange = bangIndex === -1 ? range : range.slice(bangIndex + 1);
    const [startCell, endCell] = cellRange.split(":");

    if (!startCell) {
      return null;
    }

    const start = this.parseCellReference(startCell);
    const end = endCell ? this.parseCellReference(endCell) : start;

    return {
      sheetName,
      startColumn: start.column,
      endColumn: end.column ?? start.column,
      startRow: start.row ?? 1,
      endRow: end.row
    };
  }

  private buildPagedRange(range: string, startRow: number, endRow: number) {
    const parsed = this.parseRange(range);

    if (!parsed?.startColumn || !parsed.endColumn) {
      return range;
    }

    const sheetPrefix = parsed.sheetName ? `${parsed.sheetName}!` : "";
    return `${sheetPrefix}${parsed.startColumn}${startRow}:${parsed.endColumn}${endRow}`;
  }

  private async getRowsFromSheets(
    range: string,
    fallbackHeaders?: string[]
  ): Promise<RowWithNumber[]> {
    const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    const parsedRange = this.parseRange(range);
    const pageSize = env.GOOGLE_SHEETS_PAGE_SIZE;
    const rows: RowWithNumber[] = [];
    let headers: string[] | null = null;
    let hasHeader = false;
    let pageStartRow = parsedRange?.startRow ?? 1;

    while (true) {
      const pageEndRow = Math.min(
        pageStartRow + pageSize - 1,
        parsedRange?.endRow ?? Number.MAX_SAFE_INTEGER
      );
      const pageRange = parsedRange
        ? this.buildPagedRange(range, pageStartRow, pageEndRow)
        : range;
      const response = await this.client.spreadsheets.values.get({
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

  async getRows(
    dataset: SheetDataset,
    range: string,
    fallbackHeaders?: string[]
  ): Promise<RowWithNumber[]> {
    if (this.cache === noopSheetCache) {
      if (!hasGoogleSheetsConfig()) {
        return [];
      }
      return this.getRowsFromSheets(range, fallbackHeaders);
    }

    if (!hasGoogleSheetsConfig()) {
      return [];
    }

    const cachedRows = this.cache.readCachedRows(dataset);

    if (this.cache.isCacheFresh(dataset)) {
      return cachedRows;
    }

    try {
      const rows = await this.getRowsFromSheets(range, fallbackHeaders);
      this.cache.replaceCachedRows(dataset, rows);
      return rows;
    } catch (error) {
      if (cachedRows.length > 0) {
        return cachedRows;
      }
      throw error;
    }
  }

  async saveRsvp(submission: {
    guestSlug: string;
    guestName: string;
    status: string;
    headcount: number;
    submittedAt: string;
  }) {
    if (!hasGoogleSheetsConfig()) {
      return submission;
    }

    const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    const RANGES = {
      rsvps: env.GOOGLE_SHEETS_RSVPS_RANGE
    };

    const existingRows = await this.getRows("rsvps", RANGES.rsvps, [
      "guestSlug",
      "guestName",
      "status",
      "headcount",
      "submittedAt"
    ]);

    const normalizeSlug = (value: string | undefined) => (value ?? "").trim().toLowerCase();
    const normalizeStatus = (value: string | undefined) => (value ?? "").trim().toLowerCase();

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

    if (matchingRow) {
      await this.client.spreadsheets.values.update({
        spreadsheetId,
        range: `RSVPs!A${matchingRow.rowNumber}:E${matchingRow.rowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [recordValues]
        }
      });
    } else {
      await this.client.spreadsheets.values.append({
        spreadsheetId,
        range: "RSVPs!A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [recordValues]
        }
      });
    }

    return submission;
  }
}

export const SheetsClient = SheetsClientImpl.getInstance(sqliteSheetCache);