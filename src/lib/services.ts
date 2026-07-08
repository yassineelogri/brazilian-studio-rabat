export interface ServiceInput {
  name: string
  min_duration: number
  max_duration: number
  price?: number | null
}

export function formatDurationRange(minDuration: number, maxDuration: number): string {
  if (minDuration === maxDuration) return `${minDuration} min`
  return `${minDuration}-${maxDuration} min`
}

export function formatServicePrice(price: number | null | undefined): string | null {
  if (price == null) return null
  return `${price} DH`
}

export function validateServiceInput(input: ServiceInput): string | null {
  if (!input.name.trim()) return 'Nom obligatoire'
  if (input.min_duration <= 0 || input.max_duration <= 0) return 'Duree invalide'
  if (input.max_duration < input.min_duration) return 'La duree max doit etre superieure a la duree min'
  if (input.price != null && input.price < 0) return 'Prix invalide'
  return null
}
