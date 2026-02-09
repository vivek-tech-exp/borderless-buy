-- Add optional tag to wishlist items
ALTER TABLE public.wishlist
ADD COLUMN IF NOT EXISTS tag text;
