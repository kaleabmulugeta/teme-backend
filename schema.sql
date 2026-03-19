create extension if not exists pgcrypto;

create table
    if not exists public.gallery_projects (
        id uuid primary key default gen_random_uuid (),
        title_en text not null,
        title_am text not null,
        thumbnail_url text not null,
        thumbnail_storage_path text not null unique,
        created_at timestamptz not null default now ()
    );

create table
    if not exists public.gallery_project_images (
        id uuid primary key default gen_random_uuid (),
        project_id uuid not null references public.gallery_projects (id) on delete cascade,
        image_url text not null,
        storage_path text not null unique,
        created_at timestamptz not null default now ()
    );

alter table public.gallery_projects enable row level security;

alter table public.gallery_project_images enable row level security;

drop policy if exists gallery_projects_public_read on public.gallery_projects;

create policy gallery_projects_public_read on public.gallery_projects for
select
    using (true);

drop policy if exists gallery_project_images_public_read on public.gallery_project_images;

create policy gallery_project_images_public_read on public.gallery_project_images for
select
    using (true);

insert into
    storage.buckets (id, name, public)
values
    ('gallery', 'gallery', true) on conflict (id) do
update
set
    public = excluded.public;