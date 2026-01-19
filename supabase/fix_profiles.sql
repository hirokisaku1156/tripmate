-- 既存ユーザーのプロフィールを作成
-- auth.usersテーブルから全ユーザーのプロフィールを作成（存在しない場合のみ）

INSERT INTO profiles (id, display_name)
SELECT 
  id, 
  COALESCE(raw_user_meta_data ->> 'display_name', 'ユーザー')
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
