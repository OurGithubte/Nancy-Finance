import { NextResponse } from "next/server";
import { automationService } from "@/server/services/automation";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Server configuration error: CRON_SECRET is not set." },
      { status: 500 }
    );
  }

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expectedHeader = `Bearer ${expectedSecret}`;
  
  // Constant-time comparison to prevent timing attacks
  const authBuffer = Buffer.from(authHeader);
  const expectedBuffer = Buffer.from(expectedHeader);
  
  if (authBuffer.length !== expectedBuffer.length || !timingSafeEqual(authBuffer, expectedBuffer)) {
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
