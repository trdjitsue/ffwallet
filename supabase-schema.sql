-- ============================================
-- FF WALLET - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends Supabase Auth)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  school TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  points INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  avatar_color TEXT DEFAULT '#6C3AF7',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POINT TRANSACTIONS TABLE
-- ============================================
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id),
  points INTEGER NOT NULL,
  reason TEXT,
  transaction_type TEXT NOT NULL DEFAULT 'earn' CHECK (transaction_type IN ('earn', 'spend', 'admin_adjust')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REWARDS / SHOP ITEMS TABLE
-- ============================================
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  category TEXT DEFAULT 'item' CHECK (category IN ('item', 'activity', 'privilege')),
  stock INTEGER DEFAULT -1, -- -1 means unlimited
  is_active BOOLEAN DEFAULT true,
  image_emoji TEXT DEFAULT '🎁',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REDEMPTIONS TABLE
-- ============================================
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES rewards(id),
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TESTS / ACTIVITIES TABLE
-- ============================================
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  join_code TEXT UNIQUE NOT NULL,
  points_reward INTEGER NOT NULL DEFAULT 10,
  teacher_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  max_attempts INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================
-- TEST COMPLETIONS TABLE
-- ============================================
CREATE TABLE test_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_id, student_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_completions ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Public profiles are viewable by all authenticated" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert during registration" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- POINT TRANSACTIONS policies
CREATE POLICY "Students see own transactions" ON point_transactions
  FOR SELECT USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

CREATE POLICY "Teachers can insert transactions" ON point_transactions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- REWARDS policies
CREATE POLICY "All authenticated can view active rewards" ON rewards
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Teachers and admins manage rewards" ON rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- REDEMPTIONS policies
CREATE POLICY "Students see own redemptions" ON redemptions
  FOR SELECT USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

CREATE POLICY "Students can redeem" ON redemptions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers approve redemptions" ON redemptions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- TESTS policies
CREATE POLICY "All authenticated view active tests" ON tests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers manage tests" ON tests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- TEST COMPLETIONS policies
CREATE POLICY "Students see own completions" ON test_completions
  FOR SELECT USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

CREATE POLICY "Students can insert own completions" ON test_completions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update student points when transaction inserted
CREATE OR REPLACE FUNCTION update_student_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'earn' OR NEW.transaction_type = 'admin_adjust' THEN
    UPDATE profiles 
    SET 
      points = points + NEW.points,
      total_points_earned = CASE WHEN NEW.points > 0 THEN total_points_earned + NEW.points ELSE total_points_earned END
    WHERE id = NEW.student_id;
  ELSIF NEW.transaction_type = 'spend' THEN
    UPDATE profiles 
    SET points = points - NEW.points
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_transaction_insert
  AFTER INSERT ON point_transactions
  FOR EACH ROW EXECUTE FUNCTION update_student_points();

-- ============================================
-- SEED DATA: Sample rewards
-- ============================================
INSERT INTO rewards (title, description, points_cost, category, image_emoji, stock) VALUES
  ('ขนมฟรี 1 ชิ้น', 'แลกขนมฟรีจากร้านค้าโรงเรียน', 50, 'item', '🍬', 100),
  ('ไม่ต้องส่งการบ้าน 1 วัน', 'ได้รับการยกเว้นการบ้าน 1 ครั้ง', 100, 'privilege', '📚', -1),
  ('นั่งที่ที่ชอบ 1 สัปดาห์', 'เลือกที่นั่งในห้องเรียนได้เอง', 150, 'privilege', '🪑', -1),
  ('กิจกรรมพิเศษ', 'เข้าร่วมกิจกรรมพิเศษนอกห้องเรียน', 200, 'activity', '🎯', 20),
  ('ใบรับรองเกียรติ', 'รับใบประกาศนียบัตรชมเชย', 300, 'item', '🏆', -1);
