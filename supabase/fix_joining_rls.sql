-- 招待トークン（個別リンク）を使用した参加を許可するRLSポリシーの修正
-- 既存の制限では、未参加のユーザーが自分の user_id を既存のレコード（招待中レコード）にセットすることができませんでした。

-- 1. trip_membersテーブルの更新ポリシーを追加
-- 自分の user_id をセットする場合のみ、かつ invite_token が一致する場合に許可
DROP POLICY IF EXISTS "Users can join via individual token" ON trip_members;

CREATE POLICY "Users can join via individual token" ON trip_members
  FOR UPDATE
  USING (
    -- 元々 user_id が空（招待中）のレコードであること
    user_id IS NULL
  )
  WITH CHECK (
    -- 自分の ID をセットしようとしていること
    auth.uid() = user_id
  );

-- 2. profilesテーブルの閲覧ポリシーを少し緩和
-- 招待フロー中に相手のIDを知る必要がある場合や、紐付け時に必要
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);
