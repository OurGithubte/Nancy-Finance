import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { transactions, categories, financialAccounts } from "@/db/schema";
import { and, eq, gte, lt, desc } from "drizzle-orm";
import { getReportPeriodDates, InvalidReportPeriodError } from "@/server/services/reports";
import { ReportPeriodType } from "@/types/reports";
import { formatDateVN, formatDateVNSortable } from "@/lib/format/date";
import { z } from "zod";

const exportQuerySchema = z.object({
  period: z.enum(["this_month", "last_month", "last_3_months", "last_6_months", "this_year", "custom"]).default("this_month"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

function escapeCSV(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '""';
  let str = String(field);
  
  // Guard against CSV injection formula and invisible triggering characters
  const injectionChars = ["=", "+", "-", "@", "\t", "\r", "\n"];
  if (injectionChars.some(char => str.startsWith(char))) {
    str = "'" + str; // Prefix with single quote to force text evaluation
  }

  // Escape quotes
  str = str.replace(/"/g, '""');

  // If contains quotes, commas, or newlines, wrap in quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str}"`;
  }
  return str;
}

export async function generateCSV(userId: string, periodType: ReportPeriodType, customFrom?: string | null, customTo?: string | null) {
  const { startDate, endDate } = getReportPeriodDates(periodType, customFrom, customTo);

  const data = await db
    .select({
      date: transactions.transactionDate,
      type: transactions.type,
      amount: transactions.amount,
      note: transactions.note,
      status: transactions.status,
      categoryName: categories.name,
      accountName: financialAccounts.name,
    })
    .from(transactions)
    .leftJoin(categories, and(eq(transactions.categoryId, categories.id), eq(categories.userId, userId)))
    .leftJoin(financialAccounts, and(eq(transactions.accountId, financialAccounts.id), eq(financialAccounts.userId, userId)))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, startDate),
        lt(transactions.transactionDate, endDate)
      )
    )
    .orderBy(desc(transactions.transactionDate));

  // CSV Headers
  const headersList = ["Ngày", "Loại", "Danh mục", "Tài khoản", "Nội dung", "Số tiền", "Trạng thái"];
  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += headersList.map(escapeCSV).join(",") + "\n";

  for (const row of data) {
    const typeLabel = row.type === "income" ? "Thu nhập" : row.type === "expense" ? "Chi tiêu" : "Chuyển khoản";
    const statusLabel = row.status === "completed" ? "Hoàn thành" : row.status === "pending" ? "Chờ xử lý" : "Đã hủy";
    const rowData = [
      formatDateVN(row.date),
      typeLabel,
      row.categoryName || "",
      row.accountName || "",
      row.note || "",
      row.amount,
      statusLabel
    ];
    csvContent += rowData.map(escapeCSV).join(",") + "\n";
  }

  const filename = `nancy-finance-export-${formatDateVNSortable(startDate)}.csv`;
  return { csvContent, filename };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401, headers: NO_STORE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const parsed = exportQuerySchema.safeParse({
      period: searchParams.get("period") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    });
    if (!parsed.success) {
      return new NextResponse("Tham số truy vấn không hợp lệ", { status: 400, headers: NO_STORE_HEADERS });
    }
    const { period: periodType, from: customFrom, to: customTo } = parsed.data;

    let csvContent: string, filename: string;
    try {
      ({ csvContent, filename } = await generateCSV(session.user.id, periodType, customFrom ?? null, customTo ?? null));
    } catch (err) {
      if (err instanceof InvalidReportPeriodError) {
        return new NextResponse(err.message, { status: 400, headers: NO_STORE_HEADERS });
      }
      throw err;
    }

    return new NextResponse(csvContent, {
      headers: {
        ...NO_STORE_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("CSV Export error", error instanceof Error ? error.message : error);
    return new NextResponse("Internal Server Error", { status: 500, headers: NO_STORE_HEADERS });
  }
}
