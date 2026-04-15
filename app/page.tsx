import Link from "next/link";
import { sampleGuests, sampleWedding } from "@/lib/sample-data";

export default function HomePage() {
  const demoGuest = sampleGuests[0];

  return (
    <main className="landing-page">
      <div className="landing-card">
        <p className="section-kicker">Reusable Wedding Template</p>
        <h1>Guest-personalized wedding invitations with RSVP tracking</h1>
        <p>
          This starter renders invitation pages from Google Sheets and accepts RSVPs with conditional
          headcount rules.
        </p>
        <div className="landing-links">
          <Link href={`/${sampleWedding.weddingSlug}/${demoGuest.guestSlug}`}>Open demo invitation</Link>
          <Link
            href={{
              pathname: "/admin",
              query: { wedding: sampleWedding.weddingSlug }
            }}
          >
            Open admin summary
          </Link>
        </div>
      </div>
    </main>
  );
}
