"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth/auth-client";

export interface AppSidebarProps {
  onQuickExpense?: () => void;
  className?: string;
}

export function AppSidebar({ onQuickExpense, className }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const displayName = session?.user?.name || session?.user?.email || "Người dùng";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

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
        "hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-border bg-background p-4 h-screen sticky top-0 backdrop-blur select-none",
        className
      )}
    >
      <div>
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 px-2 py-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover shadow-md shadow-primary/20 text-slate-950 font-bold text-lg">
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
            <div className="font-bold text-base tracking-tight text-foreground flex items-center gap-1.5">
              Nancy Finance
            </div>
            <p className="text-[11px] text-muted">Quản lý tài chính cá nhân</p>
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
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-sm"
                    : "text-muted hover:bg-surface hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Quick Action Button & User Profile */}
      <div className="space-y-3 pt-3 border-t border-border">
        {/* Prominent Quick Expense Button */}
        <button
          type="button"
          onClick={onQuickExpense}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Ghi chi tiêu nhanh</span>
        </button>

        {/* User Profile Card */}
        <div className="flex items-center justify-between rounded-xl bg-surface/60 p-2.5 border border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-card text-xs font-bold text-primary border border-border">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-semibold text-foreground block truncate max-w-[110px]">
                {displayName}
              </span>
              <span className="text-[10px] text-muted font-medium block truncate max-w-[110px]">
                {session?.user?.email || ""}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Đăng xuất"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:text-expense hover:bg-expense/10 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
