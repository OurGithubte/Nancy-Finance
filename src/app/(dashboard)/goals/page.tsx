import React from "react";
import { requireUser } from "@/lib/auth/server";
import { planningService } from "@/server/services/planning";
import { GoalsClient } from "./goals-client";

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await planningService.getSavingGoals(user.id);
  return <GoalsClient goals={goals} />;
}
