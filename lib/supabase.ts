import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          client_id: string;
          type: 'bike' | 'scooter';
          brand: string | null;
          model: string | null;
          serial_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          type: 'bike' | 'scooter';
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          type?: 'bike' | 'scooter';
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          created_at?: string;
        };
      };
      repairs: {
        Row: {
          id: string;
          client_id: string;
          vehicle_id: string;
          vendor_name: string;
          client_issue: string;
          status: 'initial' | 'pending_approval' | 'parts_ordered' | 'in_repair' | 'completed';
          desired_return_date: string | null;
          estimated_labor_minutes: number;
          preliminary_quote: number;
          client_decision: 'accepted' | 'max_price' | 'detailed_quote' | null;
          max_price: number | null;
          detailed_quote_fee: number;
          final_quote: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          vehicle_id: string;
          vendor_name: string;
          client_issue: string;
          status?: 'initial' | 'pending_approval' | 'parts_ordered' | 'in_repair' | 'completed';
          desired_return_date?: string | null;
          estimated_labor_minutes?: number;
          preliminary_quote?: number;
          client_decision?: 'accepted' | 'max_price' | 'detailed_quote' | null;
          max_price?: number | null;
          detailed_quote_fee?: number;
          final_quote?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          vehicle_id?: string;
          vendor_name?: string;
          client_issue?: string;
          status?: 'initial' | 'pending_approval' | 'parts_ordered' | 'in_repair' | 'completed';
          desired_return_date?: string | null;
          estimated_labor_minutes?: number;
          preliminary_quote?: number;
          client_decision?: 'accepted' | 'max_price' | 'detailed_quote' | null;
          max_price?: number | null;
          detailed_quote_fee?: number;
          final_quote?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      checklist_items: {
        Row: {
          id: string;
          category: string;
          item_name: string;
          estimated_labor_minutes: number;
          estimated_parts_cost: number;
          order_index: number;
          vehicle_type: 'bike' | 'scooter' | 'both';
        };
        Insert: {
          id?: string;
          category: string;
          item_name: string;
          estimated_labor_minutes?: number;
          estimated_parts_cost?: number;
          order_index?: number;
          vehicle_type?: 'bike' | 'scooter' | 'both';
        };
        Update: {
          id?: string;
          category?: string;
          item_name?: string;
          estimated_labor_minutes?: number;
          estimated_parts_cost?: number;
          order_index?: number;
          vehicle_type?: 'bike' | 'scooter' | 'both';
        };
      };
      repair_checklist: {
        Row: {
          id: string;
          repair_id: string;
          checklist_item_id: string;
          status: 'ok' | 'ng';
          technician_notes: string | null;
        };
        Insert: {
          id?: string;
          repair_id: string;
          checklist_item_id: string;
          status: 'ok' | 'ng';
          technician_notes?: string | null;
        };
        Update: {
          id?: string;
          repair_id?: string;
          checklist_item_id?: string;
          status?: 'ok' | 'ng';
          technician_notes?: string | null;
        };
      };
    };
  };
};
