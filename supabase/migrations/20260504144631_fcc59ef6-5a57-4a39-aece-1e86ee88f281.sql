-- Convert status column from enum to text to allow new editorial statuses
ALTER TABLE public.content_items ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.content_items ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.content_items ALTER COLUMN status SET DEFAULT 'none';
UPDATE public.content_items SET status = 'none' WHERE status = 'pending';
DROP TYPE IF EXISTS public.content_status;