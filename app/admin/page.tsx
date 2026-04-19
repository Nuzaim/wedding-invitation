import { notFound } from "next/navigation";
import { getWeddingDashboard } from "@/lib/google-sheets";

export default async function AdminPage() {
  const dashboard = await getWeddingDashboard();

  if (!dashboard) {
    notFound();
  }

  return (
    <main className="admin-page">
      <section className="admin-card">
        <p className="section-kicker">Admin Summary</p>
        <h1>{dashboard.wedding.inviteTitle}</h1>
        <p>{dashboard.wedding.venueName}</p>

        <div className="admin-metrics">
          <div>
            <strong>{dashboard.guests.length}</strong>
            <span>Total Guests</span>
          </div>
          <div>
            <strong>{dashboard.pendingCount}</strong>
            <span>Pending</span>
          </div>
          <div>
            <strong>{dashboard.attendingHeadcount}</strong>
            <span>Attending Headcount</span>
          </div>
          <div>
            <strong>{dashboard.declinedCount}</strong>
            <span>Declined</span>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Group</th>
                <th>Status</th>
                <th>Headcount</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.guests.map((guest) => {
                const rsvp =
                  dashboard.rsvps.find((item) => item.guestSlug === guest.guestSlug) ?? null;

                return (
                  <tr key={guest.guestSlug}>
                    <td>{guest.guestName}</td>
                    <td>{guest.groupLabel ?? "-"}</td>
                    <td>{rsvp?.status ?? "pending"}</td>
                    <td>{rsvp?.headcount ?? "-"}</td>
                    <td>{rsvp?.submittedAt ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
