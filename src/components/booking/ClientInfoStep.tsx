interface ClientInfo {
  name: string
  phone: string
  email: string
}

interface Props {
  info: ClientInfo
  onChange: (info: ClientInfo) => void
}

export default function ClientInfoStep({ info, onChange }: Props) {
  function update(field: keyof ClientInfo, value: string) {
    onChange({ ...info, [field]: value })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-salon-dark mb-4">Vos coordonnées</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-salon-dark mb-1">Nom complet *</label>
          <input
            type="text"
            value={info.name}
            onChange={e => update('name', e.target.value)}
            required
            placeholder="Votre nom"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-salon-dark mb-1">Téléphone *</label>
          <input
            type="tel"
            value={info.phone}
            onChange={e => update('phone', e.target.value)}
            required
            placeholder="06 XX XX XX XX"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-salon-dark mb-1">
            Email <span className="text-salon-muted font-normal">(optionnel — pour la confirmation)</span>
          </label>
          <input
            type="email"
            value={info.email}
            onChange={e => update('email', e.target.value)}
            placeholder="votre@email.com"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
          />
        </div>
      </div>
    </div>
  )
}
