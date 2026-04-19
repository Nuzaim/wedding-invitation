import { NextResponse } from "next/server";
import { getInvitePageData, saveRsvp } from "@/lib/google-sheets";
import { rsvpSchema, validateRsvp } from "@/lib/rsvp";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = rsvpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid RSVP payload." }, { status: 400 });
  }

  const { guestSlug, status, headcount } = parsed.data;
  const inviteData = await getInvitePageData(guestSlug);

  if (!inviteData) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  const validationError = validateRsvp(status, headcount, inviteData.guest, inviteData.wedding);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const record = await saveRsvp({
    guestSlug,
    guestName: inviteData.guest.guestName,
    status,
    headcount,
    submittedAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    })
  });

  return NextResponse.json({ ok: true, record });
}
