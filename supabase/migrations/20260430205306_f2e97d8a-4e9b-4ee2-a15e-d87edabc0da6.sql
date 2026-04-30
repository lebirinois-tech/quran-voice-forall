-- Lock down allowed_uploaders: only the app owner may grant/revoke uploader access
CREATE POLICY "Only owner can insert allowed_uploaders"
ON public.allowed_uploaders
FOR INSERT
TO authenticated
WITH CHECK (public.is_app_owner());

CREATE POLICY "Only owner can update allowed_uploaders"
ON public.allowed_uploaders
FOR UPDATE
TO authenticated
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

CREATE POLICY "Only owner can delete allowed_uploaders"
ON public.allowed_uploaders
FOR DELETE
TO authenticated
USING (public.is_app_owner());

-- Restrict SECURITY DEFINER function execution
-- handle_new_user and update_updated_at_column are trigger-only: revoke from public/anon/authenticated
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- is_app_owner is used in RLS; revoke from anon (only authenticated users need to call it)
REVOKE ALL ON FUNCTION public.is_app_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_owner() TO authenticated;