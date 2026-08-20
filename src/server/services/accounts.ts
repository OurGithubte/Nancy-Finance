import { db } from "@/db";
import { transactions } from "@/db/schema";
import { accountsRepository, CreateAccountData, UpdateAccountData } from "../repositories/accounts";
import { or, eq, and } from "drizzle-orm";
import { z } from "zod";

const ACCOUNT_TYPES = ["cash", "bank", "ewallet", "savings", "investment"] as const;

// Whitelist tạo mới: id/userId do server sinh ở action layer, KHÔNG nhận từ client.
const createAccountSchema = z
  .object({
    name: z.string().trim().min(1, "Tên tài khoản không được để trống").max(255),
    type: z.enum(ACCOUNT_TYPES),
    balance: z.number().int("Số dư phải là số nguyên (VND)").optional(),
    accountNumber: z.string().max(64).nullable().optional(),
    bankCode: z.string().max(32).nullable().optional(),
    color: z.string().max(32).optional(),
    icon: z.string().max(64).optional(),
    isExcludedFromTotal: z.boolean().optional(),
  })
  .strict();

// Whitelist cập nhật: KHÔNG nhận id, userId, createdAt, updatedAt dù client gửi kèm.
const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1, "Tên tài khoản không được để trống").max(255).optional(),
    type: z.enum(ACCOUNT_TYPES).optional(),
    balance: z.number().int("Số dư phải là số nguyên (VND)").optional(),
    accountNumber: z.string().max(64).nullable().optional(),
    bankCode: z.string().max(32).nullable().optional(),
    color: z.string().max(32).optional(),
    icon: z.string().max(64).optional(),
    isExcludedFromTotal: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export class AccountsService {
  async getAccounts(userId: string) {
    return accountsRepository.getAccountsByUserId(userId);
  }

  async getAccount(id: string, userId: string) {
    return accountsRepository.getAccountById(id, userId);
  }

  async createAccount(data: CreateAccountData) {
    const { id, userId, createdAt: _createdAt, updatedAt: _updatedAt, ...clientPayload } = data as CreateAccountData & {
      createdAt?: unknown;
      updatedAt?: unknown;
    };
    const payload = createAccountSchema.parse(clientPayload);
    return accountsRepository.createAccount({
      ...payload,
      balance: payload.balance ?? 0,
      id,
      userId,
    });
  }

  async updateAccount(id: string, userId: string, data: UpdateAccountData) {
    const payload = updateAccountSchema.parse(data);
    return accountsRepository.updateAccount(id, userId, payload);
  }

  async deleteAccount(id: string, userId: string) {
    // Xác thực ownership TRƯỚC khi kiểm tra transaction references, tránh user A
    // suy luận được sự tồn tại/trạng thái account của user B qua timing/behaviour.
    const owned = await accountsRepository.getAccountById(id, userId);
    if (!owned) {
      throw new Error("Account not found or access denied");
    }

    const txs = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          or(eq(transactions.accountId, id), eq(transactions.toAccountId, id))
        )
      )
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
