"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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

function getFeedbackRecipients() {
  return (process.env.FEEDBACK_RECIPIENTS || process.env.FEEDBACK_RECIPIENT || "")
    .split(",")
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

export const sendFeedback = action({
  args: {
    feedback: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; feedbackId: Id<"feedback"> }> => {
    // Store feedback in database first
    const feedbackId = await ctx.runMutation(internal.feedbackMutations.storeFeedback, {
      feedback: args.feedback,
    });

    // Get user info for the email
    const user = await ctx.runQuery(api.users.getCurrentUser);
    const userName = user?.profile?.name || user?.email || "Anonymous User";
    const userEmail = user?.email || "Not provided";

    // Send email notification
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      // Still return success since feedback was stored
      return { success: true, feedbackId };
    }

    const feedbackRecipients = getFeedbackRecipients();
    if (feedbackRecipients.length === 0) {
      console.warn("Feedback email skipped because FEEDBACK_RECIPIENTS is not configured.");
      return { success: true, feedbackId };
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
          .header { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 20px; }
          .label { font-weight: bold; color: #666; margin-top: 15px; }
          .content { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px; white-space: pre-wrap; }
          .footer { font-size: 12px; color: #777; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">📝 New Feedback Received</div>
          
          <div class="label">From:</div>
          <div>${userName}</div>
          
          <div class="label">Email:</div>
          <div>${userEmail}</div>
          
          <div class="label">Feedback:</div>
          <div class="content">${args.feedback}</div>
          
          <div class="footer">
            <p>This feedback was submitted via DayBridge and stored in the database.</p>
            <p>Feedback ID: ${feedbackId}</p>
            <p>Timestamp: ${new Date().toLocaleString()}</p>
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
          from: getResendSender("DayBridge Feedback"),
          to: feedbackRecipients,
          subject: `New Feedback from ${userName}`,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Failed to send feedback email:', errorBody);
        // Still return success since feedback was stored
      } else {
        console.log(`Feedback email sent to ${feedbackRecipients.join(', ')}`);
      }
    } catch (error) {
      console.error('Error sending feedback email:', error);
      // Still return success since feedback was stored
    }

    return { success: true, feedbackId };
  },
});
