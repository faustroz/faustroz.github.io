export const FINANCE_CHANNELS = Object.freeze([
  {
    id: "income", label: "Income", table: "income_entries", title: "Income ledger", orderBy: "received_on",
    description: "Track every incoming payment, its category, and the account that received it.",
    fields: [
      { name: "title", label: "Source", required: true },
      { name: "amount", label: "Amount", type: "number", format: "currency", min: 0, required: true },
      { name: "category", label: "Category", defaultValue: "General", required: true },
      { name: "bank_account_name", label: "Received to (bank/account)", defaultValue: "", optional: true },
      { name: "received_on", label: "Date received", type: "date", required: true },
      { name: "notes", label: "Notes", type: "textarea", defaultValue: "" },
    ],
  },
  {
    id: "accounts", label: "Balances", table: "bank_accounts", title: "Bank & cash balances", orderBy: "updated_at",
    description: "Keep the current balance of every bank, e-wallet, cash, or other account in one private ledger.",
    fields: [
      { name: "name", label: "Account name", required: true },
      { name: "bank_name", label: "Bank / provider", required: true },
      { name: "account_type", label: "Type", type: "select", options: ["bank", "e-wallet", "cash", "other"], defaultValue: "bank" },
      { name: "balance", label: "Current balance", type: "number", format: "currency", required: true },
      { name: "currency", label: "Currency", defaultValue: "IDR", required: true },
    ],
  },
  {
    id: "expenses", label: "Expenses", table: "expenses", title: "Expense ledger", orderBy: "spent_on",
    description: "Track outgoing cash without mixing it into portfolio holdings.",
    fields: [
      { name: "title", label: "Item", required: true },
      { name: "amount", label: "Amount", type: "number", format: "currency", min: 0, required: true },
      { name: "category", label: "Category", defaultValue: "General", required: true },
      { name: "bank_account_name", label: "Paid from (bank/account)", defaultValue: "", optional: true },
      { name: "spent_on", label: "Date", type: "date", required: true },
      { name: "notes", label: "Notes", type: "textarea", defaultValue: "" },
    ],
  },
  {
    id: "categories", label: "Categories", table: "finance_categories", title: "Custom categories", orderBy: "updated_at",
    description: "Create your own income and expense categories. Use the same name in ledger entries and category budgets.",
    fields: [
      { name: "name", label: "Category name", required: true },
      { name: "kind", label: "Used for", type: "select", options: ["expense", "income", "both"], defaultValue: "expense" },
      { name: "color", label: "Label color", defaultValue: "#a1a1aa", required: true },
    ],
  },
  {
    id: "budgets", label: "Category budgets", table: "budgets", title: "Category budget limits", orderBy: "starts_on",
    description: "Set one spending limit for each category, then track it against matching expenses.",
    fields: [
      { name: "name", label: "Expense category", required: true },
      { name: "limit_amount", label: "Limit", type: "number", format: "currency", min: 0, required: true },
      { name: "period", label: "Period", type: "select", options: ["weekly", "monthly", "yearly"], defaultValue: "monthly" },
      { name: "starts_on", label: "Starts", type: "date", required: true },
    ],
  },
  {
    id: "subscriptions", label: "Subscriptions", table: "subscriptions", title: "Recurring commitments", orderBy: "next_billing_on",
    description: "Monitor recurring services and their next billing dates.",
    fields: [
      { name: "name", label: "Service", required: true },
      { name: "amount", label: "Amount", type: "number", format: "currency", min: 0, required: true },
      { name: "billing_cycle", label: "Cycle", type: "select", options: ["weekly", "monthly", "yearly"], defaultValue: "monthly" },
      { name: "next_billing_on", label: "Next billing", type: "date", optional: true },
      { name: "active", label: "Active", type: "checkbox", defaultValue: true },
    ],
  },
]);

export const STUDY_CHANNELS = Object.freeze([
  {
    id: "topics", label: "Topics", table: "study_topics", title: "Topic map", orderBy: "updated_at",
    description: "Turn the syllabus into visible, measurable learning units.",
    fields: [
      { name: "title", label: "Topic", required: true },
      { name: "subject", label: "Subject", required: true },
      { name: "status", label: "Status", type: "select", options: ["planned", "active", "review", "complete"], defaultValue: "planned" },
      { name: "progress", label: "Progress", type: "number", min: 0, max: 100, suffix: "%", defaultValue: 0 },
    ],
  },
  {
    id: "exams", label: "Exams", table: "study_exams", title: "Exam board", orderBy: "exam_date",
    description: "Keep assessment dates, targets, results, and notes together.",
    fields: [
      { name: "title", label: "Exam", required: true },
      { name: "exam_date", label: "Date", type: "date", optional: true },
      { name: "target_score", label: "Target", type: "number", optional: true },
      { name: "score", label: "Score", type: "number", optional: true },
      { name: "notes", label: "Notes", type: "textarea", defaultValue: "" },
    ],
  },
  {
    id: "flashcards", label: "Flashcards", table: "study_flashcards", title: "Recall deck", orderBy: "updated_at",
    description: "Store compact prompts prepared for spaced-repetition workflows.",
    fields: [
      { name: "front", label: "Prompt", type: "textarea", required: true },
      { name: "back", label: "Answer", type: "textarea", required: true },
      { name: "topic", label: "Topic", defaultValue: "" },
      { name: "mastery", label: "Mastery", type: "number", min: 0, max: 5, suffix: "/5", defaultValue: 0 },
    ],
  },
]);

export const PROJECT_CHANNELS = Object.freeze([
  {
    id: "projects", label: "Projects", table: "hub_projects", title: "Project registry", orderBy: "updated_at",
    description: "Track active work, state, scope, and delivery progress.",
    fields: [
      { name: "name", label: "Project", required: true },
      { name: "description", label: "Description", type: "textarea", defaultValue: "" },
      { name: "status", label: "Status", type: "select", options: ["planned", "active", "paused", "shipped", "archived"], defaultValue: "planned" },
      { name: "progress", label: "Progress", type: "number", min: 0, max: 100, suffix: "%", defaultValue: 0 },
    ],
  },
  {
    id: "tasks", label: "Tasks", table: "project_tasks", title: "Execution queue", orderBy: "updated_at",
    description: "Maintain the next concrete actions across projects.",
    fields: [
      { name: "title", label: "Task", required: true },
      { name: "project_name", label: "Project", defaultValue: "" },
      { name: "status", label: "Status", type: "select", options: ["todo", "doing", "blocked", "done"], defaultValue: "todo" },
      { name: "due_on", label: "Due", type: "date", optional: true },
    ],
  },
  {
    id: "changelog", label: "Changelog", table: "project_changelog", title: "Change log", orderBy: "logged_on",
    description: "Keep a durable trail of decisions, releases, and meaningful changes.",
    fields: [
      { name: "title", label: "Change", required: true },
      { name: "project_name", label: "Project", defaultValue: "" },
      { name: "logged_on", label: "Date", type: "date", required: true },
      { name: "details", label: "Details", type: "textarea", defaultValue: "" },
    ],
  },
]);

export const MEMORY_CHANNELS = Object.freeze([
  {
    id: "memory", label: "Memory", table: "ai_memory_entries", title: "Context memory", orderBy: "updated_at",
    description: "Structured, private context prepared for a future authenticated API layer.",
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "kind", label: "Kind", type: "select", options: ["context", "preference", "decision", "reference"], defaultValue: "context" },
      { name: "importance", label: "Importance", type: "number", min: 1, max: 5, suffix: "/5", defaultValue: 3 },
      { name: "tags", label: "Tags", type: "tags", defaultValue: "" },
      { name: "content", label: "Memory content", type: "textarea", required: true },
    ],
  },
]);
