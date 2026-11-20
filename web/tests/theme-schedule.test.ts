import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isNightInDouala, themeBootstrapScript } from "../lib/theme-schedule";

const themeBootstrapFile = readFileSync(
  join(process.cwd(), "public", "theme-bootstrap.js"),
  "utf8",
).trim();

describe("Douala theme schedule", () => {
  it.each([
    ["before night starts", "2026-01-15T17:29:00Z", false],
    ["at night start", "2026-01-15T17:30:00Z", true],
    ["before day starts", "2026-01-15T04:29:00Z", true],
    ["at day start", "2026-01-15T04:30:00Z", false],
  ])("%s", (_description, instant, expected) => {
    expect(isNightInDouala(new Date(instant))).toBe(expected);
  });

  it("keeps the blocking external bootstrap in sync with the schedule", () => {
    expect(themeBootstrapScript).toContain('timeZone:"Africa/Douala"');
    expect(themeBootstrapScript).toContain("t>=1110||t<330");
    expect(themeBootstrapFile.replace(/;$/, "")).toBe(themeBootstrapScript);
  });
});
