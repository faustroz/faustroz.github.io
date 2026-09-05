# Apple Shortcuts: Quick Expense and Quick Income

The existing `quick-expense` Edge Function accepts both Expense and Income transactions. It uses the same revocable, device-scoped key; the Shortcut never contains a Supabase password or service-role key.

Existing Quick Expense Shortcuts remain compatible. A request without `type` is treated as `expense` and retains the previous response shape and behavior.

## Supabase setup

For an existing installation, run only the new migration, then redeploy the function:

```bash
supabase db push
supabase functions deploy quick-expense --no-verify-jwt
```

The required migration order for a fresh project is:

1. `014-quick-expense-api.sql`
2. `015-expense-account-linking.sql`
3. `017-income-account-provider-filter.sql`
4. `025-quick-income-api.sql`

The function authenticates the device key internally because the iPhone Shortcut does not maintain a Supabase user JWT. Supabase keeps `SUPABASE_SERVICE_ROLE_KEY` server-side.

## Issue or revoke a device key

Using a currently authenticated Personal Hub user JWT, invoke the function with:

```json
{
  "action": "issue_key",
  "label": "Ferdy iPhone Back Tap"
}
```

Copy the returned `key` once. Only its SHA-256 hash is stored. To revoke it, invoke the same function with an authenticated user JWT:

```json
{
  "action": "revoke_key",
  "key_id": "<returned-key_id>"
}
```

## Recommended combined Shortcut

1. Add **Choose from Menu** with `Expense` and `Income`.
2. In each branch, set variable `Transaction Type` to lowercase `expense` or `income`.
3. Choose a category from the matching Finance categories:
   - Expense accepts categories whose kind is `expense` or `both`.
   - Income accepts categories whose kind is `income` or `both`.
4. Ask for `Item Name` using Text input.
5. Ask for `Amount` using Number input.
6. Choose the account provider, for example `BNI`, `MANDIRI`, `JAGO`, or `CASH`, and save it as `Account`.
7. Add **Current Date**, then **Format Date** using ISO 8601. Save it as `Device Timestamp`.
8. Add a **Dictionary** containing `type`, `title`, `category`, `amount`, `account`, and `device_timestamp`.
9. Add **Get Contents of URL**:
   - URL: `https://<project-ref>.supabase.co/functions/v1/quick-expense`
   - Method: `POST`
   - Request Body: `JSON`
   - Header `x-quick-expense-key`: the issued device key
   - Header `Content-Type`: `application/json`
10. Show a success notification based on the selected transaction type.
11. Assign the Shortcut in **Settings → Accessibility → Touch → Back Tap**.

The flow becomes: **Back Tap → Expense/Income → Category → Item Name → Amount → Account → automatic device date/time → Save**.

## Exact Expense JSON

New combined Shortcut:

```json
{
  "type": "expense",
  "title": "Kopi pagi",
  "category": "Makanan & Minuman",
  "amount": 25000,
  "account": "JAGO",
  "device_timestamp": "2026-09-05T08:15:00+07:00"
}
```

The existing legacy payload remains valid and behaves identically:

```json
{
  "title": "Kopi pagi",
  "category": "Makanan & Minuman",
  "amount": 25000,
  "account": "JAGO",
  "device_timestamp": "2026-09-05T08:15:00+07:00"
}
```

Successful Expense response:

```json
{
  "expense": { "id": "..." }
}
```

## Exact Income JSON

```json
{
  "type": "income",
  "title": "Freelance payment",
  "category": "Freelance",
  "amount": 1500000,
  "account": "JAGO",
  "device_timestamp": "2026-09-05T10:30:00+07:00"
}
```

Successful Income response:

```json
{
  "income": { "id": "..." }
}
```

`account` is matched only against the authenticated owner's `bank_accounts.bank_name`. The backend then uses the exact `bank_account_id`. The existing Finance triggers debit Expense and credit Income inside the same transaction. Invalid, revoked, expired, replayed, ambiguous, or foreign account values are rejected.
