import React from "react";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { creditCardsRepository } from "@/server/repositories/credit-cards";
import { accountsService } from "@/server/services/accounts";
import { CreditCardsClient } from "./credit-cards-client";

export default async function CreditCardsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/login");
  }

  const creditCards = await creditCardsRepository.getCreditCards(session.user.id);
  const accounts = await accountsService.getAccounts(session.user.id);
  const activeAccounts = accounts.filter(a => a.isActive);

  const mappedCards = creditCards.map(c => {
    const available = c.creditLimit - c.currentBalance;
    const usedPercentage = c.creditLimit > 0 ? Math.round((c.currentBalance / c.creditLimit) * 100) : 0;
    return {
      id: c.id,
      name: c.name,
      bankName: c.bankName,
      last4: c.last4Digits,
      creditLimit: c.creditLimit,
      currentBalance: c.currentBalance,
      availableLimit: available,
      usedPercentage,
      statementDay: c.statementDay,
      dueDay: `Ngày ${c.dueDay} hàng tháng`,
      color: c.color || undefined,
    };
  });

  return <CreditCardsClient cards={mappedCards} accounts={activeAccounts} />;
}
