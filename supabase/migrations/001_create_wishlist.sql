-- Create wishlist table and enable RLS so users only see their rows
CREATE TABLE IF NOT EXISTS public.wishlist (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  product jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert/select/delete only their own rows
CREATE POLICY "Allow logged in users to manage their wishlist" ON public.wishlist
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: auth.uid() returns uuid, and user_id is stored as uuid in the table.
-- RLS will automatically enforce that users can only access their own rows.
