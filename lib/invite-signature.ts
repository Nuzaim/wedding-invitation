import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/config";

function normalizeGuestName(guestName: string) {
  return guestName.trim().toLowerCase();
}

function toHexSignature(guestName: string) {
  return createHmac("sha256", env.INVITE_TOKEN_SECRET)
    .update(normalizeGuestName(guestName), "utf8")
    .digest("hex");
}

export function createInviteToken(guestName: string) {
  return toHexSignature(guestName);
}

export function isInviteTokenValid(guestName: string, inviteToken: string) {
  if (!/^[0-9a-f]{64}$/i.test(inviteToken)) {
    return false;
  }

  const expected = Buffer.from(toHexSignature(guestName), "hex");
  const provided = Buffer.from(inviteToken, "hex");

  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
