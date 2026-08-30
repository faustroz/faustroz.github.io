# Supabase migrations

These SQL files define the Supabase database for 4allx. Run them in ascending numerical order in the Supabase SQL Editor.

> Existing project: do not rerun migrations that have already been applied unless the script is explicitly idempotent and you intend to refresh its functions, triggers, or policies. Run only the migrations that are missing from your database.

| Order | File | Purpose | Prerequisite |
| --- | --- | --- | --- |
| 000 | `000-portfolio-tracker.sql` | Portfolio Tracker storage, update trigger, and authenticated RLS | Supabase Auth enabled |
| 004 | `004-private-modules.sql` | Core Hub tables, shared `set_updated_at` trigger, and owner-only RLS | 000 |
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

## Safety notes

- Enable Supabase Email Auth and create the account before using the private Hub modules.
- RLS is intentional: access is scoped to `auth.uid()` for Hub-owned data and Vault Storage objects.
- Portfolio Tracker keeps its existing key/value data shape; do not manually alter `portfolio_tracker_store` outside the supplied migration.
- Edge Function provider secrets belong in Supabase project secrets, never in these SQL files or the frontend.
