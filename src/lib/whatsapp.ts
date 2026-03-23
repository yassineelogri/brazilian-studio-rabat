/**
 * WhatsApp utility — wraps Meta Cloud API message sends.
 * Uses WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID env vars.
 * Never import in client components.
 */

export interface WhatsAppResult {
  ok: boolean
  error?: string
}

/**
 * Normalise a phone number to E.164 format without the leading +.
 * Handles Moroccan local formats (9-digit, 10-digit with leading 0).
 * Returns null if the result is invalid.
 */
export function normalisePhone(raw: string): string | null {
  // Strip spaces, dashes, parentheses, dots
  let n = raw.replace(/[\s\-().]/g, '')

  // Remove leading +
  if (n.startsWith('+')) n = n.slice(1)

  // Remove leading 00 (international dialling prefix)
  if (n.startsWith('00')) n = n.slice(2)

  // Moroccan local: 9 digits starting with 6 or 7 (mobile) or 5 (fixed)
  if (/^\d{9}$/.test(n)) n = '212' + n

  // Moroccan local: 10 digits starting with 0
  if (/^0\d{9}$/.test(n)) n = '212' + n.slice(1)

  // Validate: must be 10–15 digits
  if (!/^\d{10,15}$/.test(n)) return null

  return n
}

/**
 * Send a WhatsApp template message via Meta Cloud API.
 *
 * @param phone  Raw phone number as stored in DB (will be normalised)
 * @param templateName  Approved template name, e.g. 'rdv_rappel_24h'
 * @param params  Ordered array of template variable values: ['Client Name', '14h30', 'Épilation']
 */
export async function sendWhatsAppReminder(
  phone: string,
  templateName: string,
  params: string[]
): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    return { ok: false, error: 'WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured' }
  }

  const to = normalisePhone(phone)
  if (!to) {
    return { ok: false, error: 'invalid_phone' }
  }

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'fr' },
      components: [
        {
          type: 'body',
          parameters: params.map(value => ({ type: 'text', text: value })),
        },
      ],
    },
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) {
      const detail = await res.text()
      return { ok: false, error: `Meta API ${res.status}: ${detail}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
