-- KidTRACKER Multi-Tenant Migration Script
-- This script adds support for multiple daycares (multi-tenant architecture)

-- ============================================
-- 1. CREATE DAYCARES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS daycares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    daycare_code VARCHAR(10) UNIQUE NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    owner_user_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on daycare_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_daycares_code ON daycares(daycare_code);

-- ============================================
-- 2. ADD daycare_id COLUMN TO EXISTING TABLES
-- ============================================

-- Add daycare_id to app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS daycare_id UUID REFERENCES daycares(id);
CREATE INDEX IF NOT EXISTS idx_app_users_daycare ON app_users(daycare_id);

-- Add daycare_id to children
ALTER TABLE children ADD COLUMN IF NOT EXISTS daycare_id UUID REFERENCES daycares(id);
CREATE INDEX IF NOT EXISTS idx_children_daycare ON children(daycare_id);

-- Add daycare_id to attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS daycare_id UUID REFERENCES daycares(id);
CREATE INDEX IF NOT EXISTS idx_attendance_daycare ON attendance(daycare_id);

-- Add daycare_id to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS daycare_id UUID REFERENCES daycares(id);
CREATE INDEX IF NOT EXISTS idx_invoices_daycare ON invoices(daycare_id);

-- Add daycare_id to classrooms
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS daycare_id UUID REFERENCES daycares(id);
CREATE INDEX IF NOT EXISTS idx_classrooms_daycare ON classrooms(daycare_id);

-- Add daycare_id to meal_menus
ALTER TABLE meal_menus ADD COLUMN IF NOT EXISTS daycare_id UUID REFERENCES daycares(id);
CREATE INDEX IF NOT EXISTS idx_meal_menus_daycare ON meal_menus(daycare_id);

-- Add daycare_id to daily_activities
ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS daycare_id UUID REFERENCES daycares(id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_daycare ON daily_activities(daycare_id);

-- Add daycare_id to activity_photos
ALTER TABLE activity_photos ADD COLUMN IF NOT EXISTS daycare_id UUID REFERENCES daycares(id);
CREATE INDEX IF NOT EXISTS idx_activity_photos_daycare ON activity_photos(daycare_id);

-- Add daycare_id to company_info
ALTER TABLE company_info ADD COLUMN IF NOT EXISTS daycare_id UUID REFERENCES daycares(id);
CREATE INDEX IF NOT EXISTS idx_company_info_daycare ON company_info(daycare_id);

-- Add operating_hours to company_info
ALTER TABLE company_info ADD COLUMN IF NOT EXISTS operating_hours JSONB;

-- ============================================
-- 3. CREATE DEFAULT DAYCARE FOR EXISTING DATA
-- ============================================

-- Insert a default daycare for existing data migration
INSERT INTO daycares (id, name, daycare_code, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Daycare', 'DEFAULT', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. MIGRATE EXISTING DATA TO DEFAULT DAYCARE
-- ============================================

-- Update existing records to belong to the default daycare
UPDATE app_users SET daycare_id = '00000000-0000-0000-0000-000000000001' WHERE daycare_id IS NULL AND role != 'super_admin';
UPDATE children SET daycare_id = '00000000-0000-0000-0000-000000000001' WHERE daycare_id IS NULL;
UPDATE attendance SET daycare_id = '00000000-0000-0000-0000-000000000001' WHERE daycare_id IS NULL;
UPDATE invoices SET daycare_id = '00000000-0000-0000-0000-000000000001' WHERE daycare_id IS NULL;
UPDATE classrooms SET daycare_id = '00000000-0000-0000-0000-000000000001' WHERE daycare_id IS NULL;
UPDATE meal_menus SET daycare_id = '00000000-0000-0000-0000-000000000001' WHERE daycare_id IS NULL;
UPDATE daily_activities SET daycare_id = '00000000-0000-0000-0000-000000000001' WHERE daycare_id IS NULL;
UPDATE activity_photos SET daycare_id = '00000000-0000-0000-0000-000000000001' WHERE daycare_id IS NULL;
UPDATE company_info SET daycare_id = '00000000-0000-0000-0000-000000000001' WHERE daycare_id IS NULL;

-- ============================================
-- 5. CREATE SUPER ADMIN USER (OPTIONAL)
-- ============================================

-- Create a super admin user (update with actual credentials)
-- INSERT INTO app_users (username, password, full_name, email, role, status)
-- VALUES ('superadmin', 'your_secure_password', 'Super Administrator', 'admin@kidtracker.com', 'super_admin', 'active')
-- ON CONFLICT DO NOTHING;

-- ============================================
-- NOTES:
-- ============================================
-- 1. The 'daycares' table stores all daycare centers
-- 2. Each daycare has a unique 6-character code for login
-- 3. Super admin users have role='super_admin' and no daycare_id
-- 4. Regular users (admin, user, parent) must have a daycare_id
-- 5. All data is filtered by daycare_id for non-super-admin users
-- 6. Super admin can switch between daycares to manage them
