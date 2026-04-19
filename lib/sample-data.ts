import type { GuestInvite, RsvpRecord, WeddingConfig } from "@/lib/types";

export const sampleWedding: WeddingConfig = {
  inviteTitle: "Exclusive Invitation For",
  inviteSubtitle: "Together with their families",
  guestHonorLine: "Request the honor of your presence",
  groomName: "Ali",
  groomFamily: "Groom Family",
  brideName: "Fathima",
  brideFamily: "Bride Family",
  eventLabel: "Reception",
  eventDateIso: "2026-04-16T16:00:00+05:30",
  eventTimeLabel: "10 PM",
  eventAltCalendarLabel: "30 Shawwal 1447",
  venueName: "Zubaida Park Auditorium",
  venueAddress: "Pathumoochickal, Vengara",
  accentColor: "#7f9b7e",
  accentSoftColor: "#dff4e2",
  textColor: "#243228",
  backgroundGlow: "rgba(127, 155, 126, 0.18)",
  enforceMaxHeadcount: true,
  active: true
};

export const sampleGuests: GuestInvite[] = [
  {
    guestSlug: "ameer",
    guestName: "Ameer Pappali",
    maxHeadcount: 3,
    groupLabel: "Family",
    active: true
  },
  {
    guestSlug: "demo-guest",
    guestName: "Demo Guest",
    maxHeadcount: 1,
    groupLabel: "Friends",
    active: true
  }
];

export const sampleRsvps: RsvpRecord[] = [];
