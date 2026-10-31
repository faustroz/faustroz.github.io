-- Allow one Image Occlusion collection to contain several source images.
-- Existing collections are backfilled as one image; existing cards keep their IDs,
-- answers, schedules, and storage paths.

create table if not exists public.academic_image_occlusion_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  set_id uuid not null,
  image_path text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, set_id, image_path),
  foreign key (user_id, set_id) references public.academic_image_occlusion_sets(user_id, id) on delete cascade
);

insert into public.academic_image_occlusion_images (user_id, set_id, image_path, position)
select user_id, id, image_path, 0
from public.academic_image_occlusion_sets
on conflict (user_id, set_id, image_path) do nothing;

alter table public.academic_image_occlusion_cards
  add column if not exists image_id uuid;

update public.academic_image_occlusion_cards as card
set image_id = image.id
from public.academic_image_occlusion_images as image
where image.user_id = card.user_id
  and image.set_id = card.set_id
  and image.position = 0
  and card.image_id is null;

alter table public.academic_image_occlusion_cards
  alter column image_id set not null;

alter table public.academic_image_occlusion_cards
  drop constraint if exists academic_image_occlusion_cards_image_fk;
alter table public.academic_image_occlusion_cards
  add constraint academic_image_occlusion_cards_image_fk
  foreign key (user_id, image_id)
  references public.academic_image_occlusion_images(user_id, id)
  on delete cascade;

create index if not exists academic_image_occlusion_images_set_idx
  on public.academic_image_occlusion_images (user_id, set_id, position);
create index if not exists academic_image_occlusion_cards_image_idx
  on public.academic_image_occlusion_cards (user_id, image_id, position);

alter table public.academic_image_occlusion_images enable row level security;
drop policy if exists "owner access academic_image_occlusion_images" on public.academic_image_occlusion_images;
create policy "owner access academic_image_occlusion_images"
  on public.academic_image_occlusion_images for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.academic_image_occlusion_images to authenticated;
revoke all on public.academic_image_occlusion_images from anon;

drop trigger if exists set_academic_image_occlusion_images_updated_at on public.academic_image_occlusion_images;
create trigger set_academic_image_occlusion_images_updated_at
  before update on public.academic_image_occlusion_images
  for each row execute function public.set_updated_at();

comment on table public.academic_image_occlusion_images is
  'Owner-private source images in an Image Occlusion set; cards reference one image and keep independent review schedules.';
