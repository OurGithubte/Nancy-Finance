"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { LoanListCard } from "@/components/finance/loan-card";
import { FinanceDialog } from "@/components/finance/finance-dialog";
import { formatVND } from "@/lib/format/money";
import { createLoanAction } from "./actions";

export function LoansClient({ loans, accounts }: { loans: any[], accounts: any[] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeLoan, setActiveLoan] = useState<any>(null);

  const [txAmount, setTxAmount] = useState(0);
  const [txDesc, setTxDesc] = useState("");
  const [payAccount, setPayAccount] = useState(accounts[0]?.id || "");

  const totalDebt = loans.reduce((acc, l) => acc + l.remainingAmount, 0);
  const totalMonthly = loans.reduce((acc, l) => acc + l.monthlyPayment, 0);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoan || txAmount <= 0 || !payAccount) return;
    try {
      const { createLoanPaymentAction } = await import("./actions");
      await createLoanPaymentAction({
        loanId: activeLoan.id,
        amount: txAmount,
        accountId: payAccount,
        paymentDate: new Date(),
        note: txDesc,
      });
      setIsPaymentOpen(false);
      setTxAmount(0);
      setTxDesc("");
    } catch (err) {
      console.error(err);
      alert("Lỗi thanh toán khoản vay.");
    }
  };

  const openPayment = (loan: any) => {
    setActiveLoan(loan);
    setTxAmount(loan.monthlyPayment || loan.remainingAmount);
    setTxDesc("Thanh toán khoản vay " + loan.name);
    setIsPaymentOpen(true);
  };

  const [formData, setFormData] = useState({
    name: "",
    lenderName: "",
    type: "consumer" as "car" | "home" | "consumer" | "business" | "student",
    totalAmount: 0,
    remainingAmount: 0,
    monthlyPayment: 0,
    interestRate: "0.00",
    totalTerms: 12,
    remainingTerms: 12,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLoanAction({
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        interestRate: formData.interestRate,
        status: "active",
      });
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi thêm khoản vay.");
    }
  };

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Khoản vay & Nợ"
        subtitle="Theo dõi tiến độ thanh toán nợ gốc, lãi suất và lịch trả góp"
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm khoản vay</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Tổng dư nợ còn lại</span>
          <div className="mt-1 text-xl font-bold text-expense">
            {formatVND(totalDebt)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Tổng trả hàng tháng</span>
          <div className="mt-1 text-xl font-bold text-warning">
            {formatVND(totalMonthly)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <LoanListCard loans={loans} onPayment={openPayment} />
      </div>

      <FinanceDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Thêm khoản vay mới"
        description="Nhập thông tin khoản vay hoặc nợ"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Tên khoản vay</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Người/Tổ chức cho vay</label>
            <input required type="text" value={formData.lenderName} onChange={e => setFormData({...formData, lenderName: e.target.value})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Tổng tiền vay (VND)</label>
              <input required type="number" min={0} value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Còn nợ (VND)</label>
              <input required type="number" min={0} value={formData.remainingAmount} onChange={e => setFormData({...formData, remainingAmount: Number(e.target.value)})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Tổng số kỳ</label>
              <input required type="number" min={1} value={formData.totalTerms} onChange={e => setFormData({...formData, totalTerms: Number(e.target.value)})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Kỳ còn lại</label>
              <input required type="number" min={0} value={formData.remainingTerms} onChange={e => setFormData({...formData, remainingTerms: Number(e.target.value)})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Trả hàng tháng (VND)</label>
              <input required type="number" min={0} value={formData.monthlyPayment} onChange={e => setFormData({...formData, monthlyPayment: Number(e.target.value)})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Lãi suất (%/năm)</label>
              <input required type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: e.target.value})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Ngày bắt đầu</label>
              <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Ngày kết thúc</label>
              <input required type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 rounded-xl border border-border bg-surface-card py-2.5 text-xs font-semibold hover:bg-surface-hover">Hủy</button>
            <button type="submit" className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-slate-950 hover:bg-primary-hover">Thêm khoản vay</button>
          </div>
        </form>
      </FinanceDialog>

      {/* Dialog for Payment */}
      <FinanceDialog isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title={`Thanh toán nợ: ${activeLoan?.name || ''}`} maxWidth="sm">
        <form onSubmit={handlePayment} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Số tiền thanh toán (VND)</label>
            <input required type="number" min={1} value={txAmount} onChange={e => setTxAmount(Number(e.target.value))} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Từ tài khoản/ví</label>
            <select value={payAccount} onChange={e => setPayAccount(e.target.value)} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatVND(a.balance)})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Ghi chú</label>
            <input type="text" value={txDesc} onChange={e => setTxDesc(e.target.value)} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsPaymentOpen(false)} className="flex-1 rounded-xl border border-border bg-surface-card py-2.5 text-xs font-semibold hover:bg-surface-hover">Hủy</button>
            <button type="submit" className="flex-1 rounded-xl bg-saving py-2.5 text-xs font-bold text-slate-100 hover:bg-saving/80">Thanh toán</button>
          </div>
        </form>
      </FinanceDialog>
    </div>
  );
}
