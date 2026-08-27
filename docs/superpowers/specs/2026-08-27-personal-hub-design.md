# Personal Hub Design

**Date:** 2026-08-27  
**Status:** Approved in conversation; awaiting written-spec review  
**Product direction:** Route-first Personal Hub with a Night Operations visual system

## Objective

Refactor the existing portfolio website into a Personal Hub. The root route becomes a hybrid command dashboard, the existing Portfolio Tracker remains functionally intact at `/finance/portfolio`, the YouTube tracker moves to `/youtube`, and personal content moves to dedicated `/projects` and `/about` routes. A shared desktop and mobile navigation system connects the modules without forcing specialist modules to share the same internal UI.

## Success criteria

- `/` presents a useful Personal Hub dashboard rather than the current linear portfolio landing page.
- `/finance/portfolio` preserves the existing tracker login gate, Supabase storage, transaction CRUD, live pricing, charts, import/export, and logout behavior.
- `/youtube`, `/projects`, and `/about` are canonical routes and appear in the Hub navigation.
- Mobile users can reach Home, Finance, and YouTube in one tap through a persistent bottom dock.
- The public root dashboard never queries or displays portfolio values.
- Existing `/portfolio-tracker` and `/youtube-tracker` links remain usable through static-export-compatible compatibility pages.
- `next build` continues producing a valid static export for GitHub Pages.

## Chosen approach

Use a shared Hub shell with isolated specialist modules. Global identity and navigation are consistent across the site, while Finance retains its current dark application layout and component tree. This avoids an unnecessary redesign of the tracker and keeps its functionality insulated from the Personal Hub refactor.

Rejected alternatives:

1. A single unified design system would require redesigning the Portfolio Tracker and create unnecessary regression risk.
2. Embedding legacy modules in wrappers or iframes would weaken routing, accessibility, responsive behavior, and visual cohesion.

## Information architecture

| Route | Purpose | Canonical navigation group |
| --- | --- | --- |
| `/` | Personal command dashboard | Home |
| `/finance/portfolio` | Existing Portfolio Tracker | Finance |
| `/youtube` | Existing YouTube Tracker | YouTube |
| `/projects` | Project portfolio and external product links | More |
| `/about` | Profile, skills, social links, and contact | More |
| `/portfolio-tracker` | Compatibility redirect page | Legacy |
| `/youtube-tracker` | Compatibility redirect page | Legacy |

Because `output: 'export'` is enabled, legacy routes use a client-side `replace()` and render a visible canonical link as a no-JavaScript fallback. No server redirects are introduced.

## Dashboard composition

The dashboard is a hybrid hub: navigation and personal context dominate, with lightweight module summaries where data is safe to expose.

1. **System header:** `FD_OS`, current route, local date, and an online/status indicator.
2. **Greeting panel:** concise personal greeting and the hub's current focus.
3. **Finance module:** privacy-first locked state with a direct route to `/finance/portfolio`. It contains no Supabase portfolio request, total value, holdings, or performance percentage.
4. **YouTube module:** channel name and latest public tracker summary, loaded after hydration.
5. **Projects module:** count or concise static summary sourced from the shared project registry.
6. **About module:** short profile cue and contact shortcut.
7. **Status strip:** lightweight closing element in place of the generic footer.

## Visual direction: Night Operations

The interface resembles a quiet personal operations console rather than a generic SaaS dashboard.

- Canvas: `#07100d`
- Panels: `#0e201a`
- Structural borders: `#244d3d`
- Primary text: `#d8f8e7`
- Muted text: `#91aa9f`
- Phosphor accent: `#64efad`
- Geist Mono is used for labels, status text, numbers, and navigation.
- A local serif stack is used sparingly for personal headings and greeting copy.
- Module numbers and labels use compact uppercase tracking such as `01 / FINANCE`.
- Borders, restrained inset depth, and grid lines establish hierarchy; large generic gradients and pill-heavy card styling are avoided.
- Initial dashboard elements reveal in a short header-to-content sequence. Motion is disabled when `prefers-reduced-motion` is active.

## Shared components

### `HubShell`

Provides the global background, content width, desktop header placement, and mobile safe-area spacing. It does not own module-specific data.

### `HubHeader`

Displays identity, route status, and desktop navigation. It remains compact so specialist interfaces retain vertical space.

### `MobileDock`

Fixed navigation with Home, Finance, YouTube, and More. Active state derives from the current pathname. The dock accounts for device safe areas and pages reserve sufficient bottom padding so controls are never obscured.

### `MoreSheet`

Contains Projects, About, GitHub, and email. It closes on route selection, backdrop click, or Escape; locks background scrolling while open; exposes an accessible dialog label; and restores focus to its trigger when closed.

### `ModuleCard`

Shared presentation primitive for a module number, status, title, supporting detail, and destination. Variant styling is explicit rather than inferred from route names.

### Dashboard-specific cards

- `FinanceLockedCard` supplies static privacy-safe copy only.
- `YouTubeSummaryCard` owns loading, available, and unavailable presentation states.
- `FocusPanel` supplies static personal context and no external requests.

## Content organization

A central Hub registry defines canonical routes, navigation labels, descriptions, module numbering, and presentation variants. Project information and personal links are also moved into focused data modules so `/`, `/projects`, and `/about` do not duplicate strings or URLs.

The registry contains no private finance values and no secrets. Icons remain component-level concerns because React elements are not stored in the plain data registry.

## Data flow

### Finance

The root dashboard never calls `lib/portfolio/storage.js`. Selecting Finance navigates to `/finance/portfolio`, where the existing `LoginGate` controls entry and the current tracker initializes its data only after the gate calls `onLogin`.

### YouTube

The dashboard summary initializes on the client. When the public Supabase URL and anon key are available, it reads the channel settings and latest daily statistics. Loading is bounded to the card; a configuration or network error changes the card to `UNAVAILABLE` while preserving its link to `/youtube`. No YouTube API key is read or displayed on the root dashboard.

### Navigation

The shared navigation reads `usePathname()` and resolves nested routes through the registry. `/finance/portfolio` activates Finance; `/projects` and `/about` activate More. Legacy compatibility pages are not shown as navigation destinations.

## Portfolio Tracker migration

The canonical route directory moves from `app/portfolio-tracker` to `app/finance/portfolio`. Its page logic, dedicated stylesheet, metadata, and existing portfolio components remain functionally unchanged. Only integration changes are permitted:

- canonical route location;
- shared Hub navigation visibility;
- bottom safe-area spacing where required;
- root footer exclusion rules;
- internal links or labels that reference the old route.

The tracker storage keys and Supabase table contract remain unchanged.

## Error and empty states

- Missing Supabase configuration must not crash the root dashboard; YouTube shows `UNAVAILABLE`.
- Missing YouTube rows show a configured empty state rather than fabricated metrics.
- Legacy redirects include a visible link if automatic navigation does not run.
- The More sheet maintains focus and scroll behavior even when closed by navigation.
- External links identify that they leave the Hub and use safe `rel` attributes when opened in a new tab.

## Responsive behavior

- Desktop and wide tablet: compact header navigation; dashboard uses an asymmetric information grid.
- Small tablet: grid collapses to two columns while preserving module numbering and reading order.
- Mobile: one-column content with persistent bottom dock. Primary destinations remain reachable by thumb, and More opens as a bottom sheet.
- Finance keeps its own responsive behavior and receives only enough bottom spacing to avoid overlap with the dock.

## Accessibility

- Semantic `nav`, `main`, headings, and descriptive link labels are required.
- Active navigation uses `aria-current="page"` where appropriate.
- Icon-only actions include accessible names.
- Keyboard focus is visible against the dark canvas.
- More uses dialog semantics, Escape handling, focus restoration, and scroll lock.
- Color is not the only status signal; status text accompanies indicator colors.
- Reduced-motion preferences disable non-essential reveals and transforms.

## Testing strategy

The project will add a lightweight automated test script using Node's built-in test runner for pure Hub behavior. Production behavior is developed test-first.

Automated coverage includes:

- canonical route registry and navigation ordering;
- nested pathname-to-active-navigation resolution;
- Finance dashboard metadata remaining privacy-safe;
- legacy route mapping;
- YouTube summary normalization for available, empty, and unavailable states.

Verification also includes:

- `npm test` for the new pure behavior tests;
- `npm run build` for lint, static rendering, and export generation;
- responsive browser checks at representative mobile, tablet, and desktop widths;
- keyboard and Escape behavior for More;
- regression checks for Portfolio Tracker login, transaction CRUD, chart rendering, import/export, and logout;
- route checks for both canonical and legacy URLs.

## Out of scope

- Replacing the existing Portfolio Tracker password mechanism or Supabase policies.
- Redesigning Finance charts, forms, calculations, or storage.
- Adding a PWA manifest or service worker.
- Introducing new backend services, analytics, notifications, or account systems.
- Exposing private finance metrics on the public dashboard.

