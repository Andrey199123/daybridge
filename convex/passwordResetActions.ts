"use node";

import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

function getSiteUrl() {
  return (
    process.env.APP_URL ||
    process.env.SITE_URL ||
    "https://daybridge.app"
  ).replace(/\/$/, "");
}

function getResendSender(defaultName: string) {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM_ADDRESS ||
    "hello@daybridge.app";
  const fromName =
    process.env.RESEND_FROM_NAME ||
    process.env.EMAIL_FROM_NAME ||
    defaultName;

  return `${fromName} <${fromEmail}>`;
}

// Generate a random reset token
function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Request password reset - sends email with reset link
export const requestPasswordReset = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.runQuery(api.users.getUserByEmail, { email: args.email });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      console.log(`Password reset requested for non-existent email: ${args.email}`);
      return { success: true };
    }

    // Generate reset token
    const token = generateResetToken();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now

    // Store reset token
    await ctx.runMutation(api.passwordReset.storeResetToken, {
      userId: user._id,
      email: args.email,
      token,
      expiresAt,
    });

    // Send reset email
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    const siteUrl = getSiteUrl();
    const resetUrl = `${siteUrl}/reset-password?token=${token}`;
    
    console.log(`Password reset URL: ${resetUrl}`);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
          .header { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 20px; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { font-size: 12px; color: #777; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Reset Your DayBridge Password</div>
          <p>Hi there,</p>
          <p>We received a request to reset your password for your DayBridge account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3b82f6;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <div class="footer">
            <p>This is an automated email from DayBridge. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: getResendSender("DayBridge"),
          to: args.email,
          subject: 'Reset Your DayBridge Password',
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Failed to send reset email:', errorBody);
        throw new Error('Failed to send reset email');
      }

      console.log(`Password reset email sent to ${args.email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending reset email:', error);
      throw new Error('Failed to send reset email');
    }
  },
});

// Action to reset password
export const resetPasswordWithAuth = action({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // First verify the token and get user info
    const tokenRecord = await ctx.runQuery(api.passwordReset.verifyResetToken, {
      token: args.token,
    });

    if (!tokenRecord.valid) {
      throw new Error("Invalid or expired reset token");
    }

    // Hash the password using Scrypt from Lucia (same as Convex Auth Password provider)
    const { Scrypt } = await import("lucia");
    const scrypt = new Scrypt();
    const hashedPassword = await scrypt.hash(args.newPassword);

    // Update the password with hashed password FIRST
    await ctx.runMutation(internal.passwordReset.updatePassword, {
      userId: tokenRecord.userId!,
      email: tokenRecord.email!,
      hashedPassword: hashedPassword,
    });

    // Mark token as used AFTER successful password update
    await ctx.runMutation(api.passwordReset.markTokenAsUsed, {
      token: args.token,
    });
    
    return { success: true };
  },
});
