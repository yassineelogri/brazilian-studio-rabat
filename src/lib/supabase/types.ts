export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type StaffRole = 'worker' | 'manager' | 'secretary'
export type CreatedBy = 'client' | 'staff'
export type NotificationType = 'new_booking' | 'confirmed' | 'cancelled'

export interface Staff {
  id: string
  name: string
  role: StaffRole
  auth_user_id: string | null
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  min_duration: number
  max_duration: number
  color: string
  is_active: boolean
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  auth_user_id: string | null
  created_at: string
}

export interface Appointment {
  id: string
  client_id: string
  service_id: string
  staff_id: string | null
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: AppointmentStatus
  notes: string | null
  created_by: CreatedBy
  created_at: string
  updated_at: string
  starts_at?: string | null
}

export interface AppointmentWithRelations extends Appointment {
  clients: Pick<Client, 'name' | 'phone' | 'email'>
  services: Pick<Service, 'name' | 'color'>
  staff: Pick<Staff, 'name'> | null
}

export interface BookingToken {
  [key: string]: unknown
  id: string
  token: string
  client_id: string
  appointment_id: string
  expires_at: string
  created_at: string
}

export interface Reminder {
  id: string
  appointment_id: string
  type: '24h' | '2h'
  sent_at: string
}

export interface AppointmentForClient {
  id: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: AppointmentStatus
  notes: string | null
  starts_at: string
  services: Pick<Service, 'name' | 'color'>
  staff: Pick<Staff, 'name'> | null
}

export interface Notification {
  id: string
  appointment_id: string
  type: NotificationType
  read: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  brand: string | null
  buying_price: number
  selling_price: number
  stock_quantity: number
  low_stock_threshold: number
  is_active: boolean
  created_at: string
}

export interface ProductSale {
  id: string
  product_id: string
  appointment_id: string | null
  quantity: number
  unit_price: number
  sold_by: string | null
  sold_at: string
  notes: string | null
}

export interface ProductSaleWithRelations extends ProductSale {
  product: Pick<Product, 'id' | 'name' | 'brand'>
  staff: Pick<Staff, 'id' | 'name'> | null
  total: number
  margin_per_unit: number
  margin_total: number
}

export type DevisStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export type FactureStatus = 'draft' | 'sent' | 'paid' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'transfer'

export interface StatusEvent {
  at: string    // ISO timestamp
  by: string    // staff id
  status: string
}

export interface DevisItem {
  id: string
  devis_id: string
  description: string
  quantity: number
  unit_price: number
  sort_order: number
}

export interface Devis {
  id: string
  number: string
  client_id: string
  appointment_id: string | null
  status: DevisStatus
  tva_rate: number
  notes: string | null
  valid_until: string | null
  events: StatusEvent[]
  created_at: string
}

export interface DevisWithRelations extends Devis {
  clients: Pick<Client, 'name' | 'phone' | 'email'>
  items: DevisItem[]
  subtotal_ht: number
  tva_amount: number
  total_ttc: number
}

export interface FactureItem {
  id: string
  facture_id: string
  description: string
  quantity: number
  unit_price: number
  sort_order: number
}

export interface Facture {
  id: string
  number: string
  client_id: string
  devis_id: string | null
  appointment_id: string | null
  status: FactureStatus
  tva_rate: number
  notes: string | null
  paid_at: string | null
  paid_amount: number | null
  payment_method: PaymentMethod | null
  events: StatusEvent[]
  created_at: string
}

export interface FactureWithRelations extends Facture {
  clients: Pick<Client, 'name' | 'phone' | 'email'>
  items: FactureItem[]
  subtotal_ht: number
  tva_amount: number
  total_ttc: number
}

type DBRelationship = { foreignKeyName: string; columns: string[]; isOneToOne?: boolean; referencedRelation: string; referencedColumns: string[] }

// Helper: make a type compatible with Record<string, unknown> for Supabase generics
type Insertable<T> = T & Record<string, unknown>
type Updatable<T> = T & Record<string, unknown>

export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' }
  public: {
    Tables: {
      staff:         { Row: Staff & Record<string, unknown>;        Insert: Insertable<Partial<Omit<Staff, 'id' | 'created_at'>>>;                       Update: Updatable<Partial<Omit<Staff, 'id'>>>;         Relationships: DBRelationship[] }
      services:      { Row: Service & Record<string, unknown>;      Insert: Insertable<Partial<Omit<Service, 'id'>>>;                                    Update: Updatable<Partial<Omit<Service, 'id'>>>;       Relationships: DBRelationship[] }
      clients:       { Row: Client & Record<string, unknown>;       Insert: Insertable<Partial<Omit<Client, 'id' | 'created_at'>>>;                      Update: Updatable<Partial<Omit<Client, 'id'>>>;        Relationships: DBRelationship[] }
      appointments:  { Row: Appointment & Record<string, unknown>;  Insert: Insertable<Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at'>>>; Update: Updatable<Partial<Omit<Appointment, 'id'>>>;   Relationships: DBRelationship[] }
      notifications: { Row: Notification & Record<string, unknown>; Insert: Insertable<Partial<Omit<Notification, 'id' | 'created_at'>>>;               Update: Updatable<Partial<Omit<Notification, 'id'>>>;  Relationships: DBRelationship[] }
      products:      { Row: Product & Record<string, unknown>;      Insert: Insertable<Partial<Omit<Product, 'id' | 'created_at'>>>;                     Update: Updatable<Partial<Omit<Product, 'id'>>>;       Relationships: DBRelationship[] }
      product_sales: { Row: ProductSale & Record<string, unknown>;  Insert: Insertable<Partial<Omit<ProductSale, 'id'>>>;                                 Update: Updatable<Partial<Omit<ProductSale, 'id'>>>;   Relationships: DBRelationship[] }
      devis:         { Row: Devis & Record<string, unknown>;       Insert: Insertable<Partial<Omit<Devis, 'id' | 'created_at'>>>;        Update: Updatable<Partial<Omit<Devis, 'id'>>>;        Relationships: DBRelationship[] }
      devis_items:   { Row: DevisItem & Record<string, unknown>;   Insert: Insertable<Partial<Omit<DevisItem, 'id'>>>;                    Update: Updatable<Partial<Omit<DevisItem, 'id'>>>;    Relationships: DBRelationship[] }
      factures:      { Row: Facture & Record<string, unknown>;     Insert: Insertable<Partial<Omit<Facture, 'id' | 'created_at'>>>;       Update: Updatable<Partial<Omit<Facture, 'id'>>>;      Relationships: DBRelationship[] }
      facture_items: { Row: FactureItem & Record<string, unknown>; Insert: Insertable<Partial<Omit<FactureItem, 'id'>>>;                  Update: Updatable<Partial<Omit<FactureItem, 'id'>>>; Relationships: DBRelationship[] }
      booking_tokens: { Row: BookingToken & Record<string, unknown>; Insert: Insertable<Partial<Omit<BookingToken, 'id' | 'token' | 'created_at'>>>; Update: Updatable<Partial<Omit<BookingToken, 'id' | 'token'>>>; Relationships: DBRelationship[] }
      reminders: { Row: Reminder & Record<string, unknown>; Insert: Insertable<Partial<Omit<Reminder, 'id' | 'sent_at'>>>; Update: Updatable<Partial<Omit<Reminder, 'id'>>>; Relationships: DBRelationship[] }
    }
    Views: Record<string, { Row: Record<string, unknown>; Relationships: DBRelationship[] }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
  }
}
