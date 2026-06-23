import { z } from "zod";

export const env = z.object({
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().trim().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().trim().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().trim().optional(),
  GOOGLE_SHEETS_WEDDINGS_RANGE: z.string().trim().default("Weddings!A:Z"),
  GOOGLE_SHEETS_GUESTS_RANGE: z.string().trim().default("Guests!A:Z"),
  GOOGLE_SHEETS_RSVPS_RANGE: z.string().trim().default("RSVPs!A:E"),
  GOOGLE_SHEETS_PAGE_SIZE: z.coerce.number().int().positive().default(500),
  GOOGLE_SHEETS_SQLITE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  WEDDING_SQLITE_PATH: z.string().trim().default("/tmp/wedding-invitation.sqlite"),
  INVITE_TOKEN_SECRET: z.string().trim().min(1, "INVITE_TOKEN_SECRET is required"),
  ADMIN_BASIC_AUTH_USER: z.string().trim().optional(),
  ADMIN_BASIC_AUTH_PASS: z.string().trim().optional(),
}).parse(process.env);

export function hasGoogleSheetsConfig() {
  return Boolean(
    env.GOOGLE_SHEETS_SPREADSHEET_ID &&
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

export function getSqliteCacheTtlMs() {
  return env.GOOGLE_SHEETS_SQLITE_CACHE_TTL_SECONDS * 1000;
}
