import { redirect } from "next/navigation";
import { isAuthenticationEnabled } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "client" | "partner" | "courier" | "zone_agent" | "admin";

export const roleDestinations: Record<AppRole, string> = {
  client: "/accueil",
  partner: "/pro",
  courier: "/livreur",
  zone_agent: "/ops",
  admin: "/ops",
};

export async function getRoleDestination(locale: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return `/${locale}/connexion`;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Could not load authenticated user status.");
    throw new Error("Unable to load account status.");
  }

  if (!profile || profile.status !== "active") {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Could not revoke an inactive account session.");
    return `/${locale}/connexion`;
  }

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.error("Could not load authenticated user roles.");
    throw new Error("Unable to load account permissions.");
  }

  const priority: AppRole[] = ["admin", "zone_agent", "partner", "courier", "client"];
  const role = priority.find((candidate) =>
    roles.some((entry) => entry.role === candidate),
  );

  return role ? `/${locale}${roleDestinations[role]}` : `/${locale}/connexion`;
}

export async function requireRole(
  locale: string,
  allowedRoles: AppRole[],
  returnTo: string,
) {
  if (!isAuthenticationEnabled) {
    redirect(`/${locale}/connexion?setup=required`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/${locale}/connexion?next=${encodeURIComponent(returnTo)}`);
  }

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.error("Could not load authenticated user roles.");
    throw new Error("Unable to load account permissions.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Could not load authenticated user status.");
    throw new Error("Unable to load account status.");
  }

  if (!profile || profile.status !== "active") {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Could not revoke an inactive account session.");
    redirect(`/${locale}/connexion`);
  }

  if (!roles.some((entry) => allowedRoles.includes(entry.role as AppRole))) {
    redirect(await getRoleDestination(locale));
  }

  return { supabase, user };
}
