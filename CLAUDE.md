@AGENTS.md

# FormMaker

Self-hosted form builder with one admin: build a form, publish it at `/forms/<slug>`, collect anonymous responses (including file uploads), then review them or export CSV. The UI is Turkish.

Stack: Next.js 16 (App Router, Turbopack), React 19, Prisma 6 + PostgreSQL, shadcn/ui (base-nova) on Base UI, Tailwind 4, react-hook-form + Zod 4, Zustand, pnpm.

## Commands

```bash
docker compose -f docker-compose.dev.yml up -d   # local Postgres on port 5433
pnpm dev              # dev server
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest; security logic is in src/lib/security.test.ts
pnpm build            # prisma generate + next build
pnpm test:e2e         # Playwright; stop any dev server first, because it rebuilds .next
```

`pnpm test:e2e` needs Docker. It starts a throwaway Postgres on port 5434 (`docker-compose.e2e.yml`), then `e2e/start-server.mjs` wipes that database, applies the migrations, builds the app and runs the standalone server on port 3100. `e2e/env.mjs` overrides every live setting, so tests never reach Supabase, and uploads stay inside `.next/standalone`.

CI (`.github/workflows/ci.yml`) runs lint, types, tests and build. `npx prisma db seed` adds a sample form; like every Prisma command it targets `.env` (the live database) unless you pass the local URLs. Schema changes go through Prisma migrations in `prisma/migrations/`; Docker applies them at startup with `prisma migrate deploy`. `scripts/backup.sh` backs up the Docker stack's database and uploads.

**`.env` points at a remote Supabase database and storage bucket.** `.env.local` (git-ignored, see `.env.example`) overrides it for the app with the local database and turns Supabase off. The Prisma CLI reads only `.env`, so always pass the local URLs to it:

```bash
DATABASE_URL="postgresql://formmaker:formmaker_dev@127.0.0.1:5433/formmaker" DIRECT_URL="postgresql://formmaker:formmaker_dev@127.0.0.1:5433/formmaker" npx prisma migrate dev
```

Test against local only. Don't touch Supabase without checking with the user first. Outside production the admin login falls back to `admin` / `admin123`.

On Windows, `pnpm build` can fail with EPERM while a dev server is running, because of `prisma generate`. Use `npx next build` instead.

## Layout

```
prisma/schema.prisma      Form > Question > Answer; Submission > Answer
src/proxy.ts              Next 16's middleware: guards /admin/* and /login only
src/actions/              Server actions: writes, plus reads the browser must call
  auth-actions            login / logout
  form-actions            create, save, publish, delete, slug check
  submission-actions      public submit
  response-actions        paginated responses, delete, CSV export
src/app/
  page.tsx                landing page
  login/                  admin login
  forms/[slug]/           public form; admins get preview mode on drafts or ?preview=true
  error.tsx               error page with retry for every route
  admin/forms/(list)/     dashboard, in its own route group so its loading file doesn't wrap the builder
  admin/forms/[id]/edit/  builder; ?tab=questions|responses|settings
  api/health/             database check for the Docker healthcheck
  api/upload/             POST and DELETE attachments
  api/uploads/[...path]/  public, header images only (next.config rewrites /uploads/* here)
  api/answers/[answerId]/file/  admin-only route for response files
src/components/
  builder/                form-builder (orchestrator), header, canvas (form-header-section, question-card, use-question-drag), inspector, settings, crop modal; question-types holds the shared type list
  public/                 public-form-renderer
  responses/              responses-view, table, detail drawer, CSV button
  skeletons/              loading skeletons for each page
  admin/                  dashboard
  ui/                     shadcn components
src/lib/
  auth.ts                 HMAC-signed session cookie (WebCrypto, so it runs in the proxy); requireAdmin
  data/                   reads for server components (forms, public-form), not callable from the browser
  storage.ts              Supabase Storage, falling back to uploads/ on disk; validates every path
  upload-token.ts         signed proof of an accepted upload
  rate-limit.ts           in-memory limiter (per process; suits the in-house server)
  safe-redirect.ts        same-origin check for ?from=
  file-types.ts           MIME presets, file type matching, blocked and inline-safe types
  validations/form.ts     builder schema
  validations/dynamic-schema.ts  per-form answer schema, shared by client and server
  dictionary.ts           all UI text (Turkish)
src/stores/use-builder-store.ts  builder UI state and undo/redo history
```

## How things work

**Auth.** One admin, with credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD`. The session is a stateless signed cookie lasting 7 days. The proxy only covers pages, so every admin server action and data function must call `requireAdmin()`, and every admin route handler `getAdminSession()`, itself. In production the server refuses to start (`instrumentation.ts`) if `AUTH_SECRET` or `ADMIN_PASSWORD` is missing or a known default. Other signed values use `signPayload` with their own purpose, so they can't pass as sessions.

**Builder state.** react-hook-form owns the form data; Zustand holds UI state (selected question, dirty flag, history).
- `FormBuilder` memoizes its returned tree, because `useForm` re-renders it on every field change and that would otherwise reach every `useFormContext` consumer. Don't read `formState` from context; use `useFormState`.
- Components subscribe narrowly with `useWatch({ exact: true })` or `compute`, and many are wrapped in `React.memo`, so typing doesn't re-render the canvas. Keep this when editing the builder.
- `useFieldArray` uses `keyName: '_rhfId'` so `field.id` stays the real question id.
- New questions get client-generated `q_...` ids, which become their database ids through the upsert in `saveForm`.
- The whole form saves at once inside a transaction, on Ctrl+S or the save button. There is no autosave.
- Tabs switch with `setBuilderTab` (`history.replaceState`), with no server round trip. The form stays in memory, so switching tabs never asks about unsaved changes.
- Ctrl+Z and Ctrl+Y in a text field are the browser's own undo; elsewhere they use the builder's history.

**Deleting questions.** A removed question with answers is soft-deleted (`isDeleted`); one without answers is hard-deleted. Filter on `isDeleted: false` wherever current questions are needed. `_count.questions` does not filter.

**Answers are snapshots.** Each `Answer` copies `questionLabel` and `questionType`, and choice answers store resolved labels, so later edits to a form don't rewrite old responses. Responses show questions that no longer exist as archived ("Arşiv").

**Uploads.** Treat every uploaded file and stored location as hostile.
- Respondents' files upload as soon as they're picked. `/api/upload` checks the question's rules on the server and returns a signed token, never a location. `submitFormResponse` takes the path from that token, and the browser can't supply one.
- Deleting needs an admin session, or the file's token until the file has been submitted.
- Response files are read only through `/api/answers/[id]/file`. Actions send that route's URL to the browser in `fileUrl`, not the stored value. It sends `Content-Security-Policy: sandbox` and `nosniff`, and shows only allowlisted types inline.
- Header images need an admin session, are checked by content, and stay public. They track `sessionUploadedFiles` so `saveForm` can delete abandoned ones.
- Files live in `uploads/`, not `public/`, because Next serves `public/` directly with no checks.

**Deployment.** The target is an in-house server running everything in Docker (`docker-compose.yml`: Postgres, the app in standalone mode, local uploads on a volume, migrations applied at startup, abandoned uploads cleaned up daily by the server process). The server probably runs DirectAdmin, whose web server owns ports 80/443 and would proxy a subdomain to `127.0.0.1:3000`, so Caddy is optional (`--profile caddy`). Design for that. Until the move, the live site is Vercel + Supabase at https://form.erdemkoyuncu.com (`vercel.json`), so treat the Supabase project in `.env` as production data. Local disk isn't writable on Vercel, so storage there needs `SUPABASE_SECRET_KEY`. The rate limiter holds counts in one process: correct on the in-house server, weak on Vercel for now.

## Conventions

- Read the relevant guide in `node_modules/next/dist/docs/` before using a Next API. For example, `error.tsx` receives `retry` rather than `reset`, and middleware is `proxy.ts`.
- Every route has a `loading.tsx` built from `components/skeletons/`, and none sits directly above other routes. A skeleton's root takes `skeleton-reveal` (a skeleton alone inside real content uses `InlineSkeleton`), and its colors come from `--skeleton-from` / `--skeleton-to`.
- The look is "Konsol": neutral tokens in `globals.css`, Geist with Geist Mono for numbers and links, thin lines instead of shadows, one accent only for status. Prefer tables and dividers over stacks of cards.
- Hover is instant and leaving fades: a rule in `globals.css` zeroes the transition duration on hovered interactive elements, so give the resting element a `transition-*` and nothing else. A child that reacts to its parent's hover needs `group-hover:duration-0`. Buttons with text are the exception and fade both ways (`hover-fade`, set by the `Button` sizes); icon buttons stay instant.
- Toasts are for errors and for information the user can't see otherwise. Don't announce a result that's already visible; a button with an icon confirms itself (tick, `useTimedFlag`, and `StableLabel` if its text changes).
- Tooltips use `Hint` from `@/components/hint`, not the native `title`. It doesn't name an icon button, so keep its `aria-label`. Skip it where the icon is self-explanatory (arrows, close, drag handle).
- Confirmations use `Dialog`, not `window.confirm`. Menu items use the base text size, and color comes from `variant`, not `className`.
- Icon-only buttons need `aria-label`. On the public form, every control is linked to its label, description and error, and focus moves to the first error on submit.
- Language: the UI is Turkish only. Client text is either in `dict` from `@/lib/dictionary` or inline in Turkish. Server actions return hardcoded Turkish errors.
- Base UI, not Radix: composition uses the `render` prop, not `asChild`. A `Button` rendered as a link needs `nativeButton={false}`.
- Import `cn` from `@/lib/utils`.
- Style differs by folder and there's no formatter: `components/builder`, `public`, `admin` and most of `app` use single quotes and semicolons; `lib`, `actions`, `stores` and most of `components/ui` use double quotes and no semicolons. Match the file.
- Server action results are `{ success: true, data } | { success: false, error }`.
- Prefer `lib/dictionary.ts` for new UI text, especially text used in more than one place.
- Reads for server components go in `lib/data/`, not server actions, which are public endpoints. `getFormResponses` stays an action because the responses tab calls it from the browser.

## Current work

`IMPROVEMENT-PLAN.md` lists known problems, in priority order. Read it before changing auth, uploads, validation or storage. Update this file when conventions change, including the UI conventions from `ui-polish-handoff.md` once they're in place.
