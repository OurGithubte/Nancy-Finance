"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { FinanceDialog } from "@/components/finance/finance-dialog";
import { FinanceDrawer } from "@/components/finance/finance-drawer";
import { TransactionForm } from "@/components/finance/transaction-form";
import { signOut } from "@/lib/auth/auth-client";
import {
  Wallet,
  CreditCard,
  Building2,
  PieChart,
  Target,
  CalendarDays,
  Settings,
  LogOut,
  X,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setIsMobileMenuOpen(false);
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const extraMobileMenuItems = [
    { href: "/accounts", label: "Tài khoản & Ví", icon: Wallet },
    { href: "/credit-cards", label: "Thẻ tín dụng", icon: CreditCard },
    { href: "/loans", label: "Khoản vay & Nợ", icon: Building2 },
    { href: "/budgets", label: "Ngân sách", icon: PieChart },
    { href: "/goals", label: "Mục tiêu tiết kiệm", icon: Target },
    { href: "/calendar", label: "Lịch tài chính", icon: CalendarDays },
    { href: "/settings", label: "Cài đặt tài khoản", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <AppSidebar onQuickExpense={() => setIsQuickExpenseOpen(true)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Mobile Header */}
        <AppHeader />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav
          onQuickExpense={() => setIsQuickExpenseOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
      </div>

      {/* Quick Expense Dialog for Desktop */}
      <div className="hidden sm:block">
        <FinanceDialog
          isOpen={isQuickExpenseOpen}
          onClose={() => setIsQuickExpenseOpen(false)}
          title="Ghi chi tiêu nhanh"
          description="Thêm giao dịch thu / chi / chuyển khoản mới"
          maxWidth="md"
        >
          <TransactionForm
            onSuccess={() => setIsQuickExpenseOpen(false)}
            onCancel={() => setIsQuickExpenseOpen(false)}
          />
        </FinanceDialog>
      </div>

      {/* Quick Expense Drawer for Mobile */}
      <div className="sm:hidden">
        <FinanceDrawer
          isOpen={isQuickExpenseOpen}
          onClose={() => setIsQuickExpenseOpen(false)}
          title="Ghi chi tiêu nhanh"
          description="Thêm giao dịch thu / chi / chuyển khoản"
        >
          <TransactionForm
            onSuccess={() => setIsQuickExpenseOpen(false)}
            onCancel={() => setIsQuickExpenseOpen(false)}
          />
        </FinanceDrawer>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-full rounded-t-3xl border-t border-border bg-surface p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground">
                Menu chức năng
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-1.5 pb-6">
              {extraMobileMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-surface-card transition-colors"
                  >
                    <Icon className="h-4 w-4 text-muted" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="pt-3 mt-3 border-t border-border">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-expense hover:bg-expense/10 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
