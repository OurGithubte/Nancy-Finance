"use client";

import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatVND } from "@/lib/format/money";

export default function CalendarPage() {
  const events = [
    {
      id: "ev_1",
      date: "20/05/2025",
      title: "Ngày sao kê thẻ VCB Visa Platinum",
      amount: null,
      type: "statement",
      status: "upcoming",
    },
    {
      id: "ev_2",
      date: "25/05/2025",
      title: "Hạn thanh toán thẻ VCB Visa",
      amount: 18000000,
      type: "payment_due",
      status: "urgent",
    },
    {
      id: "ev_3",
      date: "28/05/2025",
      title: "Trả góp xe Toyota tháng 5",
      amount: 11200000,
      type: "loan_due",
      status: "upcoming",
    },
    {
      id: "ev_4",
      date: "05/06/2025",
      title: "Nhận lương công ty",
      amount: 35000000,
      type: "income",
      status: "scheduled",
    },
  ];

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Lịch tài chính"
        subtitle="Lịch sự kiện, ngày sao kê, hạn trả nợ và nhắc nhở đóng tiền"
      />

      <div className="space-y-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-colors hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-200">{ev.title}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Ngày: {ev.date}</p>
              </div>
            </div>

            <div className="text-right">
              {ev.amount ? (
                <div className="text-xs font-bold text-slate-100">
                  {formatVND(ev.amount)}
                </div>
              ) : (
                <span className="text-xs text-slate-400">Sao kê định kỳ</span>
              )}
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium mt-0.5 ${
                  ev.status === "urgent"
                    ? "text-rose-400"
                    : ev.status === "scheduled"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {ev.status === "urgent" && <AlertTriangle className="h-3 w-3" />}
                {ev.status === "scheduled" && <CheckCircle2 className="h-3 w-3" />}
                {ev.status === "upcoming" && <Clock className="h-3 w-3" />}
                {ev.status === "urgent"
                  ? "Sắp tới hạn"
                  : ev.status === "scheduled"
                  ? "Định kỳ"
                  : "Trong tháng"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
