-- itinerary_items テーブルにタイムゾーン情報を追加
ALTER TABLE itinerary_items 
ADD COLUMN IF NOT EXISTS start_timezone TEXT DEFAULT '+09:00',
ADD COLUMN IF NOT EXISTS end_timezone TEXT DEFAULT '+09:00';

COMMENT ON COLUMN itinerary_items.start_timezone IS '開始時間のタイムゾーンオフセット (例: +09:00, -07:00)';
COMMENT ON COLUMN itinerary_items.end_timezone IS '終了時間のタイムゾーンオフセット (例: +09:00, -07:00)';
