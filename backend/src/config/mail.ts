import nodemailer from "nodemailer";

// transporter (reusable connection pool to gmail)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // smtp.gmail.com
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER, // pricedeltanotif@gmail.com
    pass: process.env.SMTP_PASS, // app pw
  },
});

export const sendPriceDropEmail = async (
  toEmail: string,
  productName: string,
  newPrice: number,
  productUrl: string,
) => {
  try {
    const info = await transporter.sendMail({
      from: `"PriceDelta Alerts" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `🚨 Price Drop: ${productName} is now $${newPrice}!`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Great news from PriceDelta!</h2>
          <p>The item you are tracking just dropped in price.</p>
          <p><strong>${productName}</strong> is now available for <strong>$${newPrice}</strong>.</p>
          <a href="${productUrl}" style="background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">
            Buy it now
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
            You are receiving this because you set a price alert on PriceDelta.
          </p>
        </div>
      `,
    });
    console.log(
      `[Mailer] Email sent successfully to ${toEmail}. Message ID: ${info.messageId}`,
    );
  } catch (error) {
    console.error(`[Mailer] Failed to send email to ${toEmail}:`, error);
  }
};

export const sendWelcomeEmail = async (toEmail: string, userName?: string) => {
  try {
    const displayName = userName || toEmail.split("@")[0]; // Use name or email username

    const info = await transporter.sendMail({
      from: `"PriceDelta Team" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `🎉 Welcome to PriceDelta, ${displayName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0284c7; margin: 0;">🛍️ PriceDelta</h1>
            <p style="color: #6b7280; margin: 5px 0;">Your prices — on a leash</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome to PriceDelta! 🎉</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Hi <strong>${displayName}</strong>! We're thrilled to have you join our community of smart shoppers.
              PriceDelta helps you never miss a deal by tracking prices and alerting you when they drop.
            </p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937;">🚀 Get Started in 3 Simple Steps:</h3>
            <ol style="color: #4b5563; line-height: 1.8;">
              <li><strong>Track Products:</strong> Add any product URL you want to monitor</li>
              <li><strong>Set Alerts:</strong> Choose your target price for each product</li>
              <li><strong>Save Money:</strong> Relax while we notify you of price drops!</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" 
               style="background-color: #0284c7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Start Tracking Products
            </a>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Pro Tip:</strong> Install our browser extension to add products with one click while shopping!
            </p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Questions? Just reply to this email - we're here to help!<br>
              Happy saving! 🛒
            </p>
          </div>
        </div>
      `,
    });
    console.log(
      `[Mailer] Welcome email sent successfully to ${toEmail}. Message ID: ${info.messageId}`,
    );
  } catch (error) {
    console.error(
      `[Mailer] Failed to send welcome email to ${toEmail}:`,
      error,
    );
  }
};
