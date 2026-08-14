# StudyOS

StudyOS is an AI-powered academic workspace for university students. It brings course organization, deadline planning, private course files, grounded question-answering, flashcard generation, and controlled task automation into one Next.js application.

It is designed as a full-stack / AI engineering portfolio project: the UI is intentionally polished, while the underlying implementation demonstrates database modeling, Supabase security, document ingestion, pgvector retrieval, streaming, structured outputs, tools, evaluation, and observability.

![StudyOS social preview](public/og.png)

## Overview

Students frequently switch between an LMS, a calendar, random PDFs, and a chatbot with no context. StudyOS gives coursework one private home. Documents become a searchable knowledge base; assignments inform a study plan; and the assistant answers with citations rather than pretending it knows what is in a lecture.

## Features

- Email/password signup, login, logout, session refresh, and protected routes via Supabase Auth.
- Course CRUD with detail views for related work, documents, chats, and flashcard sets.
- Assignment CRUD, priority, workload estimates, completion/reopen controls, deadline visibility, and dashboard summaries.
- Private uploads for PDFs, Word documents, PowerPoint presentations, spreadsheets, CSV, text, and Markdown with MIME/size validation, processing states, text extraction, chunking, and embeddings.
- Real RAG chat: question embedding → ownership-filtered pgvector search → untrusted context envelope → streaming answer → source citations.
- A task assistant that uses constrained backend tools to list work, create/update assignments, complete assignments, search documents, and create a basic plan.
- Schema-validated flashcard and study-plan generation with Zod validation before data is persisted.
- User-private AI observability: request count, success/failure count, latency, and feature breakdown.
- A 15-case evaluation harness for retrieval/source, concepts, citation-source checks, and tool routing.

## Tech Stack

| Area | Choice |
| --- | --- |
| Web app | Next.js App Router, React 19, TypeScript (strict) |
| UI | Tailwind CSS, Lucide icons, responsive server/client components |
| Auth/data/storage | Supabase Auth, PostgreSQL, Supabase Storage, Row Level Security |
| Retrieval | OpenAI embeddings, `pgvector`, Supabase RPC similarity search |
| AI | OpenAI Chat Completions streaming, function tools, JSON mode + Zod |
| Documents | `pdf-parse`, Mammoth, JSZip, SheetJS, and text chunks with overlap |
| Quality | Vitest, TypeScript checks, ESLint, evaluation runner |
| Deployment | Vercel + Supabase |

## Screenshots

The app uses a responsive dashboard with a work queue, course cards, upload processing states, streaming chat citations, flashcard review, and study-planning cards. Add screenshots from a configured local or deployed environment here when preparing a portfolio presentation.

## Architecture

```mermaid
flowchart LR
  B[Browser] --> N[Next.js App Router]
  N --> A[Route handlers & server components]
  A --> S[Supabase Auth]
  A --> P[(PostgreSQL)]
  P --> V[pgvector]
  A --> ST[Supabase Storage]
  A --> O[OpenAI API]
  ST --> D[Study-file processing]
  D --> O
  O --> V
```

### RAG pipeline

```text
Upload study file → Validate → Store privately → Extract text → Chunk with overlap
→ Embed chunks → Store in pgvector → Embed question → Retrieve owned chunks
→ Generate a streamed answer → Return citations
```

The assistant system prompt explicitly treats retrieved document text as untrusted evidence. A document cannot override application instructions, ask for secrets, grant new permissions, or access database credentials. Context and the user query are deliberately separated.

### Controlled agent / tool calling

```mermaid
sequenceDiagram
  participant Student
  participant Model as OpenAI model
  participant API as StudyOS API
  participant DB as Supabase + RLS
  Student->>Model: "Add CS 146 homework due Friday"
  Model->>API: createAssignment(arguments)
  API->>API: Zod validate + identify session user
  API->>DB: Ownership-filtered mutation
  DB-->>API: Structured result
  API-->>Model: Tool result
  Model-->>Student: Accurate confirmation
```

The model never receives a database connection or SQL execution ability. Every tool is a normal server-side function with a small allowed action set, Zod validation, user identity, and explicit ownership filtering. Destructive delete operations are not exposed as model tools and require UI confirmation.

## Database schema

Important tables:

- `profiles`: account display metadata linked 1:1 to `auth.users`.
- `courses`, `assignments`: normalized academic workload records.
- `documents`, `document_chunks`: private study-file metadata and embedding-backed source chunks.
- `conversations`, `messages`: persisted chat history and assistant citation metadata.
- `flashcard_sets`, `flashcards`, `study_plans`: generated learning artifacts.
- `ai_runs`: per-user feature, model, latency, token, success, and error telemetry.

The `document_chunks.embedding` column uses `vector(1536)`, matching the default `text-embedding-3-small` model. An IVFFlat cosine index supports similarity search after data is loaded.

## Security

- Every data-owning table has RLS enabled in `supabase/migrations`.
- Policies restrict rows to `auth.uid()` and the hardening migration verifies ownership of nested parent resources such as courses, documents, conversations, and flashcard sets.
- Route handlers authenticate on the server and filter mutations with both `id` and `user_id`; frontend visibility is never treated as authorization.
- The documents bucket is private, accepts supported academic file formats, enforces a 15 MB limit, and requires a storage path prefixed with the authenticated user ID.
- Zod validates form payloads, route requests, tool arguments, IDs, upload metadata, and model-produced structured JSON.
- `.env*` is ignored except `.env.example`; API keys and service-role keys are never committed.
- OpenAI and service-role variables are server-only. The service-role client is isolated and not used by normal user paths.

## Local development

Prerequisites: Node.js 20+ and a Supabase project with the vector extension available.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Fill `.env.local` with project values. Never use the service-role key in a browser-exposed `NEXT_PUBLIC_*` variable.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL, available to browser clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key, protected by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only administrative/background access; not used by standard user routes |
| `OPENAI_API_KEY` | Server-only key for embeddings and chat |
| `OPENAI_CHAT_MODEL` | Optional chat model override; defaults to `gpt-4.1-mini` |
| `OPENAI_EMBEDDING_MODEL` | Optional embedding model override; defaults to `text-embedding-3-small` |
| `NEXT_PUBLIC_APP_URL` | Canonical Vercel URL for metadata, e.g. `https://studyos.vercel.app` |

## Database setup

1. Create a Supabase project.
2. In **Authentication**, enable Email/Password. Configure the site URL and add `<your-app-url>/auth/callback` to allowed redirect URLs.
3. Apply the SQL files in chronological order from `supabase/migrations/` using the Supabase CLI (`supabase db push`) or SQL editor.
4. Verify the private `documents` storage bucket and its policies were created by the first migration.
5. Add the environment values to `.env.local`, then start the app.

For fictional development data, authenticate in the SQL console and run:

```sql
select public.seed_studyos_demo();
```

It creates CS 146, CS 157A, a few assignments, and a sample conversation for the current user. It intentionally does not ship a real academic document.

## Tests and evaluation

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm eval
pnpm build
```

The Vitest suite focuses on input validation, structured output contracts, document chunking, prompt-injection-safe RAG context construction, and the nested-ownership migration. `pnpm eval` runs 15 readable golden evaluation cases using fictional seed material. It reports expected-document retrieval, expected-concept coverage, tool-routing correctness, source/citation checks, and explains that live latency/failure data comes from `ai_runs`.

For a deeper pre-release evaluation, seed test study files in a disposable Supabase project, run the app against a real OpenAI key, and compare retrieved chunks, citations, tool arguments, latency, and failure rate against the cases in `evals/cases.ts`.

## Deployment

1. Push this repository to GitHub.
2. Import it in Vercel as a Next.js project.
3. Add every variable from `.env.example` in Vercel Project Settings. Keep `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` server-only.
4. Set `NEXT_PUBLIC_APP_URL` to the Vercel production URL.
5. In Supabase Auth, add the Vercel URL and `/auth/callback` redirect URL.
6. Deploy and test signup, a private course-file upload, a cited question, and an assignment mutation from a second account to confirm isolation.

## Technical decisions

- **Monolithic Next.js:** a single App Router codebase is easy to deploy and explain while retaining server-side boundaries for secrets and authorization.
- **Supabase + RLS:** PostgreSQL stays directly useful for normalized relational data, while RLS provides defense in depth beyond route-handler filters.
- **Synchronous upload processing for the first version:** the route clearly reports extraction/embedding failures and remains simple to trace in an interview. For long documents at scale, move this function to a queue or Supabase Edge Function.
- **Page-aware character chunking:** a paragraph/sentence-aware 1,500-character target with 220-character overlap is deterministic and easy to reason about without a tokenizer service.
- **Validated JSON rather than trusted JSON:** flashcards and plans are parsed with Zod and rejected when malformed; study-plan sessions are additionally filtered to known assignment IDs.
- **Separate RAG and action modes:** academic questions need retrieved evidence and citations. Mutations need constrained tools. Keeping the flows separate reduces prompt surface area and makes auditing clearer.

## Future improvements

- Background document jobs with retries, OCR fallback, and per-document progress events.
- Optional course sharing with explicit roles and revised RLS policies.
- Citation deep links to secure source previews for pages, slides, and spreadsheet sheets.
- True streamed tool-call turn handling in the chat UI.
- Spaced-repetition scheduling and flashcard review analytics.
- Live CI with a disposable Supabase test project to exercise RLS from two users.
