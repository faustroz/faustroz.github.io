# Personal Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing portfolio site into a route-first Personal Hub while preserving the Portfolio Tracker at `/finance/portfolio` and adding accessible mobile navigation.

**Architecture:** A client-side Hub shell supplies global navigation and Night Operations styling, while Finance and YouTube remain isolated route modules. Pure registries and normalizers hold route/data decisions, React components own rendering and interaction, and legacy routes use static-export-compatible client redirects.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS 3, custom CSS, Supabase JS, Vitest, Testing Library, jsdom

---

## File structure

### New files

- `vitest.config.mjs` — JSX transform, jsdom test environment, and `@` alias.
- `tests/setup.js` — jest-dom matchers and test cleanup.
- `tests/hub/navigation.test.jsx` — registry, active-route, desktop nav, mobile dock, and More sheet behavior.
- `tests/hub/dashboard.test.jsx` — privacy-safe Finance card and dashboard module rendering.
- `tests/hub/youtube-summary.test.mjs` — YouTube summary normalization states.
- `tests/hub/legacy-redirect.test.jsx` — compatibility route behavior.
- `lib/hub/navigation.mjs` — canonical route registry and active-route resolution.
- `lib/hub/content.mjs` — project, profile, skill, contact, and focus content.
- `lib/hub/youtube-summary.mjs` — pure available/empty/unavailable normalization.
- `components/hub/HubShell.jsx` — global shell boundary.
- `components/hub/HubNavigation.jsx` — desktop header, mobile dock, and accessible More sheet.
- `components/hub/ModuleCard.jsx` — reusable Night Operations module card.
- `components/hub/YouTubeSummaryCard.jsx` — client-side Supabase summary card.
- `components/hub/LegacyRedirect.jsx` — static-export-compatible redirect with visible fallback link.
- `app/hub.css` — Hub tokens, layouts, navigation, motion, and responsive rules.
- `app/projects/page.jsx` — canonical projects route.
- `app/about/page.jsx` — canonical about route.
- `app/portfolio-tracker/page.jsx` — legacy compatibility entry after migration.
- `app/youtube-tracker/page.jsx` — legacy compatibility entry after migration.

### Moved files

- `app/portfolio-tracker/layout.jsx` → `app/finance/portfolio/layout.jsx`
- `app/portfolio-tracker/page.jsx` → `app/finance/portfolio/page.jsx`
- `app/portfolio-tracker/portfolio.css` → `app/finance/portfolio/portfolio.css`
- `app/youtube-tracker/layout.jsx` → `app/youtube/layout.jsx`
- `app/youtube-tracker/page.jsx` → `app/youtube/page.jsx`
- `app/youtube-tracker/youtube.css` → `app/youtube/youtube.css`

### Modified or removed files

- `package.json` — test scripts and test dependencies.
- `app/layout.jsx` — local typography, Hub stylesheet, and `HubShell` wrapper.
- `app/page.jsx` — Personal Hub dashboard.
- `components/FooterConditional.jsx` — remove after the Hub status strip replaces it.
- `components/portfolio.jsx` and `components/about.jsx` — remove after content moves to canonical pages and registries.
- `README.md` — canonical route map and updated architecture.

---

### Task 1: Establish the test harness and route contract

**Files:**
- Modify: `package.json`
- Create: `vitest.config.mjs`
- Create: `tests/setup.js`
- Create: `tests/hub/navigation.test.jsx`
- Create: `lib/hub/navigation.mjs`

- [ ] **Step 1: Install the test-only dependencies**

Run:

```powershell
rtk npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: `package.json` and `package-lock.json` gain only development dependencies.

- [ ] **Step 2: Add the Vitest configuration and test script**

Create `vitest.config.mjs`:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': root } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    restoreMocks: true,
  },
});
```

Create `tests/setup.js`:

```js
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```

Add these scripts to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Write the failing route-contract test**

Create `tests/hub/navigation.test.jsx` with the pure contract first:

```jsx
import { describe, expect, it } from 'vitest';
import {
  HUB_MODULES,
  LEGACY_ROUTES,
  resolveActiveNav,
} from '@/lib/hub/navigation.mjs';

describe('Hub navigation contract', () => {
  it('keeps the agreed canonical route order', () => {
    expect(HUB_MODULES.map(({ id, href }) => [id, href])).toEqual([
      ['home', '/'],
      ['finance', '/finance/portfolio'],
      ['youtube', '/youtube'],
      ['projects', '/projects'],
      ['about', '/about'],
    ]);
  });

  it.each([
    ['/', 'home'],
    ['/finance/portfolio', 'finance'],
    ['/finance/portfolio/history', 'finance'],
    ['/youtube', 'youtube'],
    ['/projects', 'more'],
    ['/about', 'more'],
  ])('resolves %s to %s', (pathname, expected) => {
    expect(resolveActiveNav(pathname)).toBe(expected);
  });

  it('maps both legacy routes to canonical destinations', () => {
    expect(LEGACY_ROUTES).toEqual({
      '/portfolio-tracker': '/finance/portfolio',
      '/youtube-tracker': '/youtube',
    });
  });

  it('contains no public finance value fields', () => {
    const finance = HUB_MODULES.find(({ id }) => id === 'finance');
    expect(finance).toMatchObject({ status: 'LOCKED', privacy: 'private' });
    expect(finance).not.toHaveProperty('value');
    expect(finance).not.toHaveProperty('performance');
  });
});
```

- [ ] **Step 4: Run the test and verify RED**

Run:

```powershell
rtk npm test -- tests/hub/navigation.test.jsx
```

Expected: FAIL because `lib/hub/navigation.mjs` does not exist.

- [ ] **Step 5: Implement the minimal route registry**

Create `lib/hub/navigation.mjs`:

```js
export const HUB_MODULES = Object.freeze([
  { id: 'home', number: '00', label: 'Home', href: '/', status: 'ONLINE' },
  {
    id: 'finance',
    number: '01',
    label: 'Finance',
    href: '/finance/portfolio',
    status: 'LOCKED',
    privacy: 'private',
  },
  { id: 'youtube', number: '02', label: 'YouTube', href: '/youtube', status: 'SYNC' },
  { id: 'projects', number: '03', label: 'Projects', href: '/projects', status: 'LIVE' },
  { id: 'about', number: '04', label: 'About', href: '/about', status: 'PROFILE' },
]);

export const LEGACY_ROUTES = Object.freeze({
  '/portfolio-tracker': '/finance/portfolio',
  '/youtube-tracker': '/youtube',
});

export function resolveActiveNav(pathname = '/') {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/finance/portfolio')) return 'finance';
  if (pathname.startsWith('/youtube')) return 'youtube';
  if (pathname.startsWith('/projects') || pathname.startsWith('/about')) return 'more';
  return null;
}
```

- [ ] **Step 6: Run tests and verify GREEN**

Run: `rtk npm test -- tests/hub/navigation.test.jsx`  
Expected: 4 tests pass.

- [ ] **Step 7: Commit the route contract**

```powershell
rtk git add package.json package-lock.json vitest.config.mjs tests/setup.js tests/hub/navigation.test.jsx lib/hub/navigation.mjs
rtk git commit -m "test: define personal hub route contract"
```

---

### Task 2: Build accessible shared navigation test-first

**Files:**
- Modify: `tests/hub/navigation.test.jsx`
- Create: `components/hub/HubNavigation.jsx`
- Create: `components/hub/HubShell.jsx`
- Create: `app/hub.css`
- Modify: `app/layout.jsx`

- [ ] **Step 1: Add failing interaction tests**

Extend `tests/hub/navigation.test.jsx` with React Testing Library imports, mock `usePathname()` as `/finance/portfolio`, render `HubNavigation`, and assert through the mobile navigation landmark so duplicate desktop/mobile labels remain unambiguous:

```jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HubNavigation from '@/components/hub/HubNavigation';

const user = userEvent.setup();
render(<HubNavigation />);
const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i });
expect(within(mobileNav).getByRole('link', { name: /finance/i })).toHaveAttribute('aria-current', 'page');
const moreTrigger = within(mobileNav).getByRole('button', { name: /open more navigation/i });
expect(moreTrigger).toBeVisible();
await user.click(moreTrigger);
expect(screen.getByRole('dialog', { name: /more navigation/i })).toBeVisible();
expect(screen.getByRole('link', { name: /projects/i })).toHaveAttribute('href', '/projects');
await user.keyboard('{Escape}');
expect(screen.queryByRole('dialog', { name: /more navigation/i })).not.toBeInTheDocument();
expect(moreTrigger).toHaveFocus();
```

Mock only `next/navigation`:

```jsx
vi.mock('next/navigation', () => ({ usePathname: () => '/finance/portfolio' }));
```

- [ ] **Step 2: Run the interaction test and verify RED**

Run: `rtk npm test -- tests/hub/navigation.test.jsx`  
Expected: FAIL because `HubNavigation` is missing.

- [ ] **Step 3: Implement `HubNavigation` and `HubShell`**

`HubNavigation.jsx` must:

```jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Home, Menu, WalletCards, X, Youtube } from 'lucide-react';
import { HUB_MODULES, resolveActiveNav } from '@/lib/hub/navigation.mjs';
import { usePathname } from 'next/navigation';

const primary = HUB_MODULES.filter(({ id }) => ['home', 'finance', 'youtube'].includes(id));
const secondary = HUB_MODULES.filter(({ id }) => ['projects', 'about'].includes(id));
const icons = { home: Home, finance: WalletCards, youtube: Youtube };

export default function HubNavigation() {
  const pathname = usePathname();
  const active = resolveActiveNav(pathname);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <>
      <header className="hub-header">
        <Link className="hub-brand" href="/">FD_OS</Link>
        <nav className="hub-desktop-nav" aria-label="Primary navigation">
          {HUB_MODULES.map((item) => (
            <Link key={item.id} href={item.href} aria-current={active === item.id || pathname === item.href ? 'page' : undefined}>
              {item.number} / {item.label}
            </Link>
          ))}
        </nav>
        <span className="hub-system-status"><i /> ALL SYSTEMS ONLINE</span>
      </header>

      <nav className="hub-mobile-dock" aria-label="Mobile navigation">
        {primary.map((item) => {
          const Icon = icons[item.id];
          return <Link key={item.id} href={item.href} aria-current={active === item.id ? 'page' : undefined}><Icon /><span>{item.label}</span></Link>;
        })}
        <button ref={triggerRef} type="button" aria-label="Open more navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu /><span>More</span></button>
      </nav>

      {open && (
        <div className="hub-sheet-backdrop" onMouseDown={() => setOpen(false)}>
          <section className="hub-more-sheet" role="dialog" aria-modal="true" aria-label="More navigation" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Close more navigation" onClick={() => setOpen(false)}><X /></button>
            {secondary.map((item) => <Link key={item.id} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
            <a href="https://github.com/faustroz" target="_blank" rel="noreferrer">GitHub</a>
            <a href="mailto:ferdydiatmika171@gmail.com">Email</a>
          </section>
        </div>
      )}
    </>
  );
}
```

`HubShell.jsx` renders `HubNavigation`, its children, and a status strip. Import `app/hub.css` from `app/layout.jsx`, switch the existing Google Inter usage to the bundled Geist local fonts, wrap `{children}` in `HubShell`, and remove `FooterConditional`.

- [ ] **Step 4: Add Night Operations shell styling**

In `app/hub.css`, define the approved color tokens, 64px desktop header, hidden mobile dock above 767px, persistent four-item dock below 768px, safe-area padding, sheet/backdrop states, visible `:focus-visible`, and reduced-motion overrides. Specialist routes receive the shared navigation without changing their internal component selectors.

- [ ] **Step 5: Run tests and build**

Run:

```powershell
rtk npm test -- tests/hub/navigation.test.jsx
rtk npm run build
```

Expected: navigation tests pass and static export completes.

- [ ] **Step 6: Commit the shared shell**

```powershell
rtk git add app/layout.jsx app/hub.css components/hub/HubNavigation.jsx components/hub/HubShell.jsx tests/hub/navigation.test.jsx
rtk git rm components/FooterConditional.jsx
rtk git commit -m "feat: add shared personal hub navigation"
```

---

### Task 3: Implement privacy-safe dashboard summaries

**Files:**
- Create: `tests/hub/youtube-summary.test.mjs`
- Create: `lib/hub/youtube-summary.mjs`
- Create: `components/hub/ModuleCard.jsx`
- Create: `components/hub/YouTubeSummaryCard.jsx`
- Create: `tests/hub/dashboard.test.jsx`
- Modify: `app/page.jsx`

- [ ] **Step 1: Write failing YouTube normalizer tests**

Test these exact outcomes:

```js
expect(normalizeYoutubeSummary({ settings: { channel_name: 'Ferdy' }, daily: { total_subscribers: 1200, views: 34000 } })).toEqual({ state: 'available', channelName: 'Ferdy', subscribers: 1200, views: 34000 });
expect(normalizeYoutubeSummary({ settings: null, daily: null })).toEqual({ state: 'empty', channelName: 'CHANNEL NOT SET', subscribers: 0, views: 0 });
expect(normalizeYoutubeSummary({ error: new Error('offline') })).toEqual({ state: 'unavailable', channelName: 'UNAVAILABLE', subscribers: null, views: null });
```

- [ ] **Step 2: Run the normalizer test and verify RED**

Run: `rtk npm test -- tests/hub/youtube-summary.test.mjs`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement `normalizeYoutubeSummary`**

Create `lib/hub/youtube-summary.mjs` as a pure function returning only the three state shapes asserted above:

```js
export function normalizeYoutubeSummary({ settings = null, daily = null, error = null } = {}) {
  if (error) {
    return {
      state: 'unavailable',
      channelName: 'UNAVAILABLE',
      subscribers: null,
      views: null,
    };
  }

  if (!settings && !daily) {
    return {
      state: 'empty',
      channelName: 'CHANNEL NOT SET',
      subscribers: 0,
      views: 0,
    };
  }

  return {
    state: 'available',
    channelName: settings?.channel_name || 'CHANNEL NOT SET',
    subscribers: daily?.total_subscribers || 0,
    views: daily?.views || 0,
  };
}
```

Do not include an API key or finance data.

- [ ] **Step 4: Run the normalizer test and verify GREEN**

Run: `rtk npm test -- tests/hub/youtube-summary.test.mjs`  
Expected: 3 tests pass.

- [ ] **Step 5: Write failing dashboard component tests**

Render the root dashboard with `YouTubeSummaryCard` mocked to a stable summary. Assert visible Home, Finance, YouTube, Projects, and About modules; assert Finance displays `LOCKED`; assert no `Rp`, net-worth label, holding, or performance percentage appears in the Finance card.

- [ ] **Step 6: Run the dashboard test and verify RED**

Run: `rtk npm test -- tests/hub/dashboard.test.jsx`  
Expected: FAIL because the current root still renders Hero/About/Portfolio.

- [ ] **Step 7: Implement the dashboard**

`ModuleCard` accepts only `number`, `label`, `status`, `href`, `title`, `description`, and `variant`. `FinanceLockedCard` is rendered through `ModuleCard` with static `LOCKED` copy. `YouTubeSummaryCard` creates a Supabase client only when both public env values exist, selects `channel_name` and the latest daily row, normalizes the result, and always preserves its `/youtube` link.

Replace `app/page.jsx` with the Night Operations composition: system greeting, Focus panel, Finance locked card, YouTube summary, Projects card, About card, and status strip. Do not import `lib/portfolio/storage.js` from any Hub file.

- [ ] **Step 8: Run dashboard tests and build**

Run:

```powershell
rtk npm test -- tests/hub/dashboard.test.jsx tests/hub/youtube-summary.test.mjs
rtk npm run build
```

Expected: all summary/dashboard tests pass and `/` is statically generated.

- [ ] **Step 9: Commit the dashboard**

```powershell
rtk git add app/page.jsx components/hub/ModuleCard.jsx components/hub/YouTubeSummaryCard.jsx lib/hub/youtube-summary.mjs tests/hub/dashboard.test.jsx tests/hub/youtube-summary.test.mjs app/hub.css
rtk git commit -m "feat: build privacy-first personal dashboard"
```

---

### Task 4: Move specialist modules and preserve legacy URLs

**Files:**
- Move: `app/portfolio-tracker/*` → `app/finance/portfolio/*`
- Move: `app/youtube-tracker/*` → `app/youtube/*`
- Create: `components/hub/LegacyRedirect.jsx`
- Create: `app/portfolio-tracker/page.jsx`
- Create: `app/youtube-tracker/page.jsx`
- Create: `tests/hub/legacy-redirect.test.jsx`

- [ ] **Step 1: Write the failing redirect behavior test**

Mock `useRouter()` with a `replace` spy. Render:

```jsx
<LegacyRedirect from="/portfolio-tracker" />
```

Assert `replace('/finance/portfolio')` is called and the fallback link has `href="/finance/portfolio"`. Repeat for `/youtube-tracker` → `/youtube`.

- [ ] **Step 2: Run the redirect test and verify RED**

Run: `rtk npm test -- tests/hub/legacy-redirect.test.jsx`  
Expected: FAIL because `LegacyRedirect` does not exist.

- [ ] **Step 3: Move the canonical route directories**

Verify both source directories resolve inside the repository, then use `git mv` for each file into `app/finance/portfolio` and `app/youtube`. Keep filenames and module internals unchanged.

- [ ] **Step 4: Implement the compatibility component and pages**

`LegacyRedirect` reads `LEGACY_ROUTES[from]`, calls `router.replace(destination)` in `useEffect`, and renders:

```jsx
<main className="hub-legacy-redirect">
  <p>Moving this module to its new route.</p>
  <Link href={destination}>Continue to {destination}</Link>
</main>
```

Each old route page passes its own legacy pathname. Do not recreate old route-specific layouts or styles.

- [ ] **Step 5: Run redirect and route tests**

Run:

```powershell
rtk npm test -- tests/hub/legacy-redirect.test.jsx tests/hub/navigation.test.jsx
rtk npm run build
```

Expected: tests pass and static output contains HTML for `/finance/portfolio`, `/youtube`, and both legacy routes.

- [ ] **Step 6: Commit the route migration**

```powershell
rtk git add app/finance app/youtube app/portfolio-tracker app/youtube-tracker components/hub/LegacyRedirect.jsx tests/hub/legacy-redirect.test.jsx
rtk git commit -m "refactor: move trackers into personal hub routes"
```

---

### Task 5: Add canonical Projects and About pages

**Files:**
- Create: `lib/hub/content.mjs`
- Create: `app/projects/page.jsx`
- Create: `app/about/page.jsx`
- Modify: `tests/hub/dashboard.test.jsx`
- Remove: `components/portfolio.jsx`
- Remove: `components/about.jsx`
- Modify: `app/hub.css`

- [ ] **Step 1: Add failing content reuse tests**

Assert the content registry exports five named projects (`Clipra`, `Confluo`, `Invopajak`, `Portlio`, `Yomu`), four existing skill areas, the GitHub URL, Instagram URL, email link, and a non-empty current focus string. Assert each project has `name`, `tag`, `description`, `href`, `image`, and `imageClass`.

- [ ] **Step 2: Run the content tests and verify RED**

Run: `rtk npm test -- tests/hub/dashboard.test.jsx`  
Expected: FAIL because `lib/hub/content.mjs` and canonical content pages are missing.

- [ ] **Step 3: Implement the content registry and pages**

Move the current project and skill copy verbatim into `lib/hub/content.mjs`, preserving all existing URLs and images. `/projects` renders the five projects as Night Operations records with image previews and safe external-link attributes. `/about` renders profile copy, four skill areas, and contact links. Both pages use the shared Hub shell automatically.

- [ ] **Step 4: Run tests and build**

Run:

```powershell
rtk npm test -- tests/hub/dashboard.test.jsx
rtk npm run build
```

Expected: tests pass and `/projects` plus `/about` are statically generated.

- [ ] **Step 5: Remove superseded landing components and commit**

```powershell
rtk git rm components/portfolio.jsx components/about.jsx components/hero.jsx
rtk git add lib/hub/content.mjs app/projects/page.jsx app/about/page.jsx app/hub.css tests/hub/dashboard.test.jsx
rtk git commit -m "feat: add project and profile hub modules"
```

---

### Task 6: Complete responsive integration and documentation

**Files:**
- Modify: `app/hub.css`
- Modify: `app/finance/portfolio/portfolio.css`
- Modify: `README.md`

- [ ] **Step 1: Add integration-safe spacing**

Add mobile bottom padding to the Finance root container so its actions do not sit behind `MobileDock`. Keep all existing `.pt-*` declarations and values intact except the required safe-area spacing. Verify the YouTube route has equivalent clearance through the shared shell.

- [ ] **Step 2: Complete accessibility and responsive CSS**

Confirm the stylesheet contains:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media (max-width: 767px) {
  .hub-page { padding-bottom: calc(6.5rem + env(safe-area-inset-bottom)); }
  .pt-app { padding-bottom: calc(6.5rem + env(safe-area-inset-bottom)); }
}
```

Every interactive element must have a visible `:focus-visible` state with sufficient contrast.

- [ ] **Step 3: Update README architecture and route documentation**

Document `/`, `/finance/portfolio`, `/youtube`, `/projects`, `/about`, the legacy compatibility routes, Hub components, and the correct deployment workflow `.github/workflows/nextjs.yml`.

- [ ] **Step 4: Run the full automated verification**

Run:

```powershell
rtk npm test
rtk npm run build
rtk git diff --check
```

Expected: all tests pass, the static export succeeds, and diff check returns no errors.

- [ ] **Step 5: Perform browser regression checks**

Start the local site and verify at 390×844, 768×1024, and 1440×900:

- root hierarchy and Night Operations reveal;
- dock reachability and no covered controls;
- More opens, closes by Escape/backdrop, and restores focus;
- active navigation across all canonical routes;
- Finance login, add/edit/delete transaction, charts, export/import entry points, and logout;
- YouTube available or unavailable state without a root crash;
- legacy URLs replace to their canonical destinations;
- Projects/About keyboard navigation and external-link behavior.

- [ ] **Step 6: Commit final integration**

```powershell
rtk git add app/hub.css app/finance/portfolio/portfolio.css README.md
rtk git commit -m "docs: finalize personal hub integration"
```

---

## Final acceptance checklist

- [ ] Root is a hybrid Night Operations dashboard.
- [ ] Finance is canonical at `/finance/portfolio` and retains its existing behavior.
- [ ] Root performs no portfolio Supabase query and displays no finance value.
- [ ] YouTube is canonical at `/youtube` with a bounded summary fallback.
- [ ] Projects and About have canonical routes and shared source content.
- [ ] Desktop header and mobile bottom dock resolve active routes correctly.
- [ ] More sheet is keyboard accessible and restores focus.
- [ ] Both legacy routes remain usable in the static export.
- [ ] Automated tests, static build, diff check, and responsive browser checks pass.
