<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Single service: a Next.js 16 (Turbopack) event ticketing app (`ticketing`), Node 22, npm. There is no monorepo and no separate backend — API routes live under `app/api/*`.

- Run/lint/build/test commands are the npm scripts in `package.json`: `npm run dev` (dev server on port 3000), `npm run lint` (ESLint), `npm run build` (production build). There is no test script/suite.
- Dependencies are installed by the environment update script (`npm install`); you normally don't need to reinstall.
- No `.env` is required. All config has defaults (`lib/config.ts`): admin password defaults to `admin123`, admin UI is at `/admin/login`. SMTP is optional — without `SMTP_HOST`/`SMTP_FROM`, registration still works and the confirmation email is simply skipped. The README references a `.env.example` that does not exist in the repo; ignore it.
- Data layer is local SQLite via `better-sqlite3` (a native module). The DB and schema are auto-created at `data/tickets.db` on first access (`lib/db.ts`); there are no migrations to run.
- The public registration flow requires uploading a PDF (CV). For manual/browser testing, have a small `.pdf` file ready to select.
- This repo has no `.gitignore`, so `node_modules/` and `data/` are tracked in git. When committing, stage only your intended files — do not commit incidental churn to `node_modules/`, `data/tickets.db*`, `.next/`, `next-env.d.ts`, or `package-lock.json`.
