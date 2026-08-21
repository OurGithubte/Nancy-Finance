import React from "react";
import { requireUser } from "@/lib/auth/server";
import { accountsService } from "@/server/services/accounts";
import { AccountsClient, type AccountRow } from "./accounts-client";

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await accountsService.getAccounts(user.id);

  const activeAccounts: AccountRow[] = accounts
    .filter((a) => a.isActive)
    .map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance,
      accountNumber: a.accountNumber,
      bankCode: a.bankCode,
      isExcludedFromTotal: a.isExcludedFromTotal,
      isActive: a.isActive,
    }));

  return <AccountsClient accounts={activeAccounts} />;
}
