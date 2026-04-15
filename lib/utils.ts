export function parseBoolean(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
}

export function parseNumber(value: string | undefined, fallback = 0) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatEventDate(dateIso: string) {
  const date = new Date(dateIso);

  return {
    month: new Intl.DateTimeFormat("en-US", { month: "long" }).format(date),
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date),
    weekdayYear: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric"
    }).format(date)
  };
}

export function getCountdownParts(targetIso: string) {
  const now = Date.now();
  const target = new Date(targetIso).getTime();
  const remaining = Math.max(target - now, 0);
  const totalSeconds = Math.floor(remaining / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return [
    { label: "Days", value: String(days).padStart(2, "0") },
    { label: "Hours", value: String(hours).padStart(2, "0") },
    { label: "Mins", value: String(mins).padStart(2, "0") },
    { label: "Secs", value: String(secs).padStart(2, "0") }
  ];
}

export function cn(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(" ");
}
