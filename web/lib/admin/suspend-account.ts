import "server-only";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const userIdSchema = z.string().uuid();

export async function suspendAccount(userId: string) {
  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) {
    throw new Error("A valid account UUID is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("Could not verify the administrator session.");
    throw new Error("Unable to verify administrator access.");
  }
  if (!user) {
    throw new Error("Administrator authentication is required.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Could not verify the administrator account status.");
    throw new Error("Unable to verify administrator access.");
  }
  if (profile?.status !== "active") {
    throw new Error("An active administrator account is required.");
  }

  const { data: actorRoles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.error("Could not verify account-administration permissions.");
    throw new Error("Unable to verify administrator access.");
  }
  if (!actorRoles.some((entry) => entry.role === "admin")) {
    throw new Error("Administrator access is required.");
  }
  if (parsedUserId.data === user.id) {
    throw new Error("Administrators cannot suspend their own account.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("suspend_account_and_revoke_sessions", {
    target_user_id: parsedUserId.data,
    actor_user_id: user.id,
  });

  if (error) {
    console.error("Could not suspend the account and revoke its sessions.");
    throw new Error("Account suspension failed.");
  }
}
