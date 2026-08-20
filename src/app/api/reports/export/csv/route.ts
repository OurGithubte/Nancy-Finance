import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { transactions, categories, financialAccounts } from "@/db/schema";
import { and, eq, gte, lt, desc } from "drizzle-orm";
import { getReportPeriodDates } from "@/server/services/reports";
import { ReportPeriodType } from "@/types/reports";
import { formatDateVN, formatDateVNSortable } from "@/lib/format/date";

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
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
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
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const periodType = (searchParams.get("period") || "this_month") as ReportPeriodType;
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    const { csvContent, filename } = await generateCSV(session.user.id, periodType, customFrom, customTo);

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("CSV Export error", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
