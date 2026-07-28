import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame, Calendar, TrendingUp } from 'lucide-react'
import type { StreakData } from '@/lib/supabase'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getIntensity(minutes: number): number {
  if (minutes === 0) return 0
  if (minutes < 30) return 1
  if (minutes < 120) return 2
  if (minutes < 240) return 3
  return 4
}

function intensityClass(level: number, isToday: boolean): string {
  if (isToday && level === 0) return 'bg-primary/20 border-primary'
  switch (level) {
    case 1: return 'bg-green-200 dark:bg-green-900'
    case 2: return 'bg-green-400 dark:bg-green-700'
    case 3: return 'bg-green-600 dark:bg-green-500'
    case 4: return 'bg-green-800 dark:bg-green-300'
    default: return 'bg-muted border border-border/30'
  }
}

export function StudyStreak() {
  const [streakData, setStreakData] = useState<StreakData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('streak_data').select('*').then(({ data }) => {
      if (data) setStreakData(data)
      setLoading(false)
    })
  }, [])

  // Build 52-week grid
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 364)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const dateMap = new Map(streakData.map(d => [d.study_date, d]))

  const weeks: { date: string; minutes: number; questions: number }[][] = []
  let current = new Date(startDate)

  while (current <= today) {
    const week: { date: string; minutes: number; questions: number }[] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().split('T')[0]
      const data = dateMap.get(dateStr)
      week.push({
        date: dateStr,
        minutes: data?.study_minutes || 0,
        questions: data?.questions_solved || 0
      })
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
  }

  // Calculate streak
  const sortedStudyDays = streakData
    .filter(d => d.is_study_day)
    .sort((a, b) => new Date(b.study_date).getTime() - new Date(a.study_date).getTime())

  let currentStreak = 0
  const todayStr = today.toISOString().split('T')[0]
  for (let i = 0; i < sortedStudyDays.length; i++) {
    const d = new Date(sortedStudyDays[i].study_date)
    const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === i || (i === 0 && diff <= 1)) currentStreak++
    else break
  }

  let longestStreak = 0
  let tempStreak = 0
  const allDates = [...sortedStudyDays].sort((a, b) => new Date(a.study_date).getTime() - new Date(b.study_date).getTime())
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) { tempStreak = 1; continue }
    const prev = new Date(allDates[i - 1].study_date)
    const curr = new Date(allDates[i].study_date)
    const diff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak) }
    else { tempStreak = 1 }
  }
  longestStreak = Math.max(longestStreak, tempStreak)

  const totalStudyDays = streakData.filter(d => d.is_study_day).length
  const totalMinutes = streakData.reduce((s, r) => s + r.study_minutes, 0)

  // Month labels
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, idx) => {
    const d = new Date(week[0].date)
    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ label: MONTHS[d.getMonth()], col: idx })
      lastMonth = d.getMonth()
    }
  })

  if (loading) return (
    <div className="p-6">
      <div className="h-40 bg-muted animate-pulse rounded-xl" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Study Streak</h1>
        <p className="text-muted-foreground text-sm">Your consistency calendar — every green square counts</p>
      </div>

      {/* Streak Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Flame className="size-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{currentStreak}</p>
              <p className="text-xs text-muted-foreground">Current Streak</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="size-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{longestStreak}</p>
              <p className="text-xs text-muted-foreground">Longest Streak</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="size-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalStudyDays}</p>
              <p className="text-xs text-muted-foreground">Total Study Days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{Math.round(totalMinutes / 60)}h</p>
            <p className="text-xs text-muted-foreground">Total Hours Tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="size-4 text-orange-500" /> Contribution Graph
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="inline-block">
            {/* Month labels */}
            <div className="flex gap-[3px] mb-1 ml-6">
              {weeks.map((_, idx) => {
                const label = monthLabels.find(m => m.col === idx)
                return (
                  <div key={idx} className="w-3 text-[9px] text-muted-foreground">
                    {label?.label || ''}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-[3px]">
              {/* Day labels */}
              <div className="flex flex-col gap-[3px] mr-1">
                {DAYS.map((d, i) => (
                  <div key={d} className="h-3 text-[9px] text-muted-foreground leading-3">
                    {i % 2 === 1 ? d.slice(0, 1) : ''}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((day) => {
                    const isToday = day.date === todayStr
                    const isFuture = day.date > todayStr
                    const intensity = isFuture ? -1 : getIntensity(day.minutes)
                    const tooltip = isFuture
                      ? ''
                      : `${day.date}: ${day.minutes}min${day.questions > 0 ? `, ${day.questions}Q` : ''}`
                    return (
                      <div
                        key={day.date}
                        className={`size-3 rounded-sm ${isFuture ? 'opacity-0' : intensityClass(intensity, isToday)} transition-colors`}
                        title={tooltip}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1 mt-2 ml-6 text-[10px] text-muted-foreground">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map(level => (
                <div key={level} className={`size-3 rounded-sm ${intensityClass(level, false)}`} />
              ))}
              <span>More</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Days */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 14 }, (_, i) => {
              const d = new Date()
              d.setDate(d.getDate() - i)
              const dateStr = d.toISOString().split('T')[0]
              const data = dateMap.get(dateStr)
              const studied = data?.is_study_day || false
              const mins = data?.study_minutes || 0
              const qs = data?.questions_solved || 0
              return (
                <div key={dateStr} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`size-2.5 rounded-full ${studied ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className="text-sm">
                      {i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {studied ? (
                      <>
                        {mins > 0 && <Badge variant="outline">{Math.round(mins / 60 * 10) / 10}h</Badge>}
                        {qs > 0 && <Badge variant="secondary">{qs}Q</Badge>}
                      </>
                    ) : (
                      <span className="text-muted-foreground/50">No study</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
