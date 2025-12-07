// Resend Email Client - Direct API integration
import { Resend } from 'resend';

function getResendCredentials() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY not found in environment variables');
  }

  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL not found in environment variables');
  }

  return { apiKey, fromEmail };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getResendClient() {
  const { apiKey, fromEmail } = getResendCredentials();
  const client = new Resend(apiKey);
  
  return {
    client,
    fromEmail,
  };
}

interface InvoiceEmailData {
  invoiceNumber: string;
  total: string;
  dueDate: Date;
  shareToken: string;
  businessName: string;
  businessEmail?: string | null;
  businessLogoUrl?: string | null;
  clientName?: string | null;
  clientEmail: string;
  currency?: string | null;
  stripePaymentLink?: string | null;
  isResend?: boolean;
}

function formatCurrency(amount: string, currency?: string | null): string {
  const numAmount = parseFloat(amount);
  const currencyCode = currency?.toUpperCase() || 'USD';
  
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'CAD': 'CA$',
    'EUR': '€',
    'GBP': '£',
  };
  
  const symbol = currencySymbols[currencyCode] || currencyCode + ' ';
  return `${symbol}${numAmount.toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateInvoiceEmailTemplate(data: InvoiceEmailData): { subject: string; html: string } {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const invoiceUrl = `${baseUrl}/pay/${data.shareToken}`;
  const formattedTotal = formatCurrency(data.total, data.currency);
  const formattedDueDate = formatDate(data.dueDate);
  
  const subject = data.isResend 
    ? `Reminder: Invoice #${data.invoiceNumber} from ${data.businessName}`
    : `Invoice #${data.invoiceNumber} from ${data.businessName}`;

  const greeting = data.clientName ? `Hey ${data.clientName},` : 'Hello,';
  const introText = data.isResend
    ? `This is a friendly reminder about your invoice from ${data.businessName}.`
    : `You've received a new invoice from ${data.businessName}.`;

  // Generate logo HTML if logo URL exists
  const logoHtml = data.businessLogoUrl 
    ? `<img src="${data.businessLogoUrl}" alt="${data.businessName}" style="max-height: 48px; max-width: 180px; margin-bottom: 12px;" />`
    : '';

  // Generate CTA buttons - show "Pay Now" when Stripe is available, otherwise show "View & Pay"
  const ctaButtonsHtml = data.stripePaymentLink
    ? `
              <!-- Primary CTA: Pay Now with Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                <tr>
                  <td align="center">
                    <a href="${data.stripePaymentLink}" style="display: inline-block; padding: 14px 40px; background-color: #0a0a0a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      Pay Now with Card
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Secondary CTA: View Invoice -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${invoiceUrl}" style="display: inline-block; padding: 12px 32px; background-color: transparent; color: #525252; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px; border: 1px solid #e5e5e5;">
                      View Invoice Details
                    </a>
                  </td>
                </tr>
              </table>
    `
    : `
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${invoiceUrl}" style="display: inline-block; padding: 14px 40px; background-color: #0a0a0a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      View & Pay Invoice
                    </a>
                  </td>
                </tr>
              </table>
    `;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafafa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 48px 20px;">
        <table role="presentation" style="width: 100%; max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              ${logoHtml}
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0a0a0a; letter-spacing: -0.5px;">
                ${data.businessName}
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px 40px;">
              <p style="margin: 0 0 8px; font-size: 16px; line-height: 24px; color: #0a0a0a; font-weight: 500;">
                ${greeting}
              </p>
              
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 24px; color: #525252;">
                ${introText}
              </p>
              
              <!-- Invoice Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fafafa; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #737373;">Invoice</td>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #0a0a0a; text-align: right;">#${data.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #737373;">Amount Due</td>
                        <td style="padding: 6px 0; font-size: 20px; font-weight: 700; color: #0a0a0a; text-align: right;">${formattedTotal}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #737373;">Due Date</td>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #0a0a0a; text-align: right;">${formattedDueDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${ctaButtonsHtml}
              
              <p style="margin: 0 0 8px; font-size: 13px; line-height: 20px; color: #a3a3a3; text-align: center;">
                Or copy this link:
              </p>
              <p style="margin: 0 0 28px; font-size: 13px; line-height: 20px; color: #525252; word-break: break-all; text-align: center;">
                <a href="${invoiceUrl}" style="color: #525252; text-decoration: underline;">${invoiceUrl}</a>
              </p>
              
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a3a3a3; text-align: center;">
                Questions? ${data.businessEmail ? `Contact us at <a href="mailto:${data.businessEmail}" style="color: #525252;">${data.businessEmail}</a>` : 'Reply to this email'}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #f0f0f0; text-align: center; background-color: #fafafa;">
              <table role="presentation" style="margin: 0 auto; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center; padding: 0;">
                    <span style="font-size: 11px; color: #a3a3a3; vertical-align: middle; line-height: 20px;">Sent by</span>
                    <img 
                      src="${process.env.OLLIE_INVOICE_LOGO_URL || 'https://i.ibb.co/placeholder-ollie-logo.png'}" 
                      alt="Ollie Invoice" 
                      style="height: 14px; margin-left: 6px; vertical-align: middle; display: inline-block;"
                    />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate email address
    if (!data.clientEmail || !data.clientEmail.includes('@')) {
      return {
        success: false,
        error: 'Invalid or missing client email address'
      };
    }

    const { client, fromEmail } = await getResendClient();
    const { subject, html } = generateInvoiceEmailTemplate(data);

    console.log(`Sending invoice email to ${data.clientEmail} for invoice #${data.invoiceNumber}`);

    const result = await client.emails.send({
      from: fromEmail,
      to: data.clientEmail,
      subject,
      html,
    });

    console.log(`Email sent successfully: ${result.id}`);

    return {
      success: true,
      messageId: result.id,
    };
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}
