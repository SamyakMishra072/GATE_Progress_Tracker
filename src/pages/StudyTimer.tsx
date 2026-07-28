import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Play, Pause, Square, Clock, Trash2 } from 'lucide-react'
import type { StudySession, Subject } from '@/lib/supabase'

export function StudyTimer() {
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [target, setTarget] = useState(120)
  const startTimeRef = useRef<Date | null>(null)
  const pausedElapsedRef = useRef(0)
  const intervalRef = useRef<number | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('study_sessions').select('*').order('session_date', { ascending: false }).limit(20)
    ]).then(([sub, sess]) => {
      if (sub.data) setSubjects(sub.data)
      if (sess.data) setSessions(sess.data)
    })
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function startTimer() {
    if (isPaused) {
      startTimeRef.current = new Date()
      setIsPaused(false)
    } else {
      startTimeRef.current = new Date()
      pausedElapsedRef.current = 0
      setElapsed(0)
    }
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      const now = new Date()
      const ms = now.getTime() - startTimeRef.current!.getTime()
      setElapsed(pausedElapsedRef.current + Math.floor(ms / 1000))
    }, 1000) as unknown as number
  }

  function pauseTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    pausedElapsedRef.current = elapsed
    setIsRunning(false)
    setIsPaused(true)
  }

  async function stopTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const minutes = Math.floor(elapsed / 60)
    setIsRunning(false)
    setIsPaused(false)
    setElapsed(0)
    pausedElapsedRef.current = 0

    if (minutes < 1) {
      toast.info('Session too short (< 1 min). Not saved.')
      return
    }

    const now = new Date()
    const sessionDate = now.toISOString().split('T')[0]
    const startTime = new Date(now.getTime() - elapsed * 1000)

    const { error } = await supabase.from('study_sessions').insert({
      subject_id: selectedSubjectId || null,
      session_date: sessionDate,
      start_time: startTime.toISOString(),
      end_time: now.toISOString(),
      duration_minutes: minutes,
      notes: notes || null
    })

    if (error) { toast.error('Failed to save session'); return }

    // Update subject study hours
    if (selectedSubjectId) {
      const subject = subjects.find(s => s.id === selectedSubjectId)
      if (subject) {
        await supabase.from('subjects').update({
          study_hours: subject.study_hours + minutes / 60
        }).eq('id', selectedSubjectId)
      }
    }

    // Update streak
    await upsertStreak(sessionDate, minutes)

    toast.success(`Session saved! ${minutes} minutes logged.`)
    setNotes('')

    const { data } = await supabase.from('study_sessions').select('*').order('session_date', { ascending: false }).limit(20)
    if (data) setSessions(data)
  }

  async function upsertStreak(date: string, minutes: number) {
    const { data } = await supabase.from('streak_data').select('*').eq('study_date', date).maybeSingle()
    if (data) {
      await supabase.from('streak_data').update({
        study_minutes: (data.study_minutes || 0) + minutes,
        is_study_day: true
      }).eq('study_date', date)
    } else {
      await supabase.from('streak_data').insert({
        study_date: date, is_study_day: true, study_minutes: minutes, questions_solved: 0
      })
    }
  }

  async function deleteSession(id: string) {
    await supabase.from('study_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    toast.success('Deleted')
  }

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const progressPct = Math.min(100, Math.round(elapsed / (target * 60) * 100))
  const todaySessions = sessions.filter(s => s.session_date === new Date().toISOString().split('T')[0])
  const todayMinutes = todaySessions.reduce((s, r) => s + r.duration_minutes, 0)
  const totalMinutes = sessions.reduce((s, r) => s + r.duration_minutes, 0)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Study Timer</h1>
        <p className="text-muted-foreground text-sm">Track your study sessions and build consistency</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{Math.round(todayMinutes / 60 * 10) / 10}h</p>
          <p className="text-xs text-muted-foreground">Today</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{Math.round(totalMinutes / 60 * 10) / 10}h</p>
          <p className="text-xs text-muted-foreground">Total Hours</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{sessions.length}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </CardContent></Card>
      </div>

      {/* Timer */}
      <Card className="text-center">
        <CardContent className="p-8 space-y-6">
          <div className="relative">
            <div className="text-7xl font-mono font-bold tracking-wider text-primary">
              {formatTime(elapsed)}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {isRunning ? 'Studying...' : isPaused ? 'Paused' : 'Ready'}
            </div>
          </div>

          <div className="space-y-2 max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress to target</span>
              <span>{Math.floor(elapsed / 60)}/{target} mins</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>

          <div className="flex justify-center gap-3">
            {!isRunning && !isPaused && (
              <Button size="lg" onClick={startTimer} className="px-8">
                <Play className="size-5 mr-2" /> Start
              </Button>
            )}
            {isRunning && (
              <>
                <Button size="lg" variant="outline" onClick={pauseTimer}>
                  <Pause className="size-5 mr-2" /> Pause
                </Button>
                <Button size="lg" variant="destructive" onClick={stopTimer}>
                  <Square className="size-5 mr-2" /> Stop & Save
                </Button>
              </>
            )}
            {isPaused && (
              <>
                <Button size="lg" onClick={startTimer}>
                  <Play className="size-5 mr-2" /> Resume
                </Button>
                <Button size="lg" variant="destructive" onClick={stopTimer}>
                  <Square className="size-5 mr-2" /> Stop & Save
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Config */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Target (minutes)</Label>
          <Input type="number" min="1" value={target} onChange={e => setTarget(parseInt(e.target.value) || 120)} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input placeholder="What are you studying?" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Session History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sessions yet. Start your first timer!</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => {
                const subject = subjects.find(sub => sub.id === s.subject_id)
                return (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock className="size-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{s.duration_minutes} minutes</span>
                          {subject && <Badge variant="outline" className="text-xs">{subject.name.split(' ')[0]}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(s.session_date).toLocaleDateString()}{s.notes ? ` · ${s.notes}` : ''}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteSession(s.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
