"use client";

import { useEffect } from "react";
import { isNightInDouala } from "@/lib/theme-schedule";

export function ThemeSchedule() {
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      document.documentElement.classList.toggle("theme-night", isNightInDouala(new Date()));
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return null;
}
