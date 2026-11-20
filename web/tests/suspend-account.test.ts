import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient, createSupabaseAdminClient, rpc } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

const actorId = "00000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";

vi.mock("server-only", () => ({}));
vi.mock("../lib/supabase/server", () => ({ createSupabaseServerClient }));
vi.mock("../lib/supabase/admin", () => ({ createSupabaseAdminClient }));

import { suspendAccount } from "../lib/admin/suspend-account";

function createActorClient(
  roles: Array<{ role: string }> = [{ role: "admin" }],
  profileStatus = "active",
  userId = actorId,
) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    from: vi.fn((table: string) => {
      const result = table === "profiles"
        ? { data: { status: profileStatus }, error: null }
        : { data: roles, error: null };
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn().mockResolvedValue(result),
        then: (resolve: (value: typeof result) => unknown) =>
          Promise.resolve(result).then(resolve),
      };
      return query;
    }),
  };
}

describe("suspendAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ error: null });
    createSupabaseAdminClient.mockReturnValue({ rpc });
  });

  it("rejects malformed target UUIDs before creating any Supabase clients", async () => {
    await expect(suspendAccount("not-a-uuid")).rejects.toThrow("A valid account UUID is required.");
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("requires an authenticated administrator before revoking sessions", async () => {
    const actor = createActorClient([]);
    createSupabaseServerClient.mockResolvedValue(actor);

    await expect(suspendAccount(targetId)).rejects.toThrow("Administrator access is required.");
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rejects suspended administrator accounts", async () => {
    createSupabaseServerClient.mockResolvedValue(
      createActorClient([{ role: "admin" }], "suspended"),
    );

    await expect(suspendAccount(targetId)).rejects.toThrow(
      "An active administrator account is required.",
    );
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("prevents administrators from suspending their own account", async () => {
    createSupabaseServerClient.mockResolvedValue(createActorClient());

    await expect(suspendAccount(actorId)).rejects.toThrow(
      "Administrators cannot suspend their own account.",
    );
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses the service-role RPC to suspend the target and revoke all sessions", async () => {
    createSupabaseServerClient.mockResolvedValue(createActorClient());

    await suspendAccount(targetId);

    expect(createSupabaseAdminClient).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("suspend_account_and_revoke_sessions", {
      target_user_id: targetId,
      actor_user_id: actorId,
    });
  });
});
