import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import fr from "../messages/fr.json";

function placeholders(value: string) {
  return [...value.matchAll(/\{([^}]+)\}/g)]
    .map(([, name]) => name)
    .sort();
}

describe("localized messages", () => {
  it("keeps the same keys in French and English", () => {
    expect(Object.keys(en.home).sort()).toEqual(Object.keys(fr.home).sort());
  });

  it("keeps interpolation placeholders aligned", () => {
    for (const key of Object.keys(fr.home) as (keyof typeof fr.home)[]) {
      expect(placeholders(en.home[key])).toEqual(placeholders(fr.home[key]));
    }
  });
});
