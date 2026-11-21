import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import fr from "../messages/fr.json";

function placeholders(value: string) {
  return [...value.matchAll(/\{([^}]+)\}/g)]
    .map(([, name]) => name)
    .sort();
}

function messagePaths(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string"
      ? [path]
      : messagePaths(child as Record<string, unknown>, path);
  });
}

describe("localized messages", () => {
  it("keeps the same keys in French and English", () => {
    expect(messagePaths(en).sort()).toEqual(messagePaths(fr).sort());
  });

  it("keeps interpolation placeholders aligned", () => {
    for (const path of messagePaths(fr)) {
      const get = (messages: Record<string, unknown>) => {
        let value: unknown = messages;
        for (const key of path.split(".")) {
          if (!value || typeof value !== "object") throw new Error(`Missing message: ${path}`);
          value = (value as Record<string, unknown>)[key];
        }
        if (typeof value !== "string") throw new Error(`Missing message: ${path}`);
        return value;
      };
      expect(placeholders(get(en))).toEqual(placeholders(get(fr)));
    }
  });

  it("does not expose developer setup notes to visitors", () => {
    const forbidden = [
      /avant la fin du branchement/i,
      /ne recueillera aucun identifiant/i,
      /fournisseur email à configurer/i,
      /PRÉVISUALISATION/i,
      /58 écrans décrits dans le cahier/i,
      /before setup is complete/i,
      /configure its email provider/i,
      /screens described in the specification/i,
    ];
    for (const messages of [fr, en]) {
      const visibleMessages = messagePaths(messages).map((path) => {
        let value: unknown = messages;
        for (const key of path.split(".")) {
          if (!value || typeof value !== "object") break;
          value = (value as Record<string, unknown>)[key];
        }
        return value;
      }).join("\n");
      for (const phrase of forbidden) expect(visibleMessages).not.toMatch(phrase);
    }
  });
});
