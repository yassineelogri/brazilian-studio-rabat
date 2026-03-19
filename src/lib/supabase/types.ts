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
}

export interface AppointmentWithRelations extends Appointment {
  clients: Pick<Client, 'name' | 'phone' | 'email'>
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

export type Database = {
  public: {
    Tables: {
      staff:        { Row: Staff;        Insert: Omit<Staff, 'id' | 'created_at'>; Update: Partial<Omit<Staff, 'id'>> }
      services:     { Row: Service;      Insert: Omit<Service, 'id'>;              Update: Partial<Omit<Service, 'id'>> }
      clients:      { Row: Client;       Insert: Omit<Client, 'id' | 'created_at'>; Update: Partial<Omit<Client, 'id'>> }
      appointments: { Row: Appointment;  Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Appointment, 'id'>> }
      notifications:{ Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Omit<Notification, 'id'>> }
    }
  }
}
