# Supabase migrations

These SQL files define the Supabase database for 4allx. Run them in ascending numerical order in the Supabase SQL Editor.

> Existing project: do not rerun migrations that have already been applied unless the script is explicitly idempotent and you intend to refresh its functions, triggers, or policies. Run only the migrations that are missing from your database.

| Order | File | Purpose | Prerequisite |
| --- | --- | --- | --- |
| 000 | `000-portfolio-tracker.sql` | Portfolio Tracker storage, update trigger, and authenticated RLS | Supabase Auth enabled |
| 004 | `004-private-modules.sql` | Core Finance/settings plus owner-scoped legacy compatibility tables | 000 |
| 008 | `008-private-operations.sql` | Document Vault, integration metadata, notifications, and private Storage bucket | 004 |
| 009 | `009-finance-accounts.sql` | Bank accounts and expense account attribution | 004 |
| 010 | `010-finance-income-categories.sql` | Income ledger and custom finance categories | 009 |
| 011 | `011-finance-balance-sync.sql` | Income/expense balance synchronization triggers | 009, 010 |
| 012 | `012-academic-goals-trash.sql` | Academic records, financial goals, and 30-day recovery | 004 |
| 013 | `013-academic-block-grading.sql` | Block component scoring and automatic grade/IP calculation | 012 |
| 014 | `014-quick-expense-api.sql` | Revocable iPhone Quick Expense API keys | 009, 010 |
| 015 | `015-expense-account-linking.sql` | Exact account links, atomic Quick Expense writes, replay protection | 011, 012, 014 |
| 016 | `016-cashflow-soft-delete-balance.sql` | Correct balance reversal on delete and restore | 012, 015 |
| 017 | `017-income-account-provider-filter.sql` | Exact Income account links and provider-level Finance filters | 015, 016 |
| 018 | `018-phone-lookup-rate-limit.sql` | Phone Lookup server-side quota enforcement | Supabase Auth |
| 019 | `019-vault-folders.sql` | Owner-private persistent Document Vault folders | 008 |
| 020 | `020-cashflow-trash-permanent-delete.sql` | Prevent double balance refunds when permanently deleting Trash cashflow records | 016 |
| 021 | `021-phone-lookup-practical-rate-limits.sql` | Per-action practical Phone Lookup limits and stale-window cleanup | 018 |
| 022 | `022-vault-drive-structure.sql` | Nested Vault folders and owner-safe document links | 019 |
| 023 | `023-global-search-portfolio-owner.sql` | Vault content search projection and owner-scoped Portfolio keys/RLS | 022 |

## Safety notes

- Enable Supabase Email Auth and create the account before using the private Hub modules.
- RLS is intentional: access is scoped to `auth.uid()` for Hub-owned data and Vault Storage objects.
- Migration 023 preserves Portfolio values while assigning existing rows to the sole Auth user. If the project has zero or multiple Auth users, it aborts instead of guessing ownership; assign `user_id` explicitly, then rerun it.
- Legacy Study, Projects, and AI Memory tables remain owner-scoped only for backup/database compatibility. Active UI, Search, Insights, and notifications do not use them.
- Text and Markdown uploaded after migration 023 receive a private, 32 KiB search projection. Existing/binary Vault files remain metadata-searchable until safely re-uploaded or indexed separately.
- Edge Function provider secrets belong in Supabase project secrets, never in these SQL files or the frontend.
