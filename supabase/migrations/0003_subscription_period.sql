-- Fecha de fin del periodo ya pagado y si la suscripción está programada
-- para cancelarse al llegar a esa fecha. Los rellena el webhook de Stripe
-- (customer.subscription.created/updated) para poder avisar al suscriptor
-- en el panel: cuando cancela desde el portal de Stripe, por defecto sigue
-- activo hasta el final del periodo ya pagado, no al instante.

alter table subscribers
  add column current_period_end timestamptz,
  add column cancel_at_period_end boolean not null default false;
