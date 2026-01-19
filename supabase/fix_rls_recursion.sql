-- 1. trips テーブルのポリシー修正（trip_members への依存を排除して無限ループを防ぐ）
-- 招待コード（invite_code）が NULL でない旅行、または作成者は誰でも閲覧可能にする
-- これにより、trip_members のポリシーが trips を参照しても、trips が trip_members を見に行かないためループが切れる
DROP POLICY IF EXISTS "Trip members can view trips" ON trips;
CREATE POLICY "Trip members can view trips" ON trips
  FOR SELECT USING (
    created_by = auth.uid() OR invite_code IS NOT NULL
  );

-- 2. trip_members テーブルのポリシー修正
-- 自分がアクセス可能な旅行のメンバーであれば閲覧可能にする
DROP POLICY IF EXISTS "Trip members can view members" ON trip_members;
CREATE POLICY "Trip members can view members" ON trip_members
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips
    )
  );

-- 自分が自分自身のレコードを操作できるようにする（参加用）
DROP POLICY IF EXISTS "Users can join trips" ON trip_members;
CREATE POLICY "Users can join trips" ON trip_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. オーナー権限のポリシー（手動追加メンバーの管理用）
-- ここでも無限ループを避けるため、チェックを工夫する
DROP POLICY IF EXISTS "Trip owners can manage members" ON trip_members;
CREATE POLICY "Trip owners can manage members" ON trip_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_members.trip_id 
      AND trips.created_by = auth.uid()
    )
  );

-- 4. 旅程（itinerary_items）のポリシー修正
-- これも trip_members ではなく trips を経由させることでパフォーマンス向上とループ回避
DROP POLICY IF EXISTS "Trip members can view itinerary" ON itinerary_items;
CREATE POLICY "Trip members can view itinerary" ON itinerary_items
  FOR SELECT USING (
    trip_id IN (SELECT id FROM trips)
  );

DROP POLICY IF EXISTS "Trip members can insert itinerary" ON itinerary_items;
CREATE POLICY "Trip members can insert itinerary" ON itinerary_items
  FOR INSERT WITH CHECK (
    trip_id IN (SELECT id FROM trips)
  );

-- 5. 費用関連のポリシーも同様に修正
DROP POLICY IF EXISTS "Trip members can view expenses" ON expenses;
CREATE POLICY "Trip members can view expenses" ON expenses
  FOR SELECT USING (
    trip_id IN (SELECT id FROM trips)
  );

DROP POLICY IF EXISTS "Trip members can insert expenses" ON expenses;
CREATE POLICY "Trip members can insert expenses" ON expenses
  FOR INSERT WITH CHECK (
    trip_id IN (SELECT id FROM trips)
  );
