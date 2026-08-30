# Ferdy Diatmika Portfolio & Personal Hub

[![Deploy](https://github.com/faustroz/faustroz.github.io/actions/workflows/nextjs.yml/badge.svg)](https://github.com/faustroz/faustroz.github.io/actions/workflows/nextjs.yml)

The public root remains Ferdy Diatmika's portfolio. A separate Night Operations Personal Hub provides access to private finance tooling, projects, and profile modules.

The Night Operations system applies to `/hub` and its modules; the public landing page at `/` intentionally retains its original portfolio design. The previous module design is documented in `docs/design-backups/pre-night-operations-finance.md`.

## Live URL

https://faustroz.github.io/

## Routes

| Route | Module |
| --- | --- |
| `/` | Public portfolio landing page |
| `/hub` | Privacy-first Personal Hub dashboard |
| `/finance/portfolio` | Existing Supabase-backed Portfolio Tracker |
| `/finance` | Private expenses, budgets, and subscriptions workspace |
| `/study` | Private topics, exams, flashcards, and progress workspace |
| `/projects` | Private projects, tasks, progress, and changelog workspace |
| `/memory` | Private, API-ready AI context and memory entries |
| `/settings` | Account, privacy, and integration placeholders |
| `/insights` | Lightweight authenticated Finance, Study, and Projects analytics |

Legacy `/portfolio-tracker` remains available as a compatibility page that sends users to `/finance/portfolio`.

## Architecture

```text
app/
├── page.jsx                       # Public portfolio landing page
├── hub/                           # Personal Hub dashboard and metadata
├── hub.css                        # Night Operations design system
├── finance/portfolio/             # Isolated Portfolio Tracker module
├── projects/                      # Canonical project archive
└── portfolio-tracker/             # Legacy compatibility route

components/
├── hero.jsx                       # Public portfolio hero
├── about.jsx                      # Public portfolio About Me section
├── portfolio.jsx                  # Public portfolio project grid
├── hub/                           # Shell, navigation, cards, redirects
├── portfolio/                     # Existing finance UI components
└── ui/                            # Shared UI primitives

lib/
├── hub/                           # Route and content contracts
└── portfolio/                     # Finance calculations, prices, storage
```

## Stack

- Next.js 14 and React 18
- Tailwind CSS plus isolated module stylesheets
- Supabase JS
- Chart.js / react-chartjs-2
- Framer Motion and Lucide icons
- Vitest, Testing Library, and jsdom

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local` for Supabase Auth and private modules:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

The public Hub dashboard performs no private Supabase data query. After an authenticated Supabase session is present, `/hub` loads lightweight Finance, Study, Projects, and AI Memory summaries, plus Current Focus and Recent Activity. Private routes require an authenticated session; Portfolio keeps its existing internal gate after the shared account gate.

## Database

1. Enable Email authentication in Supabase and create the private owner account.
2. Run the SQL files in [`supabase/migrations`](supabase/migrations) in numerical order. See its README for the exact sequence and prerequisites.

Every Hub-owned table defaults `user_id` to `auth.uid()` and applies owner-only select, insert, update, and delete policies. AI Memory stores structured context only; it makes no external API calls.

## Verification

```bash
npm test
npm run test:core
npm run build
```

The build uses `output: 'export'` and generates the static `out/` directory.

## Deployment

Pushes to `main` deploy through GitHub Pages using `.github/workflows/nextjs.yml`.
