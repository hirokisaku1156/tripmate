-- trip_membersのUPDATEポリシーを追加（個別招待リンクの紐付け用）
-- user_idがNULLのレコード（招待待ち）を自分に紐付けられるようにする

-- 既存のポリシーを維持しつつUPDATEを追加
DROP POLICY IF EXISTS "trip_members_update_link" ON trip_members;

-- UPDATE: 自分自身を紐付けられる（user_id = NULLのレコードに自分のIDをセット）
-- 条件: 更新後のuser_idが自分自身であること
CREATE POLICY "trip_members_update_link" ON trip_members 
FOR UPDATE USING (
    -- 既存の自分のレコード OR user_idがまだ設定されていないレコード
    user_id = auth.uid() OR user_id IS NULL
) WITH CHECK (
    -- 更新後は自分のレコードにしかできない
    user_id = auth.uid()
);

-- SELECTポリシーも修正: invite_tokenがあるレコードは誰でも見れる（招待確認用）
DROP POLICY IF EXISTS "trip_members_select_own" ON trip_members;
CREATE POLICY "trip_members_select_for_invite" ON trip_members 
FOR SELECT USING (
    user_id = auth.uid() 
    OR (user_id IS NULL AND invite_token IS NOT NULL)
);
