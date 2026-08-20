import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { ReportService } from "@/server/services/reports";
import { ReportPeriodType } from "@/types/reports";
import { formatVND, formatPercent } from "@/lib/format/money";
import { formatReportPeriodVN, formatDateVN, formatDateVNSortable } from "@/lib/format/date";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

export const runtime = "nodejs";

// Initialize fonts
if (pdfFonts && (pdfFonts as any).pdfMake) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
}

export function buildPdfDocumentDefinition(report: any) {
  const { summary, expenseCategories, cashflowTrend, budgetPerformance, savingGoals, debts, topExpenses } = report;

  return {
    content: [
      { text: "Nancy Finance", style: "header" },
      { text: "Báo cáo tài chính", style: "subheader" },
      { text: `Thời gian: ${formatReportPeriodVN(report.period.startDate, report.period.endDate)}`, style: "period" },
      
      { text: "Tổng quan KPI", style: "sectionHeader" },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*'],
          body: [
            [{ text: 'Chỉ số', style: 'tableHeader' }, { text: 'Giá trị', style: 'tableHeader' }],
            ['Tổng thu nhập', formatVND(summary.totalIncome)],
            ['Tổng chi tiêu', formatVND(summary.totalExpense)],
            ['Dòng tiền ròng', formatVND(summary.netCashflow)],
            ['Tỷ lệ tiết kiệm', summary.savingsRate !== null ? formatPercent(summary.savingsRate) : 'N/A'],
            ['Tổng tài sản', formatVND(summary.totalAssets)],
            ['Tổng dư nợ', formatVND(summary.totalDebt)],
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 10, 0, 20]
      },

      { text: "Dòng tiền (Cashflow)", style: "sectionHeader" },
      cashflowTrend.length > 0 ? {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [{ text: 'Tháng', style: 'tableHeader' }, { text: 'Thu nhập', style: 'tableHeader' }, { text: 'Chi tiêu', style: 'tableHeader' }, { text: 'Ròng', style: 'tableHeader' }],
            ...cashflowTrend.map((c: any) => [
              c.month,
              formatVND(c.income),
              formatVND(c.expense),
              formatVND(c.netCashflow)
            ])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 10, 0, 20]
      } : { text: "Không có dữ liệu dòng tiền", margin: [0, 5, 0, 20], color: 'gray' },

      { text: "Cơ cấu chi tiêu", style: "sectionHeader" },
      expenseCategories.length > 0 ? {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [
            [{ text: 'Danh mục', style: 'tableHeader' }, { text: 'Số tiền', style: 'tableHeader' }, { text: 'Tỷ trọng', style: 'tableHeader' }],
            ...expenseCategories.map((c: any) => [
              c.name, 
              formatVND(c.amount), 
              `${c.percentage}%`
            ])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 10, 0, 20]
      } : { text: "Không có chi tiêu trong kỳ", margin: [0, 5, 0, 20], color: 'gray' },

      { text: "Hiệu suất ngân sách", style: "sectionHeader" },
      budgetPerformance.length > 0 ? {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [{ text: 'Danh mục', style: 'tableHeader' }, { text: 'Ngân sách', style: 'tableHeader' }, { text: 'Đã chi', style: 'tableHeader' }, { text: '%', style: 'tableHeader' }],
            ...budgetPerformance.map((b: any) => [
              b.categoryName,
              formatVND(b.allocatedAmount),
              formatVND(b.spentAmount),
              `${Math.round(b.usagePercentage)}%`
            ])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 10, 0, 20]
      } : { text: "Không có ngân sách", margin: [0, 5, 0, 20], color: 'gray' },

      { text: "Mục tiêu tiết kiệm", style: "sectionHeader" },
      savingGoals.length > 0 ? {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [{ text: 'Mục tiêu', style: 'tableHeader' }, { text: 'Cần đạt', style: 'tableHeader' }, { text: 'Đã có', style: 'tableHeader' }, { text: '%', style: 'tableHeader' }],
            ...savingGoals.map((s: any) => [
              s.name,
              formatVND(s.targetAmount),
              formatVND(s.currentAmount),
              `${Math.round(s.progressPercentage)}%`
            ])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 10, 0, 20]
      } : { text: "Không có mục tiêu tiết kiệm", margin: [0, 5, 0, 20], color: 'gray' },

      { text: "Tổng quan dư nợ", style: "sectionHeader" },
      debts.length > 0 ? {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [{ text: 'Khoản nợ', style: 'tableHeader' }, { text: 'Loại', style: 'tableHeader' }, { text: 'Tổng/Hạn mức', style: 'tableHeader' }, { text: 'Còn nợ', style: 'tableHeader' }],
            ...debts.map((d: any) => [
              d.name,
              d.type === 'loan' ? 'Khoản vay' : 'Thẻ TD',
              formatVND(d.originalAmountOrLimit),
              formatVND(d.remainingOrCurrentBalance)
            ])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 10, 0, 20]
      } : { text: "Không có dư nợ", margin: [0, 5, 0, 20], color: 'gray' },

      { text: "Chi tiêu lớn nhất", style: "sectionHeader" },
      topExpenses.length > 0 ? {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto'],
          body: [
            [{ text: 'Ngày', style: 'tableHeader' }, { text: 'Nội dung', style: 'tableHeader' }, { text: 'Danh mục', style: 'tableHeader' }, { text: 'Số tiền', style: 'tableHeader' }],
            ...topExpenses.map((t: any) => [
              formatDateVN(t.date),
              t.description,
              t.categoryName,
              formatVND(t.amount)
            ])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 10, 0, 20]
      } : { text: "Không có giao dịch lớn", margin: [0, 5, 0, 20], color: 'gray' },
    ],
    styles: {
      header: { fontSize: 22, bold: true, margin: [0, 0, 0, 5] },
      subheader: { fontSize: 16, bold: true, margin: [0, 0, 0, 5] },
      period: { fontSize: 12, color: 'gray', margin: [0, 0, 0, 20] },
      sectionHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      tableHeader: { bold: true, fontSize: 12, color: 'black' }
    },
    defaultStyle: { font: 'Roboto' }
  };
}

export async function generatePDF(userId: string, periodType: ReportPeriodType, customFrom?: string | null, customTo?: string | null) {
  const report = await ReportService.getFinancialReport(
    userId,
    periodType,
    customFrom,
    customTo
  );

  const docDefinition = buildPdfDocumentDefinition(report);

  const pdfDocGenerator = (pdfMake as any).createPdf(docDefinition);

  console.log("Generating PDF buffer...");
  const buffer = await pdfDocGenerator.getBuffer();
  console.log("PDF buffer generated");

  const filename = `nancy-finance-report-${formatDateVNSortable(report.period.startDate)}.pdf`;
  return { buffer, filename };
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

    const { buffer, filename } = await generatePDF(session.user.id, periodType, customFrom, customTo);

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF Export error", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
