import { z } from "zod";
import type { GuestInvite, RsvpStatus, WeddingConfig } from "@/lib/types";

export const rsvpSchema = z.object({
  guestSlug: z.string().min(1),
  inviteToken: z.string().min(1),
  status: z.enum(["attending", "declined"]),
  headcount: z.coerce.number().int().min(0)
});

export function getRsvpUiState(
  headcount: number,
  guest: GuestInvite,
  wedding: WeddingConfig
) {
  const exceedsMax = wedding.enforceMaxHeadcount && headcount > guest.maxHeadcount;
  const canAttend = headcount >= 1 && !exceedsMax;
  const canDecline = headcount === 0;

  return {
    exceedsMax,
    canAttend,
    canDecline
  };
}

export function validateRsvp(
  status: RsvpStatus,
  headcount: number,
  guest: GuestInvite,
  wedding: WeddingConfig
) {
  if (!Number.isInteger(headcount) || headcount < 0) {
    return "Headcount must be a whole number.";
  }

  if (wedding.enforceMaxHeadcount && headcount > guest.maxHeadcount) {
    return `Headcount cannot be more than ${guest.maxHeadcount} for this invitation.`;
  }

  if (status === "attending" && headcount === 0) {
    return "Set headcount above 0 to confirm attendance.";
  }

  if (status === "declined" && headcount > 0) {
    return "Decline is only allowed when headcount is 0.";
  }

  return null;
}
