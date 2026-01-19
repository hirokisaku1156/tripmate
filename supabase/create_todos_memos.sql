-- Todoテーブル
CREATE TABLE IF NOT EXISTS trip_todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    assigned_to UUID[] DEFAULT ARRAY[]::UUID[],
    completed_by UUID[] DEFAULT ARRAY[]::UUID[],
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- メモテーブル
CREATE TABLE IF NOT EXISTS trip_memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE trip_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_memos ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "todos_all" ON trip_todos;
DROP POLICY IF EXISTS "memos_all" ON trip_memos;

-- 安全なRLSポリシー（trip_membersを経由して権限を確認）
CREATE POLICY "todos_all" ON trip_todos FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM trip_members 
        WHERE trip_id = trip_todos.trip_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "memos_all" ON trip_memos FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM trip_members 
        WHERE trip_id = trip_memos.trip_id 
        AND user_id = auth.uid()
    )
);

-- Realtime有効化
alter publication supabase_realtime add table trip_todos;
alter publication supabase_realtime add table trip_memos;
