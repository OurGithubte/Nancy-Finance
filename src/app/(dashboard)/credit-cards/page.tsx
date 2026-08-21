import React from "react";
import { requireUser } from "@/lib/auth/server";
import { creditCardsRepository } from "@/server/repositories/credit-cards";
import { accountsService } from "@/server/services/accounts";
import { CreditCardsClient } from "./credit-cards-client";

export default async function CreditCardsPage() {
  const user = await requireUser();

  const [creditCards, accounts] = await Promise.all([
    creditCardsRepository.getCreditCards(user.id),
    accountsService.getAccounts(user.id),
  ]);
  const activeAccounts = accounts.filter((a) => a.isActive);

  const mappedCards = creditCards.map((c) => {
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
