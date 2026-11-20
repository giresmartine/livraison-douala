import { describe, expect, it } from "vitest";
import { isNightInDouala, themeBootstrapScript } from "../lib/theme-schedule";

describe("Douala theme schedule", () => {
  it.each([
    ["before night starts", "2026-01-15T17:29:00Z", false],
    ["at night start", "2026-01-15T17:30:00Z", true],
    ["before day starts", "2026-01-15T04:29:00Z", true],
    ["at day start", "2026-01-15T04:30:00Z", false],
  ])("%s", (_description, instant, expected) => {
    expect(isNightInDouala(new Date(instant))).toBe(expected);
  });

  it("runs the same schedule in the pre-render bootstrap script", () => {
    expect(themeBootstrapScript).toContain('timeZone:"Africa/Douala"');
    expect(themeBootstrapScript).toContain("t>=1110||t<330");
  });
});
