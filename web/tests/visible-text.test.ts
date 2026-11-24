import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["components", "app"];
// Outils réservés au développement : jamais visibles en production.
const devOnlyFiles = new Set(["screen-gallery.tsx"]);

const forbidden: RegExp[] = [
  /pas encore configur/i,
  /n’est pas configur/i,
  /ne sont pas configur/i,
  /brouillon seulement/i,
  /ne fait pas partie de l’aperçu/i,
  /catalogue réel n’est pas configuré/i,
  /prestataire de paiement ne sont pas/i,
  /devis serveur/i,
  /Bot verification is not configured/,
  /account service is not configured/i,
  /live catalogue is not configured/i,
  /payment provider are not configured/i,
  /\(draft only\)/i,
  /not part of the current preview/i,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) && !devOnlyFiles.has(name)
      ? [path]
      : [];
  });
}

describe("visible interface text", () => {
  it("contains no developer setup notes", () => {
    const offences: string[] = [];
    for (const file of roots.flatMap(sourceFiles)) {
      const text = readFileSync(file, "utf8");
      for (const phrase of forbidden) {
        if (phrase.test(text)) offences.push(`${file}: ${phrase}`);
      }
    }
    expect(offences).toEqual([]);
  });
});
