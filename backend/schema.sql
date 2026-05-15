-- Supabase / PostgreSQL schema for SupabaseMessenger
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  username text not null unique,
  email text not null unique,
  password text not null,
  profile_image text,
  bio text,
  is_online boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text,
  group_image text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_participants (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (chat_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  message text,
  message_type text not null default 'text',
  media_url text,
  seen boolean not null default false,
  reply_to uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_chat_created on public.messages(chat_id, created_at);
create index if not exists idx_users_username on public.users(username);
create index if not exists idx_chat_participants_chat_id on public.chat_participants(chat_id);
create index if not exists idx_chat_participants_user_id on public.chat_participants(user_id);
