import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Plus, Target, CheckCircle, XCircle, MinusCircle, Clock, Trash2 } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { PracticeSession, Subject } from '@/lib/supabase'

export function PracticeTracker() {
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    subject_id: '', date: new Date().toISOString().split('T')[0],
    solved: '', correct: '', wrong: '', skipped: '', time: '', notes: ''
  })

  useEffect(() => {
    Promise.all([
      supabase.from('practice_sessions').select('*').order('session_date', { ascending: false }).limit(50),
      supabase.from('subjects').select('*').order('name')
    ]).then(([sessions, subjects]) => {
      if (sessions.data) setSessions(sessions.data)
      if (subjects.data) setSubjects(subjects.data)
    })
  }, [])

  async function addSession() {
    const solved = parseInt(form.solved) || 0
    const correct = parseInt(form.correct) || 0
    const wrong = parseInt(form.wrong) || 0
    const skipped = parseInt(form.skipped) || 0
    if (solved === 0) { toast.error('Questions solved required'); return }

    const { error } = await supabase.from('practice_sessions').insert({
      subject_id: form.subject_id || null,
      session_date: form.date,
      questions_solved: solved,
      correct, wrong, skipped,
      time_taken_minutes: parseInt(form.time) || 0,
      notes: form.notes || null
    })
    if (error) { toast.error('Failed to add session'); return }

    // Update streak
    await upsertStreak(form.date, solved)

    toast.success('Practice session logged!')
    setAddOpen(false)
    setForm({ subject_id: '', date: new Date().toISOString().split('T')[0], solved: '', correct: '', wrong: '', skipped: '', time: '', notes: '' })
    const { data } = await supabase.from('practice_sessions').select('*').order('session_date', { ascending: false }).limit(50)
    if (data) setSessions(data)
  }

  async function upsertStreak(date: string, questions: number) {
    const { data } = await supabase.from('streak_data').select('*').eq('study_date', date).maybeSingle()
    if (data) {
      await supabase.from('streak_data').update({
        is_study_day: true,
        questions_solved: (data.questions_solved || 0) + questions
      }).eq('study_date', date)
    } else {
      await supabase.from('streak_data').insert({
        study_date: date, is_study_day: true, questions_solved: questions, study_minutes: 0
      })
    }
  }

  async function deleteSession(id: string) {
    await supabase.from('practice_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    toast.success('Deleted')
  }

  const totalSolved = sessions.reduce((s, r) => s + r.questions_solved, 0)
  const totalCorrect = sessions.reduce((s, r) => s + r.correct, 0)
  const avgAccuracy = totalSolved > 0 ? Math.round(totalCorrect / totalSolved * 100) : 0

  const chartData = sessions.slice(0, 14).reverse().map(s => ({
    date: new Date(s.session_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    accuracy: s.questions_solved > 0 ? Math.round(s.correct / s.questions_solved * 100) : 0,
    solved: s.questions_solved
  }))

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Practice Tracker</h1>
          <p className="text-muted-foreground text-sm">Log and analyze your question practice sessions</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Log Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox icon={<Target className="size-5 text-blue-500" />} label="Total Solved" value={totalSolved} />
        <StatBox icon={<CheckCircle className="size-5 text-green-500" />} label="Correct" value={totalCorrect} />
        <StatBox icon={<XCircle className="size-5 text-red-500" />} label="Wrong" value={sessions.reduce((s, r) => s + r.wrong, 0)} />
        <StatBox icon={<Target className="size-5 text-purple-500" />} label="Avg Accuracy" value={`${avgAccuracy}%`} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Accuracy Trend (Last 14 Sessions)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ accuracy: { label: 'Accuracy %', color: 'var(--chart-1)' } }} className="min-h-[160px]">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Practice Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No practice sessions yet. Log your first session!</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => {
                const acc = s.questions_solved > 0 ? Math.round(s.correct / s.questions_solved * 100) : 0
                const subjectName = subjects.find(sub => sub.id === s.subject_id)?.name
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{s.questions_solved} questions</span>
                          {subjectName && <Badge variant="outline" className="text-xs">{subjectName.split(' ')[0]}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(s.session_date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="size-3 text-green-500" /> {s.correct}
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle className="size-3 text-red-500" /> {s.wrong}
                          </span>
                          <span className="flex items-center gap-1">
                            <MinusCircle className="size-3 text-yellow-500" /> {s.skipped}
                          </span>
                          {s.time_taken_minutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" /> {s.time_taken_minutes}m
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:block text-right">
                        <Progress value={acc} className="w-16 h-1.5 mb-1" />
                        <span className="text-xs font-medium">{acc}%</span>
                      </div>
                      <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteSession(s.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Practice Session</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Subject (optional)</Label>
              <Select value={form.subject_id} onValueChange={v => setForm(f => ({ ...f, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Time (mins)</Label>
              <Input type="number" min="0" placeholder="30" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Questions Solved *</Label>
              <Input type="number" min="0" placeholder="20" value={form.solved} onChange={e => setForm(f => ({ ...f, solved: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Correct</Label>
              <Input type="number" min="0" placeholder="15" value={form.correct} onChange={e => setForm(f => ({ ...f, correct: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Wrong</Label>
              <Input type="number" min="0" placeholder="3" value={form.wrong} onChange={e => setForm(f => ({ ...f, wrong: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Skipped</Label>
              <Input type="number" min="0" placeholder="2" value={form.skipped} onChange={e => setForm(f => ({ ...f, skipped: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Any observations..." rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addSession}>Log Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
