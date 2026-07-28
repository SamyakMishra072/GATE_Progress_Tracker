import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Subject = {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  total_chapters: number
  completed_chapters: number
  revision_count: number
  study_hours: number
  created_at: string
  updated_at: string
}

export type Chapter = {
  id: string
  subject_id: string
  name: string
  order_index: number
  lecture_done: boolean
  notes_done: boolean
  pyqs_done: boolean
  dpp_done: boolean
  revision_done: boolean
  formula_sheet_ready: boolean
  revision_count: number
  created_at: string
  updated_at: string
}

export type PracticeSession = {
  id: string
  subject_id: string | null
  chapter_id: string | null
  session_date: string
  questions_solved: number
  correct: number
  wrong: number
  skipped: number
  time_taken_minutes: number
  notes: string | null
  created_at: string
}

export type PYQAttempt = {
  id: string
  subject_id: string | null
  year: number
  question_number: number | null
  topic: string | null
  attempted: boolean
  correct: boolean | null
  marks_obtained: number | null
  marks_possible: number | null
  time_taken_minutes: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Test = {
  id: string
  name: string
  test_type: 'chapter' | 'subject' | 'full_length'
  subject_id: string | null
  test_date: string | null
  total_marks: number | null
  obtained_marks: number | null
  total_questions: number | null
  attempted_questions: number | null
  correct_answers: number | null
  time_taken_minutes: number | null
  rank: number | null
  percentile: number | null
  notes: string | null
  created_at: string
}

export type DailyPlan = {
  id: string
  plan_date: string
  is_holiday: boolean
  is_mock_day: boolean
  is_revision_day: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type PlanTask = {
  id: string
  plan_id: string
  hour_slot: number | null
  task_text: string
  subject_id: string | null
  is_completed: boolean
  duration_minutes: number | null
  created_at: string
}

export type StudySession = {
  id: string
  subject_id: string | null
  session_date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number
  notes: string | null
  created_at: string
}

export type Goal = {
  id: string
  goal_type: 'daily' | 'weekly' | 'monthly'
  metric: 'study_hours' | 'questions' | 'lectures' | 'revisions' | 'mock_tests'
  target_value: number
  current_value: number
  period_start: string
  period_end: string
  is_achieved: boolean
  created_at: string
  updated_at: string
}

export type StreakData = {
  id: string
  study_date: string
  study_minutes: number
  is_study_day: boolean
  questions_solved: number
  created_at: string
  updated_at: string
}

export type Achievement = {
  id: string
  title: string
  description: string | null
  tier: 'bronze' | 'silver' | 'gold' | 'diamond'
  icon: string | null
  condition_type: string
  condition_value: number
  is_unlocked: boolean
  unlocked_at: string | null
  created_at: string
}

export type SyllabusTopic = {
  id: string
  subject_id: string
  topic_name: string
  subtopic: string | null
  is_completed: boolean
  progress_percent: number
  weightage: 'high' | 'medium' | 'low' | null
  difficulty: 'easy' | 'medium' | 'hard' | null
  priority: 'high' | 'medium' | 'low' | null
  order_index: number
  created_at: string
  updated_at: string
}
