import { db } from "@/db";
import { transactions } from "@/db/schema";
import { accountsRepository, CreateAccountData, UpdateAccountData } from "../repositories/accounts";
import { or, eq } from "drizzle-orm";

export class AccountsService {
  async getAccounts(userId: string) {
    return accountsRepository.getAccountsByUserId(userId);
  }

  async getAccount(id: string, userId: string) {
    return accountsRepository.getAccountById(id, userId);
  }

  async createAccount(data: CreateAccountData) {
    return accountsRepository.createAccount(data);
  }

  async updateAccount(id: string, userId: string, data: UpdateAccountData) {
    return accountsRepository.updateAccount(id, userId, data);
  }

  async deleteAccount(id: string, userId: string) {
    const txs = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(or(eq(transactions.accountId, id), eq(transactions.toAccountId, id)))
      .limit(1);
      
    if (txs.length > 0) {
      // Has transactions, archive it
      return accountsRepository.updateAccount(id, userId, { isActive: false });
    } else {
      // No transactions, safe to delete
      return accountsRepository.deleteAccount(id, userId);
    }
  }
}

export const accountsService = new AccountsService();
