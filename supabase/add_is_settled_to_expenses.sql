-- Add is_settled column to expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT FALSE;

-- Update RLS policies to include the new column (implicit)
-- Since RLS policies usually apply to entire rows, no specific update is needed unless we want to restrict editing is_settled.
