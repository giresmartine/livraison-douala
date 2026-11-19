import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/screens";

const localizedValueSchema = z.union([
  z.string(),
  z.record(z.string(), z.unknown()),
]);

const partnerSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  type: z.enum(["restaurant", "pharmacy", "depot", "own_stock", "supermarket", "other"]),
  name: localizedValueSchema,
  description: localizedValueSchema,
  cuisine_tags: z.array(z.string()),
  address_text: z.string().nullable(),
  delivery_radius_m: z.number(),
  avg_prep_minutes: z.number(),
  min_order: z.number().nullable(),
  rating_avg: z.number().nullable(),
  rating_count: z.number(),
  logo_path: z.string().nullable(),
  cover_path: z.string().nullable(),
});

const hourSchema = z.object({
  partner_id: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
  opens_at: z.string(),
  closes_at: z.string(),
  last_order_before_close: z.number().int().nonnegative(),
});

const closureSchema = z.object({
  partner_id: z.string().uuid(),
  starts_at: z.string(),
  ends_at: z.string(),
});

const categorySchema = z.object({
  slug: z.string(),
  name: localizedValueSchema,
  icon: z.string().nullable(),
});

const productSchema = z.object({
  id: z.string().uuid(),
  partner_id: z.string().uuid(),
  section_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  slug: z.string(),
  name: localizedValueSchema,
  description: localizedValueSchema,
  price: z.number().int().nonnegative(),
  compare_at_price: z.number().int().nonnegative().nullable(),
  is_available: z.boolean(),
  requires_age_check: z.boolean(),
  is_medicine: z.boolean(),
  prep_minutes: z.number().int().nullable(),
  image_path: z.string().nullable(),
  sort: z.number().int(),
});

const sectionSchema = z.object({
  id: z.string().uuid(),
  name: localizedValueSchema,
  sort: z.number().int(),
});

const optionGroupSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  name: localizedValueSchema,
  min_select: z.number().int().nonnegative(),
  max_select: z.number().int().positive(),
  sort: z.number().int(),
});

const optionSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid(),
  name: localizedValueSchema,
  price_delta: z.number().int(),
  is_available: z.boolean(),
  sort: z.number().int(),
});

const searchProductSchema = z.object({
  id: z.string().uuid(),
  partner_id: z.string().uuid(),
  slug: z.string(),
  name: localizedValueSchema,
  description: localizedValueSchema,
  price: z.number().int().nonnegative(),
});

export type StorefrontPartner = {
  id: string;
  slug: string;
  type: z.infer<typeof partnerSchema>["type"];
  name: string;
  description: string;
  tags: string[];
  address: string | null;
  deliveryRadiusMeters: number;
  preparationMinutes: number;
  minimumOrder: number | null;
  rating: number | null;
  ratingCount: number;
  hours: string[];
  isOpen: boolean;
  canOrder: boolean;
};

export type StorefrontOption = {
  id: string;
  name: string;
  priceDelta: number;
};

export type StorefrontOptionGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: StorefrontOption[];
};

export type StorefrontProduct = {
  id: string;
  partnerId: string;
  sectionId: string | null;
  categoryId: string | null;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  available: boolean;
  requiresAgeCheck: boolean;
  isMedicine: boolean;
  preparationMinutes: number | null;
  sort: number;
  optionGroups: StorefrontOptionGroup[];
};

export type StorefrontSection = {
  id: string;
  name: string;
  sort: number;
};

export type StorefrontCategory = {
  slug: string;
  name: string;
  icon: string | null;
};

export type StorefrontData =
  | { configured: false; partners: []; categories: [] }
  | { configured: true; partners: StorefrontPartner[]; categories: StorefrontCategory[] };

function localizedText(value: unknown, locale: Locale): string {
  const parsed = localizedValueSchema.parse(value);
  if (typeof parsed === "string") return parsed;
  const translated = parsed[locale];
  if (typeof translated === "string") return translated;
  const fallback = parsed[locale === "fr" ? "en" : "fr"];
  return typeof fallback === "string" ? fallback : "";
}

function parseRows<TSchema extends z.ZodType>(
  schema: TSchema,
  data: unknown,
  label: string,
): z.infer<TSchema>[] {
  const result = z.array(schema).safeParse(data);
  if (!result.success) {
    console.error(`Invalid ${label} data returned from Supabase.`);
    throw new Error(`The ${label} data could not be displayed.`);
  }
  return result.data;
}

function weekdayIndex(value: string) {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(value.toLowerCase());
}

function localClock(now: Date) {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Douala",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    values.find((entry) => entry.type === type)?.value ?? "";
  return {
    weekday: weekdayIndex(part("weekday")),
    minute: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

function timeInMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

export function getPartnerAvailability(
  partnerId: string,
  schedule: z.infer<typeof hourSchema>[],
  now: Date,
) {
  const clock = localClock(now);
  const today = schedule.filter((entry) => entry.partner_id === partnerId && entry.weekday === clock.weekday);
  const previousWeekday = (clock.weekday + 6) % 7;
  const overnightPreviousDay = schedule.filter((entry) =>
    entry.partner_id === partnerId &&
    entry.weekday === previousWeekday &&
    timeInMinutes(entry.closes_at) <= timeInMinutes(entry.opens_at),
  );
  const openWindows = [
    ...today.map((entry) => ({ entry, isToday: true })),
    ...overnightPreviousDay.map((entry) => ({ entry, isToday: false })),
  ].map(({ entry, isToday }) => ({
    entry,
    isToday,
    start: timeInMinutes(entry.opens_at),
    end: timeInMinutes(entry.closes_at),
  }));
  const matchingWindow = openWindows.find(({ start, end, isToday }) =>
    end <= start
      ? isToday
        ? clock.minute >= start
        : clock.minute < end
      : clock.minute >= start && clock.minute < end,
  );
  const hoursText = today.map((entry) =>
    `${formatTime(entry.opens_at)}–${formatTime(entry.closes_at)}`,
  );

  if (!matchingWindow) return { hoursText, isOpen: false, canOrder: false };

  const overnight = matchingWindow.end <= matchingWindow.start;
  const minutesUntilClose = overnight && matchingWindow.isToday
    ? matchingWindow.end + 24 * 60 - clock.minute
    : matchingWindow.end - clock.minute;

  return {
    hoursText,
    isOpen: true,
    canOrder: minutesUntilClose > matchingWindow.entry.last_order_before_close,
  };
}

export async function getStorefrontData(
  locale: Locale,
  partnerType?: "restaurant" | "pharmacy",
): Promise<StorefrontData> {
  if (!isSupabaseConfigured) {
    return { configured: false, partners: [], categories: [] };
  }

  const supabase = await createSupabaseServerClient();
  const { data: eligiblePartnerRows, error: eligiblePartnerError } = await supabase.rpc(
    "storefront_eligible_partner_ids",
  );
  if (eligiblePartnerError) {
    console.error("Could not verify public partner catalogue eligibility.");
    throw new Error("The storefront catalogue is temporarily unavailable.");
  }
  const eligiblePartnerIds = parseRows(z.string().uuid(), eligiblePartnerRows, "eligible partner ID");
  const partnerRequest = eligiblePartnerIds.length
    ? (() => {
        let query = supabase
          .from("partners")
          .select("id, slug, type, name, description, cuisine_tags, address_text, delivery_radius_m, avg_prep_minutes, min_order, rating_avg, rating_count, logo_path, cover_path")
          .in("id", eligiblePartnerIds)
          .eq("status", "active")
          .eq("is_placeholder", false)
          .limit(100);
        if (partnerType) query = query.eq("type", partnerType);
        return query;
      })()
    : Promise.resolve({ data: [], error: null });
  const [{ data: partnerRows, error: partnerError }, { data: categoryRows, error: categoryError }] =
    await Promise.all([
      partnerRequest,
      supabase.from("categories").select("slug, name, icon").order("sort"),
    ]);

  if (partnerError || categoryError) {
    console.error("Could not load the public storefront catalogue.");
    throw new Error("The storefront catalogue is temporarily unavailable.");
  }

  const partners = parseRows(partnerSchema, partnerRows, "partner");
  const categories = parseRows(categorySchema, categoryRows, "category");
  if (partners.length === 0) {
    return { configured: true, partners: [], categories: categories.map((category) => ({
      slug: category.slug,
      name: localizedText(category.name, locale),
      icon: category.icon,
    })) };
  }

  const partnerIds = partners.map((partner) => partner.id);
  const now = new Date();
  const [{ data: hourRows, error: hourError }, { data: closureRows, error: closureError }] =
    await Promise.all([
      supabase
        .from("partner_hours")
        .select("partner_id, weekday, opens_at, closes_at, last_order_before_close")
        .in("partner_id", partnerIds),
      supabase
        .from("partner_closures")
        .select("partner_id, starts_at, ends_at")
        .in("partner_id", partnerIds)
        .lte("starts_at", now.toISOString())
        .gt("ends_at", now.toISOString()),
    ]);

  if (hourError || closureError) {
    console.error("Could not load partner availability.");
    throw new Error("Partner opening hours are temporarily unavailable.");
  }

  const hours = parseRows(hourSchema, hourRows, "partner hours");
  const closures = parseRows(closureSchema, closureRows, "partner closure");

  return {
    configured: true,
    partners: partners
      .map((partner) => {
        const availability = getPartnerAvailability(partner.id, hours, now);
        const isClosedForException = closures.some((closure) => closure.partner_id === partner.id);
        return {
          id: partner.id,
          slug: partner.slug,
          type: partner.type,
          name: localizedText(partner.name, locale),
          description: localizedText(partner.description, locale),
          tags: partner.cuisine_tags,
          address: partner.address_text,
          deliveryRadiusMeters: partner.delivery_radius_m,
          preparationMinutes: partner.avg_prep_minutes,
          minimumOrder: partner.min_order,
          rating: partner.rating_avg,
          ratingCount: partner.rating_count,
          hours: availability.hoursText,
          isOpen: availability.isOpen && !isClosedForException,
          canOrder: availability.canOrder && !isClosedForException,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name, locale)),
    categories: categories.map((category) => ({
      slug: category.slug,
      name: localizedText(category.name, locale),
      icon: category.icon,
    })),
  };
}

export async function getPartnerMenu(
  locale: Locale,
  partnerSlug: string,
  partnerType?: "restaurant" | "pharmacy",
) {
  const storefront = await getStorefrontData(locale, partnerType);
  if (!storefront.configured) return { configured: false as const, partner: null, sections: [], products: [] };

  const partner = storefront.partners.find((entry) => entry.slug === partnerSlug);
  if (!partner) return { configured: true as const, partner: null, sections: [], products: [] };

  const supabase = await createSupabaseServerClient();
  const [{ data: productRows, error: productError }, { data: sectionRows, error: sectionError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, partner_id, section_id, category_id, slug, name, description, price, compare_at_price, is_available, requires_age_check, is_medicine, prep_minutes, image_path, sort")
        .eq("partner_id", partner.id)
        .eq("is_available", true)
        .eq("is_medicine", false)
        .eq("is_placeholder", false)
        .order("sort"),
      supabase
        .from("menu_sections")
        .select("id, name, sort")
        .eq("partner_id", partner.id)
        .order("sort"),
    ]);

  if (productError || sectionError) {
    console.error("Could not load the partner menu.");
    throw new Error("This menu is temporarily unavailable.");
  }

  const parsedProducts = parseRows(productSchema, productRows, "menu item");
  const productIds = parsedProducts.map((product) => product.id);
  const { data: groupRows, error: groupError } = productIds.length
    ? await supabase
        .from("option_groups")
        .select("id, product_id, name, min_select, max_select, sort")
        .in("product_id", productIds)
        .order("sort")
    : { data: [], error: null };

  if (groupError) {
    console.error("Could not load product option groups.");
    throw new Error("Menu options are temporarily unavailable.");
  }

  const optionGroups = parseRows(optionGroupSchema, groupRows, "product option group");
  const groupIds = optionGroups.map((group) => group.id);
  const { data: optionRows, error: optionError } = groupIds.length
    ? await supabase
        .from("options")
        .select("id, group_id, name, price_delta, is_available, sort")
        .in("group_id", groupIds)
        .eq("is_available", true)
        .order("sort")
    : { data: [], error: null };

  if (optionError) {
    console.error("Could not load product options.");
    throw new Error("Menu options are temporarily unavailable.");
  }

  const options = parseRows(optionSchema, optionRows, "product option");
  const products = parsedProducts.map((product) => ({
    id: product.id,
    partnerId: product.partner_id,
    sectionId: product.section_id,
    categoryId: product.category_id,
    slug: product.slug,
    name: localizedText(product.name, locale),
    description: localizedText(product.description, locale),
    price: product.price,
    compareAtPrice: product.compare_at_price,
    available: product.is_available,
    requiresAgeCheck: product.requires_age_check,
    isMedicine: product.is_medicine,
    preparationMinutes: product.prep_minutes,
    sort: product.sort,
    optionGroups: optionGroups
      .filter((group) => group.product_id === product.id)
      .map((group) => ({
        id: group.id,
        name: localizedText(group.name, locale),
        minSelect: group.min_select,
        maxSelect: group.max_select,
        options: options
          .filter((option) => option.group_id === group.id)
          .map((option) => ({
            id: option.id,
            name: localizedText(option.name, locale),
            priceDelta: option.price_delta,
          })),
      })),
  }));
  const sections = parseRows(sectionSchema, sectionRows, "menu section").map((section) => ({
    id: section.id,
    name: localizedText(section.name, locale),
    sort: section.sort,
  }));

  return { configured: true as const, partner, sections, products };
}

export async function searchStorefront(locale: Locale, search: string) {
  const storefront = await getStorefrontData(locale);
  if (!storefront.configured || !search.trim()) {
    return { ...storefront, matchingPartners: [] as StorefrontPartner[], matchingProducts: [] as {
      id: string;
      partnerSlug: string;
      partnerName: string;
      partnerType: StorefrontPartner["type"];
      slug: string;
      name: string;
      description: string;
      price: number;
    }[] };
  }

  const searchTerm = search.trim().slice(0, 100).replace(/[^\p{L}\p{N}\s-]/gu, "");
  const matchingPartners = storefront.partners.filter((partner) =>
    [partner.name, partner.description, ...partner.tags]
      .some((value) => value.toLocaleLowerCase(locale).includes(searchTerm.toLocaleLowerCase(locale))),
  );
  if (!searchTerm) return { ...storefront, matchingPartners, matchingProducts: [] };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, partner_id, slug, name, description, price")
    .eq("is_available", true)
    .eq("is_medicine", false)
    .eq("is_placeholder", false)
    .ilike(`name->>${locale}`, `%${searchTerm}%`)
    .limit(50);

  if (error) {
    console.error("Could not search public products.");
    throw new Error("Search is temporarily unavailable.");
  }

  const partnersById = new Map(storefront.partners.map((partner) => [partner.id, partner]));
  const matchingProducts = parseRows(searchProductSchema, data, "search result")
    .flatMap((product) => {
      const partner = partnersById.get(product.partner_id);
      if (!partner) return [];
      return [{
        id: product.id,
        partnerSlug: partner.slug,
        partnerName: partner.name,
        partnerType: partner.type,
        slug: product.slug,
        name: localizedText(product.name, locale),
        description: localizedText(product.description, locale),
        price: product.price,
      }];
    });

  return { ...storefront, matchingPartners, matchingProducts };
}
