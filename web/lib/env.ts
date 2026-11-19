import { z } from "zod";

const optionalValue = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_BRAND_NAME: optionalValue,
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalValue,
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  NEXT_PUBLIC_TERMS_VERSION: optionalValue,
  NEXT_PUBLIC_PRIVACY_VERSION: optionalValue,
}).superRefine((environment, context) => {
  const hasSupabaseUrl = Boolean(environment.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseKey = Boolean(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (hasSupabaseUrl !== hasSupabaseKey) {
    context.addIssue({
      code: "custom",
      message: "Configure both Supabase URL and anon key, or neither.",
      path: ["NEXT_PUBLIC_SUPABASE_URL"],
    });
  }
});

export const publicEnvironment = publicEnvironmentSchema.parse({
  NEXT_PUBLIC_BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_TERMS_VERSION: process.env.NEXT_PUBLIC_TERMS_VERSION,
  NEXT_PUBLIC_PRIVACY_VERSION: process.env.NEXT_PUBLIC_PRIVACY_VERSION,
});

export const isSupabaseConfigured = Boolean(
  publicEnvironment.NEXT_PUBLIC_SUPABASE_URL &&
    publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const isAuthenticationEnabled =
  process.env.AUTHENTICATION_ENABLED === "true" &&
  isSupabaseConfigured &&
  (process.env.NODE_ENV === "development" ||
    Boolean(publicEnvironment.NEXT_PUBLIC_SITE_URL)) &&
  Boolean(
    publicEnvironment.NEXT_PUBLIC_TERMS_VERSION &&
      publicEnvironment.NEXT_PUBLIC_PRIVACY_VERSION,
  );
