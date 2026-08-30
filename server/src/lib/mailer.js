import nodemailer from 'nodemailer'

// New feature: email notifications for appointment/consultation confirmations.
// Follows the same defensive pattern as GROQ_API_KEY / GOOGLE_CLIENT_ID
// elsewhere in this app: if the required env vars aren't set, we skip
// silently (log once) instead of crashing the request that triggered it.
// Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM to server/.env
// to enable. Any SMTP provider works (Gmail app password, SendGrid, Mailtrap
// for testing, etc).
let transporter = null
let warnedMissingConfig = false

function getTransporter() {
  if (transporter) return transporter
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (!warnedMissingConfig) {
      console.log('Email notifications are disabled - set SMTP_HOST/SMTP_USER/SMTP_PASS in server/.env to enable them (see README).')
      warnedMissingConfig = true
    }
    return null
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  return transporter
}

// Fire-and-forget - never throws, so a broken/missing SMTP config can never
// break the API request that triggered the notification.
export async function sendMail({ to, subject, html }) {
  if (!to) return
  const t = getTransporter()
  if (!t) return
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('sendMail failed (continuing anyway):', err.message)
  }
}

export function appointmentConfirmationEmail({ patientName, doctorName, date, timeSlot, type }) {
  return {
    subject: `Appointment confirmed with ${doctorName} — MediCare+`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0d8a7c;">Appointment Confirmed</h2>
        <p>Hi ${patientName || 'there'},</p>
        <p>Your ${type || 'in-person'} appointment with <strong>${doctorName}</strong> is confirmed.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:6px 0; color:#667085;">Date</td><td style="padding:6px 0;"><strong>${date}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#667085;">Time</td><td style="padding:6px 0;"><strong>${timeSlot}</strong></td></tr>
        </table>
        <p style="color:#667085; font-size: 13px;">You can view or manage this appointment anytime from your MediCare+ dashboard.</p>
      </div>
    `,
  }
}

export function consultationConfirmationEmail({ patientName, doctorName, date, timeSlot, mode }) {
  return {
    subject: `Consultation scheduled with ${doctorName} — MediCare+`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0d8a7c;">Consultation Scheduled</h2>
        <p>Hi ${patientName || 'there'},</p>
        <p>Your ${mode || 'video'} consultation with <strong>${doctorName}</strong> has been scheduled.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:6px 0; color:#667085;">Date</td><td style="padding:6px 0;"><strong>${date}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#667085;">Time</td><td style="padding:6px 0;"><strong>${timeSlot}</strong></td></tr>
        </table>
        <p style="color:#667085; font-size: 13px;">Join from your MediCare+ dashboard a few minutes before your slot.</p>
      </div>
    `,
  }
}
