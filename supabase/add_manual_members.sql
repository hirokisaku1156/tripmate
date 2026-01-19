-- 1. カラムの追加と制約の変更（trip_members）
ALTER TABLE trip_members 
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN display_name_override TEXT,
  ADD COLUMN invite_token UUID DEFAULT gen_random_uuid();

-- 2. 既存のUNIQUE制約を削除して、ユーザーがいる場合のみの条件付きユニーク制約を追加
ALTER TABLE trip_members DROP CONSTRAINT IF EXISTS trip_members_trip_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS trip_members_trip_id_user_id_idx ON trip_members (trip_id, user_id) 
WHERE user_id IS NOT NULL;

-- 3. expenses と expense_splits の外部キー変更
-- 注意: すでにデータがある場合は警告が必要ですが、一旦開発環境向けに制約を置き換えます

-- expenses.paid_by を trip_members.id へ
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_paid_by_fkey;
-- 既存のpaid_by（profiles.id）をtrip_members.idに変換する必要があるが、
-- 手動移行は難しいため、一旦制約のみ外すか、新規作成時に意識するようにする。
-- ここでは profiles(id) への参照を trip_members(id) への参照に変更します。
-- ※実際にはデータ移行SQLが必要ですが、カラム型がUUIDで共通なので、
-- trip_members(id) を入れるようにアプリ側を修正します。
ALTER TABLE expenses ADD CONSTRAINT expenses_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES trip_members(id) ON DELETE SET NULL;

-- expense_splits.user_id を trip_members.id へ
ALTER TABLE expense_splits DROP CONSTRAINT IF EXISTS expense_splits_user_id_fkey;
ALTER TABLE expense_splits ADD CONSTRAINT expense_splits_user_id_fkey FOREIGN KEY (user_id) REFERENCES trip_members(id) ON DELETE CASCADE;

-- 4. RLSポリシーの更新
-- 手動追加メンバー（user_idがNULL）も含めて、同じ旅行のメンバーなら閲覧できるようにする
DROP POLICY IF EXISTS "Trip members can view members" ON trip_members;
CREATE POLICY "Trip members can view members" ON trip_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members AS tm
      WHERE tm.trip_id = trip_members.trip_id 
      AND tm.user_id = auth.uid()
    )
  );

-- 所有者は手動追加メンバーを作成・削除できるようにする
DROP POLICY IF EXISTS "Trip owners can manage members" ON trip_members;
CREATE POLICY "Trip owners can manage members" ON trip_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trip_members tm_owner
      WHERE tm_owner.trip_id = trip_members.trip_id 
      AND tm_owner.user_id = auth.uid()
      AND tm_owner.role = 'owner'
    )
  );

-- 5. インデックスの追加（トークン検索用）
CREATE INDEX IF NOT EXISTS trip_members_invite_token_idx ON trip_members (invite_token);
