"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  Building2,
  PieChart,
  Target,
  CalendarDays,
  BarChart3,
  Settings,
  Plus,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockUserProfile } from "@/server/mock/dashboard-data";

export interface AppSidebarProps {
  onQuickExpense?: () => void;
  className?: string;
}

export function AppSidebar({ onQuickExpense, className }: AppSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/transactions", label: "Thu / Chi", icon: ArrowLeftRight },
    { href: "/accounts", label: "Tài khoản & Ví", icon: Wallet },
    { href: "/credit-cards", label: "Thẻ tín dụng", icon: CreditCard },
    { href: "/loans", label: "Khoản vay & Nợ", icon: Building2 },
    { href: "/budgets", label: "Ngân sách", icon: PieChart },
    { href: "/goals", label: "Mục tiêu tiết kiệm", icon: Target },
    { href: "/calendar", label: "Lịch tài chính", icon: CalendarDays },
    { href: "/reports", label: "Báo cáo", icon: BarChart3 },
    { href: "/settings", label: "Cài đặt", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950/70 p-4 h-screen sticky top-0 backdrop-blur select-none",
        className
      )}
    >
      <div>
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 px-2 py-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20 text-slate-950 font-bold text-lg">
            <svg
              className="h-5 w-5 fill-current"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.8" />
              <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-slate-100 flex items-center gap-1.5">
              Nancy Finance
            </div>
            <p className="text-[11px] text-slate-400">Quản lý tài chính cá nhân</p>
          </div>
        </Link>

        {/* Navigation Menu Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 shadow-sm"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-emerald-400" : "text-slate-400"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Quick Action Button & User Profile */}
      <div className="space-y-3 pt-3 border-t border-slate-800/80">
        {/* Prominent Quick Expense Button */}
        <button
          type="button"
          onClick={onQuickExpense}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-950/40 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Ghi chi tiêu nhanh</span>
        </button>

        {/* User Profile Card */}
        <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-emerald-400 border border-slate-700">
              {mockUserProfile.name.charAt(0)}
            </div>
            <div className="text-left">
              <span className="text-xs font-semibold text-slate-200 block truncate max-w-[110px]">
                {mockUserProfile.name}
              </span>
              <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                Premium
                <Crown className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
