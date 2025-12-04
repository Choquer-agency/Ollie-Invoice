// Resend Email Client - Using Replit Integration
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'noreply@invoy.io'
  };
}

// Send invoice email
export async function sendInvoiceEmail(options: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  paymentLink: string;
  businessName: string;
}) {
  const { client, fromEmail } = await getResendClient();
  
  const { to, clientName, invoiceNumber, amount, dueDate, paymentLink, businessName } = options;
  
  const result = await client.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Invoice ${invoiceNumber} from ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fafafa;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 24px 0; color: #1a1a1a;">
              New Invoice from ${businessName}
            </h1>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hi ${clientName},
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              You have received a new invoice. Here are the details:
            </p>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin: 0 0 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #666; font-size: 14px; padding: 8px 0;">Invoice Number</td>
                  <td style="color: #1a1a1a; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="color: #666; font-size: 14px; padding: 8px 0;">Amount Due</td>
                  <td style="color: #1a1a1a; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${amount}</td>
                </tr>
                <tr>
                  <td style="color: #666; font-size: 14px; padding: 8px 0;">Due Date</td>
                  <td style="color: #1a1a1a; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${dueDate}</td>
                </tr>
              </table>
            </div>
            
            <a href="${paymentLink}" style="display: block; width: 100%; background: #22c55e; color: white; text-align: center; padding: 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-sizing: border-box;">
              View & Pay Invoice
            </a>
            
            <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
              If you have any questions, please reply to this email.
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
            Sent via Invoy - Simple invoicing for small businesses
          </p>
        </body>
      </html>
    `,
  });
  
  return result;
}

// Send payment received email
export async function sendPaymentReceivedEmail(options: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  businessName: string;
}) {
  const { client, fromEmail } = await getResendClient();
  
  const { to, clientName, invoiceNumber, amount, businessName } = options;
  
  const result = await client.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Payment Received - Invoice ${invoiceNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fafafa;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            
            <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 24px 0; color: #1a1a1a; text-align: center;">
              Payment Received!
            </h1>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              Thank you, ${clientName}! We've received your payment.
            </p>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin: 0 0 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #666; font-size: 14px; padding: 8px 0;">Invoice</td>
                  <td style="color: #1a1a1a; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="color: #666; font-size: 14px; padding: 8px 0;">Amount Paid</td>
                  <td style="color: #22c55e; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${amount}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
              This receipt was sent by ${businessName}
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
            Powered by Invoy
          </p>
        </body>
      </html>
    `,
  });
  
  return result;
}
