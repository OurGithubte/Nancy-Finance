"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpenseCategoryShare, MonthlyCashflowPoint } from "@/types/finance";
import { formatVND, formatCompactVND } from "@/lib/format/money";

// 1. Donut Chart for Expense Breakdown
export interface ExpenseDonutChartProps {
  title?: string;
  totalExpense: number;
  categories: ExpenseCategoryShare[];
  detailLink?: string;
  className?: string;
}

export function ExpenseDonutChart({
  title = "Dòng tiền tháng 5",
  totalExpense,
  categories,
  detailLink = "/transactions",
  className,
}: ExpenseDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {detailLink && (
          <Link
            href={detailLink}
            className="text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
          >
            Xem chi tiết
          </Link>
        )}
      </div>

      {/* Content: Chart + Legend */}
      <div className="mt-4 flex flex-col items-center gap-6 lg:flex-row lg:items-center">
        {/* Chart Container */}
        <div className="relative flex h-[190px] w-[190px] shrink-0 items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={3}
                dataKey="amount"
                stroke="#0f172a"
                strokeWidth={3}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {categories.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.id}`}
                    fill={entry.color}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                    style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Text */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold tracking-tight text-slate-100">
              {formatCompactVND(totalExpense)}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Tổng chi
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="grid w-full flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
          {categories.map((item, idx) => (
            <div
              key={item.id}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              className={cn(
                "flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer",
                activeIndex === idx ? "bg-slate-800/80" : "hover:bg-slate-800/40"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-slate-300">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-200">
                  {formatVND(item.amount)}
                </span>
                <span className="text-slate-400">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 2. Area/Line Chart for Income vs Expense
export interface CashflowTrendChartProps {
  title?: string;
  data: MonthlyCashflowPoint[];
  className?: string;
}

export function CashflowTrendChart({
  title = "Thu nhập vs Chi tiêu",
  data,
  className,
}: CashflowTrendChartProps) {
  const [timeRange, setTimeRange] = useState("12 tháng");

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="font-medium text-slate-300">Thu nhập</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="font-medium text-slate-300">Chi tiêu</span>
            </div>
          </div>

          {/* Time Filter Select */}
          <div className="relative inline-flex items-center">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none rounded-lg border border-slate-800 bg-slate-800/80 py-1 pl-3 pr-7 text-xs font-medium text-slate-200 outline-none hover:border-slate-700 cursor-pointer"
            >
              <option value="6 tháng">6 tháng</option>
              <option value="12 tháng">12 tháng</option>
              <option value="Năm nay">Năm nay</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-5 h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#1e293b" }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatCompactVND(val)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
                      <p className="text-xs font-semibold text-slate-300 mb-1.5">{label}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Thu nhập:
                          </span>
                          <span className="font-bold text-slate-100">
                            {formatVND(payload[0]?.value as number)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-rose-400 font-medium flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-400" />
                            Chi tiêu:
                          </span>
                          <span className="font-bold text-slate-100">
                            {formatVND(payload[1]?.value as number)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#incomeGradient)"
              dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#10B981", stroke: "#0f172a", strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#EF4444"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#expenseGradient)"
              dot={{ r: 3, fill: "#EF4444", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#EF4444", stroke: "#0f172a", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
