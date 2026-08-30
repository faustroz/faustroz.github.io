# Phone Lookup provider setup

The Phone Lookup module is private to authenticated 4allx users. It supports one-at-a-time Profile, Tags, and Quota requests and never persists lookup results or searched phone numbers.

## Deploy

1. If it has not already been applied, run `supabase/migrations/018-phone-lookup-rate-limit.sql` in Supabase SQL Editor.
2. Set the deployed adapter URL and its access token in Supabase only:

   ```bash
   supabase secrets set GETCONTACT_ADAPTER_URL=http://194.15.36.113/cgi-bin/lookup.py
   supabase secrets set GETCONTACT_ADAPTER_TOKEN='YOUR_GETCONTACT_ADAPTER_TOKEN'
   ```

3. Deploy:

   ```bash
   supabase functions deploy phone-lookup
   ```

## Adapter contract

The server-side adapter sends a JSON `POST` to `GETCONTACT_ADAPTER_URL` with one of:

```json
{ "action": "profile", "phone": "+628123456789" }
```

```json
{ "action": "tags", "phone": "+628123456789" }
```

```json
{ "action": "quota" }
```

Every request also includes these server-side headers:

```http
X-Adapter-Token: <GETCONTACT_ADAPTER_TOKEN>
Host: lookup4allx.anjas.id
```

The adapter normalizes only safe result fields (`displayName`, `tagCount`, `email`, tags, and quota); no provider token, mobile device credential, encryption material, or signing data is sent to the frontend.
