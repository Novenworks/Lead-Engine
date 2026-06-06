import { logger } from "./logger";

interface Client {
  id: number;
  businessName: string;
  notificationEmail: string;
}

interface Lead {
  name: string;
  email: string;
  phone: string | null;
  serviceInterest: string | null;
  message: string | null;
  source: string | null;
  createdAt: Date;
}

export async function sendLeadNotification(client: Client, lead: Lead): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    logger.warn("RESEND_API_KEY not set — skipping email notification");
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);

  const dateStr = lead.createdAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const html = `
<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="background: #1a1a2e; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">New Lead for ${client.businessName}</h2>
    <p style="margin: 4px 0 0; color: #a0a0b0; font-size: 14px;">via LeadEngine by Novenworks</p>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 140px; font-size: 14px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${lead.name}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td><td style="padding: 8px 0;"><a href="mailto:${lead.email}" style="color: #4f46e5;">${lead.email}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone</td><td style="padding: 8px 0;">${lead.phone || "Not provided"}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Service Interest</td><td style="padding: 8px 0;">${lead.serviceInterest || "Not specified"}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Source</td><td style="padding: 8px 0;">${lead.source || "Unknown"}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td><td style="padding: 8px 0;">${dateStr}</td></tr>
    </table>
    ${
      lead.message
        ? `
    <div style="margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 6px; border-left: 3px solid #4f46e5;">
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Message</p>
      <p style="margin: 0; color: #111827;">${lead.message}</p>
    </div>`
        : ""
    }
    <p style="margin-top: 24px; color: #6b7280; font-size: 12px; text-align: center;">
      Sent by LeadEngine by Novenworks — <a href="https://novenworks.com" style="color: #4f46e5;">novenworks.com</a>
    </p>
  </div>
</div>`;

  const { error } = await resend.emails.send({
    from: "LeadEngine <leads@novenworks.com>",
    to: [client.notificationEmail],
    subject: `New Lead for ${client.businessName}`,
    html,
  });

  if (error) {
    logger.error({ error }, "Resend email error");
    throw new Error(`Email send failed: ${error.message}`);
  }

  logger.info({ to: client.notificationEmail, client: client.businessName }, "Lead notification email sent");
}
