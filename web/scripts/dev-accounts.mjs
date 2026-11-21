import { randomBytes } from "node:crypto";
import { open, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { getDevelopmentEnvironment } from "./dev-env.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const accountsFile = resolve(scriptDirectory, "../.dev-accounts.txt");
const temporaryFile = `${accountsFile}.tmp`;
const accountDefinitions = [
  { key: "client", email: "client@demo.example.test", name: "TEST - Client", role: "client" },
  { key: "partner", email: "partenaire@demo.example.test", name: "TEST - Partenaire", role: "partner" },
  { key: "courier", email: "livreur@demo.example.test", name: "TEST - Livreur", role: "courier" },
  { key: "admin", email: "admin@demo.example.test", name: "TEST - Admin", role: "admin" },
];

async function checked(result, operation) {
  if (result.error) {
    throw new Error(`${operation} a échoué (${result.error.code ?? "erreur Supabase"}): ${result.error.message}`);
  }
  return result.data;
}

async function main() {
  const environment = getDevelopmentEnvironment();
  try {
    await readFile(accountsFile);
    console.log("Les comptes de test ont déjà été générés. Leurs identifiants restent dans web/.dev-accounts.txt.");
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const client = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: existingUsers } = await checked(
    await client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    "Vérification des comptes de test",
  );
  const occupiedEmails = new Set(existingUsers.users.map((user) => user.email));
  if (accountDefinitions.some((account) => occupiedEmails.has(account.email))) {
    throw new Error("Un compte de test existe déjà, mais web/.dev-accounts.txt est absent. Vérifie le projet avant de continuer.");
  }
  const partner = await checked(
    await client.from("partners").select("id").eq("slug", "ndalea-cuisine").eq("is_demo", true).single(),
    "Vérification de l’enseigne de test partenaire",
  );
  const generated = accountDefinitions.map((account) => ({
    ...account,
    password: randomBytes(24).toString("base64url"),
  }));
  const createdUsers = [];
  try {
    for (const account of generated) {
      const { data, error } = await client.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.name },
      });
      if (error) {
        throw new Error(`Création du compte ${account.key} impossible (${error.code ?? "erreur Supabase"}): ${error.message}`);
      }
      createdUsers.push({ ...account, userId: data.user.id });
    }

    await checked(
      await client.from("user_roles").insert(
        createdUsers.map((account) => ({
          user_id: account.userId,
          role: account.role,
          scope_id: account.role === "partner" ? partner.id : null,
        })),
      ),
      "Attribution des rôles de test",
    );
    await checked(
      await client.from("partner_members").insert({
        user_id: createdUsers.find((account) => account.role === "partner").userId,
        partner_id: partner.id,
      }),
      "Rattachement du compte partenaire de test",
    );

    const contents = [
      "Comptes locaux de démonstration — ne pas réutiliser ailleurs.",
      "Mots de passe générés aléatoirement; ce fichier est ignoré par Git.",
      "",
      ...createdUsers.map((account) => `${account.key}\nE-mail: ${account.email}\nMot de passe: ${account.password}\n`),
    ].join("\n");
    const file = await open(temporaryFile, "wx", 0o600);
    try {
      await file.writeFile(contents, "utf8");
    } finally {
      await file.close();
    }
    await rename(temporaryFile, accountsFile);
  } catch (error) {
    await rm(temporaryFile, { force: true });
    for (const account of createdUsers) {
      await client.auth.admin.deleteUser(account.userId);
    }
    throw error;
  }

  console.log("Les quatre comptes de test ont été créés et confirmés. Leurs mots de passe sont uniquement dans web/.dev-accounts.txt.");
  console.log("Inscris le compte admin au MFA en suivant docs/guides/activer-mfa-admin.md.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "La création des comptes de test a échoué.");
  process.exitCode = 1;
});
