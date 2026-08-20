import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import { formatVND } from "@/lib/format/money";
import Link from "next/link";
import { SmartInsight } from "@/server/services/insights";

export function SmartInsights({ insights }: { insights: SmartInsight[] }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Phân tích thông minh</h2>
      <div className="space-y-3">
        {insights.map((insight) => {
          let Icon = Info;
          let colorClass = "text-muted border-border";
          let bgClass = "bg-surface/50";

          if (insight.severity === "critical") {
            Icon = AlertCircle;
            colorClass = "text-expense border-expense/20";
            bgClass = "bg-expense/5";
          } else if (insight.severity === "warning") {
            Icon = AlertTriangle;
            colorClass = "text-warning border-warning/20";
            bgClass = "bg-warning/5";
          } else if (insight.severity === "positive") {
            Icon = CheckCircle2;
            colorClass = "text-income border-income/20";
            bgClass = "bg-income/5";
          }

          return (
            <div key={insight.id} className={`relative flex items-start gap-4 rounded-2xl border p-4 ${bgClass} ${colorClass}`}>
              <Icon className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {insight.description}
                  {insight.amount ? <strong className="ml-1 font-bold">{formatVND(insight.amount)}</strong> : null}
                </p>
                {insight.actionLabel && insight.actionHref && (
                  <Link href={insight.actionHref} className="inline-flex items-center gap-1 text-[11px] font-medium mt-3 hover:underline">
                    {insight.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
