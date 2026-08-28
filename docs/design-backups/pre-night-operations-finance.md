# Pre–Night Operations Design Backup

The previous Personal Hub and Portfolio Tracker design is preserved in Git commit:

```text
8e0cfd0 feat: finalize personal hub integration
```

This commit contains the complete pre-redesign source for:

- `app/finance/portfolio/portfolio.css`
- `app/finance/portfolio/layout.jsx`
- `components/portfolio/`
- `components/hub/`
- `app/projects/page.jsx`
- `app/about/page.jsx`
- `app/hub.css`

Inspect a backed-up file without changing the working tree:

```bash
git show 8e0cfd0:app/finance/portfolio/portfolio.css
```

Restore one backed-up file when Git writes are available:

```bash
git restore --source=8e0cfd0 -- app/finance/portfolio/portfolio.css
```

The public landing page at `/` is intentionally excluded from the Night Operations redesign.
