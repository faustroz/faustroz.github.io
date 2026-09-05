# Personal Hub Edge Functions

Deploy `integrations` and `notifications` with the Supabase CLI. Set the GitHub secret in Supabase only; do not place it in `.env` with a `NEXT_PUBLIC_` prefix. AI provider integration is intentionally deferred.

`integrations` accepts an authenticated user token and returns provider configuration status only. Complete OAuth callback hosting/configuration before enabling provider data sync.

`notifications` is a service-role cron endpoint. Set `CRON_SECRET`, then schedule it through Supabase Cron or an external scheduler with the matching `x-cron-secret` header.

`phone-lookup` requires a signed-in Hub user and applies a server-side limit of five requests per action per 15-minute window. Set only `GETCONTACT_ADAPTER_URL` and `GETCONTACT_ADAPTER_TOKEN` in Supabase secrets; the browser never receives either value. The adapter is intentionally provider-agnostic and does not emulate a private mobile API.

`trading-monitor` is an authenticated, read-only proxy for the separately deployed trading system metrics endpoint. Set `TRADING_MONITOR_URL` to the complete upstream `/metrics` URL. Optionally set `TRADING_MONITOR_TOKEN`; when present, the function sends it upstream as a Bearer token. Neither value belongs in a frontend `.env` file or a `NEXT_PUBLIC_*` variable.
