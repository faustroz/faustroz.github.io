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
| 024 | `024-osint-cases.sql` | Owner-private OSINT cases and manually saved findings | 004 |
| 025 | `025-quick-income-api.sql` | Replay-safe Quick Income using existing account balance triggers | 017 |
| 026 | `026-exact-cashflow-account-balances.sql` | Restore exact account-id updates for Income and safe unique-name legacy fallback | 020, 025 |
| 027 | `027-academic-mku-records.sql` | Owner-private Mata Kuliah Umum records and Trash retention | 012 |
| 028 | `028-finance-transfers-reconciliation.sql` | Atomic account transfers and owner-private balance reconciliation snapshots | 026, 027 |
| 029 | `029-live-bank-reconciliation.sql` | Live account-balance reconciliation sync, existing-row backfill, and realtime publication | 028 |
| 030 | `030-retire-bank-reconciliation.sql` | Retire Bank Reconciliation triggers/realtime while preserving owner data for backups | 029 |
| 034 | `034-question-bank-block-categories.sql` | Allow owners to manage reusable Question Bank block options | 032 |
| 035 | `035-academic-review-schedule.sql` | Persist owner-scoped mistakes and SM-2 inspired review schedules from Question Bank attempts | 031, 032 |
| 036 | `036-academic-practice-history.sql` | Reuse owner-private exam sessions for untimed practice history and completion snapshots | 031 |
| 037 | `037-essay-only-spaced-repetition.sql` | Restrict spaced-repetition ratings to essay attempts while preserving MCQ mistake history | 035 |
| 038 | `038-image-occlusion-study.sql` | Add private Image Occlusion sets/cards and per-card spaced-repetition schedules; disable Question Bank scheduling | 032, 035, 037 |
| 039 | `039-image-occlusion-mask-only.sql` | Allow answer-free Image Occlusion sets while preserving existing answer cards | 038 |
| 040 | `040-image-occlusion-multiple-images.sql` | Add owner-private source images per Image Occlusion set and link cards to one image | 038, 039 |
| 041 | `041-image-occlusion-mask-rotation.sql` | Persist a bounded rotation angle for each Image Occlusion mask | 038, 039, 040 |

## Safety notes

- Enable Supabase Email Auth and create the account before using the private Hub modules.
- RLS is intentional: access is scoped to `auth.uid()` for Hub-owned data and Vault Storage objects.
- Migration 023 preserves Portfolio values while assigning existing rows to the sole Auth user. If the project has zero or multiple Auth users, it aborts instead of guessing ownership; assign `user_id` explicitly, then rerun it.
- Legacy Study, Projects, and AI Memory tables remain owner-scoped only for backup/database compatibility. Active UI, Search, Insights, and notifications do not use them.
- Text and Markdown uploaded after migration 023 receive a private, 32 KiB search projection. Existing/binary Vault files remain metadata-searchable until safely re-uploaded or indexed separately.
- Edge Function provider secrets belong in Supabase project secrets, never in these SQL files or the frontend.
- OSINT lookup results remain non-persistent. Migration 024 stores only findings the owner explicitly adds to a case; case deletion is permanent and cascades to its findings.
- Migration 035 adds private per-question review schedules; all historical answers remain in `academic_question_attempts`. Apply it before using the new rating and scheduled-review controls.
- Migration 036 is additive and preserves existing exam sessions. It makes planned duration optional for untimed practice and adds a session kind; apply it before starting sessions that should appear in the new practice history.
- Migration 037 keeps MCQ mistakes in Review Mistakes but limits scheduled/due reviews and recall ratings to essay questions; existing attempt and mistake history is preserved.
- Migration 038 disables new MCQ/Essay spaced-repetition updates while preserving all attempts and legacy schedule rows. Image Occlusion schedules are stored independently per card; apply it before using Image Occlusion.
- Migration 039 adds an answer-vs-mask-only setting to Image Occlusion sets. Existing sets retain answer mode and existing card answers; apply it before creating or editing mask-only sets.
- Migration 040 backfills each existing Image Occlusion set as one source image and links its cards without changing answers or review history. Apply before using multi-image sets.
- Migration 041 adds a 0-degree default for existing masks and stores optional rotation from -180° to 180° without changing their image coordinates or review history.
- Image Occlusion reuses the private `academic-question-images` bucket. Each source image is stored once per set under the authenticated user's existing owner folder and can back multiple cards; the browser receives only short-lived signed URLs.
- Question Bank JSON backup excludes owner IDs, signed URLs, and image file bytes. It keeps private image storage paths only; restore adds questions without deleting or replacing existing records.
