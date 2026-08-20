"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

export function ReportPeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = searchParams.get("period") || "this_month";
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";

  const [period, setPeriod] = useState(currentPeriod);
  const [from, setFrom] = useState(currentFrom);
  const [to, setTo] = useState(currentTo);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    if (period === "custom") {
      params.set("from", from);
      params.set("to", to);
    } else {
      params.delete("from");
      params.delete("to");
    }
    router.push(`/reports?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="relative inline-flex items-center">
        <Calendar className="absolute left-3 h-4 w-4 text-muted pointer-events-none" />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="appearance-none rounded-xl border border-border bg-surface py-2 pl-9 pr-8 text-sm font-medium text-slate-200 outline-none hover:border-border-card cursor-pointer min-w-[150px]"
        >
          <option value="this_month">Tháng này</option>
          <option value="last_month">Tháng trước</option>
          <option value="last_3_months">3 tháng gần nhất</option>
          <option value="last_6_months">6 tháng gần nhất</option>
          <option value="this_year">Năm nay</option>
          <option value="custom">Tùy chỉnh...</option>
        </select>
        <div className="pointer-events-none absolute right-3 flex items-center">
          <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {period === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-primary"
          />
          <span className="text-muted text-sm">-</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-primary"
          />
        </div>
      )}

      {/* Show Apply button if something changed */}
      {(period !== currentPeriod || from !== currentFrom || to !== currentTo) && (
        <button
          onClick={handleApply}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Áp dụng
        </button>
      )}
    </div>
  );
}
