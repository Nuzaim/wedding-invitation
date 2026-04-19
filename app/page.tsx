import Link from "next/link";
import { sampleGuests } from "@/lib/sample-data";

export default function HomePage() {
  const demoGuest = sampleGuests[0];

  return (
    <main className="landing-page">
      <div className="landing-card">
        <p className="section-kicker">Wedding Invitation</p>
        <h1>Guest-personalized wedding invitations with RSVP tracking</h1>
        <p>
          This app renders invitation pages from Google Sheets and accepts RSVPs with conditional
          headcount rules for one wedding.
        </p>
        <div className="landing-links">
          <Link href={`/${demoGuest.guestSlug}`}>Open demo invitation</Link>
          <Link href="/admin">Open admin summary</Link>
        </div>
      </div>
    </main>
  );
}
