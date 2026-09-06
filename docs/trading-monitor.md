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

When the trading service is ready to protect `/metrics`, configure it to require
an `Authorization: Bearer` header and set the same value as
`TRADING_MONITOR_TOKEN` in Supabase. The existing Edge Function sends that
header only server-side; it never uses a query-string credential and never
returns or logs the secret. Until that paired upstream change exists, leave the
secret unset. If upstream authentication is enabled without the matching
Supabase secret, the request fails closed as an unavailable monitor.

## Current-health contract

When `/metrics` provides `currentHealth`, it is the authoritative source for
the monitor's ONLINE/DEGRADED state. The proxy returns only these boolean
fields: `ready`, `providerReady`, `marketDataFresh`, `financialStateReady`,
`recoveryComplete`, `orchestratorReady`, `entryPermission`, plus optional
`databaseReady` and `reconciliationReady`. Historical counters remain telemetry
only. During rollout, metrics without `currentHealth` retain the legacy
classifier. A malformed `currentHealth` response is rejected rather than shown
as ONLINE.

## Deploy

```bash
supabase functions deploy trading-monitor
```

No database migration is required. Do not add either server-side secret to `.env`, `.env.example`, rendered HTML, or any `NEXT_PUBLIC_*` variable.
