-- StudyOS initial schema. Apply with `supabase db push` or the Supabase SQL editor.
create extension if not exists vector;

create type public.assignment_status as enum ('not_started', 'in_progress', 'completed');
create type public.assignment_priority as enum ('low', 'medium', 'high');
create type public.document_processing_status as enum ('uploaded', 'processing', 'ready', 'failed');
create type public.flashcard_difficulty as enum ('easy', 'medium', 'hard');
create type public.message_role as enum ('user', 'assistant', 'system', 'tool');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  course_code text,
  professor text,
  semester text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, semester)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  description text,
  due_date date,
  status public.assignment_status not null default 'not_started',
  priority public.assignment_priority not null default 'medium',
  estimated_hours numeric(6,2) check (estimated_hours >= 0 and estimated_hours <= 300),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  filename text not null,
  original_filename text not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type = 'application/pdf'),
  file_size bigint not null check (file_size > 0 and file_size <= 15728640),
  processing_status public.document_processing_status not null default 'uploaded',
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  content text not null check (char_length(content) >= 1),
  chunk_index integer not null check (chunk_index >= 0),
  page_number integer check (page_number > 0),
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.message_role not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  title text not null,
  created_at timestamptz not null default now()
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  flashcard_set_id uuid not null references public.flashcard_sets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  difficulty public.flashcard_difficulty not null default 'medium',
  created_at timestamptz not null default now()
);

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  plan jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  model text not null,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  success boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index courses_user_idx on public.courses(user_id);
create index assignments_user_due_idx on public.assignments(user_id, due_date);
create index assignments_course_idx on public.assignments(course_id);
create index documents_user_idx on public.documents(user_id);
create index document_chunks_user_course_idx on public.document_chunks(user_id, course_id);
create index document_chunks_document_idx on public.document_chunks(document_id);
create index document_chunks_embedding_idx on public.document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index conversations_user_updated_idx on public.conversations(user_id, updated_at desc);
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index flashcard_sets_user_idx on public.flashcard_sets(user_id, created_at desc);
create index study_plans_user_idx on public.study_plans(user_id, created_at desc);
create index ai_runs_user_created_idx on public.ai_runs(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger assignments_updated_at before update on public.assignments for each row execute function public.set_updated_at();
create trigger documents_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger study_plans_updated_at before update on public.study_plans for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- RPC used by RAG. The explicit auth.uid guard makes accidental cross-user retrieval impossible.
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count integer default 7,
  filter_course_id uuid default null,
  filter_document_id uuid default null
)
returns table (
  id uuid, document_id uuid, content text, chunk_index integer, page_number integer,
  document_name text, similarity real
)
language sql stable security invoker set search_path = public as $$
  select c.id, c.document_id, c.content, c.chunk_index, c.page_number, d.original_filename,
    (1 - (c.embedding <=> query_embedding))::real as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where c.user_id = auth.uid()
    and d.user_id = auth.uid()
    and (filter_course_id is null or c.course_id = filter_course_id)
    and (filter_document_id is null or c.document_id = filter_document_id)
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.assignments enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.flashcard_sets enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_plans enable row level security;
alter table public.ai_runs enable row level security;

create policy "Users own their profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "Users own their courses" on public.courses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users own their assignments" on public.assignments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users own their documents" on public.documents for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users own their chunks" on public.document_chunks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users own their conversations" on public.conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users own their messages" on public.messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users own their flashcard sets" on public.flashcard_sets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users own their flashcards" on public.flashcards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users own their plans" on public.study_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users own their AI runs" on public.ai_runs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Private bucket and ownership-preserving object paths: <auth.uid()>/<document-id>/<filename>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 15728640, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users upload their documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users read their documents" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users delete their documents" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid()::text));
