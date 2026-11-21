import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { getDevelopmentEnvironment } from "./dev-env.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const cli = process.platform === "win32" ? "npx.cmd" : "npx";

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${args.join(" ")} s’est arrêté avec le code ${code ?? "inconnu"}.`));
    });
  });
}

async function main() {
  const environment = getDevelopmentEnvironment();
  console.log(`Projet explicitement marqué développement : ${environment.SUPABASE_DEV_PROJECT_NAME} (${environment.SUPABASE_DEV_PROJECT_REF}).`);
  console.log("La connexion Supabase peut ouvrir le navigateur. Ne copie aucun secret dans le chat.");
  await run(cli, ["supabase", "login"]);
  await run(cli, ["supabase", "link", "--project-ref", environment.SUPABASE_DEV_PROJECT_REF]);
  await run(cli, ["supabase", "db", "push", "--linked"]);
  await run(process.execPath, [resolve(scriptDirectory, "dev-seed.mjs")]);
  await run(process.execPath, [resolve(scriptDirectory, "dev-accounts.mjs")]);
  console.log("Initialisation du projet de développement terminée. Aucun projet de production n’a été ciblé.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "L’initialisation du projet de développement a échoué.");
  process.exitCode = 1;
});
