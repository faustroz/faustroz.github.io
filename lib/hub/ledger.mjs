export const currentLedgerMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export function filterAndSortLedger(records, { dateField, amountField = "amount", month = "all", day = "", provider = "all", providerForRecord = () => "", sort = "date-desc" }) {
  const visible = records
    .filter((record) => month === "all" || String(record[dateField] || "").startsWith(month))
    .filter((record) => !day || String(record[dateField] || "") === day)
    .filter((record) => provider === "all" || providerForRecord(record) === provider);
  const direction = sort.endsWith("asc") ? 1 : -1;
  const byAmount = sort.startsWith("amount");
  return [...visible].sort((left, right) => {
    const leftValue = byAmount ? Number(left[amountField] || 0) : String(left[dateField] || "");
    const rightValue = byAmount ? Number(right[amountField] || 0) : String(right[dateField] || "");
    if (leftValue < rightValue) return -1 * direction;
    if (leftValue > rightValue) return direction;
    return String(right.created_at || "").localeCompare(String(left.created_at || ""));
  });
}
