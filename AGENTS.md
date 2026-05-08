# Hitzkideak - Agent Context

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with Supabase credentials
npm run dev
```

Requires: Node 18+, Supabase backend.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm run lint:eslint` | ESLint on `src/` |
| `npm run lint:all` | Both type check and ESLint |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check only |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |

## Architecture

- Single-page React 19 + TypeScript app (Vite 6, Tailwind CSS 4)
- `@/*` path alias maps to project root
- **React Router v7** for navigation (deep linking enabled)
- PWA via `vite-plugin-pwa`; Supabase calls cached in service worker (1-week TTL)
- Supabase is the source of truth for authenticated user progress and profile data
- Dev HMR can be disabled with `DISABLE_HMR=true` env var

## Routes

| Path | Description |
|------|-------------|
| `/` | Home page |
| `/game/:mode` | Game page (mode: main, quick, review) |
| `/results` | Session results |
| `/stats` | Statistics |
| `/review` | Vocabulary review |
| `/favorites` | Saved favorites |
| `/settings` | Language preferences |
| `/profile` | User profile |
| `/cloze` | Cloze selection |
| `/cloze/:size` | Cloze game (size: 5, 10, 15) |
| `/cloze/results` | Cloze results |
| `/discourse` | Discourse markers home |
| `/discourse/:size/:mode` | Discourse game |
| `/discourse/results` | Discourse results |

**Game state** is passed via `sessionStorage` keys:
- `hitzkideak_questions` — Game questions array
- `hitzkideak_result` — Session result
- `hitzkideak_cloze_result` — Cloze session result
- `hitzkideak_discourse_result` — Discourse session result

## Quirks

- Tailwind CSS 4 uses `@tailwindcss/vite` plugin, not PostCSS
- Vitest for testing (`src/test/`), no test suite (verify manually)
- `docs-ia/` contains Spanish-language project management docs (workflow, architecture decisions, testing guide)
- `.env*` files are gitignored; only `.env.example` is committed
- **PWA**: Cache versioning via `CACHE_VERSION` in `vite.config.ts`; offline fallback at `public/offline.html`
  - `cleanupOutdatedCaches: true` — old caches auto-removed on update
  - `skipWaiting: true` — service worker activates immediately

## Deployment

Vercel: build command `npm run build`, output `dist/`. No server — purely static with PWA.
