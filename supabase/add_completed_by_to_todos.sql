-- completed_by カラムを追加
ALTER TABLE trip_todos 
ADD COLUMN IF NOT EXISTS completed_by UUID[] DEFAULT ARRAY[]::UUID[];

-- 既存データの移行: is_completed = true のものは、assigned_to の全員が完了したとみなす
UPDATE trip_todos
SET completed_by = assigned_to
WHERE is_completed = true;
