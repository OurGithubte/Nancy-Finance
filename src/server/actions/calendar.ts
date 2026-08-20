"use server";

import { calendarService } from "../services/calendar";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export async function getCalendarEventsAction(startDateStr: string, endDateStr: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const events = await calendarService.getEventsInRange(session.user.id, startDate, endDate);
    
    return { success: true, data: events };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
