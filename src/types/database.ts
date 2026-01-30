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
