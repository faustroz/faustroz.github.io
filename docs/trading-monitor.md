# Trading System monitor

The private `/trading` route and Home summary call the authenticated Supabase Edge Function `trading-monitor`. The browser never calls Raznar directly.

## Required Supabase secret

```bash
supabase secrets set TRADING_MONITOR_URL="<complete-metrics-endpoint-url>"
```

## Optional future upstream authentication

Only set this after the separate trading system requires a Bearer token:

```bash
supabase secrets set TRADING_MONITOR_TOKEN="<upstream-bearer-token>"
```

## Deploy

```bash
supabase functions deploy trading-monitor
```

No database migration is required. Do not add either server-side secret to `.env`, `.env.example`, rendered HTML, or any `NEXT_PUBLIC_*` variable.
