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
}

export interface AppointmentWithRelations extends Appointment {
  clients: Pick<Client, 'name' | 'phone' | 'email'>
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
    }
    Views: Record<string, { Row: Record<string, unknown>; Relationships: DBRelationship[] }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
  }
}
