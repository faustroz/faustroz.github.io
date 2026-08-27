# Ferdy Diatmika Personal Hub

[![Deploy](https://github.com/faustroz/faustroz.github.io/actions/workflows/nextjs.yml/badge.svg)](https://github.com/faustroz/faustroz.github.io/actions/workflows/nextjs.yml)

A route-first personal command center for finance, creator work, projects, and profile modules. The Hub uses a compact Night Operations interface while specialist tools retain their own application UI.

## Live URL

https://faustroz.github.io/

## Routes

| Route | Module |
| --- | --- |
| `/` | Privacy-first Personal Hub dashboard |
| `/finance/portfolio` | Existing Supabase-backed Portfolio Tracker |
| `/youtube` | YouTube channel progress tracker |
| `/projects` | Selected products and experiments |
| `/about` | Profile, skills, and contact links |

Legacy `/portfolio-tracker` and `/youtube-tracker` URLs remain available as compatibility pages that send users to their canonical route.

## Architecture

```text
app/
├── page.jsx                       # Personal Hub dashboard
├── layout.jsx                     # Global metadata and shared Hub shell
├── hub.css                        # Night Operations design system
├── finance/portfolio/             # Isolated Portfolio Tracker module
├── youtube/                       # Isolated YouTube Tracker module
├── projects/                      # Canonical project archive
├── about/                         # Canonical profile route
├── portfolio-tracker/             # Legacy compatibility route
└── youtube-tracker/               # Legacy compatibility route

components/
├── hub/                            # Shell, navigation, cards, redirects
├── portfolio/                      # Existing finance UI components
├── youtube/                        # Existing creator UI components
└── ui/                             # Shared UI primitives

lib/
├── hub/                            # Route, content, and summary contracts
└── portfolio/                      # Finance calculations, prices, storage

tests/hub/                          # Vitest and Testing Library coverage
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

Create `.env.local` for the Supabase-backed tracker modules:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

The root Finance card intentionally performs no portfolio query and displays no private value. Finance data is requested only after opening `/finance/portfolio` and passing its existing gate.

## Database

- `supabase-portfolio-tracker.sql` — shared key/value Portfolio Tracker store.
- `youtube-tracker-schema.sql` — settings, daily stats, and top-video tables.

The current schemas permit anonymous access and are intended for the existing personal/demo setup. Add Supabase Auth and user-scoped RLS before using them for private multi-user data.

## Verification

```bash
npm test
npm run build
```

The build uses `output: 'export'` and generates the static `out/` directory.

## Deployment

Pushes to `main` deploy through GitHub Pages using:

```text
.github/workflows/nextjs.yml
```
