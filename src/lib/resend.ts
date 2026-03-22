import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

// Keep backward-compat export for callers that use `resend.emails.send(...)`
export const resend = {
  emails: {
    send: (...args: Parameters<Resend['emails']['send']>) =>
      getResend().emails.send(...args),
  },
}

export const NOTIFY_EMAILS = ((): string[] => {
  const emails = [process.env.NOTIFY_EMAIL_1, process.env.NOTIFY_EMAIL_2]
  return emails.filter(Boolean) as string[]
})()
