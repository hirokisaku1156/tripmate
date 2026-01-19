-- 1. 外部キー制約を削除（配列には直接FKを晴れないため）
ALTER TABLE trip_todos DROP CONSTRAINT IF EXISTS trip_todos_assigned_to_fkey;

-- 2. assigned_toカラムの型変更（UUID -> UUID[]）
ALTER TABLE trip_todos
  ALTER COLUMN assigned_to TYPE UUID[]
  USING CASE
    WHEN assigned_to IS NULL THEN ARRAY[]::UUID[]
    ELSE ARRAY[assigned_to]
  END;

-- 3. デフォルト値を空配列に
ALTER TABLE trip_todos ALTER COLUMN assigned_to SET DEFAULT ARRAY[]::UUID[];
