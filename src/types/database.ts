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
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          name: string | null
          bio: string | null
          age: number | null
          gender: 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say' | null
          occupation: string | null
          profile_photo: string | null
          photos: string[] | null
          phone: string | null
          phone_verified: boolean
          email_verified: boolean
          verification_level: 'basic' | 'verified' | 'trusted'
          verified_at: string | null
          languages: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          name?: string | null
          bio?: string | null
          age?: number | null
          gender?: 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say' | null
          occupation?: string | null
          profile_photo?: string | null
          photos?: string[] | null
          phone?: string | null
          phone_verified?: boolean
          email_verified?: boolean
          verification_level?: 'basic' | 'verified' | 'trusted'
          verified_at?: string | null
          languages?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          name?: string | null
          bio?: string | null
          age?: number | null
          gender?: 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say' | null
          occupation?: string | null
          profile_photo?: string | null
          photos?: string[] | null
          phone?: string | null
          phone_verified?: boolean
          email_verified?: boolean
          verification_level?: 'basic' | 'verified' | 'trusted'
          verified_at?: string | null
          languages?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      lifestyle_responses: {
        Row: {
          id: string
          user_id: string
          work_schedule: 'nine_to_five' | 'shift_work' | 'remote' | 'flexible' | 'student' | null
          sleep_schedule: 'early_bird' | 'night_owl' | 'flexible' | null
          noise_tolerance: 'quiet' | 'moderate' | 'loud_ok' | null
          guest_frequency: 'never' | 'rarely' | 'sometimes' | 'often' | null
          overnight_guests: 'never' | 'rarely' | 'sometimes' | 'often' | null
          cleanliness_level: 'spotless' | 'tidy' | 'relaxed' | 'messy' | null
          cleaning_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | null
          cooking_habits: 'never' | 'rarely' | 'sometimes' | 'daily' | null
          shared_groceries: boolean | null
          smoking: 'never' | 'outside_only' | 'yes' | null
          cannabis: 'never' | 'outside_only' | 'yes' | null
          alcohol: 'never' | 'socially' | 'regularly' | null
          pets_preference: 'no_pets' | 'cats_ok' | 'dogs_ok' | 'all_pets_ok' | 'have_pets' | null
          pet_details: string | null
          communication_style: 'minimal' | 'occasional' | 'frequent' | 'very_social' | null
          conflict_resolution: 'direct' | 'written' | 'mediated' | 'avoid' | null
          remote_work_frequency: 'never' | 'sometimes' | 'mostly' | 'always' | null
          temperature_preference: 'cold' | 'moderate' | 'warm' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_schedule?: 'nine_to_five' | 'shift_work' | 'remote' | 'flexible' | 'student' | null
          sleep_schedule?: 'early_bird' | 'night_owl' | 'flexible' | null
          noise_tolerance?: 'quiet' | 'moderate' | 'loud_ok' | null
          guest_frequency?: 'never' | 'rarely' | 'sometimes' | 'often' | null
          overnight_guests?: 'never' | 'rarely' | 'sometimes' | 'often' | null
          cleanliness_level?: 'spotless' | 'tidy' | 'relaxed' | 'messy' | null
          cleaning_frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | null
          cooking_habits?: 'never' | 'rarely' | 'sometimes' | 'daily' | null
          shared_groceries?: boolean | null
          smoking?: 'never' | 'outside_only' | 'yes' | null
          cannabis?: 'never' | 'outside_only' | 'yes' | null
          alcohol?: 'never' | 'socially' | 'regularly' | null
          pets_preference?: 'no_pets' | 'cats_ok' | 'dogs_ok' | 'all_pets_ok' | 'have_pets' | null
          pet_details?: string | null
          communication_style?: 'minimal' | 'occasional' | 'frequent' | 'very_social' | null
          conflict_resolution?: 'direct' | 'written' | 'mediated' | 'avoid' | null
          remote_work_frequency?: 'never' | 'sometimes' | 'mostly' | 'always' | null
          temperature_preference?: 'cold' | 'moderate' | 'warm' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_schedule?: 'nine_to_five' | 'shift_work' | 'remote' | 'flexible' | 'student' | null
          sleep_schedule?: 'early_bird' | 'night_owl' | 'flexible' | null
          noise_tolerance?: 'quiet' | 'moderate' | 'loud_ok' | null
          guest_frequency?: 'never' | 'rarely' | 'sometimes' | 'often' | null
          overnight_guests?: 'never' | 'rarely' | 'sometimes' | 'often' | null
          cleanliness_level?: 'spotless' | 'tidy' | 'relaxed' | 'messy' | null
          cleaning_frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | null
          cooking_habits?: 'never' | 'rarely' | 'sometimes' | 'daily' | null
          shared_groceries?: boolean | null
          smoking?: 'never' | 'outside_only' | 'yes' | null
          cannabis?: 'never' | 'outside_only' | 'yes' | null
          alcohol?: 'never' | 'socially' | 'regularly' | null
          pets_preference?: 'no_pets' | 'cats_ok' | 'dogs_ok' | 'all_pets_ok' | 'have_pets' | null
          pet_details?: string | null
          communication_style?: 'minimal' | 'occasional' | 'frequent' | 'very_social' | null
          conflict_resolution?: 'direct' | 'written' | 'mediated' | 'avoid' | null
          remote_work_frequency?: 'never' | 'sometimes' | 'mostly' | 'always' | null
          temperature_preference?: 'cold' | 'moderate' | 'warm' | null
          created_at?: string
          updated_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          user_id: string
          type: 'room' | 'shared_room' | 'entire_place'
          title: string
          description: string | null
          price: number
          utilities_included: boolean
          available_date: string
          minimum_stay: number | null
          address: string | null
          city: string
          province: string
          postal_code: string | null
          lat: number | null
          lng: number | null
          photos: string[]
          amenities: string[]
          roommate_gender_preference: 'male' | 'female' | 'any' | null
          roommate_age_min: number | null
          roommate_age_max: number | null
          newcomer_friendly: boolean
          no_credit_history_ok: boolean
          is_active: boolean
          is_verified: boolean
          views_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'room' | 'shared_room' | 'entire_place'
          title: string
          description?: string | null
          price: number
          utilities_included?: boolean
          available_date: string
          minimum_stay?: number | null
          address?: string | null
          city: string
          province: string
          postal_code?: string | null
          lat?: number | null
          lng?: number | null
          photos?: string[]
          amenities?: string[]
          roommate_gender_preference?: 'male' | 'female' | 'any' | null
          roommate_age_min?: number | null
          roommate_age_max?: number | null
          newcomer_friendly?: boolean
          no_credit_history_ok?: boolean
          is_active?: boolean
          is_verified?: boolean
          views_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'room' | 'shared_room' | 'entire_place'
          title?: string
          description?: string | null
          price?: number
          utilities_included?: boolean
          available_date?: string
          minimum_stay?: number | null
          address?: string | null
          city?: string
          province?: string
          postal_code?: string | null
          lat?: number | null
          lng?: number | null
          photos?: string[]
          amenities?: string[]
          roommate_gender_preference?: 'male' | 'female' | 'any' | null
          roommate_age_min?: number | null
          roommate_age_max?: number | null
          newcomer_friendly?: boolean
          no_credit_history_ok?: boolean
          is_active?: boolean
          is_verified?: boolean
          views_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      seeking_profiles: {
        Row: {
          id: string
          user_id: string
          budget_min: number
          budget_max: number
          move_in_date: string
          preferred_cities: string[]
          preferred_areas: string[] | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          budget_min: number
          budget_max: number
          move_in_date: string
          preferred_cities: string[]
          preferred_areas?: string[] | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          budget_min?: number
          budget_max?: number
          move_in_date?: string
          preferred_cities?: string[]
          preferred_areas?: string[] | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          participant_ids: string[]
          listing_id: string | null
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_ids: string[]
          listing_id?: string | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_ids?: string[]
          listing_id?: string | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          read_at?: string | null
          created_at?: string
        }
      }
      verifications: {
        Row: {
          id: string
          user_id: string
          type: 'id' | 'credit' | 'criminal' | 'reference'
          provider: 'certn' | 'manual'
          external_id: string | null
          status: 'pending' | 'completed' | 'failed'
          result: Json | null
          completed_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'id' | 'credit' | 'criminal' | 'reference'
          provider?: 'certn' | 'manual'
          external_id?: string | null
          status?: 'pending' | 'completed' | 'failed'
          result?: Json | null
          completed_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'id' | 'credit' | 'criminal' | 'reference'
          provider?: 'certn' | 'manual'
          external_id?: string | null
          status?: 'pending' | 'completed' | 'failed'
          result?: Json | null
          completed_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_user_id: string | null
          reported_listing_id: string | null
          type: 'scam' | 'harassment' | 'fake' | 'discrimination' | 'other'
          description: string
          status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          admin_notes: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_user_id?: string | null
          reported_listing_id?: string | null
          type: 'scam' | 'harassment' | 'fake' | 'discrimination' | 'other'
          description: string
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          admin_notes?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_user_id?: string | null
          reported_listing_id?: string | null
          type?: 'scam' | 'harassment' | 'fake' | 'discrimination' | 'other'
          description?: string
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          admin_notes?: string | null
          created_at?: string
          resolved_at?: string | null
        }
      }
      saved_listings: {
        Row: {
          id: string
          user_id: string
          listing_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string
          created_at?: string
        }
      }
      blocked_users: {
        Row: {
          id: string
          user_id: string
          blocked_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          blocked_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          blocked_user_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_compatibility: {
        Args: { user_id_1: string; user_id_2: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Listing = Database['public']['Tables']['listings']['Row']
export type SeekingProfile = Database['public']['Tables']['seeking_profiles']['Row']
export type LifestyleResponses = Database['public']['Tables']['lifestyle_responses']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Verification = Database['public']['Tables']['verifications']['Row']
export type Report = Database['public']['Tables']['reports']['Row']
