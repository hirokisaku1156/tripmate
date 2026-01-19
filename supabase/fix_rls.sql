-- RLSポリシー修正版 v2
-- trip_membersの自己参照による無限ループを回避

-- ============================================
-- 既存ポリシーを全て削除
-- ============================================

-- trip_members
DROP POLICY IF EXISTS "trip_members_select" ON trip_members;
DROP POLICY IF EXISTS "trip_members_insert" ON trip_members;
DROP POLICY IF EXISTS "trip_members_delete" ON trip_members;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON trip_members;

-- trips
DROP POLICY IF EXISTS "trips_select" ON trips;
DROP POLICY IF EXISTS "trips_insert" ON trips;
DROP POLICY IF EXISTS "trips_update" ON trips;
DROP POLICY IF EXISTS "trips_delete" ON trips;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON trips;

-- itinerary_items
DROP POLICY IF EXISTS "itinerary_select" ON itinerary_items;
DROP POLICY IF EXISTS "itinerary_insert" ON itinerary_items;
DROP POLICY IF EXISTS "itinerary_update" ON itinerary_items;
DROP POLICY IF EXISTS "itinerary_delete" ON itinerary_items;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON itinerary_items;

-- places
DROP POLICY IF EXISTS "places_select" ON places;
DROP POLICY IF EXISTS "places_insert" ON places;
DROP POLICY IF EXISTS "places_update" ON places;
DROP POLICY IF EXISTS "places_delete" ON places;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON places;

-- expenses
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON expenses;

-- expense_splits
DROP POLICY IF EXISTS "expense_splits_select" ON expense_splits;
DROP POLICY IF EXISTS "expense_splits_insert" ON expense_splits;
DROP POLICY IF EXISTS "expense_splits_delete" ON expense_splits;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON expense_splits;

-- exchange_rates
DROP POLICY IF EXISTS "exchange_rates_all" ON exchange_rates;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON exchange_rates;

-- chat_messages
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON chat_messages;

-- ============================================
-- trip_members テーブル（最重要：自己参照を避ける）
-- ============================================

-- SELECT: 自分のレコードのみ見れる（他人の旅行メンバーは見れない）
-- ※ 同じ旅行のメンバーを見るには、tripsテーブル経由でアクセス
CREATE POLICY "trip_members_select_own" ON trip_members 
FOR SELECT USING (user_id = auth.uid());

-- INSERT: 自分自身をメンバーとして追加可能
CREATE POLICY "trip_members_insert_self" ON trip_members 
FOR INSERT WITH CHECK (user_id = auth.uid());

-- DELETE: 自分自身を削除可能（退出）
CREATE POLICY "trip_members_delete_self" ON trip_members 
FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- trips テーブル
-- ============================================

-- SELECT: 招待コードがある旅行は誰でも見れる（参加フロー用）
-- または自分が作成した旅行
CREATE POLICY "trips_select" ON trips FOR SELECT USING (
  invite_code IS NOT NULL 
  OR created_by = auth.uid()
);

-- INSERT: 認証済みユーザーは自分が作成者として旅行を作成可能
CREATE POLICY "trips_insert" ON trips FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- UPDATE: 作成者のみ
CREATE POLICY "trips_update" ON trips FOR UPDATE 
USING (created_by = auth.uid());

-- DELETE: 作成者のみ
CREATE POLICY "trips_delete" ON trips FOR DELETE 
USING (created_by = auth.uid());

-- ============================================
-- 他のテーブル（シンプルに認証済みユーザーは許可）
-- trip_members経由ではなくアプリ側でアクセス制御
-- ============================================

-- itinerary_items
CREATE POLICY "itinerary_all" ON itinerary_items FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- places
CREATE POLICY "places_all" ON places FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- expenses
CREATE POLICY "expenses_all" ON expenses FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- expense_splits
CREATE POLICY "expense_splits_all" ON expense_splits FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- exchange_rates
CREATE POLICY "exchange_rates_all" ON exchange_rates FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- chat_messages
CREATE POLICY "chat_messages_all" ON chat_messages FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
