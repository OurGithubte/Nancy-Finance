"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NancyInsight } from "@/types/finance";

export interface NancyInsightCardProps {
  insight: NancyInsight;
  className?: string;
}

export function NancyInsightCard({ insight, className }: NancyInsightCardProps) {
  const getIcon = () => {
    switch (insight.type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case "tip":
      case "info":
      default:
        return <Sparkles className="h-5 w-5 text-emerald-400" />;
    }
  };

  const getBorderColor = () => {
    switch (insight.type) {
      case "warning":
        return "border-amber-500/30 bg-amber-500/5";
      case "success":
        return "border-emerald-500/30 bg-emerald-500/5";
      case "tip":
      default:
        return "border-emerald-500/30 bg-emerald-500/5";
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        getBorderColor(),
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50">
          {getIcon()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <Sparkles className="h-3 w-3" />
              Nancy AI Insight
            </span>
            <h3 className="text-xs font-semibold text-slate-200">
              {insight.title}
            </h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            {insight.content}
          </p>
        </div>
      </div>

      {insight.actionText && insight.actionUrl && (
        <div className="shrink-0 self-end sm:self-center">
          <Link
            href={insight.actionUrl}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <span>{insight.actionText}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
