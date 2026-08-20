import React from "react";
export const dynamic = 'force-dynamic';
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { planningService } from "@/server/services/planning";
import { GoalsClient } from "./goals-client";

export default async function GoalsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  
  const goals = await planningService.getSavingGoals(userId);

  return <GoalsClient goals={goals} />;
}
