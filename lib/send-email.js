import { Resend } from 'resend';

export async function sendEmail({ to, subject, html, text }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const email = { from: process.env.FROM_EMAIL, replyTo: 'info@synergytechnofin.com', to, subject, html, text };
  const { data, error } = await resend.emails.send(email);
  if (error) throw new Error(error.message);
  return data;
}
