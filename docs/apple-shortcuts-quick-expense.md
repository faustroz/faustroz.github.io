# Apple Shortcuts: Quick Expense (Back Tap)

This Shortcut sends a single expense to the private 4allx Finance system. It uses a revocable, device-scoped API key—not the Supabase service-role key and not your Supabase password.

## One-time Supabase setup

1. In Supabase SQL Editor, run `supabase/migrations/014-quick-expense-api.sql`.
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
2. Add **Choose from Menu**. Add one menu item for each existing expense category, for example `Food`, `Transport`, and `General`.
3. Inside every category branch, add **Set Variable**: name it `Category`, value equal to that branch's category text.
4. After the menu, add **Ask for Input** → prompt `Amount` → input type **Number**. Set Variable `Amount` to the result.
5. Add another **Choose from Menu**. Add one menu item for each existing bank account name. Inside each branch, **Set Variable** `Account` to that account name.
6. Add **Current Date**. Then add **Format Date** → format **ISO 8601**. Set Variable `Device Timestamp` to the formatted result. This is the iPhone's local timestamp and is used for `spent_on` automatically.
7. Add **Dictionary** with these entries:

   | Key | Value |
   | --- | --- |
   | `category` | `Category` variable |
   | `amount` | `Amount` variable |
   | `account` | `Account` variable |
   | `device_timestamp` | `Device Timestamp` variable |

8. Add **Get Contents of URL**:
   - URL: `https://<your-project-ref>.supabase.co/functions/v1/quick-expense`
   - Method: `POST`
   - Request Body: `JSON`
   - JSON: the Dictionary from the prior step
   - Headers:
     - `x-quick-expense-key`: the `key` returned during setup
     - `Content-Type`: `application/json`
9. Add **Get Dictionary Value** from the response using key `expense`, then **Show Notification**: `Expense saved`.
10. Open the Shortcut details → enable **Use with Back Tap** if shown, or map it in iPhone **Settings → Accessibility → Touch → Back Tap → Double Tap → Quick Expense**.

The resulting flow is: **Double Tap → Category → Amount → Account → Save**.

## Request JSON

```json
{
  "category": "Food",
  "amount": 25000,
  "account": "BCA",
  "device_timestamp": "2026-08-30T14:30:00+07:00"
}
```

`category` must be an existing expense/both category (or `General`), and `account` must be an existing bank account owned by the key's user. Invalid, revoked, expired, or foreign values are rejected.
