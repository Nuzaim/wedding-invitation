import { google } from "googleapis";
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

const RANGES = {
  weddings: process.env.GOOGLE_SHEETS_WEDDINGS_RANGE ?? "Weddings!A:Z",
  guests: process.env.GOOGLE_SHEETS_GUESTS_RANGE ?? "Guests!A:Z",
  rsvps: process.env.GOOGLE_SHEETS_RSVPS_RANGE ?? "RSVPs!A:E"
};

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

async function getRows(range: string): Promise<Array<{ rowNumber: number; row: SheetRow }>> {
  if (!hasGoogleSheetsConfig()) {
    return [];
  }

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });

  const values = response.data.values ?? [];

  if (values.length === 0) {
    return [];
  }

  const [headerRow, ...rows] = values;
  const headers = headerRow.map((value) => value.trim());

  return rows.map((row, index) => {
    const mappedRow: SheetRow = {};

    headers.forEach((header, headerIndex) => {
      mappedRow[header] = row[headerIndex] ?? "";
    });

    return {
      rowNumber: index + 2,
      row: mappedRow
    };
  });
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
    guestSlug: row.guestSlug,
    guestName: row.guestName,
    maxHeadcount: parseNumber(row.maxHeadcount, 1),
    groupLabel: row.groupLabel || undefined,
    active: parseBoolean(row.active, true)
  };
}

function mapRsvp(row: SheetRow, rowNumber?: number): RsvpRecord {
  return {
    guestSlug: row.guestSlug,
    guestName: row.guestName,
    status: row.status === "declined" ? "declined" : "attending",
    headcount: parseNumber(row.headcount, 0),
    submittedAt: row.submittedAt,
    rowNumber
  };
}

async function loadWeddings() {
  if (!hasGoogleSheetsConfig()) {
    return [sampleWedding];
  }

  const rows = await getRows(RANGES.weddings);
  return rows.map(({ row }) => mapWedding(row));
}

async function loadGuests() {
  if (!hasGoogleSheetsConfig()) {
    return sampleGuests;
  }

  const rows = await getRows(RANGES.guests);
  return rows.map(({ row }) => mapGuest(row));
}

async function loadRsvps() {
  if (!hasGoogleSheetsConfig()) {
    return sampleRsvps;
  }

  const rows = await getRows(RANGES.rsvps);
  return rows.map(({ row, rowNumber }) => mapRsvp(row, rowNumber));
}

export async function getInvitePageData(guestSlug: string): Promise<InvitePageData | null> {
  const [weddings, guests, rsvps] = await Promise.all([
    loadWeddings(),
    loadGuests(),
    loadRsvps()
  ]);

  const wedding = weddings.find((item) => item.active);
  const guest = guests.find((item) => item.guestSlug === guestSlug && item.active);

  if (!wedding || !guest) {
    return null;
  }

  const existingRsvp = rsvps.find((item) => item.guestSlug === guestSlug) ?? null;

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
  const weddingRsvps = rsvps;
  const attending = weddingRsvps.filter((rsvp) => rsvp.status === "attending");
  const declined = weddingRsvps.filter((rsvp) => rsvp.status === "declined");
  const pendingCount = Math.max(weddingGuests.length - weddingRsvps.length, 0);

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
  const existingRows = await getRows(RANGES.rsvps);
  const matchingRow = existingRows.find(
    ({ row }) => row.guestSlug === submission.guestSlug
  );

  const recordValues = [
    submission.guestSlug,
    submission.guestName,
    submission.status,
    String(submission.headcount),
    submission.submittedAt
  ];

  if (matchingRow) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `RSVPs!A${matchingRow.rowNumber}:E${matchingRow.rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [recordValues]
      }
    });
  } else {
    await sheets.spreadsheets.values.append({
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
