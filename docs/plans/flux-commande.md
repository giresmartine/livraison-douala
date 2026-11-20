# Plan — commande avec frais à confirmer

> Proposition à valider. Ce document contient le plan et le SQL proposé uniquement : aucune migration ni logique applicative n'est exécutée avant validation.

## Périmètre et invariants

- Aucun paiement ni appel à un agrégateur dans ce flux.
- Le client connecté soumet un panier et une adresse de Douala ; l'API crée une commande en `pending_fee_quote`.
- `delivery_fee`, `surcharges`, `service_fee` et `total` restent `NULL` jusqu'au devis d'un agent de zone autorisé ou d'un admin.
- Le client ne transmet aucun prix faisant autorité. Le serveur lit les prix courants des produits et options, vérifie leur disponibilité, puis calcule les lignes et le sous-total.
- Une clé d'idempotence unique est exigée. Une répétition identique retourne la même commande ; une réutilisation avec un contenu différent est rejetée.
- Le partenaire doit être actif et ouvert au moment de la soumission. Un partenaire fermé, un produit indisponible ou fictif bloque la création.
- Une adresse manuelle peut contenir un quartier absent des suggestions. Le texte libre est conservé sans créer de quartier ni de tarif.
- Le quoteur fixe explicitement la zone et chaque composante des frais. Aucun montant ni quartier tarifaire n'est ajouté par défaut.
- Un compte suspendu ne peut ni soumettre, ni lire, ni modifier une commande.

## Statuts et transitions proposés

| État | Déclencheur | Acteur / contrôle | État suivant |
|---|---|---|---|
| `draft` | Panier local avant envoi ; il n'est pas créé par le client dans la base | Client actif | `pending_fee_quote` par `submit_order_for_fee_quote` |
| `pending_fee_quote` | Articles et adresse validés ; tous les frais et le total sont `NULL` | Client actif ; prix calculés côté serveur | `awaiting_customer_confirmation` par `set_order_fee_quote`, ou `cancelled` par le client |
| `awaiting_customer_confirmation` | Agent de zone/admin a fixé la zone et les frais ; total recalculé côté serveur | Client propriétaire | `quote_accepted` ou `cancelled` |
| `quote_accepted` | Le client accepte le devis | Aucun paiement ni préparation dans ce bloc | État terminal de ce périmètre ; une étape ultérieure décidera du paiement |
| `cancelled` | Le client annule avant acceptation | Aucun remboursement : aucun paiement n'a eu lieu | État terminal |

La soumission et la fixation des frais changent le statut dans leurs fonctions dédiées ; elles ne sont pas exposées comme transitions génériques. La table `order_transitions` n'autorise que l'annulation du client et l'acceptation du devis. Cela empêche de passer à l'état « devis prêt » sans avoir renseigné les frais.

## Accès et données personnelles

- **Client :** lecture de ses commandes et lignes uniquement ; création par la fonction de soumission uniquement.
- **Partenaire :** une vue dédiée expose seulement les lignes et résumés de ses propres établissements. Elle ne contient ni téléphone, ni identifiant client/adresse, ni adresse complète, ni note de livraison. L'accès direct aux tables `orders` et `order_items` n'accorde pas l'accès aux commandes partenaires.
- **Livreur :** commande et adresse complète uniquement si une course lui est assignée ; aucun accès aux autres commandes.
- **Agent de zone :** commande/adresse de devis seulement si `user_roles.scope_id` correspond à `orders.zone_id`. Un devis dont la zone est inconnue est visible à l'admin, qui peut le router.
- **Admin :** accès opérationnel à toutes les commandes et aux devis.
- **Compte suspendu :** les politiques et fonctions vérifient `is_active_user()`.

Hypothèse conservatrice à valider : le partenaire ne reçoit jamais l'adresse complète ni le téléphone, même après acceptation du devis ; seule la course assignée au livreur donne accès à l'adresse. L'accès au téléphone par un livreur reste soumis à une politique séparée.

## Migration proposée

Le type enum `order_status` est utilisé dans les tables et fonctions existantes. Pour éviter d'utiliser une nouvelle valeur enum avant le commit PostgreSQL qui l'ajoute, appliquer les deux blocs comme deux migrations successives, dans l'ordre. Le second bloc n'est pas à exécuter avant validation.

La migration ne réécrit pas les commandes historiques. Les frais `NULL` concernent les nouvelles commandes créées par la fonction ci-dessous, jusqu'à la fixation de leur devis.

### Migration A — valeurs d'état seulement

```sql
alter type public.order_status add value if not exists 'pending_fee_quote';
alter type public.order_status add value if not exists 'awaiting_customer_confirmation';
alter type public.order_status add value if not exists 'quote_accepted';
```

### Migration B — adresse, soumission, devis et RLS

```sql
alter table public.addresses
  add column if not exists city text not null default 'Douala',
  add column if not exists neighborhood_text text;

alter table public.addresses
  add constraint addresses_city_douala check (city = 'Douala');

alter table public.orders
  add column if not exists idempotency_payload_hash text,
  alter column delivery_fee drop default,
  alter column delivery_fee drop not null,
  alter column surcharges drop default,
  alter column surcharges drop not null,
  alter column service_fee drop default,
  alter column service_fee drop not null,
  alter column total drop default,
  alter column total drop not null;

insert into public.order_transitions (from_status, to_status, role) values
  ('pending_fee_quote', 'cancelled', 'client'),
  ('awaiting_customer_confirmation', 'quote_accepted', 'client'),
  ('awaiting_customer_confirmation', 'cancelled', 'client')
on conflict do nothing;

create or replace function public.can_read_order(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1
    from public.orders o
    where o.id = p_order
      and (
        o.customer_id = auth.uid()
        or public.has_role('admin')
        or (
          o.zone_id is not null
          and exists (
            select 1
            from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role = 'zone_agent'
              and ur.scope_id = o.zone_id
          )
        )
        or exists (
          select 1
          from public.deliveries d
          where d.order_id = o.id
            and d.courier_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.can_read_order(uuid) from public, anon;
grant execute on function public.can_read_order(uuid)
  to authenticated, service_role;

create or replace function public.submit_order_for_fee_quote(
  p_partner_id uuid,
  p_address_id uuid,
  p_items jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_order_id uuid;
  v_existing_id uuid;
  v_existing_customer_id uuid;
  v_existing_hash text;
  v_payload_hash text;
  v_zone_id uuid;
  v_language text;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_option_ids uuid[];
  v_product public.products%rowtype;
  v_option_delta integer;
  v_options_snapshot jsonb;
  v_unit_price bigint;
  v_line_total bigint;
  v_subtotal bigint := 0;
  v_group record;
begin
  if v_customer_id is null
     or not public.is_active_user()
     or not public.has_role('client') then
    raise exception 'authentication_required';
  end if;

  if nullif(btrim(p_idempotency_key), '') is null then
    raise exception 'idempotency_key_required';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid_order_items';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;

  v_payload_hash := encode(
    extensions.digest(
      jsonb_build_object(
        'partner_id', p_partner_id,
        'address_id', p_address_id,
        'items', p_items
      )::text,
      'sha256'
    ),
    'hex'
  );

  select o.id, o.customer_id, o.idempotency_payload_hash
    into v_existing_id, v_existing_customer_id, v_existing_hash
  from public.orders o
  where o.idempotency_key = p_idempotency_key;

  if found then
    if v_existing_customer_id <> v_customer_id
       or v_existing_hash is distinct from v_payload_hash then
      raise exception 'idempotency_key_reused';
    end if;
    return v_existing_id;
  end if;

  select n.zone_id into v_zone_id
  from public.addresses a
  left join public.neighborhoods n on n.id = a.neighborhood_id
  where a.id = p_address_id
    and a.user_id = v_customer_id
    and a.city = 'Douala'
    and (a.neighborhood_id is not null or nullif(btrim(a.neighborhood_text), '') is not null)
    and nullif(btrim(a.landmark), '') is not null;

  if not found then
    raise exception 'invalid_delivery_address';
  end if;

  if not exists (
    select 1 from public.partners p
    where p.id = p_partner_id and p.status = 'active'
  ) then
    raise exception 'partner_unavailable';
  end if;
  if not public.is_open_now(p_partner_id) then
    raise exception 'partner_closed';
  end if;

  insert into public.orders (
    customer_id, address_id, zone_id, partner_id, status, source,
    subtotal, discount_total, delivery_fee, surcharges, service_fee, total,
    idempotency_key, idempotency_payload_hash
  )
  values (
    v_customer_id, p_address_id, v_zone_id, p_partner_id, 'pending_fee_quote',
    'web', 0, 0, null, null, null, null,
    p_idempotency_key, v_payload_hash
  )
  on conflict (idempotency_key) do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select o.id, o.customer_id, o.idempotency_payload_hash
      into v_existing_id, v_existing_customer_id, v_existing_hash
    from public.orders o
    where o.idempotency_key = p_idempotency_key;

    if not found
       or v_existing_customer_id <> v_customer_id
       or v_existing_hash is distinct from v_payload_hash then
      raise exception 'idempotency_key_reused';
    end if;
    return v_existing_id;
  end if;

  select p.language into v_language
  from public.profiles p
  where p.id = v_customer_id;

  for v_item in
    select item.value
    from jsonb_array_elements(p_items) as item(value)
  loop
    if jsonb_typeof(v_item -> 'product_id') is distinct from 'string'
       or jsonb_typeof(v_item -> 'qty') is distinct from 'number' then
      raise exception 'invalid_order_item';
    end if;

    if (v_item ->> 'qty')::numeric <> trunc((v_item ->> 'qty')::numeric) then
      raise exception 'invalid_quantity';
    end if;
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty <= 0 then
      raise exception 'invalid_quantity';
    end if;

    select p.* into v_product
    from public.products p
    where p.id = v_product_id
      and p.partner_id = p_partner_id
      and p.is_available
      and not p.is_placeholder
    for share;

    if not found then
      raise exception 'product_unavailable';
    end if;

    if v_item ? 'option_ids'
       and jsonb_typeof(v_item -> 'option_ids') is distinct from 'array' then
      raise exception 'invalid_options';
    end if;

    select coalesce(array_agg(option_id.value::uuid order by option_id.ordinality), '{}'::uuid[])
      into v_option_ids
    from jsonb_array_elements_text(coalesce(v_item -> 'option_ids', '[]'::jsonb))
      with ordinality as option_id(value, ordinality);

    if cardinality(v_option_ids) <> (
      select count(distinct selected.value)
      from jsonb_array_elements_text(coalesce(v_item -> 'option_ids', '[]'::jsonb))
        as selected(value)
    ) then
      raise exception 'duplicate_option';
    end if;

    if exists (
      select 1
      from unnest(v_option_ids) as selected(option_id)
      left join public.options o on o.id = selected.option_id
      left join public.option_groups g on g.id = o.group_id
      where o.id is null
        or not o.is_available
        or g.product_id is distinct from v_product_id
    ) then
      raise exception 'invalid_option';
    end if;

    for v_group in
      select
        g.min_select,
        g.max_select,
        count(o.id) filter (where o.id = any(v_option_ids)) as selected_count
      from public.option_groups g
      left join public.options o on o.group_id = g.id
      where g.product_id = v_product_id
      group by g.id, g.min_select, g.max_select
    loop
      if v_group.selected_count < v_group.min_select
         or v_group.selected_count > v_group.max_select then
        raise exception 'invalid_option_selection';
      end if;
    end loop;

    select
      coalesce(sum(o.price_delta), 0),
      coalesce(
        jsonb_agg(jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'price_delta', o.price_delta
        ) order by o.id),
        '[]'::jsonb
      )
    into v_option_delta, v_options_snapshot
    from public.options o
    join public.option_groups g on g.id = o.group_id
    where o.id = any(v_option_ids)
      and g.product_id = v_product_id;

    v_unit_price := v_product.price::bigint + v_option_delta;
    v_line_total := v_unit_price * v_qty;
    if v_unit_price < 0
       or v_unit_price > 2147483647
       or v_line_total > 2147483647
       or v_subtotal + v_line_total > 2147483647 then
      raise exception 'order_amount_out_of_range';
    end if;

    insert into public.order_items (
      order_id, product_id, partner_id, name_snapshot,
      unit_price, qty, options, line_total
    )
    values (
      v_order_id,
      v_product_id,
      p_partner_id,
      coalesce(v_product.name ->> v_language, v_product.name ->> 'fr', v_product.slug),
      v_unit_price::integer,
      v_qty,
      v_options_snapshot,
      v_line_total::integer
    );

    v_subtotal := v_subtotal + v_line_total;
  end loop;

  update public.orders
  set subtotal = v_subtotal::integer
  where id = v_order_id;

  insert into public.order_status_history (order_id, status, changed_by, reason)
  values (v_order_id, 'pending_fee_quote', v_customer_id, 'submitted_for_fee_quote');

  return v_order_id;
end;
$$;

revoke all on function public.submit_order_for_fee_quote(uuid, uuid, jsonb, text)
  from public, anon;
grant execute on function public.submit_order_for_fee_quote(uuid, uuid, jsonb, text)
  to authenticated;

create or replace function public.set_order_fee_quote(
  p_order_id uuid,
  p_zone_id uuid,
  p_delivery_fee integer,
  p_surcharges integer,
  p_service_fee integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_total bigint;
  v_before jsonb;
  v_after jsonb;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'authentication_required';
  end if;
  if not public.has_role('admin') and not public.has_role('zone_agent') then
    raise exception 'forbidden';
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'forbidden';
  end if;

  if not public.has_role('admin') then
    if v_order.zone_id is null or v_order.zone_id <> p_zone_id
       or not exists (
         select 1
         from public.user_roles ur
         where ur.user_id = auth.uid()
           and ur.role = 'zone_agent'
           and ur.scope_id = p_zone_id
       ) then
      raise exception 'forbidden';
    end if;
  end if;

  if v_order.status <> 'pending_fee_quote' then
    raise exception 'order_not_waiting_for_quote';
  end if;

  if not exists (
    select 1 from public.zones z where z.id = p_zone_id and z.active
  ) then
    raise exception 'zone_unavailable';
  end if;

  if p_delivery_fee is null or p_delivery_fee < 0
     or p_surcharges is null or p_surcharges < 0
     or p_service_fee is null or p_service_fee < 0 then
    raise exception 'invalid_fee';
  end if;

  if v_order.discount_total > v_order.subtotal then
    raise exception 'invalid_order_discount';
  end if;

  v_total := v_order.subtotal::bigint - v_order.discount_total::bigint
    + p_delivery_fee::bigint + p_surcharges::bigint
    + p_service_fee::bigint + v_order.tip::bigint;
  if v_total > 2147483647 then
    raise exception 'order_amount_out_of_range';
  end if;

  v_before := jsonb_build_object(
    'status', v_order.status,
    'zone_id', v_order.zone_id,
    'delivery_fee', v_order.delivery_fee,
    'surcharges', v_order.surcharges,
    'service_fee', v_order.service_fee,
    'total', v_order.total
  );

  update public.orders
  set zone_id = p_zone_id,
      delivery_fee = p_delivery_fee,
      surcharges = p_surcharges,
      service_fee = p_service_fee,
      total = v_total::integer,
      status = 'awaiting_customer_confirmation'
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, changed_by, reason)
  values (p_order_id, 'awaiting_customer_confirmation', auth.uid(), 'fee_quote_set');

  v_after := jsonb_build_object(
    'status', 'awaiting_customer_confirmation',
    'zone_id', p_zone_id,
    'delivery_fee', p_delivery_fee,
    'surcharges', p_surcharges,
    'service_fee', p_service_fee,
    'total', v_total
  );

  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
  values (auth.uid(), 'order.fee_quote.set', 'orders', p_order_id::text, v_before, v_after);
end;
$$;

revoke all on function public.set_order_fee_quote(uuid, uuid, integer, integer, integer)
  from public, anon;
grant execute on function public.set_order_fee_quote(uuid, uuid, integer, integer, integer)
  to authenticated;

drop policy if exists orders_insert on public.orders;
drop policy if exists orders_update_draft on public.orders;
drop policy if exists order_items_write on public.order_items;
revoke insert, update, delete on public.orders, public.order_items
  from anon, authenticated;

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (public.is_active_user() and public.can_read_order(id));

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or public.has_role('admin')
          or (
            o.zone_id is not null
            and exists (
              select 1 from public.user_roles ur
              where ur.user_id = auth.uid()
                and ur.role = 'zone_agent'
                and ur.scope_id = o.zone_id
            )
          )
          or exists (
            select 1 from public.deliveries d
            where d.order_id = o.id
              and d.courier_id = auth.uid()
          )
        )
    )
  );

-- Vue à privilèges du propriétaire : sa projection exclut les données client/adresse/contact.
create or replace view public.partner_order_queue
with (security_barrier = true)
as
select
  o.id as order_id,
  o.order_number,
  o.status,
  o.created_at,
  o.subtotal,
  oi.id as order_item_id,
  oi.partner_id,
  oi.product_id,
  oi.name_snapshot,
  oi.unit_price,
  oi.qty,
  oi.options,
  oi.line_total
from public.orders o
join public.order_items oi on oi.order_id = o.id
where public.is_active_user()
  and public.has_role('partner')
  and public.is_partner_member(oi.partner_id)
  and o.status <> 'draft';

grant select on public.partner_order_queue to authenticated;

create policy addresses_fee_quote_read on public.addresses for select to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.orders o
      where o.address_id = addresses.id
        and o.status = 'pending_fee_quote'
        and (
          public.has_role('admin')
          or (
            o.zone_id is not null
            and exists (
              select 1 from public.user_roles ur
              where ur.user_id = auth.uid()
                and ur.role = 'zone_agent'
                and ur.scope_id = o.zone_id
            )
          )
        )
    )
  );

create policy addresses_assigned_courier_read on public.addresses for select to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.orders o
      join public.deliveries d on d.order_id = o.id
      where o.address_id = addresses.id
        and d.courier_id = auth.uid()
        and o.status in ('courier_assigned', 'picked_up', 'on_the_way')
    )
  );
```

## Tests à ajouter après validation

- **pgTAP / RLS :** client A ne lit ni ne modifie les commandes/lignes de B ; partenaire A ne voit que ses lignes via `partner_order_queue` et ne peut pas lire téléphone/adresse ; livreur ne voit que ses courses et leurs adresses ; agent de zone est limité à son `scope_id` ; admin peut traiter un devis ; compte suspendu est bloqué dans toutes ces voies.
- **pgTAP / fonctions :** frais et total `NULL` à la soumission ; frais négatifs rejetés ; seul zone_agent/admin peut fixer un devis ; mise à jour concurrente ne fixe le devis qu'une fois ; écriture `audit_logs` présente ; aucun paiement créé.
- **Tests unitaires :** prix falsifié par le client ignoré au profit des prix DB ; même clé envoyée deux fois ne crée qu'une commande ; même clé avec contenu différent est rejetée ; partenaire fermé rejeté ; utilisateur non connecté rejeté.

## Points soumis à validation

1. Confirmer les noms `awaiting_customer_confirmation` et `quote_accepted`, ainsi que l'arrêt du flux à `quote_accepted` sans paiement ni acceptation partenaire.
2. Confirmer que le partenaire ne reçoit jamais téléphone/adresse complète (proposition conservatrice), même après acceptation du devis.
3. Confirmer le traitement admin des adresses libres dont le quartier ne correspond à aucune zone (`zone_id = NULL`) ; aucun tarif ni rattachement n'est inventé.
