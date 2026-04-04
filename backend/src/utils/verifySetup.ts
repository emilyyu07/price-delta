#!/usr/bin/env tsx
/**
 * SSE Test Setup Verification
 * 
 * Run this script to verify your environment is ready for SSE testing.
 * 
 * Usage:
 *   tsx src/utils/verifySetup.ts
 */

import prisma from "../config/prisma.js";
import { env } from "../config/env.js";

async function verifySetup() {
  console.log("\n" + "=".repeat(60));
  console.log("SSE NOTIFICATION TEST - SETUP VERIFICATION");
  console.log("=".repeat(60) + "\n");

  const checks: { name: string; status: "✅" | "❌" | "⚠️"; message: string }[] = [];

  // Check 1: Database Connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      name: "Database Connection",
      status: "✅",
      message: "PostgreSQL connected",
    });
  } catch (error) {
    checks.push({
      name: "Database Connection",
      status: "❌",
      message: `Failed to connect: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }

  // Check 2: Environment Variables
  const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "FRONTEND_URL", "PORT"];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName as keyof typeof env]
  );

  if (missingVars.length === 0) {
    checks.push({
      name: "Environment Variables",
      status: "✅",
      message: `All required vars present (${requiredEnvVars.join(", ")})`,
    });
  } else {
    checks.push({
      name: "Environment Variables",
      status: "❌",
      message: `Missing: ${missingVars.join(", ")}`,
    });
  }

  // Check 3: Test Data Availability
  try {
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const alertCount = await prisma.priceAlert.count();

    if (userCount === 0) {
      checks.push({
        name: "Test Data - Users",
        status: "⚠️",
        message: "No users found. Register at http://localhost:5173/register",
      });
    } else {
      checks.push({
        name: "Test Data - Users",
        status: "✅",
        message: `${userCount} user(s) available`,
      });
    }

    if (productCount === 0) {
      checks.push({
        name: "Test Data - Products",
        status: "⚠️",
        message: "No products tracked. Add via dashboard",
      });
    } else {
      checks.push({
        name: "Test Data - Products",
        status: "✅",
        message: `${productCount} product(s) tracked`,
      });
    }

    if (alertCount === 0) {
      checks.push({
        name: "Test Data - Alerts",
        status: "⚠️",
        message: "No alerts found. Create one on product detail page",
      });
    } else {
      const activeAlerts = await prisma.priceAlert.findMany({
        where: { isActive: true },
        include: { user: true, product: true },
        take: 3,
      });

      checks.push({
        name: "Test Data - Alerts",
        status: "✅",
        message: `${alertCount} alert(s) available (${activeAlerts.length} active)`,
      });

      if (activeAlerts.length > 0) {
        console.log("\nAvailable Test Alerts:");
        console.log("─".repeat(60));
        activeAlerts.forEach((alert, i) => {
          console.log(
            `${i + 1}. Alert ID: ${alert.id}\n` +
            `   User: ${alert.user.email}\n` +
            `   Product: ${alert.product.title}\n` +
            `   Target: $${alert.targetPrice || "N/A"}\n`
          );
        });
        console.log("─".repeat(60) + "\n");
      }
    }
  } catch (error) {
    checks.push({
      name: "Test Data Query",
      status: "❌",
      message: `Failed to query: ${error instanceof Error ? error.message : "Unknown"}`,
    });
  }

  // Check 4: Recent Notifications
  try {
    const recentNotifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: true },
    });

    if (recentNotifications.length > 0) {
      checks.push({
        name: "Recent Notifications",
        status: "✅",
        message: `${recentNotifications.length} notification(s) in last query`,
      });
    } else {
      checks.push({
        name: "Recent Notifications",
        status: "⚠️",
        message: "No notifications yet. Run a test to create one",
      });
    }
  } catch (error) {
    checks.push({
      name: "Recent Notifications",
      status: "❌",
      message: `Query failed: ${error instanceof Error ? error.message : "Unknown"}`,
    });
  }

  // Print Results
  console.log("Verification Results:\n");
  checks.forEach((check) => {
    console.log(`${check.status} ${check.name.padEnd(30)} ${check.message}`);
  });

  const failed = checks.filter((c) => c.status === "❌").length;
  const warnings = checks.filter((c) => c.status === "⚠️").length;

  console.log("\n" + "=".repeat(60));
  if (failed === 0 && warnings === 0) {
    console.log("🎉 ALL CHECKS PASSED - Ready to test!");
    console.log("\nNext Steps:");
    console.log("1. Start backend: cd backend && npm run dev");
    console.log("2. Start frontend: cd frontend && npm run dev");
    console.log("3. Login to http://localhost:5173");
    console.log("4. Open DevTools console (F12)");
    console.log("5. Run test: fetch POST /api/alerts/{alertId}/test");
    console.log("\nSee SSE_TESTING_GUIDE.md for detailed instructions.");
  } else if (failed === 0) {
    console.log(`⚠️  READY WITH WARNINGS (${warnings} warning(s))`);
    console.log("\nYou can proceed, but some test data may be missing.");
    console.log("See warnings above for what to create.");
  } else {
    console.log(`❌ SETUP INCOMPLETE (${failed} error(s), ${warnings} warning(s))`);
    console.log("\nFix the errors above before testing.");
  }
  console.log("=".repeat(60) + "\n");

  await prisma.$disconnect();
}

// Run verification
verifySetup().catch((error) => {
  console.error("\n❌ Verification script failed:", error);
  process.exit(1);
});
