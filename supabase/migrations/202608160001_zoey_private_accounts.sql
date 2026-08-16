create table if not exists public.client_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'owner')),
  first_name text, last_name text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.client_profiles enable row level security;
revoke all on public.client_profiles from anon;
grant select, insert, update on public.client_profiles to authenticated;
create policy "clients read own profile" on public.client_profiles for select to authenticated using (auth.uid() = user_id);
create policy "clients create own profile" on public.client_profiles for insert to authenticated with check (auth.uid() = user_id and role = 'client');
create policy "clients update own client profile" on public.client_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and role = 'client');
create or replace function public.create_client_profile() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.client_profiles (user_id, first_name, last_name) values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name') on conflict (user_id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_client_profile();
