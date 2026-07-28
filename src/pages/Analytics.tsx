import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  AreaChart, Area
} from 'recharts'
import type { Subject, PracticeSession, Test, StudySession } from '@/lib/supabase'

export function Analytics() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [practice, setPractice] = useState<PracticeSession[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('subjects').select('*'),
      supabase.from('practice_sessions').select('*').order('session_date'),
      supabase.from('tests').select('*').order('test_date'),
      supabase.from('study_sessions').select('*').order('session_date'),
    ]).then(([sub, prac, tst, sess]) => {
      if (sub.data) setSubjects(sub.data)
      if (prac.data) setPractice(prac.data)
      if (tst.data) setTests(tst.data)
      if (sess.data) setSessions(sess.data)
      setLoading(false)
    })
  }, [])

  // Subject progress data
  const subjectProgress = subjects.map(s => ({
    name: s.name.split(' ')[0],
    done: s.completed_chapters,
    total: s.total_chapters,
    pct: s.total_chapters > 0 ? Math.round(s.completed_chapters / s.total_chapters * 100) : 0
  }))

  // Weekly study hours (last 8 weeks)
  const weeklyData = (() => {
    const weeks: { week: string; hours: number }[] = []
    for (let w = 7; w >= 0; w--) {
      const end = new Date()
      end.setDate(end.getDate() - w * 7)
      const start = new Date(end)
      start.setDate(start.getDate() - 7)
      const weekLabel = `W${8 - w}`
      const mins = sessions
        .filter(s => {
          const d = new Date(s.session_date)
          return d >= start && d <= end
        })
        .reduce((sum, s) => sum + s.duration_minutes, 0)
      weeks.push({ week: weekLabel, hours: Math.round(mins / 60 * 10) / 10 })
    }
    return weeks
  })()

  // Practice accuracy over time (last 20 sessions)
  const accuracyData = practice.slice(-20).map(p => ({
    date: new Date(p.session_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    accuracy: p.questions_solved > 0 ? Math.round(p.correct / p.questions_solved * 100) : 0,
    solved: p.questions_solved
  }))

  // Mock test score trend
  const mockData = tests
    .filter(t => t.test_type === 'full_length' && t.total_marks && t.obtained_marks)
    .map(t => ({
      name: t.name.slice(0, 8),
      score: Math.round(t.obtained_marks! / t.total_marks! * 100),
      percentile: t.percentile || 0
    }))

  // Subject pie data removed - not used in current layout
  // Daily questions this month
  const monthlyQuestions = (() => {
    const now = new Date()
    const days: { day: string; questions: number }[] = []
    for (let d = 29; d >= 0; d--) {
      const date = new Date(now)
      date.setDate(date.getDate() - d)
      const dateStr = date.toISOString().split('T')[0]
      const qs = practice.filter(p => p.session_date === dateStr).reduce((s, r) => s + r.questions_solved, 0)
      if (d % 5 === 0 || qs > 0) {
        days.push({ day: `${date.getDate()}/${date.getMonth() + 1}`, questions: qs })
      }
    }
    return days
  })()

  const totalHours = Math.round(sessions.reduce((s, r) => s + r.duration_minutes, 0) / 60 * 10) / 10
  const totalQuestions = practice.reduce((s, r) => s + r.questions_solved, 0)
  const totalCorrect = practice.reduce((s, r) => s + r.correct, 0)
  const overallAcc = totalQuestions > 0 ? Math.round(totalCorrect / totalQuestions * 100) : 0
  const avgMockScore = mockData.length > 0 ? Math.round(mockData.reduce((s, r) => s + r.score, 0) / mockData.length) : 0

  if (loading) return (
    <div className="p-6 grid grid-cols-2 gap-4">
      {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">Deep insights into your GATE preparation</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Study Hours', value: `${totalHours}h`, color: 'text-blue-500' },
          { label: 'Questions Solved', value: totalQuestions, color: 'text-green-500' },
          { label: 'Overall Accuracy', value: `${overallAcc}%`, color: 'text-purple-500' },
          { label: 'Avg Mock Score', value: `${avgMockScore}%`, color: 'text-orange-500' },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subject Progress Bar Chart */}
      {subjectProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subject-wise Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ pct: { label: 'Progress %', color: 'var(--chart-1)' } }} className="min-h-[200px]">
              <BarChart data={subjectProgress} layout="vertical" margin={{ left: 80, right: 20, top: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="pct" fill="var(--color-pct)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Weekly Study Hours */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly Study Hours (Last 8 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ hours: { label: 'Hours', color: 'var(--chart-2)' } }} className="min-h-[160px]">
            <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="hours" stroke="var(--color-hours)" fill="var(--color-hours)" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Accuracy Trend */}
        {accuracyData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Practice Accuracy Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ accuracy: { label: 'Accuracy %', color: 'var(--chart-3)' } }} className="min-h-[180px]">
                <LineChart data={accuracyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Mock Test Trend */}
        {mockData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mock Test Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ score: { label: 'Score %', color: 'var(--chart-4)' } }} className="min-h-[180px]">
                <LineChart data={mockData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Question Tracker */}
      {monthlyQuestions.some(d => d.questions > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Questions (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ questions: { label: 'Questions', color: 'var(--chart-5)' } }} className="min-h-[140px]">
              <BarChart data={monthlyQuestions} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="questions" fill="var(--color-questions)" radius={2} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Subject Stats */}
      {subjects.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subject-wise Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subjects.map(s => {
                const pct = s.total_chapters > 0 ? Math.round(s.completed_chapters / s.total_chapters * 100) : 0
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-sm w-32 shrink-0 truncate">{s.name.split(' ')[0]}</span>
                    <Progress value={pct} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                    <Badge variant="outline" className="text-xs w-14 text-center justify-center">{s.study_hours}h</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
