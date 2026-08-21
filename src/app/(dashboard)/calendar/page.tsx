import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatVND } from "@/lib/format/money";
import { formatDateVN } from "@/lib/format/date";
import { requireUser } from "@/lib/auth/server";
import { calendarService } from "@/server/services/calendar";
import { createVNDate, getVNDateParts } from "@/server/services/reports";

export default async function CalendarPage() {
  const user = await requireUser();
  const { y, m } = getVNDateParts(new Date());
  const startDate = createVNDate(y, m, 1);
  const endMonth = m + 2;
  const endDate = endMonth > 12
    ? createVNDate(y + 1, endMonth - 12, 1)
    : createVNDate(y, endMonth, 1);

  const events = await calendarService.getEventsInRange(user.id, startDate, endDate);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Lịch tài chính"
        subtitle="Lịch sự kiện, ngày sao kê, hạn trả nợ và nhắc nhở đóng tiền"
      />

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="text-center p-8 text-muted border border-dashed border-border rounded-xl bg-surface/50">
            Không có sự kiện tài chính nào trong thời gian này.
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface/80 p-4 transition-colors hover:border-border-card"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-card border border-border text-slate-300">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-200">{ev.title}</h3>
                  <p className="text-[11px] text-muted mt-0.5">Ngày: {formatDateVN(ev.date)}</p>
                </div>
              </div>

              <div className="text-right">
                {ev.amount ? (
                  <div className="text-xs font-bold text-foreground">{formatVND(ev.amount)}</div>
                ) : (
                  <span className="text-xs text-muted">Sao kê định kỳ</span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium mt-0.5 ${
                    ev.status === "urgent"
                      ? "text-expense"
                      : ev.status === "scheduled" || ev.status === "completed"
                        ? "text-income"
                        : "text-warning"
                  }`}
                >
                  {ev.status === "urgent" && <AlertTriangle className="h-3 w-3" />}
                  {ev.status === "scheduled" && <CheckCircle2 className="h-3 w-3" />}
                  {ev.status === "upcoming" && <Clock className="h-3 w-3" />}
                  {ev.status === "urgent"
                    ? "Sắp tới hạn"
                    : ev.status === "scheduled"
                      ? "Định kỳ"
                      : ev.status === "completed"
                        ? "Hoàn thành"
                        : "Trong tháng"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
