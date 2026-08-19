"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  BarChart3,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileNavProps {
  onQuickExpense: () => void;
  onOpenMobileMenu: () => void;
}

export function MobileNav({
  onQuickExpense,
  onOpenMobileMenu,
}: MobileNavProps) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-lg px-3 py-2">
      <div className="flex items-center justify-around">
        {/* 1. Trang chủ / Tổng quan */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
            pathname === "/" ? "text-emerald-400" : "text-slate-400"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Tổng quan</span>
        </Link>

        {/* 2. Giao dịch / Thu chi */}
        <Link
          href="/transactions"
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/transactions")
              ? "text-emerald-400"
              : "text-slate-400"
          )}
        >
          <ArrowLeftRight className="h-5 w-5" />
          <span>Giao dịch</span>
        </Link>

        {/* 3. Center Quick Action Button (+) */}
        <div className="-mt-5">
          <button
            type="button"
            onClick={onQuickExpense}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-95 transition-all"
            aria-label="Ghi chi tiêu nhanh"
          >
            <Plus className="h-6 w-6 stroke-[3]" />
          </button>
        </div>

        {/* 4. Báo cáo */}
        <Link
          href="/reports"
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/reports")
              ? "text-emerald-400"
              : "text-slate-400"
          )}
        >
          <BarChart3 className="h-5 w-5" />
          <span>Báo cáo</span>
        </Link>

        {/* 5. Menu / Cài đặt & danh mục khác */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-200"
        >
          <Menu className="h-5 w-5" />
          <span>Menu</span>
        </button>
      </div>
    </div>
  );
}
