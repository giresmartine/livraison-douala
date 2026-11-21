"use server";

import { z } from "zod";
import { isWithinDoualaCoverage } from "@/lib/config/coverage";
import { buildFeeQuoteOrderItems, parseGeographyPoint } from "@/lib/order-flow";
import { isAuthenticationEnabled } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const localeSchema = z.enum(["fr", "en"]);
const addressInputSchema = z.object({
  neighborhood: z.string().trim().min(1).max(100),
  landmark: z.string().trim().min(1).max(200),
  details: z.string().trim().max(500),
  coordinates: z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  }).nullable(),
});
const orderInputSchema = z.object({
  locale: localeSchema,
  addressId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    qty: z.number().int().positive().max(2147483647),
    option_ids: z.array(z.string().uuid()).max(100),
  })).min(1).max(100),
});

type ActionFailure = {
  ok: false;
  code: string;
};

type CustomerSession =
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; userId: string }
  | ActionFailure;

async function getActiveCustomer(): Promise<CustomerSession> {
  if (!isAuthenticationEnabled) return { ok: false, code: "auth_required" };

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, code: "auth_required" };

  const [{ data: profile, error: profileError }, { data: roles, error: roleError }] =
    await Promise.all([
      supabase.from("profiles").select("status").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);

  if (profileError || roleError) {
    console.error("Could not verify the customer account for an order.");
    return { ok: false, code: "account_unavailable" };
  }
  if (profile?.status !== "active") return { ok: false, code: "account_unavailable" };
  if (!roles.some((entry) => entry.role === "client")) {
    return { ok: false, code: "client_role_required" };
  }

  return { ok: true, supabase, userId: user.id };
}

export async function saveOrderAddress(input: unknown) {
  const parsed = addressInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_address" };

  const customer = await getActiveCustomer();
  if (!customer.ok) return customer;

  const { coordinates, neighborhood, landmark, details } = parsed.data;
  if (coordinates && !isWithinDoualaCoverage(coordinates)) {
    return { ok: false as const, code: "outside_coverage" };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Order address storage is not configured.");
    return { ok: false as const, code: "service_unavailable" };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("addresses")
    .insert({
      user_id: customer.userId,
      label: neighborhood,
      landmark,
      details: details || null,
      geo: coordinates
        ? { type: "Point", coordinates: [coordinates.longitude, coordinates.latitude] }
        : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Could not save the customer's delivery address.", error.code);
    return { ok: false as const, code: "address_save_failed" };
  }

  const addressId = z.string().uuid().safeParse(data.id);
  if (!addressId.success) {
    console.error("The saved delivery address returned an invalid identifier.");
    return { ok: false as const, code: "address_save_failed" };
  }

  return { ok: true as const, addressId: addressId.data };
}

function orderErrorCode(message: string): string {
  const knownCodes = [
    "order_flow_not_configured",
    "pending_quote_limit_reached",
    "submission_rate_limit_reached",
    "delivery_address_unavailable",
    "product_unavailable",
    "multi_partner_order_not_allowed",
    "invalid_product_options",
    "partner_not_orderable",
    "partner_closed",
    "partner_minimum_not_met",
    "order_total_out_of_range",
  ];
  return knownCodes.find((code) => message.includes(code)) ?? "order_submission_failed";
}

export async function submitFeeQuoteOrder(input: unknown) {
  const parsed = orderInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_order" };

  const customer = await getActiveCustomer();
  if (!customer.ok) return customer;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Fee quote order creation is not configured.");
    return { ok: false as const, code: "service_unavailable" };
  }

  const admin = createSupabaseAdminClient();
  const { data: address, error: addressError } = await admin
    .from("addresses")
    .select("id, user_id, geo")
    .eq("id", parsed.data.addressId)
    .maybeSingle();

  if (addressError) {
    console.error("Could not verify the delivery address for an order.", addressError.code);
    return { ok: false as const, code: "delivery_address_unavailable" };
  }
  if (!address || address.user_id !== customer.userId) {
    return { ok: false as const, code: "delivery_address_unavailable" };
  }

  let coordinates;
  try {
    coordinates = parseGeographyPoint(address.geo);
  } catch {
    return { ok: false as const, code: "delivery_address_unavailable" };
  }
  if (coordinates && !isWithinDoualaCoverage(coordinates)) {
    return { ok: false as const, code: "outside_coverage" };
  }

  const { data, error } = await admin.rpc("create_fee_quote_order", {
    p_customer_id: customer.userId,
    p_address_id: parsed.data.addressId,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_locale: parsed.data.locale,
    p_items: buildFeeQuoteOrderItems(parsed.data.items.map((item) => ({
      product: { id: item.product_id },
      quantity: item.qty,
      options: item.option_ids.map((id) => ({ id })),
    }))),
  });

  if (error) {
    const code = orderErrorCode(error.message);
    console.error("Fee quote order submission failed.", code);
    return { ok: false as const, code };
  }

  const orderId = z.string().uuid().safeParse(data);
  if (!orderId.success) {
    console.error("Order creation returned an invalid identifier.");
    return { ok: false as const, code: "order_submission_failed" };
  }

  return { ok: true as const, orderId: orderId.data };
}

export async function acceptFeeQuote(input: unknown) {
  const parsed = z.object({
    orderId: z.string().uuid(),
    displayedTotal: z.number().int().nonnegative(),
    displayedVersion: z.number().int().positive(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_quote" };

  const customer = await getActiveCustomer();
  if (!customer.ok) return customer;

  const { data, error } = await customer.supabase.rpc("accept_order_fee_quote", {
    p_order: parsed.data.orderId,
    p_displayed_total: parsed.data.displayedTotal,
    p_displayed_version: parsed.data.displayedVersion,
  });
  if (error) {
    const code = error.message.includes("quote_display_mismatch")
      ? "quote_changed"
      : error.message.includes("quote_expired")
        ? "quote_expired"
        : "quote_acceptance_failed";
    console.error("Customer fee quote acceptance failed.", code);
    return { ok: false as const, code };
  }

  return data
    ? { ok: true as const }
    : { ok: false as const, code: "quote_expired" };
}

export async function cancelFeeQuote(input: unknown) {
  const parsed = z.object({ orderId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_order" };

  const customer = await getActiveCustomer();
  if (!customer.ok) return customer;

  const { data, error } = await customer.supabase.rpc("cancel_order_fee_quote", {
    p_order: parsed.data.orderId,
  });
  if (error) {
    console.error("Customer fee quote cancellation failed.", error.code);
    return { ok: false as const, code: "order_cancellation_failed" };
  }
  const reason = z.enum([
    "customer_cancelled",
    "quote_declined",
    "quote_not_provided",
    "quote_expired",
    "quote_replaced",
  ]).safeParse(data);
  if (!reason.success) {
    console.error("Customer fee quote cancellation returned an invalid result.");
    return { ok: false as const, code: "order_cancellation_failed" };
  }
  return { ok: true as const, reason: reason.data };
}
