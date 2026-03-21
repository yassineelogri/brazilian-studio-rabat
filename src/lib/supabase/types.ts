export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type StaffRole = 'worker' | 'manager' | 'secretary'
export type CreatedBy = 'client' | 'staff'
export type NotificationType = 'new_booking' | 'confirmed' | 'cancelled'

export interface Staff {
  [key: string]: unknown
  id: string
  name: string
  role: StaffRole
  auth_user_id: string | null
  is_active: boolean
  created_at: string
}

export interface Service {
  [key: string]: unknown
  id: string
  name: string
  description: string | null
  min_duration: number
  max_duration: number
  color: string
  is_active: boolean
}

export interface Client {
  [key: string]: unknown
  id: string
  name: string
  phone: string
  email: string | null
  auth_user_id: string | null
  created_at: string
}

export interface Appointment {
  [key: string]: unknown
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
  [key: string]: unknown
  id: string
  appointment_id: string
  type: NotificationType
  read: boolean
  created_at: string
}

export interface Product {
  [key: string]: unknown
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
  [key: string]: unknown
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
  [key: string]: unknown
  id: string
  devis_id: string
  description: string
  quantity: number
  unit_price: number
  sort_order: number
}

export interface Devis {
  [key: string]: unknown
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
  [key: string]: unknown
  id: string
  facture_id: string
  description: string
  quantity: number
  unit_price: number
  sort_order: number
}

export interface Facture {
  [key: string]: unknown
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

export type Database = {
  __InternalSupabase: { PostgrestVersion: '11' }
  public: {
    Tables: {
      staff:         { Row: Staff;        Insert: Omit<Staff, 'id' | 'created_at'>;                       Update: Partial<Omit<Staff, 'id'>>;         Relationships: DBRelationship[] }
      services:      { Row: Service;      Insert: Omit<Service, 'id'>;                                    Update: Partial<Omit<Service, 'id'>>;       Relationships: DBRelationship[] }
      clients:       { Row: Client;       Insert: Omit<Client, 'id' | 'created_at'>;                      Update: Partial<Omit<Client, 'id'>>;        Relationships: DBRelationship[] }
      appointments:  { Row: Appointment;  Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Appointment, 'id'>>;   Relationships: DBRelationship[] }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>;               Update: Partial<Omit<Notification, 'id'>>;  Relationships: DBRelationship[] }
      products:      { Row: Product;      Insert: Omit<Product, 'id' | 'created_at'>;                     Update: Partial<Omit<Product, 'id'>>;       Relationships: DBRelationship[] }
      product_sales: { Row: ProductSale;  Insert: Omit<ProductSale, 'id'>;                                 Update: Partial<Omit<ProductSale, 'id'>>;   Relationships: DBRelationship[] }
      devis:         { Row: Devis;       Insert: Omit<Devis, 'id' | 'created_at'>;        Update: Partial<Omit<Devis, 'id'>>;        Relationships: DBRelationship[] }
      devis_items:   { Row: DevisItem;   Insert: Omit<DevisItem, 'id'>;                    Update: Partial<Omit<DevisItem, 'id'>>;    Relationships: DBRelationship[] }
      factures:      { Row: Facture;     Insert: Omit<Facture, 'id' | 'created_at'>;       Update: Partial<Omit<Facture, 'id'>>;      Relationships: DBRelationship[] }
      facture_items: { Row: FactureItem; Insert: Omit<FactureItem, 'id'>;                  Update: Partial<Omit<FactureItem, 'id'>>; Relationships: DBRelationship[] }
      booking_tokens: { Row: BookingToken; Insert: Omit<BookingToken, 'id' | 'token' | 'created_at'>; Update: Partial<Omit<BookingToken, 'id' | 'token'>>; Relationships: DBRelationship[] }
    }
    Views: Record<string, { Row: Record<string, unknown>; Relationships: DBRelationship[] }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
  }
}
