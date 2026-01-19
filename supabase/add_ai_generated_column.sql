-- AI作成フラグの追加
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE places ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- 既存のRSC（Row Level Security）ポリシーはそのまま適用されるはずですが、
-- 必要に応じてコメントを追加しておきます。
COMMENT ON COLUMN itinerary_items.is_ai_generated IS 'AIによって自動生成された項目かどうかのフラグ';
COMMENT ON COLUMN places.is_ai_generated IS 'AIによって自動生成された場所かどうかのフラグ';
COMMENT ON COLUMN expenses.is_ai_generated IS 'AIによって自動生成された費用かどうかのフラグ';
