
/*
# GATE CSE 2027 Prep Tracker - Full Schema

## Overview
Single-tenant app (no login) for Samyak Mishra's GATE CSE 2027 preparation tracking.

## Tables Created:
1. `subjects` - 12 GATE CSE subjects with progress tracking
2. `chapters` - Chapters per subject with lecture/notes/pyq/dpp/revision/formula tracking
3. `practice_sessions` - Practice question tracking with accuracy and time stats
4. `pyq_attempts` - Previous Year Question tracking by subject and year
5. `tests` - Test series tracking (chapter/subject/full-length tests)
6. `daily_plans` - Hour-wise daily study schedule
7. `plan_tasks` - Individual tasks within a daily plan
8. `study_sessions` - Study timer sessions tracking hours
9. `goals` - Daily/weekly/monthly goals
10. `streak_data` - Study streak and calendar heatmap data
11. `achievements` - Achievement records (bronze/silver/gold/diamond)
12. `syllabus_topics` - GATE syllabus topic tracking with weightage/difficulty

## Security:
- RLS enabled on all tables with anon+authenticated access (single-tenant, no auth)
*/

-- =====================
-- SUBJECTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  color text,
  total_chapters integer NOT NULL DEFAULT 0,
  completed_chapters integer NOT NULL DEFAULT 0,
  revision_count integer NOT NULL DEFAULT 0,
  study_hours numeric(6,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_subjects" ON subjects;
CREATE POLICY "anon_select_subjects" ON subjects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_subjects" ON subjects;
CREATE POLICY "anon_insert_subjects" ON subjects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_subjects" ON subjects;
CREATE POLICY "anon_update_subjects" ON subjects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_subjects" ON subjects;
CREATE POLICY "anon_delete_subjects" ON subjects FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- CHAPTERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  lecture_done boolean NOT NULL DEFAULT false,
  notes_done boolean NOT NULL DEFAULT false,
  pyqs_done boolean NOT NULL DEFAULT false,
  dpp_done boolean NOT NULL DEFAULT false,
  revision_done boolean NOT NULL DEFAULT false,
  formula_sheet_ready boolean NOT NULL DEFAULT false,
  revision_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_chapters" ON chapters;
CREATE POLICY "anon_select_chapters" ON chapters FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_chapters" ON chapters;
CREATE POLICY "anon_insert_chapters" ON chapters FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_chapters" ON chapters;
CREATE POLICY "anon_update_chapters" ON chapters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_chapters" ON chapters;
CREATE POLICY "anon_delete_chapters" ON chapters FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- PRACTICE SESSIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  questions_solved integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  wrong integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  time_taken_minutes integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_practice" ON practice_sessions;
CREATE POLICY "anon_select_practice" ON practice_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_practice" ON practice_sessions;
CREATE POLICY "anon_insert_practice" ON practice_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_practice" ON practice_sessions;
CREATE POLICY "anon_update_practice" ON practice_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_practice" ON practice_sessions;
CREATE POLICY "anon_delete_practice" ON practice_sessions FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- PYQ ATTEMPTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS pyq_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  year integer NOT NULL,
  question_number integer,
  topic text,
  attempted boolean NOT NULL DEFAULT false,
  correct boolean,
  marks_obtained numeric(4,2),
  marks_possible numeric(4,2),
  time_taken_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pyq_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pyq" ON pyq_attempts;
CREATE POLICY "anon_select_pyq" ON pyq_attempts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pyq" ON pyq_attempts;
CREATE POLICY "anon_insert_pyq" ON pyq_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pyq" ON pyq_attempts;
CREATE POLICY "anon_update_pyq" ON pyq_attempts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pyq" ON pyq_attempts;
CREATE POLICY "anon_delete_pyq" ON pyq_attempts FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- TESTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('chapter', 'subject', 'full_length')),
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  test_date date,
  total_marks numeric(6,2),
  obtained_marks numeric(6,2),
  total_questions integer,
  attempted_questions integer,
  correct_answers integer,
  time_taken_minutes integer,
  rank integer,
  percentile numeric(5,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_tests" ON tests;
CREATE POLICY "anon_select_tests" ON tests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tests" ON tests;
CREATE POLICY "anon_insert_tests" ON tests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tests" ON tests;
CREATE POLICY "anon_update_tests" ON tests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tests" ON tests;
CREATE POLICY "anon_delete_tests" ON tests FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- DAILY PLANS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_date date NOT NULL UNIQUE,
  is_holiday boolean NOT NULL DEFAULT false,
  is_mock_day boolean NOT NULL DEFAULT false,
  is_revision_day boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_plans" ON daily_plans;
CREATE POLICY "anon_select_plans" ON daily_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_plans" ON daily_plans;
CREATE POLICY "anon_insert_plans" ON daily_plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_plans" ON daily_plans;
CREATE POLICY "anon_update_plans" ON daily_plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_plans" ON daily_plans;
CREATE POLICY "anon_delete_plans" ON daily_plans FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- PLAN TASKS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  hour_slot integer CHECK (hour_slot >= 0 AND hour_slot <= 23),
  task_text text NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  is_completed boolean NOT NULL DEFAULT false,
  duration_minutes integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_tasks" ON plan_tasks;
CREATE POLICY "anon_select_tasks" ON plan_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tasks" ON plan_tasks;
CREATE POLICY "anon_insert_tasks" ON plan_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tasks" ON plan_tasks;
CREATE POLICY "anon_update_tasks" ON plan_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tasks" ON plan_tasks;
CREATE POLICY "anon_delete_tasks" ON plan_tasks FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- STUDY SESSIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sessions" ON study_sessions;
CREATE POLICY "anon_select_sessions" ON study_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sessions" ON study_sessions;
CREATE POLICY "anon_insert_sessions" ON study_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sessions" ON study_sessions;
CREATE POLICY "anon_update_sessions" ON study_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sessions" ON study_sessions;
CREATE POLICY "anon_delete_sessions" ON study_sessions FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- GOALS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_type text NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'monthly')),
  metric text NOT NULL CHECK (metric IN ('study_hours', 'questions', 'lectures', 'revisions', 'mock_tests')),
  target_value numeric(8,2) NOT NULL,
  current_value numeric(8,2) NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  is_achieved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_goals" ON goals;
CREATE POLICY "anon_select_goals" ON goals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_goals" ON goals;
CREATE POLICY "anon_insert_goals" ON goals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_goals" ON goals;
CREATE POLICY "anon_update_goals" ON goals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_goals" ON goals;
CREATE POLICY "anon_delete_goals" ON goals FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- STREAK DATA TABLE
-- =====================
CREATE TABLE IF NOT EXISTS streak_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_date date NOT NULL UNIQUE,
  study_minutes integer NOT NULL DEFAULT 0,
  is_study_day boolean NOT NULL DEFAULT false,
  questions_solved integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE streak_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_streak" ON streak_data;
CREATE POLICY "anon_select_streak" ON streak_data FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_streak" ON streak_data;
CREATE POLICY "anon_insert_streak" ON streak_data FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_streak" ON streak_data;
CREATE POLICY "anon_update_streak" ON streak_data FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_streak" ON streak_data;
CREATE POLICY "anon_delete_streak" ON streak_data FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- ACHIEVEMENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  tier text NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond')),
  icon text,
  condition_type text NOT NULL,
  condition_value numeric(10,2) NOT NULL,
  is_unlocked boolean NOT NULL DEFAULT false,
  unlocked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_achievements" ON achievements;
CREATE POLICY "anon_select_achievements" ON achievements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_achievements" ON achievements;
CREATE POLICY "anon_insert_achievements" ON achievements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_achievements" ON achievements;
CREATE POLICY "anon_update_achievements" ON achievements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_achievements" ON achievements;
CREATE POLICY "anon_delete_achievements" ON achievements FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- SYLLABUS TOPICS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS syllabus_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_name text NOT NULL,
  subtopic text,
  is_completed boolean NOT NULL DEFAULT false,
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  weightage text CHECK (weightage IN ('high', 'medium', 'low')),
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  priority text CHECK (priority IN ('high', 'medium', 'low')),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE syllabus_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_syllabus" ON syllabus_topics;
CREATE POLICY "anon_select_syllabus" ON syllabus_topics FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_syllabus" ON syllabus_topics;
CREATE POLICY "anon_insert_syllabus" ON syllabus_topics FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_syllabus" ON syllabus_topics;
CREATE POLICY "anon_update_syllabus" ON syllabus_topics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_syllabus" ON syllabus_topics;
CREATE POLICY "anon_delete_syllabus" ON syllabus_topics FOR DELETE TO anon, authenticated USING (true);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_date ON practice_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_subject ON practice_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_pyq_attempts_subject ON pyq_attempts(subject_id);
CREATE INDEX IF NOT EXISTS idx_pyq_attempts_year ON pyq_attempts(year);
CREATE INDEX IF NOT EXISTS idx_tests_type ON tests(test_type);
CREATE INDEX IF NOT EXISTS idx_tests_date ON tests(test_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON study_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_streak_data_date ON streak_data(study_date);
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_subject ON syllabus_topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan ON plan_tasks(plan_id);
