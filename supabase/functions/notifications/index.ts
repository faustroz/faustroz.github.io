// Deploy with: supabase functions deploy notifications
// Invoke from a protected cron job or manually after setting CRON_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (request) => {
  if (request.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("Unauthorized", { status: 401 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: exams }, { data: tasks }, { data: subscriptions }, { data: budgets }, { data: expenses }] = await Promise.all([
    supabase.from("study_exams").select("user_id,title,exam_date").gte("exam_date", today).lte("exam_date", today),
    supabase.from("project_tasks").select("user_id,title,due_on").gte("due_on", today).lte("due_on", today).neq("status", "done"),
    supabase.from("subscriptions").select("user_id,name,next_billing_on").gte("next_billing_on", today).lte("next_billing_on", today).eq("active", true),
    supabase.from("budgets").select("user_id,name,limit_amount,starts_on"),
    supabase.from("expenses").select("user_id,amount,spent_on"),
  ]);
  const budgetAlerts = (budgets || []).flatMap((budget) => {
    const spent = (expenses || []).filter((expense) => expense.user_id === budget.user_id && expense.spent_on >= budget.starts_on).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    return spent >= Number(budget.limit_amount) ? [{ user_id: budget.user_id, kind: "budget", title: `Budget limit: ${budget.name}`, body: `Spent ${spent} of ${budget.limit_amount}`, due_at: today }] : [];
  });
  const rows = [
    ...(exams || []).map((row) => ({ user_id: row.user_id, kind: "exam", title: `Exam: ${row.title}`, body: "Scheduled today", due_at: row.exam_date })),
    ...(tasks || []).map((row) => ({ user_id: row.user_id, kind: "deadline", title: `Task due: ${row.title}`, body: "Due today", due_at: row.due_on })),
    ...(subscriptions || []).map((row) => ({ user_id: row.user_id, kind: "subscription", title: `Billing: ${row.name}`, body: "Bills today", due_at: row.next_billing_on })),
    ...budgetAlerts,
  ];
  if (rows.length) await supabase.from("hub_notifications").insert(rows);
  return Response.json({ created: rows.length });
});
