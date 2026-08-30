# Apple Shortcuts: Quick Expense (Back Tap)

This Shortcut sends a single expense to the private 4allx Finance system. It uses a revocable, device-scoped API key—not the Supabase service-role key and not your Supabase password.

## One-time Supabase setup

1. In Supabase SQL Editor, run `supabase/migrations/014-quick-expense-api.sql`, then `supabase/migrations/015-expense-account-linking.sql`.
2. Deploy the function from the repository root:

   ```bash
   supabase functions deploy quick-expense --no-verify-jwt
   ```

3. `supabase/config.toml` records that this function does not use gateway JWT verification because an iPhone cannot safely keep a short-lived user session current. The handler itself authenticates the device key before every write. Supabase automatically provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions. Do not add these secrets to Shortcuts.
4. Issue the device key once with a currently signed-in 4allx user JWT. In Supabase Dashboard → Edge Functions → `quick-expense` → Invoke, send this JSON and include `Authorization: Bearer <your-user-access-token>`:

   ```json
   { "action": "issue_key", "label": "Ferdy iPhone Back Tap" }
   ```

   Copy the returned `key` immediately. It is never stored in readable form. If the phone is lost, call the same function with `{ "action": "revoke_key", "key_id": "<returned-key_id>" }` using your signed-in user JWT.

## Build the iPhone Shortcut

1. Open **Shortcuts** → **+** → rename it **Quick Expense**.
2. Add **Choose from Menu**. Add one menu item for each expense category: `Transport`, `Makanan & Minuman`, `Date Night`, and `Laundry`.
3. Inside every category branch, add **Set Variable**: name it `Category`, value equal to that branch's category text.
4. Add **Ask for Input** → prompt `Item Name` → input type **Text**. Set Variable `Item Name` to the result.
5. Add **Ask for Input** → prompt `Amount` → input type **Number**. Set Variable `Amount` to the result.
6. Add another **Choose from Menu**. Add one menu item for each bank/provider: `BNI`, `MANDIRI`, `JAGO`, and `CASH`. Inside each branch, **Set Variable** `Account` to that provider text.
7. Add **Current Date**. Then add **Format Date** → format **ISO 8601**. Set Variable `Device Timestamp` to the formatted result. This is the iPhone's local timestamp and is used for `spent_on` automatically.
   
   The Shortcut selects `bank_accounts.bank_name` (the provider); the function resolves the matching internal account name so the existing balance trigger remains correct.
8. Add **Dictionary** with these entries:

   | Key | Value |
   | --- | --- |
   | `title` | `Item Name` variable |
   | `category` | `Category` variable |
   | `amount` | `Amount` variable |
   | `account` | `Account` variable |
   | `device_timestamp` | `Device Timestamp` variable |

9. Add **Get Contents of URL**:
   - URL: `https://<your-project-ref>.supabase.co/functions/v1/quick-expense`
   - Method: `POST`
   - Request Body: `JSON`
   - JSON: the Dictionary from the prior step
   - Headers:
     - `x-quick-expense-key`: the `key` returned during setup
     - `Content-Type`: `application/json`
10. Add **Get Dictionary Value** from the response using key `expense`, then **Show Notification**: `Expense saved`.
11. Map it in iPhone **Settings → Accessibility → Touch → Back Tap → Double Tap → Quick Expense**.

The resulting flow is: **Double Back Tap → Category → Item Name → Amount → Account → automatic device date/time → Save**.

## Request JSON

```json
{
  "title": "Kopi pagi",
  "category": "Makanan & Minuman",
  "amount": 25000,
  "account": "JAGO",
  "device_timestamp": "2026-08-30T14:30:00+07:00"
}
```

`category` must be an existing expense/both category (or `General`). `account` is matched to the owned bank/provider value in `bank_accounts.bank_name`; the backend then records the exact `bank_account_id` and debits that one account atomically. Invalid, revoked, expired, replayed, or foreign values are rejected.
