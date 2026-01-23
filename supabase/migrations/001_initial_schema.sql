-- NestMatch Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Custom types
CREATE TYPE gender_type AS ENUM ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say');
CREATE TYPE verification_level AS ENUM ('basic', 'verified', 'trusted');
CREATE TYPE listing_type AS ENUM ('room', 'shared_room', 'entire_place');
CREATE TYPE work_schedule_type AS ENUM ('nine_to_five', 'shift_work', 'remote', 'flexible', 'student');
CREATE TYPE sleep_schedule_type AS ENUM ('early_bird', 'night_owl', 'flexible');
CREATE TYPE frequency_type AS ENUM ('never', 'rarely', 'sometimes', 'often');
CREATE TYPE cleanliness_type AS ENUM ('spotless', 'tidy', 'relaxed', 'messy');
CREATE TYPE cleaning_frequency_type AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');
CREATE TYPE smoking_type AS ENUM ('never', 'outside_only', 'yes');
CREATE TYPE alcohol_type AS ENUM ('never', 'socially', 'regularly');
CREATE TYPE pets_type AS ENUM ('no_pets', 'cats_ok', 'dogs_ok', 'all_pets_ok', 'have_pets');
CREATE TYPE communication_type AS ENUM ('minimal', 'occasional', 'frequent', 'very_social');
CREATE TYPE conflict_type AS ENUM ('direct', 'written', 'mediated', 'avoid');
CREATE TYPE noise_type AS ENUM ('quiet', 'moderate', 'loud_ok');
CREATE TYPE temperature_type AS ENUM ('cold', 'moderate', 'warm');
CREATE TYPE remote_work_type AS ENUM ('never', 'sometimes', 'mostly', 'always');
CREATE TYPE verification_type AS ENUM ('id', 'credit', 'criminal', 'reference');
CREATE TYPE verification_provider AS ENUM ('certn', 'manual');
CREATE TYPE verification_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE report_type AS ENUM ('scam', 'harassment', 'fake', 'discrimination', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE gender_preference AS ENUM ('male', 'female', 'any');

-- Profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    bio TEXT,
    age INTEGER CHECK (age >= 18 AND age <= 120),
    gender gender_type,
    occupation TEXT,
    profile_photo TEXT,
    photos TEXT[] DEFAULT '{}',
    phone TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_level verification_level DEFAULT 'basic',
    verified_at TIMESTAMPTZ,
    languages TEXT[] DEFAULT '{}',
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lifestyle responses table
CREATE TABLE lifestyle_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    work_schedule work_schedule_type,
    sleep_schedule sleep_schedule_type,
    noise_tolerance noise_type,
    guest_frequency frequency_type,
    overnight_guests frequency_type,
    cleanliness_level cleanliness_type,
    cleaning_frequency cleaning_frequency_type,
    cooking_habits frequency_type,
    shared_groceries BOOLEAN,
    smoking smoking_type,
    cannabis smoking_type,
    alcohol alcohol_type,
    pets_preference pets_type,
    pet_details TEXT,
    communication_style communication_type,
    conflict_resolution conflict_type,
    remote_work_frequency remote_work_type,
    temperature_preference temperature_type,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table (rooms available)
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type listing_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL CHECK (price >= 0),
    utilities_included BOOLEAN DEFAULT FALSE,
    available_date DATE NOT NULL,
    minimum_stay INTEGER DEFAULT 1,
    address TEXT,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    location GEOGRAPHY(POINT, 4326),
    photos TEXT[] DEFAULT '{}',
    amenities TEXT[] DEFAULT '{}',
    roommate_gender_preference gender_preference,
    roommate_age_min INTEGER CHECK (roommate_age_min >= 18),
    roommate_age_max INTEGER CHECK (roommate_age_max <= 120),
    newcomer_friendly BOOLEAN DEFAULT FALSE,
    no_credit_history_ok BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seeking profiles table (looking for room)
CREATE TABLE seeking_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    budget_min INTEGER NOT NULL CHECK (budget_min >= 0),
    budget_max INTEGER NOT NULL CHECK (budget_max >= budget_min),
    move_in_date DATE NOT NULL,
    preferred_cities TEXT[] NOT NULL,
    preferred_areas TEXT[] DEFAULT '{}',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_ids UUID[] NOT NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verifications table
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type verification_type NOT NULL,
    provider verification_provider DEFAULT 'certn',
    external_id TEXT,
    status verification_status DEFAULT 'pending',
    result JSONB,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    type report_type NOT NULL,
    description TEXT NOT NULL,
    status report_status DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT report_target CHECK (
        (reported_user_id IS NOT NULL) OR (reported_listing_id IS NOT NULL)
    )
);

-- Saved listings table
CREATE TABLE saved_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- Blocked users table
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, blocked_user_id)
);

-- Indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_verification_level ON profiles(verification_level);
CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_province ON listings(province);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_available_date ON listings(available_date);
CREATE INDEX idx_listings_is_active ON listings(is_active);
CREATE INDEX idx_listings_location ON listings USING GIST(location);
CREATE INDEX idx_seeking_profiles_user_id ON seeking_profiles(user_id);
CREATE INDEX idx_seeking_profiles_preferred_cities ON seeking_profiles USING GIN(preferred_cities);
CREATE INDEX idx_conversations_participant_ids ON conversations USING GIN(participant_ids);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_verifications_user_id ON verifications(user_id);
CREATE INDEX idx_saved_listings_user_id ON saved_listings(user_id);

-- Trigger to update location from lat/lng
CREATE OR REPLACE FUNCTION update_listing_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listing_location_trigger
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_location();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER lifestyle_responses_updated_at BEFORE UPDATE ON lifestyle_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER seeking_profiles_updated_at BEFORE UPDATE ON seeking_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, email, email_verified)
    VALUES (NEW.id, NEW.email, NEW.email_confirmed_at IS NOT NULL);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Compatibility calculation function
CREATE OR REPLACE FUNCTION calculate_compatibility(user_id_1 UUID, user_id_2 UUID)
RETURNS INTEGER AS $$
DECLARE
    user1_responses lifestyle_responses%ROWTYPE;
    user2_responses lifestyle_responses%ROWTYPE;
    score INTEGER := 0;
    max_score INTEGER := 0;
BEGIN
    SELECT * INTO user1_responses FROM lifestyle_responses WHERE user_id = user_id_1;
    SELECT * INTO user2_responses FROM lifestyle_responses WHERE user_id = user_id_2;

    IF user1_responses IS NULL OR user2_responses IS NULL THEN
        RETURN 0;
    END IF;

    -- Work schedule compatibility (10 points)
    max_score := max_score + 10;
    IF user1_responses.work_schedule = user2_responses.work_schedule THEN
        score := score + 10;
    ELSIF user1_responses.work_schedule IS NOT NULL AND user2_responses.work_schedule IS NOT NULL THEN
        score := score + 5;
    END IF;

    -- Sleep schedule compatibility (15 points - high impact)
    max_score := max_score + 15;
    IF user1_responses.sleep_schedule = user2_responses.sleep_schedule THEN
        score := score + 15;
    ELSIF user1_responses.sleep_schedule = 'flexible' OR user2_responses.sleep_schedule = 'flexible' THEN
        score := score + 10;
    END IF;

    -- Noise tolerance (15 points - high impact)
    max_score := max_score + 15;
    IF user1_responses.noise_tolerance = user2_responses.noise_tolerance THEN
        score := score + 15;
    ELSIF ABS(
        CASE user1_responses.noise_tolerance WHEN 'quiet' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END -
        CASE user2_responses.noise_tolerance WHEN 'quiet' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END
    ) = 1 THEN
        score := score + 8;
    END IF;

    -- Cleanliness (15 points - high impact)
    max_score := max_score + 15;
    IF user1_responses.cleanliness_level = user2_responses.cleanliness_level THEN
        score := score + 15;
    ELSIF ABS(
        CASE user1_responses.cleanliness_level WHEN 'spotless' THEN 1 WHEN 'tidy' THEN 2 WHEN 'relaxed' THEN 3 ELSE 4 END -
        CASE user2_responses.cleanliness_level WHEN 'spotless' THEN 1 WHEN 'tidy' THEN 2 WHEN 'relaxed' THEN 3 ELSE 4 END
    ) = 1 THEN
        score := score + 8;
    END IF;

    -- Guest frequency (10 points)
    max_score := max_score + 10;
    IF user1_responses.guest_frequency = user2_responses.guest_frequency THEN
        score := score + 10;
    ELSIF ABS(
        CASE user1_responses.guest_frequency WHEN 'never' THEN 1 WHEN 'rarely' THEN 2 WHEN 'sometimes' THEN 3 ELSE 4 END -
        CASE user2_responses.guest_frequency WHEN 'never' THEN 1 WHEN 'rarely' THEN 2 WHEN 'sometimes' THEN 3 ELSE 4 END
    ) = 1 THEN
        score := score + 5;
    END IF;

    -- Smoking compatibility (10 points - dealbreaker potential)
    max_score := max_score + 10;
    IF user1_responses.smoking = user2_responses.smoking THEN
        score := score + 10;
    ELSIF user1_responses.smoking = 'never' AND user2_responses.smoking = 'yes' THEN
        score := score + 0; -- Incompatible
    ELSIF user2_responses.smoking = 'never' AND user1_responses.smoking = 'yes' THEN
        score := score + 0; -- Incompatible
    ELSE
        score := score + 5;
    END IF;

    -- Pets preference (10 points)
    max_score := max_score + 10;
    IF user1_responses.pets_preference = user2_responses.pets_preference THEN
        score := score + 10;
    ELSIF user1_responses.pets_preference = 'no_pets' AND user2_responses.pets_preference = 'have_pets' THEN
        score := score + 0;
    ELSIF user2_responses.pets_preference = 'no_pets' AND user1_responses.pets_preference = 'have_pets' THEN
        score := score + 0;
    ELSE
        score := score + 5;
    END IF;

    -- Communication style (10 points)
    max_score := max_score + 10;
    IF user1_responses.communication_style = user2_responses.communication_style THEN
        score := score + 10;
    ELSE
        score := score + 5;
    END IF;

    -- Remote work frequency (5 points)
    max_score := max_score + 5;
    IF user1_responses.remote_work_frequency = user2_responses.remote_work_frequency THEN
        score := score + 5;
    ELSE
        score := score + 2;
    END IF;

    -- Return percentage
    IF max_score = 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND((score::DECIMAL / max_score::DECIMAL) * 100);
END;
$$ LANGUAGE plpgsql;

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifestyle_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seeking_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Lifestyle responses policies
CREATE POLICY "Users can view lifestyle responses" ON lifestyle_responses
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own lifestyle responses" ON lifestyle_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lifestyle responses" ON lifestyle_responses
    FOR UPDATE USING (auth.uid() = user_id);

-- Listings policies
CREATE POLICY "Active listings are viewable by everyone" ON listings
    FOR SELECT USING (is_active = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own listings" ON listings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings" ON listings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings" ON listings
    FOR DELETE USING (auth.uid() = user_id);

-- Seeking profiles policies
CREATE POLICY "Active seeking profiles are viewable by everyone" ON seeking_profiles
    FOR SELECT USING (is_active = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own seeking profile" ON seeking_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own seeking profile" ON seeking_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND auth.uid() = ANY(conversations.participant_ids)
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_id
            AND auth.uid() = ANY(participant_ids)
        )
    );

-- Verifications policies
CREATE POLICY "Users can view own verifications" ON verifications
    FOR SELECT USING (auth.uid() = user_id);

-- Reports policies
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Saved listings policies
CREATE POLICY "Users can view own saved listings" ON saved_listings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save listings" ON saved_listings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave listings" ON saved_listings
    FOR DELETE USING (auth.uid() = user_id);

-- Blocked users policies
CREATE POLICY "Users can view own blocked users" ON blocked_users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can block users" ON blocked_users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unblock users" ON blocked_users
    FOR DELETE USING (auth.uid() = user_id);
