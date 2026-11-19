"use client";

import { useEffect } from "react";

export function ThemeSchedule() {
  useEffect(() => {
    function updateTheme() {
      const parts = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Africa/Douala",
      }).formatToParts(new Date());
      const hour = Number(parts.find((part) => part.type === "hour")?.value);
      const minute = Number(parts.find((part) => part.type === "minute")?.value);
      const localMinutes = hour * 60 + minute;
      const isNight = localMinutes >= 18 * 60 + 30 || localMinutes < 5 * 60 + 30;

      document.documentElement.classList.toggle("theme-night", isNight);
    }

    updateTheme();
    const intervalId = window.setInterval(updateTheme, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return null;
}
