import { notFound, redirect } from "next/navigation";
import { ScreenWorkspace } from "@/components/screen-workspace";
import { StorefrontWorkspace } from "@/components/storefront-workspace";
import { getScreenByPath } from "@/lib/screens";
import type { ScreenGroup } from "@/lib/screens";
import { requireRole } from "@/lib/auth";
import { isAuthenticationEnabled } from "@/lib/env";
import { getPartnerMenu, getStorefrontData, searchStorefront } from "@/lib/storefront";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FeeQuoteTracking } from "@/components/fee-quote-tracking";
import { z } from "zod";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

type ScreenPreviewPageProps = {
  locale: string;
  path: string[];
  query: Record<string, string | string[] | undefined>;
};

export async function renderScreenPreview({
  locale,
  path,
  query,
}: ScreenPreviewPageProps) {
  if (!hasLocale(routing.locales, locale)) notFound();

  const pathname = path.join("/");
  if (pathname === "mot-de-passe/reinitialiser") {
    redirect(`/${locale}/mot-de-passe/oublie`);
  }

  const screen = getScreenByPath(pathname, query.type === "pharmacie");
  if (!screen || screen.id === "S-01") notFound();

  if (screen.id === "S-16") {
    redirect(`/${locale}/commande/recapitulatif`);
  }

  let authenticatedUserId: string | null = null;
  if (screen.sensitive) {
    if (!isAuthenticationEnabled) {
      redirect(`/${locale}/connexion?setup=required`);
    }

    const rolesByGroup: Record<ScreenGroup, ("client" | "partner" | "courier" | "zone_agent" | "admin")[]> = {
      client: ["client"],
      partner: ["partner"],
      courier: ["courier"],
      operations: ["zone_agent", "admin"],
    };
    const { user } = await requireRole(locale, rolesByGroup[screen.group], `/${locale}/${pathname}`);
    authenticatedUserId = user.id;
  }

  if (screen.id === "S-20" && typeof query.order === "string" && authenticatedUserId) {
    const orderId = z.string().uuid().safeParse(query.order);
    if (!orderId.success) notFound();

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_customer_fee_quote_order", {
      p_order: orderId.data,
    });

    if (error) {
      console.error("Could not load the customer's fee quote order.");
      throw new Error("Unable to load order tracking.");
    }

    const orderSchema = z.object({
      id: z.string().uuid(),
      status: z.string(),
      subtotal: z.number().int(),
      delivery_fee: z.number().int().nullable(),
      total: z.number().int(),
      quote_version: z.number().int(),
      quote_expires_at: z.string().nullable(),
      cancel_reason: z.string().nullable(),
      created_at: z.string(),
    });
    const order = orderSchema.safeParse(data);
    if (!order.success) notFound();

    return <FeeQuoteTracking locale={locale} order={order.data} />;
  }

  if (["S-05", "S-06", "S-07", "S-08", "S-09", "S-12", "S-13", "S-14", "S-15", "S-16", "S-17"].includes(screen.id)) {
    const listing = screen.id === "S-05"
      ? await getStorefrontData(locale, "restaurant")
      : screen.id === "S-06"
        ? await getStorefrontData(locale, "pharmacy")
        : undefined;
    const menu = ["S-08", "S-09", "S-12"].includes(screen.id)
      ? await getPartnerMenu(
          locale,
          path[1] ?? "",
          pathname.startsWith("pharmacie/") ? "pharmacy" : "restaurant",
        )
      : undefined;

    if (screen.id === "S-12" && menu?.partner && !menu.products.some((product) => product.slug === path[3])) {
      notFound();
    }

    const searchResult = screen.id === "S-07"
      ? await searchStorefront(
          locale,
          typeof query.q === "string" ? query.q : "",
        )
      : undefined;

    return (
      <StorefrontWorkspace
        locale={locale}
        screen={screen}
        path={path}
        listing={listing ?? searchResult}
        menu={menu}
        searchPartners={searchResult?.matchingPartners}
        searchResults={searchResult?.matchingProducts}
        searchQuery={typeof query.q === "string" ? query.q : ""}
      />
    );
  }

  return <ScreenWorkspace locale={locale} screen={screen} />;
}
