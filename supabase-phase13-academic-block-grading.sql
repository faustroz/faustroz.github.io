-- Phase 13: block assessment weights and automatic final grade/IP points.
alter table public.academic_records add column if not exists ospe numeric(5,2);
alter table public.academic_records add column if not exists osce numeric(5,2);
alter table public.academic_records add column if not exists soca_tutorial numeric(5,2);
alter table public.academic_records add column if not exists mp numeric(5,2);
alter table public.academic_records add column if not exists behavior numeric(5,2);
alter table public.academic_records add column if not exists final_score numeric(5,2);
alter table public.academic_records alter column grade set default 'E';

create or replace function public.calculate_academic_block_grade()
returns trigger language plpgsql set search_path = public as $$
declare w_ospe numeric:=0; w_osce numeric:=0; w_soca numeric:=0; w_mp numeric:=0; w_behavior numeric:=0; score numeric;
begin
  if new.block = 'Blok 1' then w_soca:=40; w_mp:=50; w_behavior:=10;
  elsif new.block = 'Blok 2' then w_ospe:=20; w_soca:=30; w_mp:=40; w_behavior:=10;
  elsif new.block = 'Blok 20' then w_ospe:=40; w_mp:=50; w_behavior:=10;
  elsif new.block in ('Blok 21','Blok 22','Blok 21 & 22') then w_ospe:=25; w_soca:=25; w_mp:=40; w_behavior:=10;
  elsif new.block = 'Blok 26' then w_osce:=25; w_soca:=25; w_mp:=40; w_behavior:=10;
  else w_ospe:=20; w_osce:=20; w_soca:=20; w_mp:=30; w_behavior:=10;
  end if;
  score := coalesce(new.ospe,0)*w_ospe/100 + coalesce(new.osce,0)*w_osce/100 + coalesce(new.soca_tutorial,0)*w_soca/100 + coalesce(new.mp,0)*w_mp/100 + coalesce(new.behavior,0)*w_behavior/100;
  new.final_score := round(score,2);
  new.grade := case when score >= 75 then 'A' when score >= 70 then 'B+' when score >= 66 then 'B' when score >= 60 then 'C+' when score >= 55 then 'C' when score >= 40 then 'D' else 'E' end;
  return new;
end $$;
drop trigger if exists calculate_academic_block_grade on public.academic_records;
create trigger calculate_academic_block_grade before insert or update on public.academic_records for each row execute function public.calculate_academic_block_grade();

-- Recalculate existing records that already have component scores.
update public.academic_records set updated_at = now() where ospe is not null or osce is not null or soca_tutorial is not null or mp is not null or behavior is not null;
