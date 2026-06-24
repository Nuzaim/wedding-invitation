import { env } from "@/lib/config";
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
import type { SheetRow } from "./cache";
import { SheetsClient, hasGoogleSheetsConfig } from "./client";

export { hasGoogleSheetsConfig };

const RANGES = {
  weddings: env.GOOGLE_SHEETS_WEDDINGS_RANGE,
  guests: env.GOOGLE_SHEETS_GUESTS_RANGE,
  rsvps: env.GOOGLE_SHEETS_RSVPS_RANGE
};

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

  const rows = await SheetsClient.getRows("weddings", RANGES.weddings);
  return rows.map(({ row }) => mapWedding(row));
}

async function loadGuests() {
  if (!hasGoogleSheetsConfig()) {
    return sampleGuests;
  }

  const rows = await SheetsClient.getRows("guests", RANGES.guests);
  return rows.map(({ row }) => mapGuest(row));
}

async function loadRsvps() {
  if (!hasGoogleSheetsConfig()) {
    return sampleRsvps;
  }

  const rows = await SheetsClient.getRows("rsvps", RANGES.rsvps, [
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
  return SheetsClient.saveRsvp({
    guestSlug: submission.guestSlug,
    guestName: submission.guestName,
    status: submission.status,
    headcount: submission.headcount,
    submittedAt: submission.submittedAt
  });
}