"use server";

import { insightsService } from "../services/insights";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export async function getSmartInsightsAction() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const insights = await insightsService.getSmartInsights(session.user.id);
    
    return { success: true, data: insights };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
