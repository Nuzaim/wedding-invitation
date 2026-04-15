"use client";

import { useEffect, useState } from "react";
import { getCountdownParts } from "@/lib/utils";

type Props = {
  targetIso: string;
  initialItems: Array<{
    label: string;
    value: string;
  }>;
};

export function Countdown({ targetIso, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(getCountdownParts(targetIso));

    const intervalId = window.setInterval(() => {
      setItems(getCountdownParts(targetIso));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [targetIso]);

  return (
    <div className="countdown-grid">
      {items.map((item) => (
        <div key={item.label} className="countdown-box">
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
