/**
 * Email Testing Utility
 * 
 * This script tests the email configuration by sending a test email.
 * It will help diagnose why emails aren't being delivered.
 */

import { sendPriceDropEmail } from "../config/mail.js";
import prisma from "../config/prisma.js";

console.log("\n" + "=".repeat(60));
console.log("EMAIL CONFIGURATION TEST");
console.log("=".repeat(60));

async function testEmail() {
  try {
    // Get a real user for testing
    const user = await prisma.user.findFirst({
      where: { email: "emily.y417@gmail.com" },
    });

    if (!user) {
      console.error("❌ User not found: emily.y417@gmail.com");
      process.exit(1);
    }

    console.log(`\n✅ Found user: ${user.email}`);
    console.log(`\n📧 Attempting to send test email...`);
    console.log(`   From: pricedeltanotif@gmail.com`);
    console.log(`   To: ${user.email}`);
    console.log(`   Subject: 🚨 Price Drop: Test Product is now $99!`);
    console.log(`\n⏳ Sending...`);

    const startTime = Date.now();

    // Send test email
    await sendPriceDropEmail(
      user.email,
      "TEST PRODUCT - Email Configuration Check",
      99.99,
      "https://www.aritzia.com/test"
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ Email sent successfully in ${duration}ms!`);
    console.log(`\n📬 Check your inbox at: ${user.email}`);
    console.log(`   If you don't see it:`);
    console.log(`   1. Check spam/junk folder`);
    console.log(`   2. Search for: from:pricedeltanotif@gmail.com`);
    console.log(`   3. Check backend logs above for any errors`);
    console.log("\n" + "=".repeat(60));

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ EMAIL TEST FAILED:");
    console.error(error);
    
    if (error instanceof Error) {
      console.error("\nError Details:");
      console.error(`  Message: ${error.message}`);
      console.error(`  Name: ${error.name}`);
      
      // Check for common SMTP errors
      if (error.message.includes("Invalid login")) {
        console.error("\n⚠️  SMTP Authentication Error!");
        console.error("   Problem: Gmail credentials are invalid");
        console.error("   Solution: Check SMTP_USER and SMTP_PASS in .env");
        console.error("   Make sure you're using an App Password, not your regular Gmail password");
      } else if (error.message.includes("ECONNREFUSED")) {
        console.error("\n⚠️  Connection Refused!");
        console.error("   Problem: Cannot connect to SMTP server");
        console.error("   Solution: Check SMTP_HOST and SMTP_PORT in .env");
      } else if (error.message.includes("timeout")) {
        console.error("\n⚠️  Connection Timeout!");
        console.error("   Problem: SMTP server not responding");
        console.error("   Solution: Check your internet connection or firewall settings");
      }
    }

    console.log("\n" + "=".repeat(60));
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Check environment variables first
console.log("\nChecking environment variables...");
console.log(`  SMTP_HOST: ${process.env.SMTP_HOST || "❌ NOT SET"}`);
console.log(`  SMTP_PORT: ${process.env.SMTP_PORT || "❌ NOT SET"}`);
console.log(`  SMTP_USER: ${process.env.SMTP_USER || "❌ NOT SET"}`);
console.log(`  SMTP_PASS: ${process.env.SMTP_PASS ? "✅ SET (hidden)" : "❌ NOT SET"}`);

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error("\n❌ Missing required SMTP environment variables!");
  console.error("   Please check your .env file");
  process.exit(1);
}

console.log("\n✅ All SMTP environment variables are set");

testEmail();
