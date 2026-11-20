import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const commandPrefix = ["supabase"];
const isWindows = process.platform === "win32";
const npmExec = isWindows ? "npx.cmd" : "npx";
const buildCommand = isWindows ? "npm run build:webpack" : "npm run build";

function run(args, options = {}) {
  const result = spawnSync(npmExec, [...commandPrefix, ...args], {
    encoding: "utf8",
    shell: isWindows,
    ...options,
  });

  if (result.error) {
    throw new Error(`Could not run Supabase CLI: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
      .replace(/((?:anon|service_role|JWT secret|SECRET_KEY)[^:\r\n]*:\s*)\S+/gi, "$1[redacted]")
      .trim();
    throw new Error(output || `Supabase CLI exited with status ${result.status}.`);
  }

  return result.stdout ?? "";
}

function parseEnvOutput(output) {
  const variables = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Z_]+)=(?:"([^"]*)"|'([^']*)'|(.*))$/);
    if (match) variables[match[1]] = match[2] ?? match[3] ?? match[4];
  }
  return variables;
}

async function provisionAccounts(supabaseUrl, serviceRoleKey) {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const password = "Local-e2e-Password-123!";
  const definitions = [
    { email: "e2e-client@example.test", role: "client" },
    { email: "e2e-partner@example.test", role: "partner" },
    { email: "e2e-courier@example.test", role: "courier" },
    { email: "e2e-admin@example.test", role: "admin" },
  ];
  const { data: userPage, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw new Error(`Could not list local test users: ${listError.message}`);

  for (const definition of definitions) {
    const existing = userPage.users.find((user) => user.email === definition.email);
    const userResult = existing
      ? await admin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
        })
      : await admin.auth.admin.createUser({
          email: definition.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: `E2E ${definition.role}` },
        });
    if (userResult.error) {
      throw new Error(`Could not provision ${definition.role} test user: ${userResult.error.message}`);
    }

    const userId = userResult.data.user.id;
    const { error: profileError } = await admin
      .from("profiles")
      .update({ status: "active" })
      .eq("id", userId);
    if (profileError) {
      throw new Error(`Could not activate ${definition.role} test user: ${profileError.message}`);
    }

    const { data: assignedRole, error: roleReadError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", definition.role)
      .maybeSingle();
    if (roleReadError) {
      throw new Error(`Could not verify ${definition.role} test role: ${roleReadError.message}`);
    }
    if (!assignedRole) {
      const { error: roleWriteError } = await admin
        .from("user_roles")
        .insert({ user_id: userId, role: definition.role });
      if (roleWriteError) {
        throw new Error(`Could not assign ${definition.role} test role: ${roleWriteError.message}`);
      }
    }
  }
}

let startedHere = false;

try {
  let statusOutput;
  try {
    statusOutput = run(["status", "-o", "env"]);
  } catch {
    console.log("Starting isolated local Supabase for authenticated browser tests...");
    run(["start"]);
    startedHere = true;
    statusOutput = run(["status", "-o", "env"]);
  }

  const local = parseEnvOutput(statusOutput);
  const supabaseUrl = local.API_URL;
  const anonKey = local.ANON_KEY;
  const serviceRoleKey = local.SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Supabase status did not provide API_URL, ANON_KEY, and SERVICE_ROLE_KEY.");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(new URL(supabaseUrl).hostname)) {
    throw new Error("Refusing to provision test accounts outside a loopback Supabase instance.");
  }

  await provisionAccounts(supabaseUrl, serviceRoleKey);
  console.log("Provisioned isolated client, partner, courier, and admin test accounts.");

  const baseURL = "http://127.0.0.1:3101";
  const env = {
    ...process.env,
    AUTHENTICATION_ENABLED: "true",
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SITE_URL: baseURL,
    NEXT_PUBLIC_TERMS_VERSION: "e2e-test",
    NEXT_PUBLIC_PRIVACY_VERSION: "e2e-test",
    E2E_BUILD_COMMAND: buildCommand,
  };
  const result = spawnSync(
    isWindows ? "npx.cmd" : "npx",
    ["playwright", "test"],
    { stdio: "inherit", shell: isWindows, env },
  );
  if (result.error) throw new Error(`Could not run Playwright: ${result.error.message}`);
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (startedHere) {
    console.log("Stopping the local Supabase test stack...");
    try {
      run(["stop", "--no-backup"]);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
}
