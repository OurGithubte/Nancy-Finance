"use client";

import React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { NancyLogo } from "@/components/branding/nancy-logo";
import { cn } from "@/lib/utils";
import type { DashboardUser } from "@/components/layout/dashboard-shell";

export interface AppHeaderProps {
  user: DashboardUser;
  className?: string;
}

export function AppHeader({ user, className }: AppHeaderProps) {
  const displayName = user.name || user.email || "Người dùng";

  return (
    <header className={cn("flex lg:hidden items-center justify-between border-b border-border bg-background/80 px-4 py-3 sticky top-0 z-30 backdrop-blur", className)}>
      <Link href="/" prefetch={false} className="flex items-center gap-2.5">
        <NancyLogo className="h-8 w-8" sizes="32px" priority />
        <span className="font-bold text-sm tracking-tight text-foreground">
          Nancy Finance
        </span>
      </Link>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-slate-300 hover:text-foreground cursor-pointer"
          aria-label="Thông báo"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-expense" />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-card text-xs font-bold text-primary border border-border">
          {displayName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
