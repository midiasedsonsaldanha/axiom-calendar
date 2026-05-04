
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_email ON public.profiles (lower(email));
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (user_id, email)
SELECT id, COALESCE(email, '') FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============ SHARES ============
CREATE TYPE public.share_role AS ENUM ('viewer', 'editor');

CREATE TABLE public.calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  shared_with_id UUID NOT NULL,
  role public.share_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, shared_with_id),
  CHECK (owner_id <> shared_with_id)
);
ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Involved users can view shares"
  ON public.calendar_shares FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Owners can create shares"
  ON public.calendar_shares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update shares"
  ON public.calendar_shares FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners or invited can delete share"
  ON public.calendar_shares FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

-- ============ PROFILES POLICIES (after shares exist) ============
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "View profiles of share collaborators"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_shares cs
      WHERE (cs.owner_id = auth.uid() AND cs.shared_with_id = profiles.user_id)
         OR (cs.shared_with_id = auth.uid() AND cs.owner_id = profiles.user_id)
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.has_calendar_access(_owner UUID, _user UUID, _min_role public.share_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_shares
    WHERE owner_id = _owner
      AND shared_with_id = _user
      AND (_min_role = 'viewer' OR role = 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles WHERE lower(email) = lower(_email) LIMIT 1;
$$;

-- ============ CONTENT_ITEMS POLICIES ============
DROP POLICY "Users can view their own content" ON public.content_items;
DROP POLICY "Users can insert their own content" ON public.content_items;
DROP POLICY "Users can update their own content" ON public.content_items;
DROP POLICY "Users can delete their own content" ON public.content_items;

CREATE POLICY "View own or shared content"
  ON public.content_items FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_calendar_access(user_id, auth.uid(), 'viewer')
  );

CREATE POLICY "Insert own or as editor"
  ON public.content_items FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_calendar_access(user_id, auth.uid(), 'editor')
  );

CREATE POLICY "Update own or as editor"
  ON public.content_items FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_calendar_access(user_id, auth.uid(), 'editor')
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_calendar_access(user_id, auth.uid(), 'editor')
  );

CREATE POLICY "Delete own or as editor"
  ON public.content_items FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_calendar_access(user_id, auth.uid(), 'editor')
  );
