# Phone Lookup provider setup

The Phone Lookup module is private to authenticated 4allx users. It supports one-at-a-time Profile, Tags, and Quota requests and never persists lookup results or searched phone numbers.

## Deploy

1. If it has not already been applied, run `supabase/migrations/018-phone-lookup-rate-limit.sql` in Supabase SQL Editor.
2. Set the Vercel proxy token in Supabase only:

   ```bash
   supabase secrets set GETCONTACT_PROXY_TOKEN='YOUR_VERCEL_PROXY_TOKEN'
   ```

3. Deploy:

   ```bash
   supabase functions deploy phone-lookup
   ```

## Proxy contract

The server-side function sends a JSON `POST` to `https://4allx-getcontact-proxy.vercel.app/api/lookup` with one of:

```json
{ "action": "profile", "phone": "+628123456789" }
```

```json
{ "action": "tags", "phone": "+628123456789" }
```

```json
{ "action": "quota" }
```

Every request also includes this server-side header:

```http
X-Proxy-Token: <GETCONTACT_PROXY_TOKEN>
```

The Vercel proxy owns the adapter URL, virtual host, and adapter token. The function normalizes only safe result fields (`displayName`, `tagCount`, `email`, tags, and quota); no provider token, proxy token, mobile device credential, encryption material, or signing data is sent to the frontend.
