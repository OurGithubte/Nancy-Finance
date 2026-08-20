import { NextResponse } from "next/server";
import { automationService } from "@/server/services/automation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Simple bearer token authentication
  const authHeader = request.headers.get("Authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await automationService.processDueRecurringTransactions();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error("[CRON ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
