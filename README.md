# Ferdy Diatmika Portfolio & Personal Hub

[![Deploy](https://github.com/faustroz/faustroz.github.io/actions/workflows/nextjs.yml/badge.svg)](https://github.com/faustroz/faustroz.github.io/actions/workflows/nextjs.yml)

The public root remains Ferdy Diatmika's portfolio. A separate flat-technical Personal Hub provides authenticated access to private finance, academic, document, insight, and OSINT tools.

The private Hub visual system applies to `/hub` and its modules; the public landing page at `/` intentionally retains its original portfolio design. Earlier visual references remain archived under `docs/design-backups/`.

## Live URL

https://faustroz.github.io/

## Routes

| Route | Module |
| --- | --- |
| `/` | Public portfolio landing page |
| `/hub` | Privacy-first Personal Hub dashboard |
| `/finance/portfolio` | Existing Supabase-backed Portfolio Tracker |
| `/finance` | Private expenses, budgets, and subscriptions workspace |
| `/academic` | Private grades, credits, semester, and IP/IPK records |
| `/vault` | Private document drive with owner-scoped Storage |
| `/osint` | Non-persistent Phone and Username Intelligence tools |
| `/phone-lookup` | Compatibility route for private Phone Lookup |
| `/insights` | Real-data Finance, Academic, and Vault insights |
| `/trash` | Recovery and permanent deletion for active Hub records |
| `/settings` | Account, privacy, backup, and system controls |

Legacy `/portfolio-tracker`, `/study`, and `/projects` remain compatibility redirects. Retired Study, Projects, and AI Memory database tables are not used by active runtime features, but remain owner-scoped so old data can still be exported/restored safely.

## Architecture

```text
app/
├── page.jsx                       # Public portfolio landing page
├── hub/                           # Personal Hub dashboard and metadata
├── hub.css                        # Night Operations design system
├── finance/portfolio/             # Isolated Portfolio Tracker module
├── academic/                      # Active Academic records
├── vault/                         # Active Document Vault
├── osint/                         # Non-persistent private lookups
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

Before authentication, the Hub performs no private table search or summary query. With an authenticated owner session, `/hub` loads real Finance, Academic, Vault, and system activity. Global Search covers active private records and indexed text/Markdown Vault content; OSINT results are intentionally never persisted or searched.

## Database

1. Enable Email authentication in Supabase and create the private owner account.
2. Run the SQL files in [`supabase/migrations`](supabase/migrations) in numerical order. See its README for the exact sequence and prerequisites.

Every active Hub table defaults `user_id` to `auth.uid()` and applies owner-only policies. Portfolio storage is keyed by `(user_id, key)`. Vault objects are private and their path prefix must match the authenticated owner ID. Provider secrets remain server-side in Supabase/Vercel environments.

## Verification

```bash
npm test
npm run test:core
npm run build
```

The build uses `output: 'export'` and generates the static `out/` directory.

## Deployment

Pushes to `main` deploy through GitHub Pages using `.github/workflows/nextjs.yml`.
