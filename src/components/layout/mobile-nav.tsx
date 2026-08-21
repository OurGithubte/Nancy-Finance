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
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur-lg px-3 py-2">
      <div className="flex items-center justify-around">
        <Link
          href="/"
          prefetch={false}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
            pathname === "/" ? "text-primary" : "text-muted"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Tổng quan</span>
        </Link>

        <Link
          href="/transactions"
          prefetch={false}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/transactions")
              ? "text-primary"
              : "text-muted"
          )}
        >
          <ArrowLeftRight className="h-5 w-5" />
          <span>Giao dịch</span>
        </Link>

        <div className="-mt-5">
          <button
            type="button"
            onClick={onQuickExpense}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-slate-950 shadow-lg shadow-primary/30 hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
            aria-label="Ghi chi tiêu nhanh"
          >
            <Plus className="h-6 w-6 stroke-[3]" />
          </button>
        </div>

        <Link
          href="/reports"
          prefetch={false}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/reports")
              ? "text-primary"
              : "text-muted"
          )}
        >
          <BarChart3 className="h-5 w-5" />
          <span>Báo cáo</span>
        </Link>

        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center gap-1 text-[10px] font-medium text-muted hover:text-foreground cursor-pointer"
        >
          <Menu className="h-5 w-5" />
          <span>Menu</span>
        </button>
      </div>
    </div>
  );
}
