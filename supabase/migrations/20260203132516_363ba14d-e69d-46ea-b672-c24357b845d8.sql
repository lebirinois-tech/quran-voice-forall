-- Improve handle_new_user function with input validation and length limits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  safe_display_name TEXT;
BEGIN
  -- Sanitize and limit display_name to prevent injection and DoS
  -- Extract from metadata, fallback to email username, limit to 100 chars
  safe_display_name := COALESCE(
    LEFT(TRIM(REGEXP_REPLACE(NEW.raw_user_meta_data->>'display_name', '[<>"\x00-\x1F]', '', 'g')), 100),
    LEFT(TRIM(split_part(COALESCE(NEW.email, ''), '@', 1)), 50)
  );
  
  -- Ensure we have a non-empty display name
  IF safe_display_name IS NULL OR safe_display_name = '' THEN
    safe_display_name := 'User';
  END IF;
  
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, safe_display_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;