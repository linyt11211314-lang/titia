import type { Account, LedgerCategory } from "./store";

const liabilityWords = ["负债", "信用卡", "花呗", "白条", "贷款", "借款"];
export function groupAccounts(accounts: Account[]) {
  return accounts.reduce((groups, account) => { (liabilityWords.some((word) => `${account.kind}${account.name}`.includes(word)) ? groups.liabilities : groups.assets).push(account); return groups; }, { assets: [] as Account[], liabilities: [] as Account[] });
}
export const addLedgerCategory = (categories: LedgerCategory[], item: LedgerCategory) => categories.some((current) => current.id === item.id) ? categories : [...categories, item];
export const renameLedgerCategory = (categories: LedgerCategory[], id: string, name: string) => categories.map((item) => item.id === id ? { ...item, name: name.trim() || item.name } : item);
export const deleteLedgerCategory = (categories: LedgerCategory[], id: string) => categories.filter((item) => item.id !== id && item.parentId !== id);
export const leafCategoryNames = (categories: LedgerCategory[]) => categories.filter((item) => item.parentId).map((item) => item.name);
