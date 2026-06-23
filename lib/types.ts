export type RsvpStatus = "attending" | "declined";

export type WeddingConfig = {
  inviteTitle: string;
  inviteSubtitle: string;
  guestHonorLine: string;
  groomName: string;
  groomFamily: string;
  brideName: string;
  brideFamily: string;
  eventLabel: string;
  eventDateIso: string;
  eventTimeLabel: string;
  eventAltCalendarLabel?: string;
  venueName: string;
  venueAddress: string;
  accentColor: string;
  accentSoftColor: string;
  textColor: string;
  backgroundGlow: string;
  enforceMaxHeadcount: boolean;
  active: boolean;
};

export type GuestInvite = {
  guestSlug: string;
  guestName: string;
  maxHeadcount: number;
  groupLabel?: string;
  active: boolean;
};

export type RsvpRecord = {
  guestSlug: string;
  guestName: string;
  status: RsvpStatus;
  headcount: number;
  submittedAt?: string;
  rowNumber?: number;
};

export type InvitePageData = {
  wedding: WeddingConfig;
  guest: GuestInvite;
  existingRsvp: RsvpRecord | null;
};

export type RsvpSubmission = {
  guestSlug: string;
  guestName: string;
  status: RsvpStatus;
  headcount: number;
  submittedAt: string;
};

export type DashboardSummary = {
  wedding: WeddingConfig;
  guests: GuestInvite[];
  rsvps: RsvpRecord[];
  pendingCount: number;
  attendingPartyCount: number;
  attendingHeadcount: number;
  declinedCount: number;
};
