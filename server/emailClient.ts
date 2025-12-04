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
