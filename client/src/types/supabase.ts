export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: number
          name: string
          address: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          logo: string | null
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          address?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          logo?: string | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          address?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          logo?: string | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      mail_rooms: {
        Row: {
          id: number
          organization_id: number
          name: string
          location: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          organization_id: number
          name: string
          location?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          organization_id?: number
          name?: string
          location?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: number
          user_id: string
          organization_id: number
          mail_room_id: number | null
          first_name: string
          last_name: string
          email: string
          phone: string | null
          role: "admin" | "manager" | "staff" | "recipient"
          department: string | null
          location: string | null
          is_active: boolean
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          organization_id: number
          mail_room_id?: number | null
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          role?: "admin" | "manager" | "staff" | "recipient"
          department?: string | null
          location?: string | null
          is_active?: boolean
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          organization_id?: number
          mail_room_id?: number | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          role?: "admin" | "manager" | "staff" | "recipient"
          department?: string | null
          location?: string | null
          is_active?: boolean
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      external_people: {
        Row: {
          id: number
          organization_id: number
          first_name: string
          last_name: string
          email: string
          phone: string | null
          department: string | null
          location: string | null
          external_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          organization_id: number
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          department?: string | null
          location?: string | null
          external_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          organization_id?: number
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          department?: string | null
          location?: string | null
          external_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      mail_items: {
        Row: {
          id: number
          organization_id: number
          mail_room_id: number
          recipient_id: number | null
          external_recipient_id: number | null
          tracking_number: string | null
          carrier: "ups" | "fedex" | "usps" | "dhl" | "amazon" | "other" | null
          type: "package" | "letter" | "large_package" | "envelope" | "perishable" | "signature_required" | "other"
          description: string | null
          notes: string | null
          is_priority: boolean
          status: "pending" | "notified" | "picked_up" | "returned_to_sender" | "lost" | "other"
          received_at: string
          notified_at: string | null
          picked_up_at: string | null
          processed_by_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          organization_id: number
          mail_room_id: number
          recipient_id?: number | null
          external_recipient_id?: number | null
          tracking_number?: string | null
          carrier?: "ups" | "fedex" | "usps" | "dhl" | "amazon" | "other" | null
          type: "package" | "letter" | "large_package" | "envelope" | "perishable" | "signature_required" | "other"
          description?: string | null
          notes?: string | null
          is_priority?: boolean
          status?: "pending" | "notified" | "picked_up" | "returned_to_sender" | "lost" | "other"
          received_at?: string
          notified_at?: string | null
          picked_up_at?: string | null
          processed_by_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          organization_id?: number
          mail_room_id?: number
          recipient_id?: number | null
          external_recipient_id?: number | null
          tracking_number?: string | null
          carrier?: "ups" | "fedex" | "usps" | "dhl" | "amazon" | "other" | null
          type?: "package" | "letter" | "large_package" | "envelope" | "perishable" | "signature_required" | "other"
          description?: string | null
          notes?: string | null
          is_priority?: boolean
          status?: "pending" | "notified" | "picked_up" | "returned_to_sender" | "lost" | "other"
          received_at?: string
          notified_at?: string | null
          picked_up_at?: string | null
          processed_by_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}