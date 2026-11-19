"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/[locale]/auth-actions";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/app/[locale]/auth-actions";
import type { Locale } from "@/lib/screens";

type AuthMode = "sign-in" | "sign-up" | "forgot" | "reset";

const initialState: AuthFormState = {};

export function AuthForm({
  locale,
  mode,
  nextPath,
  authenticationEnabled,
}: {
  locale: Locale;
  mode: AuthMode;
  nextPath?: string;
  authenticationEnabled: boolean;
}) {
  const english = locale === "en";
  const action = mode === "sign-in"
    ? signInAction
    : mode === "sign-up"
      ? signUpAction
      : mode === "forgot"
        ? requestPasswordResetAction
        : updatePasswordAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const copy = {
    title: {
      "sign-in": english ? "Sign in" : "Connexion",
      "sign-up": english ? "Create your account" : "Créer ton compte",
      forgot: english ? "Reset your password" : "Récupérer ton mot de passe",
      reset: english ? "Choose a new password" : "Choisir un nouveau mot de passe",
    }[mode],
    submit: {
      "sign-in": english ? "Sign in" : "Se connecter",
      "sign-up": english ? "Create account" : "Créer mon compte",
      forgot: english ? "Send recovery link" : "Envoyer le lien",
      reset: english ? "Update password" : "Modifier le mot de passe",
    }[mode],
    pending: english ? "Please wait…" : "Patiente…",
    email: english ? "Email address" : "Adresse email",
    password: english ? "Password (12 characters minimum)" : "Mot de passe (12 caractères minimum)",
    fullName: english ? "Full name" : "Nom complet",
    phone: english ? "Phone (optional)" : "Téléphone (facultatif)",
    confirmation: english ? "Confirm password" : "Confirmer le mot de passe",
  };

  return (
    <main className="page-shell auth-page">
      <header className="workspace-header">
        <Link className="gallery-brand" href={`/${locale}`}>
          <span className="brand-symbol" aria-hidden="true">D</span>
          <span>Douala</span>
        </Link>
        <Link className="text-link" href={`/${locale}/ecrans`}>
          {english ? "Screen catalogue" : "Catalogue des écrans"}
        </Link>
      </header>

      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">{english ? "CUSTOMER ACCOUNT" : "COMPTE CLIENT"}</p>
        <h1 id="auth-title">{copy.title}</h1>

        <form action={formAction} className="auth-form">
          <fieldset className="auth-fields" disabled={!authenticationEnabled}>
          <input name="locale" type="hidden" value={locale} />
          {nextPath && <input name="next" type="hidden" value={nextPath} />}

          {mode === "sign-up" && (
            <>
              <label className="preview-field">
                <span>{copy.fullName}</span>
                <input autoComplete="name" maxLength={120} name="fullName" required />
              </label>
              <label className="preview-field">
                <span>{copy.phone}</span>
                <input autoComplete="tel" maxLength={30} name="phone" type="tel" />
              </label>
            </>
          )}

          {mode !== "reset" && (
            <label className="preview-field">
              <span>{copy.email}</span>
              <input autoComplete="email" maxLength={254} name="email" required type="email" />
            </label>
          )}

          {(mode === "sign-in" || mode === "sign-up" || mode === "reset") && (
            <label className="preview-field">
              <span>{copy.password}</span>
              <input
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                minLength={mode === "sign-in" ? 1 : 12}
                maxLength={128}
                name="password"
                required
                type="password"
              />
            </label>
          )}

          {mode === "reset" && (
            <label className="preview-field">
              <span>{copy.confirmation}</span>
              <input autoComplete="new-password" minLength={12} maxLength={128} name="confirmation" required type="password" />
            </label>
          )}

          {mode === "sign-up" && (
            <div className="auth-consents">
              <label className="checkbox-field">
                <input name="ageConfirmed" required type="checkbox" />
                <span>{english ? "I confirm I am of legal age to order age-restricted items." : "Je confirme avoir l’âge légal pour les articles soumis à restriction."}</span>
              </label>
              <label className="checkbox-field">
                <input name="legalAccepted" required type="checkbox" />
                <span>
                  {english ? "I accept the " : "J’accepte les "}
                  <Link href={`/${locale}/legal/conditions`}>{english ? "terms" : "conditions"}</Link>
                  {english ? " and the privacy policy." : " et la politique de confidentialité."}
                </span>
              </label>
            </div>
          )}
          </fieldset>

          {!authenticationEnabled && (
            <p className="form-feedback" data-kind="error" role="status">
              {english
                ? "Account access is not fully configured or enabled. This form will not collect credentials until setup is complete."
                : "Le service de compte n’est pas entièrement configuré ou activé. Ce formulaire ne recueillera aucun identifiant avant la fin du branchement."}
            </p>
          )}
          {state.error && <p className="form-feedback" data-kind="error" role="alert">{state.error}</p>}
          {state.success && <p className="form-feedback" role="status">{state.success}</p>}
          <button className="continue-button" disabled={pending || !authenticationEnabled} type="submit">
            {pending ? copy.pending : copy.submit}
          </button>
        </form>

        <nav className="auth-links" aria-label={english ? "Account links" : "Liens de compte"}>
          {mode === "sign-in" && (
            <>
              <Link href={`/${locale}/mot-de-passe/oublie`}>{english ? "Forgot password?" : "Mot de passe oublié ?"}</Link>
              <Link href={`/${locale}/inscription`}>{english ? "Create an account" : "Créer un compte"}</Link>
            </>
          )}
          {mode === "sign-up" && (
            <Link href={`/${locale}/connexion`}>{english ? "Already registered? Sign in" : "Déjà inscrit ? Se connecter"}</Link>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <Link href={`/${locale}/connexion`}>{english ? "Back to sign in" : "Retour à la connexion"}</Link>
          )}
        </nav>

        <p className="auth-security-note">
          {authenticationEnabled
            ? english
              ? "Account access is handled by Supabase Auth."
              : "Les comptes sont gérés par Supabase Auth."
            : english
              ? "Account access will use Supabase Auth. Do not enter real credentials until setup is complete."
              : "Les comptes passeront par Supabase Auth. Ne saisis pas d’identifiants réels avant la fin du branchement."}
        </p>
      </section>
    </main>
  );
}
