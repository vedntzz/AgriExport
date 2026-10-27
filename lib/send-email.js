import { Resend } from 'resend';
import nodemailer from 'nodemailer';

function gmailTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error('Gmail email settings are incomplete');
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
}

async function sendGmail(email) {
  const from = `AgriXport India 2027 <${process.env.GMAIL_USER}>`;
  const result = await gmailTransport().sendMail({ ...email, from, replyTo: 'info@synergytechnofin.com' });
  if (!result.accepted?.length) throw new Error('Gmail did not accept the recipient');
  return result;
}

async function sendResend(email) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({ ...email, from: process.env.FROM_EMAIL, replyTo: 'info@synergytechnofin.com' });
  if (error) throw new Error(error.message);
  return data;
}

export async function sendEmail({ to, subject, html, text }) {
  const provider = process.env.EMAIL_PROVIDER || 'resend';
  if (!['gmail', 'resend'].includes(provider)) throw new Error('Choose gmail or resend for EMAIL_PROVIDER');
  return provider === 'gmail' ? sendGmail({ to, subject, html, text }) : sendResend({ to, subject, html, text });
}
