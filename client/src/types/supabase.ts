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
          contactName: string | null
          contactEmail: string | null
          contactPhone: string | null
          logo: string | null
          settings: Json | null
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: number
          name: string
          address?: string | null
          contactName?: string | null
          contactEmail?: string | null
          contactPhone?: string | null
          logo?: string | null
          settings?: Json | null
          createdAt?: string
          updatedAt?: string | null
        }
        Update: {
          id?: number
          name?: string
          address?: string | null
          contactName?: string | null
          contactEmail?: string | null
          contactPhone?: string | null
          logo?: string | null
          settings?: Json | null
          createdAt?: string
          updatedAt?: string | null
        }
      }
      mail_rooms: {
        Row: {
          id: number
          name: string
          organizationId: number
          location: string | null
          contactEmail: string | null
          contactPhone: string | null
          status: string
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: number
          name: string
          organizationId: number
          location?: string | null
          contactEmail?: string | null
          contactPhone?: string | null
          status?: string
          createdAt?: string
          updatedAt?: string | null
        }
        Update: {
          id?: number
          name?: string
          organizationId?: number
          location?: string | null
          contactEmail?: string | null
          contactPhone?: string | null
          status?: string
          createdAt?: string
          updatedAt?: string | null
        }
      }
      user_profiles: {
        Row: {
          id: number
          userId: string
          firstName: string
          lastName: string
          email: string
          phone: string | null
          department: string | null
          location: string | null
          organizationId: number
          mailRoomId: number | null
          role: string
          password: string
          isActive: boolean
          settings: Json | null
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: number
          userId: string
          firstName: string
          lastName: string
          email: string
          phone?: string | null
          department?: string | null
          location?: string | null
          organizationId: number
          mailRoomId?: number | null
          role?: string
          password: string
          isActive?: boolean
          settings?: Json | null
          createdAt?: string
          updatedAt?: string | null
        }
        Update: {
          id?: number
          userId?: string
          firstName?: string
          lastName?: string
          email?: string
          phone?: string | null
          department?: string | null
          location?: string | null
          organizationId?: number
          mailRoomId?: number | null
          role?: string
          password?: string
          isActive?: boolean
          settings?: Json | null
          createdAt?: string
          updatedAt?: string | null
        }
      }
    }
  }
}