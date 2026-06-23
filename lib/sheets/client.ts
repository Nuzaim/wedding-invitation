import { google } from "googleapis";
import { env, hasGoogleSheetsConfig } from "@/lib/config";
import {
  isCacheFresh,
  readCachedRows,
  replaceCachedRows,
  type SheetDataset,
  type SheetRow
} from "./cache";

type ParsedRange = {
  sheetName?: string;
  startColumn?: string;
  endColumn?: string;
  startRow: number;
  endRow?: number;
};

export { hasGoogleSheetsConfig };

function getSheetsClient() {
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

  return google.sheets({ version: "v4", auth });
}

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

async function getRowsFromSheets(
  range: string,
  fallbackHeaders?: string[]
): Promise<Array<{ rowNumber: number; row: SheetRow }>> {
  const sheets = getSheetsClient();
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  const parsedRange = parseRange(range);
  const pageSize = env.GOOGLE_SHEETS_PAGE_SIZE;
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

export async function getRows(
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

export function getSheetsClientForWrite() {
  return getSheetsClient();
}
