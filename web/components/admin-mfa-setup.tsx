"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { brand } from "@/lib/config/brand";
import type { Locale } from "@/lib/screens";

type TotpEnrollment = {
  factorId: string;
  secret: string;
  qrCode: string;
};

export function AdminMfaSetup({
  locale,
  initiallyMfaEnabled,
  initialAssurance,
}: {
  locale: Locale;
  initiallyMfaEnabled: boolean;
  initialAssurance: string;
}) {
  const english = locale === "en";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(initiallyMfaEnabled);
  const [assurance, setAssurance] = useState<string | null>(initialAssurance);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");

  async function refreshFactors() {
    try {
      const supabase = createSupabaseBrowserClient();
      const [{ data: factors, error: factorError }, { data: assuranceData, error: assuranceError }] =
        await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);
      if (factorError || assuranceError) {
        setError(english
          ? "Security settings could not be loaded. Please try again."
          : "Les paramètres de sécurité n’ont pas pu être chargés. Réessaie.");
        return;
      }
      setIsVerified(factors.totp.some((factor: { status: string }) => factor.status === "verified") ||
        factors.phone.some((factor: { status: string }) => factor.status === "verified"));
      setAssurance(assuranceData.currentLevel);
      setError(null);
    } catch {
      setError(english
        ? "Security settings could not be loaded. Please try again."
        : "Les paramètres de sécurité n’ont pas pu être chargés. Réessaie.");
    }
  }

  async function startEnrollment() {
    setPending(true);
    setError(null);
    try {
      const { data, error: enrollError } = await createSupabaseBrowserClient().auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `${brand.name} admin`,
      });
      if (enrollError || !data?.totp?.secret || !data.totp.qr_code) {
        setError(english
          ? "Two-step verification could not be started. Please try again."
          : "La vérification en deux étapes n’a pas pu démarrer. Réessaie.");
        return;
      }
      setEnrollment({
        factorId: data.id,
        secret: data.totp.secret,
        qrCode: data.totp.qr_code,
      });
    } catch {
      setError(english
        ? "Two-step verification could not be started. Please try again."
        : "La vérification en deux étapes n’a pas pu démarrer. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      });
      if (challengeError || !challenge) {
        setError(english
          ? "A verification code could not be requested. Please try again."
          : "Un code de vérification n’a pas pu être demandé. Réessaie.");
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) {
        setError(english
          ? "That code is not valid. Check your authenticator and try again."
          : "Ce code n’est pas valide. Vérifie ton application d’authentification puis réessaie.");
        return;
      }
      setEnrollment(null);
      setCode("");
      await refreshFactors();
    } catch {
      setError(english
        ? "Verification could not be completed. Please try again."
        : "La vérification n’a pas pu aboutir. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  async function cancelEnrollment() {
    if (!enrollment) return;
    setPending(true);
    setError(null);
    try {
      const { error: unenrollError } = await createSupabaseBrowserClient().auth.mfa.unenroll({
        factorId: enrollment.factorId,
      });
      if (unenrollError) {
        setError(english
          ? "The setup could not be cancelled. Please try again."
          : "La configuration n’a pas pu être annulée. Réessaie.");
        return;
      }
      setEnrollment(null);
      setCode("");
    } catch {
      setError(english
        ? "The setup could not be cancelled. Please try again."
        : "La configuration n’a pas pu être annulée. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <header className="workspace-header">
        <Link className="gallery-brand" href={`/${locale}/ops/commandes`}>
          <span className="brand-symbol" aria-hidden="true">{brand.logoText}</span>
          <span>{brand.name}</span>
        </Link>
      </header>
      <section className="auth-card admin-mfa-card" aria-labelledby="admin-mfa-title">
        <p className="eyebrow">{english ? "ADMIN ACCOUNT" : "COMPTE ADMIN"}</p>
        <h1 id="admin-mfa-title">
          {english ? "Two-step verification" : "Vérification en deux étapes"}
        </h1>
        <p>
          {english
            ? "Add an authenticator app to protect sensitive admin actions."
            : "Ajoute une application d’authentification pour protéger les actions sensibles de l’administration."}
        </p>
        {isVerified ? (
          <p className="form-feedback" role="status">
            {english
              ? `Two-step verification is active. Current session level: ${assurance ?? "unknown"}.`
              : `La vérification en deux étapes est active. Niveau de session actuel : ${assurance ?? "inconnu"}.`}
          </p>
        ) : enrollment ? (
          <div className="admin-mfa-enrollment">
            <p>
              {english
                ? "Scan this code with your authenticator app, or enter the setup key manually."
                : "Scanne ce code avec ton application d’authentification, ou saisis la clé manuellement."}
            </p>
            <Image
              alt={english ? "Authenticator setup QR code" : "Code QR de configuration"}
              className="admin-mfa-qr"
              height={220}
              src={enrollment.qrCode}
              unoptimized
              width={220}
            />
            <p>
              <span>{english ? "Setup key" : "Clé de configuration"}: </span>
              <code>{enrollment.secret}</code>
            </p>
            <form className="auth-form" onSubmit={verifyEnrollment}>
              <label className="preview-field">
                <span>{english ? "Six-digit code" : "Code à six chiffres"}</span>
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={8}
                  minLength={6}
                  onChange={(event) => setCode(event.target.value)}
                  pattern="[0-9]{6,8}"
                  required
                  value={code}
                />
              </label>
              <button className="continue-button" disabled={pending} type="submit">
                {pending ? (english ? "Please wait…" : "Patiente…") : (english ? "Verify and activate" : "Vérifier et activer")}
              </button>
              <button className="text-link" disabled={pending} onClick={cancelEnrollment} type="button">
                {english ? "Cancel setup" : "Annuler la configuration"}
              </button>
            </form>
          </div>
        ) : (
          <button className="continue-button" disabled={pending} onClick={startEnrollment} type="button">
            {english ? "Set up an authenticator app" : "Configurer une application d’authentification"}
          </button>
        )}
        {error && <p className="form-feedback" data-kind="error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
