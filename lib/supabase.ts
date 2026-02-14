import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string
          created_at: string
          date: string
          customer_name: string
          order_name: string
          price: number
          is_paid: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          date: string
          customer_name: string
          order_name: string
          price: number
          is_paid?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          date?: string
          customer_name?: string
          order_name?: string
          price?: number
          is_paid?: boolean
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          username: string
          password_hash: string
          role: 'admin' | 'user'
        }
        Insert: {
          id?: string
          created_at?: string
          username: string
          password_hash: string
          role?: 'admin' | 'user'
        }
        Update: {
          id?: string
          created_at?: string
          username?: string
          password_hash?: string
          role?: 'admin' | 'user'
        }
      }
    }
  }
}