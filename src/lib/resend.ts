import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const NOTIFY_EMAILS = [
  process.env.NOTIFY_EMAIL_1,
  process.env.NOTIFY_EMAIL_2,
].filter(Boolean) as string[]
