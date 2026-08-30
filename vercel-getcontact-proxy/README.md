# GetContact Vercel proxy

This isolated Vercel project accepts authenticated JSON `POST` requests at `/api/lookup` and forwards their bytes unchanged to the existing shared-IP adapter. It does not change the Supabase Edge Function or the ANJAS adapter.

## Deploy

1. Import this repository into Vercel.
2. Set the Vercel project **Root Directory** to `vercel-getcontact-proxy`.
3. Name the project `4allx-getcontact-proxy`.
4. Add the environment variables below for Production (and Preview if you use Preview deployments).
5. Deploy. The production endpoint will be `https://4allx-getcontact-proxy.vercel.app/api/lookup`.

## Required environment variables

- `GETCONTACT_ADAPTER_TOKEN`: the token accepted by the shared-IP adapter.
- `PROXY_TOKEN`: a separate, high-entropy secret required from callers in `X-Proxy-Token`.

## Request contract

```bash
curl --request POST 'https://4allx-getcontact-proxy.vercel.app/api/lookup' \
  --header 'Content-Type: application/json' \
  --header 'X-Proxy-Token: YOUR_PROXY_TOKEN' \
  --data '{"action":"quota"}'
```

The proxy sends the upstream request with `Host: lookup4allx.anjas.id`, the server-only `X-Adapter-Token`, and `Content-Type: application/json`. It never caches response data or logs either secret.
