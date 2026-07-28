import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  BookOpen, PenTool, Flame, Clock, Target, TrendingUp,
  CalendarDays, Zap, ArrowRight, BookMarked, BarChart3
} from 'lucide-react'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts'
import type { Subject, PracticeSession, Test } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

const PIE_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)'
]

export function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const userName = profile?.full_name?.split(' ')[0] || 'there'
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [streakDays, setStreakDays] = useState(0)
  const [totalStudyHours, setTotalStudyHours] = useState(0)
  const [weekSessions, setWeekSessions] = useState<{ day: string; hours: number }[]>([])
  const [recentPractice, setRecentPractice] = useState<PracticeSession[]>([])
  const [recentTests, setRecentTests] = useState<Test[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [avgAccuracy, setAvgAccuracy] = useState(0)
  const [loading, setLoading] = useState(true)

  const daysLeft = Math.ceil((new Date('2027-02-07').getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    const [subjectsRes, streakRes, sessionsRes, practiceRes, testsRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('streak_data').select('*').eq('is_study_day', true),
      supabase.from('study_sessions').select('*').order('session_date', { ascending: false }),
      supabase.from('practice_sessions').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('tests').select('*').order('created_at', { ascending: false }).limit(5),
    ])

    if (subjectsRes.data) setSubjects(subjectsRes.data)

    if (streakRes.data) {
      const sorted = [...streakRes.data].sort((a, b) =>
        new Date(b.study_date).getTime() - new Date(a.study_date).getTime()
      )
      let streak = 0
      const today = new Date()
      for (let i = 0; i < sorted.length; i++) {
        const d = new Date(sorted[i].study_date)
        const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
        if (diff === i || diff === i + 1) streak++
        else break
      }
      setStreakDays(streak)
    }

    if (sessionsRes.data) {
      const total = sessionsRes.data.reduce((s, r) => s + r.duration_minutes, 0)
      setTotalStudyHours(Math.round(total / 60 * 10) / 10)

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const weekData = days.map((day, idx) => {
        const date = new Date()
        date.setDate(date.getDate() - date.getDay() + idx)
        const dateStr = date.toISOString().split('T')[0]
        const dayMins = sessionsRes.data!
          .filter(s => s.session_date === dateStr)
          .reduce((s, r) => s + r.duration_minutes, 0)
        return { day, hours: Math.round(dayMins / 60 * 10) / 10 }
      })
      setWeekSessions(weekData)
    }

    if (practiceRes.data) {
      setRecentPractice(practiceRes.data)
      const allPractice = await supabase.from('practice_sessions').select('questions_solved, correct')
      if (allPractice.data) {
        const total = allPractice.data.reduce((s, r) => s + r.questions_solved, 0)
        const correct = allPractice.data.reduce((s, r) => s + r.correct, 0)
        setTotalQuestions(total)
        setAvgAccuracy(total > 0 ? Math.round(correct / total * 100) : 0)
      }
    }

    if (testsRes.data) setRecentTests(testsRes.data)
    setLoading(false)
  }

  const totalChapters = subjects.reduce((s, r) => s + r.total_chapters, 0)
  const completedChapters = subjects.reduce((s, r) => s + r.completed_chapters, 0)
  const overallProgress = totalChapters > 0 ? Math.round(completedChapters / totalChapters * 100) : 0

  const subjectPieData = subjects.slice(0, 5).map(s => ({
    name: s.name.split(' ')[0],
    value: s.completed_chapters || 1
  }))

  const chartConfig = {
    hours: { label: 'Hours', color: 'var(--chart-1)' }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted-foreground">
          GATE CSE 2027 — <span className="font-semibold text-primary">{daysLeft} days</span> to go. Keep grinding!
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Flame className="text-orange-500" />} label="Current Streak" value={`${streakDays} days`} color="orange" />
        <StatCard icon={<Clock className="text-blue-500" />} label="Total Study Hours" value={`${totalStudyHours}h`} color="blue" />
        <StatCard icon={<PenTool className="text-green-500" />} label="Questions Solved" value={totalQuestions.toString()} color="green" />
        <StatCard icon={<Target className="text-purple-500" />} label="Avg Accuracy" value={`${avgAccuracy}%`} color="purple" />
      </div>

      {/* Progress + Countdown */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="size-4" /> Overall Progress
            </CardTitle>
            <CardDescription>
              {completedChapters} / {totalChapters} chapters completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Syllabus Coverage</span>
                <span className="font-semibold">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {subjects.slice(0, 6).map(sub => {
                const pct = sub.total_chapters > 0
                  ? Math.round(sub.completed_chapters / sub.total_chapters * 100) : 0
                return (
                  <div key={sub.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="truncate text-muted-foreground">{sub.name.split(' ')[0]}</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4" /> Countdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-2">
              <p className="text-6xl font-black">{daysLeft}</p>
              <p className="text-primary-foreground/70 text-sm">days to GATE 2027</p>
            </div>
            <Separator className="bg-primary-foreground/20" />
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-xl font-bold">{Math.floor(daysLeft / 7)}</p>
                <p className="text-primary-foreground/70">weeks</p>
              </div>
              <div>
                <p className="text-xl font-bold">{Math.floor(daysLeft / 30)}</p>
                <p className="text-primary-foreground/70">months</p>
              </div>
              <div>
                <p className="text-xl font-bold">{daysLeft % 7}</p>
                <p className="text-primary-foreground/70">extra days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4" /> This Week's Study
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[180px]">
              <BarChart data={weekSessions} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="size-4" /> Subject Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjectPieData.length > 0 ? (
              <ChartContainer config={{}} className="min-h-[180px]">
                <PieChart>
                  <Pie data={subjectPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                    {subjectPieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center min-h-[180px] text-muted-foreground text-sm">
                Add subjects to see distribution
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Log Study', icon: Clock, href: '/timer', color: 'blue' },
          { label: 'Add Practice', icon: PenTool, href: '/practice', color: 'green' },
          { label: 'PYQ Session', icon: BookMarked, href: '/pyq', color: 'purple' },
          { label: 'Take Test', icon: Zap, href: '/tests', color: 'orange' },
          { label: 'Plan Day', icon: CalendarDays, href: '/planner', color: 'pink' },
          { label: 'View Goals', icon: Target, href: '/goals', color: 'red' },
        ].map(action => (
          <Button
            key={action.href}
            variant="outline"
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => navigate(action.href)}
          >
            <action.icon className="size-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Practice</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/practice')}>
                View all <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentPractice.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No practice sessions yet</p>
            ) : (
              <div className="space-y-2">
                {recentPractice.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.questions_solved} questions</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.session_date).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={p.questions_solved > 0 && (p.correct / p.questions_solved) >= 0.7 ? 'default' : 'secondary'}>
                      {p.questions_solved > 0 ? Math.round(p.correct / p.questions_solved * 100) : 0}% acc
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Tests</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tests')}>
                View all <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tests recorded yet</p>
            ) : (
              <div className="space-y-2">
                {recentTests.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium truncate max-w-[160px]">{t.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{t.test_type.replace('_', ' ')}</p>
                    </div>
                    <Badge variant="outline">
                      {t.obtained_marks}/{t.total_marks}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex size-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-950/30`}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
