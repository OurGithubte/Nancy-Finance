import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { categoriesService } from "@/server/services/categories";
import { ensureDefaultCategories } from "@/server/services/seed";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function CategoriesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/sign-in");
  }

  const userId = session.user.id;
  await ensureDefaultCategories(userId);

  const allCategories = await categoriesService.getCategories(userId);
  const incomeCategories = allCategories.filter((c) => c.type === "income");
  const expenseCategories = allCategories.filter((c) => c.type === "expense");

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Danh mục Thu/Chi"
        subtitle="Quản lý danh mục giao dịch của bạn"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface/90 p-5">
          <h2 className="text-lg font-semibold text-expense mb-4">Chi tiêu</h2>
          <div className="space-y-2">
            {expenseCategories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-card">
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${c.color}20`, color: c.color }}
                >
                  {/* Using an icon placeholder since dynamic Lucide icons require more setup */}
                  <span className="font-bold">{c.name.charAt(0)}</span>
                </div>
                <div className="flex-1 font-medium">{c.name}</div>
                {c.isSystem ? (
                  <span className="text-xs text-muted bg-surface px-2 py-1 rounded">Hệ thống</span>
                ) : (
                  <button className="text-xs text-primary hover:underline">Sửa</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/90 p-5">
          <h2 className="text-lg font-semibold text-income mb-4">Thu nhập</h2>
          <div className="space-y-2">
            {incomeCategories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-card">
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${c.color}20`, color: c.color }}
                >
                  <span className="font-bold">{c.name.charAt(0)}</span>
                </div>
                <div className="flex-1 font-medium">{c.name}</div>
                {c.isSystem ? (
                  <span className="text-xs text-muted bg-surface px-2 py-1 rounded">Hệ thống</span>
                ) : (
                  <button className="text-xs text-primary hover:underline">Sửa</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
