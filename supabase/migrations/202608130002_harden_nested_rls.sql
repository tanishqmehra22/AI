-- Ownership checks for nested resources. RLS must verify the referenced parent,
-- not just trust a browser-supplied foreign key plus a matching user_id.
drop policy "Users own their assignments" on public.assignments;
create policy "Users own their assignments" on public.assignments for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()
  ));

drop policy "Users own their documents" on public.documents;
create policy "Users own their documents" on public.documents for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (course_id is null or exists (
    select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()
  )));

drop policy "Users own their chunks" on public.document_chunks;
create policy "Users own their chunks" on public.document_chunks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()
  ) and (course_id is null or exists (
    select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()
  )));

drop policy "Users own their conversations" on public.conversations;
create policy "Users own their conversations" on public.conversations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (course_id is null or exists (
    select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()
  )));

drop policy "Users own their messages" on public.messages;
create policy "Users own their messages" on public.messages for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()
  ));

drop policy "Users own their flashcard sets" on public.flashcard_sets;
create policy "Users own their flashcard sets" on public.flashcard_sets for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and (course_id is null or exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()))
    and (document_id is null or exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())));

drop policy "Users own their flashcards" on public.flashcards;
create policy "Users own their flashcards" on public.flashcards for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.flashcard_sets s where s.id = flashcard_set_id and s.user_id = auth.uid()
  ));

create or replace function public.seed_studyos_demo()
returns void language plpgsql security invoker set search_path = public as $$
declare
  cs146_id uuid;
  cs157a_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in before adding development seed data'; end if;
  insert into public.courses (user_id, name, course_code, professor, semester)
  values (auth.uid(), 'Data Structures and Algorithms', 'CS 146', 'Dr. Rivera', 'Fall 2026')
  on conflict (user_id, name, semester) do update set course_code = excluded.course_code
  returning id into cs146_id;
  insert into public.courses (user_id, name, course_code, professor, semester)
  values (auth.uid(), 'Database Management Systems', 'CS 157A', 'Dr. Chen', 'Fall 2026')
  on conflict (user_id, name, semester) do update set course_code = excluded.course_code
  returning id into cs157a_id;
  insert into public.assignments (user_id, course_id, title, due_date, priority, estimated_hours)
  select auth.uid(), cs146_id, 'Balanced trees problem set', current_date + 5, 'high', 3
  where not exists (select 1 from public.assignments where user_id = auth.uid() and course_id = cs146_id and title = 'Balanced trees problem set');
  insert into public.assignments (user_id, course_id, title, due_date, priority, estimated_hours)
  select auth.uid(), cs157a_id, 'Schema design proposal', current_date + 2, 'high', 2
  where not exists (select 1 from public.assignments where user_id = auth.uid() and course_id = cs157a_id and title = 'Schema design proposal');
  insert into public.assignments (user_id, course_id, title, due_date, priority, estimated_hours)
  select auth.uid(), cs157a_id, 'Normalization review', current_date + 8, 'medium', 1.5
  where not exists (select 1 from public.assignments where user_id = auth.uid() and course_id = cs157a_id and title = 'Normalization review');
  insert into public.conversations (user_id, course_id, title)
  select auth.uid(), cs146_id, 'Understanding AVL rotations'
  where not exists (select 1 from public.conversations where user_id = auth.uid() and course_id = cs146_id and title = 'Understanding AVL rotations');
end;
$$;
