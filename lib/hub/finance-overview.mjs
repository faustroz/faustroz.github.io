export function getFinanceMonthRange(now = new Date()) {
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return {
    start: format(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: format(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
  };
}

export function sumFinanceAmounts(rows = []) {
  return rows.reduce((total, row) => total + Number(row.amount || 0), 0);
}

export function sumAvailableBalances(accounts = []) {
  return accounts.reduce((total, account) => total + Number(account.balance || 0), 0);
}
