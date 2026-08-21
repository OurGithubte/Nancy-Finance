"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { AccountListCard } from "@/components/finance/account-card";
import { FinanceDialog } from "@/components/finance/finance-dialog";
import { formatVND } from "@/lib/format/money";
import { createAccountAction, updateAccountAction, deleteAccountAction } from "./actions";

export type AccountType = "cash" | "bank" | "ewallet" | "savings" | "investment";

export interface AccountRow {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  accountNumber: string | null;
  bankCode: string | null;
  isExcludedFromTotal: boolean;
  isActive: boolean;
}

interface AccountFormState {
  name: string;
  type: AccountType;
  balance: number;
  accountNumber: string;
  bankCode: string;
  isExcludedFromTotal: boolean;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Ngân hàng",
  cash: "Tiền mặt",
  ewallet: "Ví điện tử",
  savings: "Tiết kiệm",
  investment: "Đầu tư",
};

const EMPTY_FORM: AccountFormState = {
  name: "",
  type: "bank",
  balance: 0,
  accountNumber: "",
  bankCode: "",
  isExcludedFromTotal: false,
};

function toFormState(account: AccountRow): AccountFormState {
  return {
    name: account.name,
    type: account.type,
    balance: account.balance,
    accountNumber: account.accountNumber ?? "",
    bankCode: account.bankCode ?? "",
    isExcludedFromTotal: account.isExcludedFromTotal,
  };
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function AccountsClient({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<AccountRow | null>(null);

  const [addForm, setAddForm] = useState<AccountFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<AccountFormState>(EMPTY_FORM);

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Chỉ những tài khoản KHÔNG bị isExcludedFromTotal mới được cộng vào tài sản.
  const includedAccounts = accounts.filter((a) => !a.isExcludedFromTotal);
  const totalBalance = includedAccounts.reduce((sum, a) => sum + a.balance, 0);

  const byType = (type: AccountType) => accounts.filter((a) => a.type === type);
  const sumIncluded = (list: AccountRow[]) =>
    list.filter((a) => !a.isExcludedFromTotal).reduce((sum, a) => sum + a.balance, 0);

  const bankAccounts = byType("bank");
  const cashAccounts = byType("cash");
  const ewalletAccounts = byType("ewallet");
  const savingsAccounts = byType("savings");
  const investmentAccounts = byType("investment");

  const assetBreakdown: Array<{ key: string; label: string; count: number; amount: number }> = [
    { key: "bank", label: "Tài khoản Ngân hàng", count: bankAccounts.length, amount: sumIncluded(bankAccounts) },
    { key: "cash", label: "Tiền mặt", count: cashAccounts.length, amount: sumIncluded(cashAccounts) },
    { key: "ewallet", label: "Ví điện tử", count: ewalletAccounts.length, amount: sumIncluded(ewalletAccounts) },
    { key: "savings", label: "Tiết kiệm có kỳ hạn", count: savingsAccounts.length, amount: sumIncluded(savingsAccounts) },
    { key: "investment", label: "Đầu tư", count: investmentAccounts.length, amount: sumIncluded(investmentAccounts) },
  ];

  const openAddModal = () => {
    setAddForm(EMPTY_FORM);
    setAddError(null);
    setIsAddOpen(true);
  };

  const closeAddModal = () => {
    if (isCreating) return;
    setIsAddOpen(false);
  };

  const openEditModal = (account: AccountRow) => {
    setEditForm(toFormState(account));
    setEditError(null);
    setEditingAccount(account);
  };

  const closeEditModal = () => {
    if (isUpdating) return;
    setEditingAccount(null);
  };

  const openDeleteConfirm = (account: AccountRow) => {
    setDeleteError(null);
    setDeletingAccount(account);
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) return;
    setDeletingAccount(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;

    const name = addForm.name.trim();
    if (!name) {
      setAddError("Tên tài khoản không được để trống.");
      return;
    }

    setIsCreating(true);
    setAddError(null);
    try {
      await createAccountAction({
        name,
        type: addForm.type,
        balance: Math.round(Number(addForm.balance) || 0),
        accountNumber: addForm.accountNumber.trim() || null,
        bankCode: addForm.bankCode.trim() || null,
        isExcludedFromTotal: addForm.isExcludedFromTotal,
      });
      setIsAddOpen(false);
      setAddForm(EMPTY_FORM);
      router.refresh();
    } catch (err) {
      setAddError(getErrorMessage(err, "Có lỗi xảy ra khi thêm tài khoản. Vui lòng thử lại."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdating || !editingAccount) return;

    const name = editForm.name.trim();
    if (!name) {
      setEditError("Tên tài khoản không được để trống.");
      return;
    }

    setIsUpdating(true);
    setEditError(null);
    try {
      await updateAccountAction(editingAccount.id, {
        name,
        type: editForm.type,
        balance: Math.round(Number(editForm.balance) || 0),
        accountNumber: editForm.accountNumber.trim() || null,
        bankCode: editForm.bankCode.trim() || null,
        isExcludedFromTotal: editForm.isExcludedFromTotal,
      });
      setEditingAccount(null);
      router.refresh();
    } catch (err) {
      setEditError(getErrorMessage(err, "Có lỗi xảy ra khi cập nhật tài khoản. Vui lòng thử lại."));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (isDeleting || !deletingAccount) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccountAction(deletingAccount.id);
      setDeletingAccount(null);
      router.refresh();
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Có lỗi xảy ra khi xóa tài khoản. Vui lòng thử lại."));
    } finally {
      setIsDeleting(false);
    }
  };

  const showAccountNumberField = (type: AccountType) =>
    type === "bank" || type === "savings" || type === "ewallet";
  const showBankCodeField = (type: AccountType) => type === "bank";

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Tài khoản & Ví"
        subtitle="Quản lý các tài khoản ngân hàng, ví điện tử và tiền mặt"
        actions={
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm tài khoản</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AccountListCard
          accounts={accounts}
          totalBalance={totalBalance}
          onEdit={openEditModal}
          onDelete={openDeleteConfirm}
        />

        <div className="rounded-2xl border border-border bg-surface/90 p-5 backdrop-blur flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Cơ cấu tài sản</h3>
            <p className="text-xs text-muted mt-1">Phân bổ số dư theo loại tài khoản</p>

            <div className="mt-4 space-y-3">
              {assetBreakdown.map((row) => (
                <div key={row.key} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    {row.label} ({row.count})
                  </span>
                  <span className="font-semibold text-foreground">{formatVND(row.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Thêm tài khoản */}
      <FinanceDialog isOpen={isAddOpen} onClose={closeAddModal} title="Thêm tài khoản" maxWidth="md">
        <form onSubmit={handleCreateSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Tên tài khoản</label>
            <input
              required
              type="text"
              placeholder="VD: VIB, Tiền mặt, MoMo"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Loại tài khoản</label>
            <select
              value={addForm.type}
              onChange={(e) => setAddForm({ ...addForm, type: e.target.value as AccountType })}
              className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Số dư ban đầu (VND)</label>
            <input
              required
              type="number"
              step={1}
              value={addForm.balance}
              onChange={(e) => setAddForm({ ...addForm, balance: Number(e.target.value) })}
              className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
            />
          </div>
          {showAccountNumberField(addForm.type) && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Số tài khoản (tùy chọn)</label>
              <input
                type="text"
                value={addForm.accountNumber}
                onChange={(e) => setAddForm({ ...addForm, accountNumber: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
              />
            </div>
          )}
          {showBankCodeField(addForm.type) && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Mã ngân hàng (tùy chọn)</label>
              <input
                type="text"
                value={addForm.bankCode}
                onChange={(e) => setAddForm({ ...addForm, bankCode: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={addForm.isExcludedFromTotal}
              onChange={(e) => setAddForm({ ...addForm, isExcludedFromTotal: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-surface-card accent-primary"
            />
            Không tính vào tổng tài sản
          </label>

          {addError && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {addError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeAddModal}
              disabled={isCreating}
              className="flex-1 rounded-xl border border-border bg-surface-card py-2.5 text-xs font-semibold hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-slate-950 hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Lưu tài khoản
            </button>
          </div>
        </form>
      </FinanceDialog>

      {/* Modal: Sửa tài khoản */}
      <FinanceDialog isOpen={!!editingAccount} onClose={closeEditModal} title="Sửa tài khoản" maxWidth="md">
        <form onSubmit={handleUpdateSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Tên tài khoản</label>
            <input
              required
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Loại tài khoản</label>
            <select
              value={editForm.type}
              onChange={(e) => setEditForm({ ...editForm, type: e.target.value as AccountType })}
              className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Số dư (VND)</label>
            <input
              required
              type="number"
              step={1}
              value={editForm.balance}
              onChange={(e) => setEditForm({ ...editForm, balance: Number(e.target.value) })}
              className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
            />
          </div>
          {showAccountNumberField(editForm.type) && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Số tài khoản (tùy chọn)</label>
              <input
                type="text"
                value={editForm.accountNumber}
                onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
              />
            </div>
          )}
          {showBankCodeField(editForm.type) && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Mã ngân hàng (tùy chọn)</label>
              <input
                type="text"
                value={editForm.bankCode}
                onChange={(e) => setEditForm({ ...editForm, bankCode: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary"
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={editForm.isExcludedFromTotal}
              onChange={(e) => setEditForm({ ...editForm, isExcludedFromTotal: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-surface-card accent-primary"
            />
            Không tính vào tổng tài sản
          </label>

          {editError && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {editError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeEditModal}
              disabled={isUpdating}
              className="flex-1 rounded-xl border border-border bg-surface-card py-2.5 text-xs font-semibold hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-slate-950 hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </FinanceDialog>

      {/* Modal: Xác nhận xóa tài khoản */}
      <FinanceDialog
        isOpen={!!deletingAccount}
        onClose={closeDeleteConfirm}
        title="Xóa tài khoản?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Bạn có chắc muốn xóa tài khoản{" "}
            <span className="font-semibold text-foreground">{deletingAccount?.name}</span>? Tài khoản
            chưa có giao dịch sẽ được xóa hẳn. Nếu tài khoản đã có lịch sử giao dịch, hệ thống sẽ tự
            động lưu trữ (archive) để bảo toàn dữ liệu tài chính thay vì xóa vĩnh viễn.
          </p>

          {deleteError && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {deleteError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeDeleteConfirm}
              disabled={isDeleting}
              className="flex-1 rounded-xl border border-border bg-surface-card py-2.5 text-xs font-semibold hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-500 py-2.5 text-xs font-bold text-slate-50 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Xóa tài khoản
            </button>
          </div>
        </div>
      </FinanceDialog>
    </div>
  );
}
