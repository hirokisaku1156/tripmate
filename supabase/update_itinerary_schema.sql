-- itinerary_items テーブルに価格情報と生成された費用へのリンクを追加
ALTER TABLE itinerary_items 
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS price_currency TEXT DEFAULT 'JPY',
ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL;

COMMENT ON COLUMN itinerary_items.price IS '予定に関連する参考価格';
COMMENT ON COLUMN itinerary_items.expense_id IS '自動登録によって生成された費用のID';
