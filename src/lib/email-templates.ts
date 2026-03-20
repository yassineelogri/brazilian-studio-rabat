export function newBookingEmail(data: {
  clientName: string
  clientPhone: string
  serviceName: string
  date: string
  startTime: string
  appointmentId: string
}) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/dashboard/calendar`
  return {
    subject: `🌸 Nouvelle réservation — ${data.clientName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">Nouvelle demande de réservation</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Client</td><td><strong>${data.clientName}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Téléphone</td><td><strong>${data.clientPhone}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Service</td><td><strong>${data.serviceName}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Date</td><td><strong>${data.date}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Heure</td><td><strong>${data.startTime}</strong></td></tr>
        </table>
        <p style="margin-top: 24px;">
          <a href="${dashboardUrl}" style="background: #B76E79; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Voir dans le dashboard
          </a>
        </p>
      </div>
    `,
  }
}

export function confirmationEmail(data: {
  clientName: string
  serviceName: string
  date: string
  startTime: string
}) {
  return {
    subject: `✅ Votre rendez-vous est confirmé — Brazilian Studio`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">Votre rendez-vous est confirmé !</h2>
        <p>Bonjour ${data.clientName},</p>
        <p>Nous avons bien confirmé votre rendez-vous :</p>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Service</td><td><strong>${data.serviceName}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Date</td><td><strong>${data.date}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Heure</td><td><strong>${data.startTime}</strong></td></tr>
        </table>
        <p>Nous vous attendons avec plaisir. À bientôt ! 🌸</p>
        <p style="color: #999; font-size: 14px;">Brazilian Studio Rabat</p>
      </div>
    `,
  }
}

export function cancellationEmail(data: {
  clientName: string
  serviceName: string
  date: string
}) {
  return {
    subject: `Votre rendez-vous a été annulé — Brazilian Studio`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">Rendez-vous annulé</h2>
        <p>Bonjour ${data.clientName},</p>
        <p>Nous sommes désolés, votre rendez-vous pour <strong>${data.serviceName}</strong> le <strong>${data.date}</strong> a été annulé.</p>
        <p>N'hésitez pas à nous recontacter pour reprogrammer. 🌸</p>
        <p style="color: #999; font-size: 14px;">Brazilian Studio Rabat</p>
      </div>
    `,
  }
}

export function lowStockEmail(data: {
  productName: string
  brand: string | null
  stockQuantity: number
  lowStockThreshold: number
}) {
  const brandText = data.brand ? ` (${data.brand})` : ''
  return {
    subject: `⚠️ Stock bas — ${data.productName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">⚠️ Alerte stock bas</h2>
        <p>Le produit <strong>${data.productName}${brandText}</strong> est en stock bas.</p>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Stock actuel</td><td><strong>${data.stockQuantity} unité(s)</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Seuil d'alerte</td><td><strong>${data.lowStockThreshold} unité(s)</strong></td></tr>
        </table>
        <p style="margin-top: 16px;">Pensez à réapprovisionner.</p>
        <p style="color: #999; font-size: 14px;">— Brazilian Studio Rabat</p>
      </div>
    `,
  }
}
