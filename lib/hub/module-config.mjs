export const FINANCE_CHANNELS = Object.freeze([
  { id: "goals", label: "Goals", table: "financial_goals", title: "Financial goals", orderBy: "deadline", description: "Set a target, update current savings, and see real progress.", fields: [
    { name: "name", label: "Goal", required: true }, { name: "target_amount", label: "Target", type: "number", format: "currency", min: 1, required: true }, { name: "current_amount", label: "Current", type: "number", format: "currency", min: 0, defaultValue: 0, required: true }, { name: "deadline", label: "Deadline", type: "date", optional: true }, { name: "progress", label: "Progress", type: "computed", suffix: "%" }, { name: "notes", label: "Notes", type: "textarea", defaultValue: "" },
  ] },
  {
    id: "income", label: "Income", table: "income_entries", title: "Income ledger", orderBy: "received_on", ledger: { dateField: "received_on", amountField: "amount", accountField: "bank_account_id" },
    description: "Track every incoming payment, its category, and the account that received it.",
    fields: [
      { name: "title", label: "Source", required: true },
      { name: "amount", label: "Amount", type: "number", format: "currency", min: 0, required: true },
      { name: "category", label: "Category", type: "lookup", lookup: { table: "finance_categories", value: "name", label: ["name", "kind"], include: ["color"], kinds: ["income", "both"] }, defaultValue: "", required: true },
      { name: "bank_account_id", label: "Received to (bank/account)", type: "lookup", lookup: { table: "bank_accounts", value: "id", label: ["bank_name"] }, displayLookupLabel: true, fallbackField: "bank_account_name", defaultValue: "", optional: true },
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
    id: "expenses", label: "Expenses", table: "expenses", title: "Expense ledger", orderBy: "spent_on", ledger: { dateField: "spent_on", amountField: "amount", accountField: "bank_account_id" },
    description: "Track outgoing cash without mixing it into portfolio holdings.",
    fields: [
      { name: "title", label: "Item", required: true },
      { name: "amount", label: "Amount", type: "number", format: "currency", min: 0, required: true },
      { name: "category", label: "Category", type: "lookup", lookup: { table: "finance_categories", value: "name", label: ["name", "kind"], include: ["color"], kinds: ["expense", "both"] }, defaultValue: "", required: true },
      { name: "bank_account_id", label: "Paid from (bank/account)", type: "lookup", lookup: { table: "bank_accounts", value: "id", label: ["bank_name"], }, displayLookupLabel: true, fallbackField: "bank_account_name", defaultValue: "", optional: true },
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
      { name: "color", label: "Label color", type: "color", defaultValue: "#a1a1aa", required: true },
    ],
  },
  {
    id: "budgets", label: "Category budgets", table: "budgets", title: "Category budget limits", orderBy: "starts_on",
    description: "Set one spending limit for each category, then track it against matching expenses.",
    fields: [
      { name: "name", label: "Expense category", type: "lookup", lookup: { table: "finance_categories", value: "name", label: ["name", "kind"], include: ["color"], kinds: ["expense", "both"] }, defaultValue: "", required: true },
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

export const ACADEMIC_CHANNELS = Object.freeze([
  { id: "records", label: "Academic record", table: "academic_records", title: "Grades & credits", orderBy: "updated_at", filter: { field: "semester", label: "SEMESTER" }, description: "Record grade, credits/SKS, semester, and block. IP/IPK is calculated from these private records.", fields: [
    { name: "course_name", label: "Course / block name", required: true }, { name: "credits", label: "SKS", type: "number", min: 0.5, step: 0.5, inputMode: "decimal", placeholder: "e.g. 4", required: true }, { name: "final_score", label: "Final score", type: "computed" }, { name: "grade", label: "Grade", type: "computed" }, { name: "semester", label: "Semester", required: true }, { name: "block", label: "Block", type: "select", options: ["Blok 1","Blok 2","Blok 3–19 / 23–25 / 27–28","Blok 20","Blok 21 & 22","Blok 26"], defaultValue: "Blok 3–19 / 23–25 / 27–28" },
    { name: "ospe", label: "OSPE score", type: "number", min: 0, max: 100, step: 0.01, optional: true }, { name: "osce", label: "OSCE score", type: "number", min: 0, max: 100, step: 0.01, optional: true }, { name: "soca_tutorial", label: "SOCA / Tutorial score", type: "number", min: 0, max: 100, step: 0.01, optional: true }, { name: "mp", label: "MP score", type: "number", min: 0, max: 100, step: 0.01, optional: true }, { name: "behavior", label: "Behavior score", type: "number", min: 0, max: 100, step: 0.01, optional: true },
  ] },
]);
