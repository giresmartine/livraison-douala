import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  isAuthenticationEnabled: true,
  publicEnvironment: {
    NEXT_PUBLIC_SITE_URL: "https://livraison.example",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-site-key",
    NEXT_PUBLIC_TERMS_VERSION: "terms-v1",
    NEXT_PUBLIC_PRIVACY_VERSION: "privacy-v1",
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
} from "../app/[locale]/auth-actions";

const captchaToken = "XXXX.DUMMY.TOKEN.XXXX";

function createFormData(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("Supabase authentication CAPTCHA token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithPassword: mocks.signInWithPassword,
        signUp: mocks.signUp,
        resetPasswordForEmail: mocks.resetPasswordForEmail,
      },
    });
    mocks.signInWithPassword.mockResolvedValue({ error: new Error("Auth rejected") });
    mocks.signUp.mockResolvedValue({ error: new Error("Auth rejected") });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: new Error("Auth rejected") });
  });

  it("passes the token to sign-in", async () => {
    await signInAction(
      {},
      createFormData({
        locale: "fr",
        email: "person@example.test",
        password: "pass",
        captchaToken,
      }),
    );

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "person@example.test",
      password: "pass",
      options: { captchaToken },
    });
  });

  it("passes the token to sign-up", async () => {
    await signUpAction(
      {},
      createFormData({
        locale: "fr",
        fullName: "Test User",
        email: "person@example.test",
        password: "long-password-123",
        ageConfirmed: "on",
        legalAccepted: "on",
        captchaToken,
      }),
    );

    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "person@example.test",
        options: expect.objectContaining({ captchaToken }),
      }),
    );
  });

  it("passes the token to password-reset requests", async () => {
    await requestPasswordResetAction(
      {},
      createFormData({
        locale: "fr",
        email: "person@example.test",
        captchaToken,
      }),
    );

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "person@example.test",
      expect.objectContaining({ captchaToken }),
    );
  });

  it("rejects a missing token before calling Supabase", async () => {
    const result = await signInAction(
      {},
      createFormData({
        locale: "fr",
        email: "person@example.test",
        password: "pass",
      }),
    );

    expect(result.error).toBe("La vérification anti-robot a échoué. Réessaie.");
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });
});
