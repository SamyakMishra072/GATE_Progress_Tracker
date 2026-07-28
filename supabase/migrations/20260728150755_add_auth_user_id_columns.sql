/*
# Add Multi-User Authentication Support

## Overview
Converts the GATE CSE Prep Tracker from single-tenant (anon access) to multi-user (authenticated access).
Each user will only see and modify their own data.

## Changes:

### 1. New Table: `profiles`
- `id` (uuid, PK, references auth.users) — links to the authenticated user
- `full_name` (text) — user's display name from signup
- `email` (text) — user's email
- `created_at` (timestamptz)
- RLS enabled: users can SELECT and UPDATE only their own profile row

### 2. Added `user_id` column to ALL existing tables:
- subjects, chapters, practice_sessions, pyq_attempts, tests
- daily_plans, plan_tasks, study_sessions, goals, streak_data
- achievements, syllabus_topics
- All columns: `user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE`
- The DEFAULT auth.uid() ensures inserts work even when the frontend omits user_id

### 3. RLS Policy Changes:
- ALL old anon-access policies are dropped
- New policies: `TO authenticated` with `auth.uid() = user_id` ownership checks
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE)

### 4. Trigger: Auto-create profile on signup
- `handle_new_user()` trigger fires on auth.users INSERT
- Inserts a row into `profiles` with the user's full_name from raw_user_meta_data

### Important Notes:
1. Old single-tenant data was cleared before this migration (it had no owner).
2. All new inserts will automatically set user_id from the authenticated session.
3. The frontend does NOT need to pass user_id in any insert — the database default handles it.
*/

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =====================
-- AUTO-CREATE PROFILE TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- ADD user_id TO ALL TABLES
-- =====================

DO $$ BEGIN
  ALTER TABLE subjects ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE chapters ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE practice_sessions ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pyq_attempts ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tests ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE daily_plans ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE plan_tasks ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE study_sessions ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE goals ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE streak_data ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE achievements ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE syllabus_topics ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- =====================
-- UPDATE UNIQUE CONSTRAINTS (include user_id)
-- =====================
ALTER TABLE daily_plans DROP CONSTRAINT IF EXISTS daily_plans_plan_date_key;
ALTER TABLE daily_plans DROP CONSTRAINT IF EXISTS daily_plans_user_date_unique;
ALTER TABLE daily_plans ADD CONSTRAINT daily_plans_user_date_unique UNIQUE (user_id, plan_date);

ALTER TABLE streak_data DROP CONSTRAINT IF EXISTS streak_data_study_date_key;
ALTER TABLE streak_data DROP CONSTRAINT IF EXISTS streak_data_user_date_unique;
ALTER TABLE streak_data ADD CONSTRAINT streak_data_user_date_unique UNIQUE (user_id, study_date);

ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_slug_key;
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_user_slug_unique;
ALTER TABLE subjects ADD CONSTRAINT subjects_user_slug_unique UNIQUE (user_id, slug);

ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_title_tier_unique;
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_user_title_tier_unique;
ALTER TABLE achievements ADD CONSTRAINT achievements_user_title_tier_unique UNIQUE (user_id, title, tier);

-- =====================
-- DROP OLD ANON POLICIES & CREATE NEW AUTHENTICATED POLICIES
-- =====================

-- SUBJECTS
DROP POLICY IF EXISTS "anon_select_subjects" ON subjects;
DROP POLICY IF EXISTS "anon_insert_subjects" ON subjects;
DROP POLICY IF EXISTS "anon_update_subjects" ON subjects;
DROP POLICY IF EXISTS "anon_delete_subjects" ON subjects;
DROP POLICY IF EXISTS "select_own_subjects" ON subjects;
DROP POLICY IF EXISTS "insert_own_subjects" ON subjects;
DROP POLICY IF EXISTS "update_own_subjects" ON subjects;
DROP POLICY IF EXISTS "delete_own_subjects" ON subjects;
CREATE POLICY "select_own_subjects" ON subjects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_subjects" ON subjects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_subjects" ON subjects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_subjects" ON subjects FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CHAPTERS
DROP POLICY IF EXISTS "anon_select_chapters" ON chapters;
DROP POLICY IF EXISTS "anon_insert_chapters" ON chapters;
DROP POLICY IF EXISTS "anon_update_chapters" ON chapters;
DROP POLICY IF EXISTS "anon_delete_chapters" ON chapters;
DROP POLICY IF EXISTS "select_own_chapters" ON chapters;
DROP POLICY IF EXISTS "insert_own_chapters" ON chapters;
DROP POLICY IF EXISTS "update_own_chapters" ON chapters;
DROP POLICY IF EXISTS "delete_own_chapters" ON chapters;
CREATE POLICY "select_own_chapters" ON chapters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_chapters" ON chapters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_chapters" ON chapters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_chapters" ON chapters FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PRACTICE_SESSIONS
DROP POLICY IF EXISTS "anon_select_practice" ON practice_sessions;
DROP POLICY IF EXISTS "anon_insert_practice" ON practice_sessions;
DROP POLICY IF EXISTS "anon_update_practice" ON practice_sessions;
DROP POLICY IF EXISTS "anon_delete_practice" ON practice_sessions;
DROP POLICY IF EXISTS "select_own_practice" ON practice_sessions;
DROP POLICY IF EXISTS "insert_own_practice" ON practice_sessions;
DROP POLICY IF EXISTS "update_own_practice" ON practice_sessions;
DROP POLICY IF EXISTS "delete_own_practice" ON practice_sessions;
CREATE POLICY "select_own_practice" ON practice_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_practice" ON practice_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_practice" ON practice_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_practice" ON practice_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PYQ_ATTEMPTS
DROP POLICY IF EXISTS "anon_select_pyq" ON pyq_attempts;
DROP POLICY IF EXISTS "anon_insert_pyq" ON pyq_attempts;
DROP POLICY IF EXISTS "anon_update_pyq" ON pyq_attempts;
DROP POLICY IF EXISTS "anon_delete_pyq" ON pyq_attempts;
DROP POLICY IF EXISTS "select_own_pyq" ON pyq_attempts;
DROP POLICY IF EXISTS "insert_own_pyq" ON pyq_attempts;
DROP POLICY IF EXISTS "update_own_pyq" ON pyq_attempts;
DROP POLICY IF EXISTS "delete_own_pyq" ON pyq_attempts;
CREATE POLICY "select_own_pyq" ON pyq_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_pyq" ON pyq_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_pyq" ON pyq_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_pyq" ON pyq_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- TESTS
DROP POLICY IF EXISTS "anon_select_tests" ON tests;
DROP POLICY IF EXISTS "anon_insert_tests" ON tests;
DROP POLICY IF EXISTS "anon_update_tests" ON tests;
DROP POLICY IF EXISTS "anon_delete_tests" ON tests;
DROP POLICY IF EXISTS "select_own_tests" ON tests;
DROP POLICY IF EXISTS "insert_own_tests" ON tests;
DROP POLICY IF EXISTS "update_own_tests" ON tests;
DROP POLICY IF EXISTS "delete_own_tests" ON tests;
CREATE POLICY "select_own_tests" ON tests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_tests" ON tests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_tests" ON tests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_tests" ON tests FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- DAILY_PLANS
DROP POLICY IF EXISTS "anon_select_plans" ON daily_plans;
DROP POLICY IF EXISTS "anon_insert_plans" ON daily_plans;
DROP POLICY IF EXISTS "anon_update_plans" ON daily_plans;
DROP POLICY IF EXISTS "anon_delete_plans" ON daily_plans;
DROP POLICY IF EXISTS "select_own_plans" ON daily_plans;
DROP POLICY IF EXISTS "insert_own_plans" ON daily_plans;
DROP POLICY IF EXISTS "update_own_plans" ON daily_plans;
DROP POLICY IF EXISTS "delete_own_plans" ON daily_plans;
CREATE POLICY "select_own_plans" ON daily_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_plans" ON daily_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_plans" ON daily_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_plans" ON daily_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PLAN_TASKS
DROP POLICY IF EXISTS "anon_select_tasks" ON plan_tasks;
DROP POLICY IF EXISTS "anon_insert_tasks" ON plan_tasks;
DROP POLICY IF EXISTS "anon_update_tasks" ON plan_tasks;
DROP POLICY IF EXISTS "anon_delete_tasks" ON plan_tasks;
DROP POLICY IF EXISTS "select_own_tasks" ON plan_tasks;
DROP POLICY IF EXISTS "insert_own_tasks" ON plan_tasks;
DROP POLICY IF EXISTS "update_own_tasks" ON plan_tasks;
DROP POLICY IF EXISTS "delete_own_tasks" ON plan_tasks;
CREATE POLICY "select_own_tasks" ON plan_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_tasks" ON plan_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_tasks" ON plan_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_tasks" ON plan_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STUDY_SESSIONS
DROP POLICY IF EXISTS "anon_select_sessions" ON study_sessions;
DROP POLICY IF EXISTS "anon_insert_sessions" ON study_sessions;
DROP POLICY IF EXISTS "anon_update_sessions" ON study_sessions;
DROP POLICY IF EXISTS "anon_delete_sessions" ON study_sessions;
DROP POLICY IF EXISTS "select_own_sessions" ON study_sessions;
DROP POLICY IF EXISTS "insert_own_sessions" ON study_sessions;
DROP POLICY IF EXISTS "update_own_sessions" ON study_sessions;
DROP POLICY IF EXISTS "delete_own_sessions" ON study_sessions;
CREATE POLICY "select_own_sessions" ON study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_sessions" ON study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_sessions" ON study_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_sessions" ON study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- GOALS
DROP POLICY IF EXISTS "anon_select_goals" ON goals;
DROP POLICY IF EXISTS "anon_insert_goals" ON goals;
DROP POLICY IF EXISTS "anon_update_goals" ON goals;
DROP POLICY IF EXISTS "anon_delete_goals" ON goals;
DROP POLICY IF EXISTS "select_own_goals" ON goals;
DROP POLICY IF EXISTS "insert_own_goals" ON goals;
DROP POLICY IF EXISTS "update_own_goals" ON goals;
DROP POLICY IF EXISTS "delete_own_goals" ON goals;
CREATE POLICY "select_own_goals" ON goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_goals" ON goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_goals" ON goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_goals" ON goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STREAK_DATA
DROP POLICY IF EXISTS "anon_select_streak" ON streak_data;
DROP POLICY IF EXISTS "anon_insert_streak" ON streak_data;
DROP POLICY IF EXISTS "anon_update_streak" ON streak_data;
DROP POLICY IF EXISTS "anon_delete_streak" ON streak_data;
DROP POLICY IF EXISTS "select_own_streak" ON streak_data;
DROP POLICY IF EXISTS "insert_own_streak" ON streak_data;
DROP POLICY IF EXISTS "update_own_streak" ON streak_data;
DROP POLICY IF EXISTS "delete_own_streak" ON streak_data;
CREATE POLICY "select_own_streak" ON streak_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_streak" ON streak_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_streak" ON streak_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_streak" ON streak_data FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ACHIEVEMENTS
DROP POLICY IF EXISTS "anon_select_achievements" ON achievements;
DROP POLICY IF EXISTS "anon_insert_achievements" ON achievements;
DROP POLICY IF EXISTS "anon_update_achievements" ON achievements;
DROP POLICY IF EXISTS "anon_delete_achievements" ON achievements;
DROP POLICY IF EXISTS "select_own_achievements" ON achievements;
DROP POLICY IF EXISTS "insert_own_achievements" ON achievements;
DROP POLICY IF EXISTS "update_own_achievements" ON achievements;
DROP POLICY IF EXISTS "delete_own_achievements" ON achievements;
CREATE POLICY "select_own_achievements" ON achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_achievements" ON achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_achievements" ON achievements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_achievements" ON achievements FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SYLLABUS_TOPICS
DROP POLICY IF EXISTS "anon_select_syllabus" ON syllabus_topics;
DROP POLICY IF EXISTS "anon_insert_syllabus" ON syllabus_topics;
DROP POLICY IF EXISTS "anon_update_syllabus" ON syllabus_topics;
DROP POLICY IF EXISTS "anon_delete_syllabus" ON syllabus_topics;
DROP POLICY IF EXISTS "select_own_syllabus" ON syllabus_topics;
DROP POLICY IF EXISTS "insert_own_syllabus" ON syllabus_topics;
DROP POLICY IF EXISTS "update_own_syllabus" ON syllabus_topics;
DROP POLICY IF EXISTS "delete_own_syllabus" ON syllabus_topics;
CREATE POLICY "select_own_syllabus" ON syllabus_topics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_syllabus" ON syllabus_topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_syllabus" ON syllabus_topics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_syllabus" ON syllabus_topics FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================
-- INDEXES FOR user_id
-- =====================
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_user_id ON chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pyq_user_id ON pyq_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_id ON daily_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_user_id ON plan_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_data_user_id ON streak_data(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_user_id ON syllabus_topics(user_id);
