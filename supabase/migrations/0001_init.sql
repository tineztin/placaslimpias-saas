-- Esquema inicial: suscriptores (empresas B2B) y leads capturados por su
-- calculadora embebida. Ver /Users/mitica/.claude/plans/immutable-puzzling-thimble.md
-- para el razonamiento detrás del modelo de RLS.

create extension if not exists pgcrypto;

create type subscription_status as enum ('active', 'canceled', 'past_due');

create table subscribers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  api_key text not null unique,
  company_name text not null,
  notification_emails text[] not null default '{}',
  brand_color text not null default '#000000',
  logo_url text,
  privacy_policy_url text,
  terms_url text,
  allowed_domains text[] not null default '{}',
  subscription_status subscription_status not null default 'past_due',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscribers_user_id_idx on subscribers (user_id);
create index subscribers_api_key_idx on subscribers (api_key);

create table leads (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  lead_name text not null,
  lead_email text not null,
  lead_phone text,
  calc_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index leads_subscriber_id_idx on leads (subscriber_id);
create index leads_created_at_idx on leads (created_at desc);

-- Mantiene subscribers.updated_at al día en cada UPDATE.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscribers_set_updated_at
before update on subscribers
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Ninguna de las dos tablas tiene políticas de INSERT/UPDATE/DELETE para los
-- roles anon/authenticated a propósito:
--
--  - subscribers: si un suscriptor pudiera escribir su propia fila desde el
--    navegador, podría hacer UPDATE subscribers SET subscription_status =
--    'active' y auto-activarse sin pasar por Stripe. Toda escritura (alta en
--    el onboarding, edición de marca, cambios de subscription_status /
--    stripe_customer_id / api_key) pasa por rutas de servidor que usan la
--    service role key, que además genera el api_key (el cliente nunca lo
--    elige).
--
--  - leads: se insertan exclusivamente desde POST /api/v1/leads con la
--    service role key (bypassa RLS). api_key es públicamente visible (va en
--    el HTML del cliente embebido), así que nunca puede ser la única
--    barrera de escritura.
-- ---------------------------------------------------------------------------

alter table subscribers enable row level security;
alter table leads enable row level security;

create policy "subscriber can view own row"
on subscribers for select
using (auth.uid() = user_id);

create policy "subscriber can view own leads"
on leads for select
using (
  exists (
    select 1 from subscribers
    where subscribers.id = leads.subscriber_id
      and subscribers.user_id = auth.uid()
  )
);
