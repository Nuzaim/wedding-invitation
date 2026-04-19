import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Countdown } from "@/components/countdown";
import { RsvpForm } from "@/components/rsvp-form";
import { isInviteTokenValid } from "@/lib/invite-signature";
import { getInvitePageData } from "@/lib/google-sheets";
import { formatEventDate, getCountdownParts } from "@/lib/utils";

type Props = {
  params: Promise<{
    guestSlug: string;
    inviteToken: string;
  }>;
};

export default async function InvitationPage({ params }: Props) {
  const { guestSlug, inviteToken } = await params;
  const data = await getInvitePageData(guestSlug);

  if (!data) {
    notFound();
  }

  const { wedding, guest, existingRsvp } = data;

  if (!isInviteTokenValid(guest.guestName, inviteToken)) {
    notFound();
  }

  const eventDate = formatEventDate(wedding.eventDateIso);
  const countdown = getCountdownParts(wedding.eventDateIso);

  return (
    <main
      className="invitation-shell"
      style={
        {
          "--accent": wedding.accentColor,
          "--accent-soft": wedding.accentSoftColor,
          "--text-main": wedding.textColor,
          "--glow": wedding.backgroundGlow
        } as CSSProperties
      }
    >
      <section className="invitation-card">
        <p className="eyebrow">{wedding.inviteTitle}</p>
        <h1 className="guest-name">{guest.guestName}</h1>
        <p className="eyebrow small">{wedding.inviteSubtitle}</p>

        <div className="family-grid">
          <div>
            <h2>{wedding.groomName}</h2>
            <p>{wedding.groomFamily}</p>
          </div>
          <div className="divider-heart">♡</div>
          <div>
            <h2>{wedding.brideName}</h2>
            <p>{wedding.brideFamily}</p>
          </div>
        </div>

        <p className="eyebrow honor-line">{wedding.guestHonorLine}</p>

        <div className="date-card">
          <div>
            <span>{eventDate.month}</span>
            <strong>{eventDate.weekdayYear}</strong>
          </div>
          <div className="date-number">{eventDate.day}</div>
          <div>
            <span>{wedding.eventTimeLabel}</span>
            <strong>{wedding.eventLabel}</strong>
          </div>
        </div>

        {wedding.eventAltCalendarLabel ? (
          <p className="alt-calendar">{wedding.eventAltCalendarLabel}</p>
        ) : null}

        <div className="venue-block">
          <h3>{wedding.venueName}</h3>
          <p>{wedding.venueAddress}</p>
        </div>

        <section className="section-block">
          <p className="section-kicker">Countdown To Reception</p>
          <Countdown targetIso={wedding.eventDateIso} initialItems={countdown} />
        </section>

        <RsvpForm
          wedding={wedding}
          guest={guest}
          inviteToken={inviteToken}
          existingRsvp={existingRsvp}
        />
      </section>
    </main>
  );
}
