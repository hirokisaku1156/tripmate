-- expenses テーブルに itinerary_item_id を追加して旅程と紐付けられるようにする
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS itinerary_item_id UUID REFERENCES itinerary_items(id) ON DELETE CASCADE;

COMMENT ON COLUMN expenses.itinerary_item_id IS '紐生いた旅程項目のID';
