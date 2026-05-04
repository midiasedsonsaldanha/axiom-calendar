
REVOKE EXECUTE ON FUNCTION public.has_calendar_access(UUID, UUID, public.share_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_calendar_access(UUID, UUID, public.share_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) TO authenticated;
