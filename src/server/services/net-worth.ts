import { db } from "@/db";
import {
  transactions,
  financialAccounts,
  loans,
  loanPayments,
  creditCards,
  creditCardTransactions,
  creditCardPayments,
} from "@/db/schema";
import { and, eq, gte, inArray } from "drizzle-orm";
import { createVNDate, getVNDateParts } from "./reports";

export interface NetWorthPoint {
  /** e.g. "2026-08" (VN calendar year-month) */
  month: string;
  /** Human readable short label, e.g. "T08/26" */
  monthLabel: string;
  assets: number;
  debt: number;
  netWorth: number;
}

export interface NetWorthHistoryResult {
  points: NetWorthPoint[];
  hasSufficientHistory: boolean;
}

export interface NetWorthSnapshot {
  assets: number;
  debt: number;
  netWorth: number;
}

interface Boundary {
  key: string;
  boundaryExclusive: Date;
}

/**
 * Builds the list of VN-calendar month-end (exclusive) boundaries for the
 * trailing `months` months, oldest first. Each boundary represents the
 * snapshot instant at 00:00 on the 1st day of the following month, i.e.
 * "end of month M" == "start of month M+1" (exclusive upper bound).
 */
function buildMonthBoundaries(months: number, now: Date): { key: string; label: string; boundaryExclusive: Date }[] {
  const { y, m } = getVNDateParts(now);
  const boundaries: { key: string; label: string; boundaryExclusive: Date }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const totalMonthIndex = y * 12 + (m - 1) - i; // 0-indexed month
    const boundaryYear = Math.floor(totalMonthIndex / 12);
    const boundaryMonth0 = ((totalMonthIndex % 12) + 12) % 12; // 0-11, month this snapshot represents
    const nextMonth0 = boundaryMonth0 + 1;
    const nextYear = nextMonth0 === 12 ? boundaryYear + 1 : boundaryYear;
    const nextMonth1 = nextMonth0 === 12 ? 1 : nextMonth0 + 1;

    const boundaryExclusive = createVNDate(nextYear, nextMonth1, 1);
    const key = `${boundaryYear}-${(boundaryMonth0 + 1).toString().padStart(2, "0")}`;
    const label = `T${(boundaryMonth0 + 1).toString().padStart(2, "0")}/${boundaryYear.toString().slice(2)}`;
    boundaries.push({ key, label, boundaryExclusive });
  }

  return boundaries;
}

/**
 * Core reconstruction engine: given a user and a set of exclusive-upper-bound
 * boundaries (each "boundaryExclusive" == the first instant AFTER the
 * snapshot instant we want), computes {assets, debt} at every boundary in a
 * single pass over each source table (fetched once for the whole window),
 * instead of re-querying per boundary. This keeps N-month history O(1)
 * queries per table rather than O(N).
 */
async function reconstructSnapshots(userId: string, boundaries: Boundary[]): Promise<Map<string, NetWorthSnapshot>> {
  const result = new Map<string, NetWorthSnapshot>();
  if (boundaries.length === 0) return result;

  const earliestBoundary = boundaries.reduce((min, b) => (b.boundaryExclusive < min ? b.boundaryExclusive : min), boundaries[0].boundaryExclusive);

  // --- ASSETS ---
  const accounts = await db
    .select({
      id: financialAccounts.id,
      balance: financialAccounts.balance,
      isExcluded: financialAccounts.isExcludedFromTotal,
      createdAt: financialAccounts.createdAt,
    })
    .from(financialAccounts)
    .where(eq(financialAccounts.userId, userId));

  const currentAssets = accounts.reduce((sum, a) => (a.isExcluded ? sum : sum + a.balance), 0);
  const isAccountIncluded = new Map(accounts.map((a) => [a.id, !a.isExcluded]));

  const windowTxs = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      accountId: transactions.accountId,
      toAccountId: transactions.toAccountId,
      transactionDate: transactions.transactionDate,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, "completed"),
        gte(transactions.transactionDate, earliestBoundary)
      )
    );

  function assetReverseDelta(tx: (typeof windowTxs)[number]): number {
    const fromIncluded = isAccountIncluded.get(tx.accountId) ?? false;
    const toIncluded = tx.toAccountId ? isAccountIncluded.get(tx.toAccountId) ?? false : false;
    let delta = 0;
    if (tx.type === "income" && fromIncluded) delta -= tx.amount;
    if (tx.type === "expense" && fromIncluded) delta += tx.amount;
    if (tx.type === "transfer") {
      if (fromIncluded) delta += tx.amount;
      if (toIncluded) delta -= tx.amount;
    }
    return delta;
  }

  // --- DEBT: loans ---
  const userLoans = await db
    .select({ id: loans.id, remainingAmount: loans.remainingAmount, startDate: loans.startDate })
    .from(loans)
    .where(eq(loans.userId, userId));

  const loanIds = userLoans.map((l) => l.id);
  const windowLoanPayments =
    loanIds.length > 0
      ? await db
          .select({ loanId: loanPayments.loanId, amount: loanPayments.amount, paymentDate: loanPayments.paymentDate })
          .from(loanPayments)
          .where(and(inArray(loanPayments.loanId, loanIds), gte(loanPayments.paymentDate, earliestBoundary)))
      : [];

  // --- DEBT: credit cards ---
  const userCards = await db
    .select({ id: creditCards.id, currentBalance: creditCards.currentBalance, createdAt: creditCards.createdAt })
    .from(creditCards)
    .where(eq(creditCards.userId, userId));

  const cardIds = userCards.map((c) => c.id);
  const [windowCcTxs, windowCcPayments] =
    cardIds.length > 0
      ? await Promise.all([
          db
            .select({ cardId: creditCardTransactions.creditCardId, amount: creditCardTransactions.amount, date: creditCardTransactions.transactionDate })
            .from(creditCardTransactions)
            .where(
              and(
                inArray(creditCardTransactions.creditCardId, cardIds),
                gte(creditCardTransactions.transactionDate, earliestBoundary),
                eq(creditCardTransactions.status, "posted")
              )
            ),
          db
            .select({ cardId: creditCardPayments.creditCardId, amount: creditCardPayments.amount, date: creditCardPayments.paymentDate })
            .from(creditCardPayments)
            .where(and(inArray(creditCardPayments.creditCardId, cardIds), gte(creditCardPayments.paymentDate, earliestBoundary))),
        ])
      : [[] as { cardId: string; amount: number; date: Date }[], [] as { cardId: string; amount: number; date: Date }[]];

  for (const { key, boundaryExclusive } of boundaries) {
    let assets = currentAssets;
    for (const tx of windowTxs) {
      if (tx.transactionDate >= boundaryExclusive) {
        // BUG (đã sửa): assetReverseDelta() trả về NGƯỢC DẤU so với tác động thật của giao
        // dịch lên assets (income -> âm, expense -> dương, ...). Dòng cũ `assets -=
        // assetReverseDelta(tx)` do đó CỘNG lại tác động thay vì lùi (trừ) nó đi, khiến số dư
        // quá khứ bị tính sai (vd: thu nhập 4.000.000 sau mốc thời gian lẽ ra phải bị trừ ra
        // khỏi số dư hiện tại để lùi về quá khứ, nhưng lại bị cộng thêm một lần nữa).
        assets += assetReverseDelta(tx);
      }
    }

    let debt = 0;
    for (const loan of userLoans) {
      if (loan.startDate >= boundaryExclusive) continue;
      let pastRemaining = loan.remainingAmount;
      for (const p of windowLoanPayments) {
        if (p.loanId === loan.id && p.paymentDate >= boundaryExclusive) pastRemaining += p.amount;
      }
      debt += pastRemaining;
    }
    for (const card of userCards) {
      if (card.createdAt >= boundaryExclusive) continue;
      let pastBalance = card.currentBalance;
      for (const t of windowCcTxs) {
        if (t.cardId === card.id && t.date >= boundaryExclusive) pastBalance -= t.amount;
      }
      for (const p of windowCcPayments) {
        if (p.cardId === card.id && p.date >= boundaryExclusive) pastBalance += p.amount;
      }
      debt += pastBalance;
    }

    result.set(key, { assets, debt, netWorth: assets - debt });
  }

  return result;
}

export class NetWorthService {
  /**
   * Reconstructs monthly Net Worth = Total Assets - Total Debt for the
   * trailing `months` VN-calendar months (each point = snapshot at the end
   * of that month, i.e. right before the 1st of the next month).
   */
  static async getNetWorthHistory(userId: string, months: 6 | 12): Promise<NetWorthHistoryResult> {
    const now = new Date();
    const boundaries = buildMonthBoundaries(months, now);
    const snapshots = await reconstructSnapshots(userId, boundaries);

    const points: NetWorthPoint[] = boundaries.map((b) => {
      const snap = snapshots.get(b.key)!;
      return { month: b.key, monthLabel: b.label, ...snap };
    });

    const accounts = await db
      .select({ createdAt: financialAccounts.createdAt })
      .from(financialAccounts)
      .where(eq(financialAccounts.userId, userId));
    const earliestAccountCreatedAt = accounts.length ? new Date(Math.min(...accounts.map((a) => a.createdAt.getTime()))) : now;
    const monthsWithData = boundaries.filter((b) => earliestAccountCreatedAt < b.boundaryExclusive).length;

    return { points, hasSufficientHistory: monthsWithData >= 2 };
  }

  /** Snapshot (assets/debt/netWorth) as of a single arbitrary exclusive boundary. */
  static async getSnapshotAt(userId: string, boundaryExclusive: Date): Promise<NetWorthSnapshot> {
    const snapshots = await reconstructSnapshots(userId, [{ key: "point", boundaryExclusive }]);
    return snapshots.get("point")!;
  }

  /** Compares net worth "now" against a previous boundary, for dashboard growth badges. */
  static async getComparison(userId: string, previousBoundaryExclusive: Date): Promise<{ current: NetWorthSnapshot; previous: NetWorthSnapshot }> {
    const now = new Date();
    const snapshots = await reconstructSnapshots(userId, [
      { key: "current", boundaryExclusive: now },
      { key: "previous", boundaryExclusive: previousBoundaryExclusive },
    ]);
    return { current: snapshots.get("current")!, previous: snapshots.get("previous")! };
  }
}

export const netWorthService = NetWorthService;
