-- Fase 5 (dashboard): redirección tras completar el cálculo + Storage para
-- el logo del suscriptor.

alter table subscribers add column redirect_url text;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Carpeta por usuario (logos/<user_id>/archivo): lectura pública porque el
-- logo se muestra en /embed a visitantes anónimos; escritura solo dentro de
-- la propia carpeta del usuario autenticado.
create policy "public read logos"
on storage.objects for select
using (bucket_id = 'logos');

create policy "subscriber can upload own logo"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "subscriber can update own logo"
on storage.objects for update
to authenticated
using (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "subscriber can delete own logo"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
