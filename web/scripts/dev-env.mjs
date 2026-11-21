import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const envFilePath = resolve(scriptDirectory, "..", ".env.local");
const turnstileTestKey = "1x00000000000000000000AA";

function readEnvFile(path) {
  const contents = readFileSync(path, "utf8");
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator < 1) throw new Error("Une ligne de .env.local est invalide.");
        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value];
      }),
  );
}

export function getDevelopmentEnvironment() {
  let fileEnvironment;
  try {
    fileEnvironment = readEnvFile(envFilePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Crée d’abord web/.env.local à partir de web/.env.example.");
    }
    throw error;
  }

  return validateDevelopmentEnvironment({ ...fileEnvironment, ...process.env });
}

export function validateDevelopmentEnvironment(environment) {
  if (environment.APP_ENV !== "development" || environment.NODE_ENV === "production") {
    throw new Error("Opération refusée : APP_ENV doit être development et NODE_ENV ne doit pas être production.");
  }
  if (environment.SUPABASE_DEV_PROJECT_NAME !== "livraison-douala-dev") {
    throw new Error("Le projet doit être explicitement nommé livraison-douala-dev dans .env.local.");
  }
  if (!environment.SUPABASE_DEV_PROJECT_REF) {
    throw new Error("Renseigne SUPABASE_DEV_PROJECT_REF avec la référence du projet de développement.");
  }
  if (!/^[a-z0-9]{20}$/i.test(environment.SUPABASE_DEV_PROJECT_REF.trim())) {
    throw new Error("SUPABASE_DEV_PROJECT_REF doit être la référence Supabase de 20 caractères.");
  }
  if (!environment.NEXT_PUBLIC_SUPABASE_URL || !environment.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Renseigne l’URL Supabase et la clé anon du projet de développement.");
  }
  if (!environment.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Renseigne la clé service_role uniquement dans web/.env.local.");
  }
  if (environment.AUTHENTICATION_ENABLED !== "true") {
    throw new Error("Active AUTHENTICATION_ENABLED=true pour tester les comptes de développement.");
  }
  if (environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== turnstileTestKey) {
    throw new Error("Utilise la clé publique officielle de test Turnstile dans cet environnement de développement.");
  }
  if (environment.NEXT_PUBLIC_SITE_URL !== "http://localhost:3000") {
    throw new Error("NEXT_PUBLIC_SITE_URL doit rester http://localhost:3000 pour ce script.");
  }
  if (!environment.NEXT_PUBLIC_TERMS_VERSION || !environment.NEXT_PUBLIC_PRIVACY_VERSION) {
    throw new Error("Renseigne NEXT_PUBLIC_TERMS_VERSION et NEXT_PUBLIC_PRIVACY_VERSION.");
  }

  let projectUrl;
  try {
    projectUrl = new URL(environment.NEXT_PUBLIC_SUPABASE_URL);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL n’est pas une URL valide.");
  }
  const expectedProjectRef = environment.SUPABASE_DEV_PROJECT_REF.trim();
  if (
    projectUrl.protocol !== "https:" ||
    !projectUrl.hostname.endsWith(".supabase.co") ||
    projectUrl.username ||
    projectUrl.password ||
    projectUrl.pathname !== "/" ||
    projectUrl.search ||
    projectUrl.hash ||
    projectUrl.hostname.slice(0, -".supabase.co".length) !== expectedProjectRef
  ) {
    throw new Error("L’URL Supabase ne correspond pas à SUPABASE_DEV_PROJECT_REF; aucune commande n’a été lancée.");
  }

  return { ...environment, SUPABASE_DEV_PROJECT_REF: expectedProjectRef };
}
