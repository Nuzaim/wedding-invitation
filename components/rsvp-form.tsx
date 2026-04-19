"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { getRsvpUiState } from "@/lib/rsvp";
import type { GuestInvite, RsvpRecord, WeddingConfig } from "@/lib/types";

type Props = {
  wedding: WeddingConfig;
  guest: GuestInvite;
  inviteToken: string;
  existingRsvp: RsvpRecord | null;
};

type SavedState = {
  status: "attending" | "declined";
  headcount: number;
  submittedAt?: string;
};

export function RsvpForm({ wedding, guest, inviteToken, existingRsvp }: Props) {
  const [headcount, setHeadcount] = useState(existingRsvp?.headcount ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedState | null>(
    existingRsvp
      ? {
          status: existingRsvp.status,
          headcount: existingRsvp.headcount,
          submittedAt: existingRsvp.submittedAt
        }
      : null
  );
  const [isPending, startTransition] = useTransition();

  const uiState = getRsvpUiState(headcount, guest, wedding);
  const stateMessage = uiState.exceedsMax
    ? `Headcount cannot be more than ${guest.maxHeadcount} for this invitation.`
    : headcount === 0
      ? "Headcount is 0, so only decline RSVP is allowed."
      : "Decline RSVP is disabled while headcount is above 0.";

  async function submit(status: "attending" | "declined") {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          guestSlug: guest.guestSlug,
          inviteToken,
          status,
          headcount
        })
      });

      const payload = (await response.json()) as
        | { error: string }
        | { ok: true; record: SavedState };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Unable to save RSVP.");
        return;
      }

      setSaved(payload.record);
    });
  }

  return (
    <section className="section-block">
      <p className="section-kicker">Will you attend?</p>
      <div className="headcount-panel">
        <label className="headcount-label" htmlFor="headcount">
          Headcount
        </label>
        <input
          id="headcount"
          className={cn("headcount-input", error && "headcount-input-error")}
          type="number"
          min={0}
          value={headcount}
          onChange={(event) => {
            setHeadcount(Number(event.target.value));
            setError(null);
          }}
        />
        <p className="headcount-help">
          {wedding.enforceMaxHeadcount
            ? `0 means decline. 1-${guest.maxHeadcount} means attending.`
            : "0 means decline. Any number above 0 means attending."}
        </p>
      </div>

      {saved ? (
        <div className="saved-state">
          <strong>{saved.status === "attending" ? "Attendance confirmed" : "Marked as declined"}</strong>
          <span>
            Headcount: {saved.headcount} {saved.submittedAt ? `• ${saved.submittedAt}` : ""}
          </span>
        </div>
      ) : null}

      <p className={cn("state-text", uiState.exceedsMax && "error-text")}>{stateMessage}</p>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="rsvp-actions">
        <button
          type="button"
          className="rsvp-button accept"
          disabled={!uiState.canAttend || isPending}
          onClick={() => void submit("attending")}
        >
          <span className="button-icon">✓</span>
          <span>
            <strong>Yes, In Sha Allah</strong>
            <small>{headcount >= 1 ? `Attending with ${headcount}` : "Set headcount above 0"}</small>
          </span>
        </button>
        <button
          type="button"
          className="rsvp-button decline"
          disabled={!uiState.canDecline || isPending}
          onClick={() => void submit("declined")}
        >
          <span className="button-icon">×</span>
          <span>
            <strong>Unfortunately, I can't make it</strong>
            <small>{headcount === 0 ? "Available now" : "Only available when headcount is 0"}</small>
          </span>
        </button>
      </div>
    </section>
  );
}
