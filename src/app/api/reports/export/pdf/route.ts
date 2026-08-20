import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { ReportService } from "@/server/services/reports";
import { ReportPeriodType } from "@/types/reports";
import { formatVND, formatPercent } from "@/lib/format/money";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

export const runtime = "nodejs";

// Initialize fonts
if (pdfFonts && (pdfFonts as any).pdfMake) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
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

    const report = await ReportService.getFinancialReport(
      session.user.id,
      periodType,
      customFrom,
      customTo
    );

    const { summary, expenseCategories, debts, topExpenses } = report;

    // Define PDF Document
    const docDefinition: any = {
      content: [
        { text: "Nancy Finance", style: "header" },
        { text: "Báo cáo tài chính", style: "subheader" },
        { text: `Thời gian: ${report.period.startDate.toLocaleDateString("vi-VN")} - ${report.period.endDate.toLocaleDateString("vi-VN")}`, style: "period" },
        
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

        { text: "Cơ cấu chi tiêu", style: "sectionHeader" },
        expenseCategories.length > 0 ? {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto'],
            body: [
              [{ text: 'Danh mục', style: 'tableHeader' }, { text: 'Số tiền', style: 'tableHeader' }, { text: 'Tỷ trọng', style: 'tableHeader' }],
              ...expenseCategories.map(c => [
                c.name, 
                formatVND(c.amount), 
                `${c.percentage}%`
              ])
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 10, 0, 20]
        } : { text: "Không có chi tiêu trong kỳ", margin: [0, 5, 0, 20], color: 'gray' },

        { text: "Tổng quan dư nợ", style: "sectionHeader" },
        debts.length > 0 ? {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [{ text: 'Khoản nợ', style: 'tableHeader' }, { text: 'Loại', style: 'tableHeader' }, { text: 'Tổng/Hạn mức', style: 'tableHeader' }, { text: 'Còn nợ', style: 'tableHeader' }],
              ...debts.map(d => [
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
              ...topExpenses.map(t => [
                t.date.toLocaleDateString("vi-VN"),
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
        header: {
          fontSize: 22,
          bold: true,
          margin: [0, 0, 0, 5]
        },
        subheader: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 5]
        },
        period: {
          fontSize: 12,
          color: 'gray',
          margin: [0, 0, 0, 20]
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 5]
        },
        tableHeader: {
          bold: true,
          fontSize: 12,
          color: 'black'
        }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    const pdfDocGenerator = (pdfMake as any).createPdf(docDefinition);

    // Using a promise to convert stream to buffer
    const buffer = await new Promise<Buffer>((resolve) => {
      pdfDocGenerator.getBuffer((result: any) => {
        resolve(result);
      });
    });

    const filename = `nancy-finance-report-${report.period.startDate.toISOString().split("T")[0]}.pdf`;

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
