// Deploy with: supabase functions deploy notifications
// Invoke from a protected cron job or manually after setting CRON_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (request) => {
  if (request.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("Unauthorized", { status: 401 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: subscriptions }, { data: budgets }, { data: expenses }] = await Promise.all([
    supabase.from("subscriptions").select("user_id,name,next_billing_on").gte("next_billing_on", today).lte("next_billing_on", today).eq("active", true),
    supabase.from("budgets").select("user_id,name,limit_amount,starts_on"),
    supabase.from("expenses").select("user_id,amount,spent_on,category"),
  ]);
  const budgetAlerts = (budgets || []).flatMap((budget) => {
    const spent = (expenses || []).filter((expense) => expense.user_id === budget.user_id && expense.category === budget.name && expense.spent_on >= budget.starts_on).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    return spent >= Number(budget.limit_amount) ? [{ user_id: budget.user_id, kind: "budget", title: `Budget limit: ${budget.name}`, body: `Spent ${spent} of ${budget.limit_amount}`, due_at: today }] : [];
  });
  const rows = [
    ...(subscriptions || []).map((row) => ({ user_id: row.user_id, kind: "subscription", title: `Billing: ${row.name}`, body: "Bills today", due_at: row.next_billing_on })),
    ...budgetAlerts,
  ];
  if (rows.length) await supabase.from("hub_notifications").insert(rows);
  return Response.json({ created: rows.length });
});
