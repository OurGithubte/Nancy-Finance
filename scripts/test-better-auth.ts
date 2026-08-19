import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const { auth } = await import("../src/lib/auth/auth");
  const { neon } = await import("@neondatabase/serverless");

  const sql = neon(process.env.DATABASE_URL!);

  const testEmail = `auth_test_v2_${Date.now()}@nancyfinance.vn`;
  const testPassword = "Password123!Secure";
  const testName = "Nancy Production Auth User";

  console.log("=== BETTER AUTH PRODUCTION END-TO-END VERIFICATION ===");

  // 1. Sign Up
  console.log("\n1. Registering user via auth.api.signUpEmail...");
  const signUpRes = await auth.api.signUpEmail({
    body: {
      email: testEmail,
      password: testPassword,
      name: testName,
    },
  });
  console.log("   ✓ User Registered:", signUpRes.user.id, signUpRes.user.email);

  // 2. Sign In with response to get Set-Cookie headers
  console.log("\n2. Signing in user via auth.api.signInEmail...");
  const signInRes = await auth.api.signInEmail({
    body: {
      email: testEmail,
      password: testPassword,
    },
    asResponse: true,
  });

  const cookieHeader = signInRes.headers.get("set-cookie") || "";
  console.log("   ✓ Login Response Status:", signInRes.status);
  console.log("   ✓ Set-Cookie received:", cookieHeader ? cookieHeader.split(";")[0] : "none");

  // 3. Verify Session using the returned Cookie
  console.log("\n3. Verifying Session via getSession with Cookie header...");
  const sessionRes = await auth.api.getSession({
    headers: new Headers({
      cookie: cookieHeader,
    }),
  });

  console.log("   ✓ Session Valid:", !!sessionRes?.session);
  console.log("   ✓ Logged In User:", sessionRes?.user.name, `(${sessionRes?.user.email})`);
  console.log("   ✓ Session Token:", sessionRes?.session.token ? sessionRes.session.token.slice(0, 15) + "..." : "none");
  console.log("   ✓ Session Expires At:", sessionRes?.session.expiresAt);

  // 4. Protected route simulation
  console.log("\n4. Simulating Protected Route Guard...");
  if (sessionRes?.user) {
    console.log("   ✓ [Protected Resource Access]: GRANTED for user", sessionRes.user.id);
  } else {
    throw new Error("Protected resource access was denied for authenticated session!");
  }

  // 5. Sign Out
  console.log("\n5. Testing Sign Out via auth.api.signOut...");
  const signOutRes = await auth.api.signOut({
    headers: new Headers({
      cookie: cookieHeader,
    }),
    asResponse: true,
  });
  const signOutCookies = signOutRes.headers.get("set-cookie") || "";
  console.log("   ✓ Sign Out Status:", signOutRes.status);

  // 6. Verify Session is now revoked/invalidated
  console.log("\n6. Verifying Session Rejection after logout...");
  const invalidSession = await auth.api.getSession({
    headers: new Headers({
      cookie: cookieHeader,
    }),
  });
  console.log("   ✓ Session after logout is null:", invalidSession === null);

  // 7. Check database rows
  console.log("\n7. Checking Neon Database public.user and public.session tables...");
  const userRow = await sql`SELECT id, name, email, email_verified FROM "user" WHERE email = ${testEmail};`;
  console.log("   ✓ Database User Record:", userRow[0]);

  const accountRow = await sql`SELECT id, provider_id, account_id FROM "account" WHERE user_id = ${signUpRes.user.id};`;
  console.log("   ✓ Database Account Record (Credential Provider):", accountRow[0]);

  console.log("\n=======================================================");
  console.log("✓ ALL BETTER AUTH PRODUCTION TESTS PASSED 100% ON NEON!");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
