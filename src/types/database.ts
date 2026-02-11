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
          city: string | null
          province: string | null
          is_admin: boolean
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
          city?: string | null
          province?: string | null
          is_admin?: boolean
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
          city?: string | null
          province?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
          bathroom_type: 'ensuite' | 'private' | 'shared' | null
          bathroom_size: 'full' | 'three_quarter' | 'half' | null
          roommate_gender_preference: 'male' | 'female' | 'any' | null
          roommate_age_min: number | null
          roommate_age_max: number | null
          newcomer_friendly: boolean
          no_credit_history_ok: boolean
          help_needed: boolean
          help_tasks: string[] | null
          help_details: string | null
          ideal_for_students: boolean
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
          bathroom_type?: 'ensuite' | 'private' | 'shared' | null
          bathroom_size?: 'full' | 'three_quarter' | 'half' | null
          roommate_gender_preference?: 'male' | 'female' | 'any' | null
          roommate_age_min?: number | null
          roommate_age_max?: number | null
          newcomer_friendly?: boolean
          no_credit_history_ok?: boolean
          help_needed?: boolean
          help_tasks?: string[] | null
          help_details?: string | null
          ideal_for_students?: boolean
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
          bathroom_type?: 'ensuite' | 'private' | 'shared' | null
          bathroom_size?: 'full' | 'three_quarter' | 'half' | null
          roommate_gender_preference?: 'male' | 'female' | 'any' | null
          roommate_age_min?: number | null
          roommate_age_max?: number | null
          newcomer_friendly?: boolean
          no_credit_history_ok?: boolean
          help_needed?: boolean
          help_tasks?: string[] | null
          help_details?: string | null
          ideal_for_students?: boolean
          is_active?: boolean
          is_verified?: boolean
          views_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      // Phase 2 Tables
      payment_methods: {
        Row: {
          id: string
          user_id: string
          stripe_payment_method_id: string
          type: string
          last_four: string | null
          brand: string | null
          exp_month: number | null
          exp_year: number | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payment_method_id: string
          type: string
          last_four?: string | null
          brand?: string | null
          exp_month?: number | null
          exp_year?: number | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_payment_method_id?: string
          type?: string
          last_four?: string | null
          brand?: string | null
          exp_month?: number | null
          exp_year?: number | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          id: string
          user_id: string
          stripe_connect_account_id: string
          account_type: string
          status: string
          charges_enabled: boolean
          payouts_enabled: boolean
          details_submitted: boolean
          onboarding_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_connect_account_id: string
          account_type?: string
          status?: string
          charges_enabled?: boolean
          payouts_enabled?: boolean
          details_submitted?: boolean
          onboarding_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_connect_account_id?: string
          account_type?: string
          status?: string
          charges_enabled?: boolean
          payouts_enabled?: boolean
          details_submitted?: boolean
          onboarding_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          payer_id: string | null
          recipient_id: string | null
          listing_id: string | null
          amount: number
          platform_fee: number
          currency: string
          type: string
          status: string
          description: string | null
          stripe_payment_intent_id: string | null
          stripe_charge_id: string | null
          stripe_transfer_id: string | null
          payment_method_id: string | null
          metadata: Json
          paid_at: string | null
          refunded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          payer_id?: string | null
          recipient_id?: string | null
          listing_id?: string | null
          amount: number
          platform_fee?: number
          currency?: string
          type: string
          status?: string
          description?: string | null
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          stripe_transfer_id?: string | null
          payment_method_id?: string | null
          metadata?: Json
          paid_at?: string | null
          refunded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          payer_id?: string | null
          recipient_id?: string | null
          listing_id?: string | null
          amount?: number
          platform_fee?: number
          currency?: string
          type?: string
          status?: string
          description?: string | null
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          stripe_transfer_id?: string | null
          payment_method_id?: string | null
          metadata?: Json
          paid_at?: string | null
          refunded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_expenses: {
        Row: {
          id: string
          listing_id: string
          created_by: string | null
          title: string
          description: string | null
          total_amount: number
          currency: string
          split_type: string
          category: string | null
          receipt_url: string | null
          due_date: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          created_by?: string | null
          title: string
          description?: string | null
          total_amount: number
          currency?: string
          split_type?: string
          category?: string | null
          receipt_url?: string | null
          due_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          created_by?: string | null
          title?: string
          description?: string | null
          total_amount?: number
          currency?: string
          split_type?: string
          category?: string | null
          receipt_url?: string | null
          due_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_shares: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          amount: number
          percentage: number | null
          status: string
          payment_id: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          amount: number
          percentage?: number | null
          status?: string
          payment_id?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          amount?: number
          percentage?: number | null
          status?: string
          payment_id?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cohabitation_periods: {
        Row: {
          id: string
          listing_id: string | null
          provider_id: string | null
          seeker_id: string | null
          start_date: string
          end_date: string | null
          monthly_rent: number | null
          status: string
          end_reason: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id?: string | null
          provider_id?: string | null
          seeker_id?: string | null
          start_date: string
          end_date?: string | null
          monthly_rent?: number | null
          status?: string
          end_reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string | null
          provider_id?: string | null
          seeker_id?: string | null
          start_date?: string
          end_date?: string | null
          monthly_rent?: number | null
          status?: string
          end_reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          cohabitation_id: string | null
          reviewer_id: string | null
          reviewee_id: string | null
          listing_id: string | null
          rent_payment_rating: number | null
          cleanliness_rating: number | null
          respect_rating: number | null
          communication_rating: number | null
          accuracy_rating: number | null
          overall_rating: number | null
          title: string | null
          comment: string | null
          pros: string | null
          cons: string | null
          is_visible: boolean
          is_flagged: boolean
          moderation_status: string
          moderation_notes: string | null
          response: string | null
          response_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cohabitation_id?: string | null
          reviewer_id?: string | null
          reviewee_id?: string | null
          listing_id?: string | null
          rent_payment_rating?: number | null
          cleanliness_rating?: number | null
          respect_rating?: number | null
          communication_rating?: number | null
          accuracy_rating?: number | null
          overall_rating?: number | null
          title?: string | null
          comment?: string | null
          pros?: string | null
          cons?: string | null
          is_visible?: boolean
          is_flagged?: boolean
          moderation_status?: string
          moderation_notes?: string | null
          response?: string | null
          response_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cohabitation_id?: string | null
          reviewer_id?: string | null
          reviewee_id?: string | null
          listing_id?: string | null
          rent_payment_rating?: number | null
          cleanliness_rating?: number | null
          respect_rating?: number | null
          communication_rating?: number | null
          accuracy_rating?: number | null
          overall_rating?: number | null
          title?: string | null
          comment?: string | null
          pros?: string | null
          cons?: string | null
          is_visible?: boolean
          is_flagged?: boolean
          moderation_status?: string
          moderation_notes?: string | null
          response?: string | null
          response_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      co_renter_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          combined_budget_min: number | null
          combined_budget_max: number | null
          target_move_date: string | null
          preferred_cities: string[] | null
          preferred_provinces: string[] | null
          group_size_min: number
          group_size_max: number
          status: string
          is_public: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          combined_budget_min?: number | null
          combined_budget_max?: number | null
          target_move_date?: string | null
          preferred_cities?: string[] | null
          preferred_provinces?: string[] | null
          group_size_min?: number
          group_size_max?: number
          status?: string
          is_public?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          combined_budget_min?: number | null
          combined_budget_max?: number | null
          target_move_date?: string | null
          preferred_cities?: string[] | null
          preferred_provinces?: string[] | null
          group_size_min?: number
          group_size_max?: number
          status?: string
          is_public?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      co_renter_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: string
          budget_contribution: number | null
          status: string
          joined_at: string
          left_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: string
          budget_contribution?: number | null
          status?: string
          joined_at?: string
          left_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: string
          budget_contribution?: number | null
          status?: string
          joined_at?: string
          left_at?: string | null
        }
        Relationships: []
      }
      co_renter_invitations: {
        Row: {
          id: string
          group_id: string
          inviter_id: string | null
          invitee_id: string
          invitee_email: string | null
          message: string | null
          status: string
          expires_at: string
          responded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          inviter_id?: string | null
          invitee_id: string
          invitee_email?: string | null
          message?: string | null
          status?: string
          expires_at?: string
          responded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          inviter_id?: string | null
          invitee_id?: string
          invitee_email?: string | null
          message?: string | null
          status?: string
          expires_at?: string
          responded_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          id: string
          user_id: string | null
          business_name: string
          business_email: string | null
          business_phone: string | null
          service_type: string
          description: string | null
          service_areas: string[] | null
          logo_url: string | null
          website_url: string | null
          license_number: string | null
          insurance_info: Json | null
          pricing_info: Json | null
          average_rating: number
          total_reviews: number
          is_verified: boolean
          is_active: boolean
          stripe_account_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          business_name: string
          business_email?: string | null
          business_phone?: string | null
          service_type: string
          description?: string | null
          service_areas?: string[] | null
          logo_url?: string | null
          website_url?: string | null
          license_number?: string | null
          insurance_info?: Json | null
          pricing_info?: Json | null
          average_rating?: number
          total_reviews?: number
          is_verified?: boolean
          is_active?: boolean
          stripe_account_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          business_name?: string
          business_email?: string | null
          business_phone?: string | null
          service_type?: string
          description?: string | null
          service_areas?: string[] | null
          logo_url?: string | null
          website_url?: string | null
          license_number?: string | null
          insurance_info?: Json | null
          pricing_info?: Json | null
          average_rating?: number
          total_reviews?: number
          is_verified?: boolean
          is_active?: boolean
          stripe_account_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_bookings: {
        Row: {
          id: string
          provider_id: string | null
          customer_id: string | null
          listing_id: string | null
          service_type: string
          service_date: string
          service_time: string | null
          duration_hours: number | null
          pickup_address: string | null
          delivery_address: string | null
          details: Json | null
          special_instructions: string | null
          estimated_amount: number | null
          final_amount: number | null
          currency: string
          status: string
          cancelled_by: string | null
          cancellation_reason: string | null
          payment_id: string | null
          confirmed_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id?: string | null
          customer_id?: string | null
          listing_id?: string | null
          service_type: string
          service_date: string
          service_time?: string | null
          duration_hours?: number | null
          pickup_address?: string | null
          delivery_address?: string | null
          details?: Json | null
          special_instructions?: string | null
          estimated_amount?: number | null
          final_amount?: number | null
          currency?: string
          status?: string
          cancelled_by?: string | null
          cancellation_reason?: string | null
          payment_id?: string | null
          confirmed_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string | null
          customer_id?: string | null
          listing_id?: string | null
          service_type?: string
          service_date?: string
          service_time?: string | null
          duration_hours?: number | null
          pickup_address?: string | null
          delivery_address?: string | null
          details?: Json | null
          special_instructions?: string | null
          estimated_amount?: number | null
          final_amount?: number | null
          currency?: string
          status?: string
          cancelled_by?: string | null
          cancellation_reason?: string | null
          payment_id?: string | null
          confirmed_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_reviews: {
        Row: {
          id: string
          booking_id: string | null
          provider_id: string
          reviewer_id: string | null
          rating: number
          comment: string | null
          is_visible: boolean
          created_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          provider_id: string
          reviewer_id?: string | null
          rating: number
          comment?: string | null
          is_visible?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          provider_id?: string
          reviewer_id?: string | null
          rating?: number
          comment?: string | null
          is_visible?: boolean
          created_at?: string
        }
        Relationships: []
      }
      insurance_references: {
        Row: {
          id: string
          user_id: string
          listing_id: string | null
          provider: string
          policy_type: string | null
          policy_number: string | null
          coverage_amount: number | null
          premium_amount: number | null
          start_date: string | null
          end_date: string | null
          status: string
          external_reference_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id?: string | null
          provider: string
          policy_type?: string | null
          policy_number?: string | null
          coverage_amount?: number | null
          premium_amount?: number | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          external_reference_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string | null
          provider?: string
          policy_type?: string | null
          policy_number?: string | null
          coverage_amount?: number | null
          premium_amount?: number | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          external_reference_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // Resources Feature Tables
      resource_categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          icon: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          icon?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          icon?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          id: string
          category_id: string | null
          slug: string
          title: string
          subtitle: string | null
          content: Json
          excerpt: string | null
          provinces: string[]
          tags: string[]
          resource_type: string
          featured: boolean
          is_published: boolean
          view_count: number
          helpful_count: number
          last_reviewed_at: string | null
          publish_at: string | null
          unpublish_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          slug: string
          title: string
          subtitle?: string | null
          content?: Json
          excerpt?: string | null
          provinces?: string[]
          tags?: string[]
          resource_type?: string
          featured?: boolean
          is_published?: boolean
          view_count?: number
          helpful_count?: number
          last_reviewed_at?: string | null
          publish_at?: string | null
          unpublish_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          slug?: string
          title?: string
          subtitle?: string | null
          content?: Json
          excerpt?: string | null
          provinces?: string[]
          tags?: string[]
          resource_type?: string
          featured?: boolean
          is_published?: boolean
          view_count?: number
          helpful_count?: number
          last_reviewed_at?: string | null
          publish_at?: string | null
          unpublish_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          id: string
          category_id: string | null
          question: string
          answer: string
          provinces: string[]
          tags: string[]
          display_order: number
          is_published: boolean
          helpful_count: number
          not_helpful_count: number
          last_reviewed_at: string | null
          publish_at: string | null
          unpublish_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          question: string
          answer: string
          provinces?: string[]
          tags?: string[]
          display_order?: number
          is_published?: boolean
          helpful_count?: number
          not_helpful_count?: number
          last_reviewed_at?: string | null
          publish_at?: string | null
          unpublish_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          question?: string
          answer?: string
          provinces?: string[]
          tags?: string[]
          display_order?: number
          is_published?: boolean
          helpful_count?: number
          not_helpful_count?: number
          last_reviewed_at?: string | null
          publish_at?: string | null
          unpublish_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_bookmarks: {
        Row: {
          id: string
          user_id: string
          resource_id: string | null
          faq_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_id?: string | null
          faq_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_id?: string | null
          faq_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      resource_votes: {
        Row: {
          id: string
          user_id: string
          resource_id: string | null
          faq_id: string | null
          vote_type: 'helpful' | 'not_helpful'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_id?: string | null
          faq_id?: string | null
          vote_type: 'helpful' | 'not_helpful'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_id?: string | null
          faq_id?: string | null
          vote_type?: 'helpful' | 'not_helpful'
          created_at?: string
        }
        Relationships: []
      }
      submitted_questions: {
        Row: {
          id: string
          user_id: string | null
          question: string
          context: string | null
          province: string | null
          category_id: string | null
          status: 'pending' | 'reviewed' | 'answered' | 'rejected'
          admin_notes: string | null
          answered_faq_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          question: string
          context?: string | null
          province?: string | null
          category_id?: string | null
          status?: 'pending' | 'reviewed' | 'answered' | 'rejected'
          admin_notes?: string | null
          answered_faq_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          question?: string
          context?: string | null
          province?: string | null
          category_id?: string | null
          status?: 'pending' | 'reviewed' | 'answered' | 'rejected'
          admin_notes?: string | null
          answered_faq_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agreement_clauses: {
        Row: {
          id: string
          clause_key: string
          title: string
          description: string | null
          provinces: string[]
          content_template: Json
          question_flow: Json
          category: string
          is_required: boolean
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clause_key: string
          title: string
          description?: string | null
          provinces?: string[]
          content_template?: Json
          question_flow?: Json
          category: string
          is_required?: boolean
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clause_key?: string
          title?: string
          description?: string | null
          provinces?: string[]
          content_template?: Json
          question_flow?: Json
          category?: string
          is_required?: boolean
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_agreements: {
        Row: {
          id: string
          user_id: string
          title: string
          province: string
          address: string | null
          move_in_date: string | null
          roommate_names: string[]
          selected_clauses: string[]
          answers: Json
          generated_content: string | null
          pdf_url: string | null
          is_finalized: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          province: string
          address?: string | null
          move_in_date?: string | null
          roommate_names?: string[]
          selected_clauses?: string[]
          answers?: Json
          generated_content?: string | null
          pdf_url?: string | null
          is_finalized?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          province?: string
          address?: string | null
          move_in_date?: string | null
          roommate_names?: string[]
          selected_clauses?: string[]
          answers?: Json
          generated_content?: string | null
          pdf_url?: string | null
          is_finalized?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // Group Matching Tables
      group_suggestions: {
        Row: {
          id: string
          target_user_id: string
          suggested_users: string[]
          practical_score: number
          compatibility_score: number
          trust_score: number
          combined_score: number
          match_criteria: Json
          status: 'active' | 'dismissed' | 'converted'
          converted_group_id: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          target_user_id: string
          suggested_users: string[]
          practical_score: number
          compatibility_score: number
          trust_score: number
          combined_score: number
          match_criteria?: Json
          status?: 'active' | 'dismissed' | 'converted'
          converted_group_id?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          target_user_id?: string
          suggested_users?: string[]
          practical_score?: number
          compatibility_score?: number
          trust_score?: number
          combined_score?: number
          match_criteria?: Json
          status?: 'active' | 'dismissed' | 'converted'
          converted_group_id?: string | null
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      user_matching_preferences: {
        Row: {
          id: string
          user_id: string
          preferred_group_size: number
          budget_flexibility_percent: number
          date_flexibility_days: number
          verification_preference: 'any' | 'verified_only' | 'trusted_only'
          is_discoverable: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_group_size?: number
          budget_flexibility_percent?: number
          date_flexibility_days?: number
          verification_preference?: 'any' | 'verified_only' | 'trusted_only'
          is_discoverable?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preferred_group_size?: number
          budget_flexibility_percent?: number
          date_flexibility_days?: number
          verification_preference?: 'any' | 'verified_only' | 'trusted_only'
          is_discoverable?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          actor_type: string
          action: string
          resource_type: string
          resource_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          request_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_type?: string
          action: string
          resource_type: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          request_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          actor_type?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          request_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          ip_address: string | null
          user_agent: string | null
          location: Json | null
          risk_score: number
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          ip_address?: string | null
          user_agent?: string | null
          location?: Json | null
          risk_score?: number
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          ip_address?: string | null
          user_agent?: string | null
          location?: Json | null
          risk_score?: number
          details?: Json
          created_at?: string
        }
        Relationships: []
      }
      abuse_events: {
        Row: {
          id: string
          user_id: string | null
          ip_address: string | null
          event_type: string
          severity: string
          details: Json
          resolved: boolean
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          ip_address?: string | null
          event_type: string
          severity?: string
          details?: Json
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          ip_address?: string | null
          event_type?: string
          severity?: string
          details?: Json
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      background_jobs: {
        Row: {
          id: string
          queue: string
          job_type: string
          payload: Json
          priority: number
          status: string
          attempts: number
          max_attempts: number
          scheduled_for: string
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          result: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          queue?: string
          job_type: string
          payload?: Json
          priority?: number
          status?: string
          attempts?: number
          max_attempts?: number
          scheduled_for?: string
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          result?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          queue?: string
          job_type?: string
          payload?: Json
          priority?: number
          status?: string
          attempts?: number
          max_attempts?: number
          scheduled_for?: string
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          result?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          id: string
          provider: string
          event_id: string
          event_type: string
          payload: Json
          status: string
          attempts: number
          last_attempt_at: string | null
          completed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider: string
          event_id: string
          event_type: string
          payload: Json
          status?: string
          attempts?: number
          last_attempt_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: string
          event_id?: string
          event_type?: string
          payload?: Json
          status?: string
          attempts?: number
          last_attempt_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      suggestion_interactions: {
        Row: {
          id: string
          suggestion_id: string
          user_id: string
          action: 'viewed' | 'interested' | 'dismissed'
          created_at: string
        }
        Insert: {
          id?: string
          suggestion_id: string
          user_id: string
          action: 'viewed' | 'interested' | 'dismissed'
          created_at?: string
        }
        Update: {
          id?: string
          suggestion_id?: string
          user_id?: string
          action?: 'viewed' | 'interested' | 'dismissed'
          created_at?: string
        }
        Relationships: []
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
      calculate_group_compatibility: {
        Args: { user_ids: string[] }
        Returns: number
      }
      calculate_trust_score: {
        Args: { user_ids: string[] }
        Returns: number
      }
      batch_calculate_compatibility: {
        Args: { current_user_id: string; other_user_ids: string[] }
        Returns: { user_id: string; score: number }[]
      }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_endpoint: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: { allowed: boolean; remaining: number; reset_at: string }[]
      }
      claim_background_job: {
        Args: { p_queue: string }
        Returns: Json
      }
      complete_background_job: {
        Args: { p_job_id: string; p_result: Json | null }
        Returns: void
      }
      fail_background_job: {
        Args: { p_job_id: string; p_error: string }
        Returns: void
      }
      soft_delete_user: {
        Args: { p_user_id: string; p_reason: string | null }
        Returns: void
      }
      pay_expense_share: {
        Args: { p_expense_id: string; p_user_id: string }
        Returns: {
          share: {
            id: string
            expense_id: string
            user_id: string
            amount: number
            percentage: number | null
            status: string
            payment_id: string | null
            paid_at: string | null
            created_at: string
            updated_at: string
          }
          expense: {
            id: string
            title: string
            created_by: string | null
            listing_id: string
            total_amount: number
          }
        }
      }
      set_default_payment_method: {
        Args: {
          p_user_id: string
          p_stripe_payment_method_id: string
          p_type: string
          p_last_four: string
          p_brand: string
          p_exp_month: number
          p_exp_year: number
        }
        Returns: {
          id: string
          user_id: string
          stripe_payment_method_id: string
          type: string
          last_four: string | null
          brand: string | null
          exp_month: number | null
          exp_year: number | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
      }
      create_expense_with_shares: {
        Args: {
          p_listing_id: string
          p_created_by: string
          p_title: string
          p_description: string
          p_total_amount: number
          p_split_type: string
          p_category: string
          p_due_date: string
          p_shares: {
            user_id: string
            amount: number
            percentage: number
          }[]
        }
        Returns: {
          expense: {
            id: string
            listing_id: string
            created_by: string | null
            title: string
            description: string | null
            total_amount: number
            currency: string
            split_type: string
            category: string | null
            receipt_url: string | null
            due_date: string | null
            status: string
            created_at: string
            updated_at: string
          }
          shares: {
            id: string
            expense_id: string
            user_id: string
            amount: number
            percentage: number | null
            status: string
            payment_id: string | null
            paid_at: string | null
            created_at: string
            updated_at: string
          }[]
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Type exports for convenience
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Listing = Database['public']['Tables']['listings']['Row']
export type SeekingProfile = Database['public']['Tables']['seeking_profiles']['Row']
export type LifestyleResponses = Database['public']['Tables']['lifestyle_responses']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Verification = Database['public']['Tables']['verifications']['Row']
export type Report = Database['public']['Tables']['reports']['Row']

// Phase 2 type exports
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type PayoutAccount = Database['public']['Tables']['payout_accounts']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type SharedExpense = Database['public']['Tables']['shared_expenses']['Row']
export type ExpenseShare = Database['public']['Tables']['expense_shares']['Row']
export type CohabitationPeriod = Database['public']['Tables']['cohabitation_periods']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type CoRenterGroup = Database['public']['Tables']['co_renter_groups']['Row']
export type CoRenterMember = Database['public']['Tables']['co_renter_members']['Row']
export type CoRenterInvitation = Database['public']['Tables']['co_renter_invitations']['Row']
export type ServiceProvider = Database['public']['Tables']['service_providers']['Row']
export type ServiceBooking = Database['public']['Tables']['service_bookings']['Row']
export type ServiceReview = Database['public']['Tables']['service_reviews']['Row']
export type InsuranceReference = Database['public']['Tables']['insurance_references']['Row']

// Resources Feature type exports
export type ResourceCategory = Database['public']['Tables']['resource_categories']['Row']
export type Resource = Database['public']['Tables']['resources']['Row']
export type FAQ = Database['public']['Tables']['faqs']['Row']
export type ResourceBookmark = Database['public']['Tables']['resource_bookmarks']['Row']
export type ResourceVote = Database['public']['Tables']['resource_votes']['Row']
export type SubmittedQuestion = Database['public']['Tables']['submitted_questions']['Row']
export type AgreementClause = Database['public']['Tables']['agreement_clauses']['Row']
export type GeneratedAgreement = Database['public']['Tables']['generated_agreements']['Row']

// Group Matching type exports
export type GroupSuggestion = Database['public']['Tables']['group_suggestions']['Row']
export type UserMatchingPreferences = Database['public']['Tables']['user_matching_preferences']['Row']
export type SuggestionInteraction = Database['public']['Tables']['suggestion_interactions']['Row']
