import { describe, expect, it } from "vitest";
import { roleDestinations } from "../lib/auth";
import { getScreenById, getScreenByPath, screens } from "../lib/screens";

describe("screen registry", () => {
  it("contains all 58 specified screens with unique IDs and routes", () => {
    expect(screens).toHaveLength(58);
    expect(new Set(screens.map((screen) => screen.id)).size).toBe(58);
    expect(new Set(screens.map((screen) => screen.href)).size).toBe(58);
  });

  it("has the expected number of screens in each workspace", () => {
    expect(screens.filter((screen) => screen.group === "client")).toHaveLength(37);
    expect(screens.filter((screen) => screen.group === "partner")).toHaveLength(5);
    expect(screens.filter((screen) => screen.group === "courier")).toHaveLength(4);
    expect(screens.filter((screen) => screen.group === "operations")).toHaveLength(12);
  });

  it("keeps all next-screen references valid", () => {
    for (const screen of screens) {
      for (const nextId of screen.next ?? []) {
        expect(getScreenById(nextId), `${screen.id} -> ${nextId}`).toBeDefined();
      }
    }
  });

  it("resolves the documented pharmacy and password-reset aliases", () => {
    expect(getScreenByPath("adresse/confirmer")?.id).toBe("S-02");
    expect(getScreenByPath("e/restaurant-apercu", true)?.id).toBe("S-09");
    expect(getScreenByPath("mot-de-passe/reinitialiser")?.id).toBe("S-35");
  });

  it("maps every role destination to a registered screen", () => {
    for (const [role, destination] of Object.entries(roleDestinations)) {
      expect(
        getScreenByPath(destination.replace(/^\//, "")),
        `${role} -> ${destination}`,
      ).toBeDefined();
    }
  });
});
