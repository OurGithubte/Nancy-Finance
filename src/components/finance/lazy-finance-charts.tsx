"use client";

import dynamic from "next/dynamic";

function ChartFallback({ height = "h-[230px]" }: { height?: string }) {
  return <div className={`${height} w-full animate-pulse rounded-2xl border border-border bg-surface/70`} />;
}

export const LazyExpenseDonutChart = dynamic(
  () => import("@/components/finance/finance-chart").then((m) => m.ExpenseDonutChart),
  { loading: () => <ChartFallback height="h-[270px]" /> }
);

export const LazyCashflowTrendChart = dynamic(
  () => import("@/components/finance/finance-chart").then((m) => m.CashflowTrendChart),
  { loading: () => <ChartFallback height="h-[300px]" /> }
);

export const LazyNetWorthTrendChart = dynamic(
  () => import("@/components/finance/finance-chart").then((m) => m.NetWorthTrendChart),
  { loading: () => <ChartFallback height="h-[260px]" /> }
);
