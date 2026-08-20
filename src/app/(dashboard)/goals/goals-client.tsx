"use client";

import React, { useState } from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { Plus, Target, ShieldCheck, Plane, Home, Car, Book, Pencil, ArrowDown, ArrowUp } from "lucide-react";
import { formatVND } from "@/lib/format/money";
import { FinanceDialog } from "@/components/finance/finance-dialog";
import { SavingGoalForm } from "@/components/finance/saving-goal-form";
import { ContributionForm } from "@/components/finance/contribution-form";

export function GoalsClient({ goals }: { goals: any[] }) {
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  
  const [isContribFormOpen, setIsContribFormOpen] = useState(false);
  const [contribType, setContribType] = useState<"contribution" | "withdrawal">("contribution");

  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);

  const handleOpenCreateGoal = () => {
    setEditingGoal(null);
    setIsGoalFormOpen(true);
  };

  const handleOpenEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setIsGoalFormOpen(true);
  };

  const handleOpenContrib = (goal: any, type: "contribution" | "withdrawal") => {
    setEditingGoal(goal);
    setContribType(type);
    setIsContribFormOpen(true);
  };

  const getIcon = (iconStr: string) => {
    switch (iconStr) {
      case "plane": return <Plane className="h-5 w-5" />;
      case "shield": return <ShieldCheck className="h-5 w-5" />;
      case "home": return <Home className="h-5 w-5" />;
      case "car": return <Car className="h-5 w-5" />;
      case "book": return <Book className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Mục tiêu tiết kiệm"
        subtitle="Lên kế hoạch và theo dõi các mục tiêu tài chính dài hạn"
        actions={
          <button
            type="button"
            onClick={handleOpenCreateGoal}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm mục tiêu mới</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Tổng số cần tiết kiệm</span>
          <div className="mt-1 text-lg font-bold text-foreground">
            {formatVND(totalTarget)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Đã tiết kiệm được</span>
          <div className="mt-1 text-lg font-bold text-saving">
            {formatVND(totalSaved)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {goals.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center bg-surface-card/20">
            <p className="text-sm text-muted mb-4">Bạn chưa thiết lập mục tiêu tiết kiệm nào.</p>
            <button
              type="button"
              onClick={handleOpenCreateGoal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors border border-border cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tạo mục tiêu đầu tiên
            </button>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const progressPercentage = Math.min(Math.round(progress), 100);
            const isAchieved = goal.status === "achieved";

            return (
              <div
                key={goal.id}
                className={`rounded-2xl border ${isAchieved ? "border-saving/50 bg-saving/5" : "border-border bg-surface/90"} p-5 backdrop-blur transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-10 w-10 items-center justify-center rounded-xl border"
                      style={{ 
                        color: goal.color || "#8B5CF6", 
                        borderColor: `${goal.color || "#8B5CF6"}30`, 
                        backgroundColor: `${goal.color || "#8B5CF6"}10` 
                      }}
                    >
                      {getIcon(goal.icon)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {goal.name}
                        {isAchieved && <span className="text-[10px] bg-saving/20 text-saving px-1.5 py-0.5 rounded font-medium">Hoàn thành</span>}
                      </h3>
                      <p className="text-xs text-muted">
                        Hạn chót: {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('vi-VN') : "Không có"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditGoal(goal)}
                      className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                      title="Sửa mục tiêu"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <span className="rounded-md bg-surface-card px-2 py-1 text-xs font-bold text-income border border-border">
                      {progressPercentage}%
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                    <span>Hiện có: {formatVND(goal.currentAmount)}</span>
                    <span>Mục tiêu: {formatVND(goal.targetAmount)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isAchieved ? "bg-saving" : "bg-gradient-to-r from-saving to-income"}`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 pt-4 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => handleOpenContrib(goal, "contribution")}
                    disabled={goal.status === "cancelled"}
                    className="flex-1 flex justify-center items-center gap-1.5 rounded-lg bg-surface border border-border py-2 text-xs font-medium text-saving hover:bg-saving/10 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    Góp thêm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenContrib(goal, "withdrawal")}
                    disabled={goal.status === "cancelled" || goal.currentAmount <= 0}
                    className="flex-1 flex justify-center items-center gap-1.5 rounded-lg bg-surface border border-border py-2 text-xs font-medium text-expense hover:bg-expense/10 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    Rút bớt
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <FinanceDialog
        isOpen={isGoalFormOpen}
        onClose={() => setIsGoalFormOpen(false)}
        title={editingGoal ? "Cập nhật mục tiêu" : "Tạo mục tiêu mới"}
        description={editingGoal ? "Chỉnh sửa thông tin mục tiêu tiết kiệm" : "Lên kế hoạch cho các mục tiêu tài chính của bạn"}
      >
        <SavingGoalForm
          goal={editingGoal}
          onSuccess={() => setIsGoalFormOpen(false)}
          onCancel={() => setIsGoalFormOpen(false)}
        />
      </FinanceDialog>

      <FinanceDialog
        isOpen={isContribFormOpen}
        onClose={() => setIsContribFormOpen(false)}
        title={contribType === "contribution" ? "Góp thêm tiền" : "Rút bớt tiền"}
        description={contribType === "contribution" ? `Đóng góp vào mục tiêu: ${editingGoal?.name}` : `Rút tiền từ mục tiêu: ${editingGoal?.name}`}
      >
        {editingGoal && (
          <ContributionForm
            goalId={editingGoal.id}
            currentAmount={editingGoal.currentAmount}
            type={contribType}
            onSuccess={() => setIsContribFormOpen(false)}
            onCancel={() => setIsContribFormOpen(false)}
          />
        )}
      </FinanceDialog>
    </div>
  );
}
