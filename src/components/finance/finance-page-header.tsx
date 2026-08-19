"use client";

import React, { useState, Suspense } from "react";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export interface FinancePageHeaderProps {
  title: string;
  subtitle?: string;
  currentPeriod?: string;
  onPrevPeriod?: () => void;
  onNextPeriod?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

function FinancePageHeaderInner({
  title,
  subtitle,
  currentPeriod,
  onPrevPeriod,
  onNextPeriod,
  actions,
  className,
}: FinancePageHeaderProps) {
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const isControlled = currentPeriod !== undefined && onPrevPeriod !== undefined;

  let displayPeriod = currentPeriod;
  if (!isControlled) {
    const periodParam = searchParams.get("period");
    if (periodParam) {
      const [year, month] = periodParam.split("-");
      displayPeriod = `Tháng ${parseInt(month)}, ${year}`;
    } else {
      const now = new Date();
      displayPeriod = `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
    }
  }

  const handlePrev = () => {
    if (onPrevPeriod) return onPrevPeriod();
    
    const periodParam = searchParams.get("period");
    const d = periodParam ? new Date(`${periodParam}-01`) : new Date();
    d.setMonth(d.getMonth() - 1);
    
    const newPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const params = new URLSearchParams(searchParams);
    params.set("period", newPeriod);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleNext = () => {
    if (onNextPeriod) return onNextPeriod();
    
    const periodParam = searchParams.get("period");
    const d = periodParam ? new Date(`${periodParam}-01`) : new Date();
    d.setMonth(d.getMonth() + 1);
    
    const newPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const params = new URLSearchParams(searchParams);
    params.set("period", newPeriod);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-border bg-surface/90 px-1 py-1 shadow-sm">
          <button
            type="button"
            onClick={handlePrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-card hover:text-foreground transition-colors cursor-pointer"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-xs font-semibold text-foreground sm:text-sm">
            {displayPeriod}
          </span>
          <button
            type="button"
            onClick={handleNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-card hover:text-foreground transition-colors cursor-pointer"
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {actions}

        <button
          type="button"
          onClick={() => setHasUnreadNotification(false)}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface/90 text-slate-300 hover:bg-surface-card hover:text-foreground transition-colors cursor-pointer"
          aria-label="Thông báo"
        >
          <Bell className="h-4 w-4" />
          {hasUnreadNotification && (
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-expense ring-2 ring-background" />
          )}
        </button>
      </div>
    </div>
  );
}

export function FinancePageHeader(props: FinancePageHeaderProps) {
  return (
    <Suspense fallback={<div className="h-10 w-full animate-pulse bg-surface-card rounded-xl"></div>}>
      <FinancePageHeaderInner {...props} />
    </Suspense>
  );
}
