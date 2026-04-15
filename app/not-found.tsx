import type { Route } from "next";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="landing-page">
      <div className="landing-card">
        <p className="section-kicker">Invitation Not Found</p>
        <h1>This guest link is missing or inactive.</h1>
        <p>Check the wedding slug and guest slug, or update the source data in Google Sheets.</p>
        <Link href={"/" as Route}>Back to home</Link>
      </div>
    </main>
  );
}
