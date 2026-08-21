import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

/**
 * Request-scoped auth lookup for React Server Components.
 * React cache() deduplicates repeated session reads during one server render,
 * so the dashboard layout and page do not hit Better Auth independently.
 */
export const getServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export const requireUser = cache(async () => {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
});
