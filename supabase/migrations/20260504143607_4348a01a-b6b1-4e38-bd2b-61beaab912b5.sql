-- Add new columns for the daily grid view
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS networks text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS slot text NOT NULL DEFAULT '';

-- Trigger for updated_at (was missing)
DROP TRIGGER IF EXISTS trg_content_items_updated_at ON public.content_items;
CREATE TRIGGER trg_content_items_updated_at
BEFORE UPDATE ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();