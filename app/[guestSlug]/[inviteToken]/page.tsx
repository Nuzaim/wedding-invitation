import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import Image from "next/image";
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
  const mapQuery = encodeURIComponent(`${wedding.venueName} ${wedding.venueAddress}`);

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
      <div className="invitation-dots" aria-hidden="true" />
      <Image
        src="/botanical-side.png"
        alt=""
        aria-hidden="true"
        width={768}
        height={1536}
        className="invitation-botanical invitation-botanical-left"
      />
      <Image
        src="/botanical-side.png"
        alt=""
        aria-hidden="true"
        width={768}
        height={1536}
        className="invitation-botanical invitation-botanical-right"
      />
      <div className="invitation-top-wash" aria-hidden="true" />

      <section className="invitation-card">
        <div className="invitation-inner-border" aria-hidden="true" />
        <div className="invitation-content">
          <div className="invitation-columns">
            <div className="invitation-left">
              <div className="ornament-bismillah-wrap">
                <Image
                  src="/floral-ornament.png"
                  alt=""
                  aria-hidden="true"
                  width={1024}
                  height={512}
                  className="invitation-ornament invitation-ornament-top"
                />
                <p className="bismillah" lang="ar" dir="rtl">
                  بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </p>
              </div>

              <p className="eyebrow">{wedding.inviteTitle}</p>
              <h1 className="guest-name">{guest.guestName}</h1>
              <p className="eyebrow small">{wedding.inviteSubtitle}</p>

              <div className="family-grid">
                <div>
                  <h2>{wedding.groomName}</h2>
                  <p>{wedding.groomFamily}</p>
                </div>
                <div className="family-divider" aria-hidden="true">
                  <div className="family-divider-line" />
                  <span className="divider-heart">♡</span>
                  <div className="family-divider-line" />
                </div>
                <div>
                  <h2>{wedding.brideName}</h2>
                  <p>{wedding.brideFamily}</p>
                </div>
              </div>

              <footer className="invitation-footer invitation-footer-desktop">
                <Image
                  src="/floral-ornament.png"
                  alt=""
                  aria-hidden="true"
                  width={1024}
                  height={512}
                  className="invitation-ornament invitation-ornament-bottom"
                />
              </footer>
            </div>

            <div className="invitation-right">
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
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="venue-link"
                >
                  View on map
                </a>
              </div>

              <Image
                src="/floral-ornament.png"
                alt=""
                aria-hidden="true"
                width={1024}
                height={512}
                className="invitation-ornament"
              />

              <section className="section-block invitation-countdown-block">
                <p className="section-kicker">Countdown To Reception</p>
                <Countdown targetIso={wedding.eventDateIso} initialItems={countdown} />
              </section>

              <RsvpForm
                wedding={wedding}
                guest={guest}
                inviteToken={inviteToken}
                existingRsvp={existingRsvp}
              />
            </div>
          </div>

          <footer className="invitation-footer invitation-footer-mobile">
            <Image
              src="/floral-ornament.png"
              alt=""
              aria-hidden="true"
              width={1024}
              height={512}
              className="invitation-ornament invitation-ornament-bottom"
            />
          </footer>
        </div>
      </section>
    </main>
  );
}
