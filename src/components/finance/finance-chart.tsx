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
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpenseCategoryShare, MonthlyCashflowPoint } from "@/types/finance";
import { formatVND, formatCompactVND } from "@/lib/format/money";
import type { NetWorthPoint } from "@/server/services/net-worth";

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
        "flex flex-col rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {detailLink && (
          <Link
            href={detailLink}
            className="text-xs font-medium text-muted hover:text-primary transition-colors"
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
            <span className="text-xl font-bold tracking-tight text-foreground">
              {formatCompactVND(totalExpense)}
            </span>
            <span className="text-[11px] font-medium text-muted">
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
                activeIndex === idx ? "bg-surface-card" : "hover:bg-surface-card/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-slate-300">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-foreground">
                  {formatVND(item.amount)}
                </span>
                <span className="text-muted">({item.percentage}%)</span>
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
        "flex flex-col rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-income" />
              <span className="font-medium text-slate-300">Thu nhập</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-expense" />
              <span className="font-medium text-slate-300">Chi tiêu</span>
            </div>
          </div>

          {/* Time Filter Select */}
          <div className="relative inline-flex items-center">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-surface-card py-1 pl-3 pr-7 text-xs font-medium text-slate-200 outline-none hover:border-border-card cursor-pointer"
            >
              <option value="6 tháng">6 tháng</option>
              <option value="12 tháng">12 tháng</option>
              <option value="Năm nay">Năm nay</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-5 h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0} />
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
                    <div className="rounded-xl border border-border-card bg-surface/95 p-3 shadow-xl backdrop-blur">
                      <p className="text-xs font-semibold text-slate-300 mb-1.5">{label}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-income font-medium flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-income" />
                            Thu nhập:
                          </span>
                          <span className="font-bold text-foreground">
                            {formatVND(payload[0]?.value as number)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-expense font-medium flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-expense" />
                            Chi tiêu:
                          </span>
                          <span className="font-bold text-foreground">
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
              stroke="#22C55E"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#incomeGradient)"
              dot={{ r: 3, fill: "#22C55E", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#22C55E", stroke: "#0f172a", strokeWidth: 2 }}
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

// 3. Net Worth Trend Line Chart (Phase 6)
export interface NetWorthTrendChartProps {
  title?: string;
  data: NetWorthPoint[];
  hasSufficientHistory: boolean;
  className?: string;
}

export function NetWorthTrendChart({
  title = "Xu hướng tài sản ròng",
  data,
  hasSufficientHistory,
  className,
}: NetWorthTrendChartProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="text-xs font-medium text-muted">{data.length} tháng gần nhất</span>
      </div>

      {!hasSufficientHistory ? (
        <div className="mt-5 flex h-[200px] w-full flex-col items-center justify-center gap-1.5 text-center">
          <span className="text-sm font-medium text-slate-300">Chưa đủ dữ liệu lịch sử</span>
          <span className="max-w-xs text-xs text-muted">
            Nancy cần thêm dữ liệu vài tháng nữa để hiển thị xu hướng tài sản ròng chính xác.
          </span>
        </div>
      ) : (
        <div className="mt-5 h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="monthLabel"
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
                    const point = payload[0].payload as NetWorthPoint;
                    return (
                      <div className="rounded-xl border border-border-card bg-surface/95 p-3 shadow-xl backdrop-blur">
                        <p className="text-xs font-semibold text-slate-300 mb-1.5">{label}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Tài sản:</span>
                            <span className="font-bold text-foreground">{formatVND(point.assets)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Dư nợ:</span>
                            <span className="font-bold text-foreground">{formatVND(point.debt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-primary font-medium">Tài sản ròng:</span>
                            <span className="font-bold text-foreground">{formatVND(point.netWorth)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="netWorth"
                stroke="#8B5CF6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#8B5CF6", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#8B5CF6", stroke: "#0f172a", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
