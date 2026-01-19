-- ユーザー（Supabase Auth連携）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 旅行
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  destinations TEXT[],
  invite_code TEXT UNIQUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 旅行メンバー
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- 旅程アイテム
CREATE TABLE itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  timezone TEXT,
  location TEXT,
  address TEXT,
  notes TEXT,
  airline TEXT,
  flight_number TEXT,
  departure_airport TEXT,
  arrival_airport TEXT,
  departure_time TIMESTAMP WITH TIME ZONE,
  arrival_time TIMESTAMP WITH TIME ZONE,
  confirmation_number TEXT,
  check_in_date DATE,
  check_out_date DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 行きたい場所リスト
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  category TEXT,
  notes TEXT,
  status TEXT DEFAULT 'tentative',
  visit_date DATE,
  visit_time TIME,
  end_time TIME,
  ticket_info TEXT,
  ticket_url TEXT,
  price DECIMAL(10, 2),
  price_currency TEXT DEFAULT 'JPY',
  is_added_to_itinerary BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支払い記録
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'JPY',
  amount_jpy DECIMAL(10, 2),
  exchange_rate DECIMAL(10, 6),
  category TEXT,
  description TEXT,
  paid_by UUID REFERENCES profiles(id),
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支払い対象者
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(expense_id, user_id)
);

-- 為替レート（旅行ごとに保存）
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT DEFAULT 'JPY',
  rate DECIMAL(10, 6) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, from_currency, to_currency)
);

-- AIチャット履歴
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- プロフィールポリシー
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 旅行ポリシー（メンバーが閲覧・更新可能）
CREATE POLICY "Trip members can view trips" ON trips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = trips.id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view trips by invite code" ON trips
  FOR SELECT USING (invite_code IS NOT NULL);

CREATE POLICY "Authenticated users can create trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Trip owners can update trips" ON trips
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = trips.id 
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'owner'
    )
  );

-- 旅行メンバーポリシー
CREATE POLICY "Trip members can view members" ON trip_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members AS tm
      WHERE tm.trip_id = trip_members.trip_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join trips" ON trip_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 旅程アイテムポリシー
CREATE POLICY "Trip members can view itinerary" ON itinerary_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = itinerary_items.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can insert itinerary" ON itinerary_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = itinerary_items.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can update itinerary" ON itinerary_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = itinerary_items.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can delete itinerary" ON itinerary_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = itinerary_items.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

-- 場所リストポリシー
CREATE POLICY "Trip members can view places" ON places
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = places.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can insert places" ON places
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = places.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can update places" ON places
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = places.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can delete places" ON places
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = places.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

-- 支払いポリシー
CREATE POLICY "Trip members can view expenses" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = expenses.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can insert expenses" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = expenses.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can update expenses" ON expenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = expenses.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can delete expenses" ON expenses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = expenses.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

-- expense_splitsポリシー
CREATE POLICY "Trip members can view expense splits" ON expense_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expenses 
      JOIN trip_members ON trip_members.trip_id = expenses.trip_id
      WHERE expenses.id = expense_splits.expense_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can insert expense splits" ON expense_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses 
      JOIN trip_members ON trip_members.trip_id = expenses.trip_id
      WHERE expenses.id = expense_splits.expense_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- exchange_ratesポリシー
CREATE POLICY "Trip members can view exchange rates" ON exchange_rates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = exchange_rates.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can manage exchange rates" ON exchange_rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = exchange_rates.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

-- chat_messagesポリシー
CREATE POLICY "Trip members can view chat messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = chat_messages.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_members.trip_id = chat_messages.trip_id 
      AND trip_members.user_id = auth.uid()
    )
  );

-- プロフィール表示用（他メンバーのプロフィールも見れるように）
CREATE POLICY "Can view profiles of trip members" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members tm1
      JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
      WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = profiles.id
    )
  );
