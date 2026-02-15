-- KidTRACKER Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Children table
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  photo TEXT,
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  emergency_contact_2 TEXT,
  emergency_phone_2 TEXT,
  authorized_pickup_1 TEXT,
  authorized_pickup_1_phone TEXT,
  authorized_pickup_2 TEXT,
  authorized_pickup_2_phone TEXT,
  authorized_pickup_3 TEXT,
  authorized_pickup_3_phone TEXT,
  allergies TEXT,
  medical_notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  parent_user_id TEXT,
  recurring_charges JSONB DEFAULT '[]',
  classroom_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal menus table
CREATE TABLE IF NOT EXISTS meal_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  menu_name TEXT NOT NULL,
  description TEXT,
  allergens TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity photos table
CREATE TABLE IF NOT EXISTS activity_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  photo TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily activities table
CREATE TABLE IF NOT EXISTS daily_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bathroom_times JSONB DEFAULT '[]',
  nap_start TIME,
  nap_end TIME,
  mood TEXT CHECK (mood IN ('happy', 'sad', 'cranky', 'energetic', 'calm', '')),
  teacher_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, date)
);

-- Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  age_group TEXT,
  capacity INTEGER,
  teacher_name TEXT,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company info table (single row)
CREATE TABLE IF NOT EXISTS company_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  logo TEXT,
  operating_hours JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (for app authentication)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'parent')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  child_ids JSONB DEFAULT '[]',
  parent_code TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin user (password: admin123)
INSERT INTO app_users (username, password, full_name, email, role, status)
VALUES ('admin', 'admin123', 'Administrator', 'admin@kidtracker.com', 'admin', 'active')
ON CONFLICT (username) DO NOTHING;

-- Insert default company info row
INSERT INTO company_info (name)
VALUES ('')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for now - you can restrict later)
CREATE POLICY "Allow all operations on children" ON children FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on meal_menus" ON meal_menus FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on activity_photos" ON activity_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on daily_activities" ON daily_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on classrooms" ON classrooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on company_info" ON company_info FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_child_date ON attendance(child_id, date);
CREATE INDEX IF NOT EXISTS idx_invoices_child ON invoices(child_id);
CREATE INDEX IF NOT EXISTS idx_activity_photos_child_date ON activity_photos(child_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_child_date ON daily_activities(child_id, date);
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status);
