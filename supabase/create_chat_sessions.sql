-- 1. 旧テーブルの削除（構造を大幅に変更するため、承認済みリセットとして実行）
DROP TABLE IF EXISTS public.chat_messages;

-- 2. チャットセッション（トーク）テーブルの作成
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. チャットメッセージテーブルの再作成（session_idを追加）
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLSの有効化
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. chat_sessions のポリシー
-- 閲覧: 旅行メンバー かつ (公開トーク or 自分が作成者)
CREATE POLICY "Users can view sessions of their trips"
ON public.chat_sessions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.trip_members
        WHERE trip_members.trip_id = chat_sessions.trip_id
        AND trip_members.user_id = auth.uid()
    )
    AND (
        chat_sessions.is_private = FALSE 
        OR chat_sessions.created_by = auth.uid()
    )
);

-- 挿入: 旅行メンバーであれば作成可能
CREATE POLICY "Users can create sessions in their trips"
ON public.chat_sessions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.trip_members
        WHERE trip_members.trip_id = chat_sessions.trip_id
        AND trip_members.user_id = auth.uid()
    )
);

-- 更新: 作成者のみ（タイトルや公開設定の変更）
CREATE POLICY "Creators can update their sessions"
ON public.chat_sessions FOR UPDATE
USING (chat_sessions.created_by = auth.uid());

-- 6. chat_messages のポリシー
-- 閲覧: 対応するセッションが見れるなら見れる
CREATE POLICY "Users can view messages of visible sessions"
ON public.chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_sessions
        WHERE chat_sessions.id = chat_messages.session_id
    )
);

-- 挿入: 旅行メンバーであれば挿入可能
CREATE POLICY "Users can insert messages to their trips"
ON public.chat_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.trip_members
        WHERE trip_members.trip_id = chat_messages.trip_id
        AND trip_members.user_id = auth.uid()
    )
);
