-- AIチャット履歴テーブル
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS設定
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 自分が参加している旅行のチャット履歴のみ閲覧可能
CREATE POLICY "Users can view chat messages of their trips"
ON public.chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.trip_members
        WHERE trip_members.trip_id = chat_messages.trip_id
        AND trip_members.user_id = auth.uid()
    )
    AND (
        chat_messages.is_private = FALSE 
        OR chat_messages.user_id = auth.uid()
    )
);

-- 自分が参加している旅行であればメッセージを挿入可能
CREATE POLICY "Users can insert chat messages to their trips"
ON public.chat_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.trip_members
        WHERE trip_members.trip_id = chat_messages.trip_id
        AND trip_members.user_id = auth.uid()
    )
);
