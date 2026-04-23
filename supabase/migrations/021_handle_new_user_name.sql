-- Fix handle_new_user() so signups populate profiles.name from auth metadata.
-- Without this, profiles.name stays NULL on signup and listings render the host
-- as "Anonymous" (see listing-card.tsx, public-listing-card.tsx).
--
-- Email signup passes name via signUp({ options: { data: { name } } }), which
-- Supabase stores in auth.users.raw_user_meta_data->>'name'.
-- Google OAuth populates raw_user_meta_data->>'full_name' (and 'name').

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, name, email_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '')
        ),
        NEW.email_confirmed_at IS NOT NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Backfill existing profiles whose name was dropped on signup.
-- Treat whitespace-only names as missing so they also get populated.
UPDATE public.profiles p
SET name = COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), '')
    )
FROM auth.users u
WHERE p.user_id = u.id
  AND NULLIF(TRIM(p.name), '') IS NULL
  AND COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), '')
      ) IS NOT NULL;
