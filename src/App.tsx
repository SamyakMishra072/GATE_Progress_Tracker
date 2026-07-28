import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/lib/auth'
import { AppLayout } from '@/components/AppLayout'
import { AuthPage } from '@/pages/AuthPage'
import { Dashboard } from '@/pages/Dashboard'
import { SubjectTracker } from '@/pages/SubjectTracker'
import { ChapterTracker } from '@/pages/ChapterTracker'
import { PracticeTracker } from '@/pages/PracticeTracker'
import { PYQTracker } from '@/pages/PYQTracker'
import { TestSeries } from '@/pages/TestSeries'
import { Analytics } from '@/pages/Analytics'
import { DailyPlanner } from '@/pages/DailyPlanner'
import { StudyTimer } from '@/pages/StudyTimer'
import { GoalsPage } from '@/pages/GoalsPage'
import { MarksPredictor } from '@/pages/MarksPredictor'
import { SyllabusTracker } from '@/pages/SyllabusTracker'
import { AchievementsPage } from '@/pages/AchievementsPage'
import { StudyStreak } from '@/pages/StudyStreak'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function LoginRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return <AuthPage />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="subjects" element={<SubjectTracker />} />
        <Route path="chapters" element={<ChapterTracker />} />
        <Route path="chapters/:subjectSlug" element={<ChapterTracker />} />
        <Route path="practice" element={<PracticeTracker />} />
        <Route path="pyq" element={<PYQTracker />} />
        <Route path="tests" element={<TestSeries />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="planner" element={<DailyPlanner />} />
        <Route path="timer" element={<StudyTimer />} />
        <Route path="streak" element={<StudyStreak />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="predictor" element={<MarksPredictor />} />
        <Route path="syllabus" element={<SyllabusTracker />} />
        <Route path="achievements" element={<AchievementsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="gate-theme">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
