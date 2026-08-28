# Personal Hub Edge Functions

Deploy `integrations` and `notifications` with the Supabase CLI. Set GitHub and Google secrets in Supabase only; do not place them in `.env` with a `NEXT_PUBLIC_` prefix. AI provider integration is intentionally deferred.

`integrations` accepts an authenticated user token and returns provider configuration status only. Complete OAuth callback hosting/configuration before enabling provider data sync.

`notifications` is a service-role cron endpoint. Set `CRON_SECRET`, then schedule it through Supabase Cron or an external scheduler with the matching `x-cron-secret` header.
