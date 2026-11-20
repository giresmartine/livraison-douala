import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient, createSupabaseAdminClient, rpc } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../lib/supabase/server", () => ({ createSupabaseServerClient }));
vi.mock("../lib/supabase/admin", () => ({ createSupabaseAdminClient }));

import { suspendAccount } from "../lib/admin/suspend-account";

function createActorClient(
  roles: Array<{ role: string }> = [{ role: "admin" }],
  profileStatus = "active",
) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }) },
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

  it("requires an authenticated administrator before revoking sessions", async () => {
    const actor = createActorClient([]);
    createSupabaseServerClient.mockResolvedValue(actor);

    await expect(suspendAccount("customer-1")).rejects.toThrow("Administrator access is required.");
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rejects suspended administrator accounts", async () => {
    createSupabaseServerClient.mockResolvedValue(
      createActorClient([{ role: "admin" }], "suspended"),
    );

    await expect(suspendAccount("customer-1")).rejects.toThrow(
      "An active administrator account is required.",
    );
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("uses the service-role RPC to suspend the target and revoke all sessions", async () => {
    createSupabaseServerClient.mockResolvedValue(createActorClient());

    await suspendAccount("customer-1");

    expect(createSupabaseAdminClient).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("suspend_account_and_revoke_sessions", {
      target_user_id: "customer-1",
    });
  });
});
