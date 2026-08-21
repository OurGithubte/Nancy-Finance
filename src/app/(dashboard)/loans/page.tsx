import React from "react";
import { requireUser } from "@/lib/auth/server";
import { loansRepository } from "@/server/repositories/loans";
import { accountsService } from "@/server/services/accounts";
import { LoansClient } from "./loans-client";

export default async function LoansPage() {
  const user = await requireUser();

  const [loans, accounts] = await Promise.all([
    loansRepository.getLoans(user.id),
    accountsService.getAccounts(user.id),
  ]);
  const activeAccounts = accounts.filter((a) => a.isActive);

  const mappedLoans = loans.map((l) => {
    const paid = l.totalAmount - l.remainingAmount;
    const paidPercentage = l.totalAmount > 0 ? Math.round((paid / l.totalAmount) * 100) : 0;
    return {
      id: l.id,
      name: l.name,
      lenderName: l.lenderName,
      totalAmount: l.totalAmount,
      remainingAmount: l.remainingAmount,
      monthlyPayment: l.monthlyPayment,
      totalTerms: l.totalTerms,
      remainingTerms: l.remainingTerms,
      interestRate: Number(l.interestRate),
      paidPercentage,
      color: l.color || undefined,
    };
  });

  return <LoansClient loans={mappedLoans} accounts={activeAccounts} />;
}
