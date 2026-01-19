-- expenses テーブルに title カラムを追加
-- description は「メモ」として残し、title は「タイトル」として使用

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS title TEXT;

-- 既存のレコードの title は NULL のまま（任意入力として扱う）
-- 必要に応じて description の値を title に移行することも可能

COMMENT ON COLUMN expenses.title IS '費用のタイトル（例: ランチ代、タクシー代）';
COMMENT ON COLUMN expenses.description IS '費用の詳細メモ';
