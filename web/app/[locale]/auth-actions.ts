"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { isAuthenticationEnabled, publicEnvironment } from "@/lib/env";
import { getRoleDestination } from "@/lib/auth";
import { getAuthCallbackUrl } from "@/lib/auth-callback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  success?: string;
};

const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z.string().min(12).max(128);
const captchaTokenSchema = z.string().trim().min(1).max(2048);
const localeSchema = z.enum(["fr", "en"]);

function getLocale(value: FormDataEntryValue | null) {
  const parsed = localeSchema.safeParse(value);
  return parsed.success ? parsed.data : "fr";
}

function getSiteUrl() {
  const configuredUrl = publicEnvironment.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return configuredUrl;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";

  throw new Error("NEXT_PUBLIC_SITE_URL must be configured.");
}

function safeNextPath(value: FormDataEntryValue | null, locale: string) {
  if (
    typeof value !== "string" ||
    !value.startsWith(`/${locale}/`) ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return null;
  }

  return value;
}

function getCaptchaError(locale: string) {
  return locale === "fr"
    ? "La vérification anti-robot a échoué. Réessaie."
    : "Bot verification failed. Please try again.";
}

export async function signInAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = getLocale(formData.get("locale"));
  const email = emailSchema.safeParse(formData.get("email"));
  const password = z.string().min(1).max(128).safeParse(formData.get("password"));
  const captchaToken = captchaTokenSchema.safeParse(formData.get("captchaToken"));

  if (!email.success || !password.success) {
    return { error: locale === "fr" ? "Vérifie ton email et ton mot de passe." : "Check your email and password." };
  }
  if (
    !captchaToken.success ||
    !publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  ) {
    return { error: getCaptchaError(locale) };
  }
  if (!isAuthenticationEnabled) {
    return { error: locale === "fr" ? "La connexion au service de comptes n’est pas encore configurée." : "The account service is not configured yet." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password: password.data,
    options: { captchaToken: captchaToken.data },
  });

  if (error) {
    return { error: locale === "fr" ? "Connexion impossible. Vérifie tes identifiants ou réessaie plus tard." : "Sign-in failed. Check your details or try again later." };
  }

  const requestedPath = safeNextPath(formData.get("next"), locale);
  redirect(requestedPath ?? await getRoleDestination(locale));
}

export async function signUpAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = getLocale(formData.get("locale"));
  const fullName = z.string().trim().min(2).max(120).safeParse(formData.get("fullName"));
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  const captchaToken = captchaTokenSchema.safeParse(formData.get("captchaToken"));
  const ageConfirmed = formData.get("ageConfirmed") === "on";
  const legalAccepted = formData.get("legalAccepted") === "on";
  const phone = z.string().trim().max(30).optional().safeParse(formData.get("phone") || undefined);

  if (
    !fullName.success ||
    !email.success ||
    !password.success ||
    !phone.success ||
    !ageConfirmed ||
    !legalAccepted
  ) {
    return { error: locale === "fr" ? "Complète les champs requis, utilise un mot de passe d’au moins 12 caractères et accepte les conditions." : "Complete the required fields, use a password of at least 12 characters, and accept the terms." };
  }
  if (
    !captchaToken.success ||
    !publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  ) {
    return { error: getCaptchaError(locale) };
  }
  if (!isAuthenticationEnabled) {
    return { error: locale === "fr" ? "La création de compte n’est pas encore configurée." : "Account creation is not configured yet." };
  }

  const siteUrl = getSiteUrl();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      emailRedirectTo: getAuthCallbackUrl(siteUrl, locale, `/${locale}/accueil`),
      captchaToken: captchaToken.data,
      data: {
        full_name: fullName.data,
        phone: phone.data ?? null,
        language: locale,
        is_adult_confirmed: ageConfirmed,
        legal_accepted: legalAccepted,
        terms_version: publicEnvironment.NEXT_PUBLIC_TERMS_VERSION,
        privacy_version: publicEnvironment.NEXT_PUBLIC_PRIVACY_VERSION,
      },
    },
  });

  if (error) {
    return { error: locale === "fr" ? "Inscription impossible pour le moment. Vérifie les informations ou réessaie plus tard." : "Sign-up is unavailable right now. Check the details or try again later." };
  }

  return {
    success: locale === "fr"
      ? "Si l’inscription peut aboutir, un email de confirmation vient d’être envoyé."
      : "If sign-up can proceed, a confirmation email has been sent.",
  };
}

export async function requestPasswordResetAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = getLocale(formData.get("locale"));
  const email = emailSchema.safeParse(formData.get("email"));
  const captchaToken = captchaTokenSchema.safeParse(formData.get("captchaToken"));

  if (!email.success) {
    return { error: locale === "fr" ? "Saisis une adresse email valide." : "Enter a valid email address." };
  }
  if (
    !captchaToken.success ||
    !publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  ) {
    return { error: getCaptchaError(locale) };
  }
  if (!isAuthenticationEnabled) {
    return { error: locale === "fr" ? "La récupération de compte n’est pas encore configurée." : "Account recovery is not configured yet." };
  }

  const siteUrl = getSiteUrl();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: getAuthCallbackUrl(siteUrl, locale, `/${locale}/mot-de-passe/reinitialiser`),
    captchaToken: captchaToken.data,
  });

  if (error) {
    return { error: locale === "fr" ? "La demande n’a pas pu être traitée. Réessaie plus tard." : "The request could not be processed. Please try again later." };
  }

  return {
    success: locale === "fr"
      ? "Si un compte correspond à cette adresse, un lien de récupération a été envoyé."
      : "If an account matches this address, a recovery link has been sent.",
  };
}

export async function updatePasswordAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = getLocale(formData.get("locale"));
  const password = passwordSchema.safeParse(formData.get("password"));
  const confirmation = z.string().safeParse(formData.get("confirmation"));

  if (!password.success || !confirmation.success || password.data !== confirmation.data) {
    return { error: locale === "fr" ? "Les deux mots de passe doivent correspondre et contenir au moins 12 caractères." : "Passwords must match and contain at least 12 characters." };
  }
  if (!isAuthenticationEnabled) {
    return { error: locale === "fr" ? "La récupération de compte n’est pas encore configurée." : "Account recovery is not configured yet." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: locale === "fr" ? "Le lien a expiré. Demande-en un nouveau." : "This link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    return { error: locale === "fr" ? "Le mot de passe n’a pas pu être modifié. Réessaie." : "The password could not be changed. Please try again." };
  }

  await supabase.auth.signOut();
  redirect(`/${locale}/connexion?password-updated=1`);
}
