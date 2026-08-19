"use client";

import React, { useState } from "react";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FinancePageHeaderProps {
  title: string;
  subtitle?: string;
  currentPeriod?: string;
  onPrevPeriod?: () => void;
  onNextPeriod?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function FinancePageHeader({
  title,
  subtitle,
  currentPeriod = "Tháng 5, 2025",
  onPrevPeriod,
  onNextPeriod,
  actions,
  className,
}: FinancePageHeaderProps) {
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        )}
      </div>

      {/* Right Controls: Period Switcher & Actions & Notifications */}
      <div className="flex items-center gap-3">
        {/* Period Switcher */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 px-1 py-1 shadow-sm">
          <button
            type="button"
            onClick={onPrevPeriod}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-xs font-semibold text-slate-200 sm:text-sm">
            {currentPeriod}
          </span>
          <button
            type="button"
            onClick={onNextPeriod}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Custom Actions */}
        {actions}

        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => setHasUnreadNotification(false)}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Thông báo"
        >
          <Bell className="h-4 w-4" />
          {hasUnreadNotification && (
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
          )}
        </button>
      </div>
    </div>
  );
}
