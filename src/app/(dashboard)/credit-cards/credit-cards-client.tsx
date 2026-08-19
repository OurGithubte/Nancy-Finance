"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { CreditCardListCard } from "@/components/finance/credit-card-card";
import { FinanceDialog } from "@/components/finance/finance-dialog";
import { formatVND } from "@/lib/format/money";
import { createCreditCardAction } from "./actions";

export function CreditCardsClient({
  cards,
  accounts,
}: {
  cards: any[];
  accounts: any[];
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const totalLimit = cards.reduce((acc, c) => acc + c.creditLimit, 0);
  const totalUsed = cards.reduce((acc, c) => acc + c.currentBalance, 0);
  const totalAvailable = totalLimit - totalUsed;

  const [formData, setFormData] = useState({
    name: "",
    bankName: "",
    last4Digits: "",
    creditLimit: 0,
    statementDay: 20,
    dueDay: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCreditCardAction(formData);
      setIsAddOpen(false);
      // Reset form could go here
    } catch (err) {
      console.error(err);
      alert("Lỗi khi thêm thẻ.");
    }
  };

  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<any>(null);

  const [txAmount, setTxAmount] = useState(0);
  const [txDesc, setTxDesc] = useState("");
  const [payAccount, setPayAccount] = useState(accounts[0]?.id || "");

  const handleExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard || txAmount <= 0) return;
    try {
      const { createCreditCardTransactionAction } = await import("./actions");
      await createCreditCardTransactionAction({
        creditCardId: activeCard.id,
        amount: txAmount,
        description: txDesc,
        transactionDate: new Date(),
        status: "posted",
        category: null,
      });
      setIsExpenseOpen(false);
      setTxAmount(0);
      setTxDesc("");
    } catch (err) {
      console.error(err);
      alert("Lỗi ghi chi tiêu thẻ.");
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard || txAmount <= 0 || !payAccount) return;
    try {
      const { createCreditCardPaymentAction } = await import("./actions");
      await createCreditCardPaymentAction({
        creditCardId: activeCard.id,
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
      alert("Lỗi thanh toán thẻ.");
    }
  };

  const openExpense = (card: any) => {
    setActiveCard(card);
    setTxAmount(0);
    setTxDesc("");
    setIsExpenseOpen(true);
  };

  const openPayment = (card: any) => {
    setActiveCard(card);
    setTxAmount(card.currentBalance);
    setTxDesc("Thanh toán dư nợ thẻ " + card.name);
    setIsPaymentOpen(true);
  };

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Thẻ tín dụng"
        subtitle="Quản lý hạn mức chi tiêu, ngày sao kê và hạn trả nợ thẻ"
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm thẻ tín dụng</span>
          </button>
        }
      />

      {/* Overview stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Tổng hạn mức cấp</span>
          <div className="mt-1 text-lg font-bold text-foreground">
            {formatVND(totalLimit)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Dư nợ đã chi tiêu</span>
          <div className="mt-1 text-lg font-bold text-expense">
            {formatVND(totalUsed)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Hạn mức khả dụng</span>
          <div className="mt-1 text-lg font-bold text-income">
            {formatVND(totalAvailable)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CreditCardListCard cards={cards} onExpense={openExpense} onPayment={openPayment} />
      </div>

      <FinanceDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Thêm thẻ tín dụng mới"
        description="Nhập thông tin thẻ tín dụng của bạn"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Tên thẻ / Mô tả</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Ngân hàng phát hành</label>
            <input required type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">4 Số cuối thẻ</label>
            <input required type="text" maxLength={4} value={formData.last4Digits} onChange={e => setFormData({...formData, last4Digits: e.target.value})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Hạn mức (VND)</label>
            <input required type="number" min={0} value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Ngày sao kê (1-31)</label>
              <input required type="number" min={1} max={31} value={formData.statementDay} onChange={e => setFormData({...formData, statementDay: Number(e.target.value)})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Ngày đến hạn (1-31)</label>
              <input required type="number" min={1} max={31} value={formData.dueDay} onChange={e => setFormData({...formData, dueDay: Number(e.target.value)})} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 rounded-xl border border-border bg-surface-card py-2.5 text-xs font-semibold hover:bg-surface-hover">Hủy</button>
            <button type="submit" className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-slate-950 hover:bg-primary-hover">Thêm thẻ</button>
          </div>
        </form>
      </FinanceDialog>

      {/* Dialog for Expense */}
      <FinanceDialog isOpen={isExpenseOpen} onClose={() => setIsExpenseOpen(false)} title={`Tiêu thẻ: ${activeCard?.name || ''}`} maxWidth="sm">
        <form onSubmit={handleExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Số tiền tiêu (VND)</label>
            <input required type="number" min={1} value={txAmount} onChange={e => setTxAmount(Number(e.target.value))} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Mô tả / Ghi chú</label>
            <input required type="text" value={txDesc} onChange={e => setTxDesc(e.target.value)} className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsExpenseOpen(false)} className="flex-1 rounded-xl border border-border bg-surface-card py-2.5 text-xs font-semibold hover:bg-surface-hover">Hủy</button>
            <button type="submit" className="flex-1 rounded-xl bg-expense py-2.5 text-xs font-bold text-slate-100 hover:bg-expense/80">Lưu giao dịch</button>
          </div>
        </form>
      </FinanceDialog>

      {/* Dialog for Payment */}
      <FinanceDialog isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title={`Thanh toán dư nợ: ${activeCard?.name || ''}`} maxWidth="sm">
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
